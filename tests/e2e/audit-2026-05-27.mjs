/**
 * UI/UX Audit — 2026-05-27
 * Tests recently shipped features on production:
 *   - Notes editor in TrainingSummary (auto-save)
 *   - Mood distribution in Stats
 *   - Crowdsourced lane distances
 *   - Clubs trilogy (List, Detail, Stats, Feed)
 *   - Coach view (claude-test in Club 1)
 *   - Highscore Verein tab
 *
 * Viewports: 1280x800 (desktop), 390x844 (iPhone mobile)
 * Themes: light & dark
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://archerries.mossig.de';
const ADMIN = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };
const COACH = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };
const OUT = 'tests/screenshots/audit-2026-05-27';

await mkdir(OUT, { recursive: true });

const findings = { red: [], yellow: [], green: [] };
const log = (m) => console.log(m);
const red = (page, msg, screenshot) => { findings.red.push({ page, msg, screenshot }); log(`  [R] ${page}: ${msg}`); };
const yellow = (page, msg, screenshot) => { findings.yellow.push({ page, msg, screenshot }); log(`  [Y] ${page}: ${msg}`); };
const green = (page, msg, screenshot) => { findings.green.push({ page, msg, screenshot }); log(`  [G] ${page}: ${msg}`); };

const browser = await chromium.launch({ headless: true });

async function snap(page, name) {
  const file = path.join(OUT, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
  } catch (e) {
    console.log(`  ! screenshot failed: ${name} — ${e.message}`);
  }
  return file;
}

async function snapFull(page, name) {
  const file = path.join(OUT, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    console.log(`  ! full-screenshot failed: ${name} — ${e.message}`);
  }
  return file;
}

async function login(viewport, theme, user = ADMIN) {
  const opts = viewport === 'mobile'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', isMobile: true, hasTouch: true, serviceWorkers: 'block' }
    : { viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 25000 }),
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

// ─── Seed: ensure admin has at least one ended training with mood ──────────
async function ensureSeedData() {
  log('\n=== seed ===');
  const { ctx, page } = await login('desktop', 'light');
  const trainings = await page.api('/trainings?page=1&limit=20');
  const items = (trainings.body?.trainings ?? trainings.body?.items ?? []);
  log(`  current trainings: ${items.length}`);

  let ended = items.find((t) => t.ended_at);
  let withMood = items.find((t) => t.mood);

  if (!ended) {
    log(`  no ended training — creating one`);
    const created = await page.api('/trainings', {
      method: 'POST',
      body: JSON.stringify({
        discipline: 'simple',
        bow_type: 'recurve',
        mood: 'good',
      }),
    });
    log(`  created training: ${created.status} id=${created.body?.training?.id}`);
    if (created.body?.training?.id) {
      await page.api(`/trainings/${created.body.training.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      });
      ended = created.body.training;
    }
  } else if (!ended.mood) {
    // Tag mood
    log(`  ended training ${ended.id} has no mood; tagging "good"`);
    await page.api(`/trainings/${ended.id}`, { method: 'PATCH', body: JSON.stringify({ mood: 'good' }) });
  }

  // If we have only one mood-tagged, add some variety: create three more with different moods
  const moodsPresent = new Set(items.filter((t) => t.mood).map((t) => t.mood));
  if (moodsPresent.size < 3) {
    log(`  only ${moodsPresent.size} mood(s) present — seeding more`);
    const moods = ['great', 'neutral', 'tired', 'frustrated'].filter((m) => !moodsPresent.has(m));
    for (const m of moods.slice(0, 4)) {
      const r = await page.api('/trainings', {
        method: 'POST',
        body: JSON.stringify({
          discipline: 'simple',
          bow_type: 'recurve',
          mood: m,
        }),
      });
      if (r.body?.training?.id) {
        await page.api(`/trainings/${r.body.training.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ended_at: new Date().toISOString() }),
        });
      }
      log(`  seeded ${m}: status=${r.status}`);
    }
  }

  await ctx.close();
}

// ─── 1. Notes editor in TrainingSummary ────────────────────────────────────
async function testNotesEditor(viewport, theme) {
  const tag = `notes-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  // Find a completed training (ended_at != null)
  const trainings = await page.api('/trainings?page=1&limit=20');
  const items = (trainings.body?.trainings ?? trainings.body?.items ?? []);
  const finished = items.find((t) => t.ended_at) || items[0];
  if (!finished) {
    yellow(tag, `no training found at all (status=${trainings.status}, items=${items.length}) — skipping notes test`);
    await ctx.close();
    return;
  }
  if (!finished.ended_at) yellow(tag, `using active training ${finished.id} for notes test (no ended ones)`);

  await page.goto(`${BASE}/trainings/${finished.id}/summary`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  // Scroll to notes section
  const notesHeader = page.locator('h2.eyebrow:has-text("Notizen")').first();
  if (await notesHeader.count() === 0) {
    red(tag, `"Notizen" section not found on summary page`, await snapFull(page, `${tag}-no-notes`));
    await ctx.close();
    return;
  }
  await notesHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await snap(page, `${tag}-01-notes-empty`);

  const textarea = page.locator('textarea[placeholder*="Anker-Drift"]').first();
  if (await textarea.count() === 0) {
    red(tag, 'textarea inside notes-editor not found');
    await ctx.close();
    return;
  }

  // Tap-target check on mobile
  if (viewport === 'mobile') {
    const box = await textarea.boundingBox();
    if (box && box.height < 80) yellow(tag, `notes textarea height ${Math.round(box.height)}px — could be larger on mobile`);
    if (box && box.width < 320) yellow(tag, `notes textarea width ${Math.round(box.width)}px (viewport 390)`);
  }

  const stamp = new Date().toISOString().slice(0, 19);
  const testText = `Audit-Test ${stamp} — Notizen mit Sonderzeichen: „Hallo" Ø ≥`;
  await textarea.click();
  await textarea.fill(testText);

  // Wait for "Speichern…" indicator
  const savingIndicator = page.locator('text="Speichern…"').first();
  let sawSaving = false;
  try {
    await savingIndicator.waitFor({ state: 'visible', timeout: 1500 });
    sawSaving = true;
  } catch {}
  if (!sawSaving) yellow(tag, `"Speichern…" indicator never appeared within 1.5s after typing`);
  await snap(page, `${tag}-02-saving`);

  // Wait for "✓ Gespeichert"
  const savedIndicator = page.locator('text=/✓ Gespeichert/');
  let sawSaved = false;
  try {
    await savedIndicator.waitFor({ state: 'visible', timeout: 5000 });
    sawSaved = true;
  } catch {}
  if (!sawSaved) red(tag, '"✓ Gespeichert" indicator never appeared after typing — possible save failure', await snapFull(page, `${tag}-save-fail`));
  await snap(page, `${tag}-03-saved`);

  // Reload and check persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);
  const textareaAfter = page.locator('textarea[placeholder*="Anker-Drift"]').first();
  const persistedValue = await textareaAfter.inputValue().catch(() => '');
  if (!persistedValue.includes('Audit-Test')) {
    red(tag, `notes did NOT persist on reload (got: "${persistedValue.slice(0, 60)}")`, await snapFull(page, `${tag}-not-persisted`));
  }

  // Check typo-quotes („…")
  if (persistedValue.includes('„') && persistedValue.includes('"')) {
    // good — they round-tripped
  } else if (persistedValue.includes('Audit-Test')) {
    yellow(tag, `German typo-quotes lost on round-trip? stored as: ${persistedValue.slice(persistedValue.indexOf("Sonderzeichen"))}`);
  }

  // Cleanup: clear the notes
  await textareaAfter.click();
  await textareaAfter.fill('');
  await page.waitForTimeout(1500);

  await ctx.close();
}

// ─── 2. Mood distribution in Stats ─────────────────────────────────────────
async function testMoodDistribution(viewport, theme) {
  const tag = `mood-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  await page.goto(`${BASE}/stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  const heading = page.locator('h2:has-text("Stimmungs-Verteilung")').first();
  if (await heading.count() === 0) {
    yellow(tag, 'Stimmungs-Verteilung section not visible (admin may have no mood-tagged trainings)');
    await snapFull(page, `${tag}-no-mood-section`);
    await ctx.close();
    return;
  }
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await snap(page, `${tag}-01-mood-section`);

  // Verify all 5 mood emojis present
  const emojiSet = ['🤩', '😊', '😐', '😴', '😤'];
  let missingEmoji = [];
  for (const e of emojiSet) {
    const c = await page.locator(`text=${e}`).first().count();
    if (c === 0) missingEmoji.push(e);
  }
  if (missingEmoji.length) yellow(tag, `missing mood emojis in distribution: ${missingEmoji.join(' ')}`);

  // Check legend at bottom
  const legendHäufigkeit = await page.locator('text=Häufigkeit').count();
  const legendScore = await page.locator('text=/Ø Score/').count();
  if (!legendHäufigkeit || !legendScore) yellow(tag, `legend missing — Häufigkeit:${legendHäufigkeit} Score:${legendScore}`);

  await ctx.close();
}

// ─── 3. Crowdsourced lane distances ────────────────────────────────────────
async function testCrowdsourcedLanes(viewport, theme) {
  const tag = `lanes-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  await page.goto(`${BASE}/parcours/58/lanes`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  await snapFull(page, `${tag}-01-overview`);

  // Lane 1: should have official + crowd info
  // Lane 2: should show "~17.5m (n=2)" chip
  const crowdChip = page.locator('text=/Crowdsourced/').first();
  const chipCount = await page.locator('text=/Crowdsourced/').count();
  if (chipCount < 1) {
    red(tag, 'no "Crowdsourced" chip visible on /parcours/58/lanes', await snapFull(page, `${tag}-no-chip`));
    await ctx.close();
    return;
  }

  // Spannweite check
  const spannweite = await page.locator('text=/Spannweite/').count();
  if (spannweite === 0) yellow(tag, 'no "Spannweite: X – Y m" text visible (expected on Lane 2)');

  // Tap chip → input opens. The chip is a <button>, find it via aria-expanded.
  const chipBtn = page.locator('button[aria-expanded]').filter({ hasText: 'Crowdsourced' }).first();
  const chipBtnCount = await chipBtn.count();
  log(`  chip button count: ${chipBtnCount}`);
  if (chipBtnCount === 0) {
    yellow(tag, 'Crowdsourced chip button (aria-expanded) not found — fallback to text click');
    await crowdChip.scrollIntoViewIfNeeded();
    await crowdChip.click().catch(() => {});
  } else {
    await chipBtn.scrollIntoViewIfNeeded();
    await snap(page, `${tag}-01b-chip-before`);
    await chipBtn.click();
    const expanded = await chipBtn.getAttribute('aria-expanded');
    log(`  aria-expanded after click: ${expanded}`);
    if (expanded !== 'true') yellow(tag, `chip click did not set aria-expanded=true (got "${expanded}")`);
  }
  await page.waitForTimeout(500);
  await snap(page, `${tag}-02-chip-tapped`);

  // Check if there's a numeric input for crowd estimate
  const numInput = page.locator('input[type="number"]').first();
  const inputVisible = (await numInput.count()) > 0 && await numInput.isVisible().catch(() => false);
  if (!inputVisible) yellow(tag, 'expected a number input after tapping crowd chip — none visible');

  // Mobile-specific: check that the layout doesn't overflow horizontally
  if (viewport === 'mobile') {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (overflow) red(tag, `horizontal overflow on mobile (scrollWidth > clientWidth)`, await snapFull(page, `${tag}-overflow`));
  }

  await ctx.close();
}

// ─── 4. Clubs list ─────────────────────────────────────────────────────────
async function testClubsList(viewport, theme) {
  const tag = `clubs-list-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  await page.goto(`${BASE}/clubs`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  await snapFull(page, `${tag}-01-overview`);

  // "Mit Code beitreten" pill
  const joinPill = await page.locator('text=/Mit Code beitreten/').count();
  if (joinPill === 0) red(tag, '"Mit Code beitreten" pill missing');

  // "Verein gründen" pill
  const createPill = await page.locator('text=/Verein gründen/').count();
  if (createPill === 0) red(tag, '"Verein gründen" pill missing');

  // Club entry (Demo Bogenfreunde or similar)
  const demoClub = await page.locator('text=/Demo Bogenfreunde|Demo-Verein/').count();
  if (demoClub === 0) yellow(tag, 'no "Demo Bogenfreunde" club visible — admin not actually a member?');

  // Try invalid invite code (error-state check)
  const joinBtn = page.locator('text=/Mit Code beitreten/').first();
  await joinBtn.click().catch(() => {});
  await page.waitForTimeout(500);
  await snap(page, `${tag}-02-join-modal`);

  const inp = page.locator('input[placeholder="AB3FH92K"]').first();
  const inpCount = await inp.count();
  if (inpCount === 0) {
    yellow(tag, 'invite code input not found after clicking join pill');
  } else {
    await inp.fill('XXXXXXX');
    const value = await inp.inputValue();
    log(`  invite input value: "${value}"`);
    // The toggle pill says "Mit Code beitreten"; the submit says exactly "Beitreten".
    // Use button[type="submit"] inside the join form to disambiguate.
    const submitBtn = page.locator('form button[type="submit"]:has-text("Beitreten")').first();
    const submitDisabled = await submitBtn.isDisabled().catch(() => false);
    log(`  Beitreten disabled? ${submitDisabled}`);
    if (!submitDisabled) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
      await snap(page, `${tag}-03-invalid-code`);
      const errorText = await page.locator('text=/Ungültig|nicht gefunden|Fehler|invalid|existiert nicht/i').count();
      if (errorText === 0) yellow(tag, 'invalid invite code did not show a clear error message');
    } else {
      yellow(tag, `Beitreten button disabled with code "${value}" — UI may be hiding the error path`);
    }
  }

  await ctx.close();
}

// ─── 5. Club detail (admin POV) ────────────────────────────────────────────
async function testClubDetailAdmin(viewport, theme) {
  const tag = `club-detail-admin-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  await page.goto(`${BASE}/clubs/1`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  await snapFull(page, `${tag}-01-detail`);

  // Members section
  const mitglieder = await page.locator('text=/Mitglieder/i').count();
  if (mitglieder === 0) red(tag, '"Mitglieder" section not found');

  // Invitation code with copy button
  const copyBtn = page.locator('button[aria-label*="opier"], button:has-text("Code kopieren"), button:has-text("Kopieren")').first();
  const copyVisible = (await copyBtn.count()) > 0;
  if (!copyVisible) yellow(tag, 'no copy-button for invite code found (looked for aria-label kopieren / "Kopieren")');
  else {
    await copyBtn.scrollIntoViewIfNeeded();
    await snap(page, `${tag}-02-before-copy`);
    await copyBtn.click().catch(() => {});
    await page.waitForTimeout(500);
    await snap(page, `${tag}-03-after-copy`);
    // Cherry-Check appears?
    const ccA = await page.locator('svg.text-cherry-500').count();
    const ccB = await page.locator('text=/Kopiert/i').count();
    if (ccA + ccB === 0) yellow(tag, 'no visual feedback (Cherry-Check / "Kopiert") after copy click');
  }

  // Settings-gear per member (Admin)
  const gear = page.locator('button[aria-label*="Einstellung"], button[aria-label*="Settings"], svg.lucide-settings, svg.lucide-more-horizontal').first();
  const gearCount = await page.locator('button[aria-label*="Einstellung"], button[aria-label*="Settings"]').count();
  if (gearCount === 0) yellow(tag, 'no per-member settings-gear (aria-label search) — may exist with different label');

  // Vereins-Stats section
  const stats = await page.locator('text=/Top-Schützen|Vereins-Stats|Vereinsrekorde/').count();
  if (stats === 0) yellow(tag, 'Vereins-Stats / Top-Schützen / Vereinsrekorde section not detected');
  else {
    const topSec = page.locator('text=/Top-Schützen/').first();
    if (await topSec.count()) {
      await topSec.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await snap(page, `${tag}-04-club-stats`);
    }
  }

  // Trainings-Feed
  const feed = await page.locator('text=/Trainings im Verein|Vereins-Trainings|Letzte Trainings/').count();
  if (feed === 0) yellow(tag, 'Trainings-Feed heading not detected');
  else {
    const fSec = page.locator('text=/Trainings im Verein|Vereins-Trainings|Letzte Trainings/').first();
    await fSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await snap(page, `${tag}-05-feed`);
  }

  // Coach-Sicht label should NOT be visible for admin
  const coachSicht = await page.locator('text=/Coach-Sicht/').count();
  if (coachSicht > 0) yellow(tag, 'admin sees "Coach-Sicht" label (should only be for coach)');

  // Mobile horizontal overflow
  if (viewport === 'mobile') {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) red(tag, `horizontal overflow on /clubs/1 mobile`, await snapFull(page, `${tag}-overflow`));
  }

  await ctx.close();
}

// ─── 6. Club detail (coach POV) ────────────────────────────────────────────
async function testClubDetailCoach(viewport, theme) {
  const tag = `club-detail-coach-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme, COACH);

  await page.goto(`${BASE}/clubs/1`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  await snapFull(page, `${tag}-01-detail`);

  // Coach-Sicht amber label
  const coachSicht = await page.locator('text=/Coach-Sicht/').count();
  if (coachSicht === 0) red(tag, 'COACH user does not see "Coach-Sicht" label on club detail');

  // Click into a training in feed
  const feedLink = page.locator('a[href*="/trainings/"]').first();
  if (await feedLink.count() > 0) {
    const href = await feedLink.getAttribute('href');
    log(`  ↳ feed link href: ${href}`);
    await feedLink.click().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500);
    await snapFull(page, `${tag}-02-feed-training-opened`);

    // Check for read-only / no edit button
    const editA = await page.locator('button:has-text("Bearbeiten")').count();
    const editB = await page.locator('text=/Pfeil hinzufügen/').count();
    const editC = await page.locator('text=/Aufnahme starten/').count();
    const editBtn = editA + editB + editC;
    if (editBtn > 0) yellow(tag, `coach sees edit/scoring buttons on foreign training — should be read-only (count=${editBtn})`);
  } else {
    yellow(tag, 'coach: no training links in feed found');
  }

  await ctx.close();
}

// ─── 7. Highscore Verein tab ───────────────────────────────────────────────
async function testHighscoreVereinTab(viewport, theme) {
  const tag = `highscore-${viewport}-${theme}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, theme);

  await page.goto(`${BASE}/parcours/58`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  await snapFull(page, `${tag}-01-parcours-detail`);

  // Tab pills (Global / Freunde / Verein)
  const globalTab = await page.locator('button:has-text("Global"), [role="tab"]:has-text("Global")').count();
  const freundeTab = await page.locator('button:has-text("Freunde"), [role="tab"]:has-text("Freunde")').count();
  const vereinTab = await page.locator('button:has-text("Verein"), [role="tab"]:has-text("Verein")').count();
  log(`  tabs: Global=${globalTab} Freunde=${freundeTab} Verein=${vereinTab}`);

  if (vereinTab === 0) red(tag, '"Verein" tab missing on /parcours/58 highscore card');
  else {
    // Try clicking
    const vt = page.locator('button:has-text("Verein"), [role="tab"]:has-text("Verein")').first();
    await vt.scrollIntoViewIfNeeded();
    await snap(page, `${tag}-02-before-verein-tap`);
    await vt.click().catch(() => {});
    await page.waitForTimeout(600);
    await snap(page, `${tag}-03-after-verein-tap`);

    // Did anything change? Look for active state (cherry color etc)
    const activeTabClass = await vt.getAttribute('class').catch(() => '');
    if (activeTabClass && !/cherry|active|bg-/.test(activeTabClass)) {
      yellow(tag, `"Verein" tab clicked but no obvious active styling (class: ${activeTabClass.slice(0, 80)})`);
    }
  }

  await ctx.close();
}

// ─── 8. Dark mode profile check ────────────────────────────────────────────
async function testDarkModeToggle(viewport) {
  const tag = `dark-${viewport}`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login(viewport, 'light');

  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);

  // Find theme toggle
  const darkOption = page.locator('button:has-text("Dunkel"), button:has-text("Dark"), label:has-text("Dunkel")').first();
  const lightOption = page.locator('button:has-text("Hell"), button:has-text("Light")').first();
  if (await darkOption.count() === 0) {
    yellow(tag, 'no "Dunkel"/"Dark" theme switcher button found on /profile');
  } else {
    await darkOption.click().catch(() => {});
    await page.waitForTimeout(400);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!isDark) yellow(tag, 'clicking "Dunkel" did not toggle .dark class on documentElement');
    await snap(page, `${tag}-profile-dark`);

    // Navigate to clubs in dark
    await page.goto(`${BASE}/clubs/1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(700);
    await snapFull(page, `${tag}-club1-dark`);

    // Check for white-on-white text
    const lowContrast = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3'));
      const issues = [];
      for (const el of els.slice(0, 500)) {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const fg = cs.color;
        // crude check: white fg on white bg
        if (fg.match(/rgb\(255, 255, 255\)|rgb\(2\d\d, 2\d\d, 2\d\d\)/) && bg.match(/rgb\(255, 255, 255\)|rgb\(2\d\d, 2\d\d, 2\d\d\)/)) {
          issues.push(el.textContent?.slice(0, 30));
        }
      }
      return issues.slice(0, 5);
    });
    if (lowContrast.length) yellow(tag, `possible low-contrast text in dark mode: ${JSON.stringify(lowContrast)}`);

    // Stats in dark
    await page.goto(`${BASE}/stats`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(700);
    await snapFull(page, `${tag}-stats-dark`);
  }

  await ctx.close();
}

// ─── 9. Mobile bottom-nav overlap check ────────────────────────────────────
async function testMobileBottomNav() {
  const tag = `mobile-nav`;
  log(`\n=== ${tag} ===`);
  const { ctx, page } = await login('mobile', 'light');

  await page.goto(`${BASE}/clubs/1`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await snap(page, `${tag}-club-bottom`);

  // Check if bottom-nav is present
  const bottomNav = page.locator('nav[class*="bottom"], nav[class*="fixed bottom"], [class*="bottom-nav"]').first();
  if (await bottomNav.count() === 0) yellow(tag, 'no fixed bottom-nav found on mobile');
  else {
    const navBox = await bottomNav.boundingBox();
    log(`  bottom-nav box: ${JSON.stringify(navBox)}`);
    if (navBox && navBox.height < 44) yellow(tag, `bottom-nav height ${Math.round(navBox.height)}px (tap-target target ≥44)`);
  }

  await ctx.close();
}

// ─── 10. Loading state check ───────────────────────────────────────────────
async function testLoadingStates() {
  const tag = `loading`;
  log(`\n=== ${tag} ===`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  // Slow network so we can capture the spinner
  await ctx.route('**/api/**', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  // Navigate to stats, capture loading
  const navPromise = page.goto(`${BASE}/stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await snap(page, `${tag}-stats-loading`);
  await navPromise;

  const spinner = await page.locator('[class*="spinner"], svg.animate-spin, [class*="loading"]').count();
  log(`  spinners on stats during load: ${spinner}`);

  await ctx.close();
}

// ─── Run all ───────────────────────────────────────────────────────────────
try {
  await ensureSeedData();
  // Light + dark, desktop + mobile for each
  for (const viewport of ['desktop', 'mobile']) {
    for (const theme of ['light']) { // dark covered separately
      await testNotesEditor(viewport, theme);
      await testMoodDistribution(viewport, theme);
      await testCrowdsourcedLanes(viewport, theme);
      await testClubsList(viewport, theme);
      await testClubDetailAdmin(viewport, theme);
      await testHighscoreVereinTab(viewport, theme);
    }
  }
  await testClubDetailCoach('desktop', 'light');
  await testDarkModeToggle('desktop');
  await testMobileBottomNav();
  await testLoadingStates();
} catch (e) {
  console.error('FATAL:', e);
}

await browser.close();

const md = [
  `# UI/UX Audit 2026-05-27`,
  ``,
  `Run: ${new Date().toISOString()}`,
  ``,
  `## RED (${findings.red.length})`,
  ...findings.red.map((f, i) => `${i + 1}. **${f.page}** — ${f.msg}${f.screenshot ? `  \n   → \`${f.screenshot}\`` : ''}`),
  ``,
  `## YELLOW (${findings.yellow.length})`,
  ...findings.yellow.map((f, i) => `${i + 1}. **${f.page}** — ${f.msg}`),
  ``,
  `## GREEN (${findings.green.length})`,
  ...findings.green.map((f, i) => `${i + 1}. **${f.page}** — ${f.msg}`),
].join('\n');
await writeFile(path.join(OUT, '_findings.md'), md);

console.log(`\nDone. RED=${findings.red.length} YELLOW=${findings.yellow.length} GREEN=${findings.green.length}`);
console.log(`Output: ${OUT}/`);
process.exit(0);
