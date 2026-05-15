/**
 * Multi-User Community-Flow:
 *  1. User A: Parcours mit Bahn anlegen + public stellen.
 *  2. User A: Review-API + Favorite-API testen.
 *  3. User A: Training auf Parcours → score 1 Pfeil → published_to_highscore = true.
 *  4. User B: kann Parcours sehen, ein Review abgeben, klonen, Highscore sehen.
 *  5. Cleanup: User A löscht Parcours + Trainings.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const SHOT_DIR   = join(REPO_ROOT, 'test-report', 'screenshots', 'community-flow');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER_A   = { email: 'claude-test@archerries.local',  pass: 'ClaudeTest_2026!'  };
const USER_B   = { email: 'claude-test2@archerries.local', pass: 'ClaudeTest2_2026!' };

const results = [];
const fail = (msg) => { console.error('  ✗ ' + msg); results.push({ ok: false, msg }); process.exitCode = 1; };
const ok   = (msg) => { console.log('  ✓ ' + msg); results.push({ ok: true, msg }); };

async function login(page, creds) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  return !page.url().includes('/login');
}

async function api(page, path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`/api/index.php${path}`, { ...opts, headers });
    const txt = await res.text();
    let body = null;
    try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
    return { status: res.status, body };
  }, { path, opts });
}

const browser = await chromium.launch({ headless: true });

// ─── User A: anlegen, public, review, training, publish-to-highscore ─────────
const ctxA  = await browser.newContext({ ...devices['iPhone 14 Pro'] , serviceWorkers: "block" });
const pageA = await ctxA.newPage();
pageA.on('pageerror', (e) => console.log('A page-error:', e.message));

if (!await login(pageA, USER_A)) { fail('User A login failed'); process.exit(1); }
ok('User A logged in');

const parcoursName = `E2E Community ${new Date().toISOString().slice(11, 19)}`;
const createParcoursRes = await api(pageA, '/parcours', {
  method: 'POST',
  body: JSON.stringify({ name: parcoursName, is_public: true, peg_blue: true, peg_red: true }),
});
const parcoursId = createParcoursRes.body?.parcours?.id;
if (!parcoursId) { fail('Parcours-Create failed: ' + JSON.stringify(createParcoursRes)); }
else ok(`User A: parcours #${parcoursId} (öffentlich) angelegt`);

// Eine Bahn anlegen
const laneRes = await api(pageA, `/parcours/${parcoursId}/lanes`, {
  method: 'POST',
  body: JSON.stringify({ lane_number: 1, animal_description: 'Rehbock', distance_blue: 15, distance_red: 20 }),
});
if (laneRes.status !== 201) fail('Lane create: ' + JSON.stringify(laneRes));
else ok('User A: Bahn 1 angelegt');

// User A: eigenes Review
const reviewRes = await api(pageA, `/parcours/${parcoursId}/reviews`, {
  method: 'POST',
  body: JSON.stringify({ rating: 5, comment: 'Eigener Parcours — natürlich top.' }),
});
if (reviewRes.body?.review?.rating !== 5) fail('Review-A failed: ' + JSON.stringify(reviewRes));
else ok('User A: 5-Sterne-Review angelegt');

// User A: Favorit
const favRes = await api(pageA, '/favorites', {
  method: 'POST',
  body: JSON.stringify({ kind: 'parcours', ref: String(parcoursId) }),
});
if (favRes.status !== 200) fail('Favorit-A: ' + JSON.stringify(favRes));
else ok('User A: Parcours favorisiert');

// User A: Training mit 1 Pfeil scoren + published_to_highscore=true
const trRes = await api(pageA, '/trainings', {
  method: 'POST',
  body: JSON.stringify({
    discipline: '3d_ifaa',
    bow_type: 'recurve',
    parcours_id: parcoursId,
    started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }),
});
const trainingId = trRes.body?.training?.id;
if (!trainingId) fail('Training-A create: ' + JSON.stringify(trRes));
else ok(`User A: training #${trainingId} angelegt`);

// Owner-Participant rausfinden
const trDetailRes = await api(pageA, `/trainings/${trainingId}`);
const ownerPid = trDetailRes.body?.training?.my_participant_id;

// Station mit Pfeil scoren → kein nfaa, IFAA: Inner Kill = 20
await api(pageA, `/trainings/${trainingId}/targets`, {
  method: 'POST',
  body: JSON.stringify({
    target_index: 1,
    animal_or_face: 'Test',
    distance_m: 15,
    shots: [{ arrow_seq: 1, zone: 'inner_kill' }],
  }),
});

// Training beenden + published_to_highscore=true
await api(pageA, `/trainings/${trainingId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    ended_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    published_to_highscore: true,
  }),
});
ok('User A: Training beendet + published_to_highscore=true');

// User A: prüfen dass Highscore-Endpoint nun den Score liefert
const hsRes = await api(pageA, `/highscore?parcours_id=${parcoursId}&discipline=3d_ifaa&bow_type=recurve`);
if (!hsRes.body?.scores || hsRes.body.scores.length === 0) {
  fail('Highscore leer trotz published+scored: ' + JSON.stringify(hsRes));
} else {
  const top = hsRes.body.scores[0];
  if (top.score !== 20) fail(`Highscore-Score erwartet 20, kam ${top.score}`);
  else ok(`User A: Highscore zeigt Score 20 (Inner Kill, Pfeil 1)`);
}

await pageA.screenshot({ path: join(SHOT_DIR, 'A-after-publish.png') });

// ─── User B: sieht öffentlichen Parcours, reviewen, klonen, Highscore sehen ──
const ctxB  = await browser.newContext({ ...devices['iPhone 14 Pro'] , serviceWorkers: "block" });
const pageB = await ctxB.newPage();
pageB.on('pageerror', (e) => console.log('B page-error:', e.message));

if (!await login(pageB, USER_B)) { fail('User B login failed'); }
else ok('User B logged in');

// User B: kann Parcours sehen (include_public)
const listRes = await api(pageB, '/parcours?include_public=1');
const seen = (listRes.body?.parcours ?? []).find((p) => p.id === parcoursId);
if (!seen) fail('User B sieht Parcours A nicht in include_public');
else ok(`User B: sieht öffentlichen Parcours #${parcoursId}`);

// User B: kann Detail laden
const detailB = await api(pageB, `/parcours/${parcoursId}`);
if (detailB.status !== 200) fail('User B: parcours-detail status ' + detailB.status);
else ok('User B: Parcours-Detail erreichbar');

// User B: kann Bahnen ansehen (read-only Backend)
const lanesB = await api(pageB, `/parcours/${parcoursId}/lanes`);
if (!lanesB.body?.lanes || lanesB.body.lanes.length === 0) fail('User B: lanes_list leer');
else ok('User B: sieht Bahn 1 read-only');

// User B: Bahn ändern muss 403 sein
const laneEditB = await api(pageB, `/parcours/${parcoursId}/lanes`, {
  method: 'POST',
  body: JSON.stringify({ lane_number: 2 }),
});
if (laneEditB.status !== 403) fail('User B konnte Bahn anlegen (sollte 403): ' + laneEditB.status);
else ok('User B: POST lane → 403 (korrekt)');

// User B: Review schreiben (3 Sterne)
const reviewB = await api(pageB, `/parcours/${parcoursId}/reviews`, {
  method: 'POST',
  body: JSON.stringify({ rating: 3, comment: 'Nett, aber kurz.' }),
});
if (reviewB.body?.review?.rating !== 3) fail('User B Review failed: ' + JSON.stringify(reviewB));
else ok('User B: 3-Sterne-Review abgegeben');

// Reviews lesen — 2 erwartet
const reviewsList = await api(pageB, `/parcours/${parcoursId}/reviews`);
if ((reviewsList.body?.reviews ?? []).length !== 2) fail(`Reviews-Count: erwartet 2, kam ${reviewsList.body?.reviews?.length}`);
else ok('Reviews-Liste hat 2 Einträge');

// User B: Klon-Test
const cloneRes = await api(pageB, `/parcours/${parcoursId}/clone`, { method: 'POST', body: JSON.stringify({}) });
const clonedId = cloneRes.body?.parcours?.id;
if (!clonedId) fail('Clone failed: ' + JSON.stringify(cloneRes));
else ok(`User B: Parcours #${parcoursId} → #${clonedId} geklont`);

const clonedLanes = await api(pageB, `/parcours/${clonedId}/lanes`);
if ((clonedLanes.body?.lanes ?? []).length !== 1) fail(`Cloned Lanes: erwartet 1, kam ${clonedLanes.body?.lanes?.length}`);
else ok('User B: geklonter Parcours enthält Bahn 1');

// User B: Highscore-Endpoint zeigt User A's Score
const hsB = await api(pageB, `/highscore?parcours_id=${parcoursId}&discipline=3d_ifaa&bow_type=recurve`);
const sees = (hsB.body?.scores ?? []).find((s) => s.score === 20);
if (!sees) fail('User B sieht den Highscore von User A nicht');
else ok(`User B: sieht User A's Highscore (${sees.display_name} → 20)`);

await pageB.screenshot({ path: join(SHOT_DIR, 'B-after-clone.png') });

// ─── Cleanup ────────────────────────────────────────────────────────────────
console.log('\nCleanup...');
await api(pageB, `/parcours/${clonedId}`, { method: 'DELETE' });
await api(pageA, `/parcours/${parcoursId}`, { method: 'DELETE' });
await api(pageA, `/trainings/${trainingId}`, { method: 'DELETE' });

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n→ ${results.length - failed.length}/${results.length} OK`);
if (failed.length) {
  console.log('Failures:');
  failed.forEach((f) => console.log('  -', f.msg));
}
