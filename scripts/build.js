#!/usr/bin/env node
/**
 * Builds the Song-a-Matic editor into dist/:
 *
 *   src/js/**                          -> dist/js/ugsEditorPlus.merged.js + .min.js (browser bundle)
 *   src/markup.ts                      -> dist/markup.js (Node; also inside the bundle)
 *   src/types/ugsEditorPlus.d.ts       -> dist/ugsEditorPlus.d.ts, dist/markup.d.ts (type declarations)
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
 *
 * The sources are plain scripts (no import/export) sharing one global scope, written in
 * TypeScript or JavaScript. List them without an extension: "x" is x.ts, or else x.js.
 * TypeScript files only lose their types (ts.transpileModule, ES2020: nothing is
 * rewritten for older browsers), then everything is joined and minified as before.
 * `npm run typecheck` checks the types; the build does not.
 */
'use strict';

const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const BUNDLE = {
  name: 'ugsEditorPlus',
  dir: 'src/js',
  files: [
    'editor/namespace',
    'editor/dom',

    'editor/options',
    'editor/actions',
    'editor/songUi',
    'editor/styles',
    'editor/themes',
    'editor/optionsDlg',
    'editor/reformat',
    'editor/autoReformat',
    'editor/topMenus',
    'editor/submenuUi',
    'editor/updateSong',
    'editor/aceHelp',
    'editor/resize',
    'editor/editor.chordBuilder',
    '../markup',
    'editor/songAmatic',
    'mount',
    'editor/chordBuilder',
    'editor/chordBuilder.chooserList',
    'editor/chordBuilder.editorUi',
    // used by ugsEditorPlus.resize to load the ACE editor on demand ("Fullscreen" button)
    'libs/lazyload',
  ],
};

const LESS_ENTRY = 'src/less/ugsEditorPlus_merged.less';
const COPIES = {
  js: [['src/markup', 'markup.js']],
  css: [['src/css/ugsEditorPlus.print.css', 'css/ugsEditorPlus.print.css']],
  // type declarations, hand-written; `npm run typecheck` checks the sources against them
  types: [
    ['src/types/ugsEditorPlus.d.ts', 'ugsEditorPlus.d.ts'],
    ['src/types/markup.d.ts', 'markup.d.ts'],
  ],
};
const IMG_DIR = 'img/editor';

const rel = (p) => path.relative(ROOT, p);

/** "src/js/x" -> the path of x.ts or x.js (exactly one must exist) */
const sourceFile = (name) => {
  const found = ['.ts', '.js'].map((ext) => path.join(ROOT, name + ext)).filter((f) => existsSync(f));
  if (found.length !== 1) {
    throw new Error(`${name}: expected one of .ts or .js, found ${found.length}`);
  }
  return found[0];
};

/** Reads a source file as JavaScript: a .ts file loses its types, nothing else. */
const readSource = async (file) => {
  const text = await fs.readFile(file, 'utf8');
  if (!file.endsWith('.ts')) {
    return text;
  }
  const ts = require('typescript');
  const { outputText, diagnostics } = ts.transpileModule(text, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      // the sources are sloppy-mode scripts; a "use strict" at the top of one would make the whole bundle strict
      alwaysStrict: false,
      removeComments: false,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnostics(diagnostics, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => ROOT, getNewLine: () => '\n' }));
  }
  return outputText;
};

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

  const sources = await Promise.all(files.map((f) => readSource(sourceFile(path.join(dir, f)))));

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
    await write(path.join(DIST, to), await readSource(sourceFile(from)));
  }
  for (const [from, to] of COPIES.types) {
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
