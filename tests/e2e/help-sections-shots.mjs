/**
 * Visual-Sweep durch alle 17 Hilfe-Sektionen + Profile + Welcome long-mode.
 * Erzeugt Screenshots in test-report/screenshots/help/ für Visual-Review.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR  = join(__dirname, '..', '..', 'test-report', 'screenshots', 'help');

for (const sub of ['mobile-light', 'mobile-dark', 'desktop-light', 'desktop-dark']) {
  const d = join(ROOT_DIR, sub);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const BASE = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const SECTIONS = [
  'getting_started','install','shared','community','disciplines','scoring',
  'pegs','bows','equipment','stats','offline_sync','routines','power_user',
  'faq','privacy','glossary','app',
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    const root = document.documentElement;
    root.classList.remove('dark');
    if (t === 'dark') root.classList.add('dark');
  }, theme);
}

async function shot(page, dir, name) {
  await page.screenshot({ path: join(ROOT_DIR, dir, `${name}.png`), fullPage: true }).catch(() => {});
}

async function runVariant({ device, dir, theme }) {
  const browser = await chromium.launch();
  const ctx = device ? await browser.newContext({ ...device }) : await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await login(page);
    await applyTheme(page, theme);

    // Hilfeseite — alle Sections nacheinander öffnen
    for (const s of SECTIONS) {
      await page.goto(`${BASE}/help/${s.replace(/_/g, '-')}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await shot(page, dir, `help-${s}`);
      console.log(`  ✓ ${dir} · help/${s}`);
    }

    // Profile mit neuen Tour-Buttons
    await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await shot(page, dir, 'profile');
    console.log(`  ✓ ${dir} · profile`);

    // Welcome long-mode — funktioniert nur wenn onboarding nicht abgeschlossen.
    // Wir scrollen den Wizard durch die Steps.
    await page.goto(`${BASE}/welcome?mode=long`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await shot(page, dir, 'welcome-long-step1');
    console.log(`  ✓ ${dir} · welcome long step1`);

  } finally {
    await browser.close();
  }
}

(async () => {
  console.log('══════ DESKTOP LIGHT ══════');
  await runVariant({ device: null, dir: 'desktop-light', theme: 'light' });
  console.log('══════ DESKTOP DARK ══════');
  await runVariant({ device: null, dir: 'desktop-dark', theme: 'dark' });
  console.log('══════ MOBILE LIGHT ══════');
  await runVariant({ device: devices['iPhone 13'], dir: 'mobile-light', theme: 'light' });
  console.log('══════ MOBILE DARK ══════');
  await runVariant({ device: devices['iPhone 13'], dir: 'mobile-dark', theme: 'dark' });
  console.log('Done.');
})();
