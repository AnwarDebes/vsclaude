import { test, expect } from '@playwright/test';

test.describe('vsclaude shell', () => {
  test('loads the IDE shell with the editor and timeline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await expect(page.locator('.editor-panel')).toBeVisible();
    await expect(page.getByRole('complementary', { name: /conversation timeline/i })).toBeVisible();
  });

  test('Pixie reacts: the timeline accrues activity as the session plays', async ({ page }) => {
    await page.goto('/');
    // The recorded session plays on a timer; items appear over time.
    await expect(page.locator('.timeline-item').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.narration__live')).not.toBeEmpty();
  });

  test('switches to the swarm view from the toolbar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'swarm', exact: true }).click();
    await expect(page.getByRole('region', { name: /agent swarm/i })).toBeVisible();
  });

  test('opens the command palette and runs a command', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    // Focus a neutral area so the Monaco editor does not capture the Ctrl+K chord.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/type a command/i).fill('swarm');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: /agent swarm/i })).toBeVisible();
  });

  test('opens a file from the explorer into the editor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'session.ts', exact: true }).click();
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 15_000 });
  });

  test('opens the diff review overlay from the command palette', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/type a command/i).fill('review');
    await page.keyboard.press('Enter');
    const review = page.getByRole('dialog', { name: /review changes/i });
    await expect(review).toBeVisible();
    await expect(review.getByText(/native app/i)).toBeVisible();
  });
});
