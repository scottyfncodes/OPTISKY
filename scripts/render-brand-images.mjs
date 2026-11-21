// Regenerates the social preview image (public/og-image.jpg) from the site's own
// fonts, wordmark and photo. Run with `npm run brand-images` while `npm run serve`
// is running; the output is committed so the site needs no build step.
// The app icons live in public/assets/icons and are not rendered here.
// Set CHROMIUM_PATH to use a browser other than Playwright's own.

import { chromium } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const base = process.env.BASE_URL ?? 'http://localhost:4173';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

const ogHtml = `<!doctype html><html><head><base href="${base}/"><link rel="stylesheet" href="styles.css"><style>
  body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:var(--ink)}
  img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:72% 55%}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,28,51,.97) 0%,rgba(7,28,51,.88) 40%,rgba(7,28,51,.15) 80%)}
  .copy{position:absolute;left:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
  .logo{width:300px;height:auto;margin-bottom:64px}
  h1{font:500 76px/1.02 var(--font-serif);letter-spacing:-.01em;color:var(--on-ink);margin:0;max-width:7.4em}
  h1 em{font-style:italic;color:var(--signal-on-ink)}
  .rule{width:56px;height:1px;background:var(--signal-on-ink);margin:40px 0 22px}
  p{margin:0;font:600 17px/1 var(--font-display);letter-spacing:.22em;text-transform:uppercase;color:var(--on-ink-body)}
</style></head><body>
  <img class="bg" src="assets/img/hero-aircraft-1672.webp" alt="">
  <div class="shade"></div>
  <div class="copy">
    <img class="logo" src="assets/brand/logo-light.svg" alt="">
    <h1>Expert guidance for every mile <em>ahead.</em></h1>
    <div class="rule"></div>
    <p>Addison Airport, Texas · (972) 848-2022</p>
  </div>
</body></html>`;

// Serve the composition from the site origin so assets and fonts load.
await page.route(`${base}/__og`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: ogHtml }));
await page.goto(`${base}/__og`, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await Promise.all([
    document.fonts.load('500 76px "Cormorant Garamond"'),
    document.fonts.load('italic 500 76px "Cormorant Garamond"'),
    document.fonts.load('600 17px "Barlow Condensed"'),
  ]);
  await document.fonts.ready;
});
await page.screenshot({ path: join(pub, 'og-image.jpg'), type: 'jpeg', quality: 86 });

await browser.close();
console.log('Social preview written to public/og-image.jpg');
