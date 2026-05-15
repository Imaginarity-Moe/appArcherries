/**
 * Cleanup-Script: löscht alle E2E-erzeugten Parcours + Trainings
 * (Name beginnt mit "E2E " oder discipline=='3d_ifaa_hunter'/etc. mit Notes='E2E training-flow')
 */
import { chromium, devices } from 'playwright';

const BASE_URL  = process.env.E2E_BASE_URL ?? 'https://archerries.mossig.de';
const TEST_EMAIL = process.env.E2E_EMAIL    ?? 'claude-test@archerries.local';
const TEST_PASS  = process.env.E2E_PASS     ?? 'ClaudeTest_2026!';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'] , serviceWorkers: "block" });
const page = await ctx.newPage();

await page.goto(`${BASE_URL}/login`);
await page.fill('input[type="email"]', TEST_EMAIL);
await page.fill('input[type="password"]', TEST_PASS);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }),
  page.evaluate(() => document.querySelector('form')?.requestSubmit()),
]);

// Liste Parcours, lösche alle mit Name-Präfix "E2E "
const parcours = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const r = await fetch('/api/index.php/parcours', { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
});
const targets = (parcours.parcours ?? []).filter((p) => /^E2E /.test(p.name ?? ''));
console.log(`Parcours zum Löschen: ${targets.length}`);
for (const p of targets) {
  const status = await page.evaluate(async (id) => {
    const token = localStorage.getItem('archerries.token');
    const r = await fetch(`/api/index.php/parcours/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return r.status;
  }, p.id);
  console.log(`  parcours #${p.id} "${p.name}" → ${status}`);
}

// Liste Trainings, lösche alle E2E
const trainings = await page.evaluate(async () => {
  const token = localStorage.getItem('archerries.token');
  const r = await fetch('/api/index.php/trainings?limit=100', { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
});
const tTargets = (trainings.trainings ?? []);
console.log(`Trainings zum Löschen: ${tTargets.length}`);
for (const t of tTargets) {
  const status = await page.evaluate(async (id) => {
    const token = localStorage.getItem('archerries.token');
    const r = await fetch(`/api/index.php/trainings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return r.status;
  }, t.id);
  console.log(`  training #${t.id} ${t.discipline} → ${status}`);
}

await browser.close();
console.log('\n✓ Cleanup fertig');
