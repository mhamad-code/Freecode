/** Static preview server that runs inside the WebContainer on port 5173. */

export const PREVIEW_PORT = 5173;
export const PREVIEW_SCRIPT = '.freecode/preview-server.cjs';

const MIME = `{
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/vnd.microsoft.icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
}`;

/**
 * CommonJS on purpose: it is written into the container and run with `node`,
 * so it must not depend on the project's own package.json "type".
 */
export function previewServerSource(port: number = PREVIEW_PORT): string {
  return `'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TYPES = ${MIME};

function listing(prefix) {
  let entries = [];
  try {
    entries = fs.readdirSync(path.join(ROOT, prefix)).sort();
  } catch (error) {
    entries = [];
  }
  const rows = entries
    .filter(function (name) { return name !== '.freecode' && name !== 'node_modules'; })
    .map(function (name) {
      const href = (prefix ? prefix.replace(/\\/$/, '') + '/' : '/') + encodeURIComponent(name);
      return '<li><a href="' + href + '">' + name + '</a></li>';
    })
    .join('');
  return '<!doctype html><meta charset="utf-8"><title>Freecode preview</title>' +
    '<style>body{font:15px system-ui;margin:40px;line-height:1.6}code{background:#f3f3f1;padding:2px 5px;border-radius:4px}</style>' +
    '<h1>Preview</h1><p>Nothing is served at <code>' + (prefix || '/') + '</code> yet, so this is the project listing.</p>' +
    '<p>Add an <code>index.html</code> (or run your own dev server) to see the app here.</p><ul>' + rows + '</ul>';
}

const server = http.createServer(function (req, res) {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (error) {
    pathname = '/';
  }
  const target = path.join(ROOT, path.normalize(pathname).replace(/^(\\.\\.[\\/\\\\])+/, ''));
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  let file = target;
  try {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  } catch (error) {
    // keep the original path
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const index = path.join(ROOT, 'index.html');
    if (fs.existsSync(index) && fs.statSync(index).isFile()) {
      file = index;
    } else {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(listing(pathname === '/' ? '' : pathname));
      return;
    }
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(${port}, function () {
  console.log('preview server listening on ${port}');
});
`;
}
