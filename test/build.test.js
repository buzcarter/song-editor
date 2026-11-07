'use strict';
/**
 * The build output: run `npm run build` first (npm test does not build).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DIST } = require('./helpers');

const exists = (file) => fs.existsSync(path.join(DIST, file));

test('dist has the bundle, CSS, markup and images', () => {
  for (const file of [
    'js/ugsEditorPlus.merged.js',
    'js/ugsEditorPlus.min.js',
    'markup.js',
    'markup.d.ts',
    'ugsEditorPlus.d.ts',
    'css/ugsEditorPlus.merged.css',
    'css/ugsEditorPlus.min.css',
    'css/ugsEditorPlus.print.css',
    'img/editor/busy.gif',
    'img/editor/editorSprite.png',
    'img/editor/hand-cursor.png',
  ]) {
    assert.ok(exists(file), `${file} built`);
  }
});

test('every image the CSS points at is in dist/img/editor', () => {
  const css = fs.readFileSync(path.join(DIST, 'css/ugsEditorPlus.merged.css'), 'utf8');
  const urls = [...css.matchAll(/url\("?(\.\.\/img\/editor\/[^")]+)"?\)/g)].map((m) => m[1]);
  assert.ok(urls.length > 5);
  for (const url of urls) {
    assert.ok(fs.existsSync(path.join(DIST, 'css', url)), `${url} exists`);
  }
});

test('the bundle leaves out the Songbook-only song list code', () => {
  const js = fs.readFileSync(path.join(DIST, 'js/ugsEditorPlus.merged.js'), 'utf8');
  assert.ok(!js.includes('ugsEditorPlus.typeahead ='), 'no typeahead');
  assert.ok(!js.includes('ugsEditorPlus.newSong ='), 'no newSong');
  assert.ok(!js.includes('/ajaxupdatesong'), 'no hard-coded save URL');
  assert.match(js, /^\/\*\*[\s\S]*?Song-a-matic Editor/, 'keeps the license header');
});

test('package.json exports point at built files', () => {
  const pkg = require('../package.json');
  // an export is a path, or { types, default } paths
  const targets = Object.values(pkg.exports).flatMap((t) => (typeof t === 'string' ? [t] : Object.values(t)));
  for (const target of [...targets, pkg.main, pkg.types]) {
    if (!target.includes('*')) {
      assert.ok(fs.existsSync(path.join(DIST, '..', target)), `${target} exists`);
    }
  }
});
