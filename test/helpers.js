'use strict';
/**
 * Loads Song Formatter and the built editor bundle into a jsdom page.
 */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * @param {object} [options]
 * @param {string} [options.body] markup to put in <body> before the scripts
 * @return {{ window: Window, document: Document, errors: string[] }}
 */
function loadEditorPage({ body = '' } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => {
    // jsdom has no <canvas>; the Chord Builder's canvases get a stub (below)
    if (!/getContext/.test(err.message)) errors.push(err.message);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));

  const css = read(path.join(DIST, 'css/ugsEditorPlus.merged.css'));
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head><style title="ugsEditorCss">${css}</style></head><body>${body}</body></html>`,
    { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/songbook/', virtualConsole },
  );
  const { window } = dom;

  // A do-nothing 2D context, so the Chord Builder can "draw"
  window.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({ canvas: this }, {
      get: (target, key) => (key in target ? target[key] : () => ({ width: 0 })),
    });
  };

  const scripts = [require.resolve('@ukegeeks/song-formatter/browser'), path.join(DIST, 'ugsEditorPlus.min.js')];
  for (const file of scripts) {
    const script = window.document.createElement('script');
    script.textContent = read(file);
    window.document.body.appendChild(script);
  }
  return { window, document: window.document, errors };
}

const SAMPLE_SONG = `{title: Fixture Song}
{artist: The Testers}
{define: Zz7 frets 1 2 3 4}
[C]Hello [Am]there, [F]said the [G7]uke
`;

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { ROOT, DIST, loadEditorPage, SAMPLE_SONG, tick };
