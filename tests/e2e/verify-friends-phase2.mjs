/**
 * Verify Phase 2: 1-Tap-Friend-Add zu Training + Highscore-Friends-Filter.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };

await mkdir('test-report/friends-phase2', { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

async function makePage(user) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
  page.api = async (path, opts = {}) => page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
  return page;
}

const pa = await makePage(A);
const pb = await makePage(B);

// Reset Freundschaften und Trainings
async function reset(p) {
  const r = await p.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
    for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
  const t = await p.api('/trainings');
  for (const tr of t.body?.trainings ?? [])
    if (!tr.is_shared) await p.api(`/trainings/${tr.id}`, { method: 'DELETE' });
}
await reset(pa); await reset(pb);

// 1. A und B werden Freunde
const send = await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
const reqId = send.body.outgoing[0].id;
await pb.api(`/friends/${reqId}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
ok('A+B sind Freunde');

// 2. A legt Training an
const tr = await pa.api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'simple', bow_type: 'recurve', peg_color: 'red',
}) });
const trainingId = tr.body?.training?.id;
if (!trainingId) { fail(`Training-Anlage: ${JSON.stringify(tr.body)}`); process.exit(1); }
ok(`Training #${trainingId} angelegt`);

// 3. A versucht Self-Add (sollte 409)
const self = await pa.api(`/trainings/${trainingId}/participants`, { method: 'POST', body: JSON.stringify({ user_id: 0 }) });
if (self.status >= 400) ok('Invalid user_id abgelehnt');

// B-User-ID rausholen
const bMe = await pb.api('/me');
const bId = bMe.body.id;

// 4. A fügt B als Freund-Participant hinzu
const add = await pa.api(`/trainings/${trainingId}/participants`, { method: 'POST', body: JSON.stringify({ user_id: bId }) });
if (add.status === 200 && add.body?.training?.participants?.some((p) => p.user_id === bId)) ok('B als Freund-Participant hinzugefügt');
else fail(`Add: status=${add.status}, body=${JSON.stringify(add.body).slice(0, 300)}`);

// 5. B sieht das Training nun in /trainings
const bTrainings = await pb.api('/trainings');
const found = (bTrainings.body?.trainings ?? []).find((t) => t.id === trainingId);
if (found && found.is_shared) ok('B sieht das Training als is_shared in seiner Liste');
else fail(`B trainings: ${JSON.stringify(bTrainings.body?.trainings ?? [])}`);

// 6. Doppel-Add fails
const dup = await pa.api(`/trainings/${trainingId}/participants`, { method: 'POST', body: JSON.stringify({ user_id: bId }) });
if (dup.status === 409) ok('Doppel-Add abgelehnt mit 409');
else fail(`Doppel: ${dup.status}`);

// 7. Non-Friend ablehnen — wir entfernen die Freundschaft und versuchen erneut
const friends = await pa.api('/friends');
const friendId = friends.body.friends[0].id;
await pa.api(`/friends/${friendId}`, { method: 'DELETE' });

// Re-create training um clean zu sein
await pa.api(`/trainings/${trainingId}`, { method: 'DELETE' });
const tr2 = await pa.api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'simple', bow_type: 'recurve', peg_color: 'red',
}) });
const tr2Id = tr2.body.training.id;
const nofriend = await pa.api(`/trainings/${tr2Id}/participants`, { method: 'POST', body: JSON.stringify({ user_id: bId }) });
if (nofriend.status === 403) ok('Add ohne Freundschaft → 403');
else fail(`No-Friend: ${nofriend.status}`);

// 8. Highscore mit friends_only=1: B in der Liste obwohl nicht Freund? Sollte nicht.
// Erst Freundschaft wieder herstellen
const send2 = await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
const req2 = send2.body.outgoing[0].id;
await pb.api(`/friends/${req2}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });

// Da kein Parcours verlinkt ist, höchstens leere Liste zurück. Smoke-Test des Query-Pfads:
const hs1 = await pa.api('/highscore?parcours_id=1&friends_only=1');
if (hs1.status === 200) ok('Highscore?friends_only=1 antwortet 200');
else fail(`Highscore friends_only: ${hs1.status}`);
const hs2 = await pa.api('/highscore?parcours_id=1');
if (hs2.status === 200) ok('Highscore global antwortet 200');
else fail(`Highscore global: ${hs2.status}`);

// 9. UI: A öffnet TrainingDetail und sieht "Freund"-Button
await pa.goto(`${BASE}/trainings/${tr2Id}`);
await pa.waitForLoadState('networkidle');
await pa.waitForTimeout(500);
const freundBtn = await pa.locator('button:has-text("Freund")').count();
if (freundBtn >= 1) ok('UI: "Freund"-Button in TrainingDetail sichtbar');
else fail('UI: Freund-Button fehlt');
await pa.screenshot({ path: 'test-report/friends-phase2/01-training-detail-with-friend-btn.png', fullPage: false });

// 10. UI: AddFriendModal öffnet sich
if (freundBtn) {
  await pa.click('button:has-text("Freund")');
  await pa.waitForTimeout(500);
  const modalTitle = await pa.locator('text="Freund hinzufügen"').count();
  if (modalTitle >= 1) ok('AddFriendModal öffnet sich');
  else fail('Modal Titel nicht gefunden');
  await pa.screenshot({ path: 'test-report/friends-phase2/02-add-friend-modal.png' });
}

// Cleanup
await pa.api(`/trainings/${tr2Id}`, { method: 'DELETE' });
await reset(pa); await reset(pb);
await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Phase 2 grün');
process.exit(errors.length ? 1 : 0);
