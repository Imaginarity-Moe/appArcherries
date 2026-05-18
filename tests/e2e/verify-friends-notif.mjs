/**
 * Verify: Block-Re-Anfrage-Message, Dashboard-Banner, Profile-Badge.
 * Email-Versand wird nicht direkt geprüft (kein Inbox-Hook), aber send_mail-Aufrufe
 * sind in API verdrahtet — wir prüfen, dass die Endpoints nicht 500en.
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };

await mkdir('test-report/friends-notif', { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

async function makePage(user, mobile = false) {
  const opts = mobile
    ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  page.api = async (path, opts = {}) => page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
  return page;
}

const pa = await makePage(A);
const pb = await makePage(B);

async function reset(p) {
  const r = await p.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
    for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
}
await reset(pa); await reset(pb);

// 1. A sendet Anfrage an B — Email-Hook wird intern aufgerufen (kein 500)
const send = await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
if (send.status === 200) ok('A → B: Anfrage gesendet (200, Mailer-Aufruf integriert)');
else fail(`Anfrage: status=${send.status}, body=${JSON.stringify(send.body)}`);

// 2. B sieht Dashboard-Banner
await pb.goto(`${BASE}/`);
await pb.waitForLoadState('networkidle');
await pb.waitForTimeout(400);
const banner = await pb.locator('text=/neue Freundes-Anfrage/').count();
if (banner >= 1) ok('B: Dashboard zeigt Anfrage-Banner');
else fail('B: Banner fehlt auf Dashboard');
await pb.screenshot({ path: 'test-report/friends-notif/01-B-dashboard-banner.png', fullPage: false });

// 3. B sieht Badge in Profile
await pb.goto(`${BASE}/profile`);
await pb.waitForLoadState('networkidle');
await pb.waitForTimeout(400);
const badge = await pb.locator('text=/1 neue Anfrage/').count();
if (badge >= 1) ok('B: Profile-Card-Badge zeigt 1 neue Anfrage');
else fail('B: Profile-Badge fehlt');
await pb.screenshot({ path: 'test-report/friends-notif/02-B-profile-badge.png', fullPage: false });

// 4. B blockiert A
const bView = await pb.api('/friends');
const reqId = bView.body.incoming[0].id;
const block = await pb.api(`/friends/${reqId}`, { method: 'PATCH', body: JSON.stringify({ action: 'block' }) });
if (block.body?.blocked?.length === 1) ok('B blockiert A — blocked.length=1');
else fail(`Block: ${JSON.stringify(block.body)}`);

// 5. A versucht erneut → Klare Message
const retry = await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
if (retry.status === 403 && /keine weiteren Anfragen/i.test(retry.body?.error ?? '')) ok(`Block-Re-Anfrage: 403 mit klarer Message: "${retry.body?.error}"`);
else fail(`Block-Re-Anfrage: status=${retry.status}, body=${JSON.stringify(retry.body)}`);

// 6. Self-Block-Re-Aufhebung: A hat B blockiert in eigener Variante (Symmetrie)
// Reset und neue Konstellation
await reset(pa); await reset(pb);
await pb.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: A.email }) });
const aIn = await pa.api('/friends');
const aReq = aIn.body.incoming[0].id;
await pa.api(`/friends/${aReq}`, { method: 'PATCH', body: JSON.stringify({ action: 'block' }) });
// B versucht erneut
const retry2 = await pb.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: A.email }) });
if (retry2.status === 403 && /keine weiteren Anfragen/i.test(retry2.body?.error ?? '')) ok('Block durch A: B bekommt "keine weiteren Anfragen"-Message');
else fail(`B-retry nach A-Block: ${retry2.status} ${JSON.stringify(retry2.body)}`);

// Cleanup
await reset(pa); await reset(pb);
await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Notif-Flow grün');
process.exit(errors.length ? 1 : 0);
