'use strict';
/**
 * The browser bundle in jsdom, with the real Song Formatter.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadEditorPage, SAMPLE_SONG, tick } = require('./helpers');
const { editorHtml } = require('../dist/markup.js');

test('keeps the ugsEditorPlus global and its parts', () => {
  const { window, errors } = loadEditorPage();
  const ugs = window.ugsEditorPlus;
  for (const name of ['dom', 'options', 'actions', 'songAmatic', 'updateSong', 'markup', 'chordBuilder', 'resize']) {
    assert.ok(ugs[name], `ugsEditorPlus.${name}`);
  }
  assert.equal(typeof ugs.songAmatic.init, 'function');
  assert.equal(typeof ugs.songAmatic.mount, 'function');
  assert.equal(typeof window.ugsChordBuilder, 'object');
  assert.deepEqual(errors, []);
});

test('mount() writes the editor and renders the song', () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song: SAMPLE_SONG });

  assert.equal(document.getElementById('songTitle').textContent, 'Fixture Song');
  assert.equal(document.getElementById('songArtist').textContent, 'The Testers');
  assert.ok(document.querySelectorAll('#ukeChordsCanvas svg').length >= 4, 'reference diagrams drawn');
  assert.match(document.getElementById('ukeSongText').textContent, /Hello/);
  assert.ok(document.body.classList.contains('editableSongPage'));
  assert.equal(document.getElementById('saveBtn'), null, 'no Save button without save()');
  assert.equal(editor.getSong(), SAMPLE_SONG);
  assert.deepEqual(errors, []);
});

test('mount() passes options through to the editor', () => {
  const { window, document } = loadEditorPage({ body: '<div id="editor"></div>' });
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    aceUrl: '/vendor/ace/',
    showEditOnLoad: false,
  });
  assert.equal(window.ugsEditorPlus.options.aceUrl, '/vendor/ace/');
  assert.equal(document.getElementById('songSourceDlg').style.display, 'none');
});

test('Save calls the host save() with the song and shows its message', async () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const saved = [];
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    imgUrl: '/assets/img/',
    save: async (text) => {
      saved.push(text);
      return 'Saved it!';
    },
  });
  assert.equal(document.getElementById('loadingSpinner').getAttribute('src'), '/assets/img/busy.gif');

  document.getElementById('chordProSource').value = SAMPLE_SONG + '[C]more\n';
  document.getElementById('saveBtn').click();
  document.getElementById('saveBtn').click(); // ignored while saving
  await tick(10);

  assert.deepEqual(saved, [SAMPLE_SONG + '[C]more\n']);
  assert.equal(document.getElementById('sourceFeedback').textContent, 'Saved it!');
  assert.deepEqual(errors, []);
});

test('a failed save shows the alert', async () => {
  const { window, document } = loadEditorPage({ body: '<div id="editor"></div>' });
  const alerts = [];
  window.alert = (msg) => alerts.push(msg);
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    save: () => Promise.reject(new Error('disk full')),
  });
  document.getElementById('saveBtn').click();
  await tick(10);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /problem saving/);
});

test('legacy pages: markup on the page, init() and updateSong.init() post to the server', async () => {
  const markup = editorHtml({ canSave: true, title: 'Fixture Song', body: SAMPLE_SONG });
  const { window, document, errors } = loadEditorPage({ body: markup });
  const posts = [];
  window.fetch = async (uri, req) => {
    posts.push({ uri, body: JSON.parse(req.body) });
    return { ok: true, json: async () => ({ HasErrors: false, Message: 'Song updated.' }) };
  };

  window.ugsEditorPlus.songAmatic.init({});
  window.ugsEditorPlus.updateSong.init('/ajaxupdatesong', 'fixture.cpm.txt');
  assert.ok(document.querySelectorAll('#ukeChordsCanvas svg').length >= 4);

  document.getElementById('saveBtn').click();
  await tick(10);
  assert.deepEqual(posts, [{
    uri: '/ajaxupdatesong',
    body: { handler: 'ugs_update_81jr', filename: 'fixture.cpm.txt', song: SAMPLE_SONG },
  }]);
  assert.equal(document.getElementById('sourceFeedback').textContent, 'Song updated.');
  assert.deepEqual(errors, []);
});
