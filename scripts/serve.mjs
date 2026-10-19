// Minimal local server that mirrors the Vercel config closely enough for
// testing: serves public/, applies vercel.json headers (including the CSP),
// supports clean URLs, and returns 404.html for unknown paths.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const port = Number(process.env.PORT ?? 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.vcf': 'text/vcard; charset=utf-8',
  '.xml': 'application/xml',
};

const rules = config.headers.map((h) => ({
  re: new RegExp(`^${h.source.replace(/\(\.\*\)/g, '(.*)')}$`),
  headers: h.headers,
}));

const resolve = (pathname) => {
  const candidates = pathname.endsWith('/')
    ? [join(pub, pathname, 'index.html')]
    : [join(pub, pathname), join(pub, `${pathname}.html`)];
  return candidates.find((p) => p.startsWith(pub) && existsSync(p) && statSync(p).isFile());
};

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const decoded = decodeURIComponent(pathname);
  const file = resolve(decoded);
  const status = file ? 200 : 404;
  const target = file ?? join(pub, '404.html');

  res.setHeader('Content-Type', types[extname(target)] ?? 'application/octet-stream');
  for (const rule of rules) {
    if (!rule.re.test(decoded)) continue;
    for (const { key, value } of rule.headers) {
      // Local server is plain HTTP, so drop the HTTPS-only directives.
      if (key === 'Strict-Transport-Security') continue;
      res.setHeader(key, key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value);
    }
  }
  res.writeHead(status);
  res.end(req.method === 'HEAD' ? undefined : readFileSync(target));
}).listen(port, () => console.log(`OptiSky site at http://localhost:${port}`));
