import { chromium, devices } from 'playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const BASE_URL = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };
const PNG = readFileSync(join(REPO_ROOT, 'public', 'pwa-192x192.png')).toString('base64');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const page = await ctx.newPage();

await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

// Hochladen
const up = await page.evaluate(async (b64) => {
  const token = localStorage.getItem('archerries.token');
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const fd = new FormData();
  fd.append('file', new Blob([arr], { type: 'image/png' }), 'avatar.png');
  const r = await fetch('/api/index.php/me/avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return { status: r.status, body: await r.text() };
}, PNG);
console.log('UPLOAD:', up.status, up.body.slice(0, 200));

// Erste DELETE
const d1 = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const r = await fetch('/api/index.php/me/avatar', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.text() };
});
console.log('DELETE 1:', d1.status, d1.body.slice(0, 500));

// Zweite DELETE (avatar war schon weg)
const d2 = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const r = await fetch('/api/index.php/me/avatar', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.text() };
});
console.log('DELETE 2:', d2.status, d2.body.slice(0, 500));

await browser.close();
