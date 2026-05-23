/**
 * Schneller Responsive-Audit der wichtigsten überarbeiteten Pages.
 * Screenshots zur visuellen Inspektion in test-report/screenshots/responsive/.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR  = join(__dirname, '..', '..', 'test-report', 'screenshots', 'responsive');

for (const sub of ['mobile-light', 'mobile-dark', 'desktop-light', 'desktop-dark']) {
  const d = join(ROOT_DIR, sub);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const BASE = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
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

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    const root = document.documentElement;
    root.classList.remove('dark');
    if (t === 'dark') root.classList.add('dark');
  }, theme);
}

async function shot(page, dir, name) {
  await page.screenshot({ path: join(ROOT_DIR, dir, `${name}.png`), fullPage: true });
}

async function runVariant({ device, dir, theme }) {
  const browser = await chromium.launch();
  const ctx = device ? await browser.newContext({ ...device }) : await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  try {
    await login(page);
    await applyTheme(page, theme);

    // Falls onboarding-gate noch aktiv ist (welcome), abschließen
    if (page.url().includes('/welcome')) {
      await page.evaluate(async () => {
        const token = localStorage.getItem('archerries.token');
        if (!token) return;
        await fetch('/api/index.php/me/onboarding/complete', {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }
        });
      });
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    }

    const pages = [
      { path: '/help', name: 'help-overview' },
      { path: '/help/disciplines', name: 'help-disciplines' },
      { path: '/help/scoring', name: 'help-scoring' },
      { path: '/help/pegs', name: 'help-pegs' },
      { path: '/help/bows', name: 'help-bows' },
      { path: '/help/stats', name: 'help-stats' },
      { path: '/help/routines', name: 'help-routines' },
      { path: '/help/faq', name: 'help-faq' },
      { path: '/welcome?mode=long', name: 'welcome-long-step1' },
      { path: '/profile', name: 'profile' },
    ];

    for (const p of pages) {
      try {
        await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        await shot(page, dir, p.name);
        console.log(`  ✓ ${dir} · ${p.name}`);
      } catch (e) {
        console.log(`  ✗ ${dir} · ${p.name} — ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log('══ DESKTOP LIGHT ══');
  await runVariant({ device: null, dir: 'desktop-light', theme: 'light' });
  console.log('══ DESKTOP DARK ══');
  await runVariant({ device: null, dir: 'desktop-dark', theme: 'dark' });
  console.log('══ MOBILE LIGHT ══');
  await runVariant({ device: devices['iPhone 13'], dir: 'mobile-light', theme: 'light' });
  console.log('══ MOBILE DARK ══');
  await runVariant({ device: devices['iPhone 13'], dir: 'mobile-dark', theme: 'dark' });
  console.log('Done.');
})();
