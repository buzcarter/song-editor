declare namespace UgsEditorPlus {
	interface OptionsDlg {
		/** Wires the Other Options dialog's checkboxes and fields; makes the dialogs draggable */
		init(): void;
	}
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
	var _public = {} as UgsEditorPlus.OptionsDlg;

	/**
	 * Sets up this class by attaching event handlers to form elements;
	 * @method init
	 * @public
	 */
	_public.init = function() {
		var ele: HTMLInputElement,
			options = ugsEditorPlus.options;

		// Update Button
		document.getElementById('updateBtn')!.onclick = function() {
			triggerNotify('update', '');
			return false;
		};

		// show/hide square bracket (chord enclosure)
		ele = document.getElementById('chkEnclosures') as HTMLInputElement;
		ele.checked = options.hideChordEnclosures;
		ele.onclick = function() {
			// Boolean "isVisible"
			triggerNotify('showEnclosures', !(this as HTMLInputElement).checked);
		};

		// list of chord names to ignore
		ele = document.getElementById('commonChordList') as HTMLInputElement;
		ele.value = (typeof options.commonChords == 'string') ? options.commonChords : options.commonChords.join(", ");
		ele.onchange = function() {
			triggerNotify('setCommonChords', (this as HTMLInputElement).value);
		};

		// toggle order of reference diagrams
		ele = document.getElementById('chkSortAlpha') as HTMLInputElement;
		if (ele) {
			ele.checked = options.sortAlphabetical;
			ele.onclick = function() {
				triggerNotify('sortAlphabetical', (this as HTMLInputElement).checked);
			};
		}

		// toggle ignore common chords
		ele = document.getElementById('chkIgnoreCommon') as HTMLInputElement;
		ele.checked = options.ignoreCommonChords;
		ele.onclick = function() {
			// Boolean for "isIgnore"
			triggerNotify('hideCommonChords', (this as HTMLInputElement).checked);
		};

		// ugh! Event bubbling!
		ugsEditorPlus.dom.on('.checkboxBlock label, input[type=checkbox]', 'click', function(e: Event) {
			e.stopPropagation();
		});

		ugsEditorPlus.dom.all('.overlay').forEach(function(dlg) {
			ugsEditorPlus.dom.draggable(dlg, 'hgroup');
		});
	};

	var triggerNotify = function(action: string, value: unknown) {
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