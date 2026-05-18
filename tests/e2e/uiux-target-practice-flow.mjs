/**
 * UIUX-Sweep: target_practice-Flow nach letzten Polish-Iterationen.
 *  - TrainingDetail-Cards ohne "—" bei target_practice
 *  - Tabellen-Ansicht-Toggle
 *  - Card-Status "Beendet" / "Läuft"
 *  - SwipeableCard-Klick funktioniert (Desktop)
 *  - Stats-Zonenverteilung separat für 3D / Scheibe
 *  - Heatmap aller Teilnehmer im Summary
 * 4 Viewports.
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };
const ROOT = 'test-report/uiux-tp-polish';

await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const findings = [];
const ok = (m) => console.log('  ✓ ' + m);
const note = (m) => { console.log('  ! ' + m); findings.push(m); };

async function setup(viewport, theme) {
  const opts = viewport === 'mobile'
    ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  page.api = async (p, options = {}) => page.evaluate(async ({ p, options }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(options.headers ?? {}), Authorization: `Bearer ${token}` };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...options, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, options });
  return { ctx, page };
}

async function snap(page, dir, name) {
  await mkdir(path.join(ROOT, dir), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, dir, `${name}.png`), fullPage: false });
}

// Seed: target_practice-Training mit 2 Spielern (Owner + Gast), 3 Pfeile × 3 Ends, scoring=points
const { ctx: seedCtx, page: seed } = await setup('desktop', 'light');
// Cleanup
const oldT = await seed.api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await seed.api(`/trainings/${t.id}`, { method: 'DELETE' });

const tr = await seed.api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'target_practice', bow_type: 'recurve',
  arrows_per_end: 3, num_ends: 3, target_distance_m: 18, target_rings: 10,
  scoring_mode: 'points', shared_scoring_mode: 'solo',
}) });
const trId = tr.body.training.id;

// Gast hinzufügen
await seed.api(`/trainings/${trId}/participants`, { method: 'POST', body: JSON.stringify({ guest_name: 'Demo-Anna' }) });

// Eigene Targets End 1+2 (3 Pfeile je) — Owner via my_participant_id
const det = await seed.api(`/trainings/${trId}`);
const myPid = det.body.training.my_participant_id;
const guestPid = det.body.training.participants.find((p) => p.user_role === 'guest').id;

for (const pid of [myPid, guestPid]) {
  for (let endIdx = 1; endIdx <= 2; endIdx++) {
    const tt = await seed.api(`/trainings/${trId}/targets`, { method: 'POST', body: JSON.stringify({
      target_index: endIdx, for_participant_id: pid,
    }) });
    const tid = tt.body.target.id;
    await seed.api(`/trainings/${trId}/targets/${tid}`, { method: 'PATCH', body: JSON.stringify({
      shots: [
        { arrow_seq: 1, zone: '10', x_norm: 0.5,  y_norm: 0.5 },
        { arrow_seq: 2, zone: '9',  x_norm: 0.55, y_norm: 0.48 },
        { arrow_seq: 3, zone: '8',  x_norm: 0.6,  y_norm: 0.55 },
      ],
      for_participant_id: pid,
    }) });
  }
}
// Training beenden (für Archivierungs-Tests)
await seed.api(`/trainings/${trId}`, { method: 'PATCH', body: JSON.stringify({ ended_at: new Date().toISOString() }) });
console.log(`Seed: target_practice-Training #${trId} mit 2 Spielern × 2 Ends, beendet`);
await seedCtx.close();

async function walk(viewport, theme) {
  const dir = `${viewport}-${theme}`;
  console.log(`\n— ${dir} —`);
  const { ctx, page } = await setup(viewport, theme);

  // 1. Dashboard mit Status-Badge "Beendet" + Teilnehmer-Liste
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, dir, '01-dashboard');
  const ended = await page.locator('text=/Beendet/').first().count();
  const partsTxt = await page.locator('text=/Demo-Anna/').count();
  if (ended >= 1) ok('Status-Badge "Beendet" sichtbar');
  else note('Status-Badge fehlt');
  if (partsTxt >= 1) ok('Teilnehmer "Demo-Anna" auf Card sichtbar');
  else note('Teilnehmer-Anzeige fehlt');

  // 2. Klick auf Card öffnet Detail (Desktop-Bug-Check)
  if (viewport === 'desktop') {
    await page.locator(`a[href="/trainings/${trId}"]`).first().click();
    await page.waitForURL((u) => u.pathname.endsWith(`/trainings/${trId}`), { timeout: 5000 }).catch(() => {});
    if (page.url().includes(`/trainings/${trId}`)) ok('Card-Klick öffnet Detail (Desktop)');
    else note('Card-Klick öffnet KEIN Detail');
  } else {
    await page.goto(`${BASE}/trainings/${trId}`);
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, dir, '02-training-detail');

  // 3. "#1" ohne Bindestrich — animal_or_face fehlt, also kein "—"
  const dashAfterIdx = await page.locator('text=/#1\\s*—/').count();
  if (dashAfterIdx === 0) ok('Kein "#1 —"-Bindestrich');
  else note(`Bindestrich noch da: ${dashAfterIdx}`);

  // 4. Tabellen-Ansicht-Toggle
  const tableBtn = page.locator('button:has-text("Tabelle")').first();
  if (await tableBtn.count()) {
    await tableBtn.click();
    await page.waitForTimeout(300);
    await snap(page, dir, '03-table-view-own');
    const tableHeader = await page.locator('table thead').count();
    if (tableHeader >= 1) ok('Tabellen-Ansicht öffnet');
    else note('Tabelle fehlt nach Toggle');

    // Alle-Teilnehmer-Toggle
    const allCheckbox = page.locator('label:has-text("Alle Teilnehmer") input[type="checkbox"]');
    if (await allCheckbox.count()) {
      await allCheckbox.check();
      await page.waitForTimeout(200);
      await snap(page, dir, '04-table-view-all');
      const annaCol = await page.locator('table th:has-text("Demo-Anna")').count();
      if (annaCol >= 1) ok('Tabelle zeigt Gast-Spalte');
      else note('Gast-Spalte fehlt');
    }
  } else note('Tabellen-Toggle nicht gefunden');

  // 5. Training-Summary mit Multi-Player-Vergleich + Heatmap
  await page.goto(`${BASE}/trainings/${trId}/summary`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await snap(page, dir, '05-summary');
  const compareHeading = await page.locator('text=/Vergleich/i').count();
  const heatmapHeading = await page.locator('text=/Treffer-Heatmap/').count();
  if (compareHeading >= 1) ok('Multi-Player-Vergleichs-Sektion sichtbar');
  else note('Vergleichs-Sektion fehlt');
  if (heatmapHeading >= 1) ok('Heatmap aller Teilnehmer sichtbar');
  else note('Heatmap fehlt');

  // 6. Stats-Page: zone_distribution_target separat zu zone_distribution
  await page.goto(`${BASE}/stats`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await snap(page, dir, '06-stats');
  const scheibeHeader = await page.locator('text=/Scheibe \\(Ringe\\)/').count();
  if (scheibeHeader >= 1) ok('Stats-Sektion "Scheibe (Ringe)" sichtbar');
  else note('Scheiben-Zonenverteilung-Header fehlt');

  await ctx.close();
}

for (const viewport of ['mobile', 'desktop']) {
  for (const theme of ['light', 'dark']) {
    await walk(viewport, theme);
  }
}

// Cleanup
const { ctx: cleanCtx, page: clean } = await setup('desktop', 'light');
await clean.api(`/trainings/${trId}`, { method: 'DELETE' });
await cleanCtx.close();
await browser.close();

const md = [
  '# UIUX-Review: target_practice + Stats-Polish',
  '',
  `Run: ${new Date().toISOString()}`,
  '',
  '## Geprüft',
  '1. Dashboard-Card: Status-Badge + Teilnehmer-Liste',
  '2. Desktop-Klick auf Card → Detail',
  '3. Card-Bindestrich-Fix bei target_practice',
  '4. Tabellen-Ansicht (eigene + alle)',
  '5. Training-Summary: Vergleich + Heatmap',
  '6. Stats: Zonenverteilung 3D vs Scheibe getrennt',
  '',
  '## Findings',
  findings.length ? findings.map((f) => `- ${f}`).join('\n') : '- Keine Auffälligkeiten.',
  '',
  '## Screenshots',
  '`test-report/uiux-tp-polish/{mobile,desktop}-{light,dark}/*.png`',
].join('\n');
await writeFile(path.join(ROOT, '..', 'UIUX_TP_POLISH.md'), md);

console.log(`\n${findings.length ? `! ${findings.length} Findings` : '✓ alles ok'}`);
console.log(`Report: test-report/UIUX_TP_POLISH.md`);
process.exit(0);
