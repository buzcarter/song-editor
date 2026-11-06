/**
 * Mounts the Song-a-Matic editor into an empty element: writes the editor's
 * markup (ugsEditorPlus.markup), then runs songAmatic.init().
 *
 *   const editor = ugsEditorPlus.songAmatic.mount(document.getElementById('editor'), {
 *     song: chordProText,
 *     save: async (text) => 'Saved.', // optional; without it there's no Save button
 *     aceUrl: '/js/ace/',              // optional
 *     imgUrl: '/img/editor/',          // optional
 *     fontSize: 14,                    // ...and any other ugsEditorPlus.options
 *   });
 *   editor.getSong();
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
   * @return {Object} `{ getSong() }`
   */
  ugsEditorPlus.songAmatic.mount = (container, options) => {
    const { song = '', save, imgUrl, ...editorOptions } = options || {};
    const canSave = typeof save === 'function';

    container.innerHTML = ugsEditorPlus.markup.editorHtml({
      canSave,
      imgUrl: imgUrl || (scriptFolder() + '../img/editor/'),
      body: song,
    });
    document.body.classList.add('editableSongPage', 'pageWidth_screen');

    ugsEditorPlus.songAmatic.init(editorOptions);
    if (canSave) {
      ugsEditorPlus.updateSong.setSaveHandler(save);
    }

    return {
      /** @return {string} the ChordPro text in the Edit Song box */
      getSong: () => document.getElementById('chordProSource').value,
    };
  };
})();
