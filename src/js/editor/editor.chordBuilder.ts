declare namespace UgsEditorPlus {
	interface ChordBuilderBridge {
		/** Sets up the Chord Builder and its toolbar button */
		init(): void;
	}
}
interface UgsEditorPlus {
	chordBuilder: UgsEditorPlus.ChordBuilderBridge;
}

/**
 * Connects the Chord Builder (the `ugsChordBuilder` global) to the editor: makes the builder
 * and opens its dialog from the toolbar's Chords button, reloading the song's chords each time.
 *
 * This is the only file that knows both. It is the builder's host (UgsChordBuilder.Host):
 * the song is the Edit Song box's text, a changed song redraws (actions.run()), and the
 * dialog is narrower while the list shows. The builder never calls the editor.
 * Dependencies: ugsChordBuilder classes
 * @class chordBuilder
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.chordBuilder = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsEditorPlus.ChordBuilderBridge;

	let _builder: UgsChordBuilder.EditorUi | null = null;

	/**
	 * Standard event wire up and prep method. Handles "finding" the Builder's "Hand Cursor" based
	 * on the location of the background image used on the Finger Tool.
	 * @method  init
	 */
	_public.init = function() {
		const dom = ugsEditorPlus.dom;
		const dialog = dom.byId('cdBldDlg', HTMLElement);
		const songBox = function() {
			return dom.byId('chordProSource', HTMLTextAreaElement);
		};
		const fingerToolImage = window.getComputedStyle(dom.find('.ugsEditor-fingerToolImage', HTMLElement)).backgroundImage;

		_builder = new ugsChordBuilder.editorUi();
		_builder.init({
			root: dialog,
			getSong: function() {
				return songBox().value;
			},
			setSong: function(text) {
				songBox().value = text;
				ugsEditorPlus.songText.changed();
				ugsEditorPlus.actions.run();
			},
			onPanelChange: function(panel) {
				dialog.classList.toggle('ugsEditor-chordBuilderNarrow', panel === 'chooser');
			},
			cursorImageUri: fingerToolImage.replace(/url\("(.*)hand.png"\)/i, '$1hand-cursor.png')
		});

		// the toolbar's Chords button; Songbook 1.5 pages have a Chord Builder button in the Edit Song box
		dom.byId('cdBldOpenBtn', HTMLElement).addEventListener('click', function() {
			// (the builder is made just above)
			if (_builder) {
				_builder.reload();
			}
			dom.fadeIn(dialog);
		});
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());