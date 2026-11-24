import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    setupFilesAfterEnv: ['./setupTestFramework.ts'],
    moduleNameMapper: {
        '^server-only$': '<rootDir>/test-config/mocks/server-only.ts',
        '^bcrypt-ts$': '<rootDir>/test-config/mocks/bcrypt-ts.ts',
        '^@/(.*)$': '<rootDir>/$1'
    },
    transform: {
        '^.+\\.{ts|tsx}?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.json'
            }
        ]
    },
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests-e2e/'],
    preset: 'ts-jest',
    verbose: true
};

export default config;
