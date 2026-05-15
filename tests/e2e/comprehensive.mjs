/**
 * Comprehensive E2E-Test-Suite — Mobile + Desktop
 *
 * Läuft gegen Production (default) oder lokales Vite-Dev.
 *   node tests/e2e/comprehensive.mjs
 *   E2E_BASE_URL=http://localhost:5173 node tests/e2e/comprehensive.mjs
 *
 * Ziel: alle Hauptseiten + Hauptflows beider Viewports schießen, console-errors
 * + page-errors sammeln, ein Markdown-Report schreiben.
 *
 * Nicht abbrechend: jeder Schritt fängt eigene Fehler ab und protokolliert sie.
 */

import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const REPORT_DIR = join(REPO_ROOT, 'test-report');
const SHOT_ROOT  = join(REPORT_DIR, 'screenshots');
for (const d of [REPORT_DIR, SHOT_ROOT, join(SHOT_ROOT, 'mobile'), join(SHOT_ROOT, 'desktop')]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const BASE_URL  = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const TEST_EMAIL = process.env.E2E_EMAIL    ?? 'claude-test@archerries.local';
const TEST_PASS  = process.env.E2E_PASS     ?? 'ClaudeTest_2026!';

const RESULTS = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  steps: [],          // { id, viewport, label, ok, error?, screenshots: [path], notes: [string] }
  consoleErrors: [],  // { viewport, page, type, text }
  pageErrors: [],     // { viewport, page, message }
  failedRequests: [], // { viewport, page, url, status }
};

function logStep(step) {
  RESULTS.steps.push(step);
  const tag = step.ok ? '✓' : '✗';
  console.log(`[${step.viewport}] ${tag} ${step.id} ${step.label}${step.error ? ' — ' + step.error : ''}`);
}

async function shot(page, viewport, name) {
  const path = join(SHOT_ROOT, viewport, `${name}.png`);
  try {
    await page.screenshot({ path, fullPage: false });
    return path;
  } catch (e) {
    return null;
  }
}

/**
 * Wrappt eine Step-Function. Fängt Errors, fügt Screenshot an, protokolliert.
 */
async function step({ page, viewport, id, label, fn, captureShot = true }) {
  const entry = { id, viewport, label, ok: true, screenshots: [], notes: [] };
  try {
    const notes = await fn(entry);
    if (Array.isArray(notes)) entry.notes.push(...notes);
  } catch (err) {
    entry.ok = false;
    entry.error = err instanceof Error ? err.message : String(err);
  }
  if (captureShot) {
    const p = await shot(page, viewport, id);
    if (p) entry.screenshots.push(p);
  }
  logStep(entry);
  return entry;
}

async function safeGoto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Kurzes networkidle-Wartespiel, ohne 30s blockieren zu lassen
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
    return true;
  } catch {
    return false;
  }
}

async function attachListeners(page, viewport) {
  let currentUrl = '<initial>';
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) currentUrl = f.url();
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      RESULTS.consoleErrors.push({ viewport, page: currentUrl, type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    RESULTS.pageErrors.push({ viewport, page: currentUrl, message: err.message });
  });
  page.on('response', (resp) => {
    if (resp.status() >= 500 || (resp.status() >= 400 && resp.url().includes('/api/'))) {
      RESULTS.failedRequests.push({ viewport, page: currentUrl, url: resp.url(), status: resp.status() });
    }
  });
}

async function login(page) {
  await safeGoto(page, `${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASS);
  // Login-Button hat keinen type="submit" — wir submitten das Form direkt.
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => null),
    page.evaluate(() => {
      const f = document.querySelector('form');
      if (f && typeof f.requestSubmit === 'function') f.requestSubmit();
      else if (f) f.submit();
    }),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
  return !page.url().includes('/login');
}

// ─── Run pro Viewport ────────────────────────────────────────────────────

async function runViewport(viewport, contextOptions) {
  console.log(`\n══════ ${viewport.toUpperCase()} ══════════════════════════════════`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...contextOptions, locale: 'de-DE' , serviceWorkers: "block" });
  const page = await context.newPage();
  await attachListeners(page, viewport);

  try {
    // 1) Login
    await step({ page, viewport, id: '01-login-page', label: 'Login-Page laden', fn: async () => {
      const ok = await safeGoto(page, `${BASE_URL}/login`);
      if (!ok) throw new Error('Konnte Login-Page nicht laden');
    }});

    await step({ page, viewport, id: '02-login-submit', label: 'Login durchführen', fn: async () => {
      const ok = await login(page);
      if (!ok) throw new Error(`Login fehlgeschlagen, URL: ${page.url()}`);
    }});

    // 2) Dashboard
    await step({ page, viewport, id: '03-dashboard', label: 'Dashboard', fn: async () => {
      await safeGoto(page, `${BASE_URL}/`);
      const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
      if (!heading || heading.trim() === '') throw new Error('Dashboard ohne Heading');
    }});

    // 3) Profile + Avatar-Anzeige
    await step({ page, viewport, id: '04-profile', label: 'Profile-Page', fn: async (entry) => {
      await safeGoto(page, `${BASE_URL}/profile`);
      // Avatar-Block vorhanden?
      const avatarVisible = await page.locator('.rounded-full').first().isVisible().catch(() => false);
      if (!avatarVisible) entry.notes.push('Avatar-Element nicht visible');
    }});

    // 4) Logout-Trigger findbar? (viewport-aware: Mobile-Footer-Nav vs. Desktop-Sidebar)
    await step({ page, viewport, id: '05-logout-trigger', label: 'Logout-Trigger sichtbar', fn: async (entry) => {
      const logoutBtn = viewport === 'mobile'
        ? page.locator('nav[aria-label="Hauptnavigation"] button[aria-label="Logout"]').first()
        : page.locator('aside button[aria-label="Abmelden"]').first();
      const visible = await logoutBtn.isVisible().catch(() => false);
      if (!visible) throw new Error(`Logout-Button nicht visible auf ${viewport}`);
      entry.notes.push(`Logout-Button gefunden: ${await logoutBtn.getAttribute('aria-label')}`);
    }});

    // 5) Parcours-Liste
    await step({ page, viewport, id: '06-parcours-list', label: 'Parcours-Liste', fn: async (entry) => {
      await safeGoto(page, `${BASE_URL}/parcours`);
      const cards = await page.locator('a[href^="/parcours/"]').count();
      entry.notes.push(`${cards} Parcours-Links sichtbar`);
    }});

    // 6) Parcours anlegen
    let parcoursId = null;
    await step({ page, viewport, id: '07-parcours-new', label: 'Parcours anlegen', fn: async (entry) => {
      await safeGoto(page, `${BASE_URL}/parcours/new`);
      const testName = `E2E ${viewport} ${new Date().toISOString().slice(11, 19)}`;
      const nameInput = page.locator('input[name="name"], input[placeholder*="Name" i]').first();
      if (await nameInput.count()) await nameInput.fill(testName);
      else await page.locator('input').first().fill(testName);

      // Pflöcke aktivieren (blau + rot)
      for (const pegLabel of ['Blau', 'Rot']) {
        const cb = page.locator(`label:has-text("${pegLabel}") input[type="checkbox"]`).first();
        if (await cb.count()) await cb.check().catch(() => null);
      }

      await Promise.all([
        page.waitForURL(/\/parcours\/\d+(?!\/(new|edit|lanes))/, { timeout: 20000 }).catch(() => null),
        page.evaluate(() => {
          const f = document.getElementById('parcours-new-form');
          if (f && typeof f.requestSubmit === 'function') f.requestSubmit();
        }),
      ]);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
      const m = page.url().match(/\/parcours\/(\d+)/);
      if (!m) throw new Error(`Parcours nicht angelegt — URL: ${page.url()}`);
      parcoursId = m[1];
      entry.notes.push(`Parcours #${parcoursId} angelegt`);
    }});

    // 7) Parcours-Detail
    if (parcoursId) {
      await step({ page, viewport, id: '08-parcours-detail', label: 'Parcours-Detail', fn: async () => {
        await safeGoto(page, `${BASE_URL}/parcours/${parcoursId}`);
      }});

      // 8) Parcours-Edit
      await step({ page, viewport, id: '09-parcours-edit', label: 'Parcours-Edit', fn: async () => {
        await safeGoto(page, `${BASE_URL}/parcours/${parcoursId}/edit`);
      }});

      // 9) Bahnen-Verwaltung
      await step({ page, viewport, id: '10-lanes-empty', label: 'Bahnen-Verwaltung (leer)', fn: async () => {
        await safeGoto(page, `${BASE_URL}/parcours/${parcoursId}/lanes`);
      }});

      // 10) Bahn anlegen
      await step({ page, viewport, id: '11-lane-create', label: 'Erste Bahn anlegen', fn: async (entry) => {
        const newBtn = page.locator('button:has-text("Erste Bahn anlegen"), button:has-text("Neue Bahn")').first();
        if (!await newBtn.count()) throw new Error('"Neue Bahn"-Button nicht gefunden');
        await newBtn.click();
        await page.waitForTimeout(300);

        const animalInput = page.locator('input[placeholder*="Rehbock" i], input[placeholder*="Tier" i]').first();
        if (await animalInput.count()) await animalInput.fill(`Tier ${viewport}`);
        const blue = page.locator('label:has-text("Blau") input[type="number"]').first();
        if (await blue.count()) await blue.fill('15');
        const red = page.locator('label:has-text("Rot") input[type="number"]').first();
        if (await red.count()) await red.fill('20');

        const save = page.locator('button[type="submit"]:has-text("Speichern")').first();
        if (await save.count()) await save.click();
        await page.waitForTimeout(800);
        entry.notes.push('Bahn 1 angelegt');
      }});
    }

    // 11) Bogen-Profile
    await step({ page, viewport, id: '12-bows', label: 'Bows-Page', fn: async () => {
      await safeGoto(page, `${BASE_URL}/bows`);
    }});

    // 12) NewTraining-Wizard
    await step({ page, viewport, id: '13-new-training-step1', label: 'NewTraining-Wizard', fn: async (entry) => {
      const url = parcoursId ? `${BASE_URL}/trainings/new?parcours=${parcoursId}` : `${BASE_URL}/trainings/new`;
      await safeGoto(page, url);
      // Disziplin "3D · IFAA Standard"
      const ifaa = page.locator('button:has-text("IFAA Standard"), button:has-text("3D · IFAA Standard")').first();
      if (await ifaa.count()) await ifaa.click().catch(() => null);
      // Footer-Action "Weiter"
      const nextBtn = page.locator('button:has-text("Weiter"), button:has-text("Next")').first();
      if (await nextBtn.count()) await nextBtn.click().catch(() => null);
      await page.waitForTimeout(500);
    }});

    // 13) Stats
    await step({ page, viewport, id: '14-stats', label: 'Stats-Page', fn: async () => {
      await safeGoto(page, `${BASE_URL}/stats`);
    }});

    // 14) Help
    await step({ page, viewport, id: '15-help', label: 'Help-Hub', fn: async () => {
      await safeGoto(page, `${BASE_URL}/help`);
    }});

    // 15) Help-Sub-Pages: prüfen ob Deep-Links rendern
    for (const sub of ['scoring', 'app', 'install', 'shared']) {
      await step({ page, viewport, id: `16-help-${sub}`, label: `Help ${sub}`, fn: async () => {
        await safeGoto(page, `${BASE_URL}/help/${sub}`);
      }});
    }

    // 16) Logout (viewport-aware Selector)
    await step({ page, viewport, id: '17-logout', label: 'Logout durchführen', fn: async (entry) => {
      await safeGoto(page, `${BASE_URL}/profile`);
      const logoutBtn = viewport === 'mobile'
        ? page.locator('nav[aria-label="Hauptnavigation"] button[aria-label="Logout"]').first()
        : page.locator('aside button[aria-label="Abmelden"]').first();
      await logoutBtn.click();
      // ConfirmDialog: variant=danger Button mit Text "Abmelden"
      const confirm = page.locator('[role="dialog"] button:has-text("Abmelden"), [role="alertdialog"] button:has-text("Abmelden")').first();
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirm.click();
      }
      await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 8000 }).catch(() => null);
      if (!page.url().includes('/login')) {
        entry.notes.push(`Nach Logout auf URL: ${page.url()} (Login-Redirect fehlt)`);
        throw new Error('Logout führte nicht zur Login-Page');
      }
    }});

  } finally {
    await browser.close();
  }
}

// ─── Hauptflow: beide Viewports ──────────────────────────────────────────

async function main() {
  console.log(`Comprehensive E2E gegen ${BASE_URL}`);
  await runViewport('mobile', { ...devices['iPhone 14 Pro'] });
  await runViewport('desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  RESULTS.endedAt = new Date().toISOString();
  writeReport();
  process.exit(RESULTS.steps.some((s) => !s.ok) || RESULTS.pageErrors.length || RESULTS.failedRequests.length ? 1 : 0);
}

function writeReport() {
  const failed = RESULTS.steps.filter((s) => !s.ok);
  const lines = [];
  lines.push('# Archerries — Comprehensive E2E Report');
  lines.push('');
  lines.push(`- **Gegen:** ${BASE_URL}`);
  lines.push(`- **Start:** ${RESULTS.startedAt}`);
  lines.push(`- **Ende:**  ${RESULTS.endedAt}`);
  lines.push(`- **Schritte gesamt:** ${RESULTS.steps.length} (${RESULTS.steps.filter((s) => s.ok).length} OK / ${failed.length} fail)`);
  lines.push(`- **page-errors:** ${RESULTS.pageErrors.length}`);
  lines.push(`- **console.error:** ${RESULTS.consoleErrors.length}`);
  lines.push(`- **failed requests (≥400/api oder ≥500):** ${RESULTS.failedRequests.length}`);
  lines.push('');

  if (failed.length) {
    lines.push('## ✗ Fehlgeschlagene Schritte');
    lines.push('');
    for (const s of failed) {
      lines.push(`### [${s.viewport}] ${s.id} — ${s.label}`);
      lines.push(`**Fehler:** ${s.error}`);
      if (s.screenshots.length) lines.push(`![](${s.screenshots[0].replace(REPO_ROOT + '\\', '').replace(/\\/g, '/')})`);
      lines.push('');
    }
  }

  if (RESULTS.pageErrors.length) {
    lines.push('## 🔥 page-errors (uncaught JS)');
    lines.push('');
    for (const e of RESULTS.pageErrors) lines.push(`- **[${e.viewport}]** \`${e.page}\` — ${e.message}`);
    lines.push('');
  }

  if (RESULTS.consoleErrors.length) {
    lines.push('## 🟥 console.error');
    lines.push('');
    const seen = new Set();
    for (const e of RESULTS.consoleErrors) {
      const key = `${e.viewport}|${e.text.slice(0, 200)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- **[${e.viewport}]** \`${e.page}\` — ${e.text}`);
    }
    lines.push('');
  }

  if (RESULTS.failedRequests.length) {
    lines.push('## 🌐 Failed Requests');
    lines.push('');
    for (const r of RESULTS.failedRequests) lines.push(`- **[${r.viewport}]** ${r.status} ${r.url} (auf ${r.page})`);
    lines.push('');
  }

  lines.push('## 📋 Alle Schritte');
  lines.push('');
  lines.push('| Viewport | ID | Label | Ergebnis | Notizen |');
  lines.push('|---|---|---|---|---|');
  for (const s of RESULTS.steps) {
    const status = s.ok ? '✓' : `✗ ${s.error ?? ''}`;
    const notes = s.notes.join('; ');
    lines.push(`| ${s.viewport} | ${s.id} | ${s.label} | ${status} | ${notes} |`);
  }
  lines.push('');

  lines.push('## 📸 Screenshots');
  lines.push('');
  for (const vp of ['mobile', 'desktop']) {
    lines.push(`### ${vp}`);
    lines.push('');
    for (const s of RESULTS.steps.filter((x) => x.viewport === vp && x.screenshots.length)) {
      const rel = s.screenshots[0].replace(REPO_ROOT + '\\', '').replace(/\\/g, '/');
      lines.push(`- \`${s.id}\` ${s.label} → \`${rel}\``);
    }
    lines.push('');
  }

  const out = join(REPORT_DIR, 'REPORT.md');
  writeFileSync(out, lines.join('\n'), 'utf-8');
  console.log(`\n→ Report: ${out}`);
}

main().catch((err) => {
  console.error('Suite crashed:', err);
  RESULTS.endedAt = new Date().toISOString();
  writeReport();
  process.exit(2);
});
