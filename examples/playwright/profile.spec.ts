import { test, expect } from '../../src/playwright.js';
test('save profile after a locator change', async ({ page, healing }) => {
  await page.goto('/');
  // The local demo now uses #display-name; this previous locator is deliberately broken.
  await healing.fill('#old-display-name', 'Taylor', { description: 'Fill display name' });
  await healing.click('#save-profile', { description: 'Save profile' });
  await expect(page.getByRole('status')).toHaveText('Saved: Taylor');
});
