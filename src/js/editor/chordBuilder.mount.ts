/**
 * The builder's markup (src/templates/chordBuilder.html): both panels, no dialog around them.
 * scripts/build.js swaps the placeholder for the file's text.
 * @property markup
 * @namespace ugsChordBuilder
 */
ugsChordBuilder.markup = '__CHORD_BUILDER_TEMPLATE__';

/**
 * Puts the Chord Builder in an element and starts it: the way to use it without the
 * Song-a-Matic editor. The host says where the song's text is (see UgsChordBuilder.Host).
 * Returns null when the browser has no canvas.
 * @method mount
 * @namespace ugsChordBuilder
 * @param {HTMLElement} element
 * @param {Host} host
 * @return {Builder}
 */
ugsChordBuilder.mount = function(element, host) {
  element.innerHTML = ugsChordBuilder.markup;
  const ui = new ugsChordBuilder.editorUi();
  if (!ui.init(Object.assign({}, host, { root: element }))) {
    return null;
  }
  ui.reload();
  return {
    reload: ui.reload,
    getState: ui.getState,
    getDefinitions: ugsChordBuilder.chooserList.getDefinitions
  };
};
