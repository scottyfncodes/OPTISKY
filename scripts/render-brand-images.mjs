// Regenerates the raster brand images (favicons and social preview) from the
// supplied OptiSky artwork. Run with `npm run brand-images` while `npm run serve`
// is running; outputs are committed so the site needs no build step.

import { chromium } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const base = process.env.BASE_URL ?? 'http://localhost:4173';

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-512.png', 512]]) {
  await page.setViewportSize({ width: size, height: size });
  // Apple applies its own corner mask, so the touch icon is rendered square.
  const radius = name === 'apple-touch-icon.png' ? 0 : 1;
  await page.goto(`${base}/favicon.svg`);
  await page.evaluate((r) => {
    const svg = document.querySelector('svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    if (!r) svg.querySelector('rect').setAttribute('rx', '0');
    document.documentElement.style.cssText = 'margin:0;width:100vw;height:100vh';
  }, radius);
  await page.screenshot({ path: join(pub, name), omitBackground: true });
}

await page.setViewportSize({ width: 1200, height: 630 });
const ogHtml = `<!doctype html><html><head><base href="${base}/"><link rel="stylesheet" href="styles.css"><style>
  body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:#041326}
  img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:70% 55%}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,19,38,.95) 0%,rgba(4,19,38,.8) 38%,rgba(4,19,38,.1) 78%)}
  .copy{position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:#fff}
  .logo{width:330px;margin-bottom:56px}
  h1{font:500 64px/1.04 Montserrat;letter-spacing:-.045em;margin:0;max-width:9.5ch}
  h1 em{color:#c9a96b;font-style:normal}
  p{margin:28px 0 0;font:600 15px/1 Montserrat;letter-spacing:.2em;text-transform:uppercase;color:#c9a96b}
</style></head><body>
  <img class="bg" src="assets/img/hero-aircraft-1672.webp" alt="">
  <div class="shade"></div>
  <div class="copy">
    <img class="logo" src="assets/optisky-horizontal-white.svg" alt="">
    <h1>Expert guidance for every mile <em>ahead.</em></h1>
    <p>Addison, Texas · (972) 848-2022</p>
  </div>
</body></html>`;
// Serve the composition from the site origin so assets and fonts load.
await page.route(`${base}/__og`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: ogHtml }));
await page.goto(`${base}/__og`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(pub, 'og-image.jpg'), type: 'jpeg', quality: 86 });

await browser.close();
console.log('Brand images written to public/');
