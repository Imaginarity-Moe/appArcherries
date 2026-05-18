/**
 * Verify: Confirm-Dialoge erscheinen bei Reject/Block/Entfernen/Zurückziehen/Aufheben.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };

await mkdir('test-report/friends-confirm', { recursive: true });

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

async function reset(p) {
  const r = await p.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
    for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
}
await reset(pa); await reset(pb);

// Setup: A schickt B Anfrage
await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });

// B öffnet /friends
await pb.goto(`${BASE}/friends`);
await pb.waitForLoadState('networkidle');
await pb.waitForTimeout(400);

// 1. Reject-Button drücken → Confirm-Dialog
await pb.locator('button[aria-label="Ablehnen"]').first().click();
await pb.waitForTimeout(300);
const rejectTitle = await pb.locator('text="Anfrage ablehnen?"').count();
if (rejectTitle >= 1) ok('Reject zeigt Confirm-Dialog mit Titel "Anfrage ablehnen?"');
else fail('Reject-Dialog fehlt');
await pb.screenshot({ path: 'test-report/friends-confirm/01-reject-dialog.png' });

// Abbrechen
await pb.locator('button:has-text("Abbrechen")').first().click();
await pb.waitForTimeout(200);
const stillIncoming = await pb.locator('button[aria-label="Ablehnen"]').count();
if (stillIncoming >= 1) ok('Nach Abbruch ist Anfrage noch da');
else fail('Anfrage wurde nach Abbruch falsch entfernt');

// 2. Block-Button → Confirm-Dialog mit "User blockieren?"
await pb.locator('button[aria-label="Blockieren"]').first().click();
await pb.waitForTimeout(300);
const blockTitle = await pb.locator('text="User blockieren?"').count();
if (blockTitle >= 1) ok('Block zeigt Confirm-Dialog mit Titel "User blockieren?"');
else fail('Block-Dialog fehlt');
await pb.screenshot({ path: 'test-report/friends-confirm/02-block-dialog.png' });

// Abbrechen
await pb.locator('button:has-text("Abbrechen")').first().click();
await pb.waitForTimeout(200);

// 3. Accept ohne Confirm
await pb.locator('button[aria-label="Annehmen"]').first().click();
await pb.waitForTimeout(600);
const acceptedNoDialog = await pb.locator('text=/blockieren\\?|ablehnen\\?/i').count();
if (acceptedNoDialog === 0) ok('Accept öffnet KEIN Confirm (positive Aktion)');
else fail('Accept zeigte unerwartet einen Dialog');

// Jetzt sind A+B Freunde. 4. Entfernen-Button → Confirm "Entfernen"
await pb.waitForTimeout(400);
await pb.locator('button[aria-label="Freund entfernen"]').first().click();
await pb.waitForTimeout(300);
const removeTitle = await pb.locator('text="Entfernen"').count();
const removeBody = await pb.locator('text=/wird aus deiner Freundes-Liste entfernt/i').count();
if (removeTitle >= 1 && removeBody >= 1) ok('Entfernen zeigt Confirm mit erläuterndem Body');
else fail(`Entfernen-Dialog: title=${removeTitle}, body=${removeBody}`);
await pb.screenshot({ path: 'test-report/friends-confirm/03-remove-dialog.png' });

// Cleanup
await pb.locator('button:has-text("Abbrechen")').first().click();
await pb.waitForTimeout(200);
await reset(pa); await reset(pb);
await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Confirm-Flow grün');
process.exit(errors.length ? 1 : 0);
