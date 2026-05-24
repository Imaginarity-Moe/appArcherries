import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '..', 'test-report', 'screenshots', 'conversions');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

for (const [label, ctxOpts] of [
  ['desktop-1280', { viewport: { width: 1280, height: 900 } }],
  ['desktop-1440', { viewport: { width: 1440, height: 900 } }],
  ['mobile',       devices['iPhone 13']],
]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await login(page);
  await page.goto(`${BASE}/help/conversions`, { waitUntil: 'networkidle' });
  // Wait for at least one converter input to appear (suspense-loaded chunk)
  await page.waitForSelector('input[aria-label="in"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `${label}.png`), fullPage: true });
  console.log(`✓ ${label}`);
  await browser.close();
}
