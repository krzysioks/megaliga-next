import { defineConfig, devices } from '@playwright/test';

const testServerHost = '127.0.0.1';
const testServerPort = 3100;
const baseURL = `http://${testServerHost}:${testServerPort}`;

export default defineConfig({
    testDir: './tests-e2e',
    forbidOnly: Boolean(process.env.CI),
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: devices['Desktop Chrome'] },
        { name: 'mobile', use: devices['Pixel 7'] }
    ],
    webServer: {
        command: `npm run start -- --hostname ${testServerHost} --port ${testServerPort}`,
        url: baseURL
    }
});
