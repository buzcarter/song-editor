/**
 * From a chord as Song Formatter reads it to a chord on the builder's fretboard.
 * read() is the builder's one use of Song Formatter's parser; the rest is arithmetic.
 * @class chordReader
 * @namespace ugsChordBuilder
 * @static
 * @singleton
 */
ugsChordBuilder.chordReader = (function() {
  /**
   * Loops over dots to find the largest fret value
   * @method findMaxFret
   * @param  {array} dots
   * @return {int}
   */
  const findMaxFret = function(dots: UgsChordBuilder.SourceDot[]) {
    let max = 0;
    for (const dot of dots) {
      const fret = dot.fret || 0;
      if (fret > max) {
        max = fret;
      }
    }
    return max;
  };

  const _public: UgsChordBuilder.ChordReader = {
    /**
     * A {define: ...} line as a chord, or null when Song Formatter can't read it.
     * @method read
     * @param  {string} definition
     * @return {SourceChord}
     */
    read: function(definition) {
      return ukeGeeks.chordImport.runLine(definition) || null;
    },

    /**
     * The chord laid out for the builder. Its diagram shows `numFrets` frets, so a chord whose
     * highest dot is further up the neck starts at the fret that puts that dot on the last row.
     *
     * An `add:` that leaves out a value gives a dot with a null in it; these are read the way
     * Song Formatter draws them on the songsheet:
     *  - no string: the first string
     *  - no finger: no finger number
     *  - no fret: dropped. The builder has no "fret 0" dot (loading one would clear its string,
     *    erasing the chord's real dot there), and the songsheet draws it off the fretboard.
     * Dots below the starting fret are dropped too, for the same reason.
     * @method toBuilder
     * @param  {SourceChord} chord
     * @return {BuilderChord}
     */
    toBuilder: function(chord) {
      const numFrets = ugsChordBuilder.settings.fretBoard.numFrets;
      const maxFret = findMaxFret(chord.dots);
      const startingFret = maxFret > numFrets ? maxFret - numFrets + 1 : 1;
      const offset = startingFret - 1;
      const dots: UgsChordBuilder.Dot[] = [];
      for (const dot of chord.dots) {
        const fret = (dot.fret || 0) - offset;
        if (fret < 1) {
          continue;
        }
        dots.push(new ugsChordBuilder.entities.Dot(dot.string || 0, fret, dot.finger || 0));
      }
      return { name: chord.name, startingFret: startingFret, dots: dots };
    },

    /**
     * Checks whether any of the Chord's strings have been muted.
     * @method hasMutedStrings
     * @param  {SourceChord} chord
     * @return {Boolean}
     */
    hasMutedStrings: function(chord) {
      return !!chord.muted && chord.muted.some(function(isMuted) {
        return !!isMuted;
      });
    }
  };

  return _public;
}());
