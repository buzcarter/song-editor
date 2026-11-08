declare namespace UgsChordBuilder {
	interface Position {
		x: number;
		y: number;
	}
	interface Dimensions {
		width: number;
		height: number;
	}
	interface BoundingBox extends Position, Dimensions {
	}
	/** A finger dot on the fretboard; strings count from 0 (G on a GCEA uke) */
	interface Dot {
		string: number;
		fret: number;
		finger: number;
	}
	/** One string's dots (see export) */
	interface StringDots {
		string: number;
		dots: Dot[];
	}
	/** Constructors (plain functions, called with `new`) */
	interface Entities {
		BoundingBox: new (pos?: Position | null, dimensions?: Dimensions) => BoundingBox;
		Dot: new (string: number, fret?: number, finger?: number) => Dot;
		Position: new (x?: number, y?: number) => Position;
	}
	interface Font {
		fontFamily: string;
		/** pixels */
		fontSize: number;
	}
	interface Settings {
		/** top left of the fretboard */
		anchorPos: Position;
		cursor: { fillColor: string, strokeWidth: number, strokeColor: string, radius: number, imageUri: string };
		fretBoard: { numFrets: number, maxFret: number, stringNames: string[], strokeWidth: number, strokeColor: string, fretSpace: number, stringSpace: number };
		dot: Font & { fillColor: string, radius: number, strokeWidth: number, strokeColor: string, fontWeight: string, fontColor: string };
		fretLabel: Font & { color: string, lightColor: string };
		stringLabel: Font & { color: string };
		chord: { nameMaxLength: number };
		/** size of the box around one fret on one string */
		targetDimensions(): Dimensions;
		targetAnchorPos(): Position;
		/** centers the fretboard on the canvas */
		centerAnchor(canvas: HTMLCanvasElement): void;
	}
	interface Tracking {
		/** the fretboard spot under the cursor, or null */
		toDot(pos: Position): Dot | null;
	}
	interface FretDots {
		getDots(): Dot[];
		/** moves every dot numSteps frets; false if one would fall off the board */
		slide(numSteps: number): boolean;
		/** adds or removes a dot (fret 0 clears the string) */
		toggleDot(dot: Dot): void;
		toggleFinger(dot: Dot, finger: number): boolean;
		reset(): void;
		draw(context: CanvasRenderingContext2D): void;
	}
	interface CursorCanvas {
		init(ctx: CanvasRenderingContext2D): void;
		setCursor(isDot: boolean, finger: number): void;
		draw(pos: Position): void;
	}
	interface ChordCanvas {
		init(ctx: CanvasRenderingContext2D, ele: HTMLCanvasElement): void;
		draw(pos: Position, startingFret: number): void;
	}
	interface Export {
		getPrimaryFrets(startingFret: number): number[];
		/** the ChordPro {define: ...} tag */
		getDefinition(chordName: string, startingFret: number): string;
		/** getDefinition(), syntax-highlighted */
		getDefinitionHtml(chordName: string, startingFret: number): string;
	}
}
interface UgsChordBuilder {
	entities: UgsChordBuilder.Entities;
	settings: UgsChordBuilder.Settings;
	tracking: UgsChordBuilder.Tracking;
	fretDots: UgsChordBuilder.FretDots;
	cursorCanvas: UgsChordBuilder.CursorCanvas;
	chordCanvas: UgsChordBuilder.ChordCanvas;
	export: UgsChordBuilder.Export;
}

/**
 * Library for an HTML5 WYSIWYG editor to build ChordPro chord define tags.
 * @module  ugsChordBuilder
 * @namespace ugsChordBuilder
 * @main  ugsChordBuilder
 */
var ugsChordBuilder: UgsChordBuilder = window.ugsChordBuilder || ({} as UgsChordBuilder);
ugsChordBuilder.version = '1.0.6';

/**
 * Entities (data containers) shared between the class libraries. Private
 * JSON objects used internally by a class are not included here.
 * @class entities
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.entities = {
	/**
	 * @class entities.BoundingBox
	 * @constructor
	 * @param  {Position} pos   Position (JSON) object
	 * @param  {JSON} dimensions JSON Object of form: {width: {int}, height: {int}}
	 */
	BoundingBox: function(this: UgsChordBuilder.BoundingBox, pos?: UgsChordBuilder.Position | null, dimensions?: UgsChordBuilder.Dimensions) {
		/**
		 * @property x
		 * @type {int}
		 */
		this.x = pos ? pos.x : 0;
		/**
		 * @property y
		 * @type {int}
		 */
		this.y = pos ? pos.y : 0;
		/**
		 * @property width
		 * @type {int}
		 */
		this.width = dimensions ? dimensions.width : 1;
		/**
		 * @property height
		 * @type {int}
		 */
		this.height = dimensions ? dimensions.height : 1;
	},

	/**
	 * Describes a fingering Dot on the fretboard
	 * @class entities.Dot
	 * @constructor
	 * @param  {int} string
	 * @param  {int} fret
	 * @param  {int} finger
	 */
	Dot: function(this: UgsChordBuilder.Dot, string: number, fret?: number, finger?: number) {
		/**
		 * String number, on sporano (GCEA), G is 0th string, and so on
		 * @property string
		 * @type {int}
		 */
		this.string = string;
		/**
		 * @property fret
		 * @type {int}
		 */
		this.fret = fret ? fret : 0;
		/**
		 * @property finger
		 * @type {int}
		 */
		this.finger = finger ? finger : 0;
	},

	/**
	 * @class entities.Position
	 * @constructor
	 * @param  {int} x
	 * @param  {int} y
	 */
	Position: function(this: UgsChordBuilder.Position, x?: number, y?: number) {
		/**
		 * @property x
		 * @type {int}
		 */
		this.x = x ? x : 0;
		/**
		 * @property y
		 * @type {int}
		 */
		this.y = y ? y : 0;
	}
	} as unknown as UgsChordBuilder.Entities;

/**
 * "Properties, Options, Preferences" such as fretboard size and colors; dot attributes, the cursors, fonts etc.
 * @class settings
 * @namespace ugsChordBuilder
 * @static
 * @final
 * @singleton
 */
ugsChordBuilder.settings = (function() {
	// "Revealing Module Pattern"

	// dependencies:
	const ents = ugsChordBuilder.entities;

	//'Geneva, "Lucida Sans", "Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, sans-serif';
	/**
	 * San-serif font stack used when drawing text on Canvas.
	 * @property {String} FONT_STACK
	 * @final
	 * @constant
	 */
	const FONT_STACK = 'Arial, "Helvetica Neue", Helvetica, Verdana, sans-serif';

	/**
	 * Fretboard upper left hand corner position (pseudo-constants)
	 * @method anchorPos
	 * @type {Position}
	 * @static
	 */
	const anchorPos = {
		x: 75,
		y: 75
	};

	const cursor = {
		fillColor: 'rgba(220, 216, 73, 0.35)', // 'rgba(245, 127, 18, 0.3)',
		strokeWidth: 1,
		strokeColor: '#AAB444', // '#F57F12',
		radius: 9,
		imageUri: '/img/editor/hand-cursor.png'
	};

	const fretBoard = {
		numFrets: 5,
		maxFret: 16,
		stringNames: ['G', 'C', 'E', 'A'],
		strokeWidth: 4,
		strokeColor: '#8F8569',
		fretSpace: 35,
		stringSpace: 30
	};

	const dot = {
		fillColor: '#F68014',
		radius: 11,
		strokeWidth: 2,
		strokeColor: '#D56333',
		fontWeight: 'bold',
		fontFamily: FONT_STACK,
		fontSize: 16,
		fontColor: '#ffffff'
	};

	const fretLabel = {
		fontFamily: FONT_STACK,
		fontSize: 28, // Pixels
		color: '#6A6A63',
		lightColor: '#EAEAE8' //D6D6D6' //A4A4A3'
	};

	const stringLabel = {
		fontFamily: FONT_STACK,
		fontSize: 34, // Pixels
		color: '#DCD849' // #AAB444'//
	};

	const chord = {
		nameMaxLength: 20
	};

	/**
	 * Dimensions of a single target
	 * @method targetDimensions
	 * @return {JSON} {width: ?, height: ? }
	 */
	const targetDimensions = function() {
		return {
			height: fretBoard.fretSpace,
			width: fretBoard.stringSpace
		};
	};

	/**
	 * Top left-hand corner where Targets begin positioning
	 * @method targetAnchorPos
	 * @return {postion}
	 */
	const targetAnchorPos = function() {
		const dimensions = targetDimensions();
		return new ents.Position(
			anchorPos.x - 0.5 * dimensions.width,
			anchorPos.y - dimensions.height - 0.2 * fretBoard.strokeWidth
		);
	};

	/**
	 * re-centers the fretboard's anchor position
	 * @method centerFretboard
	 * @param  {element} canvas
	 * @return {void}
	 */
	const centerAnchor = function(canvas: HTMLCanvasElement) {
		anchorPos.x = (0.5 * canvas.width) - (0.5 * (fretBoard.stringNames.length - 1) * fretBoard.stringSpace) - fretBoard.strokeWidth;
		anchorPos.y = (0.5 * canvas.height) - (0.5 * fretBoard.numFrets * fretBoard.stringSpace);
	};

	return {
		// Properties
		anchorPos: anchorPos,
		cursor: cursor,
		fretBoard: fretBoard,
		dot: dot,
		fretLabel: fretLabel,
		stringLabel: stringLabel,
		chord: chord,
		// Methods
		targetDimensions: targetDimensions,
		targetAnchorPos: targetAnchorPos,
		centerAnchor: centerAnchor
	};
}());

/**
 * Tracks curor position relative to fretboard's hot (clickable) regions
 * @class tracking
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.tracking = (function() {
	// dependencies:
	const ents = ugsChordBuilder.entities,
		settings = ugsChordBuilder.settings;

	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.Tracking;

	let targetBox: UgsChordBuilder.BoundingBox | null = null;

	const getTarget = function() {
		if (targetBox) {
			return targetBox;
		}

		const dimensions = settings.targetDimensions();
		dimensions.width = dimensions.width * settings.fretBoard.stringNames.length;
		dimensions.height = dimensions.height * (settings.fretBoard.numFrets + 1);
		targetBox = new ents.BoundingBox(settings.targetAnchorPos(), dimensions);

		return targetBox;
	};

	/**
	 * Returns TRUE if the two objects overlap
	 * @method  collision
	 * @param  {BoundingBox} object1
	 * @param  {BoundingBox} object2
	 * @return {bool}
	 */
	const collision = function(object1: UgsChordBuilder.BoundingBox, object2: UgsChordBuilder.BoundingBox) {
		return (object1.x < object2.x + object2.width) && (object1.x + object1.width  > object2.x) && (object1.y < object2.y + object2.height) && (object1.y + object1.height > object2.y);
	};

	/**
	 * Converts position (x,y) to the fret
	 * @method toDot
	 * @param  {position} pos
	 * @return {dot}
	 */
	_public.toDot = function(pos) {
		const cursorBox = new ents.BoundingBox(pos);
		const box = getTarget();
		if (!collision(cursorBox, box)) {
			return null;
		}

		const dimensions = settings.targetDimensions();
		return new ents.Dot(
			Math.floor((pos.x - box.x) / dimensions.width),
			Math.floor((pos.y - box.y) / dimensions.height)
		);
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());

/**
 * Did I overlook this or was it deliberate? Either case, the "fret" in the dot object is
 * merely the fret in the visible diagram -- that is, a value between 0 and maxFrets, not
 * the actual fret on the instrument... beware.
 *
 * Unless otherwise stated all "dot" parames are of type ugsChordBuilder.entities.dot
 * @class fretDots
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.fretDots = (function() {
	// dependencies:
	const ents = ugsChordBuilder.entities,
		anchor_pos = ugsChordBuilder.settings.anchorPos,
		opts_board = ugsChordBuilder.settings.fretBoard,
		opts_dot = ugsChordBuilder.settings.dot;

	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.FretDots;

	// locals
	const _dots: UgsChordBuilder.Dot[] = [];

	_public.getDots = function() {
		return _dots.slice();
	};

	_public.slide = function(numSteps) {
		if (!inRange(numSteps)) {
			return false;
		}
		for (let i = 0; i < _dots.length; i++) {
			_dots[i].fret = _dots[i].fret + numSteps;
		}
		return true;
	};

	var inRange = function(numSteps: number) {
		for (let i = 0; i < _dots.length; i++) {
			if ((_dots[i].fret + numSteps < 1) || (_dots[i].fret + numSteps > opts_board.numFrets)) {
				return false;
			}
		}
		return true;
	};

	_public.toggleDot = function(dot) {
		if (dot.fret == 0) {
			clearColumn(dot.string);
			return;
		}

		const index = find(dot);
		if (index < 0) {
			_dots.push(dot);
		}
		else {
			_dots.splice(index, 1);
		}
	};

	_public.toggleFinger = function(dot, finger) {
		const index = find(dot);
		if (index < 0) {
			return false;
		}

		_dots[index].finger = _dots[index].finger == finger ? 0 : finger;
		return true;
	};

	/**
	 * Clears all saved dots.
	 * @method reset
	 */
	_public.reset = function() {
		for (let i = 0; i < opts_board.stringNames.length; i++) {
			clearColumn(i);
		}
	};

	/**
	 * Returns index of Dot within _dots or -1 if not found.
	 * @method find
	 * @param  {entities.dot} dot
	 * @return {int}
	 */
	var find = function(dot: UgsChordBuilder.Dot) {
		for (let i = _dots.length - 1; i >= 0; i--) {
			if (_dots[i].string == dot.string && _dots[i].fret == dot.fret) {
				return i;
			}
		}

		return -1;
	};

	/**
	 * Clears all dots for a particular string.
	 * @method clearColumn
	 * @param string {int}
	 */
	var clearColumn = function(string: number) {
		for (let i = _dots.length - 1; i >= 0; i--) {
			if (_dots[i].string == string) {
				_dots.splice(i, 1);
			}
		}
	};

	const getPosition = function(dot: UgsChordBuilder.Dot) {
		return new ents.Position(
			anchor_pos.x + 0.47 * opts_board.strokeWidth + dot.string * opts_board.stringSpace,
			anchor_pos.y + 0.47 * opts_board.strokeWidth + (dot.fret - 0.5) * opts_board.fretSpace
		);
	};

	const drawDot = function(context: CanvasRenderingContext2D, pos: UgsChordBuilder.Position) {
		context.beginPath();
		context.arc(pos.x, pos.y, opts_dot.radius, 0, 2 * Math.PI, false);
		context.fillStyle = opts_dot.fillColor;
		context.fill();
		context.lineWidth = opts_dot.strokeWidth;
		context.strokeStyle = opts_dot.strokeColor;
		context.stroke();
	};

	const addLabel = function(context: CanvasRenderingContext2D, pos: UgsChordBuilder.Position, text: number) {
		context.font = opts_dot.fontWeight + ' ' + opts_dot.fontSize + 'px ' + opts_dot.fontFamily;
		context.textAlign = 'center';
		context.fillStyle = opts_dot.fontColor;
		context.fillText(String(text), pos.x, pos.y + 0.3 * opts_dot.fontSize);
	};

	_public.draw = function(context) {
		for (let i = _dots.length - 1; i >= 0; i--) {
			const pos = getPosition(_dots[i]);
			drawDot(context, pos);
			if (_dots[i].finger > 0) {
				addLabel(context, pos, _dots[i].finger);
			}
	}
};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());

/**
 * Plots cursor moving across its own canvas context.
 * @class cursorCanvas
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.cursorCanvas = (function() {
	// dependencies
	const opts_cursor = ugsChordBuilder.settings.cursor,
		opts_dot = ugsChordBuilder.settings.dot;

	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.CursorCanvas;

	// set by init(), which editorUi calls before anything draws. (Typing these honestly means passing the
	// context to each draw function: a rewrite, for when the Chord Builder becomes a module.)
	let _context: CanvasRenderingContext2D = null!;

	let _handImage: HTMLImageElement = null!;
	let _imgOk = false;

	let _dotCursor = true;
	let _finger = 1;

	let _lastPos: UgsChordBuilder.Position = {
		x: 0,
		y: 0
	};

	_public.init = function(ctx) {
		_context = ctx;
		loadImage();
	};

	const erase = function(pos: UgsChordBuilder.Position) {
		const radius = opts_cursor.radius + opts_cursor.strokeWidth;
		// Need to allow for dot, image, and the finger number -- magic number for now:
		_context.clearRect(pos.x - radius, pos.y - radius, radius + 50, radius + 60);
		/*
		if (_imgOk) {
			_context.clearRect(pos.x - radius, pos.y - radius, radius + _handImage.width, radius + _handImage.height);
		} else {
			_context.clearRect(pos.x - radius, pos.y - radius, 2 * radius, 2 * radius);
		}
		*/
	};

	const drawHandCursor = function(pos: UgsChordBuilder.Position) {
		_context.drawImage(_handImage, pos.x, pos.y);

		_context.font = opts_dot.fontWeight + ' ' + opts_dot.fontSize + 'px ' + opts_dot.fontFamily;
		_context.textAlign = 'left';
		_context.fillStyle = 'black'; //opts_dot.fontColor;
		_context.fillText(String(_finger), pos.x + 0.8 * _handImage.width, pos.y + _handImage.height);
		// not centering pos.x - 0.5 * _handImage.width, pos.y - 0.5 * _handImage.height);
	};

	var loadImage = function() {
		_handImage = new Image();
		_handImage.onload = function() {
			_imgOk = true;
		};
		_handImage.src = opts_cursor.imageUri;
	};

	const drawDotCursor = function(pos: UgsChordBuilder.Position) {
		_context.beginPath();
		_context.arc(pos.x, pos.y, opts_cursor.radius, 0, 2 * Math.PI, false);
		_context.fillStyle = opts_cursor.fillColor;
		_context.fill();
		_context.lineWidth = opts_cursor.strokeWidth;
		_context.strokeStyle = opts_cursor.strokeColor;
		_context.stroke();
	};

	_public.setCursor = function(isDot, finger) {
		_dotCursor = isDot;
		_finger = finger;
	};

	_public.draw = function(pos) {
		erase(_lastPos);
		if (!_imgOk || _dotCursor) {
			drawDotCursor(pos);
		}
		else {
			drawHandCursor(pos);
		}
		_lastPos = pos;
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());

/**
 * Plots chord diagram (fretboard with fret labels) on its canvas context.
 * @class chordCanvas
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.chordCanvas = (function() {

	// dependencies
	const ents = ugsChordBuilder.entities,
		center_anchor = ugsChordBuilder.settings.centerAnchor,
		anchor_pos = ugsChordBuilder.settings.anchorPos,
		opt_fLabel = ugsChordBuilder.settings.fretLabel,
		opt_sLabel = ugsChordBuilder.settings.stringLabel,
		opts_board = ugsChordBuilder.settings.fretBoard;

	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.ChordCanvas;

	// set by init() (see cursorCanvas above)
	let _context: CanvasRenderingContext2D = null!,
		_canvas: HTMLCanvasElement = null!;

	_public.init = function(ctx, ele) {
		_context = ctx;
		_canvas = ele;
		center_anchor(_canvas);
	};

	const erase = function() {
		_context.clearRect(0, 0, _canvas.width, _canvas.height);
	};

	const addLabel = function(text: number, color: string, pos: UgsChordBuilder.Position) {
		_context.font = opt_fLabel.fontSize + 'px ' + opt_fLabel.fontFamily;
		_context.textAlign = 'right';
		_context.fillStyle = color;
		_context.fillText(String(text), pos.x, pos.y);
	};

	const addLabels = function(startingFret: number) {
		const pos = new ents.Position(
			anchor_pos.x - 0.3 * opt_fLabel.fontSize,
			anchor_pos.y + opt_fLabel.fontSize
		);
		let color = startingFret > 1 ? opt_fLabel.color : opt_fLabel.lightColor;
		for (let i = 0; i < opts_board.numFrets; i++) {
			addLabel(startingFret + i, color, pos);
			pos.y += opts_board.fretSpace;
			color = opt_fLabel.lightColor;
		}
	};

	const addStringName = function(text: string, pos: UgsChordBuilder.Position) {
		_context.font = opt_sLabel.fontSize + 'px ' + opt_sLabel.fontFamily;
		_context.textAlign = 'center';
		_context.fillStyle = opt_sLabel.color;
		_context.fillText(text, pos.x, pos.y);
	};

	const addStringNames = function() {
		const pos = new ents.Position(
			anchor_pos.x + 0.5 * opts_board.strokeWidth,
			anchor_pos.y - 0.25 * opt_fLabel.fontSize
		);

		for (let i = 0; i < opts_board.stringNames.length; i++) {
			addStringName(opts_board.stringNames[i], pos);
			pos.x += opts_board.stringSpace;
		}
	};

	const drawFretboard = function() {
		let i, x, y;

		// width offset, a "subpixel" adjustment
		const offset = opts_board.strokeWidth / 2;
		// locals
		const stringHeight = opts_board.numFrets * opts_board.fretSpace;
		const fretWidth = (opts_board.stringNames.length - 1) * opts_board.stringSpace;
		// build shape
		_context.beginPath();
		// add "C" & "E" strings
		for (i = 1; i < (opts_board.stringNames.length - 1); i++) {
			x = anchor_pos.x + i * opts_board.stringSpace + offset;
			_context.moveTo(x, anchor_pos.y + offset);
			_context.lineTo(x, anchor_pos.y + stringHeight + offset);
		}
		// add frets
		for (i = 1; i < opts_board.numFrets; i++) {
			y = anchor_pos.y + i * opts_board.fretSpace + offset;
			_context.moveTo(anchor_pos.x + offset, y);
			_context.lineTo(anchor_pos.x + fretWidth + offset, y);
		}
		//
		_context.rect(anchor_pos.x + offset, anchor_pos.y + offset, fretWidth, stringHeight);
		// stroke shape
		_context.strokeStyle = opts_board.strokeColor;
		_context.lineWidth = opts_board.strokeWidth;
		_context.stroke();
		_context.closePath();
	};

	_public.draw = function(pos, startingFret) {
		erase();
		// ugsChordBuilder.debugTargets.drawTargets(_context);
		addLabels(startingFret);
		addStringNames();
		drawFretboard();
		ugsChordBuilder.fretDots.draw(_context);
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());

/**
 * Turns the dots on the fretboard into a ChordPro chord definition,
 * `{define: Name frets 0 2 3 2 fingers 0 1 2 3}`, plus an `add: string 1 fret 1 finger 1` for each
 * string with a second dot. The chooser list saves it into the song.
 * @class export
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.export = (function() {
	// dependencies
	const opts_board = ugsChordBuilder.settings.fretBoard,
		opts_chord = ugsChordBuilder.settings.chord;

	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsChordBuilder.Export;

	// set by getDefinition() before anything reads it
	let _fretOffset = 0;

	/**
	 * Class for "reorganized" dots, think of this as a necklace where the
	 * thread, the instrument string, has zero or more beads, or dots -- fret plus finger
	 * @class  StringDots
	 * @constructor
	 * @private
	 * @param  {int} string
	 * @param  {dot_Array} dots
	 */
	const StringDots = function(this: UgsChordBuilder.StringDots, string: number, dots?: UgsChordBuilder.Dot[]) {
		this.string = string;
		this.dots = dots ? dots : [];
		//this.fingers = fingers ? fingers : [];
	} as unknown as new (string: number, dots?: UgsChordBuilder.Dot[]) => UgsChordBuilder.StringDots;

	const getStringDots = function() {
		// initialize empty string array
		let stringNumber,
			aryStringDots: UgsChordBuilder.StringDots[] = [];
		for (stringNumber = 1; stringNumber <= opts_board.stringNames.length; stringNumber++) {
			aryStringDots.push(new StringDots(stringNumber));
		}

		// add dots
		const dots = ugsChordBuilder.fretDots.getDots();
		for (stringNumber = aryStringDots.length - 1; stringNumber >= 0; stringNumber--) {
			for (let i = dots.length - 1; i >= 0; i--) {
				if (aryStringDots[stringNumber].string == dots[i].string + 1) {
					aryStringDots[stringNumber].dots.push(dots[i]);
				}
			}
		}

		return aryStringDots;
	};

	/**
	 * Returns the minimum & maximum fret found withing array (of dots)
	 * @method getMinMax
	 * @param  {dot_array} ary
	 * @return {JSON}
	 */
	const getMinMax = function(ary: UgsChordBuilder.Dot[]) {
		let max = 0;
		let min = 900;
		for (let i = ary.length - 1; i >= 0; i--) {
			if (ary[i].fret > max) {
				max = ary[i].fret;
			}
			if (ary[i].fret < min) {
				min = ary[i].fret;
			}
		}
		return {
			max: max,
			min: (min < 900) ? min : max
		};
	};

	/**
	 * Handles the offset, translates from fret (on the diagram's N frets) to the insturment's complete fretbaord
	 * @method  fretNumber
	 * @param  {int} fret
	 * @return {int}
	 */
	const fretNumber = function(fret: number) {
		return fret > 0 ? _fretOffset + fret : 0;
	};

	/**
	 * Not too surprisingly this finds "fret" within dots and returns finger. If there isn't a dot
	 * for fret returns zed.
	 * @method  getFinger
	 * @param  {array} dots
	 * @param  {int} fret
	 * @return {int}
	 */
	const getFinger = function(dots: UgsChordBuilder.Dot[], fret: number) {
		for (let i = 0; i < dots.length; i++) {
			if (dots[i].fret == fret) {
				return dots[i].finger;
			}
		}
		return 0;
	};

	/**
	 * Returns an array of ints, one for each string, with the HIGHEST REAL fret appearing on that string.
	 * Default is zed per string.
	 * @method getPrimaryFrets
	 * @param  {int} startingFret
	 * @return {int}
	 */
	_public.getPrimaryFrets = function(startingFret) {
		_fretOffset = startingFret - 1;
		const dotsPerString = getStringDots();
		const primaries = [];
		for (let i = 0; i < dotsPerString.length; i++) {
			const minMax = getMinMax(dotsPerString[i].dots);
			primaries.push(fretNumber(minMax.max));
		}
		return primaries;
	};

	/**
	 * Returns complete ChordPro definition statement
	 * @method getDefinition
	 * @param  {string} chordName
	 * @param  {int} startingFret
	 * @return {string}
	 */
	_public.getDefinition = function(chordName, startingFret) {
		chordName = scrub(chordName);
		const name = (chordName && chordName.length > 0) ? chordName : 'CHORDNAME';
		let fretsStr = '';
		let fingersString = '';
		let addsString = '';

		_fretOffset = startingFret - 1;
		const dotsPerString = getStringDots();
		for (let i = 0; i < dotsPerString.length; i++) {
			const minMax = getMinMax(dotsPerString[i].dots);
			fretsStr += fretNumber(minMax.max) + ' ';
			fingersString += getFinger(dotsPerString[i].dots, minMax.max) + ' ';
			if (minMax.max != minMax.min) {
				addsString += ' add: string ' + dotsPerString[i].string + ' fret ' + fretNumber(minMax.min) + ' finger ' + getFinger(dotsPerString[i].dots, minMax.min);
			}
		}

		// no double spaces, no space before the closing "}"
		return ('{define: ' + name + ' frets ' + fretsStr + ' fingers ' + fingersString + addsString + '}').replace(/\s+/g, ' ').replace(' }', '}');
	};

	/**
	 * Returns "highlighted" (HTML-ified) ChordPro definition statement.
	 * @method getDefinition
	 * @param  {string} chordName
	 * @param  {int} startingFret
	 * @return {string}
	 */
	_public.getDefinitionHtml = function(chordName, startingFret) {
		chordName = scrub(chordName);
		// Keep regexs simple by a couple cheats:
		// First, using 'X07MX001' as my CSS clasname prefix to avoid collisions.
		// We temporarily remove the name, then put it back in the very last step.
		let html = _public.getDefinition(chordName, startingFret);
		html = html.replace(' ' + chordName, ' ' + 'X07Myq791wso01');
		html = html.replace(/\b(\d+)\b/g, '<span class="chordPro-X07MX001number">$1</span>');
		html = html.replace(/\b(frets?|fingers?|string)\b/g, '<span class="chordPro-X07MX001attribute">$1</span>');
		html = html.replace(/\b(define|add)\b/g, '<span class="chordPro-X07MX001keyword">$1</span>');
		// the name can come from the song's {define}: escape it (the rest is numbers and keywords).
		// A function, not a string, puts it in: replace() would read a "$&" or "$$" in the name as a pattern.
		const nameHtml = '<span class="chordPro-string">' + ukeGeeks.toolsLite.escapeHtml(chordName) + '</span>';
		return html
			.replace('X07Myq791wso01', function() {
				return nameHtml;
			})
			.replace(/X07MX001/g, '')
			.replace(/ +/g, ' ');
	};

	/**
	 * Returns "safe" version of chord name, removing disallowed characters and reserved names (such as "add:")
	 * @method scrub
	 * @param  {string} chordName
	 * @return {string}
	 */
	var scrub = function(name: string) {
		// paranoia protection: no reserved words (makes life easier for parsing)
		const disallow = /^(frets|fingers|add:)$/i;
		// trim leading & trailing spaces, internal spaces get smushed into single dash
		let cleaned = name.replace(/^\s*(.*?)\s*$/, '$1').replace(/\s+/g, '-');
		if (disallow.test(cleaned)) {
			cleaned = '';
		}
		return cleaned.substring(0, opts_chord.nameMaxLength);
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());