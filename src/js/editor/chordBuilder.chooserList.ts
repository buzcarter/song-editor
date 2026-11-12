declare namespace UgsChordBuilder {
	/** A chord read by Song Formatter (chordImport.runLine) */
	type Chord = import('@ukegeeks/song-formatter').Chord;
	/** A {define: ...} in the song, listed in the chooser */
	interface ChordDefinition {
		id: number;
		name: string;
		definition: string;
	}
	/** What the builder's Add/Update button saves */
	interface SaveData {
		name: string;
		startingFret: number;
		dots: Dot[];
		definition: string;
	}
	interface ChooserList {
		/** Lists the song's chord definitions; `setChordFunction` opens one in the builder (null: a new chord) */
		init(setChordFunction: (chord: Chord | null) => void): void;
		/** Re-reads the song's definitions */
		reset(): void;
		/** Shows the chooser (true) or the builder (false) */
		show(isChooserPanel: boolean): void;
		/** Adds or updates the definition in the song; false if the name is taken */
		save(data: SaveData): boolean;
	}
}
interface UgsChordBuilder {
	chooserList: UgsChordBuilder.ChooserList;
}

/**
 * The Chord Builder's first panel: lists the song's `{define: ...}` chords, read from the
 * Edit Song box. Opening one (or "new") hands it to the builder; saving writes the definition
 * back into the Edit Song box and redraws the song (actions.run()).
 * @class chooserList
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.chooserList = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.ChooserList;

	// array of custom chords defined in this song
	let _chordDictionary: UgsChordBuilder.ChordDefinition[] = [];
	// the HTML UL element (the editor's checked lookup: ugsEditorPlus.dom loads before the Chord Builder)
	const chordListEle = function() {
		return ugsEditorPlus.dom.byId(_ids.chordList, HTMLElement);
	};

	/**
	 * magic value for start a new chord (constant)
	 * @final
	 * @attribute C_NEW_CHORD
	 * @type {Int}
	 */
	const C_NEW_CHORD = -1;

	// next available Id used on LI's
	let _nextId = 0;

	// HTML element Ids
	const _ids = {
		// ChordPro Song -- the unmodified source
		source: 'chordProSource',
		// the UL where we'll be loading the chords
		chordList: 'cdBldPick',
		builderPanel: 'cdBldBuilderPanel',
		chooserPanel: 'cdBldChooserPanel'
	};

	/**
	 * Chord current sent to the editor.
	 * @attribute _currentChord
	 */
	let _currentChord: UgsChordBuilder.ChordDefinition | null = null;

	/**
	 * Handle to the chordBuilder (UI) "setChord" method
	 * @attribute _setChordMethod
	 */
	let _setChordMethod: (chord: UgsChordBuilder.Chord | null) => void = function() {};

	/**
	 * Hanlde to instance of Scriptasaurus chord brush class, to paint the wee little
	 * chord diagrams onto the Chooser List.
	 * @attribute _ugsBrushTool
	 * @type {Object}
	 */
	let _ugsBrushTool: InstanceType<typeof ukeGeeks.chordBrush> | null = null;

	/**
	 * Required settings for the Chord Brush -- dimensions, fonts, and colors.
	 * @attribute _diagramSettings
	 * @type {JSON}
	 */
	const _diagramSettings = {
		dimensions: {
			showText: false,
			height: 50,
			width: 40,
			fretSpace: 9,
			stringSpace: 7,
			dotRadius: 3,
			lineWidth: 1,
			topLeftPos: {
				x: 10,
				y: 2
			},
			xWidth: 0.7 * 7,
			xStroke: 1.4 * 1
		},
		fonts: {
			dot: '8pt Arial',
			text: '8pt Arial',
			fret: '8pt Arial'
		},
		colors: {
			fretLines: '#EED18E',
			dots: '#551D00', //'#9A532D',
			dotText: '#ffffff',
			text: '#000000',
			fretText: '#EED18E',
			xStroke: '#551D00'
		}
	};

	/** A {define} from the song; its list item has the same id (data-id) */
	class ChordDefinition implements UgsChordBuilder.ChordDefinition {
		/** the next free id: 0, 1, 2... (reset() starts over) */
		id: number = _nextId++;
		name: string;
		/** the whole {define: ...} line */
		definition: string;

		constructor(name: string, definition: string) {
			this.name = name;
			this.definition = definition;
		}
	}

	/**
	 * @method init
	 * @param  {function} setChordFunction
	 */
	_public.init = function(setChordFunction) {
		_setChordMethod = setChordFunction;
		// attach click handler to the UL avoids need to attach to individual LI items (these get added & deleted frequently)
		chordListEle().addEventListener('click', onClick, false);
		_start();
	};

	const _start = function() {
		songGetDefinitions(ugsEditorPlus.dom.byId(_ids.source, HTMLTextAreaElement).value);
		listLoad(chordListEle(), _chordDictionary);
	};

	_public.reset = function() {
		_chordDictionary = [];
		chordListEle().innerHTML = '';
		_nextId = 0;
		_currentChord = null;
		_start();
	};

	/**
	 * Shows either the "Chooser" or "Chord Builder/Editor" panel.
	 * @method show
	 * @public
	 * @param {bool} isChooserPanel
	 */
	_public.show = function(isChooserPanel) {
		const dom = ugsEditorPlus.dom;
		const chooserPanel = dom.byId(_ids.chooserPanel, HTMLElement);
		chooserPanel.style.display = isChooserPanel ? 'block' : 'none';
		dom.byId(_ids.builderPanel, HTMLElement).style.display = !isChooserPanel ? 'block' : 'none';
		dom.closest(chooserPanel, '.ugsEditor-overlay', HTMLElement).classList.toggle('ugsEditor-chordBuilderNarrow', isChooserPanel);
	};

	/**
	 * Returns TRUE if Save completed OK, false otherwise (duplicate name or unable to update)
	 * @method save
	 * @param  {JSON} data
	 * @return {bool}
	 */
	_public.save = function(data) {
		if (dictionaryFindDupes(_currentChord == null ? -1 : _currentChord.id, data.name) >= 0) {
			alert('Hey, this chord name is already being used.');
			return false;
		}
		let id: number;
		if (_currentChord == null) {
			id = definitionAdd(data.name, data.definition);
			_currentChord = dictionaryFind(id);
			songAddDefinition(data.definition);
		}
		else {
			const chord = _chordDictionary[dictionaryGetIndex(_currentChord.id)];
			if (!chord) {
				// console.log('error: not found');
				return false;
			}
			const oldDefinition = chord.definition;
			chord.name = data.name;
			chord.definition = data.definition;
			id = chord.id;
			songReplace(oldDefinition, chord.definition);
		}
		listUpdate(id);
		_public.show(true);
		return true;
	};

	/**
	 * Handles confirming & removing a chord from the list and the song.
	 * @method doDelete description]
	 * @param  {ChordDefinition} chord
	 * @return {void}
	 */
	const doDelete = function(chord: UgsChordBuilder.ChordDefinition) {
		if (!confirm('Delete definition for "' + chord.name + '"?')) {
			return;
		}
		const item = listGetItem(chord.id);
		if (!item) {
			return;
		}
		chordListEle().removeChild(item);
		songReplace(chord.definition, '');

	};

	/**
	 * ListItem click event handler
	 * @method onClick
	 * @param  {Event} evt
	 */
	const onClick = function(evt: MouseEvent) {
		evt.preventDefault();
		// The click lands on a list item, its delete button, or something inside the item: its
		// mini-diagram is an <svg> full of lines and circles. The nearest element with a data-id
		// says which chord (the delete button carries its own).
		const target = evt.target instanceof Element ? evt.target.closest('[data-id]') : null;
		if (!target || !chordListEle().contains(target)) {
			return;
		}
		_currentChord = dictionaryFind(target.getAttribute('data-id'));
		if (target.getAttribute('data-action') === 'delete') {
			if (_currentChord) {
				doDelete(_currentChord);
			}
			return;
		}

		let chord = null;
		if (_currentChord != null) {
			chord = ukeGeeks.chordImport.runLine(_currentChord.definition);
			if (chord && hasMutedStrings(chord)) {
				alert('Uh-oh! This chord uses muted strings!\nCurrently the Chord Builder does not support muted strings -- \nsaving edits will result in mutes being lost.');
			}
		}
		_setChordMethod(chord);
		_public.show(false);
	};

	/**
	 * Checks whether any of the Chord's strings have been muted.
	 * @method hasMutedStrings
	 * @param  {ugs.chord}  chord
	 * @return {Boolean}
	 */
	const hasMutedStrings = function(chord: UgsChordBuilder.Chord) {
		if (chord.muted) {
			for (let i = 0; i < chord.muted.length; i++) {
				if (chord.muted[i]) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * updates an exiting HTML ListItem (LI) using the info stored for Id in
	 * the chord dictionary (array). Appends new ListItem if not found.
	 * @method listUpdate
	 * @param  {int} id
	 * @return {DOM_LI}
	 */
	const listUpdate = function(id: number) {
		const def = dictionaryFind(id);
		if (!def) {
			// (save() passes the id it just added or updated)
			return null;
		}
		let item: HTMLLIElement | null | void = listGetItem(id);
		if (!item) {
			item = listAddItem(id, def.name);
		}
		else {
			item.innerHTML = listHtmlString(id, def.name, true);
		}
		listAddDiagram(id);
		return item;
	};

	/**
	 * finds the HTML ListItem corresponding to Id
	 * @method listGetItem
	 * @param  {int} id
	 * @return {DOM_LI}
	 */
	const listGetItem = function(id: number | string | null) {
		const items = chordListEle().getElementsByTagName('li');
		for (const item of items) {
			if (item.getAttribute('data-id') === ('' + id)) {
				return item;
			}
		}
		return null;
	};

	/**
	 * Returns HTML snippet for an LI
	 * @method listHtmlString
	 * @param  {int} id
	 * @param  {string} name chord name, straight from the song's {define}: HTML-escaped here
	 * @param  {bool} isInner (optional) if TRUE only reutrns the inner HTML part, otherwise returns complete LI tag
	 * @return {string}
	 */
	const listHtmlString = function(id: number, name: string, isInner?: boolean) {
		isInner = (arguments.length > 2) ? isInner : false;
		const innerHtml = '<span class="ugsEditor-deleteChord" data-id="' + id + '" data-action="delete" title="Remove this definition"></span>' + ukeGeeks.toolsLite.escapeHtml(name);
		return isInner ? innerHtml : '<li data-id="' + id + '" title="Edit this definition" class="ugs-grouped">' + innerHtml + '</li>';
	};

	/**
	 * Clears and loads the HTML UL using currently values in Chord Dictionary
	 * @method listLoad
	 * @param {DOM_UL} ul
	 * @param {array} chordDefs
	 */
	const listLoad = function(ul: HTMLElement, chordDefs: UgsChordBuilder.ChordDefinition[]) {
		let s = '';
		for (const chordDef of chordDefs) {
			s += listHtmlString(chordDef.id, chordDef.name);
		}
		ul.innerHTML = '<li data-id="' + C_NEW_CHORD + '" class="ugsEditor-newChord">+ Add New Chord</li>' + s;

		const items = ul.getElementsByTagName('li');
		// last to first, skipping the first item ("+ Add New Chord")
		for (let i = items.length - 1; i >= 1; i--) {
			const item = items[i];
			if (item) {
				listAddDiagram(item.getAttribute('data-id'));
			}
		}
	};

	/**
	 * Appends a new HTML ListItem to our UL.
	 * @method listAddItem
	 * @param  {int} id
	 * @param  {string} name
	 */
	const listAddItem = function(id: number, name: string) {
		const temp = document.createElement('ul');
		temp.innerHTML = listHtmlString(id, name);
		const item = temp.firstChild;
		if (item) {
			chordListEle().appendChild(item);
		}
	};

	/**
	 * Adds mini-chord diagram to the list item found by Id.
	 * @method listAddDiagram
	 */
	const listAddDiagram = function(id: number | string | null) {
		const element = listGetItem(id);
		const defintion = dictionaryFind(id);
		// (the list holds an item for each definition)
		if (!element || !defintion) {
			return;
		}
		const chord = ukeGeeks.chordImport.runLine(defintion.definition);
		if (!chord) {
			// Song Formatter can't read this {define}: no mini-diagram
			return;
		}
		//var fretBox = ukeGeeks.settings.inlineFretBox;
		//var fontSettings = ukeGeeks.settings.inlineFretBox.fonts;
		if (_ugsBrushTool == null) {
			_ugsBrushTool = new ukeGeeks.chordBrush();
		}
		_ugsBrushTool.plot(element, chord, _diagramSettings.dimensions, _diagramSettings.fonts, _diagramSettings.colors);
	};

	/**
	 * Replaces every occurrence of searchValue in text with newValue, both taken as plain text.
	 * (Not String.replace: it reads "$&" or "$$" in newValue as patterns, and a chord name can
	 * contain them.)
	 * @method replaceAll
	 * @param  {string} text
	 * @param  {string} searchValue
	 * @param  {string} newValue
	 * @return {string}
	 */
	const replaceAll = function(text: string, searchValue: string, newValue: string): string {
		return text.split(searchValue).join(newValue);
	};

	/**
	 * Updates Source and Runs Scriptasaurus after updaint the definition
	 * @method songReplace
	 * @param  {string} oldDefinition
	 * @param  {string} newDefinition
	 * @return {void}
	 */
	const songReplace = function(oldDefinition: string, newDefinition: string) {
		const e = ugsEditorPlus.dom.byId(_ids.source, HTMLTextAreaElement);
		e.value = replaceAll(e.value, oldDefinition, newDefinition);
		ugsEditorPlus.songText.changed();
		ugsEditorPlus.actions.run();
	};

	/**
	 * Loops over all lines in "text" and extracts any {define:...} statements, adding
	 * them to the ChordDictionary.
	 * @method songGetDefinitions
	 */
	const songGetDefinitions = function(text: string) {
		const defineRegEx = /\{define:\s*([^}]+?)\s+frets[^}]+?\}/im;
		const lines = text.split('\n');
		// last line to first
		for (const line of lines.reverse()) {
			if (!defineRegEx.test(line)) {
				continue;
			}
			definitionAdd(line.replace(defineRegEx, '$1'), line);
		}
	};

	/**
	 * Inserts the passed chord definition into the song (and reruns Sscriptasaurus).
	 * The chord insertion point is at the end of either the song meta tags or the
	 * existing chord defintion block. Determined by the _last_ "header" tag line.
	 * @method songAddDefinition
	 * @param {string} definition
	 */
	const songAddDefinition = function(definition: string) {
		const choProText = ugsEditorPlus.dom.byId(_ids.source, HTMLTextAreaElement);
		const instructionRegEx = /\s*\{\s*(title|t|artist|subtitle|st|album|define):.*?\}/im;
		const lines = choProText.value.split('\n');
		let html = '';
		let inserted = false;
		// last line to first
		for (const line of lines.reverse()) {
			if (!inserted && instructionRegEx.test(line)) {
				html = definition + '\n' + html;
				inserted = true;
			}
			html = line + '\n' + html;
		}
		if (!inserted) {
			html = definition + '\n' + choProText.value;
		}
		choProText.value = html;
		ugsEditorPlus.songText.changed();
		ugsEditorPlus.actions.run();
	};

	/**
	 * Returns Index of Id within the chord Dictionary or -1 if not found.
	 * @method dictionaryGetIndex
	 * @param  {int} id
	 * @return {int}
	 */
	const dictionaryGetIndex = function(id: number | string | null) {
		return _chordDictionary.findIndex(function(chord) {
			return '' + chord.id === '' + id;
		});
	};

	/**
	 * Returns index of the duplicate chord name. Pass in Id of the chord to be ignored,
	 * (i.e. the one currently being edited). Comparison ignores case. Returns -1 if no
	 * dupe is found.
	 * @method dictionaryFindDupes
	 * @param  {int} id
	 * @param  {string} name
	 * @return {int}
	 */
	const dictionaryFindDupes = function(id: number, name: string) {
		const search = name.toLowerCase();
		for (let i = _chordDictionary.length - 1; i >= 0; i--) {
			const chord = _chordDictionary[i];
			if (chord && ('' + chord.id !== '' + id) && (chord.name.toLowerCase() === search)) {
				return i;
			}
		}

		return -1;
	};

	/**
	 * Returns the entry for Id from Chord Dictionary
	 * @method dictionaryFind
	 * @param  {int} id
	 * @return {ChordDefinition}
	 */
	const dictionaryFind = function(id: number | string | null) {
		return _chordDictionary[dictionaryGetIndex(id)] ?? null;
	};

	/**
	 * Adds new chord definition to our Dictionary array. Returns the
	 * new item's Id (int).
	 * @method definitionAdd
	 * @param {string} name
	 * @param {string} definition
	 * @return {int}
	 */
	const definitionAdd = function(name: string, definition: string) {
		const chord = new ChordDefinition(name, definition);
		_chordDictionary.push(chord);
		return chord.id;
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());