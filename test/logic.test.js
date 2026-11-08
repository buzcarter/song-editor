'use strict';
/**
 * The parts that are pure logic: reformat (chords-above-lyrics text to ChordPro), transpose,
 * and the Chord Builder's export (dots to a {define}). Run in the built bundle, like a page.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadEditorPage } = require('./helpers');

describe('reformat', () => {
  const { window } = loadEditorPage();
  const reformat = window.ugsEditorPlus.reformat;

  test('puts a chord line into the lyric line under it', () => {
    assert.equal(reformat.run('C       G\nHello world there'), '[C]Hello wo[G]rld there\n');
    assert.equal(reformat.hasChords(), true);
  });

  test('keeps the lyrics before an indented chord', () => {
    assert.equal(reformat.run('   Am\nI love you'), 'I l[Am]ove you\n');
  });

  test('pads a lyric line shorter than its chords', () => {
    // (the padding stays, as trailing spaces)
    assert.equal(reformat.run('C    G7\nHi'), '[C]Hi   [G7]  \n');
  });

  test('lines up chords and lyrics written with tabs (tab stops every 8 columns)', () => {
    assert.equal(reformat.run('C\tG\nHi\tthere\tyou'), '[C]Hi      [G]there   you\n');
    assert.equal(reformat.run('\tAm\tF\nOne\ttwo\tthree'), 'One     [Am]two     [F]three\n');
  });

  test('brackets a chord line with no lyrics under it', () => {
    assert.equal(reformat.run('C G\n\nla la'), '[C] [G] \n\nla la\n');
  });

  test('leaves a song without chord lines as it is', () => {
    const text = 'Just some words\nA day in the life';
    assert.equal(reformat.run(text), text + '\n');
    assert.equal(reformat.hasChords(), false);
  });

  test('makes four lines of tablature a tab block', () => {
    const tab = 'A|--0--|\nE|--2--|\nC|--1--|\nG|--0--|';
    assert.equal(reformat.run(tab + '\nla la'), '{start_of_tab}\n' + tab + '\n{end_of_tab}\nla la\n');
  });

  test('makes a tab block at the very end of the text', () => {
    const tab = 'A|--0--|\nE|--2--|\nC|--1--|\nG|--0--|';
    assert.equal(reformat.run(tab), '{start_of_tab}\n' + tab + '\n{end_of_tab}\n');
  });

  test('leaves three lines of tablature alone', () => {
    const tab = 'A|--0--|\nE|--2--|\nC|--1--|';
    assert.equal(reformat.run(tab), tab + '\n');
  });
});

describe('transpose', () => {
  const SONG = '{title: Up and Down}\n{key: C}\n[C]Hello [Am]there [G7]friend\n';

  const setup = (song = SONG) => {
    const page = loadEditorPage({ body: '<div id="editor"></div>' });
    page.window.ugsEditorPlus.songAmatic.mount(page.document.getElementById('editor'), { song });
    const source = page.document.getElementById('chordProSource');
    // picks a Transpose menu item, as a click does
    const pick = (value) => page.document.querySelector(`#transposeOptions a[href="#${value}"]`).parentElement.click();
    return { ...page, source, pick };
  };

  test('shifts the chords and the {key}', () => {
    const { source, pick, errors } = setup();
    pick('up_5');
    assert.equal(source.value, '{title: Up and Down}\n{key: F}\n[F]Hello [Dm]there [C7]friend\n');
    assert.deepEqual(errors, []);
  });

  test('counts each choice from the original, and "Original" restores it exactly', () => {
    const { source, pick } = setup();
    pick('up_2');
    assert.match(source.value, /\[D\]Hello \[Bm\]there \[A7\]friend/);
    pick('up_5');
    assert.match(source.value, /\[F\]Hello \[Dm\]there \[C7\]friend/, 'from C, not from D');
    pick('up_0');
    assert.equal(source.value, SONG);
  });

  test('labels the menu with the key each choice gives', () => {
    const { document } = setup();
    const label = (value) => document.querySelector(`#transposeOptions a[href="#${value}"] em`).textContent;
    assert.equal(label('up_0'), 'C');
    assert.equal(label('up_5'), 'F');
    assert.equal(label('down_3'), 'A');
  });

  test('asks first when some chords can\'t be transposed', () => {
    const song = '[C]one [Cmaj9]two\n';
    const { window, source, pick } = setup(song);
    const asked = [];

    window.confirm = (msg) => { asked.push(msg); return false; };
    pick('up_2');
    assert.equal(source.value, song, 'cancelled: unchanged');
    assert.match(asked[0], /Cmaj9/);

    window.confirm = () => true;
    pick('up_2');
    assert.equal(source.value, '[D]one [Cmaj9]two\n', 'the others shift; Cmaj9 stays');
  });

  test('Update makes the edited song the new original', () => {
    const { document, source, pick } = setup();
    source.value = '[G]Edited\n';
    document.getElementById('updateBtn').click();
    pick('up_2');
    assert.equal(source.value, '[A]Edited\n');
    pick('up_0');
    assert.equal(source.value, '[G]Edited\n');
  });
});

describe('Chord Builder export', () => {
  const { window } = loadEditorPage();
  const { entities, fretDots, export: exporter } = window.ugsChordBuilder;

  /** puts dots on the fretboard: [string (0 is G), fret on the diagram, finger] */
  const place = (...dots) => {
    fretDots.reset();
    dots.forEach(([string, fret, finger]) => fretDots.toggleDot(new entities.Dot(string, fret, finger)));
  };

  test('one dot: a C chord', () => {
    place([3, 3, 3]);
    assert.equal(exporter.getDefinition('C', 1), '{define: C frets 0 0 0 3 fingers 0 0 0 3}');
    // ([...x]: an array made in the page isn't deepEqual to one made here)
    assert.deepEqual([...exporter.getPrimaryFrets(1)], [0, 0, 0, 3]);
  });

  test('a starting fret moves every dot up the neck', () => {
    place([0, 1, 1], [1, 3, 3]);
    assert.equal(exporter.getDefinition('Hi', 5), '{define: Hi frets 5 7 0 0 fingers 1 3 0 0}');
  });

  test('a second dot on a string becomes an add:', () => {
    place([0, 1, 1], [0, 3, 3]);
    assert.equal(exporter.getDefinition('Two', 1), '{define: Two frets 3 0 0 0 fingers 3 0 0 0 add: string 1 fret 1 finger 1}');
  });

  test('cleans up the name', () => {
    place([3, 3, 3]);
    assert.match(exporter.getDefinition('  My  Chord ', 1), /^\{define: My-Chord frets/);
    assert.match(exporter.getDefinition('frets', 1), /^\{define: CHORDNAME frets/, 'a reserved word');
    assert.match(exporter.getDefinition('', 1), /^\{define: CHORDNAME frets/);
    assert.match(exporter.getDefinition('A'.repeat(30), 1), new RegExp(`^\\{define: ${'A'.repeat(20)} frets`), 'at most 20 characters');
  });

  test('getDefinitionHtml highlights the same text', () => {
    place([3, 3, 3]);
    const div = window.document.createElement('div');
    div.innerHTML = exporter.getDefinitionHtml('C', 1);
    assert.equal(div.textContent, exporter.getDefinition('C', 1));
    assert.equal(div.querySelector('.chordPro-string').textContent, 'C');
  });

  test('getDefinitionHtml shows a name with $ or quotes as it is', () => {
    place([3, 3, 3]);
    const div = window.document.createElement('div');
    for (const name of ['A$&B', "A'B", 'Q$$', 'R$`', '&']) {
      div.innerHTML = exporter.getDefinitionHtml(name, 1);
      assert.equal(div.textContent, exporter.getDefinition(name, 1), name);
    }
  });

  test('opening a {define} whose add: leaves out a value', () => {
    // opens the song's one {define} in the builder; returns its dots and what it would save
    const open = (define) => {
      const page = loadEditorPage({ body: '<div id="editor"></div>' });
      page.window.ugsEditorPlus.songAmatic.mount(page.document.getElementById('editor'), { song: define + '\n[Zq]hi\n' });
      page.document.querySelector('#cdBldPick li[data-id]:not(.newChord)').click();
      const cb = page.window.ugsChordBuilder;
      return {
        dots: [...cb.fretDots.getDots()].map((d) => `${d.string}/${d.fret}/${d.finger}`).sort(),
        output: page.document.getElementById('cdBldOutput').textContent,
        ...page,
      };
    };

    let opened = open('{define: Zq frets 0 3 0 0 fingers 0 2 0 0 add: string 2 finger 1}');
    assert.deepEqual(opened.dots, ['1/3/2'], 'no fret: dropped, and the real dot on its string kept');
    assert.equal(opened.output, '{define: Zq frets 0 3 0 0 fingers 0 2 0 0}');

    opened = open('{define: Zq frets 0 0 0 3 fingers 0 0 0 3 add: fret 2 finger 1}');
    assert.deepEqual(opened.dots, ['0/2/1', '3/3/3'], 'no string: the first string, as the songsheet draws it');

    opened = open('{define: Zq frets 0 0 0 3 fingers 0 0 0 3 add: string 4 fret 1}');
    assert.deepEqual(opened.dots, ['3/1/0', '3/3/3'], 'no finger: no number');
    assert.equal(opened.output, '{define: Zq frets 0 0 0 3 fingers 0 0 0 3 add: string 4 fret 1 finger 0}');
    assert.deepEqual(opened.errors, []);
  });

  test('a dot that had no string can be clicked off like any other', () => {
    const page = loadEditorPage({ body: '<div id="editor"></div>' });
    page.window.ugsEditorPlus.songAmatic.mount(page.document.getElementById('editor'), {
      song: '{define: Zq frets 0 0 0 3 fingers 0 0 0 3 add: fret 2 finger 1}\n[Zq]hi\n',
    });
    page.document.querySelector('#cdBldPick li[data-id]:not(.newChord)').click();
    const cb = page.window.ugsChordBuilder;
    cb.fretDots.toggleDot(new cb.entities.Dot(0, 2, 0)); // what clicking it with the dot tool does
    assert.deepEqual([...cb.fretDots.getDots()].map((d) => `${d.string}/${d.fret}`), ['3/3']);
  });

  test('sliding stops at the ends of the diagram', () => {
    place([0, 1, 1], [1, 4, 2]);
    assert.equal(fretDots.slide(-1), false, 'fret 1 can\'t go lower');
    assert.equal(fretDots.slide(1), true);
    assert.equal(fretDots.slide(1), false, 'fret 5 is the last');
    assert.deepEqual([...fretDots.getDots().map((d) => d.fret)].sort(), [2, 5]);
  });
});
