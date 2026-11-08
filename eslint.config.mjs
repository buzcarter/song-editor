// ESLint flat config (`npm run lint`).
//
// The sources in src/ are plain scripts, not modules: no import/export, one shared
// global scope, joined into one bundle by scripts/build.js (see docs/ARCHITECTURE.md).
// Two recommended rules are adjusted for that, below.
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    // src/js/libs holds third-party code
    ignores: ['dist/', 'node_modules/', 'src/types/*.d.ts', 'src/js/libs/'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'script',
      ecmaVersion: 2020,
    },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      // `x == null` is kept on purpose: it is true for null and for undefined.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // Top-level names in a plain script are shared with the other files (the
      // `interface UgsEditorPlus` merges, the `var ugsEditorPlus` namespace), so
      // "unused in this file" doesn't mean unused. Check only names inside functions.
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'local' }],
      // Without modules, `declare namespace UgsEditorPlus { ... }` is how the types
      // are grouped. It is types only: nothing is emitted.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
);
