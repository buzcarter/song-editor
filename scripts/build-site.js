#!/usr/bin/env node
/**
 * Builds the demo site for GitHub Pages into .site/ (run `npm run build` first):
 * the layout in scripts/site.js, as static files.
 *
 *   npm run build:site
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { ROOT, MOUNTS, songList } = require('./site');

const OUT = path.join(ROOT, '.site');

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
    .sort();
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  let count = 0;
  for (const [prefix, dir, only] of MOUNTS) {
    for (const file of only || (await listFiles(dir))) {
      const to = path.join(OUT, prefix, file);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(path.join(dir, file), to);
      count++;
    }
  }
  await fs.writeFile(path.join(OUT, 'songs.json'), JSON.stringify(await songList()));
  // serve files as-is (no Jekyll processing)
  await fs.writeFile(path.join(OUT, '.nojekyll'), '');
  console.log(`.site/: ${count + 1} files`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
