#!/usr/bin/env node
/**
 * Static server for the production build that behaves like Cloudflare Pages:
 * applies public/_headers (including COOP/COEP) and the SPA fallback from
 * public/_redirects, so browser tests see crossOriginIsolated === true.
 *
 * Usage: node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);

if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

/** Parse `public/_headers` into [{ pattern, headers }]. */
function parseHeaders() {
  const file = join(root, '_headers');
  if (!existsSync(file)) return [];
  const blocks = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      current = { pattern: line.trim(), headers: {} };
      blocks.push(current);
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    current.headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return blocks;
}

const headerBlocks = parseHeaders();

const matchHeader = (pathname) =>
  headerBlocks.find((b) => {
    if (b.pattern === '/*') return true;
    if (b.pattern.endsWith('/*')) return pathname.startsWith(b.pattern.slice(0, -1));
    return b.pattern === pathname;
  });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/vnd.microsoft.icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const candidate = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  const isFile = existsSync(candidate) && statSync(candidate).isFile();
  // _headers / _redirects are configuration, not public files (Pages does not serve them).
  const isConfig = pathname === '/_headers' || pathname === '/_redirects';
  const file = isFile && !isConfig ? candidate : join(root, 'index.html');

  const applied = matchHeader(pathname);
  const headers = {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    ...(applied ? applied.headers : {}),
  };
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`serving dist on http://0.0.0.0:${port} (COOP/COEP + SPA fallback)`);
});
