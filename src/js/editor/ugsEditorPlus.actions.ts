declare namespace UgsEditorPlus {
	/** The song's elements on the page */
	interface SongElements {
		songText: HTMLElement;
		/** an <article> */
		songContainer: HTMLElement;
		/** the Edit Song box */
		cpmSource: HTMLTextAreaElement;
		scalableArea: HTMLElement;
	}
	interface Actions {
		/** Reads the page, listens for "ugs:option" events and applies `ugsEditorPlus.options` */
		init(): void;
		/** Redraws the song from the Edit Song box; `isDoBackup` makes it the new "original" for transposing */
		run(isDoBackup?: boolean): void;
	}
	/**
	 * The settings an "ugs:option" event can change, and each one's value. Menus send the
	 * clicked item's value (its href without the "#"); the Options dialog's checkboxes send booleans.
	 */
	interface OptionValues {
		zoomFonts: string;
		zoomDiagrams: string;
		layout: string;
		placement: string;
		tuning: string;
		colors: string;
		transpose: string;
		paper: string;
		update: string;
		showEnclosures: boolean;
		hideCommonChords: boolean;
		sortAlphabetical: boolean;
		setCommonChords: string | string[];
	}
	/** An "ugs:option" event's detail: a menu or the Options dialog changed a setting */
	type OptionChange = { [A in keyof OptionValues]: { action: A; value: OptionValues[A] } }[keyof OptionValues];
}
interface DocumentEventMap {
	'ugs:option': CustomEvent<UgsEditorPlus.OptionChange>;
}
interface UgsEditorPlus {
	actions: UgsEditorPlus.Actions;
}

/**
 * Does the work by providing "doAction" method to respond to events (does not
 * attach event handlers); Modifes some page elements -- adjust CSS classes on page,
 * runs Scriptasaurus, etc.
 * @class actions
 * @namespace ugsEditorPlus
 * @module ugsEditorPlus
 */
ugsEditorPlus.actions = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @public
	 * @type JsonObject
	 */
	var _public = {} as UgsEditorPlus.Actions;

	/**
	 * associative array/JSON handles to key/frequently accessed DOM Elements (see init()
	 * @property _ele
	 * @private
	 * @type {JSON}
	 */
	var _ele = {} as UgsEditorPlus.SongElements;

	// misc
	var _song: UgsEditorPlus.Song | null = null;
	//
	var _originalSource: string | null = null;
	var _originalChords: string[] = [];

	var _regEx = {
		safe: /^([A-G][#b]?)(m|m6|7|m7|dim|maj7|6|sus2|sus4|aug|9)?$/
	};

	/**
	 * associative array/JSON of last click value used; intended to be used to prevent
	 * rerunning more expensize operations unnecessailry (when the value didn't actually change)
	 * @property _prevValues
	 * @type {JSON}
	 */
	var _prevValues: Record<string, string> = {
		'placement' : 'above',
		'transpose' : 'up_0'
	};

	/**
	 * Sets up this class; modifies form elements; attaches event handlers, etc
	 * @method init
	 * @public
	 */
	_public.init = function() {
		var dom = ugsEditorPlus.dom;
		_ele = {
			songText : dom.byId('ukeSongText', HTMLElement),
			songContainer : dom.byId('ukeSongContainer', HTMLElement),
			cpmSource : dom.byId('chordProSource', HTMLTextAreaElement),
			scalableArea : dom.byId('scalablePrintArea', HTMLElement)
		};

		document.addEventListener('ugs:option', function(e) {
			doAction(e.detail);
		});

		syncOptions(ugsEditorPlus.options);
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Common "All Powerful" Helper Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Executes the requested Action using passed in Value
	 * @method doAction
	 * @private
	 * @param change {OptionChange} the event's detail: the Action's name (one of those in the switch below)
	 *   and its value (a string from a menu, a boolean from a checkbox)
	 */
	var doAction = function(change: UgsEditorPlus.OptionChange) {
		// actions that modify song's HTML or reference diagrams require rerunning Scriptasaurus
		var runRequired = false;
		// (for the log below: events come from the page, so an unknown action can still arrive)
		var action: string = change.action, value: unknown = change.value;

		switch (change.action){
			case 'zoomFonts':
				doSetFontSize(change.value);
				break;
			case 'zoomDiagrams':
				doSetDiagramSize(change.value);
				break;
			case 'layout':
				doLayout(change.value);
				break;
			case 'placement':
				runRequired = doPlacement(change.value);
				break;
			case 'tuning':
				doTuning(change.value);
				runRequired = true;
				break;
			case 'colors':
				doSetTheme(change.value);
				runRequired = true;
				break;
			case 'transpose':
				doTranspose(change.value);
				break;
			case 'paper':
				doSetPageWidth(change.value);
				break;
			case 'showEnclosures':
				setEnclosureVisible(change.value);
				runRequired = true;
				break;
			case 'hideCommonChords':
				setIgnoreCommon(change.value);
				runRequired = true;
				break;
			case 'sortAlphabetical':
				setSortAlphabetical(change.value);
				runRequired = true;
				break;
			case 'setCommonChords':
				setCommonChordsList(change.value);
				runRequired = ukeGeeks.settings.opts.ignoreCommonChords;
				break;
			case 'update':
				doUpdate();
				break;
			default:
				console.log('Unrecognized ' + action + ' > ' + value);
		}

		if (runRequired) {
			_public.run();
		}
	};

	var syncOptions = function(options: UgsEditorPlus.Options) {
		// direct menus
		doSetFontSize(options.fontSize);
		doSetDiagramSize(options.diagramSize);
		doLayout(options.diagramPosition);
		doSetPageWidth(options.paper);
		doSetTheme(options.theme);
		doTuning(options.tuning);
		doPlacement(options.lyricStyle);

		// advanced options
		setEnclosureVisible(!options.hideChordEnclosures);
		setIgnoreCommon(options.ignoreCommonChords);
		setCommonChordsList(options.commonChords);
		setSortAlphabetical(options.sortAlphabetical);
	};

	/**
	 * Rerun for new song text; updates UI
	 * @method doUpdate
	 * @private
	 */
	var doUpdate = function(){
		_public.run(true);
	};

	/**
	 * Rebuilds song, info, chord diagrams using current settings.
	 * @method run
	 * @param isDoBackup {bool} true forces backup; optional, default false.
	 */
	_public.run = function(isDoBackup?: boolean){
		isDoBackup = (arguments.length > 0) && isDoBackup;
		// run(markup) HTML-escapes the raw (untrusted) ChordPro text for us
		_song = ukeGeeks.scriptasaurus.run(_ele.cpmSource.value);

		if (_song && _song.chords.length < 1){
			ugsEditorPlus.autoReformat.run(_ele);
		}

		if (_song){
			ugsEditorPlus.songUi.update(_song);

			// maintains last copy of USER edited song -- used for transpose etc
			if (isDoBackup || (_originalSource === null)) {
				_originalSource = _ele.cpmSource.value;
				_originalChords = _song.chords;
				var key = _song.key !== '' ? _song.key : (_song.chords.length < 1 ? '' : _song.chords[0]);
				resetTranspose(key);
			}
		}
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Zoom Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Zooms (scales) fonts
	 * @method doSetFontSize
	 * @private
	 * @param value {string|number} point-size: the clicked menu item's value (string) or options.fontSize (number)
	 */
	var doSetFontSize = function(value: string | number) {
		var pt = parseFloat(String(value));
		_ele.scalableArea.style.fontSize = pt + 'pt';
	};

	/**
	 * Zooms (scales) chord diagrams
	 * @method doSetDiagramSize
	 * @private
	 * @param value {string} percentage, integer between 0 and, well, 100?; value of the clicked value item
	 */
	var doSetDiagramSize = function(value: string | number) {
		var prct = parseInt(String(value), 10) / 100;
		// apologies for the magic number...
		var columnWidth = Math.round(prct * 225);

		var s = ugsEditorPlus.styles.getSheet('ugsEditorCss');
		// the editor's stylesheet has these rules; without them (or without title="ugsEditorCss"), say so
		var rule = function(selector: string) {
			var found = s.find(selector);
			if (!found) {
				throw new Error('ugsEditorPlus: no "' + selector + '" rule in the stylesheet titled "ugsEditorCss"');
			}
			return found;
		};
		var m = rule('.scalablePrintArea .ugs-diagrams-wrap svg');
		m.style.width = Math.round(prct * ukeGeeks.settings.fretBox.width) +'px';
		m.style.height = Math.round(prct * ukeGeeks.settings.fretBox.height) +'px';

		m = rule('.scalablePrintArea .ugs-diagrams-wrap');
		m.style.width = columnWidth +'px';

		m = rule('.scalablePrintArea .ugs-source-wrap');
		m.style.marginLeft = (25 + columnWidth) +'px';
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Layout (Reference Diagram Position) Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Changes positions for Reference Chord Diagrams -- handled entirely via CSS classes
	 * @method doLayout
	 * @private
	 * @param value {string} value of the clicked value item
	 */
	var doLayout = function(value: string){
		var classes = document.body.classList;
		classes.toggle('diagramsOnTop', value == 'top');
		classes.toggle('diagramsOnSide', value == 'left');
		classes.toggle('ugsHideDiagrams', value == 'none');
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Chord Name Placement Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Chord Name placement (&amp; "Mini-chord diagrams"). Returns true if Scriptasaurus should be rerun.
	 * @method doPlacement
	 * @private
	 * @param value {string} value of the clicked value item
	 * @return {Boolean}
	 */
	var doPlacement = function(value: string){
		var isRunRequired = false;
		ukeGeeks.toolsLite.setClass(_ele.songContainer, 'ugsInline', (value == 'inline'));

		// NOTE: ugs already adds the "chord diagrams above" class based on setting,
		// BUT does NOT remove it!!!!
		var isMiniDiagrams = (value == 'miniDiagrams');
		if (!isMiniDiagrams){
			ukeGeeks.toolsLite.removeClass(_ele.songContainer, 'ugsInlineDiagrams');
		}

		if (isMiniDiagrams || (_prevValues.placement == 'miniDiagrams')){
			ukeGeeks.settings.inlineDiagrams = isMiniDiagrams;
			isRunRequired = true;
		}
		else if (!isMiniDiagrams && (_prevValues.placement != 'miniDiagrams')) {
			// we're jumping between "above" and "inline", either way we need to
			// manually fix the overlaps
			ukeGeeks.overlapFixer.Fix(_ele.songText);
		}

		_prevValues.placement = value;

		return isRunRequired;
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Color Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Change the color scheme -- requires changing CSS Class and reruning (to regenerate reference chord diagrams)
	 * @method doSetTheme
	 * @private
	 * @param value {string} value of the clicked value item
	 */
	var doSetTheme = function(value: string) {
		 ugsEditorPlus.themes.set(value);
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Page Width Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * (option dialog) changes body class, moving the right page edge
	 * @method doSetPageWidth
	 * @private
	 * @param value {string} currently selected option value
	 */
	var doSetPageWidth = function(value: string){
		var opts = ['letter', 'a4', 'screen'];
		var classes = document.body.classList;
		for(var i = 0; i < opts.length; i++){
			classes.remove('pageWidth_' + opts[i]);
		}
		classes.add('pageWidth_' + value);
	};

	/* ----------------------------------------------------------------------------------- *|
	|* Instrument & Tuning Methods
	|* ----------------------------------------------------------------------------------- */

	/**
	 * Change the instrument (tuning)
	 * @method doTuning
	 * @private
	 * @param value {string} value of the clicked value item
	 */
	var doTuning = function(value: string){
		var tuning: number = ukeGeeks.definitions.instrument.sopranoUke,
			msg = '<strong>GCEA</strong> Standard Ukulele';

		if (value == 'baritone') {
			tuning = ukeGeeks.definitions.instrument.baritoneUke;
			msg = '<strong>DGBE</strong> Baritone Ukulele';
		}

		if (value == 'alternate') {
			tuning = ukeGeeks.definitions.instrument.alternateUke;
			msg = '<strong>ADF#B</strong> alternate tuning';
		}

		ugsEditorPlus.dom.byId('footTuningInfo', HTMLElement).innerHTML = msg;
		ukeGeeks.scriptasaurus.setTuningOffset(tuning);
	};

	/**
	 * Parses Value to decide number of steps "up" or "down", then fires off transpose
	 * @method doTranspose
	 * @private
	 * @param value {string} value of the clicked value item
	 */
	var doTranspose = function(value: string){
		var sign = value[0] == 'u' ? 1 : -1;
		var steps = parseInt(value[value.length - 1], 10);
		transpose(sign * steps);
	};

	/**
	 * Rebuilds song as "run", but first transposes chords
	 * @method transpose
	 * @param steps {int} number of semitones, +/-6
	 */
	var transpose = function(steps: number){
		var safeChords = [],
			bad = '',
			i;

		// find "shiftable" chords
		for (i = 0; i < _originalChords.length; i++) {
			if (_regEx.safe.test(_originalChords[i])) {
				safeChords.push(_originalChords[i]);
			}
			else {
				bad += _originalChords[i] + ', ';
			}
		}

		if (bad.length > 0){
			if (!confirm('Sorry, but some of your chords can\'t be transposed:\n' + bad + '\n\nDo you want to continue anyway?')){
				return;
			}
		}

		// (run() keeps the original song before anything can transpose)
		if (_originalSource === null) {
			return;
		}
		var newChords = ukeGeeks.transpose.shiftChords(safeChords, steps);
		var s = _originalSource;
		var rEx;

		// "safe" (temp) rename chords (prepend noise "ugsxx_" so a renamed G will be distinguisable from a new G)
		for (i = 0; i < safeChords.length; i++) {
			rEx = new RegExp('\\[' + safeChords[i] + '\\]', 'g');
			s = s.replace(rEx, '[ugsxx_' + i + ']');
		}

		// final rename; placeholder names to desired names
		for (i = 0; i < newChords.length; i++) {
			rEx = new RegExp('\\[ugsxx_' + i + '\\]', 'g');
			s = s.replace(rEx, '[' + newChords[i] + ']');
		}

		// find & replace {key} command (if present)
		rEx = /^\s*\{\s*(key|k)\s*:\s*(\S*?)\s*\}\s*$/im;
		var m = s.match(rEx);
		if (m) {
			var key = m[2];
			// (shift() knows every "safe" chord)
			var newKey = (key !== '') && _regEx.safe.test(key) ? ukeGeeks.transpose.shift(key, steps) : null;
			if (newKey !== null) {
				s = s.replace(rEx, m[0].replace(key, newKey));
			}
		}

		// manipulations done, ready to...
		_ele.cpmSource.value = s;
		_public.run();

	};

 /**
	 * Sets Transpose menu's selected value to "Original"; adds example chord names
	 * @method resetTranspose
	 * @private
	 * @param keyChord {string}
	 */
	var resetTranspose = function(keyChord: string) {
		var ul = ugsEditorPlus.dom.byId('transposeOptions', HTMLElement);
		var items = ul.getElementsByTagName('li');
		var sample;
		var steps = -6;

		_prevValues['transpose'] = 'up_0';

		ugsEditorPlus.submenuUi.resetTransposeLabel();

		for (var i = 0; i < items.length; i++) {
			ukeGeeks.toolsLite.removeClass(items[i], 'checked');
			sample = (keyChord.length < 1) ? '' : ukeGeeks.transpose.shift(keyChord, steps);
			// (shift() returns null for a chord it doesn't know; innerHTML treated that as '')
			items[i].getElementsByTagName('em')[0].innerHTML = sample || '';
			if (steps === 0) {
				ukeGeeks.toolsLite.addClass(items[i], 'checked');
			}
			steps++;
		}
	};

	/* ----------------------------------------------------------------------------------- *|
	|* "Other Options" Methods
	|* ----------------------------------------------------------------------------------- */
	// a grab bag of single, odd switches... mea culpa

	/**
	 * (option dialog) change whether to show/hide the bracket characters
	 * @method setEnclosureVisible
	 * @private
	 * @param isVisible {bool}
	 */
	var setEnclosureVisible = function(isVisible: boolean){
		ukeGeeks.settings.opts.retainBrackets = isVisible;
	};

	/**
	 * (option dialog) change whether reference diagrams are sorted alphabetically or by their "song order"
	 * @method setSortAlphabetical
	 * @private
	 * @param isAlphabetical {bool}
	 */
	var setSortAlphabetical = function(isAlphabetical: boolean) {
		ukeGeeks.settings.opts.sortAlphabetical = isAlphabetical;
	};

	/**
	 * "Ignore Common" was checked, need to update master chord diagrams
	 * @method setIgnoreCommon
	 * @private
	 * @param isIgnore {bool}
	 */
	var setIgnoreCommon = function(isIgnore: boolean){
		ukeGeeks.settings.opts.ignoreCommonChords = isIgnore;
	};

	/**
	 * the list of common chords has been change; update UGS setting
	 * @method setCommonChordsList
	 * @private
	 * @param chordList {mixed} Either string, as comma seperated values list, or array of chord names
	 * @return {void}
	 */
	var setCommonChordsList = function(chordList: string | string[]) {
		if (typeof chordList == 'string') {
			var inputList = chordList.split(/[ ,]+/);
		var cleanList = [];

		for (var i = 0; i < inputList.length; i++) {
			var c = ukeGeeks.toolsLite.trim(inputList[i]);
			if (c.length > 0){
				cleanList.push(c);
			}
		}

			chordList = cleanList;
		}

		ukeGeeks.settings.commonChords = chordList;
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());
