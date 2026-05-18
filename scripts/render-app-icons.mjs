/**
 * Rendert src/assets/appIcon.svg in die für PWA + Browser nötigen PNG-Größen.
 * Nutzt Playwright (chromium) — kein zusätzliches Sharp/ImageMagick nötig.
 *
 * Output:
 *   public/favicon-32x32.png         (32×32)
 *   public/apple-touch-icon.png      (180×180)
 *   public/pwa-192x192.png           (192×192)
 *   public/pwa-512x512.png           (512×512)
 *   public/pwa-maskable-512x512.png  (512×512 mit Safe-Zone-Padding ~20%)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'src/assets/appIcon.svg');
const svgText = readFileSync(svgPath, 'utf-8');

const browser = await chromium.launch({ headless: true });

async function render(size, outPath, { maskablePadding = 0 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  // Maskable: 20% Safe-Zone-Padding (PWA-Spezifikation) — Icon nimmt nur ~80% ein,
  // der äußere Rand wird vom OS abgerundet/zugeschnitten.
  const inner = maskablePadding > 0 ? `${100 - 2 * maskablePadding}%` : '100%';
  const offset = maskablePadding > 0 ? `${maskablePadding}%` : '0';
  const html = `<!DOCTYPE html>
<html><head><style>
  html,body { margin:0; padding:0; width:${size}px; height:${size}px; background:#ececec; }
  .wrap { position:absolute; left:${offset}; top:${offset}; width:${inner}; height:${inner}; }
  .wrap > svg { width:100%; height:100%; display:block; }
</style></head>
<body><div class="wrap">${svgText}</div></body></html>`;
  await page.setContent(html);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: outPath, omitBackground: false });
  await ctx.close();
  console.log(`  ✓ ${path.relative(root, outPath)} (${size}×${size})`);
}

await render(32,  path.join(root, 'public/favicon-32x32.png'));
await render(180, path.join(root, 'public/apple-touch-icon.png'));
await render(192, path.join(root, 'public/pwa-192x192.png'));
await render(512, path.join(root, 'public/pwa-512x512.png'));
await render(512, path.join(root, 'public/pwa-maskable-512x512.png'), { maskablePadding: 12 });

await browser.close();
console.log('\nFertig. Build + Deploy nutzen die neuen Icons automatisch.');
