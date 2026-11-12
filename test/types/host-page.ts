/**
 * A host page like UkeGeeks Studio's: the bundle's globals, typed by dist/ugsEditorPlus.d.ts.
 * Only compiled (test/types.test.js), never run.
 */
/// <reference types="@ukegeeks/song-editor/browser" />

const editor: UgsEditorPlus.Editor = ugsEditorPlus.songAmatic.mount(document.getElementById('songEditor')!, {
  song: '{title: Hello}\n[C]Hello [G7]world',
  aceUrl: 'vendor/ace/',
  imgUrl: '/img/editor/',
  fontSize: 14,
  tuning: 'baritone',
  commonChords: ['A', 'G'],
  save: async (text: string) => `Saved ${text.length} characters.`,
  onChange: (text) => { document.title = `${text.length} characters, edited`; },
});
const text: string = editor.getSong();
const saved: Promise<boolean> = editor.save();

// a save callback with no message
ugsEditorPlus.songAmatic.mount(document.body, { save: async () => {} });
ugsEditorPlus.songAmatic.mount(document.body);

// Songbook 1.5 pages and server-rendered pages
ugsEditorPlus.songAmatic.init({ showEditOnLoad: false });
ugsEditorPlus.updateSong.init('/ajaxupdatesong', 'song.cpm.txt');
ugsEditorPlus.updateSong.setSaveHandler((song) => song.length ? 'Saved.' : undefined);
const html: string = ugsEditorPlus.markup.editorHtml({ canSave: true, body: text });
const theme: string = window.ugsEditorPlus.options.theme;

// the Songbook's song list page uses the DOM helpers
ugsEditorPlus.dom.show(ugsEditorPlus.dom.one('#songList'));
ugsEditorPlus.dom.all('li').forEach((li) => ugsEditorPlus.dom.toggle(li, li.hidden));
ugsEditorPlus.dom.postJson('/ajax', { a: 1 }).then((data) => data.Message);

// @ts-expect-error not an option
ugsEditorPlus.songAmatic.mount(document.body, { tuning: 'banjo' });

export { html, saved, theme };
