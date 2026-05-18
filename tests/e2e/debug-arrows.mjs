/**
 * Test: Pfeil-Sets + M:N-Verknüpfung mit Bögen.
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

// 1. Zwei Bögen
const b1 = await api('/bows', { method: 'POST', body: JSON.stringify({
  name: 'Indoor-Recurve', bow_type: 'recurve', draw_weight_lbs: 36, length_inch: 68, brace_height_inch: 8.75,
}) });
const b2 = await api('/bows', { method: 'POST', body: JSON.stringify({
  name: 'Compound-Outdoor', bow_type: 'compound', draw_weight_lbs: 60, let_off_percent: 80,
}) });
if (b1.status !== 201 || b2.status !== 201) { fail('Bow-Create'); process.exit(1); }
ok(`Bögen #${b1.body.bow.id} (recurve, length=${b1.body.bow.length_inch}, brace=${b1.body.bow.brace_height_inch}) + #${b2.body.bow.id} (compound, let_off=${b2.body.bow.let_off_percent}%)`);

// 2. Ein Pfeil-Set anlegen, mit beiden Bögen verknüpft
const a1 = await api('/arrows', { method: 'POST', body: JSON.stringify({
  name: 'Easton X10 Pro',
  manufacturer: 'Easton',
  model: 'X10',
  material: 'carbon_aluminium',
  diameter_mm: 4.86,
  spine: '550',
  length_inch: 28.5,
  gpi: 9.0,
  fletching_type: 'spin_vane',
  fletching_length_inch: 1.75,
  fletching_count: 3,
  fletching_helix: true,
  fletching_colors: '2× Weiß + 1× Rot',
  nock_type: 'pin',
  nock_manufacturer: 'Beiter',
  nock_color: 'Rot',
  tip_type: 'target',
  tip_weight_grains: 120,
  tip_manufacturer: 'Easton',
  tip_replaceable: true,
  count_total: 12,
  count_broken: 1,
  count_lost: 0,
  purchased_at: '2026-01-15',
  price_per_arrow_cents: 4500,
  notes: 'Wettkampf-Set',
  bow_ids: [b1.body.bow.id, b2.body.bow.id],
}) });
if (a1.status !== 201) { fail(`Arrow-Create: ${JSON.stringify(a1.body)}`); }
const arrowId = a1.body?.arrow?.id;
ok(`Arrow #${arrowId} angelegt mit ${a1.body?.arrow?.linked_bows?.length ?? 0} verknüpften Bögen`);

// 3. Verknüpfung prüfen via bow_detail
const bd = await api(`/bows/${b1.body.bow.id}`);
const linked_arrows = bd.body?.bow?.linked_arrows ?? [];
if (linked_arrows.length !== 1) fail(`Bow1.linked_arrows: ${linked_arrows.length}, erwartet 1`);
else ok(`Bow1.linked_arrows enthält Arrow "${linked_arrows[0].name}" spine=${linked_arrows[0].spine}`);

// 4. Arrow-Detail → linked_bows
const ad = await api(`/arrows/${arrowId}`);
const linked_bows = ad.body?.arrow?.linked_bows ?? [];
if (linked_bows.length !== 2) fail(`Arrow.linked_bows: ${linked_bows.length}, erwartet 2`);
else ok(`Arrow.linked_bows enthält ${linked_bows.length} Bögen`);

// 5. Default-Flag bei erstem Pfeil-Set automatisch true
if (!ad.body?.arrow?.is_default) fail('Erster Pfeil sollte is_default=true bekommen');
else ok('Erstes Pfeil-Set hat is_default automatisch');

// 6. PATCH: einen Bogen entfernen
const patch = await api(`/arrows/${arrowId}`, { method: 'PATCH', body: JSON.stringify({
  bow_ids: [b1.body.bow.id],
  count_broken: 2,
}) });
const after = patch.body?.arrow;
if ((after?.linked_bows?.length ?? 0) !== 1) fail(`Nach PATCH linked_bows=${after?.linked_bows?.length}, erwartet 1`);
else ok('M:N-Update: bow_ids reduziert auf 1');
if (after?.count_broken !== 2) fail(`count_broken nach PATCH: ${after?.count_broken}, erwartet 2`);
else ok('count_broken updated');

// 7. Bow-Image-Upload + Bow-Details
// Cleanup
await api(`/arrows/${arrowId}`, { method: 'DELETE' });
await api(`/bows/${b1.body.bow.id}`, { method: 'DELETE' });
await api(`/bows/${b2.body.bow.id}`, { method: 'DELETE' });

await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Arrows + M:N funktionieren');
process.exit(errors.length ? 1 : 0);
