declare namespace UgsEditorPlus {
	interface Styles {
		/** the rules of the sheet from the last getSheet() (empty until then) */
		Rules: ArrayLike<CSSRule>;
		/** Picks the stylesheet with this title (`<link title="...">`). */
		getSheet(title: string): Styles;
		/** The rule with exactly this selector, in the sheet from getSheet() */
		find(selector: string): CSSStyleRule | null;
	}
}
interface UgsEditorPlus {
	styles: UgsEditorPlus.Styles;
}

/**
 * from: http://www.javascriptkit.com/dhtmltutors/externalcss.shtml
 * @class styles
 * @namespace ugsEditorPlus
 * @singleton
 */
ugsEditorPlus.styles = (function() {
	/**
	 * attach public members to this object
	 * @property _public
	 * @type JsonObject
	 */
	const _public = {} as UgsEditorPlus.Styles;
	_public.Rules = [];

	let _sheet: CSSStyleSheet | null = null;

	_public.getSheet = function(title) {
		_sheet = _getSheet(title);
		_public.Rules = _getRules();
		return this;
	};
	
	const _getSheet = function(title: string){
		for (let i = 0; i < document.styleSheets.length; i++){
			if (document.styleSheets[i].title == title){
				return document.styleSheets[i];
			}
		}
		return null;
	};
	
	const _getRules = function() {
		if (_sheet == null){
			return [];
		}
		return _sheet.cssRules ? _sheet.cssRules : _sheet.rules;
	};
	
	_public.find = function(selector) {
		selector = selector.toLowerCase();
		for (let i = 0; i < _public.Rules.length; i++) {
			const rule = _public.Rules[i];
			// style rules only (an @media rule has no selector)
			if (!(rule instanceof CSSStyleRule) || !rule.selectorText) {
				continue;
			}
			if (rule.selectorText.toLowerCase() == selector) {
				return rule;
			}
		}
		return null;
	};

	// ---------------------------------------
	// return public interface
	// ---------------------------------------
	return _public;

}());