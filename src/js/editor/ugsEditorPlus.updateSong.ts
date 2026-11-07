/**
 * Saves the song: runs the host page's save callback when the Save button is clicked.
 * Dependencies: ugsEditorPlus.dom

 * @class updateSong
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.updateSong = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	var _public = {} as UgsEditorPlus.UpdateSong;

	/**
	 * The host's save callback: takes the ChordPro text, returns (a promise of) the message to show.
	 * @property _save
	 * @type {Function}
	 */
	var _save: UgsEditorPlus.SaveHandler | null = null;

	/**
	 * Name / Value pairs for CSS selectors of HTML elements to be manipulated
	 * @property _selectors
	 * @type {JSON}
	 */
	var _selectors = {
		messageBox : '#messageBox',
		message : '#sourceFeedback',
		button : '#saveBtn',
		spinner : '#loadingSpinner',
		song : '#chordProSource'
	};

	/**
	 * lock-down the Submit (Update) button to avoid double posts;
	 * @property _isUpdating
	 * @type {Boolean}
	 */
	var _isUpdating = false;

	/**
	 * Saves by posting to the UkeGeeks Songbook server (the original behavior).
	 * Kept so pages that call updateSong.init() keep working; new pages pass `save` to songAmatic.mount().
	 * @method init
	 * @param ajaxUri {string}
	 * @param filename {string}
	 */
	_public.init = function(ajaxUri: string, filename: string) {
		_public.setSaveHandler(function(song: string) {
			var data = {
				'handler': 'ugs_update_81jr',
				'filename': filename,
				'song': song
			};
			return ugsEditorPlus.dom.postJson(ajaxUri, data).then(function(data: { HasErrors: boolean, Message: string }) {
				//if (data.HasErrors)
				return data.Message;
			});
		});
	};

	/**
	 * Wires the Save button to a save callback.
	 * @method setSaveHandler
	 * @param save {Function} takes the ChordPro text; returns a message, or a promise of one. A rejection shows the "problem saving" alert.
	 */
	_public.setSaveHandler = function(save: UgsEditorPlus.SaveHandler) {
		_save = save;

		ugsEditorPlus.dom.on(_selectors.button, 'click', function(e: Event) {
			e.preventDefault();
			doUpdate();
		});

		ugsEditorPlus.dom.hide(ele('messageBox'));
	};

	/**
	 * pending "fade out the message" timer
	 * @property _hideTimer
	 * @type {Number}
	 */
	var _hideTimer: number | undefined;

	var ele = function(name: keyof typeof _selectors) {
		return ugsEditorPlus.dom.one(_selectors[name]);
	};

	var showBusy = function(){
		var dom = ugsEditorPlus.dom;
		clearTimeout(_hideTimer);
		dom.hide(ele('message'));
		if (dom.isVisible(ele('messageBox'))) {
			// still showing (or fading out) the last message
			dom.show(ele('messageBox'));
		}
		else {
			dom.slideDown(ele('messageBox'), 'fast');
		}
		dom.show(ele('spinner'));
	};

	var showMessage = function(message: string){
		var msg = ugsEditorPlus.dom.find(_selectors.message, HTMLElement);
		ugsEditorPlus.dom.hide(ele('spinner'));
		msg.textContent = message;
		ugsEditorPlus.dom.show(msg);
	};

	var hideMessage = function(){
		clearTimeout(_hideTimer);
		_hideTimer = setTimeout(function() {
			ugsEditorPlus.dom.fadeOut(ele('messageBox'), 'slow');
		}, 3000);
	};

	var doUpdate = function() {
		if (_isUpdating){
			return;
		}

		_isUpdating = true;
		showBusy();
		Promise.resolve()
			.then(function() {
				// (setSaveHandler() sets _save before it wires the button)
				return _save ? _save(ugsEditorPlus.dom.find(_selectors.song, HTMLTextAreaElement).value) : undefined;
			})
			.then(function(message) {
				showMessage(message === undefined || message === null ? 'Saved.' : String(message));
			}, function() {
				alert('Encountered a problem saving your Song. Please copy your song to another program until this issue is resolved.');
			})
			.then(function() {
				hideMessage();
				_isUpdating = false;
			});
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;
})();