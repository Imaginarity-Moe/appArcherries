import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/logos', { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const theme of ['light', 'dark']) {
  // Login-Seite (zeigt AuthLayout mit großem Logo)
  const ctx1 = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page1 = await ctx1.newPage();
  // Theme vorab setzen
  await page1.addInitScript((t) => {
    localStorage.setItem('archerries.theme', t);
  }, theme);
  await page1.goto(`${BASE}/login`);
  await page1.waitForLoadState('networkidle');
  // Theme klassisch setzen falls Init nicht greift
  await page1.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  await page1.waitForTimeout(400);
  await page1.screenshot({ path: `test-report/logos/login-${theme}.png`, fullPage: true });
  await ctx1.close();

  // Desktop Sidebar (LogoWordmark)
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/login`);
  await page2.fill('input[type="email"]', USER.email);
  await page2.fill('input[type="password"]', USER.password);
  await Promise.all([
    page2.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page2.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page2.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  await page2.goto(`${BASE}/`);
  await page2.waitForLoadState('networkidle');
  await page2.waitForTimeout(400);
  // Sidebar-Crop
  await page2.locator('aside').first().screenshot({ path: `test-report/logos/sidebar-${theme}.png` });
  await ctx2.close();
}

await browser.close();
console.log('Screenshots in test-report/logos/');
