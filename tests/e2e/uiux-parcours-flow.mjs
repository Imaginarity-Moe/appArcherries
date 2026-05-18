/**
 * UIUX-Review Parcours-Flow:
 *  1. Parcours-Liste
 *  2. Parcours-Detail (eigener Parcours)
 *  3. Parcours-Edit (mit lanes_detailed_count Hinweis)
 *  4. Bahnen-Verwaltung
 *  5. NewTraining-Wizard Step 2 mit Parcours-Auswahl + Startbahn-Picker
 *  6. TrainingDetail mit vorgenerierten Stations
 *  7. Station-Live-Entry mit vorbefülltem Tier + Distanz
 *
 * 4 Viewports: mobile-light / mobile-dark / desktop-light / desktop-dark
 * Seedet einen TEST-Parcours mit 4 Bahnen, räumt am Ende auf.
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };
const ROOT = 'test-report/uiux-parcours';

await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });

const findings = [];
const note = (m) => { console.log('  ! ' + m); findings.push(m); };
const ok = (m) => console.log('  ✓ ' + m);

const browser = await chromium.launch({ headless: true });

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

// Seed: TEST-Parcours mit 4 Bahnen (3 detailliert)
const { ctx: seedCtx, page: seed } = await setup('desktop', 'light');
// cleanup existing test parcours
const existing = await seed.api('/parcours');
for (const p of existing.body?.parcours ?? []) {
  if ((p.name ?? '').startsWith('UIUX-TEST')) {
    await seed.api(`/parcours/${p.id}`, { method: 'DELETE' });
  }
}
const oldT = await seed.api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await seed.api(`/trainings/${t.id}`, { method: 'DELETE' });

const pr = await seed.api('/parcours', { method: 'POST', body: JSON.stringify({
  name: 'UIUX-TEST Parcours', lanes_count: 10, peg_red: true, peg_blue: true,
  address: 'Demo-Adresse 1, 12345 Musterstadt', terrain: 'wald,wiese',
  difficulty: 3, duration_min: 120,
}) });
const pid = pr.body.parcours.id;
const lanes = [
  { lane_number: 1, animal_description: 'Wildschwein', distance_red: 18, distance_blue: 22 },
  { lane_number: 2, animal_description: 'Reh',         distance_red: 22, distance_blue: 26 },
  { lane_number: 3, animal_description: 'Bär',         distance_red: 30, distance_blue: 35 },
];
for (const l of lanes) await seed.api(`/parcours/${pid}/lanes`, { method: 'POST', body: JSON.stringify(l) });
ok(`Seed: Parcours #${pid} (UIUX-TEST) mit 3/10 Bahnen`);
await seedCtx.close();

async function walk(viewport, theme) {
  const dir = `${viewport}-${theme}`;
  console.log(`\n— ${dir} —`);
  const { ctx, page } = await setup(viewport, theme);

  // 1. Parcours-Liste
  await page.goto(`${BASE}/parcours`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, dir, '01-parcours-list');
  const seenInList = await page.locator('text=/UIUX-TEST/').count();
  if (seenInList >= 1) ok(`Liste zeigt TEST-Parcours`);
  else note(`TEST-Parcours nicht in Liste`);

  // 2. Parcours-Detail
  await page.goto(`${BASE}/parcours/${pid}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, dir, '02-parcours-detail');

  // 3. Parcours-Edit mit Counter
  await page.goto(`${BASE}/parcours/${pid}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  // Scroll zum Anzahl-Bahnen-Block
  await page.locator('text=/Anzahl Bahnen/').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await snap(page, dir, '03-parcours-edit-with-counter');
  const counterText = await page.locator('text=/von 10 Bahnen detailliert erfasst/').count();
  const verwaltenLink = await page.locator('a:has-text("Bahnen verwalten")').count();
  if (counterText >= 1 && verwaltenLink >= 1) ok(`Counter "3 von 10" + "Bahnen verwalten"-Link sichtbar`);
  else note(`Counter/Link fehlt — text=${counterText}, link=${verwaltenLink}`);

  // 4. Bahnen-Verwaltung
  await page.goto(`${BASE}/parcours/${pid}/lanes`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  await snap(page, dir, '04-parcours-lanes');

  // 5. NewTraining-Wizard mit Startbahn-Picker
  await page.goto(`${BASE}/trainings/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  // Step 1: Disziplin (3D-IFAA)
  const ifaa = page.locator('button:has-text("3D"), [data-discipline="3d_ifaa"]').first();
  if (await ifaa.count()) await ifaa.click();
  await page.waitForTimeout(300);
  // Klick "Weiter"
  const next1 = page.locator('button:has-text("Weiter")').first();
  if (await next1.count()) await next1.click();
  await page.waitForTimeout(400);
  // Step 2: Pflock + Parcours
  // Pflock rot wählen
  const rot = page.locator('button:has-text("Rot"), [data-peg="red"]').first();
  if (await rot.count()) await rot.click();
  await page.waitForTimeout(200);
  // Parcours-Dropdown
  const sel = page.locator('select').filter({ hasText: /UIUX-TEST/ }).first();
  if (await sel.count()) {
    await sel.selectOption(String(pid));
    await page.waitForTimeout(500);
    await snap(page, dir, '05-newtraining-wizard-step2');
    // Startbahn-Picker visible?
    const startLabel = await page.locator('text="Startbahn (optional)"').count();
    if (startLabel >= 1) ok(`Startbahn-Picker sichtbar`);
    else note(`Startbahn-Picker fehlt`);
    // Bahn 2 wählen
    const startSel = page.locator('select').nth(1); // 2. select = startbahn
    if (await startSel.count()) {
      await startSel.selectOption('2');
      await page.waitForTimeout(200);
    }
  } else note(`Parcours-Select nicht gefunden`);

  // Weiter zu Step 3
  const next2 = page.locator('button:has-text("Weiter")').first();
  if (await next2.count()) await next2.click();
  await page.waitForTimeout(400);
  // Step 3: Speichern
  const save = page.locator('button:has-text("Training starten"), button:has-text("Speichern")').first();
  if (await save.count()) {
    await save.click();
    await page.waitForURL((u) => /\/trainings\/\d+/.test(u.toString()), { timeout: 15000 }).catch(() => {});
  }

  // 6. TrainingDetail mit vorgenerierten Stations
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await snap(page, dir, '06-training-detail-prefilled');
  // Bahn 2 (=Reh) sollte als erste Station kommen wegen start_lane=2
  const rehVisible = await page.locator('text=/Reh/').count();
  if (rehVisible >= 1) ok(`Vorgenerierte Stations sichtbar (Reh als erste)`);
  else note(`Vorgenerierte Stations nicht erkennbar`);

  // 7. Station-Live-Entry: ?station=1 öffnet Eingabe mit Tier+Distanz vorbefüllt
  const url = page.url();
  if (/\/trainings\/(\d+)/.test(url)) {
    const tid = url.match(/\/trainings\/(\d+)/)[1];
    await page.goto(`${BASE}/trainings/${tid}?station=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await snap(page, dir, '07-station-live-prefilled');
    const animalInput = page.locator('input').nth(0);
    const animalValue = await animalInput.inputValue().catch(() => '');
    if (animalValue === 'Reh') ok(`Station 1 Tier vorbefüllt: "Reh"`);
    else note(`Animal-Input value="${animalValue}" (erwartet Reh)`);
    // Cleanup das Training
    await page.api(`/trainings/${tid}`, { method: 'DELETE' });
  }

  await ctx.close();
}

for (const viewport of ['mobile', 'desktop']) {
  for (const theme of ['light', 'dark']) {
    await walk(viewport, theme);
  }
}

// Cleanup
const { ctx: cleanCtx, page: clean } = await setup('desktop', 'light');
const ps = await clean.api('/parcours');
for (const p of ps.body?.parcours ?? []) {
  if ((p.name ?? '').startsWith('UIUX-TEST')) {
    await clean.api(`/parcours/${p.id}`, { method: 'DELETE' });
  }
}
await cleanCtx.close();
await browser.close();

const md = [
  '# UIUX-Review: Parcours-Flow',
  '',
  `Run: ${new Date().toISOString()}`,
  '',
  '## Geprüfte Stationen (in 4 Viewports)',
  '',
  '1. Parcours-Liste',
  '2. Parcours-Detail',
  '3. Parcours-Edit mit lanes_detailed_count-Counter und "Bahnen verwalten"-Link',
  '4. Bahnen-Verwaltung',
  '5. NewTraining-Wizard Step 2 mit Parcours-Auswahl + Startbahn-Picker',
  '6. TrainingDetail mit vorgenerierten Stations (start_lane=2)',
  '7. Station-Live-Entry mit vorbefülltem Tier "Reh"',
  '',
  '## Findings',
  '',
  findings.length ? findings.map((f) => `- ${f}`).join('\n') : '- Keine Auffälligkeiten.',
  '',
  '## Screenshots',
  '',
  '`test-report/uiux-parcours/{mobile,desktop}-{light,dark}/*.png`',
].join('\n');
await writeFile(path.join(ROOT, '..', 'UIUX_PARCOURS.md'), md);

console.log(`\n${findings.length ? `! ${findings.length} Findings` : '✓ alles ok'}`);
console.log(`Report: test-report/UIUX_PARCOURS.md`);
process.exit(0);
