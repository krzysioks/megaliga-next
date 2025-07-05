import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import react from 'eslint-plugin-react';
import jest from 'eslint-plugin-jest';
import perfectionist from 'eslint-plugin-perfectionist';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname
});

const config = {
    languageOptions: {
        parser: tsParser,
        parserOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            ecmaFeatures: {
                jsx: true
            }
        },
        globals: {
            window: 'readonly',
            document: 'readonly',
            console: 'readonly',
            process: 'readonly',
            Buffer: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
            module: 'readonly',
            require: 'readonly',
            exports: 'readonly',
            global: 'readonly'
        }
    },
    linterOptions: {
        reportUnusedDisableDirectives: true
    },
    plugins: {
        react,
        jest,
        perfectionist,
        '@typescript-eslint': tseslint
    },
    settings: {
        react: {
            createClass: 'createReactClass',
            pragma: 'React',
            version: 'detect',
            flowVersion: '0.53'
        }
    },
    rules: {
        'no-prototype-builtins': 'off',
        'no-undef': 'off',
        'no-useless-escape': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_' }
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        'perfectionist/sort-imports': [
            'error',
            {
                type: 'natural',
                order: 'asc',
                sortSideEffects: true,
                groups: [
                    'server',
                    [
                        'type',
                        'internal-type',
                        'parent-type',
                        'sibling-type',
                        'index-type'
                    ],
                    'builtin',
                    'external',
                    'internal',
                    ['parent', 'sibling', 'index', 'side-effect'],
                    ['style', 'side-effect-style'],
                    ['object', 'unknown']
                ],
                customGroups: {
                    value: {
                        server: ['server-only']
                    }
                },
                newlinesBetween: 'always'
            }
        ]
    }
};

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ...config
    }
];

export default eslintConfig;
