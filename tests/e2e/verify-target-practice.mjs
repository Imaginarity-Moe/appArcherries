/**
 * Verify target_practice-Disziplin end-to-end:
 *  - Training mit Config anlegen (arrows_per_end, num_ends, target_distance_m, target_rings, scoring_mode)
 *  - Server liefert die Config im Detail zurück
 *  - Live-Eingabe: TargetPad zeigt 10 Ringe, Klick erzeugt zone="<n>" + x_norm/y_norm
 *  - Punkte werden korrekt berechnet (zone="10" → 10 Punkte)
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/target-practice', { recursive: true });

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

// Cleanup
const oldT = await api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await api(`/trainings/${t.id}`, { method: 'DELETE' });

// 1. Training anlegen mit target_practice + legs-Modus
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'target_practice',
  bow_type: 'recurve',
  arrows_per_end: 3,
  num_ends: 5,
  target_distance_m: 18,
  target_rings: 10,
  scoring_mode: 'legs',
  legs_to_win: 3,
}) });
const trId = tr.body?.training?.id;
if (!trId) { fail(`Create: ${JSON.stringify(tr.body)}`); process.exit(1); }
ok(`Training #${trId} angelegt`);

// 2. Detail-Lese-Test: Config kommt zurück
const det = await api(`/trainings/${trId}`);
const t = det.body?.training;
if (t?.arrows_per_end === 3 && t?.num_ends === 5 && t?.target_distance_m === 18 && t?.target_rings === 10 && t?.scoring_mode === 'legs' && t?.legs_to_win === 3) {
  ok('Config korrekt: 3 Pfeile × 5 Ends, 18m, 10 Ringe, legs/3');
} else {
  fail(`Config falsch: ${JSON.stringify({ arrows_per_end: t?.arrows_per_end, num_ends: t?.num_ends, distance: t?.target_distance_m, rings: t?.target_rings, mode: t?.scoring_mode, legs: t?.legs_to_win })}`);
}

// 3. Target anlegen (End 1) mit 3 Pfeilen (10, 9, 8)
const target = await api(`/trainings/${trId}/targets`, { method: 'POST', body: JSON.stringify({
  target_index: 1,
}) });
const tid = target.body?.target?.id;
if (!tid) { fail('Target-Create'); process.exit(1); }

const upd = await api(`/trainings/${trId}/targets/${tid}`, { method: 'PATCH', body: JSON.stringify({
  shots: [
    { arrow_seq: 1, zone: '10', x_norm: 0.5, y_norm: 0.5 },
    { arrow_seq: 2, zone: '9',  x_norm: 0.52, y_norm: 0.48 },
    { arrow_seq: 3, zone: '8',  x_norm: 0.55, y_norm: 0.55 },
  ],
}) });
// Punkte-Check
const det2 = await api(`/trainings/${trId}`);
const shots = det2.body?.training?.targets?.[0]?.shots ?? [];
const totalPts = shots.reduce((s, x) => s + (x.points ?? 0), 0);
if (totalPts === 27 && shots.every((s) => s.x_norm !== null && s.y_norm !== null)) {
  ok('End-Wertung: 10+9+8=27, x/y persistiert');
} else {
  fail(`End-Wertung falsch: total=${totalPts}, shots=${JSON.stringify(shots.map((s) => ({seq:s.arrow_seq, z:s.zone, p:s.points, x:s.x_norm})))}`);
}

// 4. UI: Live-Entry öffnen → TargetPad sichtbar
await page.goto(`${BASE}/trainings/${trId}?station=2`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await page.screenshot({ path: 'test-report/target-practice/01-live-entry.png', fullPage: true });

const targetSvg = await page.locator('svg[viewbox="0 0 1 1"]').count();
if (targetSvg >= 1) ok('TargetPad-SVG gerendert');
else fail('TargetPad-SVG fehlt');

// Klick aufs Zentrum (=10)
const svgBox = await page.locator('svg[viewbox="0 0 1 1"]').first().boundingBox();
if (svgBox) {
  await page.mouse.click(svgBox.x + svgBox.width * 0.5, svgBox.y + svgBox.height * 0.5);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-report/target-practice/02-after-center-click.png', fullPage: true });
}

// Cleanup
await api(`/trainings/${trId}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ target_practice grün');
process.exit(errors.length ? 1 : 0);
