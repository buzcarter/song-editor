/**
 * Declarations the editor's sources need but the package doesn't ship: the globals other
 * scripts on the page provide, and the editor's internal parts.
 */

/** Song Formatter's browser bundle (@ukegeeks/song-formatter/browser) */
declare var ukeGeeks: typeof import('@ukegeeks/song-formatter').ukeGeeks;

/** The Ace editor, from @ukegeeks/ace-chordpro-extension's ace-chordpro.min.js (loaded by Fullscreen) */
declare var ace: {
  edit(elementId: string): AceEditor;
};

interface AceEditor {
  [key: string]: any;
}

/** src/js/libs/lazyload.js (https://github.com/rgrove/lazyload/) */
declare var LazyLoad: {
  css(urls: string | string[], callback?: (obj?: unknown) => void, obj?: unknown, context?: unknown): void;
  js(urls: string | string[], callback?: (obj?: unknown) => void, obj?: unknown, context?: unknown): void;
};

/** CommonJS, for src/markup.ts's UMD wrapper (Node) */
declare var module: { exports: unknown } | undefined;
