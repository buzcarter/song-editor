/**
 * The Song-a-Matic editor's page markup: the songsheet, the Edit Song dialog,
 * the toolbar and its menus, Help, the Reformat dialog and the Chord Builder.
 *
 * Works in two places:
 *   - Node: `require('@ukegeeks/song-editor/markup').editorHtml(...)`, for
 *     server-rendered pages (the Songbook's server and static build).
 *   - The browser bundle: `ugsEditorPlus.markup.editorHtml(...)`, used by
 *     `ugsEditorPlus.songAmatic.mount()`.
 *
 * Every value is HTML-escaped. Existing entities are left alone (like PHP's
 * htmlspecialchars with double_encode=false), because ChordPro files can
 * contain them ("Lyrics &amp; Music &copy; 1933").
 */
(function (root: typeof globalThis, factory: () => typeof import('./types/markup')) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    // Named again so Node's `import { editorHtml } from '@ukegeeks/song-editor'` works: Node finds a
    // CommonJS file's names by reading its source for `module.exports.name =`, not by running it.
    module.exports.editorHtml = api.editorHtml;
    module.exports.escapeHtml = api.escapeHtml;
  } else {
    root.ugsEditorPlus = root.ugsEditorPlus || ({} as UgsEditorPlus);
    root.ugsEditorPlus.markup = api;
  }
}(typeof self !== 'undefined' ? self : this, () => {
  type EditorHtmlOptions = import('./types/markup').EditorHtmlOptions;

  const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // "&" that does NOT already start an entity like &amp; &copy; &#39; &#x2665;
  const BARE_AMP_OR_SPECIAL = /&(?!#\d+;|#x[0-9a-f]+;|[a-z][a-z0-9]*;)|[<>"']/gi;

  const esc = (value: unknown) => (value === null || value === undefined || value === false
    ? ''
    : String(value).replace(BARE_AMP_OR_SPECIAL, (c) => ESCAPES[c]));

  // The Edit Song box gets every "&" escaped, so it holds the song's exact text: a song with
  // "&amp;" shows (and saves) "&amp;", not "&". (Song Formatter keeps entities when it draws the song.)
  const ALL_SPECIAL = /[&<>"']/g;

  const escText = (value: unknown) => (value === null || value === undefined || value === false
    ? ''
    : String(value).replace(ALL_SPECIAL, (c) => ESCAPES[c]));

  // The page markup, from src/templates/editor.html. scripts/build.js swaps the placeholder below
  // for the file's text, so there is nothing to load at run time (Node and the browser bundle alike).
  const EDITOR_TEMPLATE = '__EDITOR_TEMPLATE__';

  type TemplateModel = Record<string, unknown>;

  /**
   * Fills in a template:
   *   {{name}}         the value, HTML-escaped (existing entities kept)
   *   {{name|text}}    the value, every "&" escaped: the exact text, for a textarea
   *   {{#if name}}…{{/if}} and {{#unless name}}…{{/unless}}   the block only when the value is truthy / falsy
   * Blocks do not nest. Values are inserted in a single pass, so "{{" inside a song is left alone.
   */
  const render = (template: string, model: TemplateModel) => template
    .replace(/\{\{#(if|unless) (\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      (_, kind: string, key: string, block: string) => (Boolean(model[key]) === (kind === 'if') ? block : ''))
    .replace(/\{\{(\w+)(\|text)?\}\}/g, (_, key: string, text?: string) => (text ? escText : esc)(model[key]));

  const displayStyle = (value: string | undefined) => (value && value.length > 0 ? 'block' : 'none');

  /**
   * @param {object} [options]
   * @param {boolean} [options.canSave=false] show the Save button (and the Edit Song dialog on load)
   * @param {string} [options.imgUrl='img/editor/'] folder holding the editor images, with a trailing slash
   * @param {string} [options.title] song title, pre-rendered into the songsheet
   * @param {string} [options.subtitle]
   * @param {string} [options.artist]
   * @param {string} [options.album]
   * @param {string} [options.body] the ChordPro text
   * @return {string} HTML
   */
  const editorHtml = (options?: EditorHtmlOptions) => {
    const o = Object.assign({ canSave: false, imgUrl: 'img/editor/' }, options);
    return render(EDITOR_TEMPLATE, {
      ...o,
      subtitleDisplay: displayStyle(o.subtitle),
      artistDisplay: displayStyle(o.artist),
      albumDisplay: displayStyle(o.album),
    });
  };

  return { editorHtml, escapeHtml: esc };
}));
