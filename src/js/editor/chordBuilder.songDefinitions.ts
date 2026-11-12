/**
 * A song's text and the chord definitions in it: finding the `{define: ...}` lines, and
 * adding, changing or removing one. Plain text in, plain text out: no page, no builder state.
 * @class songDefinitions
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.songDefinitions = (function() {
  // {define: Name frets ...}: the name is everything up to " frets"
  const DEFINE = /\{define:\s*([^}]+?)\s+frets[^}]+?\}/i;
  // a line that belongs at the top of a song: a new definition goes after the last of these
  const HEADER = /\s*\{\s*(title|t|artist|subtitle|st|album|define):.*?\}/i;

  const _public: UgsChordBuilder.SongDefinitions = {
    /**
     * Every {define: ...} line that has `frets`, in the song's order. `definition` is the
     * whole line, so replace() and remove() find it again.
     * @method find
     * @param  {string} text the song
     * @return {array}
     */
    find: function(text) {
      const found: UgsChordBuilder.SongDefinition[] = [];
      for (const line of text.split('\n')) {
        const match = DEFINE.exec(line);
        if (match && match[1]) {
          found.push({ name: match[1], definition: line });
        }
      }
      return found;
    },

    /**
     * Adds a definition after the song's last header line (title, artist, subtitle, album or
     * another define); at the very top when it has none. The rest of the song is unchanged.
     * @method add
     * @param  {string} text the song
     * @param  {string} definition
     * @return {string}
     */
    add: function(text, definition) {
      const lines = text.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (HEADER.test(lines[i] ?? '')) {
          lines.splice(i + 1, 0, definition);
          return lines.join('\n');
        }
      }
      return definition + '\n' + text;
    },

    /**
     * Swaps every occurrence of one definition for another, both taken as plain text.
     * (Not String.replace: it reads "$&" or "$$" in the new text as patterns, and a chord name
     * can contain them.)
     * @method replace
     * @param  {string} text the song
     * @param  {string} oldDefinition
     * @param  {string} newDefinition
     * @return {string}
     */
    replace: function(text, oldDefinition, newDefinition) {
      if (!oldDefinition) {
        return text;
      }
      return text.split(oldDefinition).join(newDefinition);
    },

    /**
     * Takes a definition's line out of the song. If it shares its line with something else,
     * only the definition goes.
     * @method remove
     * @param  {string} text the song
     * @param  {string} definition
     * @return {string}
     */
    remove: function(text, definition) {
      const lines = text.split('\n');
      const kept = lines.filter(function(line) {
        return line !== definition;
      });
      return kept.length < lines.length ? kept.join('\n') : _public.replace(text, definition, '');
    }
  };

  return _public;
}());
