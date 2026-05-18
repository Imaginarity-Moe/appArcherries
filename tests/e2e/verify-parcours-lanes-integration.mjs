/**
 * Verify: (1) lanes_detailed_count in parcours-API,
 *         (2) trainings_create vorgeneriert Stations aus parcours_lanes,
 *         (3) start_lane rotiert die Reihenfolge.
 */
import { chromium } from 'playwright';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
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

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

// Cleanup: alte Trainings + Test-Parcours weg
const oldT = await api('/trainings');
for (const t of oldT.body?.trainings ?? []) if (!t.is_shared) await api(`/trainings/${t.id}`, { method: 'DELETE' });

// 1. Parcours mit 5 geplanten Bahnen anlegen
const pr = await api('/parcours', { method: 'POST', body: JSON.stringify({
  name: 'TEST Parcours-Lanes-Integration', lanes_count: 5, peg_red: true,
}) });
const pid = pr.body?.parcours?.id;
if (!pid) { fail(`Parcours-Create: ${JSON.stringify(pr.body)}`); process.exit(1); }
ok(`Parcours #${pid} angelegt (lanes_count=5)`);

// 2. lanes_detailed_count = 0 initial
const p1 = await api(`/parcours/${pid}`);
if (p1.body?.parcours?.lanes_detailed_count === 0) ok('lanes_detailed_count=0 ohne Bahnen');
else fail(`lanes_detailed_count: ${p1.body?.parcours?.lanes_detailed_count}`);

// 3. 3 von 5 Bahnen detailliert erfassen
const lanes = [
  { lane_number: 1, animal_description: 'Wildschwein', distance_red: 18 },
  { lane_number: 2, animal_description: 'Reh',         distance_red: 22 },
  { lane_number: 3, animal_description: 'Bär',         distance_red: 30 },
];
for (const l of lanes) {
  const r = await api(`/parcours/${pid}/lanes`, { method: 'POST', body: JSON.stringify(l) });
  if (r.status !== 200 && r.status !== 201) fail(`Lane create: ${JSON.stringify(r.body)}`);
}
ok('3 Bahnen angelegt');

// 4. lanes_detailed_count = 3
const p2 = await api(`/parcours/${pid}`);
if (p2.body?.parcours?.lanes_detailed_count === 3) ok('lanes_detailed_count=3 nach 3 Bahnen');
else fail(`lanes_detailed_count: ${p2.body?.parcours?.lanes_detailed_count}`);

// 5. Training ohne start_lane → Stations 1=Wildschwein, 2=Reh, 3=Bär
const t1 = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
  parcours_id: pid,
}) });
const t1d = await api(`/trainings/${t1.body.training.id}`);
const targets1 = (t1d.body?.training?.targets ?? []).filter((t) => !t.participant_id || t.participant_id === t1d.body.training.my_participant_id);
const order1 = targets1.map((t) => `${t.target_index}:${t.animal_or_face}@${t.distance_m}`);
console.log(`  Default-Order: ${order1.join(', ')}`);
if (targets1.length === 3 &&
    targets1[0].animal_or_face === 'Wildschwein' && targets1[0].distance_m === 18 &&
    targets1[1].animal_or_face === 'Reh' &&
    targets1[2].animal_or_face === 'Bär') ok('Default-Reihenfolge: 1=Wildschwein@18, 2=Reh, 3=Bär');
else fail(`Default-Reihenfolge falsch: ${JSON.stringify(targets1.map(t => ({i:t.target_index, a:t.animal_or_face, d:t.distance_m})))}`);

// 6. Training mit start_lane=2 → Reh, Bär, Wildschwein
const t2 = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
  parcours_id: pid,
  start_lane: 2,
}) });
const t2d = await api(`/trainings/${t2.body.training.id}`);
const targets2 = (t2d.body?.training?.targets ?? []).filter((t) => !t.participant_id || t.participant_id === t2d.body.training.my_participant_id);
const order2 = targets2.map((t) => `${t.target_index}:${t.animal_or_face}`);
console.log(`  start_lane=2 Order: ${order2.join(', ')}`);
if (targets2.length === 3 &&
    targets2[0].animal_or_face === 'Reh' &&
    targets2[1].animal_or_face === 'Bär' &&
    targets2[2].animal_or_face === 'Wildschwein') ok('start_lane=2: 1=Reh, 2=Bär, 3=Wildschwein');
else fail(`start_lane=2 Reihenfolge falsch: ${order2}`);

// 7. Training mit simple-Disziplin sollte KEINE Stations vorgenerieren
const t3 = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'simple', bow_type: 'recurve', peg_color: 'red',
  parcours_id: pid,
}) });
const t3d = await api(`/trainings/${t3.body.training.id}`);
const targets3 = t3d.body?.training?.targets ?? [];
if (targets3.length === 0) ok('Discipline=simple: keine Stations vorgeneriert');
else fail(`simple hat ${targets3.length} Stations, sollte 0`);

// Cleanup
await api(`/trainings/${t1.body.training.id}`, { method: 'DELETE' });
await api(`/trainings/${t2.body.training.id}`, { method: 'DELETE' });
await api(`/trainings/${t3.body.training.id}`, { method: 'DELETE' });
await api(`/parcours/${pid}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Parcours-Bahnen-Integration grün');
process.exit(errors.length ? 1 : 0);
