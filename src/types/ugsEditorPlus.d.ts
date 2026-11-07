/**
 * Types for the Song-a-Matic editor's browser bundle (dist/js/ugsEditorPlus.min.js),
 * which defines the globals `ugsEditorPlus` and `ugsChordBuilder`.
 *
 * Shipped as dist/ugsEditorPlus.d.ts. In a host page's TypeScript:
 *
 *   /// <reference types="@ukegeeks/song-editor/browser" />
 *   const editor = ugsEditorPlus.songAmatic.mount(container, { song, save });
 *
 * Only the parts host pages use are described here; the editor's internal parts are
 * on the same globals, but aren't an API.
 */

declare namespace UgsEditorPlus {
  /** Features you can turn on or off; see src/js/editor/ugsEditorPlus.options.ts */
  interface Options {
    /** Compatibility for Internet Explorer before IE9. Default `false`. */
    useLegacyIe: boolean;
    /** Folder (with a trailing slash) holding ace-chordpro.min.js. Default `''`: "ace/" next to ugsEditorPlus.min.js. */
    aceUrl: string;
    /** Show the Edit Song box when the page loads. Default `true`. */
    showEditOnLoad: boolean;
    /** Lyrics font size in points: 6, 6.5, 7, 7.5, 8, 8.5, 9, 10, 11, 12, 13, 14. Default `12`. */
    fontSize: number;
    /** Reference diagram size in percent: 40, 65, 80, 90, 100. Default `100`. */
    diagramSize: number;
    /** Where the reference diagrams go. Default `'left'`. */
    diagramPosition: 'left' | 'top' | 'none';
    /** How chord names in the lyrics are shown. Default `'above'`. */
    lyricStyle: 'inline' | 'above' | 'miniDiagrams';
    /** Page width (mock paper). Default `'letter'`. */
    paper: 'letter' | 'a4' | 'screen';
    /**
     * Color theme: frosty, jellyBean, justBlack, krampus, normal, notebook, pumpkin, reversed,
     * western, zombie. Default `'normal'`.
     */
    theme: string;
    /** Tuning for the diagrams: GCEA, DGBE or ADF#B. Default `'soprano'`. */
    tuning: 'soprano' | 'baritone' | 'alternate';
    /** Hide the square brackets around chord names in the lyrics, ex: [Am]. Default `false`. */
    hideChordEnclosures: boolean;
    /** Sort the reference diagrams alphabetically instead of in song order. Default `false`. */
    sortAlphabetical: boolean;
    /** Leave the `commonChords` out of the reference diagrams. Default `false`. */
    ignoreCommonChords: boolean;
    /** Chords left out when `ignoreCommonChords` is on: `['A', 'G']` or `'A, G'`. */
    commonChords: string | string[];
  }

  /**
   * The host's save callback: takes the ChordPro text and returns the message to show next to
   * the Save button (or a promise of one); nothing shows "Saved.". A rejection shows the
   * "problem saving" alert.
   */
  type SaveHandler = (song: string) => SaveResult | PromiseLike<SaveResult>;
  type SaveResult = string | null | undefined | void;

  interface MountOptions extends Partial<Options> {
    /** The ChordPro text to open. Default `''`. */
    song?: string;
    /** Without it there's no Save button. */
    save?: SaveHandler;
    /** Folder holding the editor images. Default "../img/editor/" from the bundle's folder. */
    imgUrl?: string;
  }

  /** What `mount()` returns */
  interface Editor {
    /** The ChordPro text in the Edit Song box */
    getSong(): string;
  }

  interface SongAmatic {
    /** Runs the editor on markup already on the page (see `editorHtml()`). */
    init(options?: Partial<Options>): void;
    /** Writes the editor into `container` (an empty element) and renders the song. */
    mount(container: HTMLElement, options?: MountOptions): Editor;
  }

  interface UpdateSong {
    /** Saves by posting to the UkeGeeks Songbook server (Songbook 1.5 pages). */
    init(ajaxUri: string, filename: string): void;
    /** Wires the Save button to a save callback (server-rendered pages). */
    setSaveHandler(save: SaveHandler): void;
  }

  type Markup = typeof import('./markup');

  /** "fast" (200ms), "normal" (400ms), "slow" (600ms), or milliseconds */
  type Speed = number | string;

  /** Tiny DOM helpers; the Songbook's song list page uses them too. */
  interface Dom {
    one<E extends HTMLElement = HTMLElement>(selector: string, context?: ParentNode | null): E | null;
    all<E extends HTMLElement = HTMLElement>(selector: string, context?: ParentNode | null): E[];
    on(target: string | EventTarget | null | (EventTarget | null)[], eventName: string, handler: (e: any) => void): void;
    isVisible(ele: Element | null | undefined): boolean;
    animate(ele: HTMLElement, props: Record<string, string | [string, string]>, speed?: Speed, onDone?: () => void): object;
    show(ele: HTMLElement | null | undefined): void;
    hide(ele: HTMLElement | null | undefined): void;
    toggle(ele: HTMLElement | null | undefined, isShow: unknown): void;
    fadeIn(ele: HTMLElement | null | undefined, speed?: Speed): void;
    fadeOut(ele: HTMLElement | null | undefined, speed?: Speed): void;
    fadeToggle(ele: HTMLElement, speed?: Speed): void;
    slideDown(ele: HTMLElement | null | undefined, speed?: Speed): void;
    /** Makes a positioned dialog draggable by its handle (default: the whole element). */
    draggable(ele: HTMLElement, handleSelector?: string): void;
    /** POSTs `data` as JSON and resolves with the JSON response. */
    postJson(uri: string, data: unknown): Promise<any>;
    /** Fires a CustomEvent on document. */
    trigger(eventName: string, detail?: unknown): void;
  }
}

interface UgsEditorPlus {
  options: UgsEditorPlus.Options;
  songAmatic: UgsEditorPlus.SongAmatic;
  updateSong: UgsEditorPlus.UpdateSong;
  markup: UgsEditorPlus.Markup;
  dom: UgsEditorPlus.Dom;
}

/** The Chord Builder (its dialog is part of the editor). */
interface UgsChordBuilder {
  version: string;
}

declare var ugsEditorPlus: UgsEditorPlus;
declare var ugsChordBuilder: UgsChordBuilder;
