import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import jest from 'eslint-plugin-jest';
import perfectionist from 'eslint-plugin-perfectionist';
import tsParser from '@typescript-eslint/parser';

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
        jest,
        perfectionist
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
        '@typescript-eslint/no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['./*', '../*'],
                        message:
                            'Use an absolute aliased import instead of relative paths'
                    }
                ]
            }
        ],
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
                        'type-internal',
                        'type-parent',
                        'type-sibling',
                        'type-index'
                    ],
                    'builtin',
                    'external',
                    'internal',
                    ['parent', 'sibling', 'index', 'side-effect'],
                    ['style', 'side-effect-style'],
                    ['ts-equals-import', 'unknown']
                ],
                customGroups: [
                    {
                        groupName: 'server',
                        elementNamePattern: '^server-only$'
                    }
                ],
                newlinesBetween: 1
            }
        ]
    }
};

const eslintConfig = [
    ...nextVitals,
    ...nextTypescript,
    {
        ignores: ['.next/**', 'next-env.d.ts', 'docs/**', 'coverage/**']
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ...config
    }
];

export default eslintConfig;
