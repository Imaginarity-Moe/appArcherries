/**
 * Test: Bow-Pages (Mobile + Desktop, Light + Dark)
 * 1. /bows → Liste
 * 2. /bows/new → Form
 * 3. Save → Redirect zu /bows/:id/edit
 * 4. Foto-Upload im Edit
 * 5. Adress-Autocomplete-Dropdown im ParcoursEdit-Dark (Dropdown-Style)
 * 6. Screenshots
 */
import { chromium, devices } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOT_DIR = join(REPO_ROOT, 'test-report', 'screenshots', 'bow-pages');
for (const d of ['mobile-light', 'mobile-dark', 'desktop-light', 'desktop-dark']) {
  const p = join(SHOT_DIR, d);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const PNG = readFileSync(join(REPO_ROOT, 'public', 'pwa-192x192.png'));
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
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

async function api(page, path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

const browser = await chromium.launch({ headless: true });

async function runViewport(vpName, ctxOpts) {
  for (const theme of ['light', 'dark']) {
    const dir = `${vpName}-${theme}`;
    console.log(`\n══ ${dir} ══`);

    const ctx = await browser.newContext({ ...ctxOpts, locale: 'de-DE', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message));

    try {
      await login(page);
      await applyTheme(page, theme);
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);

      // Setup: ein Bogen vorab anlegen
      const bow = await api(page, '/bows', {
        method: 'POST',
        body: JSON.stringify({ name: `Test-Bogen ${theme}`, bow_type: 'recurve', draw_weight_lbs: 38, arrow_spine: '700' }),
      });
      const bowId = bow.body?.bow?.id;

      // /bows Liste
      await page.goto(`${BASE_URL}/bows`);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(SHOT_DIR, dir, '01-list.png') });

      // /bows/new — Form ohne Modal
      await page.goto(`${BASE_URL}/bows/new`);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(SHOT_DIR, dir, '02-new.png') });

      // /bows/:id/edit — mit Foto-Upload-Block
      if (bowId) {
        await page.goto(`${BASE_URL}/bows/${bowId}/edit`);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(SHOT_DIR, dir, '03-edit.png') });

        // Foto hochladen
        const file = await page.locator('input[type="file"]').first();
        if (await file.count()) {
          // Use setInputFiles with buffer
          await file.setInputFiles({ name: 'bow.png', mimeType: 'image/png', buffer: PNG });
          await page.waitForTimeout(1500);
          await page.screenshot({ path: join(SHOT_DIR, dir, '04-edit-with-photo.png') });
        }
      }

      // ParcoursEdit für AddressAutocomplete-Dropdown im Dark-Mode
      const pc = await api(page, '/parcours', { method: 'POST', body: JSON.stringify({ name: `E2E ${theme} addr`, address: 'Berlin' }) });
      const parcoursId = pc.body?.parcours?.id;
      if (parcoursId) {
        await page.goto(`${BASE_URL}/parcours/${parcoursId}/edit`);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
        await page.waitForTimeout(500);
        // Auf Adress-Input fokussieren und tippen → Dropdown öffnet sich
        const addrInput = page.locator('input[autocomplete="off"]').first();
        if (await addrInput.count()) {
          await addrInput.click();
          await addrInput.fill('Berlin');
          // Warten bis Vorschläge laden (Nominatim 350ms debounce + network)
          await page.waitForTimeout(1500);
          await page.screenshot({ path: join(SHOT_DIR, dir, '05-address-dropdown.png') });
        }
        // Cleanup parcours
        await api(page, `/parcours/${parcoursId}`, { method: 'DELETE' });
      }

      // Cleanup bow
      if (bowId) await api(page, `/bows/${bowId}`, { method: 'DELETE' });
    } finally {
      await ctx.close();
    }
  }
}

await runViewport('mobile', { ...devices['iPhone 14 Pro'] });
await runViewport('desktop', { viewport: { width: 1440, height: 900 } });
await browser.close();
console.log('\n✓ Bow-Pages Screenshots in', SHOT_DIR);
