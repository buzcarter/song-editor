'use strict';
/**
 * The shipped type declarations (dist/*.d.ts), from a host's side: compiles test/types/
 * as if the package were installed (run `npm run build` first).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT } = require('./helpers');

test('host code compiles against the shipped .d.ts files', () => {
  const host = fs.mkdtempSync(path.join(os.tmpdir(), 'song-editor-types-'));
  try {
    fs.cpSync(path.join(__dirname, 'types'), host, { recursive: true });
    fs.mkdirSync(path.join(host, 'node_modules/@ukegeeks'), { recursive: true });
    fs.symlinkSync(ROOT, path.join(host, 'node_modules/@ukegeeks/song-editor'), 'dir');

    const tsc = require.resolve('typescript/bin/tsc');
    try {
      execFileSync(process.execPath, [tsc, '-p', host], { encoding: 'utf8' });
    } catch (err) {
      assert.fail(err.stdout || err.message);
    }
  } finally {
    fs.rmSync(host, { recursive: true, force: true });
  }
});
