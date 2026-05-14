import { chromium, devices } from 'playwright';

const BASE_URL = 'https://archerries.mossig.de';
const TEST_EMAIL = 'claude-test@archerries.local';
const TEST_PASS  = 'ClaudeTest_2026!';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'de-DE' });
const page = await ctx.newPage();

page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', TEST_EMAIL);
await page.fill('input[type="password"]', TEST_PASS);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);
console.log('logged in:', page.url());

// Training mit 3d_ifaa_hunter anlegen via API
const result = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const res = await fetch('/api/index.php/trainings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      discipline: '3d_ifaa_hunter',
      bow_type: 'recurve',
      started_at: now,
    }),
  });
  return { status: res.status, body: await res.json() };
});
console.log('CREATE result:', JSON.stringify(result));
const tid = result.body?.training?.id ?? result.body?.id;
console.log('Training ID:', tid);

// Detail laden
const det = await page.evaluate(async (id) => {
  const token = localStorage.getItem('archerries.token');
  const res = await fetch(`/api/index.php/trainings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, body: await res.json() };
}, tid);
console.log('DETAIL discipline:', det.body?.training?.discipline);
console.log('DETAIL bow_type:', det.body?.training?.bow_type);

// Page öffnen
await page.goto(`${BASE_URL}/trainings/${tid}?station=1`);
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
await page.waitForTimeout(2000);

// Body content
const html = await page.locator('body').innerHTML();
console.log('\n--- BODY (first 3000 chars) ---');
console.log(html.slice(0, 3000));

// SVG count
const svgCount = await page.locator('svg').count();
console.log('\nSVG count:', svgCount);
const padSvg = await page.locator('svg[viewBox="0 0 200 200"]').count();
console.log('BullseyePad SVG count:', padSvg);

// Cleanup
await page.evaluate(async (id) => {
  const token = localStorage.getItem('archerries.token');
  await fetch(`/api/index.php/trainings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}, tid);

await browser.close();
