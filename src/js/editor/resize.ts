declare namespace UgsEditorPlus {
	interface Resize {
		/** Opens the Fullscreen (Ace) editor for this dialog, or closes it */
		toggle(dlgElement: HTMLElement): boolean;
		/** The text in the Fullscreen editor while it's open; null when it's closed (or Ace is still loading) */
		getText(): string | null;
	}
}
interface UgsEditorPlus {
	resize: UgsEditorPlus.Resize;
}

/**
 * Resizes an overlay to fill the window (this is a 1.0, so "fill" is relative -- it gets much bigger)
 * @class resize
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.resize = (function(){
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsEditorPlus.Resize;

	const dom = ugsEditorPlus.dom;

	let dlg: HTMLElement | null = null;
	let aceLayer: HTMLElement | null = null;
	let help: HTMLElement | null = null;
	let editor: AceEditor | null = null;

	/**
	 * miliseconds to fade in/out editor
	 * @property FADE_SPEED
	 * @final
	 * @type {Number}
	 */
	const FADE_SPEED = 550;
	/**
	 * miliseconds to slide in/out sidebar (help) panel
	 * @property SLIDE_SPEED
	 * @final
	 * @type {Number}
	 */
	const SLIDE_SPEED = 400;

	/**
	 * Hold the current state of the dialog, we'll store this on the element in "data-sized" attribute
	 * @attribute isBig
	 * @type {Boolean}
	 */
	let isBig = false;

	let isHelpOpen = false;

	/** true while copySongToAce() puts the song into Ace */
	let isCopying = false;

	/**
	 * Initializer: preps handles and sets state varables.
	 * @method setup
	 * @private
	 * @return {void}
	 */
	const setup = function(dlgElement: HTMLElement){
		dlg = dlgElement;
		// static markup only. Fullscreen covers the window, so it goes on <body>, outside the editor's element
		document.body.insertAdjacentHTML('beforeend', '<div id="aceHeader"><button class="ugsEditor-aceSideBtn" title="Show options &amp; help"><span></span><span></span><span></span></button><strong>Edit Song</strong><a href="#exit-fullscreen">Exit fullscreen</a></div><div id="aceEditor"></div><div id="aceHelp"></div>');

		aceLayer = dom.byId('aceEditor', HTMLElement);
		dom.hide(aceLayer);

		help = dom.byId('aceHelp', HTMLElement);

		dom.find('#aceHeader a', HTMLElement, document).addEventListener('click', function(e) {
			e.preventDefault();
			hideAce();
		});
		dom.find('#aceHeader button', HTMLElement, document).addEventListener('click', onShowHelpClicked);
	};

	const onShowHelpClicked = function(e: Event) {
		e.preventDefault();
		showHelp(!isHelpOpen);
	};

	const showHelp = function(isShow: boolean) {
		isHelpOpen = isShow;
		// (setup() makes them; only its buttons call this)
		if (!help || !aceLayer) {
			return;
		}

		dom.animate(help, {
			left: isShow ? '0px' : '-350px'
		}, SLIDE_SPEED);
		dom.animate(aceLayer, {
			left: isShow ? '350px' : '0px'
		}, SLIDE_SPEED);
	};

	/**
	 * Returns the path of a linked script file (src) up to the starting position of fileName
	 * @method getPath
	 * @param  {string} fileName
	 * @return {string}
	 */
	const getPath = function(fileName: string) {
		let path = '',
			lower: string, pos: number;

		fileName = fileName.toLowerCase();

		Array.prototype.forEach.call(document.scripts, function(item) {
			lower = item.src.toLowerCase();
			pos = lower.indexOf(fileName);
			if (pos > 0) {
				path = item.src.substr(0, pos);
			}
		});
		return path;
	};

	const showAce = function() {
		isBig = true;

		document.documentElement.classList.add('aceEditorActive');
		dom.all('.ugsEditor-overlay').forEach(function(overlay) {
			dom.fadeOut(overlay, 300);
		});

		if (editor !== null) {
			// editor has already been initialized, safe to continue
			copySongToAce();
			return;
		}

		// only execute this block once (thus the null check)
		// the folder holding ace-chordpro.min.js: options.aceUrl, or by default "ace/" next to
		// the folder ugsEditorPlus.min.js was loaded from (e.g. "/js/ace/")
		const aceUrl = ugsEditorPlus.options.aceUrl || (getPath('ugsEditorPlus') + 'ace/');

		// Ace with the ChordPro mode, snippets, chord completer and theme built in
		// (@ukegeeks/ace-chordpro-extension, which the host page copies there)
		LazyLoad.js(aceUrl + 'ace-chordpro.min.js', function() {
				editor = ace.edit("aceEditor");
				editor.setTheme("ace/theme/idle_fingers");
				editor.getSession().setMode("ace/mode/chordpro");
				editor.setOptions({
					enableBasicAutocompletion: true,
					enableSnippets: true
				});
				copySongToAce();
				editor.on('change', function() {
					// (not while the song is being copied in: Ace empties itself first)
					if (!isCopying) {
						ugsEditorPlus.songText.changed();
					}
				});

				if (help) {
					help.innerHTML = ugsEditorPlus.aceHelpHtml;
				}
			});
	};

	const copySongToAce = function() {
		// (called once Ace is loaded)
		if (editor === null) {
			return;
		}
		dom.fadeIn(aceLayer, FADE_SPEED);
		isCopying = true;
		editor.setValue(dom.byId('chordProSource', HTMLTextAreaElement).value);
		isCopying = false;
		editor.gotoLine(1);
		dom.show(help);
	};

	/**
	 * Restores overlay to original position(-ish -- not finished)
	 * @method hideAce
	 * @private
	 * @return {void}
	 */
	const hideAce = function() {
		isBig = false;

		dom.show(dlg);
		dom.fadeOut(aceLayer, FADE_SPEED);
		dom.fadeOut(help, FADE_SPEED);
		if (editor !== null) {
			dom.byId('chordProSource', HTMLTextAreaElement).value = editor.getValue();
		}

		document.documentElement.classList.remove('aceEditorActive');
		showHelp(false);
	};

	/**
	 * Resizes passed in DOM element, toggling between fullscreen and "standard" size.
	 * @method toggle
	 * @param  {DOM-element} dlgElement handle to Overlay/dialog being resized
	 * @return {void}
	 */
	/**
	 * The song being edited in Fullscreen. (The Edit Song box only gets it when Fullscreen closes.)
	 * @method getText
	 * @return {string|null} null when Fullscreen is closed, or Ace hasn't loaded yet
	 */
	_public.getText = function(){
		return (isBig && editor !== null) ? editor.getValue() : null;
	};

	_public.toggle = function(dlgElement: HTMLElement){
		if (dlg === null) {
		setup(dlgElement);
		}

		if (isBig){
			hideAce();
		}
		else{
			showAce();
		}
		return false;
	};


	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;

}());