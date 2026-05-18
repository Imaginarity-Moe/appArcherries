/**
 * Verify Friendships Phase 1 — two-user end-to-end.
 * User A sendet Anfrage an B, B nimmt an, beide sehen den anderen als Freund.
 * Dann B blockiert (durch erneutes Setup), A kann nicht erneut anfragen.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };

await mkdir('test-report/friends', { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

async function makePage(user) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
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
  return { ctx, page };
}

const pageA = await makePage(A);
const pageB = await makePage(B);

// Cleanup: alle bestehenden Friendships für A und B löschen
async function reset(p) {
  const r = await p.page.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked']) {
    for (const f of r.body?.[list] ?? []) {
      await p.page.api(`/friends/${f.id}`, { method: 'DELETE' });
    }
  }
}
await reset(pageA);
await reset(pageB);

// 1. A sendet Anfrage an B
const send = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
if (send.body?.outgoing?.length === 1 && send.body.outgoing[0].user.email === B.email) ok('A sendet Anfrage → outgoing.length=1');
else fail(`A send: ${JSON.stringify(send.body)}`);

// 2. B sieht incoming
const bView1 = await pageB.page.api('/friends');
if (bView1.body?.incoming?.length === 1 && bView1.body.incoming[0].user.email === A.email) ok('B sieht 1 incoming-Anfrage von A');
else fail(`B incoming: ${JSON.stringify(bView1.body?.incoming)}`);
const reqId = bView1.body.incoming[0].id;

// 3. Doppelte Anfrage abgelehnt
const dup = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
if (dup.status === 409) ok('Doppelte Anfrage abgelehnt mit 409');
else fail(`Doppel: status=${dup.status} body=${JSON.stringify(dup.body)}`);

// 4. B nimmt an
const accept = await pageB.page.api(`/friends/${reqId}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
if (accept.body?.friends?.length === 1 && accept.body.friends[0].user.email === A.email) ok('B akzeptiert → B.friends enthält A');
else fail(`B accept: ${JSON.stringify(accept.body)}`);

// 5. A sieht jetzt B als Freund
const aView2 = await pageA.page.api('/friends');
if (aView2.body?.friends?.length === 1 && aView2.body.friends[0].user.email === B.email) ok('A sieht B in friends');
else fail(`A friends: ${JSON.stringify(aView2.body?.friends)}`);

// 6. UI screenshot of B's friend page
await pageB.page.goto(`${BASE}/friends`);
await pageB.page.waitForLoadState('networkidle');
await pageB.page.waitForTimeout(400);
await pageB.page.screenshot({ path: 'test-report/friends/01-B-friends-page.png', fullPage: true });
const friendCard = await pageB.page.locator(`text=${A.email}`).count();
if (friendCard >= 1) ok('UI: B sieht A in der Friends-Page');
else fail('UI: A nicht in B Friends-Page');

// 7. A entfernt B
const accId = aView2.body.friends[0].id;
const del = await pageA.page.api(`/friends/${accId}`, { method: 'DELETE' });
if ((del.body?.friends?.length ?? 0) === 0) ok('A entfernt B → friends leer');
else fail(`A delete: ${JSON.stringify(del.body)}`);

// 8. Block-Flow
const send2 = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
const bView3 = await pageB.page.api('/friends');
const inc2 = bView3.body.incoming[0];
const block = await pageB.page.api(`/friends/${inc2.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'block' }) });
if (block.body?.blocked?.length === 1) ok('B blockiert A → blocked.length=1');
else fail(`B block: ${JSON.stringify(block.body)}`);
// Re-Anfrage von A schlägt fehl
const retry = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
if (retry.status === 403 || retry.status === 409) ok(`Re-Anfrage nach Block abgelehnt mit ${retry.status}`);
else fail(`Block-Check: status=${retry.status}`);

// 9. Self-Anfrage abgelehnt
const self = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: A.email }) });
if (self.status === 400 || self.status === 409) ok(`Self-Anfrage abgelehnt mit ${self.status}`);
else fail(`Self-request: status=${self.status}`);

// 10. Unknown-Email
const unknown = await pageA.page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: 'doesnotexist@nowhere.test' }) });
if (unknown.status === 404) ok('Anfrage an unbekannte E-Mail → 404');
else fail(`Unknown: status=${unknown.status}`);

// Cleanup
await reset(pageA);
await reset(pageB);

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Freundschafts-Flow grün');
process.exit(errors.length ? 1 : 0);
