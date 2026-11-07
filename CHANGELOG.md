# Changelog

## 1.1.0-beta.1 (2026-11-06)

The editor's sources are TypeScript now, and the package ships type declarations. Same files, globals and API, so pages need no change.

### New

- Type declarations ship in `dist/`: `markup.d.ts` for `editorHtml()` (package.json `types`), and `ugsEditorPlus.d.ts` for the browser globals: `mount()` and its options, `init()`, `updateSong`, `markup` and `dom`. Use them with `/// <reference types="@ukegeeks/song-editor/browser" />`.
- Node ESM: `import { editorHtml } from '@ukegeeks/song-editor'` works now (it used to throw "Named export not found"; only the default import worked).
- `npm run typecheck` checks the sources; it runs in CI and before publishing.

### Fixed

- While Fullscreen was open, `getSong()` returned the Edit Song box, which only gets Fullscreen's text when it closes. It now returns what's being edited.
- The Edit Song box decoded HTML entities in the song, so a file with `&amp;` or `&copy;` showed `&` or ©, and saving wrote them that way. It now holds the song's exact text. (Also in `editorHtml()` for server-rendered pages.)
- A muted string's X was drawn black whatever the color theme, so it vanished on dark themes like "reversed". Each theme now has its own X color: its fret-number color, or a darker one from the theme where that's too faint (frosty, notebook).

## 1.0.1-beta.1 (2026-11-06)

README only: a screenshot, the UkeGeeks family links, and the Song Editor's own repo link.

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
