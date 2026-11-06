#!/usr/bin/env node
/**
 * Builds the Song-a-Matic editor into dist/:
 *
 *   src/js/**                          -> dist/js/ugsEditorPlus.merged.js + .min.js (browser bundle)
 *   src/markup.js                      -> dist/markup.js (Node; also inside the bundle)
 *   src/less/ugsEditorPlus_merged.less -> dist/css/ugsEditorPlus.merged.css + .min.css
 *   src/css/ugsEditorPlus.print.css    -> dist/css/ (hand-written, copied)
 *   img/editor/*                       -> dist/img/editor/
 *
 * dist/ is laid out like a host page (js/ css/ img/): the CSS points at the images with
 * "../img/editor/", and mount() looks for them at "../img/editor/" from the bundle's folder.
 *
 * Usage: node scripts/build.js [js|css|img]   (no argument builds everything)
 *
 * File ORDER matters: each file assumes the ones before it already exist
 * (namespace first). Keep the list in sync when adding source files.
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const BUNDLE = {
  name: 'ugsEditorPlus',
  dir: 'src/js',
  files: [
    'editor/ugsEditorPlus.namespace.js',
    'editor/ugsEditorPlus.dom.js',

    'editor/ugsEditorPlus.options.js',
    'editor/ugsEditorPlus.actions.js',
    'editor/ugsEditorPlus.songUi.js',
    'editor/ugsEditorPlus.styles.js',
    'editor/ugsEditorPlus.themes.js',
    'editor/ugsEditorPlus.optionsDlg.js',
    'editor/ugsEditorPlus.reformat.js',
    'editor/ugsEditorPlus.autoReformat.js',
    'editor/ugsEditorPlus.topMenus.js',
    'editor/ugsEditorPlus.submenuUi.js',
    'editor/ugsEditorPlus.updateSong.js',
    'editor/ugsEditorPlus.aceHelp.js',
    'editor/ugsEditorPlus.resize.js',
    'editor/ugsEditorPlus.chordBuilder.js',
    '../markup.js',
    'editor/ugsEditorPlus.songAmatic.js',
    'mount.js',
    'editor/ugsChordBuilder.js',
    'editor/ugsChordBuilder.chooserList.js',
    'editor/ugsChordBuilder.editorUi.js',
    // used by ugsEditorPlus.resize to load the ACE editor on demand ("Fullscreen" button)
    'libs/lazyload.js',
  ],
};

const LESS_ENTRY = 'src/less/ugsEditorPlus_merged.less';
const COPIES = {
  js: [['src/markup.js', 'markup.js']],
  css: [['src/css/ugsEditorPlus.print.css', 'css/ugsEditorPlus.print.css']],
};
const IMG_DIR = 'img/editor';

const rel = (p) => path.relative(ROOT, p);

const write = async (file, content) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  console.log(`  ${rel(file)} (${Buffer.byteLength(content)} bytes)`);
};

const copy = async (from, to) => {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
  console.log(`  ${rel(to)}`);
};

async function buildJs() {
  const { minify } = require('terser');
  const { name, dir, files } = BUNDLE;

  const sources = await Promise.all(files.map((f) => fs.readFile(path.join(ROOT, dir, f), 'utf8')));

  // Normalize line endings; a leading ";" guards against a file missing its trailing semicolon.
  const merged = sources.map((s) => s.replace(/\r\n?/g, '\n').trimEnd()).join('\n;') + '\n';

  // Keep the project's license/header block (first doc comment of the namespace file).
  const banner = (sources[0].match(/^\s*(\/\*\*[\s\S]*?\*\/)/) || [])[1] || '';

  const result = await minify(merged, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false, preamble: banner },
  });

  await write(path.join(DIST, `js/${name}.merged.js`), merged);
  await write(path.join(DIST, `js/${name}.min.js`), result.code + '\n');
  for (const [from, to] of COPIES.js) {
    await copy(path.join(ROOT, from), path.join(DIST, to));
  }
}

async function buildCss() {
  const less = require('less');
  const entry = path.join(ROOT, LESS_ENTRY);
  const input = await fs.readFile(entry, 'utf8');
  const opts = { filename: entry, paths: [path.dirname(entry)] };

  const full = await less.render(input, opts);
  const min = await less.render(input, { ...opts, compress: true });

  await write(path.join(DIST, 'css/ugsEditorPlus.merged.css'), full.css);
  await write(path.join(DIST, 'css/ugsEditorPlus.min.css'), min.css + '\n');
  for (const [from, to] of COPIES.css) {
    await copy(path.join(ROOT, from), path.join(DIST, to));
  }
}

async function copyImages() {
  const files = (await fs.readdir(path.join(ROOT, IMG_DIR))).filter((f) => !f.startsWith('.'));
  for (const file of files.sort()) {
    await copy(path.join(ROOT, IMG_DIR, file), path.join(DIST, IMG_DIR, file));
  }
}

const TARGETS = { js: buildJs, css: buildCss, img: copyImages };

async function main() {
  const target = process.argv[2];
  if (target && !TARGETS[target]) {
    console.error('usage: node scripts/build.js [js|css|img]');
    process.exit(2);
  }
  if (!target) {
    await fs.rm(DIST, { recursive: true, force: true });
  }
  for (const [name, build] of Object.entries(TARGETS)) {
    if (!target || target === name) {
      console.log(`Building ${name}...`);
      await build();
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
