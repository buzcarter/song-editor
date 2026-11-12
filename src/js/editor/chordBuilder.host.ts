/**
 * The Chord Builder's one door to the outside: the page's elements and the song's text.
 * The panels (chooserList, editorUi) ask here, never the page or the editor, so the builder
 * runs wherever a host gives it these few things (see UgsChordBuilder.Host): inside the
 * Song-a-Matic editor (editor.chordBuilder.ts) or on a page of its own (ugsChordBuilder.mount()).
 * @class host
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.host = (function() {
  let _host: UgsChordBuilder.Host | null = null;

  const current = function() {
    if (!_host) {
      throw new Error('ugsChordBuilder: no host yet. Start the builder with ugsChordBuilder.mount() or editorUi.init(host)');
    }
    return _host;
  };

  const _public: UgsChordBuilder.HostBridge = {
    use: function(host) {
      _host = host;
      if (host.cursorImageUri) {
        ugsChordBuilder.settings.cursor.imageUri = host.cursorImageUri;
      }
    },

    /**
     * The builder's markup is fixed, so a missing element is a broken page: say which,
     * rather than fail later on null.
     * @method byId
     * @param id {string}
     * @param type {function} constructor, e.g. HTMLInputElement
     * @return {DOM-element}
     */
    byId: function(id, type) {
      const ele = (current().root || document).querySelector('#' + id);
      if (!(ele instanceof type)) {
        throw new Error('ugsChordBuilder: #' + id + (ele ? ' is not a ' + type.name : ' not found'));
      }
      return ele;
    },

    getSong: function() {
      return current().getSong();
    },

    setSong: function(text) {
      current().setSong(text);
    },

    confirm: function(message) {
      const host = current();
      return host.confirm ? host.confirm(message) : window.confirm(message);
    },

    alert: function(message) {
      const host = current();
      if (host.alert) {
        host.alert(message);
      }
      else {
        window.alert(message);
      }
    },

    panelChanged: function(panel) {
      const host = current();
      if (host.onPanelChange) {
        host.onPanelChange(panel);
      }
    }
  };

  return _public;
}());
