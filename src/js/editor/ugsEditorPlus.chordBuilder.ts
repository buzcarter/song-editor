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
 *
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
		var fingerToolImage = window.getComputedStyle(document.querySelector('.fingerToolImage')!).backgroundImage;
		ugsChordBuilder.settings.cursor.imageUri = fingerToolImage.replace(/url\("(.*)hand.png"\)/i, '$1hand-cursor.png');
		_builder = new ugsChordBuilder.editorUi();
		_builder.init();

		document.getElementById('cdBldOpenBtn')!.addEventListener('click', onShowDlgBtnClick);
	};

	/**
	 * Button/Link click handler (shows the Chord Builder Overlay)
	 * @method onShowDlgBtnClick
	 * @param  {event} evt
	 */
	var onShowDlgBtnClick = function(this: HTMLElement, evt: Event){
		evt.preventDefault();
		_builder!.reload();
		var id = this.getAttribute('data-dialog')!;
		ugsEditorPlus.dom.fadeIn(document.getElementById(id));
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());