/**
 * Verify Heatmap-Feature end-to-end.
 * Erzeugt Training mit Schüssen + x_norm/y_norm, prüft Endpoint + UI-Render.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/heatmap', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
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

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

// 1. Cleanup
const oldT = await api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await api(`/trainings/${t.id}`, { method: 'DELETE' });

// 2. Training mit 3D-IFAA
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
}) });
const trId = tr.body.training.id;

// 3. Targets mit Shots + Marker
const targets = [
  { idx: 1, animal: 'Wildschwein', distance: 25 },
  { idx: 2, animal: 'Wildschwein', distance: 25 },
  { idx: 3, animal: 'Wildschwein', distance: 30 },
  { idx: 4, animal: 'Reh',         distance: 20 },
];
for (const tt of targets) {
  const r = await api(`/trainings/${trId}/targets`, { method: 'POST', body: JSON.stringify({
    target_index: tt.idx, animal_or_face: tt.animal, distance_m: tt.distance,
  }) });
  const targetId = r.body.target.id;
  // 3 Shots mit verschiedenen Positionen
  await api(`/trainings/${trId}/targets/${targetId}`, { method: 'PATCH', body: JSON.stringify({
    shots: [
      { arrow_seq: 1, zone: 'vital', x_norm: 0.50 + (Math.random() - 0.5) * 0.1, y_norm: 0.48 + (Math.random() - 0.5) * 0.1 },
      { arrow_seq: 2, zone: 'wound', x_norm: 0.45 + (Math.random() - 0.5) * 0.2, y_norm: 0.55 + (Math.random() - 0.5) * 0.2 },
      { arrow_seq: 3, zone: 'miss',  x_norm: 0.30 + (Math.random() - 0.5) * 0.3, y_norm: 0.70 + (Math.random() - 0.5) * 0.2 },
    ],
  }) });
}
ok('Training mit 4 Stationen × 3 Shots erfasst');

// 4. /stats/heatmap/targets
const heatTargets = await api('/stats/heatmap/targets');
const wild = heatTargets.body?.targets?.find((t) => t.name === 'Wildschwein');
const reh  = heatTargets.body?.targets?.find((t) => t.name === 'Reh');
if (wild && wild.shot_count === 9) ok(`heatmap/targets: Wildschwein=9 Pfeile`);
else fail(`heatmap/targets: Wildschwein=${wild?.shot_count} (erwartet 9)`);
if (reh && reh.shot_count === 3) ok(`heatmap/targets: Reh=3 Pfeile`);
else fail(`heatmap/targets: Reh=${reh?.shot_count}`);

// 5. /stats/heatmap?target=Wildschwein
const heat = await api(`/stats/heatmap?target=${encodeURIComponent('Wildschwein')}`);
if (heat.body?.total === 9 && heat.body?.shots?.length === 9) ok('heatmap?target=Wildschwein: 9 Shots');
else fail(`heatmap: total=${heat.body?.total}, shots=${heat.body?.shots?.length}`);
if (heat.body?.distances?.includes(25) && heat.body?.distances?.includes(30)) ok('Distanzen 25 + 30 zurückgegeben');
else fail(`Distanzen: ${JSON.stringify(heat.body?.distances)}`);

// 6. Filter nach Distanz
const heat25 = await api(`/stats/heatmap?target=${encodeURIComponent('Wildschwein')}&distance=25`);
if (heat25.body?.total === 6) ok('Filter distance=25 → 6 Shots (2 Stationen × 3)');
else fail(`distance=25 total=${heat25.body?.total}`);

// 7. UI: Stats-Page lädt und zeigt Heatmap-Section
await page.goto(`${BASE}/stats`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
const heatHeader = await page.locator('text="Treffer-Heatmap"').count();
if (heatHeader >= 1) ok('UI: Heatmap-Section sichtbar');
else fail('UI: Heatmap-Header fehlt');

// Tier-Select prüfen
const tierSelect = page.locator('select[aria-label="Tier oder Auflage"]');
if (await tierSelect.count()) {
  const opts = await tierSelect.locator('option').allTextContents();
  console.log(`  Tier-Optionen: ${opts.join(' / ')}`);
  if (opts.length >= 2) ok('Tier-Select hat ≥2 Optionen');
  else fail('Tier-Select leer');
}

// SVG vorhanden
const svgCount = await page.locator('section:has-text("Treffer-Heatmap") svg').count();
if (svgCount >= 1) ok('Heatmap-SVG gerendert');
else fail('Heatmap-SVG fehlt');

await page.locator('section:has-text("Treffer-Heatmap")').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: 'test-report/heatmap/01-stats-with-heatmap.png', fullPage: true });

// Cleanup
await api(`/trainings/${trId}`, { method: 'DELETE' });
await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Heatmap grün');
process.exit(errors.length ? 1 : 0);
