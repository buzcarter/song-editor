/**
 * The Chord Builder demo: this page is the builder's host. It keeps the song in a textarea
 * and shows everything the builder tells it.
 */
(function () {
  'use strict';

  const songBox = document.getElementById('demoSong');
  const stateBox = document.getElementById('demoState');
  const logList = document.getElementById('demoLog');

  songBox.value = [
    '{title: Defining Extra Chords}',
    '{artist: Chord Builder demo}',
    '{define: G-alt frets 4 2 3 2 fingers 3 1 2 1}',
    '{define: C-2pos frets 9 7 8 7}',
    '{define: Dm7 frets 2 2 1 3 fingers 2 3 1 4}',
    '',
    '[Dm7]Pick a chord from the list, [G-alt]or add a new one.',
    '[C-2pos]Its definition lands up here.',
    '',
  ].join('\n');

  const log = (text) => {
    const item = document.createElement('li');
    item.textContent = text;
    logList.prepend(item);
    while (logList.children.length > 8) {
      logList.lastChild.remove();
    }
  };

  const showState = (state) => {
    stateBox.textContent = JSON.stringify(state, (key, value) => (key === 'dots'
      ? value.map((dot) => `string ${dot.string} fret ${dot.fret} finger ${dot.finger}`)
      : value), 2);
  };

  const builder = ugsChordBuilder.mount(document.getElementById('chordBuilder'), {
    getSong: () => songBox.value,
    setSong: (text) => {
      songBox.value = text;
      log('setSong: the song changed');
    },
    onPanelChange: (panel) => log(`onPanelChange: ${panel}`),
    onStateChange: showState,
    cursorImageUri: 'dist/img/editor/hand-cursor.png',
  });

  if (!builder) {
    stateBox.textContent = 'This browser has no canvas.';
    return;
  }
  showState(builder.getState());

  document.getElementById('demoReload').addEventListener('click', () => {
    builder.reload();
    log(`reload(): ${builder.getDefinitions().length} definitions`);
  });
}());
