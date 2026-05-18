/** Visueller Check der TargetPad-Ring-Labels in Mobile + Desktop, Light + Dark. */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };
await mkdir('test-report/target-labels', { recursive: true });

const browser = await chromium.launch({ headless: true });

async function api(page, p, opts = {}) {
  return page.evaluate(async ({ p, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, opts });
}

for (const viewport of ['mobile', 'desktop']) {
  for (const theme of ['light', 'dark']) {
    const opts = viewport === 'mobile' ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
                                       : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', USER.email);
    await page.fill('input[type="password"]', USER.password);
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
      page.evaluate(() => document.querySelector('form')?.requestSubmit()),
    ]);
    await page.evaluate((t) => {
      localStorage.setItem('archerries.theme', t);
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }, theme);

    // target_practice-Training mit 10 Ringen anlegen
    const tr = await api(page, '/trainings', { method: 'POST', body: JSON.stringify({
      discipline: 'target_practice', bow_type: 'recurve',
      arrows_per_end: 3, num_ends: 5, target_distance_m: 18, target_rings: 10,
      scoring_mode: 'points',
    }) });
    const trId = tr.body.training.id;
    await page.goto(`${BASE}/trainings/${trId}?station=1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `test-report/target-labels/${viewport}-${theme}.png`, fullPage: false });

    // DOM-Check: alle text-Elemente im TargetPad-SVG ausgeben
    const labels = await page.evaluate(() => {
      const svg = document.querySelector('svg[viewbox="0 0 100 100"]');
      if (!svg) return null;
      return Array.from(svg.querySelectorAll('text')).map((t) => ({
        text: t.textContent,
        x: t.getAttribute('x'),
        y: t.getAttribute('y'),
        fontSize: t.getAttribute('font-size'),
      }));
    });
    console.log(`\n[${viewport}-${theme}] labels (${labels?.length ?? 0}):`);
    labels?.forEach((l) => console.log(`  "${l.text}" @ (${l.x}, ${l.y}) fs=${l.fontSize}`));

    await api(page, `/trainings/${trId}`, { method: 'DELETE' });
    await ctx.close();
  }
}

await browser.close();
