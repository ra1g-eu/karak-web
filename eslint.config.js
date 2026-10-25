import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['dist', 'assets', 'public', 'node_modules']),
    js.configs.recommended,
    tseslint.configs.strict,
    {
        files: ['src/client/**/*.ts'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['*.config.{js,ts}'],
        languageOptions: { globals: globals.node },
    },
    {
        // Engine purity (see CLAUDE.md): no DOM, no timers, no clocks, no I/O, no Math.random().
        files: ['src/engine/**/*.ts'],
        rules: {
            'no-restricted-globals': [
                'error',
                ...[
                    'window',
                    'document',
                    'globalThis',
                    'localStorage',
                    'sessionStorage',
                    'fetch',
                    'setTimeout',
                    'setInterval',
                    'requestAnimationFrame',
                    'Date',
                    'performance',
                    'console',
                ].map((name) => ({
                    name,
                    message: 'The engine must stay pure and deterministic (CLAUDE.md).',
                })),
            ],
            'no-restricted-properties': [
                'error',
                {
                    object: 'Math',
                    property: 'random',
                    message: 'Use the seeded RNG stored in GameState.',
                },
            ],
        },
    },
    prettier,
]);
