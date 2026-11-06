'use strict';
/**
 * The demo site's layout, shared by the local demo server (scripts/demo.js) and
 * the GitHub Pages build (scripts/build-site.js):
 *
 *   /                      demo/ (the page, its own CSS, the sample songs)
 *   /songs.json            the list of sample songs (generated)
 *   /dist/                 this package's build
 *   /vendor/song-formatter/  @ukegeeks/song-formatter's dist/ (peer dependency)
 *   /vendor/ace/           @ukegeeks/ace-chordpro-extension's dist/ (peer dependency)
 */
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pkgDist = (pkg) => path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'dist');

// [URL prefix, folder on disk, files the published site needs (all when omitted)]
const MOUNTS = [
  ['dist/', path.join(ROOT, 'dist')],
  ['vendor/song-formatter/', pkgDist('@ukegeeks/song-formatter'), ['song-formatter.bundle.js', 'song-formatter.bundle.js.LICENSE.txt', 'css/ukeGeeks.music.css']],
  ['vendor/ace/', pkgDist('@ukegeeks/ace-chordpro-extension'), ['ace-chordpro.min.js']],
  ['', path.join(ROOT, 'demo')],
];

const SONGS = path.join(ROOT, 'demo/songs');

async function songList() {
  const files = (await fs.readdir(SONGS)).filter((f) => f.endsWith('.txt'));
  return files.sort((a, b) => a.localeCompare(b)).map((file) => ({
    file,
    name: file.replace(/\.cpm\.txt$|\.txt$/, ''),
  }));
}

module.exports = { ROOT, MOUNTS, songList };
