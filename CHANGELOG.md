# Changelog

## Unreleased

The Chord Builder stands on its own: it uses nothing of the editor's, has its own bundle and types, and is tested part by part.

### New

- `dist/js/ugsChordBuilder.min.js`: the Chord Builder without the editor, and `ugsChordBuilder.mount(element, host)` to start it. The host says where the song is (`getSong`, `setSong`) and can listen (`onPanelChange`, `onStateChange`) or answer (`confirm`, `alert`). Package export `@ukegeeks/song-editor/chord-builder`. The demo has a page for it, `/chord-builder.html`.
- `dist/ugsChordBuilder.d.ts`: types for every part of `ugsChordBuilder`. `ugsEditorPlus.d.ts` refers to it, so a page that types the editor gets them too.
- `ugsChordBuilder.songDefinitions` (`find`, `add`, `replace`, `remove` on a song's text), `chordReader` (a `{define}` laid out for the fretboard), `tracking.toPosition()`, `html.escape()`, `editorUi.getState()`, `chooserList.getDefinitions()` and `getCurrent()`.

### Changed

- The Chord Builder reaches the page and the song only through its host (`ugsChordBuilder.host`). In the editor nothing looks different; `editorUi.init()` now takes the host.
- `chordCanvas` draws the dots. `fretDots.draw()` is gone: `fretDots` is only the chord.
- Deleting a definition removes its line from the song; it used to leave an empty line. Adding one no longer adds an empty line at the end of the song.

### Fixed

- Chord Builder: clicking a chord's mini-diagram in the list opens that chord. It opened a blank new chord, because the click landed on the diagram's `<svg>` and not on the list item (clicking the chord's name worked). (UGS-0038)
- Chord Builder: a deleted chord's name can be used again without reopening the builder. It was refused as "already being used".
- Chord Builder: a `{define}` with spaces before it is listed by its name alone.

## 2.0.0-beta.2 (2026-11-11)

The editor keeps to itself on a host page: its class names are prefixed, and its scripts look things up inside its own element.

### Breaking

- The editor's own class names start with `ugsEditor-`: `.overlay` is `.ugsEditor-overlay`, `.isHidden` is `.ugsEditor-isHidden`, `.arrowBox`, `.active`, `.checked`, `.selected`, `.baseBtn`, `.closeBtn`, `.pseudoSelect`, the `nav…` toolbar classes and the rest likewise (75 in all). Host CSS or scripts that use the old names need the prefix; pages with their own copy of the markup should take it from `editorHtml()` again. The look is unchanged.
- Not renamed: the song's classes (Song Formatter's `ugs…` names, `.scalablePrintArea`, and `.metaInfo`, which host pages style), `.ugsAppMenuBar`, `.ugsLogo`, `.ugsChordChooser`, `chordPro-…`, ids, and the classes the editor puts on `<body>` and `<html>` (`editableSongPage`, `pageWidth_…`, `diagramsOnTop`, `diagramsOnSide`, `ugsHideDiagrams`, `theme-…`, `aceEditorActive`).
- `ugsEditorPlus.dom.one()`, `all()`, `find()` and `on()` with a selector search inside the editor's element once an editor is running, not the whole page. Pass a context (`document`) to search wider. With no editor on the page (the Songbook's song list) they search the page as before.

### Fixed

- A host page's own `.overlay`, `.arrowBox`, `.active`, `.closeBtn`… elements no longer get the editor's styles, and the editor no longer hides them or takes their clicks.

## 2.0.0-beta.1 (2026-11-11)

A host page can now save and hear about changes without reaching into the editor's page, and the editor's controls are real buttons. The markup changed, so this is a major version: pages that call `mount()` and use only its API need no change; pages that copy the markup, or style or script its parts, do.

### Breaking

- Action controls are `<button>`s, not `<a href="#…">` links: Close, Fullscreen, Chord Builder, No Thanks, Cancel, the Chord Builder's toolbox (Dots, Fingers, Slide Up, Slide Down) and the five toolbar items. CSS or scripts that target them as `a` need updating. The toolbar buttons name their options box in `data-target`, and Dots/Fingers say which tool they are in `data-tool`.
- The songsheet's `<hgroup>` is gone: the titles sit directly in `header.ugs-songInfo`. Dialog titles sit in `header.overlayHeader`, which is the drag handle.
- Pages with their own copy of the markup (Songbook 1.5 style) should take it from `editorHtml()` again. The editor still reads the old link markup, but the stylesheet is written for the new.

### New

- `mount()` option `onChange: (text) => {}`: called each time the song's text changes, by typing (the Edit Song box or Fullscreen) or by the editor (Transpose, Reformat, the Chord Builder). Not called for the song the editor opens with. For an "unsaved changes" mark or autosave, with no timer.
- `editor.save()` on what `mount()` returns (also `ugsEditorPlus.updateSong.save()`): saves as the Save button does, including Fullscreen's text while it's open, and resolves `true` or `false`. For a host's own Save command or shortcut.

### Fixed

- Chord Builder: a chord renamed with `$` in its name saved wrong, or not at all (`$&` ended in "Maximum call stack size exceeded"); a name with `$` or quotes showed garbled in the output box.
- Chord Builder: opening a `{define}` whose `add:` leaves out the fret, string or finger no longer erases or doubles a dot.
- Chord Builder: `{define}` chord names are escaped before they reach the page.
- Reformat: every tab is expanded to its tab stop, so chords land where they looked; four tab lines at the very end of the text become a tab block.

### Inside

- The page HTML lives in `src/templates/editor.html`; source files lost their `ugsEditorPlus.` prefix (`dist/` file names are unchanged).
- ESLint with the recommended rules, in CI. TypeScript: no `any`, checked element lookups, `noUncheckedIndexedAccess`.

## 1.1.0-beta.1 (2026-11-06)

Never published to npm: its changes first reach npm in 2.0.0-beta.1.

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
