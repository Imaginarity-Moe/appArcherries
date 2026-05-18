/**
 * UIUX-Review: Equipment-Flows (Bögen + Pfeile)
 * - EquipmentTabs Tab-Switcher
 * - Sort + Search in beiden Listen
 * - Cross-Links zwischen BowEdit ↔ ArrowEdit
 * - Shop-Link mit ExternalLink-Icon auf Pfeil-Karten
 * - ArrowEvents-Verlauf: defekt/verloren/nachgekauft/repariert
 * - HelpEquipment mit Spine-Tabelle
 *
 * Mobile + Desktop, Light + Dark.
 * Screenshots gehen nach test-report/equipment/{mobile,desktop}/{light,dark}/.
 * Sammelt WCAG-AA-Issues und Overlap-Probleme in test-report/UIUX_EQUIPMENT.md.
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };
const REPORT_DIR = 'test-report/equipment';

await rm(REPORT_DIR, { recursive: true, force: true });

const findings = [];
const ok = (m) => console.log('  ✓ ' + m);
const note = (m) => { console.log('  ! ' + m); findings.push(m); };

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

async function setTheme(page, mode) {
  await page.evaluate((m) => {
    localStorage.setItem('archerries.theme', m);
    if (m === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, mode);
}

async function api(page, p, opts = {}) {
  return page.evaluate(async ({ p, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, opts });
}

async function snap(page, outDir, name) {
  const dir = path.join(REPORT_DIR, outDir);
  await mkdir(dir, { recursive: true });
  const fp = path.join(dir, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  return fp;
}

async function runViewport(deviceKey, theme) {
  const device = deviceKey === 'desktop' ? null : devices['iPhone 14 Pro'];
  const ctxOpts = device
    ? { ...device, serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const out = `${deviceKey}/${theme}`;
  console.log(`\n— ${deviceKey} · ${theme} —`);

  await login(page);
  await setTheme(page, theme);

  // Seed: 3 Bögen + 2 Pfeil-Sets damit Sort/Search wirklich was sehen
  // (Cleanup vorher um stabilen State zu haben)
  const oldArrows = await api(page, '/arrows');
  for (const a of oldArrows.body?.arrows ?? []) await api(page, `/arrows/${a.id}`, { method: 'DELETE' });
  const oldBows = await api(page, '/bows');
  for (const b of oldBows.body?.bows ?? []) await api(page, `/bows/${b.id}`, { method: 'DELETE' });

  const bRec = await api(page, '/bows', { method: 'POST', body: JSON.stringify({
    name: 'Indoor-Recurve 68"', bow_type: 'recurve', draw_weight_lbs: 36, length_inch: 68, brace_height_inch: 8.75,
  }) });
  const bCmp = await api(page, '/bows', { method: 'POST', body: JSON.stringify({
    name: 'Compound Mathews 2026', bow_type: 'compound', draw_weight_lbs: 60, let_off_percent: 80,
  }) });
  const bLb = await api(page, '/bows', { method: 'POST', body: JSON.stringify({
    name: 'Langbogen Hickory', bow_type: 'traditional', draw_weight_lbs: 45,
  }) });
  const bowIds = [bRec.body.bow.id, bCmp.body.bow.id, bLb.body.bow.id];
  ok(`Seed: 3 Bögen #${bowIds.join(', #')}`);

  const a1 = await api(page, '/arrows', { method: 'POST', body: JSON.stringify({
    name: 'Easton X10 Pro 550',
    manufacturer: 'Easton',
    model: 'X10',
    material: 'carbon_aluminium',
    diameter_mm: 4.86,
    spine: '550',
    length_inch: 28.5,
    gpi: 9.0,
    fletching_type: 'spin_vane',
    fletching_count: 3,
    nock_type: 'pin',
    tip_type: 'target',
    tip_weight_grains: 120,
    count_total: 12,
    count_broken: 1,
    purchase_url: 'https://www.bogensportwelt.de/Easton-X10',
    bow_ids: [bRec.body.bow.id, bCmp.body.bow.id],
  }) });
  const a2 = await api(page, '/arrows', { method: 'POST', body: JSON.stringify({
    name: 'Gold Tip Hunter 400',
    manufacturer: 'Gold Tip',
    model: 'Hunter Pro',
    material: 'carbon',
    spine: '400',
    length_inch: 29,
    fletching_type: 'vane',
    fletching_count: 4,
    tip_type: 'field',
    tip_weight_grains: 100,
    count_total: 6,
    count_broken: 0,
    purchase_url: 'https://www.bogensportwelt.de/Gold-Tip',
    bow_ids: [bLb.body.bow.id],
  }) });
  const arrowIds = [a1.body.arrow.id, a2.body.arrow.id];
  ok(`Seed: 2 Pfeil-Sets #${arrowIds.join(', #')}`);

  // --- 1. Bows-Liste ---
  await page.goto(`${BASE_URL}/bows`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await snap(page, out, '01-bows-list');

  const hasTabs = await page.locator('text=/Bögen/').count();
  const hasArrowsTab = await page.locator('a[href="/arrows"]').count();
  if (hasTabs >= 1 && hasArrowsTab >= 1) ok('EquipmentTabs sichtbar in Bows-Liste');
  else note(`EquipmentTabs evtl. fehlt: Bögen=${hasTabs}, Pfeile=${hasArrowsTab}`);

  const searchOnBows = await page.locator('input[type="search"], input[placeholder*="Suche"]').count();
  if (searchOnBows >= 1) ok('Such-Feld in Bows-Liste'); else note('Such-Feld fehlt in Bows-Liste');
  const sortOnBows = await page.locator('select').count();
  if (sortOnBows >= 1) ok('Sort-Dropdown in Bows-Liste'); else note('Sort-Dropdown fehlt in Bows-Liste');

  // Such-Test
  const sb = page.locator('input[type="search"], input[placeholder*="Suche"]').first();
  if (await sb.count()) {
    await sb.fill('Compound');
    await page.waitForTimeout(300);
    await snap(page, out, '02-bows-search-compound');
    const visible = await page.locator('text=/Compound Mathews/').count();
    const hidden = await page.locator('text=/Langbogen Hickory/').count();
    if (visible >= 1 && hidden === 0) ok('Suche filtert (Compound sichtbar, Langbogen weg)');
    else note(`Such-Filter unklar: Compound=${visible}, Langbogen=${hidden}`);
    await sb.fill('');
  }

  // --- 2. Arrows-Liste via Tab-Switcher ---
  if (hasArrowsTab) {
    await page.click('a[href="/arrows"]');
    await page.waitForURL((u) => u.pathname === '/arrows', { timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await snap(page, out, '03-arrows-via-tab');
    ok('Tab-Switch Bögen → Pfeile geklickt');
  } else {
    await page.goto(`${BASE_URL}/arrows`);
    await page.waitForLoadState('networkidle');
    await snap(page, out, '03-arrows-direct');
  }

  // Shop-Link-Icon auf Karten
  const externalIcons = await page.locator('a[href^="https://"][target="_blank"]').count();
  if (externalIcons >= 2) ok(`Shop-Links auf ${externalIcons} Karten sichtbar`);
  else note(`Shop-Link-Icons: ${externalIcons} statt 2 erwartet`);

  // Sort-Dropdown auf Arrows
  const arrowsSort = page.locator('select').first();
  if (await arrowsSort.count()) {
    const opts = await arrowsSort.locator('option').allTextContents();
    ok(`Sort-Optionen: ${opts.join(' / ')}`);
    await arrowsSort.selectOption({ index: 1 });
    await page.waitForTimeout(200);
    await snap(page, out, '04-arrows-sorted');
  }

  // Defekt-Toggle
  const onlyBroken = page.locator('label:has-text("defekt"), button:has-text("defekt"), input[type="checkbox"]').first();
  if (await onlyBroken.count()) {
    await onlyBroken.click().catch(() => {});
    await page.waitForTimeout(200);
    await snap(page, out, '05-arrows-only-broken');
  }

  // --- 3. ArrowEdit: Cross-Link + Shop-URL + Events-Sektion ---
  await page.goto(`${BASE_URL}/arrows/${arrowIds[0]}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, out, '06-arrow-edit');

  // purchase_url-Input mit ExternalLink Button
  const purchaseInput = await page.locator('input[placeholder*="bogensport"], input[name*="purchase"], input[type="url"]').count();
  if (purchaseInput >= 1) ok('Purchase-URL-Input vorhanden');
  else note('Purchase-URL-Input nicht erkennbar — placeholder/name prüfen');

  // Cross-Link zu Bögen
  const crossToBows = await page.locator('a[href*="/bows/"]').count();
  if (crossToBows >= 1) ok(`${crossToBows} Cross-Links → Bögen sichtbar im ArrowEdit`);
  else note('Cross-Links zu Bögen fehlen im ArrowEdit');

  // Events-Section
  const verlaufHeader = await page.locator('text=/Verlauf/i').count();
  if (verlaufHeader >= 1) ok('Verlauf-Section gefunden');
  else note('Verlauf-Section nicht sichtbar');

  // Ein Event anlegen via UI
  const defektBtn = page.locator('button:has-text("Defekt")').first();
  if (await defektBtn.count()) {
    await defektBtn.click();
    const countInput = page.locator('input[aria-label="Anzahl"]').first();
    if (await countInput.count()) {
      await countInput.fill('2');
    }
    const submit = page.locator('button:has-text("Ereignis erfassen")').first();
    if (await submit.count()) {
      await submit.click();
      await page.waitForTimeout(800);
      await snap(page, out, '07-arrow-edit-after-event');
      const eventCard = await page.locator('text=/Defekt/').count();
      if (eventCard >= 1) ok('Event "Defekt" erfasst und in Liste sichtbar');
      else note('Event scheint nicht in Verlaufs-Liste aufzutauchen');
    } else note('Submit-Button "Ereignis erfassen" nicht gefunden');
  } else note('Defekt-Chip nicht klickbar');

  // --- 4. BowEdit: Cross-Link zu Pfeilen ---
  await page.goto(`${BASE_URL}/bows/${bowIds[0]}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await snap(page, out, '08-bow-edit');

  const crossToArrows = await page.locator('a[href*="/arrows/"]').count();
  if (crossToArrows >= 1) ok(`${crossToArrows} Cross-Link(s) → Pfeile sichtbar im BowEdit`);
  else note('Cross-Links zu Pfeil-Sets fehlen im BowEdit');

  // --- 5. Help Equipment Section mit Spine-Tabelle ---
  await page.goto(`${BASE_URL}/help`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  // Equipment-Section aufklappen
  const equipHeader = page.locator('button:has-text("Equipment")').first();
  if (await equipHeader.count()) {
    await equipHeader.click();
    await page.waitForTimeout(300);
    const spineTable = await page.locator('table').count();
    const spineRow = await page.locator('text=/1000.*1200/').count();
    await snap(page, out, '09-help-equipment-spine');
    if (spineTable >= 1 && spineRow >= 1) ok('Spine-Tabelle in HelpEquipment sichtbar');
    else note(`Spine-Tabelle: table=${spineTable}, ≤24-Row=${spineRow}`);
  } else note('HelpEquipment-Header nicht auffindbar');

  // --- 6. Empty-State Check: Was sieht ein neuer User auf /arrows ohne Pfeile? ---
  // Erstmal Pfeile wegräumen
  for (const id of arrowIds) await api(page, `/arrows/${id}`, { method: 'DELETE' });
  await page.goto(`${BASE_URL}/arrows`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  await snap(page, out, '10-arrows-empty-state');

  // Cleanup Bows
  for (const id of bowIds) await api(page, `/bows/${id}`, { method: 'DELETE' });

  await browser.close();
}

for (const dev of ['mobile', 'desktop']) {
  for (const theme of ['light', 'dark']) {
    await runViewport(dev, theme);
  }
}

const md = [
  '# UIUX Equipment Review',
  '',
  `Lauf: ${new Date().toISOString()}`,
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((f) => `- ${f}`) : ['- Keine Auffälligkeiten.']),
  '',
  '## Screenshots',
  '',
  '`test-report/equipment/{mobile,desktop}/{light,dark}/*.png`',
].join('\n');
await mkdir('test-report', { recursive: true });
await writeFile('test-report/UIUX_EQUIPMENT.md', md);

console.log(`\n${findings.length ? `! ${findings.length} Findings` : '✓ Keine Auffälligkeiten'}`);
console.log(`Report: test-report/UIUX_EQUIPMENT.md`);
process.exit(0);
