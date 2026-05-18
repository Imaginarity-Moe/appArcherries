import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.goto('https://archerries.mossig.de/login');
await page.fill('input[type="email"]', 'claude-test@archerries.local');
await page.fill('input[type="password"]', 'ClaudeTest_2026!');
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);
await page.goto('https://archerries.mossig.de/stats');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);
await page.locator('section:has-text("Treffer-Heatmap")').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.locator('section:has-text("Treffer-Heatmap")').screenshot({ path: 'test-report/heatmap/02-seeded-wildschwein.png' });
await page.selectOption('select[aria-label="Tier oder Auflage"]', 'Reh');
await page.waitForTimeout(800);
await page.locator('section:has-text("Treffer-Heatmap")').screenshot({ path: 'test-report/heatmap/03-seeded-reh.png' });
// Filter Distanz 25m
await page.selectOption('select[aria-label="Tier oder Auflage"]', 'Wildschwein');
await page.waitForTimeout(400);
const distSel = page.locator('select[aria-label="Distanz"]');
if (await distSel.count()) {
  await distSel.selectOption({ label: '30 m' });
  await page.waitForTimeout(600);
  await page.locator('section:has-text("Treffer-Heatmap")').screenshot({ path: 'test-report/heatmap/04-seeded-wildschwein-30m.png' });
}
await browser.close();
