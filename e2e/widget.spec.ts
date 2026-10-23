import { expect, test } from '@playwright/test';

test('opens the widget, focuses the composer, and closes with Escape', async ({ page }) => {
  await page.goto('/');

  const launcher = page.getByRole('button', { name: 'Open Acme help' });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const dialog = page.getByRole('dialog', { name: 'Acme help chat' });
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Hi! I know the Acme docs.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Ask a question' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
});

test('answers in the demo without requiring an API key', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: 'Open Acme help' }).click();
  await page.getByRole('button', { name: 'How do I install it?' }).click();

  await expect(page.getByText(/Quick start guide walks through it/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('The chat service is not configured')).toHaveCount(0);
});
