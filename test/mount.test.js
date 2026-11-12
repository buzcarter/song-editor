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

test('a song with HTML entities comes back from getSong() unchanged', () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const song = '{title: Rock &amp; Roll}\n{subtitle: Lyrics &amp; Music &copy; 1933}\n[C]Tom & Jerry &lt;3\n';
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song });
  assert.equal(editor.getSong(), song);
  // the songsheet still shows the entities as characters
  assert.equal(document.getElementById('songTitle').textContent, 'Rock & Roll');
  assert.deepEqual(errors, []);
});

test('getSong() returns the Fullscreen editor text while it is open', async () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  // stand-ins for loading Ace (jsdom loads no scripts from URLs)
  let aceText = '';
  window.LazyLoad.js = (url, callback) => callback();
  window.ace = {
    edit: () => ({
      setTheme() {}, getSession: () => ({ setMode() {} }), setOptions() {}, gotoLine() {},
      setValue(text) { aceText = text; },
      getValue: () => aceText,
      on() {},
    }),
  };
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song: SAMPLE_SONG });

  document.querySelector('.resizeBtn').click(); // open Fullscreen
  assert.equal(aceText, SAMPLE_SONG, 'Ace gets the song');
  aceText = SAMPLE_SONG + '[G]typed in Fullscreen\n';
  assert.equal(editor.getSong(), aceText);
  assert.equal(document.getElementById('chordProSource').value, SAMPLE_SONG, 'the Edit Song box is not updated yet');

  document.querySelector('#aceHeader a').click(); // Exit fullscreen
  assert.equal(document.getElementById('chordProSource').value, aceText);
  assert.equal(editor.getSong(), aceText);
  assert.deepEqual(errors, []);
});

/** A stand-in for Ace, like the real one: setValue() empties the document, then fills it, firing "change" each time. */
function fakeAce(window) {
  let text = '';
  const handlers = [];
  const fire = () => handlers.forEach((h) => h());
  window.LazyLoad.js = (url, callback) => callback();
  window.ace = {
    edit: () => ({
      setTheme() {}, getSession: () => ({ setMode() {} }), setOptions() {}, gotoLine() {},
      setValue(next) { text = ''; fire(); text = next; fire(); },
      getValue: () => text,
      on(name, handler) { if (name === 'change') handlers.push(handler); },
    }),
  };
  return { type(next) { text = next; fire(); } };
}

const typeInBox = (window, document, text) => {
  const box = document.getElementById('chordProSource');
  box.value = text;
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
};

test('onChange is called when the song changes, not when it opens', () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const changes = [];
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    onChange: (text) => changes.push(text),
  });
  assert.deepEqual(changes, [], 'opening the song is not a change');

  typeInBox(window, document, SAMPLE_SONG + '[C]more\n');
  typeInBox(window, document, SAMPLE_SONG + '[C]more\n'); // the same text: no second call
  assert.deepEqual(changes, [SAMPLE_SONG + '[C]more\n']);
  assert.deepEqual(errors, []);
});

test('onChange hears Transpose and the Chord Builder', () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const changes = [];
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    onChange: (text) => changes.push(text),
  });

  window.ugsEditorPlus.dom.trigger('ugs:option', { action: 'transpose', value: 'up_2' });
  assert.equal(changes.length, 1, 'Transpose');
  assert.match(changes[0], /\[D\]Hello \[Bm\]there/);
  assert.equal(changes[0], editor.getSong());

  // open the song's own chord in the Chord Builder, rename it and save it
  document.querySelector('#cdBldPick li[data-id]:not(.newChord)').click();
  const name = document.getElementById('cdBldChordName');
  name.value = 'Zz9';
  name.dispatchEvent(new window.Event('keyup'));
  document.getElementById('cdBldSaveBtn').click();
  assert.equal(changes.length, 2, 'Chord Builder');
  assert.match(changes[1], /\{define: Zz9 frets/);
  assert.deepEqual(errors, []);
});

test('onChange hears typing in Fullscreen, not Fullscreen opening or closing', () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const ace = fakeAce(window);
  const changes = [];
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    onChange: (text) => changes.push(text),
  });

  document.querySelector('.resizeBtn').click(); // open Fullscreen
  assert.deepEqual(changes, [], 'opening');
  ace.type(SAMPLE_SONG + '[G]typed\n');
  assert.deepEqual(changes, [SAMPLE_SONG + '[G]typed\n']);
  document.querySelector('#aceHeader a').click(); // Exit fullscreen
  document.querySelector('.resizeBtn').click(); // and open it again
  assert.equal(changes.length, 1, 'closing and reopening');
  assert.deepEqual(errors, []);
});

test('an onChange that throws does not stop the editor', () => {
  const { window, document } = loadEditorPage({ body: '<div id="editor"></div>' });
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    onChange: () => { throw new Error('host bug'); },
  });
  typeInBox(window, document, '[C]still works\n');
  assert.equal(editor.getSong(), '[C]still works\n');
});

test('editor.save() saves like the Save button and says whether it worked', async () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const saved = [];
  let fail = false;
  window.alert = () => {};
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    save: async (text) => {
      if (fail) throw new Error('disk full');
      saved.push(text);
      return 'Saved it!';
    },
  });

  const both = [editor.save(), editor.save()]; // the second joins the first
  assert.deepEqual(await Promise.all(both), [true, true]);
  assert.deepEqual(saved, [SAMPLE_SONG]);
  assert.equal(document.getElementById('sourceFeedback').textContent, 'Saved it!');

  fail = true;
  assert.equal(await editor.save(), false);
  assert.deepEqual(errors, []);
});

test('editor.save() saves the Fullscreen text while Fullscreen is open', async () => {
  const { window, document } = loadEditorPage({ body: '<div id="editor"></div>' });
  const ace = fakeAce(window);
  const saved = [];
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: SAMPLE_SONG,
    save: (text) => { saved.push(text); },
  });
  document.querySelector('.resizeBtn').click();
  ace.type(SAMPLE_SONG + '[G]typed in Fullscreen\n');
  assert.equal(await editor.save(), true);
  assert.deepEqual(saved, [SAMPLE_SONG + '[G]typed in Fullscreen\n']);
});

test('editor.save() without a save callback resolves false', async () => {
  const { window, document } = loadEditorPage({ body: '<div id="editor"></div>' });
  const editor = window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song: SAMPLE_SONG });
  assert.equal(await editor.save(), false);
});

// Song text is untrusted: a song file can come from anywhere. None of it may become markup.
// (No spaces in the tag: the Chord Builder turns spaces in a chord name into dashes.)
const INJECTED = '<b/data-injected=1>X</b>';

test("song text doesn't become markup in the songsheet", () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const song = ['title', 'subtitle', 'artist', 'album', 'key'].map((name) => `{${name}: A${INJECTED}}`).join('\n')
    + `\n[C]Hello ${INJECTED}\n`;
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song });
  assert.equal(document.querySelectorAll('[data-injected]').length, 0);
  assert.equal(document.getElementById('songTitle').textContent, `A${INJECTED}`);
  assert.deepEqual(errors, []);
});

test("a {define} chord name doesn't become markup in the Chord Builder", () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  const name = `Zz${INJECTED}`;
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: `{define: ${name} frets 1 2 3 4}\n[C]hello\n`,
  });

  // the chord list is filled when the editor mounts
  const item = document.querySelector('#cdBldPick li[data-id]:not(.newChord)');
  assert.equal(item.textContent, name);
  assert.equal(document.querySelectorAll('[data-injected]').length, 0, 'chord list');

  // opening the chord shows its {define} in the builder (which shortens long names)
  item.click();
  assert.match(document.getElementById('cdBldOutput').textContent, /^\{define: Zz<b\/data-injected=1 frets 1 2 3 4/);
  assert.equal(document.querySelectorAll('[data-injected]').length, 0, 'builder output');
  assert.deepEqual(errors, []);
});

test("a theme colors a muted string's X like its fret numbers", () => {
  const { window, document, errors } = loadEditorPage({ body: '<div id="editor"></div>' });
  window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
    song: '{define: Zx frets x 2 3 4}\n[Zx]muted\n',
    theme: 'reversed',
  });
  const x = document.querySelector('#ukeChordsCanvas svg g#X');
  assert.ok(x, 'the muted string has an X');
  assert.match(x.getAttribute('style'), /stroke:#999999;/); // "reversed" fretText; it was black before
  assert.deepEqual(errors, []);
});
