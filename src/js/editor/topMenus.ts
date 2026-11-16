declare namespace UgsEditorPlus {
	interface TopMenus {
		/** Wires the toolbar: menus, dialogs, close and resize buttons */
		init(): void;
		/** Deselects every toolbar item */
		makeAllInactive(): void;
		/**
		 * The host page's own Edit menu: the toolbar's Edit button shows these items in a
		 * drop-down instead of the Edit Song box (null or none: the box again)
		 */
		setEditMenu(items: EditMenuItem[] | null): void;
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
	/** the host's Edit menu (see setEditMenu), or null: Edit shows the Edit Song box */
	let _editMenu: UgsEditorPlus.EditMenuItem[] | null = null;

	const EDIT_MENU_ID = 'editMenuDlg';

	/**
	 * The Edit menu's drop-down box, made the first time a host asks for a menu: the
	 * editor's own markup (editorHtml()) doesn't have it.
	 * @method _editMenuBox
	 * @private
	 * @return {DOM-element}
	 */
	const _editMenuBox = function() {
		const dom = ugsEditorPlus.dom;
		let box = dom.one('#' + EDIT_MENU_ID);
		if (!box) {
			dom.byId('ugsAppToolbar', HTMLElement).insertAdjacentHTML('afterend',
				'<aside class="ugsEditor-arrowBox ugsEditor-editMenu" id="' + EDIT_MENU_ID + '">'
				+ '<fieldset class="ugsEditor-arrowBoxContent ugsEditor-linksList"><ul></ul></fieldset></aside>');
			box = dom.byId(EDIT_MENU_ID, HTMLElement);
			box.addEventListener('click', _onEditMenuClick);
		}
		return box;
	};

	/**
	 * @method _setEditMenu
	 * @param items {Array} `{ label, onSelect, checked }` each; null or an empty list for no menu
	 */
	const _setEditMenu = function(items: UgsEditorPlus.EditMenuItem[] | null) {
		const dom = ugsEditorPlus.dom;
		_editMenu = Array.isArray(items) && items.length > 0 ? items.slice() : null;
		if (!_editMenu) {
			dom.hide(dom.one('#' + EDIT_MENU_ID));
			return;
		}
		const list = dom.find('ul', HTMLElement, _editMenuBox());
		list.textContent = '';
		_editMenu.forEach(function(item, index) {
			const li = document.createElement('li');
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = String(item.label);
			button.dataset.index = String(index);
			li.classList.toggle('ugsEditor-checked', !!item.checked);
			li.appendChild(button);
			list.appendChild(li);
		});
	};

	/**
	 * A click in the Edit menu: on an item, closes the menu and tells the host.
	 * @method _onEditMenuClick
	 * @private
	 */
	const _onEditMenuClick = function(e: Event) {
		const button = e.target instanceof Element ? e.target.closest<HTMLElement>('button[data-index]') : null;
		const item = button && _editMenu ? _editMenu[Number(button.dataset.index)] : undefined;
		if (!item) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		_closeAll();
		try {
			item.onSelect();
		} catch (err) {
			// the host's problem: the editor carries on
			console.error('[ugsEditorPlus] Edit menu "' + item.label + '":', err);
		}
	};

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
		const dialogId = this.getAttribute('data-dialog') || '';
		if (_editMenu && dialogId === 'songSourceDlg') {
			// the host's own Edit menu, not the Edit Song box
			const box = _editMenuBox();
			const wasOpen = ugsEditorPlus.dom.isVisible(box);
			_closeAll();
			if (!wasOpen) {
				ugsEditorPlus.dom.fadeIn(box);
				this.classList.add('ugsEditor-active');
			}
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		_closeAll();
		// now show dialog associated with the clicked button
		ugsEditorPlus.dom.fadeIn(document.getElementById(dialogId));

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
		makeAllInactive: _makeAllInactive,
		setEditMenu: _setEditMenu
	};

}());