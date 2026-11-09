'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { editorHtml } = require('../dist/markup.js');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8').replace(/\n$/, '');

// The model the fixtures were captured with. They began as the Songbook 1.5 page (server/views.js songEditable(),
// buzcarter/UkeGeeks@8ebc8ba); 2.0.0 replaced its link-buttons with <button>s, so they are the editor's own snapshots now.
// When the markup changes on purpose, regenerate them and read the diff.
const MODEL = {
  imgUrl: '/img/editor/',
  title: 'Fixture & Friends',
  subtitle: '',
  artist: 'Bette <b>M</b>',
  album: 'Al',
  body: '{title: Fixture & Friends}\n{artist: Bette <b>M</b>}\n[C]Some <script>x</script> say &amp; [G7]love\n',
};

test('matches the read-only fixture', () => {
  assert.equal(editorHtml({ ...MODEL, canSave: false }), fixture('editor-readonly.html'));
});

test('matches the fixture with Save', () => {
  assert.equal(editorHtml({ ...MODEL, canSave: true }), fixture('editor-save.html'));
});

test('escapes song text but keeps entities', () => {
  const out = editorHtml({ title: '<i>x</i> "q"', body: 'a < b &amp; c & d' });
  assert.ok(out.includes('&lt;i&gt;x&lt;/i&gt; &quot;q&quot;</h1>'));
  assert.ok(out.includes('<pre>a &lt; b &amp; c &amp; d</pre>'));
  assert.ok(!out.includes('<i>x</i>'));
});

test('the Edit Song box holds the exact song text, entities and all', () => {
  const out = editorHtml({ body: 'Lyrics &amp; Music &copy; 1933 & <b>' });
  assert.ok(out.includes('<textarea id="chordProSource" wrap="off">Lyrics &amp;amp; Music &amp;copy; 1933 &amp; &lt;b&gt;</textarea>'));
});

test('"{{" in a song is shown as written, not treated as a template tag', () => {
  const out = editorHtml({ title: '{{body}}', body: '{{#if canSave}}x{{/if}} {{imgUrl}}' });
  assert.ok(out.includes('<h1 id="songTitle" class="ugs-songTitle">{{body}}</h1>'));
  assert.ok(out.includes('<pre>{{#if canSave}}x{{/if}} {{imgUrl}}</pre>'));
  assert.ok(!out.includes('id="saveBtn"'));
});

test('action controls are buttons, not links', () => {
  const out = editorHtml({ canSave: true });
  for (const id of ['cdBldOpenBtn', 'reformatNoBtn', 'cdBldCancelBtn', 'cdBldDotsBtn', 'cdBldFingersBtn', 'toolboxSlideUpBtn', 'toolboxSlideDownBtn']) {
    assert.match(out, new RegExp(`<button type="button" [^>]*id="${id}"`), id);
  }
  assert.equal(out.match(/<button type="button" [^>]*class="(closeBtn|resizeBtn)"/g).length, 3);
  assert.ok(!/href="#(close|resize|dots|fingers|slide-up|slide-down|noThanks|closeBuilder|chordBuilder)"/.test(out));
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
