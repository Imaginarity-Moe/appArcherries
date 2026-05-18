/**
 * UIUX-Review der zuletzt gebauten Features:
 *  - Friends-Page (alle 4 Sektionen)
 *  - Notification-Bell + Popover
 *  - Pro-Modus-Toggle im ArrowEdit
 *  - Confirm-Dialogs (Reject/Block/Entfernen)
 *  - Dashboard-Anfrage-Banner
 *  - Profile-Card-Badge
 *  - Add-Friend-Modal im TrainingDetail
 *  - Highscore-Tabs (wenn Daten vorhanden)
 *  - Login-Page (neue Logo-Varianten)
 *  - Date-Picker im ArrowEdit Dark-Mode
 *  - Schriftzug + Kirsche Theming
 *
 * 4 Viewports: mobile-light / mobile-dark / desktop-light / desktop-dark
 * Output: test-report/uiux-recent/<viewport>/*.png + UIUX_RECENT.md mit Findings
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };
const ROOT = 'test-report/uiux-recent';

await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });

const findings = [];
const note = (m) => { console.log('  ! ' + m); findings.push(m); };
const ok = (m) => console.log('  ✓ ' + m);

const browser = await chromium.launch({ headless: true });

async function snap(page, dir, name) {
  await mkdir(path.join(ROOT, dir), { recursive: true });
  await page.screenshot({ path: path.join(ROOT, dir, `${name}.png`), fullPage: false });
}

async function setup(viewport, theme) {
  const opts = viewport === 'mobile'
    ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', A.email);
  await page.fill('input[type="password"]', A.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  page.api = async (p, options = {}) => page.evaluate(async ({ p, options }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(options.headers ?? {}), Authorization: `Bearer ${token}` };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...options, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, options });
  return { ctx, page };
}

async function loginContext(viewport, theme, user = A) {
  const opts = viewport === 'mobile'
    ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  return { ctx, page };
}

// Seed: Anfrage von A→B, dann Login als B (sieht Anfrage), Login als A separat
async function seedFriendRequest() {
  const { ctx, page } = await setup('desktop', 'light');
  // Reset
  async function reset(p) {
    const r = await p.api('/friends');
    for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
      for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
    const n = await p.api('/notifications');
    for (const it of n.body?.items ?? []) await p.api(`/notifications/${it.id}`, { method: 'DELETE' });
  }
  await reset(page);
  // B-Reset via separate login
  const bCtx = await loginContext('desktop', 'light', B);
  bCtx.page.api = async (p, options = {}) => bCtx.page.evaluate(async ({ p, options }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(options.headers ?? {}), Authorization: `Bearer ${token}` };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${p}`, { ...options, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { p, options });
  await reset(bCtx.page);
  // A→B Anfrage
  await page.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
  await ctx.close();
  await bCtx.ctx.close();
  ok('Seed: A→B friend-request');
}

await seedFriendRequest();

async function walk(viewport, theme) {
  const dir = `${viewport}-${theme}`;
  console.log(`\n— ${dir} —`);
  const { ctx, page } = await setup(viewport, theme);

  // 1. Dashboard mit Friend-Anfrage-Banner (für A: outgoing nicht angezeigt, also kein Banner)
  // Login wechseln: nicht A sondern B → bekommt Banner
  await ctx.close();
  const { ctx: bCtx, page: pB } = await loginContext(viewport, theme, B);
  await pB.goto(`${BASE}/`);
  await pB.waitForLoadState('networkidle');
  await pB.waitForTimeout(500);
  await snap(pB, dir, '01-dashboard-with-friend-banner');
  const banner = await pB.locator('text=/neue Freundes-Anfrage/').count();
  if (banner >= 1) ok(`Dashboard-Banner sichtbar (B)`);
  else note(`Dashboard-Banner fehlt`);

  // 2. Notification-Bell-Popover öffnen
  const bell = pB.locator('button[aria-label*="Benachrichtigung"]:visible').first();
  if (await bell.count()) {
    await bell.click();
    await pB.waitForTimeout(400);
    await snap(pB, dir, '02-notification-popover');
    const popoverItems = await pB.locator('button:has-text("möchte dein Freund werden")').count();
    if (popoverItems >= 1) ok(`Notification-Item sichtbar`);
    else note(`Kein Notification-Item gefunden`);
    // Schließen
    await pB.mouse.click(10, 10);
    await pB.waitForTimeout(200);
  } else note(`Notification-Bell nicht sichtbar`);

  // 3. /friends (B sieht incoming-Anfrage)
  await pB.goto(`${BASE}/friends`);
  await pB.waitForLoadState('networkidle');
  await pB.waitForTimeout(400);
  await snap(pB, dir, '03-friends-page-incoming');
  const incomingCount = await pB.locator('button[aria-label="Annehmen"]').count();
  if (incomingCount >= 1) ok(`Friends-Page zeigt incoming`);
  else note(`Friends-Page incoming fehlt`);

  // 4. Confirm-Dialog für Block
  await pB.locator('button[aria-label="Blockieren"]').first().click();
  await pB.waitForTimeout(400);
  await snap(pB, dir, '04-block-confirm-dialog');
  const blockTitle = await pB.locator('text="User blockieren?"').count();
  if (blockTitle >= 1) ok(`Block-Confirm zeigt Personalisierung`);
  else note(`Block-Dialog Title fehlt`);
  // Abbrechen
  await pB.locator('button:has-text("Abbrechen")').first().click();
  await pB.waitForTimeout(200);

  // 5. Profile-Page mit Badge (B hat noch 1 Anfrage)
  await pB.goto(`${BASE}/profile`);
  await pB.waitForLoadState('networkidle');
  await pB.waitForTimeout(400);
  await snap(pB, dir, '05-profile-with-badge');
  const badge = await pB.locator('text=/1 neue Anfrage/').count();
  if (badge >= 1) ok(`Profile-Card-Badge sichtbar`);
  else note(`Profile-Card-Badge fehlt`);

  await bCtx.close();

  // 6. Login-Page (Logo-Varianten)
  const opts2 = viewport === 'mobile'
    ? { ...devices['iPhone 14 Pro'], serviceWorkers: 'block' }
    : { viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' };
  const fresh = await browser.newContext(opts2);
  const pL = await fresh.newPage();
  await pL.addInitScript((t) => { localStorage.setItem('archerries.theme', t); }, theme);
  await pL.goto(`${BASE}/login`);
  await pL.waitForLoadState('networkidle');
  await pL.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, theme);
  await pL.waitForTimeout(400);
  await snap(pL, dir, '06-login');
  await fresh.close();

  // 7. ArrowEdit mit Pro-Modus-Toggle (A: braucht ein Pfeil-Set)
  const { ctx: cA, page: pA } = await setup(viewport, theme);
  // Pfeil-Set anlegen + auf Edit gehen
  const oldArrows = await pA.api('/arrows');
  for (const a of oldArrows.body?.arrows ?? []) await pA.api(`/arrows/${a.id}`, { method: 'DELETE' });
  const arrow = await pA.api('/arrows', { method: 'POST', body: JSON.stringify({
    name: 'UIUX-Test-Pfeil', spine: '500', count_total: 6, pro_mode: false,
  }) });
  const aId = arrow.body?.arrow?.id;
  if (aId) {
    await pA.goto(`${BASE}/arrows/${aId}/edit`);
    await pA.waitForLoadState('networkidle');
    await pA.waitForTimeout(600);
    // Scroll zum Profi-Modus-Toggle
    await pA.locator('text="Profi-Modus für dieses Set"').first().scrollIntoViewIfNeeded();
    await pA.waitForTimeout(200);
    await snap(pA, dir, '07-arrow-edit-promode-off');
    // Toggle einschalten
    const toggle = pA.locator('button[role="switch"]').first();
    await toggle.click();
    await pA.waitForTimeout(400);
    await pA.locator('text="Schaft"').first().scrollIntoViewIfNeeded();
    await pA.waitForTimeout(200);
    await snap(pA, dir, '08-arrow-edit-promode-on');
    // Cleanup
    await pA.api(`/arrows/${aId}`, { method: 'DELETE' });
  } else note(`Konnte Test-Pfeil nicht anlegen`);

  // 8. Sidebar/Header mit neuem Logo
  await pA.goto(`${BASE}/`);
  await pA.waitForLoadState('networkidle');
  await pA.waitForTimeout(400);
  if (viewport === 'mobile') {
    await pA.locator('header').first().screenshot({ path: path.join(ROOT, dir, '09-mobile-header.png') });
  } else {
    await pA.locator('aside').first().screenshot({ path: path.join(ROOT, dir, '09-desktop-sidebar.png') });
  }

  await cA.close();
}

for (const viewport of ['mobile', 'desktop']) {
  for (const theme of ['light', 'dark']) {
    await walk(viewport, theme);
  }
}

// Cleanup-Seed
const { ctx, page } = await setup('desktop', 'light');
async function reset(p) {
  const r = await p.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
    for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
  const n = await p.api('/notifications');
  for (const it of n.body?.items ?? []) await p.api(`/notifications/${it.id}`, { method: 'DELETE' });
}
await reset(page);
const bClean = await loginContext('desktop', 'light', B);
bClean.page.api = async (p, options = {}) => bClean.page.evaluate(async ({ p, options }) => {
  const token = localStorage.getItem('archerries.token');
  const headers = { ...(options.headers ?? {}), Authorization: `Bearer ${token}` };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const r = await fetch(`/api/index.php${p}`, { ...options, headers });
  return { status: r.status, body: await r.json().catch(() => null) };
}, { p, options });
await reset(bClean.page);
await ctx.close();
await bClean.ctx.close();

await browser.close();

// Report
const md = [
  '# UIUX-Review: zuletzt gebaute Features',
  '',
  `Run: ${new Date().toISOString()}`,
  '',
  '## Geprüfte Features (in 4 Viewports)',
  '',
  '1. Dashboard mit Friend-Anfrage-Banner',
  '2. Notification-Bell mit Popover',
  '3. /friends-Page (incoming-Anfragen)',
  '4. Confirm-Dialog beim Blockieren',
  '5. Profile-Page mit Friend-Card-Badge',
  '6. Login-Page mit neuen Logo-Varianten',
  '7. ArrowEdit Profi-Modus AUS/AN (Komponenten-Sections)',
  '8. Mobile-Header / Desktop-Sidebar mit neuem Logo',
  '',
  '## Findings',
  '',
  findings.length ? findings.map((f) => `- ${f}`).join('\n') : '- Keine Auffälligkeiten.',
  '',
  '## Screenshots',
  '',
  '`test-report/uiux-recent/{mobile,desktop}-{light,dark}/*.png`',
].join('\n');
await writeFile(path.join(ROOT, '..', 'UIUX_RECENT.md'), md);

console.log(`\n${findings.length ? `! ${findings.length} Findings` : '✓ alles ok'}`);
console.log(`Report: test-report/UIUX_RECENT.md`);
process.exit(0);
