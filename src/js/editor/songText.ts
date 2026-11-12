declare namespace UgsEditorPlus {
  interface SongText {
    /** Watches the Edit Song box; `songAmatic.init()` calls it once the markup is on the page */
    init(): void;
    /** The ChordPro text being edited: the Fullscreen editor's while it's open, else the Edit Song box's */
    get(): string;
    /**
     * Call after changing the song's text from code (the Edit Song box's `value`, or Ace's).
     * Tells the host page, unless the text is the same as last time.
     */
    changed(): void;
    /** The host page's `onChange` (one at a time; null for none) */
    setChangeHandler(handler: ChangeHandler | null): void;
  }
}
interface UgsEditorPlus {
  songText: UgsEditorPlus.SongText;
}

/**
 * The song's text, wherever it's being edited, and telling the host page when it changes.
 *
 * The text lives in the Edit Song box (#chordProSource), or in Ace while Fullscreen is
 * open. Typing fires the box's own "input" event; code that sets the text (Transpose,
 * Reformat, the Chord Builder, Fullscreen) calls changed().
 *
 * @class songText
 * @namespace ugsEditorPlus
 */
ugsEditorPlus.songText = (function() {
  const _public = {} as UgsEditorPlus.SongText;

  let _handler: UgsEditorPlus.ChangeHandler | null = null;

  /** the text the host was last told about (at first: the text the editor opened with) */
  let _lastText: string | null = null;

  const box = () => ugsEditorPlus.dom.byId('chordProSource', HTMLTextAreaElement);

  _public.init = function() {
    _lastText = box().value;
    box().addEventListener('input', _public.changed);
  };

  _public.get = function() {
    const fullscreenText = ugsEditorPlus.resize.getText();
    return fullscreenText !== null ? fullscreenText : box().value;
  };

  _public.changed = function() {
    const text = _public.get();
    if (text === _lastText) {
      return;
    }
    _lastText = text;
    if (!_handler) {
      return;
    }
    try {
      _handler(text);
    } catch (err) {
      // the host's problem: the editor carries on
      console.error('[ugsEditorPlus] onChange:', err);
    }
  };

  _public.setChangeHandler = function(handler) {
    _handler = typeof handler === 'function' ? handler : null;
  };

  return _public;
})();
