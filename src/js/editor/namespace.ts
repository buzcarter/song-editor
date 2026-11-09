/**
 * <ul>
 * <li>Project: UkeGeeks' Song-a-matic Editor</li>
 * <li>Homepage: http://ukegeeks.org</li>
 * <li>Project Repository: https://github.com/buzcarter/UkeGeeks</li>
 * <li>Author: Buz Carter</li>
 * <li>Contact: buz@ukegeeks.org</li>
 * <li>Copyright: Copyright 2010-2014 Buz Carter.</li>
 * <li>License GNU General Public License (http://www.gnu.org/licenses/gpl.html)</li>
 * </ul>
 *
 * <h3>Overview</h3>
 * This library implments the UkeGeeks Scriptasaurus Song-a-matic editor functions, bridging the page UI and scriptasaurus methods.
 *
 * @module ugsEditorPlus
 * @main ugsEditorPlus
 **/
// Must stay var: ugsEditorPlus.reformat.ts declares it again in the same global scope
// (only var allows that), and a top-level var puts it on window for Studio and the Songbook.
// eslint-disable-next-line no-var -- see above
var ugsEditorPlus: UgsEditorPlus = window.ugsEditorPlus || ({} as UgsEditorPlus);