// Plain Playwright smoke test (no @playwright/test framework).
// Run via: node tests/e2e/smoke.mjs
//
// Übersicht:
//  1. Login mit claude-test@archerries.local (Migration 0022 muss live deployed sein)
//  2. Smoke-Test der zentralen Seiten mit Mobile-Viewport + Screenshots
//  3. Reine UI-Verifikation, kein Cleanup nötig.

import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const SHOT_DIR   = join(REPO_ROOT, 'screenshots');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL  = process.env.E2E_BASE_URL  ?? 'http://localhost:5173';
const TEST_EMAIL = process.env.E2E_EMAIL    ?? 'claude-test@archerries.local';
const TEST_PASS  = process.env.E2E_PASS     ?? 'ClaudeTest_2026!';

function shot(page, name) {
  return page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: false });
}

async function main() {
  console.log(`\n→ Starting smoke against ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    locale: 'de-DE',
  , serviceWorkers: "block" });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  try {
    // 1) LOGIN ──────────────────────────────────────────────────────────────
    console.log('1) Login page');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await shot(page, '01-login');

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASS);
    // Submit-Button: kein explizites type="submit", aber inside form → reicht Enter
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => null),
      page.locator('form button.btn-accent, form button:has-text("Anmelden"), form button:has-text("Login"), form button:has-text("Sign in")').first().click(),
    ]);
    if (page.url().includes('/login')) {
      const err = await page.locator('text=/Login fehlgeschlagen|E-Mail.*bestätigen/i').first().textContent().catch(() => null);
      throw new Error(`Login failed (URL still on /login): ${err ?? 'unknown'}`);
    }
    await page.waitForLoadState('networkidle').catch(() => null);
    await shot(page, '02-dashboard');
    console.log('   ✓ logged in,', page.url());

    // 2) PROFILE — Avatar anschauen ───────────────────────────────────────
    console.log('2) Profile + Avatar');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await shot(page, '03-profile');

    // 3) PARCOURS — Liste, Erstellen ───────────────────────────────────────
    console.log('3) Parcours list');
    await page.goto(`${BASE_URL}/parcours`, { waitUntil: 'networkidle' });
    await shot(page, '04-parcours-list');

    // Prüfen, ob "Neuer Parcours"-CTA da ist und klicken
    console.log('4) Parcours anlegen');
    await page.goto(`${BASE_URL}/parcours/new`, { waitUntil: 'networkidle' });
    await shot(page, '05-parcours-new');

    const testParcoursName = `E2E ${new Date().toISOString().slice(0, 16)}`;
    // Name-Feld finden (placeholder oder label, je nach Form)
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name" i]').first();
    if (await nameInput.count()) {
      await nameInput.fill(testParcoursName);
    } else {
      // Fallback: erstes Input
      await page.locator('input').first().fill(testParcoursName);
    }

    // Pflöcke aktivieren (zumindest blau und rot, damit Bahnen-Editor was hat)
    const pegBlue   = page.locator('label:has-text("Blau") input[type="checkbox"], input[type="checkbox"][name="peg_blue"]').first();
    const pegRed    = page.locator('label:has-text("Rot")  input[type="checkbox"], input[type="checkbox"][name="peg_red"]').first();
    if (await pegBlue.count()) await pegBlue.check().catch(() => null);
    if (await pegRed.count())  await pegRed.check().catch(() => null);

    // Submit: NewParcours/ParcoursEdit nutzen footer-actions mit form.requestSubmit().
    // Wir submitten direkt via DOM, das ist robust gegen UI-Varianten.
    await Promise.all([
      page.waitForURL(/\/parcours\/\d+(?!\/(new|edit|lanes))/, { timeout: 20000 }).catch(() => null),
      page.evaluate(() => {
        const form = document.getElementById('parcours-new-form');
        if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
      }),
    ]);
    await page.waitForLoadState('networkidle').catch(() => null);
    await shot(page, '06-parcours-detail');
    const parcoursDetailUrl = page.url();
    const parcoursIdMatch = parcoursDetailUrl.match(/\/parcours\/(\d+)/);
    if (!parcoursIdMatch) {
      const bodyText = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Parcours-ID nicht in URL: ${parcoursDetailUrl}\n--- body: ${bodyText.slice(0, 400)}`);
    }
    const parcoursId = parcoursIdMatch[1];
    console.log('   ✓ parcours created:', parcoursId);

    // 5) BAHNEN ─────────────────────────────────────────────────────────────
    console.log('5) Bahnen-Verwaltung');
    await page.goto(`${BASE_URL}/parcours/${parcoursId}/lanes`, { waitUntil: 'networkidle' });
    await shot(page, '07-lanes-empty');

    // Erste Bahn anlegen
    const newLaneBtn = page.locator('button:has-text("Erste Bahn anlegen"), button:has-text("Neue Bahn")').first();
    if (await newLaneBtn.count()) {
      await newLaneBtn.click();
    }
    await page.waitForTimeout(300);

    // Fill Lane-Form
    const animalInput = page.locator('input[placeholder*="Rehbock" i], input[placeholder*="Tier" i]').first();
    if (await animalInput.count()) await animalInput.fill('Test-Tier 1');
    const distanceBlueInput = page.locator('label:has-text("Blau") input[type="number"]').first();
    if (await distanceBlueInput.count()) await distanceBlueInput.fill('15');
    const distanceRedInput = page.locator('label:has-text("Rot") input[type="number"]').first();
    if (await distanceRedInput.count()) await distanceRedInput.fill('20');

    await shot(page, '08-lanes-editor');

    const saveLaneBtn = page.locator('button[type="submit"]:has-text("Speichern")').first();
    if (await saveLaneBtn.count()) {
      await saveLaneBtn.click();
      await page.waitForTimeout(800);
    }
    await shot(page, '09-lanes-one');

    // 6) TRAINING starten (3D IFAA Standard) ───────────────────────────────
    console.log('6) Training starten');
    await page.goto(`${BASE_URL}/trainings/new?parcours=${parcoursId}`, { waitUntil: 'networkidle' });
    await shot(page, '10-new-training-step1');

    // Disziplin "3D · IFAA Standard" auswählen (= 3d_ifaa)
    const ifaaBtn = page.locator('button:has-text("IFAA"), [data-discipline="3d_ifaa"]').first();
    if (await ifaaBtn.count()) {
      await ifaaBtn.click();
    }
    // Step 1 → 2 Button
    const nextBtn1 = page.locator('button:has-text("Weiter"), button:has-text("Next"), button[type="submit"]').first();
    await nextBtn1.click().catch(() => null);
    await page.waitForTimeout(500);
    await shot(page, '11-new-training-step2');

    // Versuche schnell durchzuwizardeln — Bow-Klick, Distanzfrage (falls da), Submit
    const recurveBtn = page.locator('button:has-text("Recurve")').first();
    if (await recurveBtn.count()) await recurveBtn.click().catch(() => null);
    const nextBtn2 = page.locator('button:has-text("Weiter"), button:has-text("Next")').last();
    await nextBtn2.click().catch(() => null);
    await page.waitForTimeout(400);
    await shot(page, '12-new-training-step3');

    // Endgültig anlegen (markierte/unmarkierte Distanz egal)
    const markedBtn = page.locator('button:has-text("Distanz markiert"), button:has-text("marked"), button:has-text("Markiert")').first();
    if (await markedBtn.count()) await markedBtn.click().catch(() => null);

    const createBtn = page.locator('button:has-text("Starten"), button:has-text("Anlegen"), button:has-text("Erstellen")').first();
    if (await createBtn.count()) {
      await Promise.all([
        page.waitForURL(/\/trainings\/\d+/, { timeout: 15000 }).catch(() => null),
        createBtn.click(),
      ]);
    }
    await page.waitForLoadState('networkidle').catch(() => null);
    await shot(page, '13-training-overview');

    // 7) STATIONS-EINGABE (3D IFAA, Station 1) ─────────────────────────────
    console.log('7) Stations-Live-Entry');
    // Erste Station hinzufügen
    const addStationBtn = page.locator('button:has-text("Station 1"), button:has-text("hinzufügen"):has-text("1"), button:has-text("Hinzufügen")').first();
    if (await addStationBtn.count()) {
      await addStationBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Direkter Deep-Link
      const tIdMatch = page.url().match(/\/trainings\/([^/?]+)/);
      const tId = tIdMatch ? tIdMatch[1] : null;
      if (tId) await page.goto(`${BASE_URL}/trainings/${tId}?station=1`, { waitUntil: 'networkidle' });
    }
    await shot(page, '14-station-live-empty');

    // BullseyePad: zentraler Ring (Inner Kill) — der MUSS jetzt innen liegen.
    const svg = page.locator('svg[viewBox="0 0 200 200"]').first();
    const svgBox = await svg.boundingBox();
    if (svgBox) {
      // Klick aufs Zentrum → muss "Inner Kill" (20 Punkte für 1. Pfeil) treffen
      await page.mouse.click(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
      await page.waitForTimeout(300);
      await shot(page, '15-station-after-center-click');
    } else {
      console.log('   ! BullseyePad SVG nicht gefunden');
    }

    // Footerbar-Check: Bei Eingabe darf KEINE Default-Bottom-Nav sichtbar sein
    const navHomeVisible = await page.locator('nav[aria-label="Hauptnavigation"]').isVisible().catch(() => false);
    if (navHomeVisible) errors.push('Default-Bottom-Nav ist während StationLiveEntry sichtbar (Footer-Hide funktioniert nicht)');
    else console.log('   ✓ Footer-Nav während Live-Eingabe versteckt');

    // 8) STATS, HELP, BOWS, DASHBOARD ───────────────────────────────────────
    console.log('8) andere Seiten');
    for (const [route, name] of [
      ['/', '16-dashboard'],
      ['/stats', '17-stats'],
      ['/help', '18-help'],
      ['/bows', '19-bows'],
    ]) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' }).catch(() => null);
      await page.waitForTimeout(300);
      await shot(page, name);
    }

    console.log('\n→ Smoke complete.');
    if (errors.length) {
      console.log('\n[ERRORS DETECTED]');
      for (const e of errors) console.log(' -', e);
      process.exitCode = 1;
    } else {
      console.log('   ✓ keine console.errors / pageerrors');
    }
  } catch (err) {
    console.error('\n[SMOKE ABORTED]', err.message);
    await shot(page, 'X-error').catch(() => null);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
