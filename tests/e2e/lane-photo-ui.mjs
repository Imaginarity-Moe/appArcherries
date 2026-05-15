/**
 * UI-Test: Bahn anlegen → speichern → Foto im Editor hochladen → verifizieren.
 *
 * Beweist dass der User-Report "kann bei neu angelegter Bahn kein Foto
 * hochladen" gefixt ist: Editor bleibt nach Save mit existingLane offen,
 * der Foto-Block wird sichtbar, Upload via input[type=file] funktioniert.
 */
import { chromium, devices } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOT_DIR  = join(REPO_ROOT, 'test-report', 'screenshots', 'lane-photo-ui');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const PNG_PATH = join(REPO_ROOT, 'public', 'pwa-192x192.png');
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'de-DE' , serviceWorkers: "block" });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message));

await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

// Test-Parcours
const pc = await api('/parcours', { method: 'POST', body: JSON.stringify({ name: 'E2E lane-photo-ui', is_public: false, peg_blue: true }) });
const parcoursId = pc.body.parcours.id;
console.log(`Parcours #${parcoursId} angelegt`);

const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

// Lanes-Page öffnen
await page.goto(`${BASE_URL}/parcours/${parcoursId}/lanes`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOT_DIR, '01-empty.png') });

// "Erste Bahn anlegen" klicken
const newBtn = page.locator('button:has-text("Erste Bahn anlegen"), button:has-text("Neue Bahn")').first();
await newBtn.click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOT_DIR, '02-editor-new.png') });

// Hinweis-Text sichtbar? "Foto-Upload erscheint nach..."
const hintVisible = await page.locator('text=/Foto-Upload erscheint nach/').first().isVisible().catch(() => false);
if (hintVisible) ok('Hinweis "Foto-Upload nach Speichern" sichtbar');
else fail('Hinweis "Foto-Upload nach Speichern" fehlt');

// Form ausfüllen
await page.locator('input[placeholder*="Rehbock" i]').first().fill('Testbahn');
await page.locator('label:has-text("Blau") input[type="number"]').first().fill('15');

// Speichern
await page.locator('button[type="submit"]:has-text("Speichern")').first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: join(SHOT_DIR, '03-after-save.png') });

// Editor sollte JETZT noch offen sein (für Foto-Upload)
const editorTitle = await page.locator('h3:has-text("bearbeiten")').first().isVisible().catch(() => false);
if (editorTitle) ok('Editor bleibt nach Save offen (existingLane gesetzt)');
else fail('Editor schließt nach Save — Foto-Upload nicht erreichbar');

// Foto-Upload-Bereich sichtbar?
const photoSection = await page.locator('text=/Foto.*hochladen|Foto der Bahn/').first().isVisible().catch(() => false);
if (photoSection) ok('Foto-Upload-Section im Editor sichtbar');
else fail('Foto-Upload-Section fehlt');

// File-Upload simulieren
const fileInput = page.locator('input[type="file"]').first();
if (await fileInput.count()) {
  await fileInput.setInputFiles(PNG_PATH);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOT_DIR, '04-after-upload.png') });

  // Bild im Editor sichtbar?
  const imgInEditor = await page.locator('img[alt=""]').first().isVisible().catch(() => false);
  if (imgInEditor) ok('Foto im Editor sichtbar');
  else fail('Foto nicht im Editor sichtbar nach Upload');
} else {
  fail('Kein file-input gefunden');
}

// Verifikation via API: lane.image_url gesetzt?
const lanesAfter = await api(`/parcours/${parcoursId}/lanes`);
const lane = lanesAfter.body?.lanes?.[0];
if (lane?.image_url) ok(`API bestätigt image_url: ${lane.image_url}`);
else fail('API: image_url ist null/leer');

// Cleanup
await api(`/parcours/${parcoursId}`, { method: 'DELETE' });
await browser.close();

console.log(`\n${errors.length ? '✗ ' + errors.length + ' Fehler' : '✓ Lane-Foto-bei-Neuanlage funktioniert'}`);
process.exit(errors.length ? 1 : 0);
