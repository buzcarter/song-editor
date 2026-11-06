#!/usr/bin/env node
/**
 * Serves the editor demo: http://localhost:8098/
 *
 *   npm run demo                # builds dist/, then serves
 *   PORT=9000 node scripts/demo.js
 *
 * Same layout as the published demo site (see scripts/site.js), served straight
 * from dist/, node_modules/ and demo/. Local only: binds to 127.0.0.1. No dependencies.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { MOUNTS, songList } = require('./site');

const PORT = Number(process.env.PORT) || 8098;
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

/** URL path (without the leading "/") -> file on disk, or null */
function resolve(urlPath) {
  if (urlPath.split('/').some((part) => part === '..' || part.startsWith('.'))) {
    return null;
  }
  for (const [prefix, dir] of MOUNTS) {
    if (urlPath.startsWith(prefix)) {
      const file = path.join(dir, urlPath.slice(prefix.length));
      return file.startsWith(dir + path.sep) ? file : null;
    }
  }
  return null;
}

async function handle(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, `http://${HOST}`).pathname).slice(1);

  if (urlPath === 'songs.json') {
    return send(res, 200, JSON.stringify(await songList()), TYPES['.json']);
  }
  if (urlPath === '' || urlPath.endsWith('/')) {
    urlPath += 'index.html';
  }

  const file = resolve(urlPath);
  try {
    if (!file) throw new Error('not found');
    const body = await fs.readFile(file);
    return send(res, 200, body, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  } catch {
    return send(res, 404, 'Not found');
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }
  handle(req, res).catch((err) => send(res, 500, String(err && err.message)));
});

server.listen(PORT, HOST, () => {
  console.log(`Song-a-Matic demo: http://localhost:${server.address().port}/`);
});
