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

  test('quick-open: Ctrl+P finds a file by name and opens it', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    // Focus a neutral area so the Monaco editor does not capture the chord.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyP');
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/search files by name/i).fill('session');
    const option = palette.getByRole('option', { name: /session\.ts/i });
    await expect(option).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 15_000 });
  });

  test('quick-open routes the > prefix back to commands', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyP');
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await expect(palette).toBeVisible();
    // Typing '>' switches the same palette into command mode.
    await palette.getByRole('combobox').fill('>swarm');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: /agent swarm/i })).toBeVisible();
  });

  test('status bar shows the cursor position and language and opens go-to-line', async ({ page }) => {
    await page.goto('/');
    const statusBar = page.getByRole('group', { name: /status bar/i });
    await expect(statusBar).toBeVisible();
    // The editor mounts and publishes its status to the bar.
    await expect(statusBar.getByText(/Ln \d+, Col \d+/)).toBeVisible({ timeout: 15_000 });
    await expect(statusBar.getByText('TypeScript')).toBeVisible();
    // Clicking the cursor position opens the palette seeded into go-to-line.
    await statusBar.getByRole('button', { name: /go to line/i }).click();
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await expect(palette).toBeVisible();
    await expect(palette.getByPlaceholder(/go to line and column/i)).toBeVisible();
  });

  test('problems: the status bar toggles the Problems panel', async ({ page }) => {
    await page.goto('/');
    const statusBar = page.getByRole('group', { name: /status bar/i });
    await expect(statusBar).toBeVisible();
    const problemsItem = statusBar.getByRole('button', { name: /toggle the problems panel/i });
    await expect(problemsItem).toBeVisible();
    await problemsItem.click();
    const panel = page.getByRole('region', { name: /problems/i });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Problems' })).toBeVisible();
    await panel.getByRole('button', { name: /close problems panel/i }).click();
    await expect(page.getByRole('region', { name: /problems/i })).toHaveCount(0);
  });

  test('search: Ctrl+Shift+F opens Search, and the bottom drawer holds one panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    // Move focus out of Monaco so the global shortcut is not captured.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+Shift+KeyF');
    const search = page.getByRole('region', { name: 'Search' });
    await expect(search).toBeVisible();
    await expect(search.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await expect(search.getByText(/open a folder to search/i)).toBeVisible();
    // Opening Problems closes Search: the drawer is a single slot.
    await page.keyboard.press('Control+Shift+KeyM');
    await expect(page.getByRole('region', { name: 'Search' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: /problems/i })).toBeVisible();
  });

  test('source control: Ctrl+Shift+G opens the panel and shares the bottom slot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+Shift+KeyG');
    const scm = page.getByRole('region', { name: 'Source Control' });
    await expect(scm).toBeVisible();
    await expect(scm.getByText(/open a folder under git/i)).toBeVisible();
    // Opening Search closes Source Control: a single bottom slot.
    await page.keyboard.press('Control+Shift+KeyF');
    await expect(page.getByRole('region', { name: 'Source Control' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Search' })).toBeVisible();
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
