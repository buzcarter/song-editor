#!/usr/bin/env node
/**
 * Serves the editor demo: http://localhost:8098/
 *
 *   npm run demo                # builds dist/, then serves
 *   PORT=9000 node scripts/demo.js
 *
 * Serves this repo's folder read-only (so the page can load dist/ and the peer
 * packages from node_modules/), plus /demo/songs.json, the list of sample songs.
 * Local only: binds to 127.0.0.1. No dependencies.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SONGS = path.join(ROOT, 'demo/songs');
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

async function songList() {
  const files = (await fs.readdir(SONGS)).filter((f) => f.endsWith('.txt'));
  return files.sort((a, b) => a.localeCompare(b)).map((file) => ({
    file,
    name: file.replace(/\.cpm\.txt$|\.txt$/, ''),
  }));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') {
    res.writeHead(302, { Location: '/demo/' });
    return res.end();
  }
  if (pathname === '/demo/songs.json') {
    return send(res, 200, JSON.stringify(await songList()), TYPES['.json']);
  }
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT + path.sep) || pathname.split('/').some((part) => part.startsWith('.'))) {
    return send(res, 404, 'Not found');
  }
  try {
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
  console.log(`Song-a-Matic demo: http://localhost:${server.address().port}/demo/`);
});
