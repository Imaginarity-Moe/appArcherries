/**
 * Verify:
 * 1. Date-Input-Icon ist im Dark-Mode hell sichtbar (color-scheme: dark)
 * 2. Border-Hairlines im Dark-Mode wirken weicher (warm-gray statt reinem Weiß)
 * 3. Build-Info zeigt Berlin-Zeit auf Desktop
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

await mkdir('test-report/dark-fixes', { recursive: true });

const browser = await chromium.launch({ headless: true });

// — Mobile Dark: ArrowEdit (Date-Icon + Borders) —
{
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page.evaluate(() => {
    localStorage.setItem('archerries.theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  // Bow + Pfeil-Set anlegen
  async function api(p, opts = {}) {
    return page.evaluate(async ({ p, opts }) => {
      const token = localStorage.getItem('archerries.token');
      const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
      if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      const r = await fetch(`/api/index.php${p}`, { ...opts, headers });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, { p, opts });
  }
  // cleanup
  const oa = await api('/arrows');
  for (const a of oa.body?.arrows ?? []) await api(`/arrows/${a.id}`, { method: 'DELETE' });
  const ob = await api('/bows');
  for (const b of ob.body?.bows ?? []) await api(`/bows/${b.id}`, { method: 'DELETE' });

  const bow = await api('/bows', { method: 'POST', body: JSON.stringify({ name: 'TestBow', bow_type: 'recurve', draw_weight_lbs: 36 }) });
  const arrow = await api('/arrows', { method: 'POST', body: JSON.stringify({
    name: 'Test-Set', spine: '550', count_total: 6,
    purchased_at: '2026-03-15',
    bow_ids: [bow.body.bow.id],
  }) });

  await page.goto(`${BASE}/arrows/${arrow.body.arrow.id}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // Date-Input-Bereich isolieren
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-report/dark-fixes/01-mobile-arrow-edit-date.png' });

  // Border-Inspektion: chip border-color auslesen
  const borderInspect = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('button, .chip, .input, .card'));
    const samples = chips.slice(0, 5).map((el) => {
      const cs = getComputedStyle(el);
      return { tag: el.tagName, cls: el.className.slice(0, 60), borderColor: cs.borderColor };
    });
    const hairline = getComputedStyle(document.documentElement).getPropertyValue('--border-hairline');
    return { hairline: hairline.trim(), samples };
  });
  console.log('Border samples:', JSON.stringify(borderInspect, null, 2));

  // cleanup
  await api(`/arrows/${arrow.body.arrow.id}`, { method: 'DELETE' });
  await api(`/bows/${bow.body.bow.id}`, { method: 'DELETE' });
  await ctx.close();
}

// — Desktop Dark: Sidebar mit Build-Info (Berlin-Zeit) —
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page.evaluate(() => {
    localStorage.setItem('archerries.theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const sidebarBuild = await page.locator('aside .font-mono').last().textContent().catch(() => null);
  console.log('Desktop sidebar build-info text:', JSON.stringify(sidebarBuild));

  // Screenshot der sidebar
  await page.locator('aside').first().screenshot({ path: 'test-report/dark-fixes/02-desktop-sidebar-build.png' });
  await ctx.close();
}

await browser.close();
console.log('\n✓ Dark-Fixes Verifikation fertig — Screenshots in test-report/dark-fixes/');
process.exit(0);
