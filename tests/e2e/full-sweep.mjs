/**
 * GRÜNDLICHER Sweep: ALLE Pages, Mobile + Desktop, Light + Dark.
 * Login als claude-test2 (Admin) damit /admin auch funktioniert.
 *
 * Screenshots in test-report/screenshots/full/ — gegliedert nach Variant.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR  = join(__dirname, '..', '..', 'test-report', 'screenshots', 'full');

for (const sub of ['mobile-light', 'mobile-dark', 'desktop-light', 'desktop-dark']) {
  const d = join(ROOT_DIR, sub);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const BASE = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
// claude-test2 wurde via Migration 0056 zum admin gemacht
const USER = { email: 'claude-test2@archerries.local', pass: 'ClaudeTest2_2026!' };

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

async function ensureOnboardingComplete(page) {
  // Falls Onboarding-Gate triggert: via API abschließen
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
}

async function shot(page, dir, name) {
  await page.screenshot({ path: join(ROOT_DIR, dir, `${name}.png`), fullPage: true });
}

async function runVariant({ device, dir, theme }) {
  const browser = await chromium.launch();
  const ctx = device
    ? await browser.newContext({ ...device })
    : await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  try {
    await login(page);
    await applyTheme(page, theme);
    await ensureOnboardingComplete(page);

    const PAGES = [
      // ─── Haupt-Flow ─────────────────────────────────
      { path: '/',                    name: '01-dashboard' },
      { path: '/trainings/new',       name: '02-new-training' },
      { path: '/stats',               name: '03-stats' },
      { path: '/parcours',            name: '04-parcours-list' },
      { path: '/parcours/new',        name: '05-parcours-new' },
      { path: '/bows',                name: '06-bows' },
      { path: '/bows/new',            name: '07-bows-new' },
      { path: '/arrows',              name: '08-arrows' },
      { path: '/arrows/new',          name: '09-arrows-new' },
      { path: '/equipment',           name: '10-equipment' },
      { path: '/friends',             name: '11-friends' },
      { path: '/profile',             name: '12-profile' },

      // ─── Hilfe (5 Themengruppen mit 17 Sections) ────
      { path: '/help',                name: '20-help-overview' },
      { path: '/help/getting_started', name: '21-help-getting-started' },
      { path: '/help/disciplines',    name: '22-help-disciplines' },
      { path: '/help/scoring',        name: '23-help-scoring' },
      { path: '/help/pegs',           name: '24-help-pegs' },
      { path: '/help/bows',           name: '25-help-bows' },
      { path: '/help/stats',          name: '26-help-stats' },
      { path: '/help/offline_sync',   name: '27-help-offline' },
      { path: '/help/routines',       name: '28-help-routines' },
      { path: '/help/power_user',     name: '29-help-power' },
      { path: '/help/faq',            name: '30-help-faq' },
      { path: '/help/privacy',        name: '31-help-privacy' },

      // ─── Admin (claude-test2 ist Admin) ──────────────
      { path: '/admin',               name: '40-admin-list' },

      // ─── Distanz-Training ───────────────────────────
      { path: '/train/distance',      name: '50-distance-training' },

      // ─── Archiv (eigene Page) ───────────────────────
      { path: '/trainings/archive',   name: '60-trainings-archive' },
    ];

    for (const p of PAGES) {
      try {
        await page.goto(`${BASE}${p.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        await shot(page, dir, p.name);
        console.log(`  ✓ ${dir} · ${p.name}`);
      } catch (e) {
        console.log(`  ✗ ${dir} · ${p.name} — ${e.message.split('\n')[0]}`);
      }
    }

    // Admin-Detail (erster User aus der Liste)
    try {
      await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const firstLink = await page.locator('a[href^="/admin/users/"]').first();
      const href = await firstLink.getAttribute('href');
      if (href) {
        await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        await shot(page, dir, '41-admin-user-detail');
        console.log(`  ✓ ${dir} · 41-admin-user-detail`);
      }
    } catch (e) {
      console.log(`  ✗ ${dir} · admin-detail — ${e.message.split('\n')[0]}`);
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
