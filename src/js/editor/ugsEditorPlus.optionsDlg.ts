declare namespace UgsEditorPlus {
	interface OptionsDlg {
		/** Wires the Other Options dialog's checkboxes and fields; makes the dialogs draggable */
		init(): void;
	}
}
interface UgsEditorPlus {
	optionsDlg: UgsEditorPlus.OptionsDlg;
}

/**
 * UI mechanics of the Other Options "dialog"'s checkboxes and input
 * fields (does NOT manage "pageWidth" since its standard submenu behavior
 * is already handled in that class)
 * @class optionsDlg
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.optionsDlg = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsEditorPlus.OptionsDlg;

	/**
	 * Sets up this class by attaching event handlers to form elements;
	 * @method init
	 * @public
	 */
	_public.init = function() {
		const dom = ugsEditorPlus.dom,
			options = ugsEditorPlus.options;

		// Update Button
		dom.byId('updateBtn', HTMLElement).onclick = function() {
			triggerNotify('update', '');
			return false;
		};

		// show/hide square bracket (chord enclosure)
		const chkEnclosures = dom.byId('chkEnclosures', HTMLInputElement);
		chkEnclosures.checked = options.hideChordEnclosures;
		chkEnclosures.onclick = function() {
			// Boolean "isVisible"
			triggerNotify('showEnclosures', !chkEnclosures.checked);
		};

		// list of chord names to ignore
		const commonChordList = dom.byId('commonChordList', HTMLInputElement);
		commonChordList.value = (typeof options.commonChords === 'string') ? options.commonChords : options.commonChords.join(", ");
		commonChordList.onchange = function() {
			triggerNotify('setCommonChords', commonChordList.value);
		};

		// toggle order of reference diagrams (optional: older pages don't have it)
		const sortAlphaOrNull = document.getElementById('chkSortAlpha');
		if (sortAlphaOrNull instanceof HTMLInputElement) {
			const chkSortAlpha = sortAlphaOrNull;
			chkSortAlpha.checked = options.sortAlphabetical;
			chkSortAlpha.onclick = function() {
				triggerNotify('sortAlphabetical', chkSortAlpha.checked);
			};
		}

		// toggle ignore common chords
		const chkIgnoreCommon = dom.byId('chkIgnoreCommon', HTMLInputElement);
		chkIgnoreCommon.checked = options.ignoreCommonChords;
		chkIgnoreCommon.onclick = function() {
			// Boolean for "isIgnore"
			triggerNotify('hideCommonChords', chkIgnoreCommon.checked);
		};

		// ugh! Event bubbling!
		ugsEditorPlus.dom.on('.checkboxBlock label, input[type=checkbox]', 'click', function(e: Event) {
			e.stopPropagation();
		});

		ugsEditorPlus.dom.all('.overlay').forEach(function(dlg) {
			ugsEditorPlus.dom.draggable(dlg, 'hgroup');
		});
	};

	const triggerNotify = function<A extends keyof UgsEditorPlus.OptionValues>(action: A, value: UgsEditorPlus.OptionValues[A]) {
		ugsEditorPlus.dom.trigger('ugs:option', {
			action: action,
			value: value
		});
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());