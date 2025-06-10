import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    setupFilesAfterEnv: ['./setupTestFramework.js'],
    transform: {
        '^.+\\.{ts|tsx}?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json'
            }
        ]
    },
    testEnvironment: 'node',
    preset: 'ts-jest',
    verbose: true
};

export default config;
