/**
 * Verify: BullseyePad-Klick erzeugt x_norm/y_norm in shots, ohne Foto.
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/pad-xy', { recursive: true });

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

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

// 1. Neues Field-WA-Training (alle Pfeile zählen unabhängig, keine "first-hit"-Disable-Logik)
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'field_wa', bow_type: 'recurve', peg_color: 'red',
}) });
const trId = tr.body.training.id;

// 2. Training öffnen, Station 1 anfangen
await page.goto(`${BASE}/trainings/${trId}?station=1`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);

// 3. Tier + Distanz angeben
const animalInput = page.locator('input[placeholder*="Wildschwein"], input[placeholder*="Tier"], input[placeholder*="Animal"], input[name="animal"]').first();
if (await animalInput.count()) {
  await animalInput.fill('Wildschwein');
}
const distInput = page.locator('input[placeholder*="m"][type="number"], input[name="distance"]').first();
if (await distInput.count()) {
  await distInput.fill('25');
}

await page.screenshot({ path: 'test-report/pad-xy/01-station-form.png' });

// 4. BullseyePad: 3 Klicks auf verschiedene Ringe (innerste Kreise treffen)
// Bullseye-SVG ist das einzige mit class="no-tap-highlight" im viewport
const svg = page.locator('svg.no-tap-highlight').first();
const svgBox = await svg.boundingBox();
console.log(`  SVG box: ${JSON.stringify(svgBox)}`);
if (svgBox) {
  // Pfeil 1: Center (innerer Kill = höchster Wert)
  await page.mouse.click(svgBox.x + svgBox.width * 0.50, svgBox.y + svgBox.height * 0.50);
  await page.waitForTimeout(300);
  // Pfeil 2: leicht versetzt — auch noch im inner_kill (sd 0.05)
  await page.mouse.click(svgBox.x + svgBox.width * 0.55, svgBox.y + svgBox.height * 0.48);
  await page.waitForTimeout(300);
  // Pfeil 3: outer_kill (mittlerer Bereich, ~0.35 vom Center)
  await page.mouse.click(svgBox.x + svgBox.width * 0.65, svgBox.y + svgBox.height * 0.45);
  await page.waitForTimeout(300);
}

await page.screenshot({ path: 'test-report/pad-xy/02-after-3-clicks.png' });

// 5. Speichern (form requestSubmit)
const saveBtn = page.locator('button:has-text("Speichern"), button[type="submit"]').first();
if (await saveBtn.count()) {
  await saveBtn.click();
  await page.waitForTimeout(1500);
}

// 6. API-Check: hat das Target shots mit x_norm/y_norm?
const det = await api(`/trainings/${trId}`);
const target = det.body?.training?.targets?.[0];
const shots = target?.shots ?? [];
console.log(`  Shots: ${JSON.stringify(shots.map((s) => ({ seq: s.arrow_seq, z: s.zone, x: s.x_norm, y: s.y_norm })))}`);
const withXY = shots.filter((s) => s.x_norm !== null && s.y_norm !== null);
if (withXY.length === 3) ok(`Alle 3 Shots haben x_norm/y_norm`);
else fail(`Nur ${withXY.length}/3 Shots haben Koordinaten`);

const centerShot = withXY.find((s) => Math.abs(s.x_norm - 0.5) < 0.06 && Math.abs(s.y_norm - 0.5) < 0.06);
if (centerShot) ok(`Center-Klick erzeugt (~0.5, 0.5): (${centerShot.x_norm}, ${centerShot.y_norm})`);
else fail('Center-Shot nicht erkennbar');

// 7. Heatmap-Endpoint zeigt das Tier
const heatTargets = await api('/stats/heatmap/targets');
const found = (heatTargets.body?.targets ?? []).find((t) => t.name === 'Wildschwein');
if (found) ok(`Heatmap-Targets zeigt Wildschwein (${found.shot_count} Pfeile inkl. Demo-Daten)`);
else fail('Wildschwein nicht in heatmap-targets');

// Cleanup nur das eine Training
await api(`/trainings/${trId}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Pad-XY grün — Heatmap funktioniert jetzt ohne Foto');
process.exit(errors.length ? 1 : 0);
