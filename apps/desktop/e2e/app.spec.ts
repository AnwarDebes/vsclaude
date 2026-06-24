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

  test('editor commands: the palette exposes Monaco editing actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.editor-panel')).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/type a command/i).fill('uppercase');
    await expect(palette.getByRole('option', { name: /transform to uppercase/i })).toBeVisible();
    await page.keyboard.press('Enter');
    // The command ran against the editor without breaking the app.
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('compare with saved opens a Monaco diff editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.editor-panel')).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/type a command/i).fill('compare with saved');
    await page.keyboard.press('Enter');
    const diff = page.getByRole('dialog', { name: /diff of/i });
    await expect(diff).toBeVisible();
    await expect(page.locator('.monaco-diff-editor')).toBeVisible({ timeout: 15_000 });
    // Toggle to inline and back, then close.
    await diff.getByRole('button', { name: 'Inline' }).click();
    await diff.getByRole('button', { name: /close diff/i }).click();
    await expect(page.getByRole('dialog', { name: /diff of/i })).toHaveCount(0);
  });

  test('settings: the palette opens a searchable Settings panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('open settings');
    await page.keyboard.press('Enter');
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings).toBeVisible();
    // The Font Size setting is present, and search filters to it.
    await expect(settings.getByText('Font Size', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('minimap');
    await expect(settings.getByText('Minimap', { exact: true })).toBeVisible();
    await expect(settings.getByText('Font Size', { exact: true })).toHaveCount(0);
    await settings.getByRole('button', { name: /close settings/i }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  });

  test('the editor theme follows the app theme', async ({ page }) => {
    await page.goto('/');
    // Default is cozy-dark, a vs-dark base.
    await expect(page.locator('.monaco-editor.vs-dark').first()).toBeVisible({ timeout: 15_000 });
    // Switch to the light theme and the editor follows to the vs base.
    await page.getByRole('combobox', { name: 'Theme' }).selectOption('cozy-light');
    await expect(page.locator('.monaco-editor.vs').first()).toBeVisible();
    await expect(page.locator('.monaco-editor.vs-dark')).toHaveCount(0);
  });

  test('keyboard shortcuts reference lists commands and filters', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('keyboard shortcuts');
    await page.keyboard.press('Enter');
    const shortcuts = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(shortcuts).toBeVisible();
    // Go to File is listed with its real shortcut.
    await expect(shortcuts.getByRole('cell', { name: 'Go to File' })).toBeVisible();
    await shortcuts.getByRole('textbox', { name: /search shortcuts/i }).fill('uppercase');
    await expect(shortcuts.getByRole('cell', { name: 'Transform to Uppercase' })).toBeVisible();
    await expect(shortcuts.getByRole('cell', { name: 'Go to File' })).toHaveCount(0);
    await shortcuts.getByRole('button', { name: /close keyboard shortcuts/i }).click();
    await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toHaveCount(0);
  });

  test('terminal: a new terminal adds a tab and closing removes it', async ({ page }) => {
    await page.goto('/');
    const tablist = page.getByRole('tablist', { name: 'Terminals' });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole('tab')).toHaveCount(1);
    await tablist.getByRole('button', { name: 'New Terminal' }).click();
    await expect(tablist.getByRole('tab')).toHaveCount(2);
    await expect(tablist.getByRole('tab', { name: 'Terminal 2' })).toHaveAttribute('aria-selected', 'true');
    // Switch back to the first terminal.
    await tablist.getByRole('tab', { name: 'Terminal 1' }).click();
    await expect(tablist.getByRole('tab', { name: 'Terminal 1' })).toHaveAttribute('aria-selected', 'true');
    // Close the second terminal.
    await tablist.getByRole('button', { name: 'Close Terminal 2' }).click();
    await expect(tablist.getByRole('tab')).toHaveCount(1);
  });

  test('activity bar opens the views', async ({ page }) => {
    await page.goto('/');
    const rail = page.getByRole('navigation', { name: 'Activity Bar' });
    await expect(rail).toBeVisible();
    // Source Control opens its drawer and marks the item active.
    await rail.getByRole('button', { name: 'Source Control' }).click();
    await expect(page.getByRole('region', { name: 'Source Control' })).toBeVisible();
    await expect(rail.getByRole('button', { name: 'Source Control' })).toHaveAttribute('aria-pressed', 'true');
    // Search swaps the drawer.
    await rail.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('region', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Source Control' })).toHaveCount(0);
    // Settings opens the dialog.
    await rail.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  });

  test('the welcome page opens from the palette with quick actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').first().click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('welcome');
    await page.keyboard.press('Enter');
    const welcome = page.getByRole('dialog', { name: 'Welcome' });
    await expect(welcome).toBeVisible();
    await expect(welcome.getByRole('heading', { name: /welcome to vsclaude/i })).toBeVisible();
    // A quick action opens Settings and closes the welcome page.
    await welcome.getByRole('button', { name: 'Open Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Welcome' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  });

  test('the explorer decorates files that have problems', async ({ page }) => {
    await page.goto('/');
    // The default open file imports unresolved modules, so the language worker
    // reports errors and the explorer marks it.
    await expect(page.locator('.explorer-row__problem').first()).toBeVisible({ timeout: 20000 });
  });

  test('the explorer shows file-type icons', async ({ page }) => {
    await page.goto('/');
    const row = page.getByRole('button', { name: 'session.ts', exact: true });
    await expect(row).toBeVisible();
    await expect(row.locator('.file-icon svg')).toBeVisible();
  });

  test('zen mode hides the chrome and Escape restores it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-header')).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('zen');
    await page.keyboard.press('Enter');
    await expect(page.locator('.app-header')).toBeHidden();
    await expect(page.locator('.activity-bar')).toBeHidden();
    await expect(page.locator('.editor-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('breadcrumbs show the active file path', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'session.ts', exact: true }).click();
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumbs' });
    await expect(crumbs).toBeVisible();
    await expect(crumbs.getByText('auth', { exact: true })).toBeVisible();
    await expect(crumbs.getByRole('button', { name: /session\.ts/ })).toBeVisible();
  });

  test('reset layout closes open drawers', async ({ page }) => {
    await page.goto('/');
    const rail = page.getByRole('navigation', { name: 'Activity Bar' });
    await rail.getByRole('button', { name: /problems/i }).click();
    await expect(page.getByRole('region', { name: /problems/i })).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('reset layout');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: /problems/i })).toHaveCount(0);
  });

  test('activity bar Problems item opens the Problems panel', async ({ page }) => {
    await page.goto('/');
    const rail = page.getByRole('navigation', { name: 'Activity Bar' });
    await rail.getByRole('button', { name: /problems/i }).click();
    await expect(page.getByRole('region', { name: /problems/i })).toBeVisible();
  });

  test('the output panel shows the log channel', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('output');
    await page.keyboard.press('Enter');
    const output = page.getByRole('region', { name: 'Output' });
    await expect(output).toBeVisible();
    await expect(output.getByText(/vsclaude ready/i).first()).toBeVisible();
    // Filtering to errors hides the info startup line.
    await output.getByRole('combobox', { name: /filter by level/i }).selectOption('error');
    await expect(output.getByText(/vsclaude ready/i)).toHaveCount(0);
    await output.getByRole('button', { name: /close output panel/i }).click();
    await expect(page.getByRole('region', { name: 'Output' })).toHaveCount(0);
  });

  test('new untitled file opens a scratchpad', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('new untitled');
    await page.keyboard.press('Enter');
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumbs' });
    await expect(crumbs.getByText(/Untitled-1/)).toBeVisible();
    await expect(page.locator('.editor-panel')).toBeVisible();
  });

  test('settings expose the ruler and whitespace editor options', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('open settings');
    await page.keyboard.press('Enter');
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('textbox', { name: /search settings/i }).fill('ruler');
    await expect(settings.getByText('Ruler Column', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('whitespace');
    await expect(settings.getByText('Render Whitespace', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('line height');
    await expect(settings.getByText('Line Height', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('ui scale');
    await expect(settings.getByText('UI Scale', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('system theme');
    await expect(settings.getByText('Follow System Theme', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('diff ignore');
    await expect(settings.getByText('Diff Ignore Trailing Whitespace', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('bracket pair');
    await expect(settings.getByText('Bracket Pair Guides', { exact: true })).toBeVisible();
    await settings.getByRole('textbox', { name: /search settings/i }).fill('trailing whitespace');
    await expect(settings.getByText('Trim Trailing Whitespace', { exact: true })).toBeVisible();
  });

  test('a terminal tab can be renamed by double-click', async ({ page }) => {
    await page.goto('/');
    const tab = page.getByRole('tab', { name: 'Terminal 1' });
    await expect(tab).toBeVisible();
    await tab.dblclick();
    const input = page.getByRole('textbox', { name: 'Rename terminal' });
    await input.fill('Build');
    await input.press('Enter');
    await expect(page.getByRole('tab', { name: 'Build' })).toBeVisible();
  });

  test('the terminal has a right-click menu with Clear', async ({ page }) => {
    await page.goto('/');
    const host = page.locator('.terminal-host').first();
    await expect(host).toBeVisible();
    await host.click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'Terminal actions' });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Clear' }).click();
    await expect(menu).toHaveCount(0);
  });

  test('the terminal opens a find bar with Ctrl+F', async ({ page }) => {
    await page.goto('/');
    const host = page.locator('.terminal-host').first();
    await expect(host).toBeVisible();
    await host.click();
    await page.keyboard.press('Control+KeyF');
    await expect(page.getByRole('textbox', { name: 'Find in terminal' })).toBeVisible();
  });

  test('search recalls recent queries with the arrow keys', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Activity Bar' }).getByRole('button', { name: 'Search' }).click();
    const input = page.getByRole('textbox', { name: 'Search' });
    await expect(input).toBeVisible();
    await input.fill('alpha');
    await input.press('Enter');
    await input.fill('beta');
    await input.press('Enter');
    await input.fill('');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('beta');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('alpha');
  });

  test('the editor opens the find widget with Ctrl+F', async ({ page }) => {
    await page.goto('/');
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('Control+KeyF');
    await expect(page.getByRole('textbox', { name: 'Find' })).toBeVisible();
  });

  test('the palette shows a command category badge', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('git history');
    const option = palette.getByRole('option').filter({ hasText: 'View History' }).first();
    await expect(option.getByText('Git', { exact: true })).toBeVisible();
    await expect(option.getByText('View History', { exact: true })).toBeVisible();
  });

  test('the notification center collects messages', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const runCommand = async (query: string) => {
      await page.keyboard.press('Control+KeyK');
      const palette = page.getByRole('dialog', { name: /command palette/i });
      await palette.getByPlaceholder(/type a command/i).fill(query);
      await page.keyboard.press('Enter');
    };
    // With no folder open this posts an info notification.
    await runCommand('git history');
    await runCommand('notifications show');
    const center = page.getByRole('dialog', { name: 'Notifications' });
    await expect(center).toBeVisible();
    await expect(center.getByText('Open a folder to view its git history.')).toBeVisible();
    await center.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(center.getByText('No notifications.')).toBeVisible();
  });

  test('the git tags dialog opens from the command palette', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('git tags');
    await page.keyboard.press('Enter');
    const tags = page.getByRole('dialog', { name: 'Git Tags' });
    await expect(tags).toBeVisible();
    await expect(tags.getByText(/open a folder under git to manage tags/i)).toBeVisible();
  });

  test('the settings JSON editor opens with the current settings', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('settings open json');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Settings JSON' });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox', { name: 'Settings JSON' })).toHaveValue(/themeId/);
  });

  test('release notes open from the command palette', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('release notes');
    await page.keyboard.press('Enter');
    const notes = page.getByRole('dialog', { name: 'Release Notes' });
    await expect(notes).toBeVisible();
    await expect(notes.getByRole('heading', { name: 'Source control' })).toBeVisible();
  });

  test('the outline view lists markdown headings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'README.md', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('view outline');
    await page.keyboard.press('Enter');
    const outline = page.getByRole('region', { name: 'Outline' });
    await expect(outline).toBeVisible();
    await expect(outline.getByRole('button', { name: 'Aurora' })).toBeVisible();
    await expect(outline.getByRole('button', { name: 'Getting started' })).toBeVisible();
  });

  test('svg preview renders the active svg as an image', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'logo.svg', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('image preview');
    await page.keyboard.press('Enter');
    const preview = page.getByRole('dialog', { name: /preview of logo\.svg/i });
    await expect(preview).toBeVisible();
    const img = preview.getByRole('img', { name: 'logo.svg' });
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /^data:image\/svg\+xml/);
  });

  test('markdown preview renders the active markdown file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'README.md', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('markdown preview');
    await page.keyboard.press('Enter');
    const preview = page.getByRole('dialog', { name: /preview of readme/i });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole('heading', { name: 'Aurora' })).toBeVisible();
    await expect(preview.getByRole('link', { name: 'docs' })).toBeVisible();
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
