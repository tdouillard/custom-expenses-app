import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:3011' },
  webServer: {
    command: 'node scripts/dev-server.js',
    url: 'http://localhost:3011/index.html',
    env: { PORT: '3011' },
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
