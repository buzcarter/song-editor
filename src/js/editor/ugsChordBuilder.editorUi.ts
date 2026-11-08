declare namespace UgsChordBuilder {
	/** The builder's UI: canvases, toolbox, name and fret fields, Add/Cancel */
	interface EditorUi {
		/** false when the browser has no canvas */
		init(): boolean;
		/** Back to a new chord, showing the chooser */
		reload(): void;
	}
}
interface UgsChordBuilder {
	editorUi: new () => UgsChordBuilder.EditorUi;
}


/**
 * The Chord Builder's second panel: two stacked canvases (the fretboard and dots underneath,
 * the cursor on top), the toolbox (dot or finger tool, slide up/down), the name and starting
 * fret fields, and the {define} it makes. Add/Update hands that to chooserList.save().
 * @class editorUi
 * @constructor
 * @namespace ugsChordBuilder
 */
ugsChordBuilder.editorUi = function(this: UgsChordBuilder.EditorUi) {

	const _ids = {
		// top-most container, the "master drawing surface"
		container: 'cdBldEditorSurface',
		// stacked canvas elements
		cursorCanvas: 'cdBldCursorCanvas',
		diagramCanvas: 'cdBldDiagramCanvas',
		// chord definition meta: name & fret
		startingFret: 'cdBldStartingFret',
		chordName: 'cdBldChordName',
		// container wrapping sliding toolbox pallet
		toolbox: 'cdBldToolbox',
		// toolbox buttons:
		dotsBtn: 'cdBldDotsBtn',
		fingersBtn: 'cdBldFingersBtn',
		slideUpBtn: 'toolboxSlideUpBtn',
		slideDownBtn: 'toolboxSlideDownBtn',
		// display on "Hand" toolbox button
		btnFingerName: 'cdBldBtnFingerName',
		btnHandPic: 'cdBldBtnDiagram',
		// container for generated chordPro "define" tag (colorized)
		output: 'cdBldOutput',
		// show/hide definition output & container where we'll stuff the colorized definition
		showOutputBtn: 'cdBldShowOutputBtn',
		outputBox: 'cdBldOutputBox',
		cancelBtn: 'cdBldCancelBtn',
		saveBtn: 'cdBldSaveBtn'
		// 		openBtn: 'cdBldOpenBtn'
	};

	// the editor's checked lookups (ugsEditorPlus.dom loads before the Chord Builder)
	const dom = ugsEditorPlus.dom;

	// these elements are found by init(); everything that uses them runs after it
	let _cursorCanvas: HTMLCanvasElement | null = null,
		_eleDotsBtn: HTMLElement | null = null,
		_eleFingerBtn: HTMLElement | null = null;

	let _startingFret = 1;
	let _currentName = '';

	let _isDotToolActive = true;
	let _finger = 0;

	/**
	 * A "reverse Enum" dictionary of finger number to description
	 * @attribute _fingerNames
	 * @type {JSON}
	 */
	const _fingerNames: Record<number, string> = {
		0: 'None',
		1: 'Index finger',
		2: 'Middle finger',
		3: 'Ring finger',
		4: 'Pinkie'
	};

	/**
	 * Returns FALSE if canvas is not supported
	 * @method init
	 * @return {bool}
	 */
	this.init = function() {
		_cursorCanvas = dom.byId(_ids.cursorCanvas, HTMLCanvasElement);
		if (!_cursorCanvas.getContext) {
			return false;
		}

		const cursorContext = _cursorCanvas.getContext('2d');
		const diagramContext = dom.byId(_ids.diagramCanvas, HTMLCanvasElement).getContext('2d');
		// no 2D drawing: the same as no canvas
		if (!cursorContext || !diagramContext) {
			return false;
		}

		const ele = dom.byId(_ids.startingFret, HTMLSelectElement);
		addStartingFretOptions(ele);
		ele.addEventListener('change', onFretChange, false);

		dom.byId(_ids.chordName, HTMLInputElement).addEventListener('keyup', onNameChange, false);

		_eleDotsBtn = dom.byId(_ids.dotsBtn, HTMLElement);
		_eleFingerBtn = dom.byId(_ids.fingersBtn, HTMLElement);
		_eleDotsBtn.addEventListener('click', toggleTool, false);
		_eleFingerBtn.addEventListener('click', toggleTool, false);

		dom.byId(_ids.showOutputBtn, HTMLInputElement).addEventListener('click', showOutputBox, false);
		dom.byId(_ids.cancelBtn, HTMLElement).addEventListener('click', onCancelClick, false);
		dom.byId(_ids.saveBtn, HTMLInputElement).addEventListener('click', onSaveClick, false);

		dom.byId(_ids.slideUpBtn, HTMLElement).addEventListener('click', slide, false);
		dom.byId(_ids.slideDownBtn, HTMLElement).addEventListener('click', slide, false);

		updateFinger();

		dom.byId(_ids.container, HTMLElement).addEventListener('mousemove', onMouseMove, false);
		_cursorCanvas.addEventListener('click', onMouseClick, false);

		ugsChordBuilder.chordCanvas.init(diagramContext, _cursorCanvas);
		ugsChordBuilder.cursorCanvas.init(cursorContext);

		redraw();
		exportDefinition();

		ugsChordBuilder.chooserList.init(setChord);

		return true;
	};

	/**
	 * Successively clicking the Finger tool cycles through index to pinky, then none, and so on.
	 * This method automatically increments the "currently active finger" (odd sentence, that)
	 * and updates the toolbox UI.
	 * Note: changing the cursor is not handled here.
	 * @method updateFinger
	 * @private
	 * @return {void}
	 */
	const updateFinger = function() {
		_finger++;
		if (_finger > 4) {
			_finger = 0;
		}
		dom.byId(_ids.btnFingerName, HTMLElement).innerHTML = _fingerNames[_finger] + ' (' + _finger + ')';
		dom.byId(_ids.btnHandPic, HTMLElement).className = 'fingerToolImage finger' + _finger;
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const showOutputBox = function() {
		// (the click is on the show-output checkbox)
		setClass(dom.byId(_ids.outputBox, HTMLElement), 'collapseOutput', !dom.byId(_ids.showOutputBtn, HTMLInputElement).checked);
	};

	/**
	 * Cancel button's click event handler
	 * @method onCancelClick
	 */
	const onCancelClick = function(evt: Event) {
		evt.preventDefault();
		reset();
		ugsChordBuilder.chooserList.show(true);
	};

	/**
	 * Save button's click event handler
	 * @method onSaveClick
	 */
	const onSaveClick = function(evt: Event) {
		evt.preventDefault();
		const d = {
			name: _currentName,
			startingFret: _startingFret,
			dots: ugsChordBuilder.fretDots.getDots(),
			definition: ugsChordBuilder.export.getDefinition(_currentName, _startingFret)
		};
		if (!ugsChordBuilder.chooserList.save(d)){
			const e = dom.byId(_ids.chordName, HTMLInputElement);
			e.focus();
			e.select();
		}
	};

	/**
	 * DANGER!! this is really a public method! A reference to this is passed to the
	 * scrapper during its initialization. Used to load ths Chord Builder
	 * @method setChord
	 * @param {Chord} chord
	 */
	const setChord = function(chord: UgsChordBuilder.Chord | null) {
		if (chord == null) {
			// a new chord
			reset();
			return;
		}

		const maxFret = findMaxFret(chord.dots);
		const startingFret = (maxFret > ugsChordBuilder.settings.fretBoard.numFrets) ? maxFret - ugsChordBuilder.settings.fretBoard.numFrets + 1 : 1;
		reset(chord.name, startingFret, convertDots(startingFret, chord.dots), false);
	};

	/**
	 * Converts Song Formatter's dots to the builder's: frets counted from the starting fret.
	 * An `add:` that leaves out a value gives a dot with a null in it; these are read the way
	 * Song Formatter draws them on the songsheet:
	 *  - no string: the first string
	 *  - no finger: no finger number
	 *  - no fret: dropped. The builder has no "fret 0" dot (loading one would clear its string,
	 *    erasing the chord's real dot there), and the songsheet draws it off the fretboard.
	 * Dots below the starting fret are dropped too, for the same reason.
	 * @method convertDots
	 * @param {int} startingFret
	 * @param  {array} builderDots
	 * @return {array}
	 */
	const convertDots = function(startingFret: number, builderDots: UgsChordBuilder.Chord['dots']) {
		const offset = startingFret - 1;
		const ugsDots: UgsChordBuilder.Dot[] = [];
		for (let i = 0; i < builderDots.length; i++) {
			const dot = builderDots[i];
			const fret = (dot.fret || 0) - offset;
			if (fret < 1) {
				continue;
			}
			ugsDots.push(new ugsChordBuilder.entities.Dot(dot.string || 0, fret, dot.finger || 0));
		}
		return ugsDots;
	};

	/**
	 * Loops over dots to find the largest fret value
	 * @method findMaxFret
	 * @param  {array} dots
	 * @return {ing}
	 */
	const findMaxFret = function(dots: UgsChordBuilder.Chord['dots']) {
		let max = 0;
		for (let i = 0; i < dots.length; i++) {
			const fret = dots[i].fret || 0;
			if (fret > max) {
				max = fret;
			}
		}
		return max;
	};

	/**
	 * Updates the "standard form-like inputs"
	 * @method resetInputs
	 * @param {string} name
	 * @param {int} startingFret
	 * @param {bool} isNew
	 * @return {void}
	 */
	const resetInputs = function(name: string | undefined, startingFret: number | undefined, isNew: boolean) {
		_currentName = (name && name.length > 0) ? name : 'CHORDNAME';
		dom.byId(_ids.chordName, HTMLInputElement).value = _currentName;

		_startingFret = startingFret ? startingFret : 1;
		dom.byId(_ids.startingFret, HTMLSelectElement).value = String(_startingFret);

		dom.byId(_ids.showOutputBtn, HTMLInputElement).checked = false;
		setClass(dom.byId(_ids.outputBox, HTMLElement), 'collapseOutput', true);

		dom.byId(_ids.saveBtn, HTMLInputElement).value = isNew ? 'Add' : 'Update';
	};

	/**
	 * Updates the Toolbox's current tool to be "Add Dot"; sets properties required for cursor, etc.
	 * @method resetCurrentTool
	 */
	const resetCurrentTool = function() {
		// restore current drawing tool (this is lame-o)
		// -----------------------------------------------
		_isDotToolActive = true;
		_finger = 0;
		updateFinger();
		if (_eleDotsBtn && _eleFingerBtn) {
			setClass(_eleDotsBtn, 'selected', _isDotToolActive);
			setClass(_eleFingerBtn, 'selected', !_isDotToolActive);
		}
		setClass(dom.byId(_ids.toolbox, HTMLElement), 'open', !_isDotToolActive);
		ugsChordBuilder.cursorCanvas.setCursor(_isDotToolActive, _finger);
	};

	/**
	 * Does a complete UI reset (if no values provided in params), otherwise this is kinda a "set"
	 * @method reset
	 * @param {string} name Chord name
	 * @param {int} startingFret
	 * @param {array} dots
	 * @param {bool} isNew Used to set the button text
	 */
	const reset = function(name?: string, startingFret?: number, dots?: UgsChordBuilder.Dot[], isNew?: boolean) {
		isNew = arguments.length > 3 ? isNew : true;
		// fire cleanup on other classes...
		// -----------------------------------------------
		ugsChordBuilder.fretDots.reset();

		// easy elements back to default...
		// -----------------------------------------------
		resetInputs(name, startingFret, !!isNew);

		resetCurrentTool();

		if (dots && dots.length > 0) {
			for (let i = 0; i < dots.length; i++) {
				ugsChordBuilder.fretDots.toggleDot(dots[i]);
			}
		}

		// ok, probably done
		// -----------------------------------------------
		redraw();
		exportDefinition();
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const toggleTool = function(evt: Event) {
		evt.preventDefault();
		// the Dots and Fingers buttons are links: #dots and #fingers
		const button = evt.currentTarget;
		const useDotTool = button instanceof HTMLAnchorElement && button.href.indexOf('#dots') >= 0;
		if (useDotTool == _isDotToolActive) {
			if (!useDotTool) {
				updateFinger();
				ugsChordBuilder.cursorCanvas.setCursor(_isDotToolActive, _finger);
			}
			return;
		}

		if (_eleDotsBtn && _eleFingerBtn) {
			setClass(_eleDotsBtn, 'selected', useDotTool);
			setClass(_eleFingerBtn, 'selected', !useDotTool);
		}
		setClass(dom.byId(_ids.toolbox, HTMLElement), 'open', !useDotTool);

		_isDotToolActive = useDotTool;
		ugsChordBuilder.cursorCanvas.setCursor(_isDotToolActive, _finger);
	};

	/**
	 * Yet another add/remove CSS class method.
	 * @method
	 * @private
	 * @return {void}
	 */
	const setClass = function(element: HTMLElement, className: string, isSet: boolean) {
		const hasClass = element.className.indexOf(className) >= 0;
		if (isSet && !hasClass) {
			// add
			element.className += ' ' + className;
		}
		else if (!isSet && hasClass) {
			// remove
			element.className = element.className.replace(className, '').replace(/\s+/g, ' ');
		}
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const addStartingFretOptions = function(ele: HTMLElement) {
		let s = '';
		const lastValue = ugsChordBuilder.settings.fretBoard.maxFret - ugsChordBuilder.settings.fretBoard.numFrets + 1;
		for (let i = 1; i <= lastValue; i++) {
			s += '<option value="' + i + '">' + i + '</option>';
		}
		ele.innerHTML = s;
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const onNameChange = function(this: HTMLInputElement) {
		_currentName = this.value;
		exportDefinition();
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const onFretChange = function(this: HTMLSelectElement) {
		_startingFret = parseInt(this.value, 10);
		exportDefinition();
		redraw();
	};

	/**
	 * Needs to watch for closed chords!
	 * @method
	 * @private
	 * @return {void}
	 */
	const slide = function(evt: Event) {
		evt.preventDefault();
		let moveAllowed = false;
		const target = evt.target;
		const numSteps = target instanceof Element && target.getAttribute('data-direction') == 'up' ? -1 : +1;
		if (ugsChordBuilder.fretDots.slide(numSteps)) {
			moveAllowed = true;
		}
		else {
			const newStart = _startingFret + numSteps;
			const lastValue = ugsChordBuilder.settings.fretBoard.maxFret - ugsChordBuilder.settings.fretBoard.numFrets + 1;
			if ((newStart >= 1) && (newStart <= lastValue)) {
				_startingFret = newStart;
				dom.byId(_ids.startingFret, HTMLSelectElement).value = String(newStart);
				moveAllowed = true;
			}
		}

		if (moveAllowed) {
			redraw();
			exportDefinition();
		}
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const onMouseMove = function(this: HTMLElement, evt: MouseEvent) {
		ugsChordBuilder.cursorCanvas.draw(getPosition(this, evt));
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const onMouseClick = function(this: HTMLCanvasElement, evt: MouseEvent) {
		// (listens on the cursor canvas)
		const pos = getPosition(this, evt);
		const dot = ugsChordBuilder.tracking.toDot(pos);
		if (!dot) {
			return;
		}

		if (_isDotToolActive) {
			ugsChordBuilder.fretDots.toggleDot(dot);
			redraw(pos);
			exportDefinition();
		}
		else if (ugsChordBuilder.fretDots.toggleFinger(dot, _finger)) {
			redraw(pos);
			exportDefinition();
		}
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const getPosition = function(canvas: HTMLElement, evt: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		return new ugsChordBuilder.entities.Position(
			evt.clientX - rect.left,
			evt.clientY - rect.top
		);
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const redraw = function(pos?: UgsChordBuilder.Position) {
		pos = pos || new ugsChordBuilder.entities.Position(0, 0);
		ugsChordBuilder.chordCanvas.draw(pos, _startingFret);
	};

	/**
	 * @method
	 * @private
	 * @return {void}
	 */
	const exportDefinition = function() {
		dom.byId(_ids.output, HTMLElement).innerHTML = ugsChordBuilder.export.getDefinitionHtml(_currentName, _startingFret);
	};

	this.reload = function(){
		reset();
		ugsChordBuilder.chooserList.reset();
		ugsChordBuilder.chooserList.show(true);
	};

} as unknown as new () => UgsChordBuilder.EditorUi;
