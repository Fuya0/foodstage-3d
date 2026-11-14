import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = Array.isArray(base.webServer) ? base.webServer[0] : base.webServer;

export default defineConfig({
  ...base,
  webServer: { ...server, cwd: root },
  testDir: './tests',
  testMatch: '*.spec.ts',
  outputDir: './test-results',
  expect: { timeout: 10000 },
});
