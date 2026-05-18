import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/animal-pad', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();

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

// Neues 3D-IFAA-Training
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
}) });
const trId = tr.body.training.id;

await page.goto(`${BASE}/trainings/${trId}?station=1`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);

// Tier eintragen
const animalInput = page.locator('input[placeholder*="Wildschwein"], input[placeholder*="Tier"], input').nth(0);
await animalInput.fill('Dickhornschaf');
await page.waitForTimeout(500);  // damit der match angewendet wird

// Empty state
await page.screenshot({ path: 'test-report/animal-pad/01-empty.png' });

// Klick auf Inner Kill (im Herz)
const svg = page.locator('svg.no-tap-highlight').first();
const box = await svg.boundingBox();
console.log(`SVG box: ${JSON.stringify(box)}`);
if (box) {
  // Inner Kill liegt bei (138, 86) in viewBox 240x170 → 0.575, 0.506
  await page.mouse.click(box.x + box.width * 0.575, box.y + box.height * 0.506);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-report/animal-pad/02-after-inner-kill.png' });
}

await api(`/trainings/${trId}`, { method: 'DELETE' });
await browser.close();
console.log('Preview-Screenshots in test-report/animal-pad/');
