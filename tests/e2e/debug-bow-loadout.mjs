/**
 * Test: bow_id-FK Verkettung
 * 1. Bogen anlegen
 * 2. Training mit bow_id anlegen
 * 3. Training-Detail prüfen: bow_id + bow_name kommen mit
 */
import { chromium, devices } from 'playwright';

const BASE_URL = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], serviceWorkers: 'block' });
const page = await ctx.newPage();

await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', USER.email);
await page.fill('input[type="password"]', USER.pass);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

async function api(path, opts = {}) {
  return page.evaluate(async ({ path, opts }) => {
    const token = localStorage.getItem('archerries.token');
    const headers = { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(`/api/index.php${path}`, { ...opts, headers });
    return { status: r.status, body: await r.json().catch(() => null) };
  }, { path, opts });
}

const errors = [];
const ok = (m) => console.log('  ✓ ' + m);
const fail = (m) => { console.error('  ✗ ' + m); errors.push(m); };

// 1. Bogen anlegen
const bow = await api('/bows', { method: 'POST', body: JSON.stringify({ name: 'Mein Recurve 2026', bow_type: 'recurve', draw_weight_lbs: 38, arrow_spine: '700' }) });
if (bow.status !== 201) { fail(`Bogen-Create ${bow.status}: ${JSON.stringify(bow.body)}`); process.exit(1); }
const bowId = bow.body.bow.id;
ok(`Bogen #${bowId} angelegt`);

// 2. Training mit bow_id
const tr = await api('/trainings', { method: 'POST', body: JSON.stringify({ discipline: '3d_wa', bow_type: 'recurve', bow_id: bowId, started_at: new Date().toISOString().slice(0,19).replace('T',' ') }) });
if (tr.status !== 201) { fail(`Training-Create: ${JSON.stringify(tr.body)}`); }
const trId = tr.body.training.id;
ok(`Training #${trId} angelegt`);
console.log('  · training.bow_id:', tr.body.training.bow_id, 'bow_name:', tr.body.training.bow_name);

if (tr.body.training.bow_id !== bowId) fail(`bow_id mismatch: ${tr.body.training.bow_id} != ${bowId}`);
else ok('bow_id im Response korrekt');
if (tr.body.training.bow_name !== 'Mein Recurve 2026') fail(`bow_name leer: ${tr.body.training.bow_name}`);
else ok(`bow_name "${tr.body.training.bow_name}" korrekt`);

// 3. Training-Liste prüfen: bow_name kommt mit
const list = await api('/trainings');
const found = list.body.trainings.find((t) => t.id === trId);
if (!found) fail('Training nicht in Liste');
else if (found.bow_name !== 'Mein Recurve 2026') fail(`bow_name in Liste falsch: ${found.bow_name}`);
else ok('bow_name in Trainings-Liste sichtbar');

// Cleanup
await api(`/trainings/${trId}`, { method: 'DELETE' });
await api(`/bows/${bowId}`, { method: 'DELETE' });
await browser.close();

console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Equipment-Loadout funktioniert');
process.exit(errors.length ? 1 : 0);
