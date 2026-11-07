'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { editorHtml } = require('../dist/markup.js');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8').replace(/\n$/, '');

// The same model the fixtures were captured with, from the Songbook's server/views.js songEditable()
// (buzcarter/UkeGeeks@8ebc8ba): the markup must not drift from what the Songbook served.
const MODEL = {
  imgUrl: '/img/editor/',
  title: 'Fixture & Friends',
  subtitle: '',
  artist: 'Bette <b>M</b>',
  album: 'Al',
  body: '{title: Fixture & Friends}\n{artist: Bette <b>M</b>}\n[C]Some <script>x</script> say &amp; [G7]love\n',
};

test('matches the Songbook 1.5 editable page, read-only', () => {
  assert.equal(editorHtml({ ...MODEL, canSave: false }), fixture('songbook-1.5-editable.html'));
});

test('matches the Songbook 1.5 editable page, with Save', () => {
  assert.equal(editorHtml({ ...MODEL, canSave: true }), fixture('songbook-1.5-editable-save.html'));
});

test('escapes song text but keeps entities', () => {
  const out = editorHtml({ title: '<i>x</i> "q"', body: 'a < b &amp; c & d' });
  assert.ok(out.includes('&lt;i&gt;x&lt;/i&gt; &quot;q&quot;</h1>'));
  assert.ok(out.includes('<pre>a &lt; b &amp; c &amp; d</pre>'));
  assert.ok(!out.includes('<i>x</i>'));
});

test('defaults: no Save button, relative image folder, empty song', () => {
  const out = editorHtml();
  assert.ok(!out.includes('id="saveBtn"'));
  assert.ok(out.includes('<section id="songSourceDlg" class="overlay isHidden">'));
  assert.ok(out.includes('src="img/editor/busy.gif"'));
  assert.ok(out.includes('<textarea id="chordProSource" wrap="off"></textarea>'));
});

test('Node ESM can import the functions by name', async () => {
  // Node reads a CommonJS file's names from its source (`module.exports.name =`); the UMD wrapper hides them otherwise
  const mod = await import('../dist/markup.js');
  assert.equal(typeof mod.editorHtml, 'function');
  assert.equal(typeof mod.escapeHtml, 'function');
  assert.equal(mod.default.editorHtml, mod.editorHtml);
});
