// Static integrity checks for the OptiSky site. Runs in CI and as the Vercel
// build step, so a broken asset path, anchor, or contact link fails the deploy.
// No dependencies: uses regex extraction suited to this hand-written markup.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const PHONE_HREF = 'tel:+19728482022';
const PHONE_TEXT = '(972) 848-2022';
const LISTINGS_URL = 'https://www.controller.com/listings/for-sale/optisky/aircraft/?AccountCRMID=614910';
const MAX_ASSET_BYTES = 400 * 1024;

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

const localPath = (ref) => {
  const clean = ref.split(/[?#]/)[0];
  return join(pub, clean.startsWith('/') ? clean.slice(1) : clean);
};

const assertLocal = (file, ref) => {
  if (!ref || /^(https?:|tel:|mailto:|data:|#)/.test(ref)) return;
  const p = localPath(ref);
  if (ref === '/' || ref === '') return;
  if (!existsSync(p) || !statSync(p).isFile()) fail(file, `missing local file for "${ref}"`);
};

const attrs = (html, name) =>
  [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]);

function checkHtml(file) {
  const html = readFileSync(join(pub, file), 'utf8');

  if (!/<html lang="en">/.test(html)) fail(file, 'missing <html lang="en">');
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(file, 'missing descriptive <title>');
  if (!/name="viewport"/.test(html)) fail(file, 'missing viewport meta');

  for (const ref of [...attrs(html, 'src'), ...attrs(html, 'href')]) assertLocal(file, ref);
  for (const set of [...attrs(html, 'srcset'), ...attrs(html, 'imagesrcset')]) {
    for (const part of set.split(',')) assertLocal(file, part.trim().split(/\s+/)[0]);
  }

  // In-page anchors resolve.
  const ids = new Set(attrs(html, 'id'));
  for (const href of attrs(html, 'href')) {
    if (href.startsWith('#') && href.length > 1 && !ids.has(href.slice(1))) {
      fail(file, `anchor ${href} has no matching id`);
    }
  }
  const dupes = attrs(html, 'id').filter((id, i, all) => all.indexOf(id) !== i);
  if (dupes.length) fail(file, `duplicate ids: ${[...new Set(dupes)].join(', ')}`);

  // Every image has alt text (empty alt only for decorative images).
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\salt="/.test(tag)) fail(file, `img without alt: ${tag.slice(0, 80)}`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) fail(file, `img without intrinsic size: ${tag.slice(0, 80)}`);
  }

  // Phone links use the verified number only.
  for (const href of attrs(html, 'href').filter((h) => h.startsWith('tel:'))) {
    if (href !== PHONE_HREF) fail(file, `unexpected phone link ${href}`);
  }
  const phoneDigits = [...html.matchAll(/\(\d{3}\)\s?\d{3}-\d{4}/g)].map((m) => m[0]);
  for (const p of phoneDigits) if (p !== PHONE_TEXT) fail(file, `unexpected phone number text ${p}`);

  // Arrows like ↗ render as colour emoji on iOS; use the inline SVG icon instead.
  const emojiProne = html.match(/[\u2196-\u2199\u2194\u2195\u21A9\u21AA\u2934\u2935\u27A1\u2B05-\u2B07]/g);
  if (emojiProne) fail(file, `emoji-prone arrow character(s): ${[...new Set(emojiProne)].join(' ')}`);

  // External links open safely.
  for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? []) {
    if (!/rel="[^"]*noopener/.test(tag)) fail(file, `target=_blank without rel=noopener: ${tag.slice(0, 80)}`);
  }
  for (const href of attrs(html, 'href').filter((h) => h.includes('controller.com'))) {
    if (href !== LISTINGS_URL) fail(file, `unexpected listings URL ${href}`);
  }

  // CSP compatibility: no inline styles or executable inline scripts.
  if (/\sstyle="/.test(html)) fail(file, 'inline style attribute (blocked by CSP)');
  if (/\son[a-z]+="/.test(html)) fail(file, 'inline event handler (blocked by CSP)');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, a, body] = m;
    if (/type="application\/ld\+json"/.test(a)) {
      try { JSON.parse(body); } catch (e) { fail(file, `invalid JSON-LD: ${e.message}`); }
    } else if (!/\ssrc="/.test(a)) {
      fail(file, 'inline executable script (blocked by CSP)');
    }
  }

  // Heading outline: one h1 and no skipped levels.
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  if (levels.filter((l) => l === 1).length !== 1) fail(file, 'expected exactly one <h1>');
  levels.reduce((prev, l) => {
    if (l > prev + 1) fail(file, `heading level jumps from h${prev} to h${l}`);
    return l;
  }, 1);

  return html;
}

const index = checkHtml('index.html');
checkHtml('404.html');

for (const needed of ['#about', '#expertise', '#approach', '#aircraft', '#contact']) {
  if (!index.includes(`id="${needed.slice(1)}"`)) fail('index.html', `missing section ${needed}`);
}
if (!index.includes(LISTINGS_URL)) fail('index.html', 'aircraft listings link missing');

// Social previews need absolute image URLs, or iMessage/LinkedIn/Facebook show none.
for (const m of index.matchAll(/<meta (?:property|name)="(og:image|twitter:image|og:url)" content="([^"]*)"/g)) {
  if (!m[2].startsWith('https://')) fail('index.html', `${m[1]} must be an absolute https URL`);
  else if (m[1] !== 'og:url') assertLocal('index.html', new URL(m[2]).pathname);
}
if (!/property="og:image" content="https:/.test(index)) fail('index.html', 'og:image missing or not absolute');

// CSS url() references resolve.
const css = readFileSync(join(pub, 'styles.css'), 'utf8');
for (const m of css.matchAll(/url\("?([^")]+)"?\)/g)) assertLocal('styles.css', m[1]);

// Manifest icons resolve.
const manifest = JSON.parse(readFileSync(join(pub, 'site.webmanifest'), 'utf8'));
for (const icon of manifest.icons) assertLocal('site.webmanifest', icon.src);

// vercel.json parses and serves the public directory.
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
if (vercel.outputDirectory !== 'public') fail('vercel.json', 'outputDirectory must be "public"');

// Keep shipped images lean (the original hero PNG was 1.7 MB).
for (const ref of [...attrs(index, 'src'), ...attrs(index, 'srcset')]) {
  const p = localPath(ref.split(/\s/)[0]);
  if (existsSync(p) && statSync(p).size > MAX_ASSET_BYTES) fail('index.html', `asset over ${MAX_ASSET_BYTES / 1024} KB: ${ref}`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log('✓ OptiSky static checks passed');
