/**
 * The Chord Builder's first panel: lists the song's `{define: ...}` chords. Opening one (or
 * "new") hands it to the builder; saving, and the delete button, change the song.
 *
 * This is the list and its bookkeeping only. The song's text comes from and goes back to the
 * host (chordBuilder.host.ts), songDefinitions does the text work, and chordReader reads a
 * definition as a chord. Song Formatter's chordBrush draws the small diagrams.
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
	// dependencies:
	const host = ugsChordBuilder.host,
		songDefinitions = ugsChordBuilder.songDefinitions,
		chordReader = ugsChordBuilder.chordReader;

	// the HTML UL element
	const chordListEle = function() {
		return host.byId(_ids.chordList, HTMLElement);
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
	let _setChordMethod: (chord: UgsChordBuilder.SourceChord | null) => void = function() {};

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
		// last line to first: the list has always shown the song's definitions bottom-up
		for (const found of songDefinitions.find(host.getSong()).reverse()) {
			definitionAdd(found.name, found.definition);
		}
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
		host.byId(_ids.chooserPanel, HTMLElement).style.display = isChooserPanel ? 'block' : 'none';
		host.byId(_ids.builderPanel, HTMLElement).style.display = !isChooserPanel ? 'block' : 'none';
		host.panelChanged(isChooserPanel ? 'chooser' : 'builder');
	};

	/**
	 * The definitions listed, in the list's order (copies: changing them changes nothing here).
	 * @method getDefinitions
	 * @return {array}
	 */
	_public.getDefinitions = function() {
		return _chordDictionary.map(function(chord) {
			return { id: chord.id, name: chord.name, definition: chord.definition };
		});
	};

	/**
	 * The definition open in the builder; null for a new chord.
	 * @method getCurrent
	 * @return {ChordDefinition}
	 */
	_public.getCurrent = function() {
		return _currentChord ? { id: _currentChord.id, name: _currentChord.name, definition: _currentChord.definition } : null;
	};

	/**
	 * Returns TRUE if Save completed OK, false otherwise (duplicate name or unable to update)
	 * @method save
	 * @param  {JSON} data
	 * @return {bool}
	 */
	_public.save = function(data) {
		if (dictionaryFindDupes(_currentChord == null ? -1 : _currentChord.id, data.name) >= 0) {
			host.alert('Hey, this chord name is already being used.');
			return false;
		}
		let id: number;
		if (_currentChord == null) {
			id = definitionAdd(data.name, data.definition);
			_currentChord = dictionaryFind(id);
			host.setSong(songDefinitions.add(host.getSong(), data.definition));
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
			host.setSong(songDefinitions.replace(host.getSong(), oldDefinition, chord.definition));
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
		if (!host.confirm('Delete definition for "' + chord.name + '"?')) {
			return;
		}
		const item = listGetItem(chord.id);
		if (!item) {
			return;
		}
		chordListEle().removeChild(item);
		_chordDictionary.splice(dictionaryGetIndex(chord.id), 1);
		_currentChord = null;
		host.setSong(songDefinitions.remove(host.getSong(), chord.definition));

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
			chord = chordReader.read(_currentChord.definition);
			if (chord && chordReader.hasMutedStrings(chord)) {
				host.alert('Uh-oh! This chord uses muted strings!\nCurrently the Chord Builder does not support muted strings -- \nsaving edits will result in mutes being lost.');
			}
		}
		_setChordMethod(chord);
		_public.show(false);
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
		const innerHtml = '<span class="ugsEditor-deleteChord" data-id="' + id + '" data-action="delete" title="Remove this definition"></span>' + ugsChordBuilder.html.escape(name);
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
		// Song Formatter's chord for Song Formatter's brush: the small diagram is all its work
		const chord = ukeGeeks.chordImport.runLine(defintion.definition);
		if (!chord) {
			// Song Formatter can't read this {define}: no mini-diagram
			return;
		}
		if (_ugsBrushTool == null) {
			_ugsBrushTool = new ukeGeeks.chordBrush();
		}
		_ugsBrushTool.plot(element, chord, _diagramSettings.dimensions, _diagramSettings.fonts, _diagramSettings.colors);
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