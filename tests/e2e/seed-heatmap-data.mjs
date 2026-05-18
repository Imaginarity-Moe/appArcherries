/**
 * Seed: realistisches 3D-IFAA-Training für Claude Test mit
 * mehreren Tieren auf verschiedenen Distanzen — damit die Heatmap
 * auf /stats was zu zeigen hat.
 */
import { chromium } from 'playwright';

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', password: 'ClaudeTest_2026!' };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const page = await ctx.newPage();

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

// Gauss-ish jitter um center (mit gelegentlichem Ausreißer)
function jitter(centerX, centerY, sd = 0.05, missChance = 0.1) {
  // Box-Muller
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
  let x = centerX + z0 * sd;
  let y = centerY + z1 * sd;
  // Gelegentlicher Komplett-Miss
  if (Math.random() < missChance) {
    x = 0.1 + Math.random() * 0.8;
    y = 0.1 + Math.random() * 0.8;
  }
  return { x: Math.max(0.02, Math.min(0.98, x)), y: Math.max(0.02, Math.min(0.98, y)) };
}

function zoneFor(x, y) {
  const dx = x - 0.5, dy = y - 0.5;
  const r = Math.sqrt(dx*dx + dy*dy);
  if (r < 0.08) return 'vital';   // Center = Kill/Vital
  if (r < 0.20) return 'wound';   // Mittlerer Bereich = Wound
  return 'miss';
}

// Tiere + Distanzen + Streuungs-Charakteristik (sd je Distanz)
const STATIONS = [
  { animal: 'Wildschwein', distance: 18, sd: 0.05 },
  { animal: 'Wildschwein', distance: 18, sd: 0.05 },
  { animal: 'Wildschwein', distance: 25, sd: 0.08 },
  { animal: 'Wildschwein', distance: 25, sd: 0.08 },
  { animal: 'Wildschwein', distance: 30, sd: 0.12 },
  { animal: 'Reh',         distance: 15, sd: 0.04 },
  { animal: 'Reh',         distance: 22, sd: 0.07 },
  { animal: 'Reh',         distance: 28, sd: 0.10 },
  { animal: 'Bär',         distance: 20, sd: 0.06 },
  { animal: 'Bär',         distance: 35, sd: 0.13 },
  { animal: 'Fuchs',       distance: 12, sd: 0.05 },
  { animal: 'Fuchs',       distance: 20, sd: 0.09 },
];

console.log('Erstelle 3D-IFAA-Trainings-Session für Claude Test …');

// Bow holen oder anlegen
const bowsRes = await api('/bows');
let bow = bowsRes.body?.bows?.[0];
if (!bow) {
  const r = await api('/bows', { method: 'POST', body: JSON.stringify({
    name: 'Demo-Recurve 36 lbs', bow_type: 'recurve', draw_weight_lbs: 36,
  }) });
  bow = r.body.bow;
}

// Training anlegen
const t = await api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: '3d_ifaa', bow_type: 'recurve', peg_color: 'red',
  bow_id: bow.id,
  location: 'Demo-Parcours',
  notes: 'Seed-Training für Heatmap-Demo',
}) });
const trId = t.body?.training?.id;
console.log(`  → Training #${trId} angelegt`);

// 3D-Bowhunter? Nein, IFAA hat 3 Pfeile. Default = 3.
for (let i = 0; i < STATIONS.length; i++) {
  const st = STATIONS[i];
  const target = await api(`/trainings/${trId}/targets`, { method: 'POST', body: JSON.stringify({
    target_index: i + 1, animal_or_face: st.animal, distance_m: st.distance,
  }) });
  const tid = target.body?.target?.id;
  if (!tid) { console.error(`  ✗ Station ${i+1} fehlgeschlagen: ${JSON.stringify(target.body)}`); continue; }

  // 3 Pfeile mit Gauss-jitter um center (0.5, 0.5)
  const shots = [];
  for (let s = 1; s <= 3; s++) {
    const pos = jitter(0.5, 0.5, st.sd, 0.08);
    shots.push({
      arrow_seq: s,
      zone: zoneFor(pos.x, pos.y),
      x_norm: Number(pos.x.toFixed(4)),
      y_norm: Number(pos.y.toFixed(4)),
    });
  }
  await api(`/trainings/${trId}/targets/${tid}`, { method: 'PATCH', body: JSON.stringify({ shots }) });
  process.stdout.write(`  Station ${i+1}/${STATIONS.length} ${st.animal}@${st.distance}m: ${shots.map(s => s.zone).join(',')}\n`);
}

console.log(`\n✓ Fertig! Login als ${USER.email} und auf /stats die "Treffer-Heatmap"-Sektion am Ende der Seite ansehen.`);
console.log(`  Tier-Picker zeigt: Wildschwein (15), Reh (9), Bär (6), Fuchs (6).`);
console.log(`  URL: ${BASE}/stats`);

await browser.close();
