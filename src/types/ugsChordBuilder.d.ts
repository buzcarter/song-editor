/**
 * Types for the Chord Builder (the global `ugsChordBuilder`): a canvas editor that makes
 * ChordPro `{define: ...}` chord definitions and keeps them in a song's text.
 *
 * Shipped as dist/ugsChordBuilder.d.ts. The Chord Builder is in the editor's bundle
 * (dist/js/ugsEditorPlus.min.js) and also on its own (dist/js/ugsChordBuilder.min.js):
 *
 *   /// <reference types="@ukegeeks/song-editor/chord-builder" />
 *   const builder = ugsChordBuilder.mount(container, {
 *     getSong: () => textarea.value,
 *     setSong: (text) => { textarea.value = text; },
 *   });
 *
 * Its parts, from the inside out. Each layer only uses the ones above it:
 *
 *   1. Model, no page needed    entities, settings, tracking, fretDots, export, html
 *   2. Text, no page needed     songDefinitions (the song's text), chordReader (Song Formatter's chords)
 *   3. The outside world        host: the one place the builder reaches the page and the song
 *   4. Drawing                  chordCanvas, cursorCanvas
 *   5. The two panels           chooserList, editorUi
 *   6. Starting it              mount()
 *
 * Needs Song Formatter's browser bundle (the `ukeGeeks` global) on the page, to read a
 * `{define}` and to draw the list's small diagrams.
 */

declare namespace UgsChordBuilder {
  // ------------------------------------------------------------------
  // 1. Model
  // ------------------------------------------------------------------

  /** A point on the canvas, in pixels */
  interface Position {
    x: number;
    y: number;
  }

  interface Dimensions {
    width: number;
    height: number;
  }

  /** A rectangle on the canvas */
  interface BoundingBox extends Position, Dimensions {
  }

  /**
   * A finger dot on the builder's fretboard.
   * `fret` counts on the diagram, 1 to `settings.fretBoard.numFrets`, not on the instrument:
   * with a starting fret of 5, `fret: 1` is the instrument's fret 5.
   */
  interface Dot {
    /** 0 is the first string (G on a GCEA uke) */
    string: number;
    /** on the diagram; 0 in toggleDot() means "clear this string" */
    fret: number;
    /** 1 index, 2 middle, 3 ring, 4 pinkie; 0 for no finger number */
    finger: number;
  }

  /** One string's dots (see export) */
  interface StringDots {
    /** counts from 1 here, unlike Dot.string */
    string: number;
    dots: Dot[];
  }

  /** Constructors for the model's values */
  interface Entities {
    /** with no size it's 1 x 1 */
    BoundingBox: new (pos?: Position | null, dimensions?: Dimensions) => BoundingBox;
    Dot: new (string: number, fret?: number, finger?: number) => Dot;
    Position: new (x?: number, y?: number) => Position;
  }

  interface Font {
    fontFamily: string;
    /** pixels */
    fontSize: number;
  }

  /** Sizes, colors and limits. Change them before the builder starts. */
  interface Settings {
    /** top left of the fretboard */
    anchorPos: Position;
    cursor: { fillColor: string, strokeWidth: number, strokeColor: string, radius: number, imageUri: string };
    fretBoard: { numFrets: number, maxFret: number, stringNames: string[], strokeWidth: number, strokeColor: string, fretSpace: number, stringSpace: number };
    dot: Font & { fillColor: string, radius: number, strokeWidth: number, strokeColor: string, fontWeight: string, fontColor: string };
    fretLabel: Font & { color: string, lightColor: string };
    stringLabel: Font & { color: string };
    chord: { nameMaxLength: number };
    /** size of the box around one fret on one string */
    targetDimensions(): Dimensions;
    targetAnchorPos(): Position;
    /** centers the fretboard on a canvas of this size */
    centerAnchor(canvas: Dimensions): void;
  }

  /** Turns a spot on the canvas into a spot on the fretboard */
  interface Tracking {
    /** the string and fret under this point (fret 0: above the nut), or null when off the board */
    toDot(pos: Position): Dot | null;
    /** the middle of this dot on the canvas: the opposite of toDot() */
    toPosition(dot: Dot): Position;
  }

  /** The dots on the fretboard: the chord being built */
  interface FretDots {
    /** a copy of the list */
    getDots(): Dot[];
    /** moves every dot numSteps frets; false (and nothing moves) if one would fall off the board */
    slide(numSteps: number): boolean;
    /** adds the dot, or removes the one already there; fret 0 clears the string */
    toggleDot(dot: Dot): void;
    /** sets the finger of the dot at this spot (or clears it, when it has that finger); false if no dot is there */
    toggleFinger(dot: Dot, finger: number): boolean;
    reset(): void;
  }

  /** Turns the dots on the fretboard into a ChordPro chord definition */
  interface Export {
    /** per string, the highest fret on the instrument with a dot (0: open) */
    getPrimaryFrets(startingFret: number): number[];
    /** the ChordPro `{define: ...}` tag */
    getDefinition(chordName: string, startingFret: number): string;
    /** getDefinition(), syntax-highlighted (the name is HTML-escaped) */
    getDefinitionHtml(chordName: string, startingFret: number): string;
  }

  interface Html {
    /** Text made safe to put in markup: `&`, `<`, `>`, `"` and `'` escaped */
    escape(text: string): string;
  }

  // ------------------------------------------------------------------
  // 2. Text
  // ------------------------------------------------------------------

  /** A `{define: ...}` found in a song */
  interface SongDefinition {
    name: string;
    /** the whole line it's on */
    definition: string;
  }

  /** The song's text and its chord definitions. Plain text in, plain text out. */
  interface SongDefinitions {
    /** every `{define: ...}` line that has `frets`, in the song's order */
    find(text: string): SongDefinition[];
    /** the song with this definition added after its last title, artist... or define line (at the top if it has none) */
    add(text: string, definition: string): string;
    /** the song with one definition swapped for another, both taken as plain text */
    replace(text: string, oldDefinition: string, newDefinition: string): string;
    /** the song without this definition's line */
    remove(text: string, definition: string): string;
  }

  /** A dot as Song Formatter reads it from a `{define}`: an `add:` may leave out a value (null) */
  interface SourceDot {
    string: number | null;
    /** on the instrument */
    fret: number | null;
    finger: number | null;
  }

  /** A chord as Song Formatter reads it (its `Chord`) */
  interface SourceChord {
    name: string;
    dots: SourceDot[];
    /** per string, true when it isn't played */
    muted?: boolean[];
  }

  /** A chord laid out for the builder's fretboard */
  interface BuilderChord {
    name: string;
    /** the instrument's fret shown as the diagram's first */
    startingFret: number;
    /** frets counted on the diagram */
    dots: Dot[];
  }

  /** Reads chords for the builder */
  interface ChordReader {
    /** A `{define: ...}` line as a chord (Song Formatter's reading), or null when it can't be read */
    read(definition: string): SourceChord | null;
    /**
     * The chord on the builder's fretboard: the starting fret that shows its highest dot, and
     * its dots counted from there. Dots that don't fit are left out: one with no fret, and one
     * below the starting fret.
     */
    toBuilder(chord: SourceChord): BuilderChord;
    /** The builder can't show muted strings: saving such a chord loses them */
    hasMutedStrings(chord: SourceChord): boolean;
  }

  // ------------------------------------------------------------------
  // 3. The outside world
  // ------------------------------------------------------------------

  /** Which of the builder's two panels is showing */
  type Panel = 'chooser' | 'builder';

  /**
   * Everything the Chord Builder needs from the page it's on. The builder reads and changes
   * the song only through `getSong()` and `setSong()`, and looks elements up only inside `root`.
   */
  interface Host {
    /** Holds the builder's markup. Default: the whole document. */
    root?: ParentNode;
    /** The song's ChordPro text, as it is now */
    getSong(): string;
    /** The song with a definition added, changed or removed: keep it, and redraw whatever shows it */
    setSong(text: string): void;
    /** Asks before deleting a definition. Default: `window.confirm`. */
    confirm?(message: string): boolean;
    /** Says a name is taken, or a chord has muted strings. Default: `window.alert`. */
    alert?(message: string): void;
    /** Called when the builder switches between its list and its fretboard, e.g. to resize a dialog */
    onPanelChange?(panel: Panel): void;
    /**
     * Called each time what the builder panel holds changes: a dot, a finger, the name, the
     * starting fret, the tool, or a chord opened or cleared. For a host that shows the chord
     * somewhere else as it's built.
     */
    onStateChange?(state: State): void;
    /** The Set Fingers tool's cursor picture. Default: `settings.cursor.imageUri`. */
    cursorImageUri?: string;
  }

  /** The host in use, with its defaults filled in. The builder's own parts call this, never the page. */
  interface HostBridge {
    /** Sets the host; the panels' init() and mount() call it */
    use(host: Host): void;
    /** The element with this id inside the host's root; throws if it's missing or isn't a `type` */
    byId<T extends Element>(id: string, type: new () => T): T;
    getSong(): string;
    setSong(text: string): void;
    confirm(message: string): boolean;
    alert(message: string): void;
    panelChanged(panel: Panel): void;
    stateChanged(state: State): void;
  }

  // ------------------------------------------------------------------
  // 4. Drawing
  // ------------------------------------------------------------------

  /** Draws the cursor (a dot, or the hand with its finger number) on the top canvas */
  interface CursorCanvas {
    init(ctx: CanvasRenderingContext2D): void;
    setCursor(isDot: boolean, finger: number): void;
    draw(pos: Position): void;
  }

  /** Draws the fretboard, its labels and the dots on the bottom canvas */
  interface ChordCanvas {
    init(ctx: CanvasRenderingContext2D, ele: HTMLCanvasElement): void;
    /** `dots` defaults to fretDots.getDots() */
    draw(pos: Position, startingFret: number, dots?: Dot[]): void;
  }

  // ------------------------------------------------------------------
  // 5. The two panels
  // ------------------------------------------------------------------

  /** A `{define}` in the chooser's list; its list item has the same id (data-id) */
  interface ChordDefinition extends SongDefinition {
    id: number;
  }

  /** What the builder's Add/Update button saves */
  interface SaveData {
    name: string;
    startingFret: number;
    dots: Dot[];
    definition: string;
  }

  /** The first panel: the list of the song's chord definitions */
  interface ChooserList {
    /** Lists the song's chord definitions; `setChordFunction` opens one in the builder (null: a new chord) */
    init(setChordFunction: (chord: SourceChord | null) => void): void;
    /** Re-reads the song's definitions */
    reset(): void;
    /** Shows the chooser (true) or the builder (false) */
    show(isChooserPanel: boolean): void;
    /** Adds or updates the definition in the song; false if the name is taken */
    save(data: SaveData): boolean;
    /** The definitions listed, in the list's order (a copy) */
    getDefinitions(): ChordDefinition[];
    /** The definition open in the builder; null for a new chord */
    getCurrent(): ChordDefinition | null;
  }

  /** What the builder panel holds right now */
  interface State {
    /** as typed; `definition` has the cleaned-up name */
    name: string;
    startingFret: number;
    /** frets counted on the diagram */
    dots: Dot[];
    tool: 'dots' | 'fingers';
    /** the finger the Set Fingers tool sets: 0 (none) to 4 */
    finger: number;
    /** true: Add makes a new definition; false: Update changes the one that was opened */
    isNew: boolean;
    /** the `{define: ...}` Add/Update would save */
    definition: string;
  }

  /** The second panel: the fretboard, toolbox, name and starting fret */
  interface EditorUi {
    /** Wires the panel up; false when the browser has no canvas */
    init(host: Host): boolean;
    /** Back to a new chord, showing the chooser with the song's definitions re-read */
    reload(): void;
    getState(): State;
  }

  // ------------------------------------------------------------------
  // 6. Starting it
  // ------------------------------------------------------------------

  /** What mount() returns */
  interface Builder {
    /** Back to the list, with the song's definitions re-read: call it when the song changed elsewhere */
    reload(): void;
    getState(): State;
    getDefinitions(): ChordDefinition[];
  }
}

/** The Chord Builder (the global `ugsChordBuilder`) */
interface UgsChordBuilder {
  /** The Chord Builder's own version number (not the package's) */
  version: string;

  entities: UgsChordBuilder.Entities;
  settings: UgsChordBuilder.Settings;
  tracking: UgsChordBuilder.Tracking;
  fretDots: UgsChordBuilder.FretDots;
  export: UgsChordBuilder.Export;
  html: UgsChordBuilder.Html;

  songDefinitions: UgsChordBuilder.SongDefinitions;
  chordReader: UgsChordBuilder.ChordReader;

  host: UgsChordBuilder.HostBridge;

  cursorCanvas: UgsChordBuilder.CursorCanvas;
  chordCanvas: UgsChordBuilder.ChordCanvas;

  chooserList: UgsChordBuilder.ChooserList;
  editorUi: new () => UgsChordBuilder.EditorUi;

  /** The builder's markup: both panels, no dialog around them */
  markup: string;
  /**
   * Puts the Chord Builder in `element` (replacing what's there) and starts it.
   * Returns null when the browser has no canvas. One builder per page.
   */
  mount(element: HTMLElement, host: Omit<UgsChordBuilder.Host, 'root'>): UgsChordBuilder.Builder | null;
}

declare var ugsChordBuilder: UgsChordBuilder;
