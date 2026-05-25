/**
 * Visual + Functional Check der Sight-Marks-Section in BowEdit.
 * Erzeugt einen Test-Bogen, fügt 3 Marken hinzu, screenshotted die
 * interpolierte Tabelle, räumt anschließend auf.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '..', 'test-report', 'screenshots', 'sight-marks');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BASE = 'https://archerries.mossig.de';
const USER = { email: 'claude-test@archerries.local', pass: 'ClaudeTest_2026!' };

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.pass);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
    page.evaluate(() => document.querySelector('form')?.requestSubmit()),
  ]);
}

async function ensureBow(page) {
  // Existiert ein Bogen? Wenn ja: die ID aus der Liste lesen
  await page.goto(`${BASE}/bows`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const editLink = await page.locator('a[href^="/bows/"][href$="/edit"]').first();
  if (await editLink.count() === 0) {
    // Neuen Bogen anlegen
    await page.goto(`${BASE}/bows/new`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[placeholder*="Recurve"], input[placeholder*="z.B."]', 'E2E-Test-Bogen');
    await page.evaluate(() => document.querySelector('form')?.requestSubmit());
    await page.waitForTimeout(1500);
  }
  // ID aus Liste lesen
  await page.goto(`${BASE}/bows`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const href = await page.locator('a[href^="/bows/"][href$="/edit"]').first().getAttribute('href');
  const match = href?.match(/\/bows\/(\d+)\/edit/);
  return match ? Number(match[1]) : null;
}

async function setMarks(page, bowId, marks) {
  // Direkt per API-Aufruf (schneller + zuverlässiger als UI)
  await page.evaluate(async ({ id, marks }) => {
    const token = localStorage.getItem('archerries.token');
    // Erst alte Marken löschen
    const existing = await fetch(`/api/index.php/bows/${id}/sight-marks`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json());
    for (const m of existing.marks ?? []) {
      await fetch(`/api/index.php/bows/${id}/sight-marks/${m.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    // Neue hinzufügen
    for (const [d, v] of marks) {
      await fetch(`/api/index.php/bows/${id}/sight-marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ distance_m: d, mark_value: v }),
      });
    }
  }, { id: bowId, marks });
}

for (const [label, ctxOpts] of [
  ['desktop', { viewport: { width: 1280, height: 900 } }],
  ['mobile',  devices['iPhone 13']],
]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await login(page);

  const bowId = await ensureBow(page);
  if (!bowId) {
    console.log(`✗ ${label}: kein Bogen verfügbar`);
    await browser.close();
    continue;
  }

  // Szenario 1: keine Marken
  await setMarks(page, bowId, []);
  await page.goto(`${BASE}/bows/${bowId}/edit`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Visiermarken', { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${label}-empty.png`), fullPage: true });
  console.log(`✓ ${label} · empty`);

  // Szenario 2: 1 Marke (linear nicht möglich)
  await setMarks(page, bowId, [[20, 7.5]]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${label}-single.png`), fullPage: true });
  console.log(`✓ ${label} · single`);

  // Szenario 3: 2 Marken (linear)
  await setMarks(page, bowId, [[18, 8.4], [30, 6.2]]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${label}-linear.png`), fullPage: true });
  console.log(`✓ ${label} · linear`);

  // Szenario 4: 3 Marken (quadratisch)
  await setMarks(page, bowId, [[18, 8.4], [30, 6.2], [50, 4.1]]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${label}-quadratic.png`), fullPage: true });
  console.log(`✓ ${label} · quadratic`);

  // Aufräumen
  await setMarks(page, bowId, []);

  await browser.close();
}

console.log('Done.');
