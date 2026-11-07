# Changelog

## Unreleased

The editor's sources are TypeScript now. The bundle is the same JavaScript (`ugsEditorPlus.min.js` is byte-identical), so pages need no change.

- Type declarations ship in `dist/`: `markup.d.ts` for `editorHtml()` (package.json `types`), and `ugsEditorPlus.d.ts` for the browser globals: `mount()` and its options, `init()`, `updateSong`, `markup` and `dom`. Use them with `/// <reference types="@ukegeeks/song-editor/browser" />`.
- `npm run typecheck` checks the sources; it runs in CI and before publishing.
- Node ESM: `import { editorHtml } from '@ukegeeks/song-editor'` works now (it used to throw "Named export not found"; only the default import worked).

## 1.0.0-beta.1 (2026-11-06)

The Song-a-Matic editor moves out of the [UkeGeeks Songbook](https://github.com/buzcarter/UkeGeeks) (1.5.1) into its own package. Same code, same look.

- `ugsEditorPlus.songAmatic.mount(container, { song, save, aceUrl, imgUrl, ...options })` writes the editor into an empty element.
- `save` is a callback from the host page; without it there's no Save button. `ugsEditorPlus.updateSong.setSaveHandler(save)` does the same for server-rendered pages.
- `editorHtml()` (Node, and `ugsEditorPlus.markup` in the browser) generates the editor markup that pages used to copy by hand.
- New option `aceUrl`: where the Fullscreen editor's `ace-chordpro.min.js` lives.
- Still works: `songAmatic.init(options)` and `updateSong.init(ajaxUri, filename)`.
- `dist/` is laid out like a web page: `js/`, `css/`, `img/editor/`, plus `markup.js` for Node.
- Demo: https://buzcarter.github.io/song-editor/ (`npm run demo` locally).
- Left in the Songbook: the song list's quick search (`typeahead`) and New Song dialog.
