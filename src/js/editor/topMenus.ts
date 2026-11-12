declare namespace UgsEditorPlus {
	interface TopMenus {
		/** Wires the toolbar: menus, dialogs, close and resize buttons */
		init(): void;
		/** Deselects every toolbar item */
		makeAllInactive(): void;
	}
}
interface UgsEditorPlus {
	topMenus: UgsEditorPlus.TopMenus;
}

/**
 * Handles Top Menu UI -- includes the show/hide dialogs (why? cuz they're attached to top menu buttons)
 * Shows (a) dialongs (such as Edit) and (b) those tool-tippy options thingies.
 * @class topMenus
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.topMenus = (function() {

	/**
	 * attaches events...
	 * @method _init
	 * @public
	 * @return {void}
	 */
	const _init = function() {
		const dom = ugsEditorPlus.dom;
		// (a, button: Songbook 1.5 pages have links here)
		dom.on('#ugsAppToolbar > ul li:not([data-dialog]) > button, #ugsAppToolbar > ul li:not([data-dialog]) > a', 'click', _onMenuItemClick);
		dom.on('.ugsEditor-showOptionsBox > button, .ugsEditor-showOptionsBox > a', 'click', _onShowOptionsClick);

		dom.on('#ugsAppToolbar > ul li[data-dialog]', 'click', _onShowDlgBtnClick);
		dom.on('.ugsEditor-closeBtn', 'click', _onCloseBtnClick);
		dom.on('.ugsEditor-resizeBtn', 'click', _onResizeBtnClick);
	};

	/**
	 * Click handler for nav items that are NOT attached to a dialog box.
	 * @method _onMenuItemClick
	 * @private
	 * @return {void}
	 */
	const _onMenuItemClick = function(this: HTMLElement) {
		// the clicked button
		const parent = this.parentElement;
		if (!parent) {
			return;
		}
		const isOpen = parent.classList.contains('ugsEditor-active');
		_makeAllInactive();
		if (isOpen) {
			return;
		}
		parent.classList.add('ugsEditor-active');
	};

	/**
	 * Deselects all items in app's top menu/nav bar (just removes active state from all items)
	 * @method _makeAllInactive
	 * @private
	 * @return {void}
	 */
	const _makeAllInactive = function() {
		ugsEditorPlus.dom.all('#ugsAppToolbar > ul > li').forEach(function(li) {
			li.classList.remove('ugsEditor-active');
		});
	};

	/**
	 * Same as _makeAllInactive method PLUS closes any open drop down/arrow boxes.
	 * @method _closeAll
	 * @private
	 * @return {void}
	 */
	const _closeAll = function() {
		// hide any drop-down/arrow boxes currently open
		_makeAllInactive();
		ugsEditorPlus.dom.all('.ugsEditor-arrowBox').forEach(ugsEditorPlus.dom.hide);
	};

	/**
	 * handles nav menu/toolbar click event. The data-dialog="X" attribute
	 * on the element assocaites the menu item with the dialog box (the
	 * box's id)
	 * @method _onShowDlgBtnClick
	 * @private
	 * @param e {event}
	 * @return {bool} false to kill event bubbling
	 */
	const _onShowDlgBtnClick = function(this: HTMLElement, e: Event) {
		_closeAll();

		// now show dialog associated with the clicked button
		ugsEditorPlus.dom.fadeIn(document.getElementById(this.getAttribute('data-dialog') || ''));

		// prevent event bubbling
		e.preventDefault();
		e.stopPropagation();
	};

	/**
	 * dialog box's close button's click handler. Hides the first parent
	 * with class.
	 * @method _onCloseBtnClick
	 * @private
	 * @param e {event}
	 * @return {bool} false to kill event bubbling
	 */
	const _onCloseBtnClick = function(this: HTMLElement, e: Event) {
		ugsEditorPlus.dom.fadeOut(this.closest<HTMLElement>('.ugsEditor-overlay'));
		// prevent event bubbling
		e.preventDefault();
		e.stopPropagation();
	};

	const _onResizeBtnClick = function(this: HTMLElement, e: Event) {
		_closeAll();
		ugsEditorPlus.resize.toggle(ugsEditorPlus.dom.closest(this, '.ugsEditor-overlay', HTMLElement));
		e.preventDefault();
		e.stopPropagation();
	};

	/**
	 * display a "tooltip" options dialog
	 * @method _onShowOptionsClick
	 * @private
	 * @param e {event}
	 * @return {bool} false to kill event bubbling
	 */
	const _onShowOptionsClick = function(this: HTMLElement, e: Event) {
		const dom = ugsEditorPlus.dom;
		const dlg = dom.byId(this.dataset.target || (this.getAttribute('href') || '').replace(/^#/, ''), HTMLElement);

		dom.all('.ugsEditor-arrowBox').forEach(function(box) {
			if (box !== dlg) {
				dom.hide(box);
			}
		});

		dom.all('dd', dlg).forEach(dom.hide);
		dom.fadeToggle(dlg);

		ugsEditorPlus.submenuUi.reset(dlg);

		// prevent event bubbling
		e.preventDefault();
		e.stopPropagation();
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return {
		init: _init,
		makeAllInactive: _makeAllInactive
	};

}());