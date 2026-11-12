/**
 * A page with only the Chord Builder on it, typed by dist/ugsChordBuilder.d.ts.
 * Only compiled (test/types.test.js), never run.
 */
/// <reference types="@ukegeeks/song-editor/chord-builder" />

const songBox = document.querySelector('textarea')!;

const builder: UgsChordBuilder.Builder | null = ugsChordBuilder.mount(document.getElementById('chordBuilder')!, {
  getSong: () => songBox.value,
  setSong: (text: string) => { songBox.value = text; },
});

// every part of the host that's optional
ugsChordBuilder.mount(document.body, {
  getSong: () => '',
  setSong: () => {},
  confirm: (message) => message.length > 0,
  alert: (message) => { document.title = message; },
  onPanelChange: (panel) => { document.body.dataset.panel = panel satisfies 'chooser' | 'builder'; },
  cursorImageUri: '/img/hand-cursor.png',
});

if (builder) {
  const state: UgsChordBuilder.State = builder.getState();
  const tool: 'dots' | 'fingers' = state.tool;
  const frets: number[] = state.dots.map((dot: UgsChordBuilder.Dot) => dot.fret + state.startingFret - 1);
  const names: string[] = builder.getDefinitions().map((definition) => `${definition.id}: ${definition.name}`);
  builder.reload();
  console.log(tool, frets, names, state.isNew, state.definition);
}

// the parts that need no page
const found: UgsChordBuilder.SongDefinition[] = ugsChordBuilder.songDefinitions.find('{define: C frets 0 0 0 3}');
const song: string = ugsChordBuilder.songDefinitions.add('{title: x}', '{define: C frets 0 0 0 3}');
const dot: UgsChordBuilder.Dot = new ugsChordBuilder.entities.Dot(3, 3, 3);
ugsChordBuilder.fretDots.toggleDot(dot);
const definition: string = ugsChordBuilder.export.getDefinition('C', 1);
const where: UgsChordBuilder.Position = ugsChordBuilder.tracking.toPosition(dot);
const chord: UgsChordBuilder.SourceChord | null = ugsChordBuilder.chordReader.read(definition);
const laidOut: UgsChordBuilder.BuilderChord | null = chord && ugsChordBuilder.chordReader.toBuilder(chord);
ugsChordBuilder.settings.fretBoard.stringNames = ['D', 'G', 'B', 'E'];

// @ts-expect-error a host must say where the song is
ugsChordBuilder.mount(document.body, { setSong: () => {} });
// @ts-expect-error mount() picks the root itself
ugsChordBuilder.mount(document.body, { root: document.body, getSong: () => '', setSong: () => {} });
// @ts-expect-error not a panel
const panel: UgsChordBuilder.Panel = 'list';
// @ts-expect-error the state is read, not set
builder?.setState({});

export { found, song, where, laidOut, panel };
