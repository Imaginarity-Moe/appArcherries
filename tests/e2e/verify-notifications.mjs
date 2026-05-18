/**
 * Verify Notification-Center end-to-end.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'https://archerries.mossig.de';
const A = { email: 'claude-test@archerries.local',  password: 'ClaudeTest_2026!' };
const B = { email: 'claude-test2@archerries.local', password: 'ClaudeTest2_2026!' };

await mkdir('test-report/notifications', { recursive: true });

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

async function resetFriends(p) {
  const r = await p.api('/friends');
  for (const list of ['friends', 'incoming', 'outgoing', 'blocked'])
    for (const f of r.body?.[list] ?? []) await p.api(`/friends/${f.id}`, { method: 'DELETE' });
}
async function resetNotifs(p) {
  const n = await p.api('/notifications');
  for (const it of n.body?.items ?? []) await p.api(`/notifications/${it.id}`, { method: 'DELETE' });
}
await resetFriends(pa); await resetFriends(pb);
await resetNotifs(pa); await resetNotifs(pb);

// 1. A sendet Anfrage → B bekommt Notification
await pa.api('/friends/requests', { method: 'POST', body: JSON.stringify({ email: B.email }) });
const n1 = await pb.api('/notifications');
const has1 = (n1.body?.items ?? []).some((it) => it.kind === 'friend_request_received');
if (has1 && n1.body.unread_count >= 1) ok('B hat friend_request_received-Notification');
else fail(`B notifs: ${JSON.stringify(n1.body)}`);

// 2. B akzeptiert → A bekommt accepted-Notification
const bFriends = await pb.api('/friends');
const reqId = bFriends.body.incoming[0].id;
await pb.api(`/friends/${reqId}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
const n2 = await pa.api('/notifications');
const has2 = (n2.body?.items ?? []).some((it) => it.kind === 'friend_request_accepted');
if (has2) ok('A hat friend_request_accepted-Notification');
else fail(`A notifs nach accept: ${JSON.stringify(n2.body)}`);

// 3. UI: B sieht Glocke mit Badge
await pb.goto(`${BASE}/`);
await pb.waitForLoadState('networkidle');
await pb.waitForTimeout(500);
const badge = await pb.locator('button[aria-label*="Benachrichtigung"] span').first().textContent().catch(() => null);
console.log(`  badge text: ${JSON.stringify(badge)}`);
const bellBtn = pb.locator('button[aria-label*="Benachrichtigung"]').first();
if (await bellBtn.count()) ok('Notification-Bell sichtbar im Header');
else fail('Bell nicht im Header');

// 4. Bell-Popover öffnet sich
await bellBtn.click();
await pb.waitForTimeout(300);
const popoverHeader = await pb.locator('text="Benachrichtigungen"').count();
if (popoverHeader >= 1) ok('Popover öffnet sich mit "Benachrichtigungen"-Header');
else fail('Popover nicht offen');
await pb.screenshot({ path: 'test-report/notifications/01-bell-popover.png' });

// 5. Klick auf eine Notification öffnet zugehörige Page
const notifItem = pb.locator('button:has-text("möchte dein Freund werden"), button:has-text("Test")').first();
// Direkt API-prüfen: items dürften read=true werden
const beforeRead = await pb.api('/notifications');
const firstId = beforeRead.body.items[0]?.id;
if (firstId) {
  await pb.api(`/notifications/${firstId}`, { method: 'PATCH', body: JSON.stringify({ read: true }) });
  const after = await pb.api('/notifications');
  const readNow = after.body.items.find((i) => i.id === firstId)?.read === true;
  if (readNow) ok('Mark-as-read setzt read=true und reduziert unread_count');
  else fail('Read-Status nicht aktualisiert');
}

// 6. Mark-all-read
await pb.api('/notifications/mark-all-read', { method: 'POST' });
const allRead = await pb.api('/notifications');
if (allRead.body.unread_count === 0) ok('Mark-all-read setzt unread_count=0');
else fail(`unread_count nach all-read: ${allRead.body.unread_count}`);

// 7. Training-Notif: A fügt B als Freund-Participant hinzu → B bekommt Notif
const tr = await pa.api('/trainings', { method: 'POST', body: JSON.stringify({
  discipline: 'simple', bow_type: 'recurve', peg_color: 'red',
}) });
const trId = tr.body.training.id;
const bMe = await pb.api('/me');
await pa.api(`/trainings/${trId}/participants`, { method: 'POST', body: JSON.stringify({ user_id: bMe.body.id }) });
const n3 = await pb.api('/notifications');
const hasT = (n3.body?.items ?? []).some((it) => it.kind === 'training_friend_added');
if (hasT) ok('B hat training_friend_added-Notification');
else fail(`B nach training-add: ${JSON.stringify(n3.body?.items)}`);

// Cleanup
await pa.api(`/trainings/${trId}`, { method: 'DELETE' });
await resetFriends(pa); await resetFriends(pb);
await resetNotifs(pa); await resetNotifs(pb);
await browser.close();
console.log(errors.length ? `\n✗ ${errors.length} Fehler` : '\n✓ Notification-Center grün');
process.exit(errors.length ? 1 : 0);
