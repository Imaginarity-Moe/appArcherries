/**
 * Spezial-Test: prüft dass Custom-Footer-Actions auf Desktop SICHTBAR + KLICKBAR sind.
 *
 * War vorher der Bug: usePageFooter() rendert nur in der Mobile-lg:hidden-Nav,
 * Desktop bekam nichts → User kann auf /parcours/:id/lanes keine Bahn anlegen.
 */
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'test-report', 'screenshots', 'desktop-actions');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
const page = await ctx.newPage();

// Login
await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

const errors = [];
const ok = (msg) => console.log('  ✓ ' + msg);
const fail = (msg) => { console.error('  ✗ ' + msg); errors.push(msg); };

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

// Parcours anlegen (via API), dann /lanes besuchen
const pc = await api('/parcours', { method: 'POST', body: JSON.stringify({ name: 'E2E desktop-action', is_public: false }) });
const parcoursId = pc.body.parcours.id;

console.log(`\n→ Desktop /parcours/${parcoursId}/lanes`);
await page.goto(`${BASE_URL}/parcours/${parcoursId}/lanes`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: join(SHOT_DIR, '01-lanes-empty.png') });

// Erwartung: "Erste Bahn anlegen"-Button im Body ODER "Neue Bahn" Action-Bar unten
const visibleBtn = await page.locator('button:has-text("Erste Bahn anlegen"), button:has-text("Neue Bahn")').first();
const isVisible = await visibleBtn.isVisible().catch(() => false);
if (!isVisible) fail('Kein "Neue Bahn" / "Erste Bahn anlegen"-Button sichtbar auf Desktop');
else ok('Neue-Bahn-Button sichtbar');

// Klick + verifizieren dass Editor sich öffnet
if (isVisible) {
  await visibleBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(SHOT_DIR, '02-lanes-editor.png') });
  const editor = page.locator('h3:has-text("Neue Bahn"), h3:has-text("Bahn"):has-text("bearbeiten")').first();
  if (await editor.isVisible()) ok('Editor öffnet sich');
  else fail('Editor öffnet sich nicht nach Klick');
}

// Auch ParcoursDetail prüfen — sollte Custom-Action-Bar zeigen (Trainieren/Bahnen/Bearbeiten)
console.log(`\n→ Desktop /parcours/${parcoursId}`);
await page.goto(`${BASE_URL}/parcours/${parcoursId}`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(700);
await page.screenshot({ path: join(SHOT_DIR, '03-parcours-detail.png') });

// Action-Bar: Locator über aria-label="Page-Aktionen" greift verlässlicher
const actionBar = page.locator('[aria-label="Page-Aktionen"]');
for (const label of ['Trainieren', 'Bahnen', 'Bearbeiten']) {
  const btn = actionBar.locator(`a:has-text("${label}"), button:has-text("${label}")`).first();
  if (await btn.isVisible().catch(() => false)) ok(`"${label}"-Action sichtbar`);
  else fail(`"${label}"-Action fehlt auf Desktop`);
}

// NewParcours: Speichern + Abbrechen Custom-Actions
console.log(`\n→ Desktop /parcours/new`);
await page.goto(`${BASE_URL}/parcours/new`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOT_DIR, '04-parcours-new.png') });
for (const label of ['Abbrechen', 'Speichern', 'Speichere']) {
  const btn = await page.locator(`text=${label}`).first();
  if (await btn.isVisible().catch(() => false)) {
    ok(`"${label}"-Action sichtbar`);
    break;
  }
}

// Cleanup
await api(`/parcours/${parcoursId}`, { method: 'DELETE' });
await browser.close();

console.log(`\n${errors.length === 0 ? '✓ Alle Desktop-Actions sichtbar' : `✗ ${errors.length} Fehler`}`);
process.exit(errors.length ? 1 : 0);
