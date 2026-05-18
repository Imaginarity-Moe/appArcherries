import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/polish', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.password);
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

// Cleanup + Setup: Parcours mit 5 Bahnen detailliert + Training
const oldT = await api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await api(`/trainings/${t.id}`, { method: 'DELETE' });
const oldP = await api('/parcours');
for (const p of oldP.body?.parcours ?? []) if ((p.name ?? '').startsWith('POLISH-TEST')) await api(`/parcours/${p.id}`, { method: 'DELETE' });

const pr = await api('/parcours', { method: 'POST', body: JSON.stringify({
  name: 'POLISH-TEST', lanes_count: 10, peg_red: true,
}) });
const pid = pr.body.parcours.id;
for (let i = 1; i <= 3; i++) {
  await api(`/parcours/${pid}/lanes`, { method: 'POST', body: JSON.stringify({
    lane_number: i, animal_description: `Tier ${i}`, distance_red: 20 + i * 2,
  }) });
}

// 1. ParcoursDetail zeigt "3 / 10 detailliert"
await page.goto(`${BASE}/parcours/${pid}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const txt = await page.locator('text=/3 \\/ 10 detailliert/').count();
if (txt >= 1) ok(`ParcoursDetail zeigt "3 / 10 detailliert"`);
else fail('Detail-Counter fehlt auf ParcoursDetail');
await page.screenshot({ path: 'test-report/polish/01-parcours-detail-counter.png', fullPage: false });

// 2. Training mit dem Parcours starten → "3 Stationen" plural
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
  parcours_id: pid,
}) });
const trId = tr.body.training.id;
await page.goto(`${BASE}/trainings/${trId}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const stationsText = await page.locator('text=/3 STATIONEN/').count();
if (stationsText >= 1) ok(`TrainingDetail zeigt "3 STATIONEN" (Plural)`);
else fail('Plural-Form "STATIONEN" nicht erkannt');
await page.screenshot({ path: 'test-report/polish/02-training-header-plural.png', fullPage: false });

// 3. Singular-Form: Training mit 1 Station (Parcours mit nur 1 Bahn)
const pr2 = await api('/parcours', { method: 'POST', body: JSON.stringify({
  name: 'POLISH-TEST 1-lane', lanes_count: 5, peg_red: true,
}) });
const pid2 = pr2.body.parcours.id;
await api(`/parcours/${pid2}/lanes`, { method: 'POST', body: JSON.stringify({
  lane_number: 1, animal_description: 'Solo', distance_red: 20,
}) });
const tr2 = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red', parcours_id: pid2,
}) });
const tr2Id = tr2.body.training.id;
await page.goto(`${BASE}/trainings/${tr2Id}`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const singular = await page.locator('text=/1 STATION$|1 STATION[^E]/').count();
if (singular >= 1) ok(`TrainingDetail zeigt "1 STATION" (Singular)`);
else fail('Singular-Form "STATION" nicht erkannt');

// Cleanup
await api(`/trainings/${trId}`, { method: 'DELETE' });
await api(`/trainings/${tr2Id}`, { method: 'DELETE' });
await api(`/parcours/${pid}`, { method: 'DELETE' });
await api(`/parcours/${pid2}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Polish grün');
process.exit(errors.length ? 1 : 0);
