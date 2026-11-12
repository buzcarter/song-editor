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
	const _public = {} as UgsEditorPlus.UpdateSong;

	/**
	 * The host's save callback: takes the ChordPro text, returns (a promise of) the message to show.
	 * @property _save
	 * @type {Function}
	 */
	let _save: UgsEditorPlus.SaveHandler | null = null;

	/**
	 * Name / Value pairs for CSS selectors of HTML elements to be manipulated
	 * @property _selectors
	 * @type {JSON}
	 */
	const _selectors = {
		messageBox : '#messageBox',
		message : '#sourceFeedback',
		button : '#saveBtn',
		spinner : '#loadingSpinner'
	};

	/**
	 * lock-down the Submit (Update) button to avoid double posts;
	 * @property _isUpdating
	 * @type {Boolean}
	 */
	let _isUpdating = false;

	/**
	 * the save in progress
	 * @property _pending
	 * @type {Promise}
	 */
	let _pending: Promise<boolean> = Promise.resolve(false);

	/**
	 * Saves by posting to the UkeGeeks Songbook server (the original behavior).
	 * Kept so pages that call updateSong.init() keep working; new pages pass `save` to songAmatic.mount().
	 * @method init
	 * @param ajaxUri {string}
	 * @param filename {string}
	 */
	_public.init = function(ajaxUri: string, filename: string) {
		_public.setSaveHandler(function(song: string) {
			const data = {
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
	 * Saves the song now, as the Save button does: the text being edited (Fullscreen's
	 * while it's open) goes to the save callback, and its message or the "problem saving"
	 * alert shows as usual. A save already under way is the one you get.
	 * @method save
	 * @return {Promise} of true when it saved; false when it failed, or there's no save callback
	 */
	_public.save = function() {
		return _save ? doUpdate() : Promise.resolve(false);
	};

	/**
	 * pending "fade out the message" timer
	 * @property _hideTimer
	 * @type {Number}
	 */
	let _hideTimer: number | undefined;

	const ele = function(name: keyof typeof _selectors) {
		return ugsEditorPlus.dom.one(_selectors[name]);
	};

	const showBusy = function(){
		const dom = ugsEditorPlus.dom;
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

	const showMessage = function(message: string){
		const msg = ugsEditorPlus.dom.find(_selectors.message, HTMLElement);
		ugsEditorPlus.dom.hide(ele('spinner'));
		msg.textContent = message;
		ugsEditorPlus.dom.show(msg);
	};

	const hideMessage = function(){
		clearTimeout(_hideTimer);
		_hideTimer = setTimeout(function() {
			ugsEditorPlus.dom.fadeOut(ele('messageBox'), 'slow');
		}, 3000);
	};

	const doUpdate = function() {
		if (_isUpdating){
			return _pending;
		}

		_isUpdating = true;
		showBusy();
		_pending = Promise.resolve()
			.then(function() {
				// (setSaveHandler() sets _save before it wires the button)
				return _save ? _save(ugsEditorPlus.songText.get()) : undefined;
			})
			.then(function(message) {
				showMessage(message === undefined || message === null ? 'Saved.' : String(message));
				return true;
			}, function() {
				alert('Encountered a problem saving your Song. Please copy your song to another program until this issue is resolved.');
				return false;
			})
			.then(function(isSaved) {
				hideMessage();
				_isUpdating = false;
				return isSaved;
			});
		return _pending;
	};

	// ---------------------------------------
	// return public interface "JSON handle"
	// ---------------------------------------
	return _public;
})();