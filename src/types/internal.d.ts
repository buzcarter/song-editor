/**
 * Declarations the editor's sources need but the package doesn't ship: the globals other
 * scripts on the page provide, and the editor's internal parts.
 */

/**
 * Song Formatter's browser bundle (@ukegeeks/song-formatter/browser), with two of its declarations
 * corrected (see SongFormatterFixes below). Types only: the running code is Song Formatter's.
 */
declare var ukeGeeks: SongFormatterFixes.UkeGeeks;

/**
 * Corrections to @ukegeeks/song-formatter 1.0.0-beta.1's declarations, where they're narrower than
 * what its code accepts. Each one should move into Song Formatter's own .d.ts; then delete it here.
 */
declare namespace SongFormatterFixes {
  type Original = typeof import('@ukegeeks/song-formatter').ukeGeeks;
  type PlotArgs = Parameters<InstanceType<Original['chordBrush']>['plot']>;

  /**
   * toolsLite's class helpers ask for an HTMLDivElement, but they only call `ele.classList`,
   * so any element works.
   */
  interface ToolsLite extends Omit<Original['toolsLite'], 'addClass' | 'removeClass' | 'setClass'> {
    addClass(ele: Element, className: string): void;
    removeClass(ele: Element, className: string): void;
    setClass(ele: Element, className: string, toggle: boolean): void;
  }

  /**
   * ChordBrush.plot() takes the fonts as their own argument, so the FretBox it's given
   * doesn't need `fonts` (FretBox's type requires it).
   */
  interface ChordBrush extends Omit<InstanceType<Original['chordBrush']>, 'plot'> {
    plot(
      chordBox: PlotArgs[0],
      chord: PlotArgs[1],
      fretBox: Omit<PlotArgs[2], 'fonts'>,
      fontSettings?: PlotArgs[3],
      colorSettings?: PlotArgs[4]
    ): void;
  }

  interface UkeGeeks extends Omit<Original, 'toolsLite' | 'chordBrush'> {
    toolsLite: ToolsLite;
    chordBrush: new () => ChordBrush;
  }
}

/** The Ace editor, from @ukegeeks/ace-chordpro-extension's ace-chordpro.min.js (loaded by Fullscreen) */
declare var ace: {
  edit(elementId: string): AceEditor;
};

/** The parts of Ace's Editor that Fullscreen uses (src/js/editor/resize.ts) */
interface AceEditor {
  setTheme(theme: string): void;
  getSession(): { setMode(mode: string): void };
  setOptions(options: Record<string, unknown>): void;
  setValue(text: string, cursorPos?: number): string;
  getValue(): string;
  on(eventName: 'change', handler: () => void): void;
  gotoLine(lineNumber: number, column?: number, animate?: boolean): void;
}

/** src/js/libs/lazyload.js (https://github.com/rgrove/lazyload/) */
declare var LazyLoad: {
  css(urls: string | string[], callback?: (obj?: unknown) => void, obj?: unknown, context?: unknown): void;
  js(urls: string | string[], callback?: (obj?: unknown) => void, obj?: unknown, context?: unknown): void;
};

/** CommonJS, for src/markup.ts's UMD wrapper (Node) */
declare var module: { exports: Partial<typeof import('./markup')> } | undefined;

/**
 * The editor's internal parts are on the same global as the public API (src/types/ugsEditorPlus.d.ts).
 * Each source file declares its part at the top, then assigns it: `ugsEditorPlus.actions = (function() {...})();`
 */
declare namespace UgsEditorPlus {
  /** A song read by Song Formatter */
  type Song = import('@ukegeeks/song-formatter').Song;
}
