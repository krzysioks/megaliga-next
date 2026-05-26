import { loadEnvConfig } from '@next/env';

//loadEnvConfig reads env files based on NODE_ENV. For test we add .env.test.local
loadEnvConfig(process.cwd());

// wait for 20s before failing a test
jest.setTimeout(20 * 1000);
