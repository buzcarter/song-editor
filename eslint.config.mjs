// ESLint flat config (`npm run lint`).
//
// The sources in src/ are plain scripts, not modules: no import/export, one shared
// global scope, joined into one bundle by scripts/build.js (see docs/ARCHITECTURE.md).
//
// The rules start as warnings, so lint passes while the code is brought up to them.
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    // src/js/libs holds third-party code
    ignores: ['dist/', 'node_modules/', 'src/types/*.d.ts', 'src/js/libs/'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'script',
      ecmaVersion: 2020,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'no-var': 'warn',
      'prefer-const': 'warn',
      eqeqeq: 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
