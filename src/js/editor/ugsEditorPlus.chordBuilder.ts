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
 * and opens its dialog from the toolbar button, reloading the song's chords each time.
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
	var _public = {} as UgsEditorPlus.ChordBuilderBridge;

	var _builder: UgsChordBuilder.EditorUi | null = null;

	/**
	 * Standard event wire up and prep method. Handles "finding" the Builder's "Hand Cursor" based
	 * on the location of the background image used on the Finger Tool.
	 * @method  init
	 */
	_public.init = function() {
		var dom = ugsEditorPlus.dom;
		var fingerToolImage = window.getComputedStyle(dom.find('.fingerToolImage', HTMLElement)).backgroundImage;
		ugsChordBuilder.settings.cursor.imageUri = fingerToolImage.replace(/url\("(.*)hand.png"\)/i, '$1hand-cursor.png');
		_builder = new ugsChordBuilder.editorUi();
		_builder.init();

		dom.byId('cdBldOpenBtn', HTMLElement).addEventListener('click', onShowDlgBtnClick);
	};

	/**
	 * Button/Link click handler (shows the Chord Builder Overlay)
	 * @method onShowDlgBtnClick
	 * @param  {event} evt
	 */
	var onShowDlgBtnClick = function(this: HTMLElement, evt: Event){
		evt.preventDefault();
		// (init() makes the builder before it listens for this click)
		if (_builder) {
			_builder.reload();
		}
		ugsEditorPlus.dom.fadeIn(document.getElementById(this.getAttribute('data-dialog') || ''));
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());