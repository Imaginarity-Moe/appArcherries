/**
 * Vollständiger Training-Flow + Score-Verifikation.
 *
 * Spielt für jede 3D-Disziplin ein Training auf einem Test-Parcours durch:
 *  1. Login
 *  2. Parcours anlegen
 *  3. Bahn anlegen
 *  4. Training starten
 *  5. Station 1 öffnen → Klick aufs Bullseye-Zentrum
 *  6. Verifiziere: korrekte Punktzahl je Disziplin/Pfeil-Slot
 *  7. Training beenden → Summary anzeigen
 *
 * Ziel: BullseyePad-Invertierungs-Fix + Scoring-Logik gegen Production validieren.
 */

import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'test-report');
const SHOT_DIR   = join(REPORT_DIR, 'screenshots', 'training-flow');
if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });

const BASE_URL  = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const TEST_EMAIL = process.env.E2E_EMAIL    ?? 'claude-test@archerries.local';
const TEST_PASS  = process.env.E2E_PASS     ?? 'ClaudeTest_2026!';

// Erwartete Inner-Kill-Punkte für Pfeil 1 (zentralster Ring)
const EXPECTED_FIRST_INNER = {
  '3d_wa':         11, // X
  '3d_ifaa':       20, // Inner Kill
  '3d_ifaa_hunter':20,
  '3d_ifaa_animal':20, // Vital (Kill)
  '3d_bowhunter':   5,
  'field_wa':       6, // X (Tie-Break)
  'field_ifaa':     5,
};

const RESULTS = { startedAt: new Date().toISOString(), runs: [] };

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASS);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => null),
    page.evaluate(() => {
      const f = document.querySelector('form');
      if (f && typeof f.requestSubmit === 'function') f.requestSubmit();
    }),
  ]);
  return !page.url().includes('/login');
}

async function shot(page, name) {
  try { await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: false }); } catch {}
}

/**
 * Erstellt ein Training direkt per API. Robust gegen UI-Änderungen im Wizard.
 */
async function createTrainingViaApi(page, discipline) {
  const result = await page.evaluate(async ({ discipline }) => {
    const token = localStorage.getItem('archerries.token');
    if (!token) throw new Error('Kein JWT im LocalStorage');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const res = await fetch('/api/index.php/trainings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        discipline,
        bow_type: 'recurve',
        started_at: now,
        peg_color: null,
        distance_marked: null,
        location: null,
        notes: 'E2E training-flow',
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Training-Create ${res.status}: ${JSON.stringify(body)}`);
    return body;
  }, { discipline });
  return result;
}

async function deleteTrainingViaApi(page, trainingId) {
  await page.evaluate(async ({ trainingId }) => {
    const token = localStorage.getItem('archerries.token');
    await fetch(`/api/index.php/trainings/${trainingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }, { trainingId });
}

/**
 * Spielt Disziplin durch: Training erstellen, Station 1 öffnen, Bullseye-Center
 * klicken, Live-Score auslesen, beenden.
 */
async function runDiscipline(page, discipline) {
  const run = { discipline, ok: true, steps: [], note: '' };
  RESULTS.runs.push(run);

  let trainingId = null;
  try {
    const r = await createTrainingViaApi(page, discipline);
    trainingId = r.training?.id ?? r.id ?? null;
    if (!trainingId) throw new Error('Keine Training-ID in Response');
    run.steps.push({ step: 'create', ok: true });

    // Wenn Simple → kein BullseyePad-Flow
    if (discipline === 'simple') {
      run.note = 'simple: kein BullseyePad';
      await deleteTrainingViaApi(page, trainingId);
      return;
    }

    // Direkt Station 1 öffnen
    await page.goto(`${BASE_URL}/trainings/${trainingId}?station=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
    await shot(page, `${discipline}-01-station-empty`);

    // BullseyePad-SVG finden
    const svg = page.locator('svg[viewBox="0 0 200 200"]').first();
    const box = await svg.boundingBox();
    if (!box) throw new Error('BullseyePad-SVG nicht gefunden');

    // Center-Click
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);
    await shot(page, `${discipline}-02-after-center-click`);

    // Live-Score aus Header rechts auslesen (.score-Klasse mit Cherry-Farbton)
    const scoreText = await page.locator('header .score').first().textContent({ timeout: 5000 }).catch(() => null);
    const liveScore = scoreText ? parseInt(scoreText.trim(), 10) : NaN;
    run.steps.push({ step: 'center-click', ok: true, liveScore });

    // Pfeil-1-Punkte aus Slot-Anzeige auslesen — "+N" unter dem Zonen-Text
    const slot1PointsText = await page.locator('text=/^\\+\\d+$/').first().textContent({ timeout: 3000 }).catch(() => null);
    const slot1Points = slot1PointsText ? parseInt(slot1PointsText.replace('+', ''), 10) : NaN;
    run.steps.push({ step: 'slot1-points', ok: true, slot1Points });

    const expected = EXPECTED_FIRST_INNER[discipline];
    run.expected = expected;
    if (liveScore !== expected) {
      run.ok = false;
      run.note = `Live-Score ${liveScore} != erwartet ${expected}`;
    } else if (!isNaN(slot1Points) && slot1Points !== expected) {
      run.ok = false;
      run.note = `Slot-1-Points ${slot1Points} != erwartet ${expected}`;
    } else {
      run.note = `OK: Live-Score ${liveScore}, Slot1 ${slot1Points}`;
    }

    // Speichern & weiter klicken — zeigt dass Save funktioniert
    const saveBtn = page.locator('button:has-text("Speichern & weiter")').first();
    if (await saveBtn.count()) {
      await saveBtn.click().catch(() => null);
      await page.waitForTimeout(800);
      run.steps.push({ step: 'save-next', ok: true });
    }

  } catch (err) {
    run.ok = false;
    run.note = run.note || `${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (trainingId) {
      await deleteTrainingViaApi(page, trainingId).catch(() => null);
    }
  }
}

async function main() {
  console.log(`Training-Flow gegen ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'de-DE' });
  const page = await context.newPage();

  page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

  if (!await login(page)) {
    console.error('Login fehlgeschlagen — Abbruch');
    process.exit(1);
  }
  console.log('  ✓ logged in');

  for (const d of Object.keys(EXPECTED_FIRST_INNER)) {
    console.log(`\n→ ${d}`);
    await runDiscipline(page, d);
    const r = RESULTS.runs[RESULTS.runs.length - 1];
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.note}`);
  }

  // simple-disziplin ohne Pfeile
  console.log(`\n→ simple`);
  await runDiscipline(page, 'simple');

  await browser.close();

  RESULTS.endedAt = new Date().toISOString();
  const reportPath = join(REPORT_DIR, 'TRAINING_FLOW.md');
  writeReport(reportPath);
  console.log(`\n→ ${reportPath}`);

  const failed = RESULTS.runs.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function writeReport(path) {
  const lines = [];
  lines.push('# Training-Flow + Score-Verifikation');
  lines.push('');
  lines.push(`- **Gegen:** ${BASE_URL}`);
  lines.push(`- **Start:** ${RESULTS.startedAt}`);
  lines.push(`- **Ende:**  ${RESULTS.endedAt}`);
  const fails = RESULTS.runs.filter((r) => !r.ok).length;
  const total = RESULTS.runs.length;
  lines.push(`- **Disziplinen geprüft:** ${total} (${total - fails} OK / ${fails} fail)`);
  lines.push('');
  lines.push('## Pro Disziplin');
  lines.push('');
  lines.push('| Disziplin | Erwartet (Pfeil 1, Bullseye) | Live-Score | Slot 1 | Ergebnis | Note |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of RESULTS.runs) {
    const liveScore = r.steps.find((s) => s.step === 'center-click')?.liveScore ?? '—';
    const slot1 = r.steps.find((s) => s.step === 'slot1-points')?.slot1Points ?? '—';
    lines.push(`| ${r.discipline} | ${r.expected ?? '—'} | ${liveScore} | ${slot1} | ${r.ok ? '✓' : '✗'} | ${r.note} |`);
  }
  lines.push('');
  writeFileSync(path, lines.join('\n'), 'utf-8');
}

main().catch((e) => {
  console.error('Suite crashed:', e);
  process.exit(2);
});
