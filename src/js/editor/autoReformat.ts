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
 * When a song has no [chords] (actions.run() calls this), tries reformat.run() on it. If that
 * finds chord lines, shows the Reformat dialog: "Yes" puts the converted song in the Edit Song box.
 * The dialog's checkbox stops it asking again until the page reloads.
 * @class autoReformat
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.autoReformat = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsEditorPlus.AutoReformat;

	/**
	 * associative array/JSON handles to key/frequently accessed DOM Elements (see init()
	 * @property _ele
	 * @type {JSON}
	 */
	let _ele = {} as UgsEditorPlus.ReformatElements;

	let _formatted: string;
	let _isDisabled = false;

	_public.run = function(elements){
		if (_isDisabled){
			return;
		}
		const dom = ugsEditorPlus.dom;
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
		const chk = dom.byId('reformatDisable', HTMLInputElement);
		chk.checked = false;
		chk.onclick = function() {
			doDisable(chk.checked);
		};

		runNow();
	};

	const doOk = function(){
		_ele.cpmSource.value = _formatted;
		ugsEditorPlus.songText.changed();
		doClose();
		ugsEditorPlus.actions.run(true);
	};

	const doClose = function(){
		ukeGeeks.toolsLite.addClass(_ele.reformatDlg, 'ugsEditor-isHidden');
	};

	const doDisable = function(isDisabled: boolean){
		_isDisabled = isDisabled;
	};

	const runNow = function(){
		_formatted = ugsEditorPlus.reformat.run(_ele.cpmSource.value);
		_ele.reformatTextBox.value = _formatted;

		if (!ugsEditorPlus.reformat.hasChords()){
			return;
		}

		ukeGeeks.toolsLite.removeClass(_ele.reformatDlg, 'ugsEditor-isHidden');
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());