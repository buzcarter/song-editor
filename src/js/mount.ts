/**
 * Mounts the Song-a-Matic editor into an empty element: writes the editor's
 * markup (ugsEditorPlus.markup), then runs songAmatic.init().
 *
 *   const editor = ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
 *     song: chordProText,
 *     save: async (text) => 'Saved.', // optional; without it there's no Save button
 *     onChange: (text) => {},          // optional: the song's text changed
 *     editMenu: [{ label: 'Edit Song', onSelect: () => {} }], // optional: the Edit button's own menu
 *     aceUrl: '/js/ace/',              // optional
 *     imgUrl: '/img/editor/',          // optional
 *     fontSize: 14,                    // ...and any other ugsEditorPlus.options
 *   });
 *   editor.getSong();
 *   editor.save(); // what the Save button does
 *   editor.setSong(text); // the host's own editor changed the song
 *   editor.setEditMenu(items); // new items (a changed label or check mark)
 *   editor.openChordBuilder();
 *
 * The editor finds its elements by id, so a page holds one editor.
 *
 * @class songAmatic
 * @namespace ugsEditorPlus
 */
(() => {
  /**
   * The folder this bundle was loaded from, like ".../dist/" or "/js/" (with a trailing slash),
   * or "" when it can't be found.
   */
  const scriptFolder = () => {
    let folder = '';
    Array.prototype.forEach.call(document.scripts, (script) => {
      const pos = script.src.toLowerCase().indexOf('ugseditorplus');
      if (pos > 0) {
        folder = script.src.substr(0, pos);
      }
    });
    return folder;
  };

  /**
   * @method mount
   * @param container {HTMLElement} an empty element; the editor's markup is written into it
   * @param [options] {Object}
   * @param [options.song=''] {string} the ChordPro text to open
   * @param [options.save] {Function} takes the ChordPro text and returns (a promise of) a message to show;
   *   a rejection shows the "problem saving" alert. Without it there's no Save button.
   * @param [options.imgUrl] {string} folder holding the editor images; default "../img/editor/" from the bundle's folder
   * @param [options.aceUrl] {string} folder holding ace-chordpro.min.js; default "ace/" in the bundle's folder
   * @param [options.onChange] {Function} called with the ChordPro text each time it changes
   * @param [options.editMenu] {Array} `{ label, onSelect, checked }` items: the toolbar's Edit button shows them
   *   in a drop-down menu instead of the Edit Song box (which then stays closed). For a host page that edits
   *   the song its own way and passes the text back with `setSong()`
   * @return {Object} `{ getSong(), setSong(), save(), setEditMenu(), openChordBuilder() }`
   */
  ugsEditorPlus.songAmatic.mount = (container: HTMLElement, options?: UgsEditorPlus.MountOptions) => {
    const { song = '', save, onChange, editMenu, imgUrl, ...editorOptions } = options || {};
    const canSave = typeof save === 'function';
    const hasEditMenu = Array.isArray(editMenu) && editMenu.length > 0;
    if (hasEditMenu) {
      // the host edits the song its own way: the Edit Song box has no button to bring it back
      editorOptions.showEditOnLoad = false;
    }

    container.innerHTML = ugsEditorPlus.markup.editorHtml({
      canSave,
      imgUrl: imgUrl || (scriptFolder() + '../img/editor/'),
      body: song,
    });
    document.body.classList.add('editableSongPage', 'pageWidth_screen');

    ugsEditorPlus.songAmatic.init(editorOptions);
    // (after init(): the menu's box goes inside the editor's element)
    ugsEditorPlus.topMenus.setEditMenu(hasEditMenu ? editMenu : null);
    if (canSave) {
      ugsEditorPlus.updateSong.setSaveHandler(save);
    }

    // after init(), so what it does to the song as it opens isn't reported as a change
    ugsEditorPlus.songText.setChangeHandler(onChange || null);

    return {
      /** @return {string} the ChordPro text: the Fullscreen editor's while it's open, else the Edit Song box's */
      getSong: ugsEditorPlus.songText.get,
      /** Replaces the song's text and redraws the songsheet (`{ render: false }`: the text only) */
      setSong: ugsEditorPlus.songText.set,
      /** Replaces the Edit button's menu (see the `editMenu` option); null or none brings back the Edit Song box */
      setEditMenu: ugsEditorPlus.topMenus.setEditMenu,
      /** Opens the Chord Builder, as its button in the Edit Song box does */
      openChordBuilder: ugsEditorPlus.chordBuilder.open,
      /** @return {Promise<boolean>} saves as the Save button does; true when it saved */
      save: ugsEditorPlus.updateSong.save,
    };
  };
})();
