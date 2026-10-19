# OptiSky website

Marketing site for **OptiSky, LLC** — aircraft acquisition and sales, aircraft management, and aviation insurance support through OptiSurance. Built and maintained by HaveAnApp.

It is a static, single-page site: plain HTML, CSS, and a small script. There is no framework, backend, database, form handler, or third-party tracking.

## Structure

```
public/                 Everything that is deployed
  index.html            The page
  styles.css            All styles (tokens at the top)
  script.js             Mobile menu, header state, footer year
  404.html              Branded not-found page
  assets/               Logo SVGs, hero images, self-hosted fonts (OFL)
  optisky.vcf           "Save contact" card
  og-image.jpg, favicon.svg, *.png, site.webmanifest, robots.txt
scripts/
  check.mjs             Static integrity checks (also the Vercel build step)
  serve.mjs             Local server that mirrors vercel.json headers
  render-brand-images.mjs  Regenerates favicons and the social image
tests/site.spec.js      Playwright tests (desktop + iPhone)
vercel.json             Output dir, clean URLs, security and cache headers
```

## Working locally

```sh
npm ci
npm run serve        # http://localhost:4173
npm run check        # static checks: assets, anchors, phone/listing links, CSP safety
npm test             # Playwright (starts the local server automatically)
BASE_URL=https://<deployment> npm test   # run the same tests against a deployment
```

## Verified business details

These come from the client's supplied site package and were cross-checked against OptiSky's public Controller.com listings. Change them only with client confirmation; `scripts/check.mjs` fails the build if a different number or listings URL appears.

| Detail | Value |
| --- | --- |
| Phone | (972) 848-2022 → `tel:+19728482022` |
| Location | Addison, Texas |
| Aircraft listings | https://www.controller.com/listings/for-sale/optisky/aircraft/?AccountCRMID=614910 |

## Assets

- `optisky-horizontal-white.svg` and `optisky-wing.svg` are the supplied artwork. Only their `viewBox` was tightened to remove built-in padding, so the logo sizes correctly; the vector paths are unchanged.
- The hero is the supplied `hero-aircraft.png` (1.7 MB) re-encoded as WebP at 800/1200/1672 px plus a JPEG fallback.
- DM Sans and Montserrat are self-hosted variable fonts under the SIL Open Font License (licences in `public/assets/fonts/`).

## Deployment

Vercel project `optisky` (team HaveAnApp), linked to this repository. Pull requests get Preview deployments; merges to `main` deploy to Production. No environment variables are required.

### Connecting the custom domain

No canonical URL or sitemap is set yet because the production domain has not been confirmed. Once the client confirms the domain and DNS access:

1. Add the domain to the Vercel project and follow its DNS instructions.
2. Add `<link rel="canonical" href="https://<domain>/">` and absolute `og:image`/`og:url` values in `public/index.html`.
3. Add `Sitemap: https://<domain>/sitemap.xml` to `robots.txt` with a one-URL `sitemap.xml`.
