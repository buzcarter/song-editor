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
	const _public = {} as UgsEditorPlus.SongAmatic;

	/**
	 * attaches event handlers, preps variables, and runs UGS
	 * @method init
	 * @param options {OBJECT} (optional) Object/JSON with any of the ugsEditorPlus.options
	 * @return {void}
	 */
	_public.init = function(options?: Partial<UgsEditorPlus.Options>) {
		const opts = mergeOptions(options);
		ugsEditorPlus.dom.setRoot(findRoot());

		ukeGeeks.settings.opts.retainBrackets = !opts.hideChordEnclosures;
		ugsEditorPlus.dom.toggle(document.getElementById('songSourceDlg'), opts.showEditOnLoad);

		// Song Formatter's init(options?) only reads options.definitions. The editor used to pass
		// opts.useLegacyIe here (the old library's "isIeFamily" flag), which init() ignored.
		ukeGeeks.scriptasaurus.init();

		ugsEditorPlus.songText.init();
		ugsEditorPlus.actions.init();
		ugsEditorPlus.topMenus.init();
		ugsEditorPlus.submenuUi.init();
		ugsEditorPlus.optionsDlg.init();
		ugsEditorPlus.chordBuilder.init();
		ugsEditorPlus.actions.run();
	};

	/**
	 * The element holding the editor's markup: what mount() filled, or on a server-rendered
	 * page the parent of editorHtml()'s output. The editor's lookups stay inside it.
	 * @method findRoot
	 * @private
	 * @return {DOM-element|null} null (search the whole page) when the editor's parts aren't together
	 */
	const findRoot = function(): ParentNode | null {
		const root = document.getElementById('ugsAppToolbar')?.parentElement;
		if (!root) {
			return null;
		}
		const together = ['scalablePrintArea', 'songSourceDlg', 'cdBldDlg'].every(function(id) {
			const part = document.getElementById(id);
			return !part || root.contains(part);
		});
		return together ? root : null;
	};

	const mergeOptions = function(options?: Partial<UgsEditorPlus.Options>) {
		const opts = {
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