import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { validateConfig, createOpenAIProvider } from '../../src/index.js';
import type { HealingFixtures } from '../../src/playwright.js';
const live = process.env.HEALING_EXAMPLE_LIVE === '1';
const config = validateConfig({ mode: live ? 'full' : 'ranker-only' });
if (live && !process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY for the explicitly enabled live example.');
export default defineConfig<HealingFixtures>({
  testDir: '.', testMatch: 'profile.spec.ts', workers: 1, retries: 0,
  reporter: [['list'], ['../../src/reporter.ts', { outputDir: 'output/healing', open: 'always' }]],
  use: { baseURL: 'http://127.0.0.1:3198', healingOptions: { config, audit: true,
    ...(live ? { provider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY!, config, maxRequests: 3 }) } : {}) } },
  webServer: { command: 'node app.mjs', cwd: fileURLToPath(new URL('.', import.meta.url)), url: 'http://127.0.0.1:3198', reuseExistingServer: false },
});
