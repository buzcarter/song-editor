/**
 * A Node server rendering the editor's markup, typed by dist/markup.d.ts.
 * Only compiled (test/types.test.js), never run.
 */
import { editorHtml, escapeHtml } from '@ukegeeks/song-editor';
import markup = require('@ukegeeks/song-editor/markup');

const html: string = editorHtml({ canSave: true, imgUrl: '/img/editor/', title: 'T', body: '[C]x' });
const empty: string = editorHtml();
const safe: string = escapeHtml('a & b') + markup.escapeHtml(null);

// @ts-expect-error not an option
editorHtml({ save: true });

export { html, empty, safe };
