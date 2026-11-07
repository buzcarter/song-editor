declare namespace UgsEditorPlus {
	/** The song's elements plus the Reformat dialog's */
	interface ReformatElements extends SongElements {
		reformatTextBox: HTMLTextAreaElement;
		/** a <section> */
		reformatDlg: HTMLElement;
	}
	interface AutoReformat {
		/** Offers to convert the song to ChordPro when it has no chords (the Reformat dialog) */
		run(elements: SongElements): void;
	}
}
interface UgsEditorPlus {
	autoReformat: UgsEditorPlus.AutoReformat;
}

/**
 *
 * @class autoReformat
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.autoReformat = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	var _public = {} as UgsEditorPlus.AutoReformat;

	/**
	 * associative array/JSON handles to key/frequently accessed DOM Elements (see init()
	 * @property _ele
	 * @type {JSON}
	 */
	var _ele = {} as UgsEditorPlus.ReformatElements;

	var _formatted: string;
	var _isDisabled = false;

	_public.run = function(elements){
		if (_isDisabled){
			return;
		}
		var dom = ugsEditorPlus.dom;
		// adds the dialog's elements to the ones passed in (the same object, as before)
		_ele = Object.assign(elements, {
			reformatTextBox: dom.byId('reformatSource', HTMLTextAreaElement),
			reformatDlg: dom.byId('reformatDlg', HTMLElement)
		});

		dom.byId('reformatYesBtn', HTMLElement).onclick = function() {
			doOk();
			return false;
		};
		dom.byId('reformatNoBtn', HTMLElement).onclick = function() {
			doClose();
			return false;
		};

		// need to reset on reload
		var chk = dom.byId('reformatDisable', HTMLInputElement);
		chk.checked = false;
		chk.onclick = function() {
			doDisable(chk.checked);
		};

		runNow();
	};

	var doOk = function(){
		_ele.cpmSource.value = _formatted;
		doClose();
		ugsEditorPlus.actions.run(true);
	};

	var doClose = function(){
		ukeGeeks.toolsLite.addClass(_ele.reformatDlg, 'isHidden');
	};

	var doDisable = function(isDisabled: boolean){
		_isDisabled = isDisabled;
	};

	var runNow = function(){
		_formatted = ugsEditorPlus.reformat.run(_ele.cpmSource.value);
		_ele.reformatTextBox.value = _formatted;

		if (!ugsEditorPlus.reformat.hasChords()){
			return;
		}

		ukeGeeks.toolsLite.removeClass(_ele.reformatDlg, 'isHidden');
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());