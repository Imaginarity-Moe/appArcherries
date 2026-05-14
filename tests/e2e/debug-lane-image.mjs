import { chromium, devices } from 'playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PNG = readFileSync(join(REPO_ROOT, 'public', 'pwa-192x192.png')).toString('base64');

const BASE_URL = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

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

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.text() };
  }, { path, opts });
}

// Neuen Test-Parcours
const pc = await api('/parcours', { method: 'POST', body: JSON.stringify({ name: 'E2E lane-img', is_public: false }) });
const parcoursId = JSON.parse(pc.body).parcours.id;
console.log('parcours:', parcoursId);

// Neue Bahn
const lane = await api(`/parcours/${parcoursId}/lanes`, { method: 'POST', body: JSON.stringify({ lane_number: 1, animal_description: 'Test' }) });
const laneId = JSON.parse(lane.body).lane.id;
console.log('lane:', laneId);

// Foto hochladen
const up = await page.evaluate(async ({ b64, parcoursId, laneId }) => {
  const token = localStorage.getItem('archerries.token');
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const fd = new FormData();
  fd.append('file', new Blob([arr], { type: 'image/png' }), 'lane.png');
  const r = await fetch(`/api/index.php/parcours/${parcoursId}/lanes/${laneId}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return { status: r.status, body: await r.text() };
}, { b64: PNG, parcoursId, laneId });
console.log('UPLOAD:', up.status, up.body.slice(0, 400));

// Bahn-Detail prüfen
const detail = await api(`/parcours/${parcoursId}/lanes`);
console.log('LANES after upload:', JSON.parse(detail.body).lanes?.[0]);

// Cleanup
await api(`/parcours/${parcoursId}`, { method: 'DELETE' });
await browser.close();
