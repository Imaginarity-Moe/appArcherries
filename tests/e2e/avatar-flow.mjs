/**
 * Avatar-Upload + Anzeige-Verifikation.
 *
 *  1. Login
 *  2. Generiere 200x200 PNG-Buffer
 *  3. Upload via /me/avatar (multipart)
 *  4. Lese /me → erwarte avatar_url gesetzt
 *  5. Reload → Header-Avatar sollte ein <img> sein (nicht mehr Initialen "CT")
 *  6. Cleanup: Avatar löschen
 */

import { chromium, devices } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const SHOT_DIR   = join(REPO_ROOT, 'test-report', 'screenshots', 'avatar');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL   = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const TEST_EMAIL = process.env.E2E_EMAIL    ?? 'claude-test@archerries.local';
const TEST_PASS  = process.env.E2E_PASS     ?? 'ClaudeTest_2026!';

// Echtes PNG-Bild aus public/ — PHP-GD kann das garantiert dekodieren.
import { readFileSync } from 'fs';
const pngBuffer = readFileSync(join(REPO_ROOT, 'public', 'pwa-192x192.png'));
const RED_PNG_B64 = pngBuffer.toString('base64');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'de-DE' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

const log = (s) => console.log('  ' + s);
const fail = (s) => { console.error('  ✗ ' + s); process.exitCode = 1; };

// Login
await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', TEST_EMAIL);
await page.fill('input[type="password"]', TEST_PASS);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);
log(`logged in: ${page.url()}`);

// Upload via API (das ist genau das, was der UI-Crop-Modal macht — aber ohne UI)
const uploadRes = await page.evaluate(async ({ b64 }) => {
  const token = localStorage.getItem('archerries.token');
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/png' });
  const fd = new FormData();
  fd.append('file', blob, 'avatar.png');
  const res = await fetch('/api/index.php/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return { status: res.status, body: await res.json() };
}, { b64: RED_PNG_B64 });
log(`upload: ${uploadRes.status} → response: ${JSON.stringify(uploadRes.body)}`);
if (uploadRes.status !== 200) fail(`Avatar-Upload schlug fehl: ${JSON.stringify(uploadRes.body)}`);
if (!uploadRes.body?.avatar_url) fail('Backend liefert kein avatar_url zurück');

// /me prüfen
const meRes = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const res = await fetch('/api/index.php/me', { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
});
log(`/me avatar_url = ${meRes?.avatar_url ?? '(none)'}`);
if (!meRes?.avatar_url) fail('/me liefert kein avatar_url nach Upload');

// Reload + Header-Image prüfen
await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOT_DIR, '01-after-upload-profile.png') });

// In der Header-Top-Bar (Mobile) sollte ein <img> drin sein
const headerImg = await page.locator('header img').count();
log(`Header <img> count: ${headerImg}`);
if (headerImg === 0) fail('Kein Avatar-<img> im Header — wird noch Initialen angezeigt');

// Direct image fetch — kommt das Image durch?
const imgUrl = meRes.avatar_url.startsWith('http') ? meRes.avatar_url : `${BASE_URL}${meRes.avatar_url}`;
const imgRes = await page.evaluate(async (u) => {
  const res = await fetch(u);
  return { status: res.status, ct: res.headers.get('Content-Type') };
}, imgUrl);
log(`Avatar-Image HTTP: ${imgRes.status} ${imgRes.ct}`);
if (imgRes.status !== 200) fail(`Avatar-Image lädt nicht: ${imgRes.status}`);

// Cleanup
const delRes = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const res = await fetch('/api/index.php/me/avatar', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return res.status;
});
log(`cleanup delete: ${delRes}`);

await browser.close();
console.log('\n✓ Avatar-Flow OK' + (process.exitCode ? ' (mit Fehlern)' : ''));
