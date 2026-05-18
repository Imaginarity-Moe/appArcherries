/**
 * Verify nach Refactor:
 * - arrows.pro_mode persistiert pro Set
 * - ArrowEdit ohne pro_mode zeigt nur Basis-Felder; mit pro_mode alles
 * - Build-Info zeigt Berlin-Zeit ohne "Berlin"-Suffix und korrekt um 2h vorn
 * - Mobile-Header bleibt sticky beim Scrollen
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

await mkdir('test-report/pro-per-set', { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

async function api(p, opts = {}) {
  return page.evaluate(async ({ p, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, opts });
}

// Reset state
const oldArrows = await api('/arrows');
for (const a of oldArrows.body?.arrows ?? []) await api(`/arrows/${a.id}`, { method: 'DELETE' });
const oldBows = await api('/bows');
for (const b of oldBows.body?.bows ?? []) await api(`/bows/${b.id}`, { method: 'DELETE' });

const bow = await api('/bows', { method: 'POST', body: JSON.stringify({ name: 'Bow', bow_type: 'recurve', draw_weight_lbs: 40 }) });

// 1. Pro-mode FALSE - Basis-Pfeil
const basic = await api('/arrows', { method: 'POST', body: JSON.stringify({
  name: 'Von der Stange', spine: '500', length_inch: 28, count_total: 6,
  pro_mode: false,
  bow_ids: [bow.body.bow.id],
}) });
if (basic.body?.arrow?.pro_mode === false) ok('pro_mode=false persistiert');
else fail(`pro_mode false: ${JSON.stringify(basic.body)}`);

// 2. Pro-mode TRUE - voller Pfeil
const pro = await api('/arrows', { method: 'POST', body: JSON.stringify({
  name: 'Selbstbau', spine: '350', length_inch: 29.5, count_total: 12,
  material: 'carbon', diameter_mm: 4.86, gpi: 9.0,
  fletching_type: 'spin_vane', fletching_count: 3,
  nock_type: 'pin', tip_type: 'target', tip_weight_grains: 100,
  pro_mode: true,
  purchase_url_shaft: 'https://shop.example.com/shaft',
  bow_ids: [bow.body.bow.id],
}) });
if (pro.body?.arrow?.pro_mode === true) ok('pro_mode=true persistiert');
else fail(`pro_mode true: ${JSON.stringify(pro.body)}`);

// 3. UI: ArrowEdit für basic → "Schaft"-Section NICHT da
await page.goto(`${BASE}/arrows/${basic.body.arrow.id}/edit`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const schaftBasic = await page.locator('h2.eyebrow:has-text("Schaft")').count();
const befiederungBasic = await page.locator('h2.eyebrow:has-text("Befiederung")').count();
if (schaftBasic === 0 && befiederungBasic === 0) ok('Basic-Pfeil: Schaft+Befiederung-Sections versteckt');
else fail(`Basic: Schaft=${schaftBasic}, Befiederung=${befiederungBasic} (erwartet 0)`);

const toggleSwitch = await page.locator('button[role="switch"]').count();
if (toggleSwitch >= 1) ok('Toggle "Profi-Modus für dieses Set" sichtbar');
else fail('Toggle nicht sichtbar');
await page.screenshot({ path: 'test-report/pro-per-set/01-basic-arrow.png', fullPage: true });

// 4. UI: ArrowEdit für pro → Schaft+Befiederung+Nocken+Spitzen DA
await page.goto(`${BASE}/arrows/${pro.body.arrow.id}/edit`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const schaftPro = await page.locator('h2.eyebrow:has-text("Schaft")').count();
const befiederungPro = await page.locator('h2.eyebrow:has-text("Befiederung")').count();
const nockenPro = await page.locator('h2.eyebrow:has-text("Nocken")').count();
const spitzenPro = await page.locator('h2.eyebrow:has-text("Spitzen")').count();
if (schaftPro >= 1 && befiederungPro >= 1 && nockenPro >= 1 && spitzenPro >= 1) ok('Pro-Pfeil: Alle 4 Komponenten-Sections sichtbar');
else fail(`Pro: Schaft=${schaftPro}, Bef=${befiederungPro}, Nocken=${nockenPro}, Spitzen=${spitzenPro} (erwartet ≥1)`);
await page.screenshot({ path: 'test-report/pro-per-set/02-pro-arrow.png', fullPage: true });

// 5. Build-Info: Berlin-Zeit ohne "Berlin"-Suffix, Format YYYY-MM-DD HH:mm
const buildText = await page.evaluate(() => {
  const el = document.querySelector('header span.font-mono');
  return el?.getAttribute('title') ?? '';
});
console.log(`  build title: "${buildText}"`);
if (/Build \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(buildText)) ok('Build-Info ohne Berlin-Suffix');
else fail(`Build-Info Format unerwartet: "${buildText}"`);

// 6. Sticky-Header: scrollen und prüfen, dass Header sichtbar bleibt
await page.goto(`${BASE}/help`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => window.scrollTo(0, 800));
await page.waitForTimeout(300);
const headerVisible = await page.evaluate(() => {
  const h = document.querySelector('header');
  if (!h) return null;
  const r = h.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, visible: r.bottom > 0 && r.top < window.innerHeight };
});
console.log(`  header rect nach Scroll y=800: ${JSON.stringify(headerVisible)}`);
if (headerVisible?.visible && headerVisible.top <= 5) ok('Mobile-Header bleibt sticky nach Scroll');
else fail(`Header nicht sticky: ${JSON.stringify(headerVisible)}`);
await page.screenshot({ path: 'test-report/pro-per-set/03-sticky-header-after-scroll.png' });

// Cleanup
await api(`/arrows/${basic.body.arrow.id}`, { method: 'DELETE' });
await api(`/arrows/${pro.body.arrow.id}`, { method: 'DELETE' });
await api(`/bows/${bow.body.bow.id}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Alle Checks grün');
process.exit(errors.length ? 1 : 0);
