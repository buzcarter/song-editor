# Changelog

## 1.0.0-beta.1 (unreleased)

The Song-a-Matic editor moves out of the [UkeGeeks Songbook](https://github.com/buzcarter/UkeGeeks) (1.5.1) into its own package. Same code, same look.

- `ugsEditorPlus.songAmatic.mount(container, { song, save, aceUrl, imgUrl, ...options })` writes the editor into an empty element.
- `save` is a callback from the host page; without it there's no Save button. `ugsEditorPlus.updateSong.setSaveHandler(save)` does the same for server-rendered pages.
- `editorHtml()` (Node, and `ugsEditorPlus.markup` in the browser) generates the editor markup that pages used to copy by hand.
- New option `aceUrl`: where the Fullscreen editor's `ace-chordpro.min.js` lives.
- Still works: `songAmatic.init(options)` and `updateSong.init(ajaxUri, filename)`.
- Left in the Songbook: the song list's quick search (`typeahead`) and New Song dialog.
