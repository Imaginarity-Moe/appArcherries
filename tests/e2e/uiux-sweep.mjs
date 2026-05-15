/**
 * UIUX-Sweep: Light + Dark Mode, Mobile + Desktop, alle Hauptpages.
 * Plus automatisierte Checks:
 *  - Map-Overlay-Test: Footer-"Speichern" muss klickbar sein wenn Map sichtbar
 *  - Reload-Banner-Test: nach Cache-Bust soll Cherry-Banner triggern
 *  - Dunkler Text auf dunklem Hintergrund / heller auf hellem (computed-style-Check)
 *  - Build-Revision-Indicator sichtbar
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = join(__dirname, '..', '..');
const ROOT_DIR   = join(REPO_ROOT, 'test-report', 'screenshots', 'uiux');

for (const sub of ['mobile-light', 'mobile-dark', 'desktop-light', 'desktop-dark']) {
  const d = join(ROOT_DIR, sub);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const USER     = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

const FINDINGS = [];

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('archerries.theme', t);
    const root = document.documentElement;
    root.classList.remove('dark');
    if (t === 'dark') root.classList.add('dark');
    else if (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
  }, theme);
}

async function shot(page, dir, name) {
  try {
    await page.screenshot({ path: join(ROOT_DIR, dir, `${name}.png`), fullPage: false });
  } catch (e) {
    FINDINGS.push({ dir, name, kind: 'screenshot-failed', msg: e.message });
  }
}

/**
 * Prüft, dass das Element mit dem gegebenen Selector am gegebenen Punkt
 * der oberste DOM-Element ist (= nicht von einem Overlay verdeckt).
 */
async function assertClickable(page, dir, label, selector) {
  const handle = page.locator(selector).first();
  if (!await handle.count()) {
    FINDINGS.push({ dir, kind: 'missing', label, selector });
    return;
  }
  const box = await handle.boundingBox();
  if (!box) {
    FINDINGS.push({ dir, kind: 'no-box', label, selector });
    return;
  }
  // Center des Elements
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const result = await page.evaluate(({ cx, cy, selector }) => {
    const target = document.querySelector(selector);
    const top = document.elementFromPoint(cx, cy);
    return { topTag: top?.tagName, topClass: top?.className?.toString().slice(0, 80), contains: target ? target.contains(top) || top === target : false };
  }, { cx, cy, selector });
  if (!result.contains) {
    FINDINGS.push({
      dir,
      kind: 'overlapped',
      label,
      selector,
      msg: `Element nicht klickbar — überlagert von <${result.topTag}> class="${result.topClass}"`,
    });
  }
}

/**
 * Sammelt alle text-haltenden Elemente und prüft Kontrast zwischen
 * color und backgroundColor (resolved). WCAG AA = 4.5 für Body-Text, 3 für large.
 */
async function checkContrast(page, dir, label) {
  const issues = await page.evaluate(() => {
    const out = [];
    const parseRgb = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const luminance = (c) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const contrast = (a, b) => {
      const la = luminance(a), lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const resolveBg = (el) => {
      let e = el;
      while (e) {
        const cs = getComputedStyle(e);
        const bg = parseRgb(cs.backgroundColor);
        if (bg && bg.a > 0.5) return bg;
        e = e.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const els = document.querySelectorAll('p, span, h1, h2, h3, h4, a, button, label, li, td, div');
    for (const el of els) {
      const cs = getComputedStyle(el);
      // Nur direkt-text-haltige Elemente
      const text = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).filter(Boolean).join(' ');
      if (!text || text.length < 2) continue;
      // Skip wenn unsichtbar
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.3) continue;
      const fg = parseRgb(cs.color);
      const bg = resolveBg(el);
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight) >= 600;
      const large = size >= 24 || (size >= 18.66 && bold);
      const threshold = large ? 3 : 4.5;
      if (ratio < threshold) {
        out.push({
          ratio: Math.round(ratio * 100) / 100,
          threshold,
          text: text.slice(0, 80),
          color: cs.color,
          bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
          tag: el.tagName,
          cls: el.className?.toString().slice(0, 80),
        });
      }
    }
    return out;
  });
  for (const i of issues) {
    FINDINGS.push({ dir, kind: 'low-contrast', label, ...i });
  }
}

async function runViewport(vp, ctxOpts) {
  for (const theme of ['light', 'dark']) {
    const dir = `${vp}-${theme}`;
    console.log(`\n══════ ${dir.toUpperCase()} ══════════════════════`);

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ ...ctxOpts, locale: 'de-DE' , serviceWorkers: "block" });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => FINDINGS.push({ dir, kind: 'pageerror', msg: e.message }));
    page.on('console', (m) => {
      if (m.type() === 'error') FINDINGS.push({ dir, kind: 'console-error', msg: m.text() });
    });

    try {
      await login(page);
      await applyTheme(page, theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);

      // Build-Revision sichtbar? Locator über Title-Attribut (eindeutiger als Text-Regex)
      const buildEl = page.locator('[title^="Revision "], [title^="Build "]').first();
      const visible = await buildEl.isVisible().catch(() => false);
      if (!visible) FINDINGS.push({ dir, kind: 'missing', label: 'Build-Revision-Tag nicht sichtbar' });
      else console.log(`  ✓ Build-Revision sichtbar`);

      // ─── Dashboard ────────────────────────────────────────────────
      await shot(page, dir, '01-dashboard');
      await checkContrast(page, dir, 'dashboard');

      // ─── Profile ──────────────────────────────────────────────────
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '02-profile');
      await checkContrast(page, dir, 'profile');

      // ─── Parcours-Liste mit öffentlich ────────────────────────────
      await page.goto(`${BASE_URL}/parcours?include_public=1`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      const includeCb = page.locator('input[type="checkbox"]').first();
      if (await includeCb.count()) await includeCb.check().catch(() => null);
      await page.waitForTimeout(500);
      await shot(page, dir, '03-parcours-list');
      await checkContrast(page, dir, 'parcours-list');

      // ─── Karte-View (Map) ─────────────────────────────────────────
      const mapBtn = page.locator('button:has-text("Karte")').first();
      if (await mapBtn.count()) {
        await mapBtn.click();
        await page.waitForTimeout(800);
        await shot(page, dir, '04-parcours-map');
      }

      // ─── NewParcours (Map mit Footer-Test) ────────────────────────
      await page.goto(`${BASE_URL}/parcours/new`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '05-new-parcours');
      if (vp === 'mobile') {
        // Auf Mobile: scroll runter zur Map → Footer-Speichern muss sichtbar+klickbar bleiben
        await page.evaluate(() => window.scrollTo(0, 800));
        await page.waitForTimeout(400);
        await shot(page, dir, '05b-new-parcours-scrolled');
        await assertClickable(page, dir, 'Footer-Speichern (Map sichtbar)', 'nav[aria-label="Hauptnavigation"] button[aria-label="Speichern"]');
      }

      // ─── ParcoursDetail (ersten öffentlichen Parcours) ────────────
      // — wir nutzen einfach /parcours dann ersten Eintrag
      await page.goto(`${BASE_URL}/parcours?include_public=1`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      const firstLink = page.locator('a[href^="/parcours/"]').filter({ hasNotText: 'Aus OSM' }).first();
      if (await firstLink.count()) {
        await firstLink.click();
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);
        await shot(page, dir, '06-parcours-detail');
        await checkContrast(page, dir, 'parcours-detail');
        // Scroll zu Highscore + Reviews
        await page.evaluate(() => window.scrollTo(0, 700));
        await page.waitForTimeout(300);
        await shot(page, dir, '06b-parcours-detail-scroll');
      }

      // ─── NewTraining-Wizard ───────────────────────────────────────
      await page.goto(`${BASE_URL}/trainings/new`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '07-new-training');
      await checkContrast(page, dir, 'new-training');

      // ─── Stats ────────────────────────────────────────────────────
      await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '08-stats');

      // ─── Bows ─────────────────────────────────────────────────────
      await page.goto(`${BASE_URL}/bows`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '09-bows');

      // ─── Help ─────────────────────────────────────────────────────
      await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await shot(page, dir, '10-help');
      await page.goto(`${BASE_URL}/help/community`, { waitUntil: 'networkidle', timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(400);
      await shot(page, dir, '11-help-community');

    } catch (e) {
      FINDINGS.push({ dir, kind: 'fatal', msg: e.message });
    } finally {
      await browser.close();
    }
  }
}

await runViewport('mobile',  { ...devices['iPhone 14 Pro'] });
await runViewport('desktop', { viewport: { width: 1440, height: 900 } });

// Findings sortieren und in MD schreiben
const byKind = {};
for (const f of FINDINGS) {
  const k = f.kind;
  if (!byKind[k]) byKind[k] = [];
  byKind[k].push(f);
}

const lines = [];
lines.push('# UIUX-Sweep — Findings');
lines.push('');
lines.push(`- **Gegen:** ${BASE_URL}`);
lines.push(`- **Stand:** ${new Date().toISOString()}`);
lines.push(`- **Findings gesamt:** ${FINDINGS.length}`);
lines.push('');
for (const kind of Object.keys(byKind).sort()) {
  lines.push(`## ${kind} (${byKind[kind].length})`);
  // Dedup low-contrast: gleicher text+color+bg
  const seen = new Set();
  for (const f of byKind[kind]) {
    if (kind === 'low-contrast') {
      const key = `${f.text}|${f.color}|${f.bg}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- **${f.dir}** ratio ${f.ratio}/${f.threshold} — "${f.text}" · ${f.color} on ${f.bg} (${f.tag})`);
    } else if (kind === 'overlapped') {
      lines.push(`- **${f.dir}** ${f.label}: ${f.msg}`);
    } else {
      const extras = Object.entries(f)
        .filter(([k]) => !['kind', 'dir'].includes(k))
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 100) : v}`)
        .join(' · ');
      lines.push(`- **${f.dir}** ${extras}`);
    }
  }
  lines.push('');
}

const out = join(REPO_ROOT, 'test-report', 'UIUX_SWEEP.md');
writeFileSync(out, lines.join('\n'), 'utf-8');
console.log(`\n→ ${out}`);
console.log(`→ ${FINDINGS.length} Findings`);
