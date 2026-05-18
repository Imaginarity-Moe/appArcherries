/**
 * Verify Profi-Modus end-to-end:
 * - PATCH /me {pro_mode: true} setzt und persistiert
 * - /me liefert pro_mode mit
 * - arrow.purchase_url_shaft/fletching/nocks/tips funktioniert
 * - UI zeigt Sektion nur wenn pro_mode aktiv
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

await mkdir('test-report/pro-mode', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();

const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

async function api(p, opts = {}) {
  return page.evaluate(async ({ p, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, opts });
}

// Reset pro_mode auf false
await api('/me', { method: 'PATCH', body: JSON.stringify({ pro_mode: false }) });

// 1. /me liefert pro_mode false
const me1 = await api('/me');
if (me1.body?.pro_mode === false) ok('/me liefert pro_mode=false initial');
else fail(`/me pro_mode=${me1.body?.pro_mode}`);

// 2. PATCH /me {pro_mode: true}
const patch = await api('/me', { method: 'PATCH', body: JSON.stringify({ pro_mode: true }) });
if (patch.body?.pro_mode === true) ok('PATCH /me {pro_mode:true} bestätigt');
else fail(`PATCH /me: ${JSON.stringify(patch.body)}`);

// 3. Login-Response enthält pro_mode
const login = await page.evaluate(async (b) => {
  const r = await fetch('/api/index.php/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  return r.json();
}, USER);
if (login?.user?.pro_mode === true) ok('Login-Response enthält pro_mode=true');
else fail(`Login user.pro_mode=${login?.user?.pro_mode}`);

// 4. Bow + Arrow mit allen 4 component-urls anlegen
const oldArrows = await api('/arrows');
for (const a of oldArrows.body?.arrows ?? []) await api(`/arrows/${a.id}`, { method: 'DELETE' });
const oldBows = await api('/bows');
for (const b of oldBows.body?.bows ?? []) await api(`/bows/${b.id}`, { method: 'DELETE' });

const bow = await api('/bows', { method: 'POST', body: JSON.stringify({ name: 'TestBow', bow_type: 'recurve', draw_weight_lbs: 36 }) });
const arrow = await api('/arrows', { method: 'POST', body: JSON.stringify({
  name: 'Komponenten-Test',
  spine: '550',
  count_total: 6,
  purchase_url: 'https://shop.example.com/x10',
  purchase_url_shaft: 'https://shop.example.com/shaft',
  purchase_url_fletching: 'https://shop.example.com/fletching',
  purchase_url_nocks: 'https://shop.example.com/nocks',
  purchase_url_tips: 'https://shop.example.com/tips',
  bow_ids: [bow.body.bow.id],
}) });
const a = arrow.body?.arrow;
if (
  a?.purchase_url_shaft === 'https://shop.example.com/shaft' &&
  a?.purchase_url_fletching === 'https://shop.example.com/fletching' &&
  a?.purchase_url_nocks === 'https://shop.example.com/nocks' &&
  a?.purchase_url_tips === 'https://shop.example.com/tips'
) ok('Arrow mit allen 4 Komponenten-URLs gespeichert');
else fail(`Arrow Komponenten-URLs nicht alle persistiert: ${JSON.stringify(a)}`);

// 5. UI: pro_mode=true → "Komponenten einzeln nachbestellen" sichtbar
await page.goto(`${BASE}/arrows/${a.id}/edit`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const compSummary = await page.locator('summary:has-text("Komponenten")').count();
if (compSummary >= 1) ok('UI: Komponenten-Sektion sichtbar bei pro_mode=true');
else fail('UI: Komponenten-Sektion fehlt obwohl pro_mode=true');

// Aufklappen + Screenshot
if (compSummary) {
  await page.locator('summary:has-text("Komponenten")').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('summary')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-report/pro-mode/01-arrow-edit-pro-expanded.png', fullPage: true });
}

// 6. pro_mode auf false drehen → UI versteckt
await api('/me', { method: 'PATCH', body: JSON.stringify({ pro_mode: false }) });
await page.goto(`${BASE}/arrows/${a.id}/edit`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const compSummary2 = await page.locator('summary:has-text("Komponenten")').count();
if (compSummary2 === 0) ok('UI: Komponenten-Sektion versteckt bei pro_mode=false');
else fail(`UI: Komponenten-Sektion noch sichtbar (${compSummary2})`);

// 7. Profile-Page Toggle
await page.goto(`${BASE}/profile`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(400);
await page.screenshot({ path: 'test-report/pro-mode/02-profile-toggle.png', fullPage: true });
const toggle = page.locator('button[role="switch"]').first();
if (await toggle.count()) ok('Profi-Modus-Toggle in Profile sichtbar');
else fail('Profi-Modus-Toggle fehlt in Profile');

// Cleanup
await api(`/arrows/${a.id}`, { method: 'DELETE' });
await api(`/bows/${bow.body.bow.id}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Profi-Modus end-to-end grün');
process.exit(errors.length ? 1 : 0);
