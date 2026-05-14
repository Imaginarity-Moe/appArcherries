/**
 * UI-Review-Script: Schießt Screenshots der NEUEN Features auf Mobile + Desktop.
 * Setup: User A hat einen Public-Parcours + Highscore + Review, User B reviewt zusätzlich.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const SHOT_DIR   = join(REPO_ROOT, 'test-report', 'screenshots', 'features');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });
if (!existsSync(join(SHOT_DIR, 'mobile')))  mkdirSync(join(SHOT_DIR, 'mobile'),  { recursive: true });
if (!existsSync(join(SHOT_DIR, 'desktop'))) mkdirSync(join(SHOT_DIR, 'desktop'), { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER_A   = { email: 'claude-test@archerries.local',  pass: 'ClaudeTest_2026!'  };
const USER_B   = { email: 'claude-test2@archerries.local', pass: 'ClaudeTest2_2026!' };

async function login(page, creds) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

async function api(page, path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: res.status, body: await res.json().catch(() => null) };
  }, { path, opts });
}

async function shot(page, vp, name) {
  await page.screenshot({ path: join(SHOT_DIR, vp, `${name}.png`), fullPage: false });
}

const browser = await chromium.launch({ headless: true });

// Setup: User A erzeugt Parcours mit Bahn, Public, Review, published Training
const ctxA = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const pa = await ctxA.newPage();
await login(pa, USER_A);

const pcRes = await api(pa, '/parcours', {
  method: 'POST',
  body: JSON.stringify({
    name: `Showcase ${new Date().toISOString().slice(11, 19)}`,
    description: 'Schöner Waldparcours mit 28 Stationen für den Demo-Screenshot.',
    address: 'Forststraße 12, 12345 Musterhausen',
    is_public: true, peg_blue: true, peg_red: true, peg_yellow: true,
    difficulty: 3, lanes_count: 28,
  }),
});
const parcoursId = pcRes.body.parcours.id;

for (let i = 1; i <= 3; i++) {
  await api(pa, `/parcours/${parcoursId}/lanes`, {
    method: 'POST',
    body: JSON.stringify({
      lane_number: i,
      animal_description: ['Rehbock', 'Wildschwein', 'Auerhahn'][i - 1],
      distance_blue: 10 + i * 5,
      distance_red: 14 + i * 5,
      notes: i === 2 ? 'Hangschuss, leicht steil' : null,
    }),
  });
}

await api(pa, `/parcours/${parcoursId}/reviews`, {
  method: 'POST', body: JSON.stringify({ rating: 5, comment: 'Top Parcours mit abwechslungsreichem Gelände. Hatte hier meinen PB.' }),
});

await api(pa, '/favorites', { method: 'POST', body: JSON.stringify({ kind: 'parcours', ref: String(parcoursId) }) });
await api(pa, '/favorites', { method: 'POST', body: JSON.stringify({ kind: 'discipline', ref: '3d_ifaa' }) });

// Training + Score + Publish
const trRes = await api(pa, '/trainings', {
  method: 'POST',
  body: JSON.stringify({ discipline: '3d_ifaa', bow_type: 'recurve', parcours_id: parcoursId, started_at: new Date().toISOString().slice(0,19).replace('T',' ') }),
});
const trainingId = trRes.body.training.id;
await api(pa, `/trainings/${trainingId}/targets`, {
  method: 'POST',
  body: JSON.stringify({ target_index: 1, animal_or_face: 'Rehbock', distance_m: 15, shots: [{ arrow_seq: 1, zone: 'inner_kill' }] }),
});
await api(pa, `/trainings/${trainingId}`, {
  method: 'PATCH', body: JSON.stringify({ ended_at: new Date().toISOString().slice(0,19).replace('T',' '), published_to_highscore: true }),
});

console.log(`Setup OK: parcours #${parcoursId}, training #${trainingId}`);
await pa.close();

// User B reviewt + favorisiert
const ctxB = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const pb = await ctxB.newPage();
await login(pb, USER_B);
await api(pb, `/parcours/${parcoursId}/reviews`, {
  method: 'POST', body: JSON.stringify({ rating: 4, comment: 'Schöner Wald, etwas kürzer als erwartet.' }),
});
await api(pb, '/favorites', { method: 'POST', body: JSON.stringify({ kind: 'parcours', ref: String(parcoursId) }) });
await pb.close();

// ─── Screenshots: Mobile (User B view auf den Parcours von A) ────────────
const ctxM = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'de-DE' });
const pm = await ctxM.newPage();
await login(pm, USER_B);

await pm.goto(`${BASE_URL}/parcours?include_public=1`);
await pm.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await shot(pm, 'mobile', '01-parcours-list-with-public');

await pm.goto(`${BASE_URL}/parcours/${parcoursId}`);
await pm.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await pm.waitForTimeout(700);
await shot(pm, 'mobile', '02-parcours-detail-public');

// Scroll down to Reviews/Highscore
await pm.evaluate(() => window.scrollTo(0, 600));
await pm.waitForTimeout(300);
await shot(pm, 'mobile', '03-highscore-card');
await pm.evaluate(() => window.scrollTo(0, 1100));
await pm.waitForTimeout(300);
await shot(pm, 'mobile', '04-reviews-section');

// Bahnen-Liste read-only für User B
await pm.goto(`${BASE_URL}/parcours/${parcoursId}/lanes`);
await pm.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await shot(pm, 'mobile', '05-lanes-readonly');

// New-Parcours mit Vorlage-Selector
await pm.goto(`${BASE_URL}/parcours/new`);
await pm.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await shot(pm, 'mobile', '06-newparcours-with-template');

// Help-Hub mit Community-Section sichtbar
await pm.goto(`${BASE_URL}/help/community`);
await pm.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await pm.waitForTimeout(400);
await shot(pm, 'mobile', '07-help-community');

await pm.close();

// ─── Screenshots: Desktop ────────────────────────────────────────────────
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
const pd = await ctxD.newPage();
await login(pd, USER_B);

await pd.goto(`${BASE_URL}/parcours/${parcoursId}`);
await pd.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await pd.waitForTimeout(700);
await shot(pd, 'desktop', '01-parcours-detail');

await pd.evaluate(() => window.scrollTo(0, 700));
await pd.waitForTimeout(300);
await shot(pd, 'desktop', '02-highscore-and-reviews');

await pd.goto(`${BASE_URL}/parcours?include_public=1`);
await pd.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
await shot(pd, 'desktop', '03-parcours-list');

await pd.close();

// Cleanup
const ctxC = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const pc = await ctxC.newPage();
await login(pc, USER_A);
await api(pc, `/parcours/${parcoursId}`, { method: 'DELETE' });
await api(pc, `/trainings/${trainingId}`, { method: 'DELETE' });

await browser.close();
console.log('UI-Review-Screenshots geschossen in test-report/screenshots/features/');
