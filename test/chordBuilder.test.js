'use strict';
/**
 * The Chord Builder, part by part, from its own bundle (dist/js/ugsChordBuilder.min.js): no
 * editor on the page. Run `npm run build` first.
 *
 * The parts, in the order tested (src/types/ugsChordBuilder.d.ts describes them):
 *
 *   separation          the builder's files use nothing of the editor's
 *   songDefinitions     the song's text: find, add, replace, remove
 *   chordReader         a Song Formatter chord laid out for the fretboard
 *   tracking            canvas point <-> string and fret
 *   fretDots            the chord being built
 *   export              dots -> {define}
 *   html                escaping
 *   host                the builder's door to the page and the song
 *   mount()             the two panels, driven like a person would: clicks and keys
 *
 * The editor's side (the Song-a-Matic as the builder's host) is at the end; test/logic.test.js
 * and test/mount.test.js have more of the builder inside the editor.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, DIST, loadChordBuilderPage, loadEditorPage } = require('./helpers');

// (an array or object made in the page isn't deepEqual to one made here: copy it over)
const plain = (value) => JSON.parse(JSON.stringify(value));
const SOURCES = path.join(ROOT, 'src/js/editor');

describe('separation', () => {
  const builderFiles = fs.readdirSync(SOURCES).filter((f) => /^chordBuilder(\.\w+)?\.ts$/.test(f));
  const source = (file) => fs.readFileSync(path.join(SOURCES, file), 'utf8');
  /** the file without its comments */
  const code = (file) => source(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const using = (pattern) => builderFiles.filter((file) => pattern.test(code(file))).sort();

  test('the builder is these seven files', () => {
    assert.deepEqual(builderFiles.sort(), [
      'chordBuilder.chooserList.ts',
      'chordBuilder.chordReader.ts',
      'chordBuilder.editorUi.ts',
      'chordBuilder.host.ts',
      'chordBuilder.mount.ts',
      'chordBuilder.songDefinitions.ts',
      'chordBuilder.ts',
    ]);
  });

  test('none of them uses the editor', () => {
    assert.deepEqual(using(/\bugsEditorPlus\b/), []);
    // ...or its class names, apart from the ones in the builder's own markup
    assert.deepEqual(using(/ugsEditor-(overlay|isHidden|chordBuilderDlg|chordBuilderNarrow)/), []);
  });

  test('Song Formatter is used in two places: reading a {define}, and the list\'s diagrams', () => {
    assert.deepEqual(using(/\bukeGeeks\b/), ['chordBuilder.chooserList.ts', 'chordBuilder.chordReader.ts']);
  });

  test('only the host looks elements up, asks, or tells', () => {
    assert.deepEqual(using(/\b(getElementById|querySelector(All)?)\b/), ['chordBuilder.host.ts']);
    assert.deepEqual(using(/(^|[^.\w])(window\.)?(alert|confirm)\(/m), ['chordBuilder.host.ts']);
  });

  test('the song\'s text is read and written through the host, by the list alone', () => {
    assert.deepEqual(using(/\.(getSong|setSong)\(/), ['chordBuilder.chooserList.ts', 'chordBuilder.host.ts']);
  });

  test('the model and the text functions need no page', () => {
    for (const file of ['chordBuilder.songDefinitions.ts', 'chordBuilder.chordReader.ts']) {
      assert.doesNotMatch(code(file), /\b(document|window|host)\b/, file);
    }
  });

  test('its bundle loads with nothing else on the page, and has no editor in it', () => {
    const { window, errors } = loadChordBuilderPage({ songFormatter: false });
    const cb = window.ugsChordBuilder;
    assert.equal(window.ugsEditorPlus, undefined);
    assert.equal(window.ukeGeeks, undefined);
    for (const part of ['entities', 'settings', 'tracking', 'fretDots', 'export', 'html', 'songDefinitions', 'chordReader', 'host', 'cursorCanvas', 'chordCanvas', 'chooserList']) {
      assert.equal(typeof cb[part], 'object', part);
    }
    assert.equal(typeof cb.editorUi, 'function');
    assert.equal(typeof cb.mount, 'function');
    assert.match(cb.version, /^\d+\.\d+\.\d+$/);

    // the model works as it is: no host, no Song Formatter
    cb.fretDots.toggleDot(new cb.entities.Dot(3, 3, 3));
    assert.equal(cb.export.getDefinition('C', 1), '{define: C frets 0 0 0 3 fingers 0 0 0 3}');
    assert.deepEqual(errors, []);

    const js = fs.readFileSync(path.join(DIST, 'js/ugsChordBuilder.merged.js'), 'utf8');
    assert.doesNotMatch(js, /ugsEditorPlus/);
  });

  test('the editor\'s bundle holds the same builder', () => {
    const editorPage = loadEditorPage();
    const builderPage = loadChordBuilderPage();
    assert.deepEqual(Object.keys(editorPage.window.ugsChordBuilder).sort(), Object.keys(builderPage.window.ugsChordBuilder).sort());
    assert.equal(editorPage.window.ugsChordBuilder.markup, builderPage.window.ugsChordBuilder.markup);
  });

  test('the builder\'s markup is inside the editor\'s, unchanged', () => {
    const { window } = loadEditorPage();
    const page = window.ugsEditorPlus.markup.editorHtml();
    assert.ok(window.ugsChordBuilder.markup.length > 1000);
    assert.ok(page.includes(window.ugsChordBuilder.markup));
    assert.doesNotMatch(page, /\{\{>/);
  });
});

describe('songDefinitions', () => {
  const { window } = loadChordBuilderPage({ songFormatter: false });
  const defs = window.ugsChordBuilder.songDefinitions;

  const SONG = [
    '{title: Hello}',
    '{artist: Me}',
    '{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}',
    '{define: C frets 0 0 0 7}',
    '',
    '[C]Hello [G-alt]there',
    '',
  ].join('\n');

  test('find: the {define} lines, in the song\'s order', () => {
    assert.deepEqual(plain(defs.find(SONG)), [
      { name: 'G-alt', definition: '{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}' },
      { name: 'C', definition: '{define: C frets 0 0 0 7}' },
    ]);
  });

  test('find: none in a song without them, or in no song', () => {
    assert.deepEqual(plain(defs.find('{title: Hello}\n[C]Hello\n')), []);
    assert.deepEqual(plain(defs.find('')), []);
  });

  test('find: any case, any spacing; the definition is the whole line', () => {
    assert.deepEqual(plain(defs.find('  {DEFINE:   Am7   frets 0 0 0 0}  ')), [
      { name: 'Am7', definition: '  {DEFINE:   Am7   frets 0 0 0 0}  ' },
    ]);
  });

  test('find: skips a {define} with no frets, and other tags', () => {
    assert.deepEqual(plain(defs.find('{define: Nope}\n{comment: define: X frets 1}\n# {title: x}\n')), []);
  });

  test('find: a name can hold odd characters', () => {
    const found = plain(defs.find('{define: F#m7/C# frets 1 2 3 4}\n{define: <b>$& frets 0 0 0 1}'));
    assert.deepEqual(found.map((d) => d.name), ['F#m7/C#', '<b>$&']);
  });

  test('add: after the last header or define line, the rest untouched', () => {
    assert.equal(defs.add(SONG, '{define: New frets 1 1 1 1}'), [
      '{title: Hello}',
      '{artist: Me}',
      '{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}',
      '{define: C frets 0 0 0 7}',
      '{define: New frets 1 1 1 1}',
      '',
      '[C]Hello [G-alt]there',
      '',
    ].join('\n'));
  });

  test('add: after the title when there are no definitions yet', () => {
    assert.equal(defs.add('{t: Hello}\n{st: Me}\n[C]la\n', '{define: X frets 1 1 1 1}'), '{t: Hello}\n{st: Me}\n{define: X frets 1 1 1 1}\n[C]la\n');
  });

  test('add: at the top of a song with no header lines, and of an empty song', () => {
    assert.equal(defs.add('[C]la la\n', '{define: X frets 1 1 1 1}'), '{define: X frets 1 1 1 1}\n[C]la la\n');
    assert.equal(defs.add('', '{define: X frets 1 1 1 1}'), '{define: X frets 1 1 1 1}\n');
  });

  test('add: adds no lines of its own, however often', () => {
    let song = SONG;
    for (const name of ['A', 'B', 'C2']) {
      song = defs.add(song, `{define: ${name} frets 1 1 1 1}`);
    }
    assert.equal(song.split('\n').length, SONG.split('\n').length + 3);
    assert.deepEqual(plain(defs.find(song)).map((d) => d.name), ['G-alt', 'C', 'A', 'B', 'C2']);
  });

  test('add then find gives the definition back', () => {
    const definition = '{define: Zz frets 1 2 3 4 fingers 1 2 3 4 add: string 1 fret 5 finger 4}';
    assert.deepEqual(plain(defs.find(defs.add('{title: x}\n', definition))), [{ name: 'Zz', definition }]);
  });

  test('replace: swaps the definition, as plain text', () => {
    const out = defs.replace(SONG, '{define: C frets 0 0 0 7}', '{define: C frets 0 0 0 3}');
    assert.match(out, /^\{define: C frets 0 0 0 3\}$/m);
    assert.doesNotMatch(out, /frets 0 0 0 7/);
    assert.equal(out.length, SONG.length);
  });

  test('replace: "$&", "$$" and friends in a name are just characters', () => {
    for (const name of ['Zq$&', 'Zq$$', 'Zq$`', "Zq$'", 'Zq$1']) {
      const out = defs.replace('{define: Zq frets 1}\n', '{define: Zq frets 1}', `{define: ${name} frets 1}`);
      assert.equal(out, `{define: ${name} frets 1}\n`);
    }
  });

  test('replace: characters that mean something in a pattern are just characters too', () => {
    const old = '{define: C(add9)* frets 0 2 0 3}';
    assert.equal(defs.replace(`${old}\n[C]la`, old, '{define: X frets 1 1 1 1}'), '{define: X frets 1 1 1 1}\n[C]la');
  });

  test('replace: a definition the song doesn\'t have, or an empty one, changes nothing', () => {
    assert.equal(defs.replace(SONG, '{define: Nope frets 1}', 'x'), SONG);
    assert.equal(defs.replace(SONG, '', 'x'), SONG);
  });

  test('remove: takes the line out, leaving no blank one', () => {
    const out = defs.remove(SONG, '{define: C frets 0 0 0 7}');
    assert.equal(out, SONG.replace('{define: C frets 0 0 0 7}\n', ''));
    assert.deepEqual(plain(defs.find(out)).map((d) => d.name), ['G-alt']);
  });

  test('remove: a definition sharing its line loses only itself', () => {
    assert.equal(defs.remove('{define: X frets 1} [C]la\n', '{define: X frets 1}'), ' [C]la\n');
  });

  test('remove: a definition the song doesn\'t have changes nothing', () => {
    assert.equal(defs.remove(SONG, '{define: Nope frets 1}'), SONG);
  });
});

describe('chordReader', () => {
  const { window } = loadChordBuilderPage();
  const cb = window.ugsChordBuilder;
  const reader = cb.chordReader;
  const layout = (chord) => {
    const out = plain(reader.toBuilder(chord));
    return { ...out, dots: out.dots.map((d) => `${d.string}/${d.fret}/${d.finger}`) };
  };
  const dot = (string, fret, finger = 0) => ({ string, fret, finger });

  test('read: a {define} line as a chord', () => {
    const chord = plain(reader.read('{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}'));
    assert.equal(chord.name, 'G-alt');
    assert.deepEqual(chord.dots, [dot(0, 4, 3), dot(1, 2, 1), dot(2, 3, 2), dot(3, 2, 1)]);
  });

  test('read: null for a line that isn\'t a definition', () => {
    assert.equal(reader.read('# redefine a common chord'), null);
    assert.equal(reader.read(''), null);
  });

  test('toBuilder: a chord in the first five frets starts at fret 1, dots as they are', () => {
    assert.deepEqual(layout({ name: 'G', dots: [dot(1, 2, 1), dot(2, 3, 3), dot(3, 2, 2)] }), {
      name: 'G', startingFret: 1, dots: ['1/2/1', '2/3/3', '3/2/2'],
    });
    assert.equal(layout({ name: 'X', dots: [dot(0, 5)] }).startingFret, 1);
  });

  test('toBuilder: a chord up the neck starts where its highest dot is on the last row', () => {
    // frets 9 7 8 7: the diagram shows frets 5 to 9
    assert.deepEqual(layout({ name: 'C-2pos', dots: [dot(0, 9), dot(1, 7), dot(2, 8), dot(3, 7)] }), {
      name: 'C-2pos', startingFret: 5, dots: ['0/5/0', '1/3/0', '2/4/0', '3/3/0'],
    });
    assert.equal(layout({ name: 'X', dots: [dot(0, 6)] }).startingFret, 2);
  });

  test('toBuilder: a dot that would sit above the diagram is left out', () => {
    // fret 2 with a dot at fret 9: the diagram starts at 5
    assert.deepEqual(layout({ name: 'Wide', dots: [dot(0, 2), dot(1, 9)] }).dots, ['1/5/0']);
  });

  test('toBuilder: values an add: left out', () => {
    const chord = { name: 'Odd', dots: [dot(3, 3, 1), { string: null, fret: 2, finger: null }, { string: 1, fret: null, finger: 2 }] };
    // no string: the first; no finger: none; no fret: dropped
    assert.deepEqual(layout(chord).dots, ['3/3/1', '0/2/0']);
  });

  test('toBuilder: no dots (all open strings)', () => {
    assert.deepEqual(layout({ name: 'Open', dots: [] }), { name: 'Open', startingFret: 1, dots: [] });
  });

  test('read then toBuilder then export gives the definition back', () => {
    for (const definition of [
      '{define: C frets 0 0 0 3 fingers 0 0 0 3}',
      '{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}',
      '{define: C-2pos frets 9 7 8 7 fingers 0 0 0 0}',
      '{define: Dm7 frets 2 2 1 3 fingers 2 3 1 4 add: string 1 fret 1 finger 1}',
      '{define: High frets 0 0 0 12 fingers 0 0 0 1}',
    ]) {
      const chord = reader.toBuilder(reader.read(definition));
      cb.fretDots.reset();
      chord.dots.forEach((d) => cb.fretDots.toggleDot(d));
      assert.equal(cb.export.getDefinition(chord.name, chord.startingFret), definition);
    }
    cb.fretDots.reset();
  });

  test('hasMutedStrings', () => {
    assert.equal(reader.hasMutedStrings({ name: 'a', dots: [], muted: [false, false, false, false] }), false);
    assert.equal(reader.hasMutedStrings({ name: 'a', dots: [], muted: [false, true, false, false] }), true);
    assert.equal(reader.hasMutedStrings({ name: 'a', dots: [] }), false);
    assert.equal(reader.hasMutedStrings(reader.read('{define: Mute frets x 2 0 1}')), true);
  });
});

describe('tracking', () => {
  const { window } = loadChordBuilderPage({ songFormatter: false });
  const { tracking, entities, settings } = window.ugsChordBuilder;
  const { numFrets, stringNames } = settings.fretBoard;

  test('the middle of every dot is on its own string and fret', () => {
    for (let string = 0; string < stringNames.length; string++) {
      for (let fret = 0; fret <= numFrets; fret++) {
        const found = tracking.toDot(tracking.toPosition(new entities.Dot(string, fret)));
        assert.deepEqual(plain(found), { string, fret, finger: 0 }, `string ${string} fret ${fret}`);
      }
    }
  });

  test('so is anywhere within a few pixels of it', () => {
    const middle = tracking.toPosition(new entities.Dot(2, 3));
    for (const [dx, dy] of [[-10, -12], [10, 12], [-10, 12], [10, -12]]) {
      assert.deepEqual(plain(tracking.toDot({ x: middle.x + dx, y: middle.y + dy })), { string: 2, fret: 3, finger: 0 });
    }
  });

  test('a point off the fretboard is no dot', () => {
    const first = tracking.toPosition(new entities.Dot(0, 0));
    const last = tracking.toPosition(new entities.Dot(stringNames.length - 1, numFrets));
    for (const pos of [
      { x: first.x - 40, y: first.y },
      { x: first.x, y: first.y - 40 },
      { x: last.x + 40, y: last.y },
      { x: last.x, y: last.y + 40 },
      { x: -5, y: -5 },
    ]) {
      assert.equal(tracking.toDot(pos), null, JSON.stringify(pos));
    }
  });

  test('dots are one string space and one fret space apart', () => {
    const a = tracking.toPosition(new entities.Dot(0, 1));
    const b = tracking.toPosition(new entities.Dot(1, 2));
    assert.equal(b.x - a.x, settings.fretBoard.stringSpace);
    assert.equal(b.y - a.y, settings.fretBoard.fretSpace);
  });
});

describe('fretDots', () => {
  const { window } = loadChordBuilderPage({ songFormatter: false });
  const { fretDots, entities, settings } = window.ugsChordBuilder;
  const dots = () => plain(fretDots.getDots()).map((d) => `${d.string}/${d.fret}/${d.finger}`);
  const put = (...list) => {
    fretDots.reset();
    list.forEach(([string, fret, finger]) => fretDots.toggleDot(new entities.Dot(string, fret, finger)));
  };

  test('toggleDot adds a dot, and takes it off again', () => {
    put([1, 2]);
    assert.deepEqual(dots(), ['1/2/0']);
    fretDots.toggleDot(new entities.Dot(1, 2));
    assert.deepEqual(dots(), []);
  });

  test('a string can hold more than one dot', () => {
    put([1, 2], [1, 4], [0, 2]);
    assert.deepEqual(dots(), ['1/2/0', '1/4/0', '0/2/0']);
  });

  test('toggling a dot off ignores its finger', () => {
    put([1, 2, 3]);
    fretDots.toggleDot(new entities.Dot(1, 2, 0));
    assert.deepEqual(dots(), []);
  });

  test('fret 0 clears that string only', () => {
    put([1, 2], [1, 4], [0, 2]);
    fretDots.toggleDot(new entities.Dot(1, 0));
    assert.deepEqual(dots(), ['0/2/0']);
  });

  test('toggleFinger sets, changes and clears a dot\'s finger', () => {
    put([1, 2]);
    assert.equal(fretDots.toggleFinger(new entities.Dot(1, 2), 3), true);
    assert.deepEqual(dots(), ['1/2/3']);
    assert.equal(fretDots.toggleFinger(new entities.Dot(1, 2), 1), true);
    assert.deepEqual(dots(), ['1/2/1']);
    assert.equal(fretDots.toggleFinger(new entities.Dot(1, 2), 1), true);
    assert.deepEqual(dots(), ['1/2/0']);
  });

  test('toggleFinger where there is no dot does nothing', () => {
    put([1, 2]);
    assert.equal(fretDots.toggleFinger(new entities.Dot(2, 2), 3), false);
    assert.deepEqual(dots(), ['1/2/0']);
  });

  test('slide moves every dot, or none', () => {
    put([0, 1], [3, 3, 2]);
    assert.equal(fretDots.slide(+1), true);
    assert.deepEqual(dots(), ['0/2/0', '3/4/2']);
    assert.equal(fretDots.slide(-1), true);
    assert.equal(fretDots.slide(-1), false, 'the first dot is on fret 1');
    assert.deepEqual(dots(), ['0/1/0', '3/3/2']);

    put([0, 1], [3, settings.fretBoard.numFrets]);
    assert.equal(fretDots.slide(+1), false, 'the last dot is on the last fret');
    assert.equal(fretDots.slide(-1), false);
    assert.deepEqual(dots(), ['0/1/0', `3/${settings.fretBoard.numFrets}/0`]);
  });

  test('slide with no dots is allowed and moves nothing', () => {
    fretDots.reset();
    assert.equal(fretDots.slide(+1), true);
    assert.deepEqual(dots(), []);
  });

  test('getDots is a copy of the list', () => {
    put([1, 2]);
    fretDots.getDots().length = 0;
    assert.deepEqual(dots(), ['1/2/0']);
  });

  test('reset clears every string', () => {
    put([0, 1], [1, 2], [2, 3], [3, 4], [3, 5]);
    fretDots.reset();
    assert.deepEqual(dots(), []);
  });
});

describe('export', () => {
  const { window } = loadChordBuilderPage({ songFormatter: false });
  const { fretDots, entities, export: exporter, settings } = window.ugsChordBuilder;
  const put = (...list) => {
    fretDots.reset();
    list.forEach(([string, fret, finger]) => fretDots.toggleDot(new entities.Dot(string, fret, finger)));
  };

  test('an empty fretboard is four open strings', () => {
    put();
    assert.equal(exporter.getDefinition('Open', 1), '{define: Open frets 0 0 0 0 fingers 0 0 0 0}');
    assert.deepEqual([...exporter.getPrimaryFrets(1)], [0, 0, 0, 0]);
  });

  test('getPrimaryFrets: the highest dot per string, on the instrument', () => {
    put([0, 1], [1, 2], [1, 4], [3, 5]);
    assert.deepEqual([...exporter.getPrimaryFrets(1)], [1, 4, 0, 5]);
    assert.deepEqual([...exporter.getPrimaryFrets(5)], [5, 8, 0, 9]);
  });

  test('an open string stays 0 whatever the starting fret', () => {
    put([3, 1, 1]);
    assert.equal(exporter.getDefinition('X', 7), '{define: X frets 0 0 0 7 fingers 0 0 0 1}');
  });

  test('three dots on one string: the highest is the fret, the lowest an add:', () => {
    // (the builder writes one add: per string; a middle dot is not saved)
    put([1, 1, 1], [1, 3, 2], [1, 5, 4]);
    assert.equal(exporter.getDefinition('X', 1), '{define: X frets 0 5 0 0 fingers 0 4 0 0 add: string 2 fret 1 finger 1}');
  });

  test('the name: trimmed, spaces to dashes, reserved words refused, cut at the maximum', () => {
    put([3, 3]);
    const name = (typed) => exporter.getDefinition(typed, 1).replace(/^\{define: (\S+) .*$/, '$1');
    assert.equal(name('  C add9  '), 'C-add9');
    assert.equal(name(''), 'CHORDNAME');
    assert.equal(name('   '), 'CHORDNAME');
    for (const reserved of ['frets', 'Fingers', 'ADD:']) {
      assert.equal(name(reserved), 'CHORDNAME', reserved);
    }
    assert.equal(name('x'.repeat(50)).length, settings.chord.nameMaxLength);
  });

  test('the definition is one line with single spaces', () => {
    put([0, 2, 1], [0, 4, 3], [2, 1]);
    const definition = exporter.getDefinition('A  b', 3);
    assert.doesNotMatch(definition, /\s{2}|\n| \}/);
    assert.match(definition, /^\{define: \S+ frets( \d+){4} fingers( \d){4}( add: string \d fret \d+ finger \d)*\}$/);
  });

  test('getDefinitionHtml reads the same as getDefinition, and escapes the name', () => {
    put([3, 3, 3], [3, 1, 1]);
    for (const name of ['C', 'F#m7/C#', '<img/src=x>', 'a&b', '"q"', 'Zq$&']) {
      const div = window.document.createElement('div');
      div.innerHTML = exporter.getDefinitionHtml(name, 2);
      assert.equal(div.textContent, exporter.getDefinition(name, 2), name);
      assert.equal(div.querySelectorAll('img').length, 0);
      assert.equal(div.querySelector('.chordPro-string').textContent, name);
    }
  });
});

describe('html', () => {
  const { window } = loadChordBuilderPage({ songFormatter: false });
  const { html } = window.ugsChordBuilder;

  test('escape', () => {
    assert.equal(html.escape('<b a="1" b=\'2\'>&</b>'), '&lt;b a=&quot;1&quot; b=&#39;2&#39;&gt;&amp;&lt;/b&gt;');
    assert.equal(html.escape('Cmaj7'), 'Cmaj7');
    assert.equal(html.escape(''), '');
    assert.equal(html.escape('&amp;'), '&amp;amp;');
  });
});

describe('host', () => {
  test('before a host is set, the builder says so', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host } = window.ugsChordBuilder;
    assert.throws(() => host.getSong(), /no host yet/);
    assert.throws(() => host.byId('cdBldPick', window.HTMLElement), /no host yet/);
  });

  test('byId looks inside the root only, and checks what it finds', () => {
    const { window, document } = loadChordBuilderPage({
      songFormatter: false,
      body: '<input id="outside"><div id="root"><input id="inside"><p id="para"></p></div>',
    });
    const { host } = window.ugsChordBuilder;
    host.use({ root: document.getElementById('root'), getSong: () => '', setSong() {} });
    assert.equal(host.byId('inside', window.HTMLInputElement), document.getElementById('inside'));
    assert.throws(() => host.byId('outside', window.HTMLInputElement), /ugsChordBuilder: #outside not found/);
    assert.throws(() => host.byId('para', window.HTMLInputElement), /ugsChordBuilder: #para is not a HTMLInputElement/);
  });

  test('with no root, byId looks in the whole page', () => {
    const { window, document } = loadChordBuilderPage({ songFormatter: false, body: '<input id="anywhere">' });
    const { host } = window.ugsChordBuilder;
    host.use({ getSong: () => '', setSong() {} });
    assert.equal(host.byId('anywhere', window.HTMLInputElement), document.getElementById('anywhere'));
  });

  test('the song goes through getSong and setSong', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host } = window.ugsChordBuilder;
    let song = 'one';
    host.use({ getSong: () => song, setSong: (text) => { song = text; } });
    assert.equal(host.getSong(), 'one');
    host.setSong('two');
    assert.equal(song, 'two');
  });

  test('confirm and alert are the host\'s when it has them, the window\'s when not', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host } = window.ugsChordBuilder;
    const heard = [];
    window.confirm = (message) => { heard.push(`window.confirm ${message}`); return true; };
    window.alert = (message) => { heard.push(`window.alert ${message}`); };

    host.use({ getSong: () => '', setSong() {} });
    assert.equal(host.confirm('a?'), true);
    host.alert('b');

    host.use({
      getSong: () => '',
      setSong() {},
      confirm: (message) => { heard.push(`host.confirm ${message}`); return false; },
      alert: (message) => { heard.push(`host.alert ${message}`); },
    });
    assert.equal(host.confirm('c?'), false);
    host.alert('d');
    assert.deepEqual(heard, ['window.confirm a?', 'window.alert b', 'host.confirm c?', 'host.alert d']);
  });

  test('onStateChange is optional', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host } = window.ugsChordBuilder;
    host.use({ getSong: () => '', setSong() {} });
    host.stateChanged({});
    const states = [];
    host.use({ getSong: () => '', setSong() {}, onStateChange: (state) => states.push(state) });
    host.stateChanged({ name: 'x' });
    assert.deepEqual(states, [{ name: 'x' }]);
  });

  test('onPanelChange is optional', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host } = window.ugsChordBuilder;
    host.use({ getSong: () => '', setSong() {} });
    host.panelChanged('builder');
    const panels = [];
    host.use({ getSong: () => '', setSong() {}, onPanelChange: (panel) => panels.push(panel) });
    host.panelChanged('builder');
    host.panelChanged('chooser');
    assert.deepEqual(panels, ['builder', 'chooser']);
  });

  test('cursorImageUri sets the hand cursor\'s picture', () => {
    const { window } = loadChordBuilderPage({ songFormatter: false });
    const { host, settings } = window.ugsChordBuilder;
    const before = settings.cursor.imageUri;
    host.use({ getSong: () => '', setSong() {} });
    assert.equal(settings.cursor.imageUri, before);
    host.use({ getSong: () => '', setSong() {}, cursorImageUri: '/pics/hand-cursor.png' });
    assert.equal(settings.cursor.imageUri, '/pics/hand-cursor.png');
  });
});

/**
 * A page with only the Chord Builder on it, and a host that keeps the song in a variable and
 * writes down everything the builder asks of it.
 */
function mountBuilder(song = '') {
  const page = loadChordBuilderPage({ body: '<main id="builder"></main><ul id="cdBldPick" class="decoy"></ul>' });
  const { window, document } = page;
  const cb = window.ugsChordBuilder;
  const log = { saved: [], alerts: [], confirms: [], panels: [], states: [] };
  const answers = { confirm: true };
  const state = { song };
  const element = document.getElementById('builder');

  const builder = cb.mount(element, {
    getSong: () => state.song,
    setSong: (text) => { state.song = text; log.saved.push(text); },
    confirm: (message) => { log.confirms.push(message); return answers.confirm; },
    alert: (message) => { log.alerts.push(message); },
    onPanelChange: (panel) => log.panels.push(panel),
    onStateChange: (current) => log.states.push(plain(current)),
  });

  const $ = (id) => element.querySelector(`#${id}`);
  const fire = (target, type, init = {}) => target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, ...init }));
  /** the middle of a string and fret, as a mouse position (jsdom's canvases are all at 0,0) */
  const at = (string, fret) => {
    const pos = cb.tracking.toPosition(new cb.entities.Dot(string, fret));
    return { clientX: pos.x, clientY: pos.y };
  };

  return {
    ...page, cb, builder, log, answers, state, element, $,
    /** clicks the fretboard with whichever tool is active */
    clickFret: (string, fret) => fire($('cdBldCursorCanvas'), 'click', at(string, fret)),
    moveTo: (string, fret) => fire($('cdBldEditorSurface'), 'mousemove', at(string, fret)),
    click: (id) => fire($(id), 'click'),
    /** list items by name: {Zq: <li>, ...} */
    items: () => Object.fromEntries([...$('cdBldPick').querySelectorAll('li[data-id]')].map((li) => [li.firstChild.nodeType === 3 ? li.textContent : li.childNodes[1].textContent, li])),
    listNames: () => [...$('cdBldPick').querySelectorAll('li[data-id]:not(.ugsEditor-newChord)')].map((li) => li.childNodes[1].textContent),
    open(name) { fire(this.items()[name], 'click'); },
    newChord() { fire($('cdBldPick').querySelector('.ugsEditor-newChord'), 'click'); },
    typeName(name) {
      $('cdBldChordName').value = name;
      $('cdBldChordName').dispatchEvent(new window.Event('keyup'));
    },
    setStartingFret(fret) {
      $('cdBldStartingFret').value = String(fret);
      $('cdBldStartingFret').dispatchEvent(new window.Event('change'));
    },
    dots: () => plain(builder.getState().dots).map((d) => `${d.string}/${d.fret}/${d.finger}`),
    panel: () => ($('cdBldBuilderPanel').style.display === 'block' ? 'builder' : 'chooser'),
    output: () => $('cdBldOutput').textContent,
  };
}

const TWO_CHORDS = '{title: Test}\n{define: Zq frets 0 3 0 0 fingers 0 2 0 0}\n{define: Zr frets 2 0 0 1}\n[Zq]hi [Zr]there\n';

describe('mount(): starting up', () => {
  test('writes the builder into the element and lists the song\'s chords', () => {
    const b = mountBuilder(TWO_CHORDS);
    assert.ok(b.builder, 'mount() returns the builder');
    assert.equal(b.element.querySelectorAll('canvas').length, 2);
    assert.equal(b.panel(), 'chooser');
    // bottom-up, as the list always was, after "+ Add New Chord"
    assert.deepEqual(b.listNames(), ['Zr', 'Zq']);
    assert.equal(b.$('cdBldPick').firstChild.textContent, '+ Add New Chord');
    assert.deepEqual(plain(b.builder.getDefinitions()), [
      { id: 0, name: 'Zr', definition: '{define: Zr frets 2 0 0 1}' },
      { id: 1, name: 'Zq', definition: '{define: Zq frets 0 3 0 0 fingers 0 2 0 0}' },
    ]);
    assert.deepEqual(b.log.saved, [], 'opening the builder doesn\'t touch the song');
    assert.deepEqual(b.errors, []);
  });

  test('each listed chord has its small diagram', () => {
    const b = mountBuilder(TWO_CHORDS);
    for (const name of ['Zq', 'Zr']) {
      assert.ok(b.items()[name].querySelector('svg circle'), name);
    }
    assert.equal(b.$('cdBldPick').querySelector('.ugsEditor-newChord svg'), null);
  });

  test('a definition Song Formatter can\'t draw is listed without a diagram', () => {
    const b = mountBuilder('{define: Bad frets what}\n');
    assert.deepEqual(b.listNames(), ['Bad']);
    assert.deepEqual(b.errors, []);
  });

  test('a song with no definitions lists only "+ Add New Chord"', () => {
    const b = mountBuilder('{title: Plain}\n[C]la\n');
    assert.deepEqual(b.listNames(), []);
    assert.equal(b.$('cdBldPick').children.length, 1);
  });

  test('a new builder holds an empty chord', () => {
    const b = mountBuilder();
    assert.deepEqual(plain(b.builder.getState()), {
      name: 'CHORDNAME',
      startingFret: 1,
      dots: [],
      tool: 'dots',
      finger: 1,
      isNew: true,
      definition: '{define: CHORDNAME frets 0 0 0 0 fingers 0 0 0 0}',
    });
    assert.equal(b.$('cdBldSaveBtn').value, 'Add');
    assert.equal(b.output(), '{define: CHORDNAME frets 0 0 0 0 fingers 0 0 0 0}');
  });

  test('the starting fret can be 1 to the last one that still shows five frets', () => {
    const b = mountBuilder();
    const { maxFret, numFrets } = b.cb.settings.fretBoard;
    const options = [...b.$('cdBldStartingFret').options].map((o) => Number(o.value));
    assert.deepEqual(options, Array.from({ length: maxFret - numFrets + 1 }, (_, i) => i + 1));
  });

  test('it stays inside its element: a look-alike elsewhere on the page is left alone', () => {
    const b = mountBuilder(TWO_CHORDS);
    const decoy = b.document.querySelector('ul.decoy');
    assert.equal(decoy.children.length, 0);
    assert.notEqual(b.$('cdBldPick'), decoy);
  });

  test('getState() and getDefinitions() hand out copies', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.builder.getState().dots[0].fret = 5;
    b.builder.getState().dots.length = 0;
    b.builder.getDefinitions()[0].name = 'changed';
    assert.deepEqual(b.dots(), ['1/3/2']);
    assert.deepEqual(plain(b.builder.getDefinitions()).map((d) => d.name), ['Zr', 'Zq']);
  });
});

describe('mount(): the fretboard', () => {
  test('a click with the dot tool puts a dot there; another takes it off', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(3, 3);
    assert.deepEqual(b.dots(), ['3/3/0']);
    assert.equal(b.output(), '{define: CHORDNAME frets 0 0 0 3 fingers 0 0 0 0}');
    b.clickFret(1, 2);
    assert.deepEqual(b.dots(), ['3/3/0', '1/2/0']);
    b.clickFret(3, 3);
    assert.deepEqual(b.dots(), ['1/2/0']);
    assert.equal(b.output(), '{define: CHORDNAME frets 0 2 0 0 fingers 0 0 0 0}');
  });

  test('every string and fret can be clicked', () => {
    const b = mountBuilder();
    b.newChord();
    const { numFrets, stringNames } = b.cb.settings.fretBoard;
    for (let string = 0; string < stringNames.length; string++) {
      for (let fret = 1; fret <= numFrets; fret++) {
        b.clickFret(string, fret);
        assert.deepEqual(b.dots(), [`${string}/${fret}/0`]);
        b.clickFret(string, fret);
      }
    }
    assert.deepEqual(b.dots(), []);
  });

  test('a click above the nut clears that string', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(1, 2);
    b.clickFret(1, 4);
    b.clickFret(2, 1);
    b.clickFret(1, 0);
    assert.deepEqual(b.dots(), ['2/1/0']);
  });

  test('a click beside the fretboard does nothing', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(0, 1);
    b.$('cdBldCursorCanvas').dispatchEvent(new b.window.MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    assert.deepEqual(b.dots(), ['0/1/0']);
  });

  test('the diagram draws one circle per dot, and a number on each that has a finger', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    b.drawn.clear();
    b.clickFret(0, 1);
    const circles = () => b.drawn('cdBldDiagramCanvas').filter(([name]) => name === 'arc');
    assert.equal(circles().length, 1);
    const middle = b.cb.tracking.toPosition(new b.cb.entities.Dot(0, 1));
    assert.deepEqual(circles()[0].slice(1, 3), [middle.x, middle.y], 'drawn where it was clicked');

    b.drawn.clear();
    b.clickFret(2, 3);
    assert.equal(circles().length, 2, 'the whole diagram is redrawn');

    // Zq has one dot, with finger 2: its number is drawn; the fret labels are 1 to 5
    b.click('cdBldCancelBtn');
    b.drawn.clear();
    b.open('Zq');
    const lastDraw = b.drawn('cdBldDiagramCanvas');
    const texts = lastDraw.slice(lastDraw.map(([name]) => name).lastIndexOf('clearRect')).filter(([name]) => name === 'fillText').map(([, text]) => text);
    assert.deepEqual(texts, ['1', '2', '3', '4', '5', 'G', 'C', 'E', 'A', '2']);
  });

  test('the fret labels follow the starting fret', () => {
    const b = mountBuilder();
    b.newChord();
    b.drawn.clear();
    b.setStartingFret(7);
    const texts = b.drawn('cdBldDiagramCanvas').filter(([name]) => name === 'fillText').map(([, text]) => text);
    assert.deepEqual(texts.slice(0, 5), ['7', '8', '9', '10', '11']);
  });

  test('moving the mouse draws the cursor on its own canvas, not the diagram', () => {
    const b = mountBuilder();
    b.newChord();
    b.drawn.clear();
    b.moveTo(2, 2);
    assert.ok(b.drawn('cdBldCursorCanvas').some(([name]) => name === 'arc'));
    assert.deepEqual(b.drawn('cdBldDiagramCanvas'), []);
  });
});

describe('mount(): the toolbox', () => {
  const selected = (b) => ['cdBldDotsBtn', 'cdBldFingersBtn'].filter((id) => b.$(id).classList.contains('ugsEditor-selected'));

  test('Set Fingers numbers a dot; the same finger again clears it', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(1, 2);
    b.click('cdBldFingersBtn');
    assert.equal(b.builder.getState().tool, 'fingers');
    assert.deepEqual(selected(b), ['cdBldFingersBtn']);
    b.clickFret(1, 2);
    assert.deepEqual(b.dots(), ['1/2/1']);
    assert.equal(b.output(), '{define: CHORDNAME frets 0 2 0 0 fingers 0 1 0 0}');
    b.clickFret(1, 2);
    assert.deepEqual(b.dots(), ['1/2/0']);
  });

  test('Set Fingers on an empty spot adds nothing', () => {
    const b = mountBuilder();
    b.newChord();
    b.click('cdBldFingersBtn');
    b.clickFret(1, 2);
    assert.deepEqual(b.dots(), []);
  });

  test('clicking Set Fingers again steps through the fingers: 1, 2, 3, 4, none, 1', () => {
    const b = mountBuilder();
    b.newChord();
    b.click('cdBldFingersBtn');
    const seen = [];
    for (let i = 0; i < 6; i++) {
      seen.push(`${b.builder.getState().finger} ${b.$('cdBldBtnFingerName').textContent}`);
      b.click('cdBldFingersBtn');
    }
    assert.deepEqual(seen, ['1 Index finger (1)', '2 Middle finger (2)', '3 Ring finger (3)', '4 Pinkie (4)', '0 None (0)', '1 Index finger (1)']);
  });

  test('each finger is the one set on the dot', () => {
    const b = mountBuilder();
    b.newChord();
    [[0, 1], [1, 2], [2, 3], [3, 4]].forEach(([string, fret]) => b.clickFret(string, fret));
    b.click('cdBldFingersBtn');
    [[0, 1], [1, 2], [2, 3], [3, 4]].forEach(([string, fret]) => {
      b.clickFret(string, fret);
      b.click('cdBldFingersBtn');
    });
    assert.deepEqual(b.dots(), ['0/1/1', '1/2/2', '2/3/3', '3/4/4']);
    assert.equal(b.output(), '{define: CHORDNAME frets 1 2 3 4 fingers 1 2 3 4}');
  });

  test('a click on something inside a tool button still picks that tool', () => {
    const b = mountBuilder();
    b.newChord();
    b.$('cdBldBtnFingerName').dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
    assert.equal(b.builder.getState().tool, 'fingers');
    b.$('cdBldDotsBtn').querySelector('span').dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
    assert.equal(b.builder.getState().tool, 'dots');
    assert.deepEqual(selected(b), ['cdBldDotsBtn']);
  });

  test('Add Dots, clicked while it is the tool, changes nothing', () => {
    const b = mountBuilder();
    b.newChord();
    b.click('cdBldDotsBtn');
    assert.equal(b.builder.getState().tool, 'dots');
    assert.equal(b.builder.getState().finger, 1);
  });

  test('opening a chord goes back to the dot tool and the index finger', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    b.click('cdBldFingersBtn');
    b.click('cdBldFingersBtn');
    b.click('cdBldCancelBtn');
    b.open('Zq');
    assert.equal(b.builder.getState().tool, 'dots');
    assert.equal(b.builder.getState().finger, 1);
    assert.deepEqual(selected(b), ['cdBldDotsBtn']);
  });

  test('Slide Down and Slide Up move the dots while they fit', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(0, 1);
    b.clickFret(2, 3);
    b.click('toolboxSlideDownBtn');
    assert.deepEqual(b.dots(), ['0/2/0', '2/4/0']);
    assert.equal(b.builder.getState().startingFret, 1);
    assert.equal(b.output(), '{define: CHORDNAME frets 2 0 4 0 fingers 0 0 0 0}');
    b.click('toolboxSlideUpBtn');
    assert.deepEqual(b.dots(), ['0/1/0', '2/3/0']);
  });

  test('when the dots can\'t move, the starting fret does: the chord still shifts one fret', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(0, 1);
    b.clickFret(2, 5);
    b.click('toolboxSlideDownBtn');
    assert.deepEqual(b.dots(), ['0/1/0', '2/5/0'], 'the dots stay on the diagram');
    assert.equal(b.builder.getState().startingFret, 2);
    assert.equal(b.$('cdBldStartingFret').value, '2');
    assert.equal(b.output(), '{define: CHORDNAME frets 2 0 6 0 fingers 0 0 0 0}');
    b.click('toolboxSlideUpBtn');
    assert.equal(b.builder.getState().startingFret, 1);
    assert.equal(b.output(), '{define: CHORDNAME frets 1 0 5 0 fingers 0 0 0 0}');
  });

  test('sliding stops at both ends of the neck', () => {
    const b = mountBuilder();
    const { maxFret, numFrets } = b.cb.settings.fretBoard;
    b.newChord();
    b.clickFret(0, 1);
    b.clickFret(2, numFrets);
    b.click('toolboxSlideUpBtn');
    assert.equal(b.builder.getState().startingFret, 1, 'nothing above fret 1');
    assert.equal(b.output(), `{define: CHORDNAME frets 1 0 ${numFrets} 0 fingers 0 0 0 0}`);
    for (let i = 0; i < maxFret + 5; i++) {
      b.click('toolboxSlideDownBtn');
    }
    assert.equal(b.builder.getState().startingFret, maxFret - numFrets + 1);
    assert.equal(b.output(), `{define: CHORDNAME frets ${maxFret - numFrets + 1} 0 ${maxFret} 0 fingers 0 0 0 0}`);
  });

  test('the Starting Fret box moves the whole chord', () => {
    const b = mountBuilder();
    b.newChord();
    b.clickFret(0, 1);
    b.clickFret(3, 3);
    b.setStartingFret(5);
    assert.equal(b.builder.getState().startingFret, 5);
    assert.deepEqual(b.dots(), ['0/1/0', '3/3/0'], 'the dots stay where they are on the diagram');
    assert.equal(b.output(), '{define: CHORDNAME frets 5 0 0 7 fingers 0 0 0 0}');
  });

  test('typing a name updates the definition', () => {
    const b = mountBuilder();
    b.newChord();
    b.typeName('  my chord ');
    assert.equal(b.builder.getState().name, '  my chord ');
    assert.equal(b.builder.getState().definition, '{define: my-chord frets 0 0 0 0 fingers 0 0 0 0}');
    assert.equal(b.output(), '{define: my-chord frets 0 0 0 0 fingers 0 0 0 0}');
  });

  test('"Show ChordPro output" opens and shuts the output box', () => {
    const b = mountBuilder();
    b.newChord();
    const collapsed = () => b.$('cdBldOutputBox').classList.contains('ugsEditor-collapseOutput');
    assert.equal(collapsed(), true);
    b.$('cdBldShowOutputBtn').click();
    assert.equal(collapsed(), false);
    b.$('cdBldShowOutputBtn').click();
    assert.equal(collapsed(), true);
  });
});

describe('mount(): telling the host', () => {
  /** what changed in each state the host heard, as "key=value" */
  const heard = (b, since = 0) => {
    const states = b.log.states.slice(since);
    return states.map((state, i) => {
      const before = i === 0 ? b.log.states[since - 1] : states[i - 1];
      return Object.keys(state).filter((key) => JSON.stringify(state[key]) !== JSON.stringify(before[key])).map((key) => (key === 'dots' ? `dots=${state.dots.length}` : `${key}=${state[key]}`)).join(' ');
    });
  };

  test('onStateChange hears each change, with the state getState() gives', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    let from = b.log.states.length;
    const step = (action) => {
      from = b.log.states.length;
      action();
      assert.deepEqual(b.log.states.slice(-1)[0], plain(b.builder.getState()));
      return heard(b, from);
    };

    assert.deepEqual(step(() => b.clickFret(0, 2)), ['dots=1 definition={define: CHORDNAME frets 2 0 0 0 fingers 0 0 0 0}']);
    assert.deepEqual(step(() => b.typeName('Zs')), ['name=Zs definition={define: Zs frets 2 0 0 0 fingers 0 0 0 0}']);
    assert.deepEqual(step(() => b.setStartingFret(3)), ['startingFret=3 definition={define: Zs frets 4 0 0 0 fingers 0 0 0 0}']);
    assert.deepEqual(step(() => b.click('cdBldFingersBtn')), ['tool=fingers']);
    assert.deepEqual(step(() => b.click('cdBldFingersBtn')), ['finger=2']);
    assert.deepEqual(step(() => b.clickFret(0, 2)), ['dots=1 definition={define: Zs frets 4 0 0 0 fingers 2 0 0 0}']);
    assert.deepEqual(step(() => b.click('toolboxSlideDownBtn')), ['dots=1 definition={define: Zs frets 5 0 0 0 fingers 2 0 0 0}']);
  });

  test('it hears nothing when nothing changes', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    const before = b.log.states.length;
    b.moveTo(1, 1);
    b.click('cdBldDotsBtn');
    b.$('cdBldShowOutputBtn').click();
    b.$('cdBldCursorCanvas').dispatchEvent(new b.window.MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));
    b.click('cdBldFingersBtn');
    b.clickFret(1, 1); // the finger tool, where there is no dot
    assert.equal(b.log.states.length, before + 1, 'only the change of tool');
  });

  test('opening a chord ends on that chord; Cancel ends on a blank one', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    assert.equal(b.log.states.slice(-1)[0].definition, '{define: Zq frets 0 3 0 0 fingers 0 2 0 0}');
    assert.equal(b.log.states.slice(-1)[0].isNew, false);
    b.click('cdBldCancelBtn');
    assert.equal(b.log.states.slice(-1)[0].definition, '{define: CHORDNAME frets 0 0 0 0 fingers 0 0 0 0}');
    assert.equal(b.log.states.slice(-1)[0].isNew, true);
  });
});

describe('mount(): opening, saving and deleting', () => {
  test('opening a chord from the list loads it', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    assert.deepEqual(plain(b.builder.getState()), {
      name: 'Zq',
      startingFret: 1,
      dots: [{ string: 1, fret: 3, finger: 2 }],
      tool: 'dots',
      finger: 1,
      isNew: false,
      definition: '{define: Zq frets 0 3 0 0 fingers 0 2 0 0}',
    });
    assert.equal(b.$('cdBldChordName').value, 'Zq');
    assert.equal(b.$('cdBldSaveBtn').value, 'Update');
    assert.equal(b.panel(), 'builder');
    assert.deepEqual(b.log.panels.slice(-1), ['builder']);
    assert.deepEqual(b.log.saved, [], 'opening a chord doesn\'t touch the song');
  });

  test('a chord up the neck opens at its starting fret', () => {
    const b = mountBuilder('{define: C-2pos frets 9 7 8 7}\n');
    b.open('C-2pos');
    assert.equal(b.builder.getState().startingFret, 5);
    assert.equal(b.$('cdBldStartingFret').value, '5');
    assert.deepEqual(b.dots(), ['0/5/0', '1/3/0', '2/4/0', '3/3/0']);
    assert.equal(b.output(), '{define: C-2pos frets 9 7 8 7 fingers 0 0 0 0}');
  });

  test('"+ Add New Chord" after an opened chord is blank again', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.click('cdBldCancelBtn');
    b.newChord();
    const state = b.builder.getState();
    assert.deepEqual([state.name, state.isNew, state.dots.length, state.startingFret], ['CHORDNAME', true, 0, 1]);
    assert.equal(b.$('cdBldSaveBtn').value, 'Add');
  });

  test('Add puts the definition in the song, after the others, and in the list', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    b.typeName('Zs');
    b.clickFret(0, 2);
    b.click('cdBldSaveBtn');
    assert.deepEqual(b.log.saved, ['{title: Test}\n{define: Zq frets 0 3 0 0 fingers 0 2 0 0}\n{define: Zr frets 2 0 0 1}\n{define: Zs frets 2 0 0 0 fingers 0 0 0 0}\n[Zq]hi [Zr]there\n']);
    assert.deepEqual(b.listNames(), ['Zr', 'Zq', 'Zs']);
    assert.ok(b.items().Zs.querySelector('svg circle'), 'with its diagram');
    assert.equal(b.panel(), 'chooser');
    assert.deepEqual(b.log.panels.slice(-1), ['chooser']);
  });

  test('a chord just added can be opened and updated', () => {
    const b = mountBuilder('{title: Test}\n');
    b.newChord();
    b.typeName('Zs');
    b.clickFret(0, 2);
    b.click('cdBldSaveBtn');
    b.open('Zs');
    assert.equal(b.builder.getState().isNew, false);
    assert.deepEqual(b.dots(), ['0/2/0']);
    b.clickFret(3, 1);
    b.click('cdBldSaveBtn');
    assert.equal(b.state.song, '{title: Test}\n{define: Zs frets 2 0 0 1 fingers 0 0 0 0}\n');
    assert.deepEqual(b.listNames(), ['Zs']);
  });

  test('Update changes the definition where it is, and nothing else', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.clickFret(3, 1);
    b.click('cdBldSaveBtn');
    assert.deepEqual(b.log.saved, [TWO_CHORDS.replace('frets 0 3 0 0 fingers 0 2 0 0', 'frets 0 3 0 1 fingers 0 2 0 0')]);
    assert.deepEqual(b.listNames(), ['Zr', 'Zq']);
  });

  test('Update can rename a chord', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zr');
    b.typeName('Renamed');
    b.click('cdBldSaveBtn');
    assert.match(b.state.song, /^\{define: Renamed frets 2 0 0 1 fingers 0 0 0 0\}$/m);
    assert.doesNotMatch(b.state.song, /define: Zr/);
    assert.deepEqual(b.listNames(), ['Renamed', 'Zq']);
  });

  test('a name already in the song is refused: the host is told, the song is untouched', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.newChord();
    b.typeName('zQ');
    b.click('cdBldSaveBtn');
    assert.deepEqual(b.log.alerts, ['Hey, this chord name is already being used.']);
    assert.deepEqual(b.log.saved, []);
    assert.equal(b.panel(), 'builder', 'still on the builder, to fix the name');
    assert.deepEqual(b.listNames(), ['Zr', 'Zq']);
  });

  test('a chord can be saved under its own name', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.click('cdBldSaveBtn');
    assert.deepEqual(b.log.alerts, []);
    assert.equal(b.state.song, TWO_CHORDS);
  });

  test('renaming a chord to another chord\'s name is refused', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.typeName('Zr');
    b.click('cdBldSaveBtn');
    assert.equal(b.log.alerts.length, 1);
    assert.deepEqual(b.log.saved, []);
  });

  test('Cancel goes back to the list and forgets the changes', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.clickFret(0, 4);
    b.typeName('Nope');
    b.click('cdBldCancelBtn');
    assert.equal(b.panel(), 'chooser');
    assert.deepEqual(b.log.saved, []);
    assert.deepEqual(b.dots(), []);
    assert.equal(b.builder.getState().name, 'CHORDNAME');
    b.open('Zq');
    assert.deepEqual(b.dots(), ['1/3/2']);
  });

  test('the delete button asks first; "no" leaves everything', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.answers.confirm = false;
    b.items().Zr.querySelector('[data-action="delete"]').click();
    assert.deepEqual(b.log.confirms, ['Delete definition for "Zr"?']);
    assert.deepEqual(b.log.saved, []);
    assert.deepEqual(b.listNames(), ['Zr', 'Zq']);
    assert.equal(b.panel(), 'chooser');
  });

  test('"yes" takes the definition out of the song and the list', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.items().Zr.querySelector('[data-action="delete"]').click();
    assert.deepEqual(b.log.saved, ['{title: Test}\n{define: Zq frets 0 3 0 0 fingers 0 2 0 0}\n[Zq]hi [Zr]there\n']);
    assert.deepEqual(b.listNames(), ['Zq']);
    assert.deepEqual(plain(b.builder.getDefinitions()).map((d) => d.name), ['Zq']);
    assert.equal(b.panel(), 'chooser', 'the builder stays shut');
  });

  test('a deleted chord\'s name is free to use again', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.items().Zr.querySelector('[data-action="delete"]').click();
    b.newChord();
    b.typeName('Zr');
    b.clickFret(0, 1);
    b.click('cdBldSaveBtn');
    assert.deepEqual(b.log.alerts, []);
    assert.match(b.state.song, /^\{define: Zr frets 1 0 0 0 fingers 0 0 0 0\}$/m);
    assert.deepEqual(b.listNames(), ['Zq', 'Zr']);
  });

  test('a chord with a muted string opens with a warning, through the host', () => {
    const b = mountBuilder('{define: Mute frets x 2 0 1}\n');
    b.open('Mute');
    assert.equal(b.log.alerts.length, 1);
    assert.match(b.log.alerts[0], /muted strings/);
    assert.equal(b.panel(), 'builder');
    assert.deepEqual(b.dots(), ['1/2/0', '3/1/0']);
  });

  test('a chord name with markup in it stays text, in the list and the output', () => {
    const name = 'Zz<img/src=x/data-injected=1>';
    const b = mountBuilder(`{define: ${name} frets 1 2 3 4}\n`);
    assert.deepEqual(b.listNames(), [name]);
    b.open(name);
    assert.equal(b.element.querySelectorAll('[data-injected]').length, 0);
    // (the builder cuts a name at 20 characters)
    assert.match(b.output(), /^\{define: Zz<img\/src=x\/data-in frets 1 2 3 4/);
  });

  test('reload() re-reads a song that changed elsewhere, and goes back to the list', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    b.state.song = '{define: Other frets 1 1 1 1}\n';
    b.builder.reload();
    assert.equal(b.panel(), 'chooser');
    assert.deepEqual(b.listNames(), ['Other']);
    assert.equal(b.builder.getState().isNew, true);
    assert.deepEqual(b.log.saved, []);
  });

  test('the whole way round: build a chord, add it, reopen it, and it is the same chord', () => {
    const b = mountBuilder('{title: Round trip}\n[C]la\n');
    b.newChord();
    b.typeName('Dm7');
    [[0, 2], [1, 2], [2, 1], [3, 3], [1, 1]].forEach(([string, fret]) => b.clickFret(string, fret));
    b.setStartingFret(3);
    const built = plain(b.builder.getState());
    b.click('cdBldSaveBtn');
    assert.equal(b.state.song, '{title: Round trip}\n{define: Dm7 frets 4 4 3 5 fingers 0 0 0 0 add: string 2 fret 3 finger 0}\n[C]la\n');

    b.open('Dm7');
    const reopened = plain(b.builder.getState());
    assert.equal(reopened.definition, built.definition);
    assert.equal(reopened.startingFret, 1, 'frets 3 to 5 fit a diagram that starts at 1');
    assert.deepEqual(b.errors, []);
  });

  test('mounting again starts over with the new host', () => {
    const b = mountBuilder(TWO_CHORDS);
    b.open('Zq');
    let song = '{define: Again frets 0 0 0 1}\n';
    const again = b.cb.mount(b.element, { getSong: () => song, setSong: (text) => { song = text; } });
    assert.deepEqual(plain(again.getDefinitions()).map((d) => d.name), ['Again']);
    assert.equal(again.getState().isNew, true);
    b.newChord();
    b.clickFret(0, 1);
    b.click('cdBldSaveBtn');
    assert.match(song, /define: CHORDNAME frets 1 0 0 0/);
    assert.deepEqual(b.log.saved, [], 'the first host hears nothing');
  });
});

describe('the Song-a-Matic as the builder\'s host', () => {
  const mountEditor = (song) => {
    const page = loadEditorPage({ body: '<div id="editor"></div><ul id="decoy"></ul>' });
    const { window, document } = page;
    const changes = [];
    window.ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), { song, onChange: (text) => changes.push(text) });
    return { ...page, changes, dialog: document.getElementById('cdBldDlg'), box: document.getElementById('chordProSource') };
  };

  test('the dialog is narrow for the list and wide for the fretboard', () => {
    const e = mountEditor(TWO_CHORDS);
    const narrow = () => e.dialog.classList.contains('ugsEditor-chordBuilderNarrow');
    e.document.getElementById('cdBldOpenBtn').click();
    assert.equal(narrow(), true);
    e.document.querySelector('#cdBldPick li.ugsEditor-newChord').click();
    assert.equal(narrow(), false);
    e.document.getElementById('cdBldCancelBtn').click();
    assert.equal(narrow(), true);
  });

  test('the song is the Edit Song box: a saved chord lands there, and the songsheet redraws', () => {
    const e = mountEditor(TWO_CHORDS);
    const cb = e.window.ugsChordBuilder;
    e.document.querySelector('#cdBldPick li.ugsEditor-newChord').click();
    cb.fretDots.toggleDot(new cb.entities.Dot(0, 2, 0));
    e.document.getElementById('cdBldSaveBtn').click();
    assert.match(e.box.value, /^\{define: CHORDNAME frets 2 0 0 0 fingers 0 0 0 0\}$/m);
    assert.deepEqual(e.changes, [e.box.value], 'onChange hears it, once');
  });

  test('the Chord Builder button re-reads a song edited in the Edit Song box', () => {
    const e = mountEditor(TWO_CHORDS);
    e.box.value = '{define: Typed frets 1 1 1 1}\n[Typed]la\n';
    e.document.getElementById('cdBldOpenBtn').click();
    assert.deepEqual(plain(e.window.ugsChordBuilder.chooserList.getDefinitions()).map((d) => d.name), ['Typed']);
  });

  test('deleting a definition leaves no blank line in the Edit Song box', () => {
    const e = mountEditor('{title: T}\n{define: Zq frets 0 3 0 0}\n[C]la\n');
    e.window.confirm = () => true;
    e.document.querySelector('#cdBldPick [data-action="delete"]').click();
    assert.equal(e.box.value, '{title: T}\n[C]la\n');
    assert.deepEqual(e.errors, []);
  });

  test('the builder looks only inside its dialog', () => {
    const e = mountEditor(TWO_CHORDS);
    const { host } = e.window.ugsChordBuilder;
    assert.equal(host.byId('cdBldPick', e.window.HTMLElement), e.dialog.querySelector('#cdBldPick'));
    assert.throws(() => host.byId('decoy', e.window.HTMLElement), /not found/);
    assert.throws(() => host.byId('chordProSource', e.window.HTMLElement), /not found/, 'not even the Edit Song box');
  });
});
