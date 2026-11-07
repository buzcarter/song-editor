/**
 * The Song-a-Matic editor's page markup, for server-rendered pages (Node):
 *
 *   const { editorHtml } = require('@ukegeeks/song-editor');
 *
 * The browser bundle has the same functions as `ugsEditorPlus.markup`.
 *
 * Shipped as dist/markup.d.ts; src/markup.ts is checked against it.
 */

export interface EditorHtmlOptions {
  /** Show the Save button (and the Edit Song dialog on load). Default `false`. */
  canSave?: boolean;
  /** Folder holding the editor images, with a trailing slash. Default `'img/editor/'`. */
  imgUrl?: string;
  /** Song title, pre-rendered into the songsheet */
  title?: string;
  subtitle?: string;
  artist?: string;
  album?: string;
  /** The ChordPro text */
  body?: string;
}

/**
 * The editor's HTML. Every value is HTML-escaped; existing entities such as `&amp;` are kept.
 */
export declare function editorHtml(options?: EditorHtmlOptions): string;

/**
 * Escapes `& < > " '`, leaving existing entities alone. `null`, `undefined` and `false` give `''`.
 */
export declare function escapeHtml(value: unknown): string;
