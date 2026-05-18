/**
 * Verify: webkit-search-cancel-button is hidden on Bows-Liste search.
 * Vor Fix: 2 Clear-X (blau native + grau custom). Nach Fix: nur custom-X.
 */
import { chromium, devices } from 'playwright';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

await page.goto(`${BASE}/bows`);
await page.waitForLoadState('networkidle');

const sb = page.locator('input[type="search"]').first();
await sb.fill('Compound');
await page.waitForTimeout(400);

const result = await page.evaluate(() => {
  const input = document.querySelector('input[type="search"]');
  if (!input) return { ok: false, reason: 'no search input' };
  const styles = window.getComputedStyle(input, '::-webkit-search-cancel-button');
  return {
    ok: true,
    appearance: styles.getPropertyValue('-webkit-appearance') || styles.getPropertyValue('appearance'),
    display: styles.display,
  };
});

console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: 'test-report/equipment/verify-search-x.png' });

await browser.close();
process.exit(0);
