/**
 * Exposes the only method required to attach UkeGeeks Scriptasaurus Song-a-matic editor functionality.
 *
 * @class songAmatic
 * @namespace ugsEditorPlus
 * @static
 * @singleton
 */
ugsEditorPlus.songAmatic = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	var _public = {} as UgsEditorPlus.SongAmatic;

	/**
	 * attaches event handlers, preps variables, and runs UGS
	 * @method init
	 * @param options {OBJECT} (optional) Object/JSON with any of the ugsEditorPlus.options
	 * @return {void}
	 */
	_public.init = function(options?: Partial<UgsEditorPlus.Options>) {
		var opts = mergeOptions(options);

		ukeGeeks.settings.opts.retainBrackets = !opts.hideChordEnclosures;
		ugsEditorPlus.dom.toggle(document.getElementById('songSourceDlg'), opts.showEditOnLoad);

		// Song Formatter's init(options?) only reads options.definitions. The editor used to pass
		// opts.useLegacyIe here (the old library's "isIeFamily" flag), which init() ignored.
		ukeGeeks.scriptasaurus.init();

		ugsEditorPlus.actions.init();
		ugsEditorPlus.topMenus.init();
		ugsEditorPlus.submenuUi.init();
		ugsEditorPlus.optionsDlg.init();
		ugsEditorPlus.chordBuilder.init();
		ugsEditorPlus.actions.run();
	};

	var mergeOptions = function(options?: Partial<UgsEditorPlus.Options>) {
		var opts = {
			hideChordEnclosures: !ukeGeeks.settings.opts.retainBrackets,
			sortAlphabetical: ukeGeeks.settings.opts.sortAlphabetical,
			ignoreCommonChords: ukeGeeks.settings.opts.ignoreCommonChords,
			commonChords: ukeGeeks.settings.commonChords
		};

		return Object.assign(ugsEditorPlus.options, opts, (options && typeof options === "object") ? options : {});
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());