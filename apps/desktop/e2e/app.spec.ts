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
    // The change counter reports the diff size (zero or more changes).
    await expect(diff.locator('.diff-modal__changes')).toHaveText(/change/i, { timeout: 15_000 });
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
    // The conflict summary reports on the real registry, whose bindings are unique.
    await expect(shortcuts.getByLabel('Keybinding conflicts')).toHaveText(/no keybinding conflicts/i);
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

  test('the problems panel filters by text', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Activity Bar' }).getByRole('button', { name: /problems/i }).click();
    const panel = page.getByRole('region', { name: 'Problems' });
    await expect(panel.locator('.problems__item').first()).toBeVisible({ timeout: 20_000 });
    await panel.getByRole('searchbox', { name: 'Filter problems' }).fill('zzzznope');
    await expect(panel.getByText('No problems match the filter.')).toBeVisible();
  });

  test('the explorer auto-reveals the active file', async ({ page }) => {
    await page.goto('/');
    const list = page.getByRole('navigation', { name: 'Files' }).locator('.explorer-list');
    // Collapse the auth folder so its files hide.
    await list.getByRole('button', { name: 'auth', exact: true }).click();
    await expect(list.getByRole('button', { name: 'use-auth.ts' })).toHaveCount(0);
    // Open a file inside it via quick-open; the explorer re-reveals it.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyP');
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await palette.getByPlaceholder(/search files by name/i).fill('use-auth');
    await page.keyboard.press('Enter');
    await expect(list.getByRole('button', { name: 'use-auth.ts' })).toBeVisible();
  });

  test('the explorer lists the open editor', async ({ page }) => {
    await page.goto('/');
    const openEditors = page.getByRole('region', { name: 'Open Editors' });
    await expect(openEditors).toBeVisible();
    await expect(openEditors.getByRole('button', { name: /login-form\.tsx/ })).toBeVisible();
  });

  test('the explorer hides excluded noise directories', async ({ page }) => {
    await page.goto('/');
    const explorer = page.getByRole('navigation', { name: 'Files' });
    await expect(explorer.getByRole('button', { name: 'README.md', exact: true })).toBeVisible();
    await expect(explorer.getByText('node_modules')).toHaveCount(0);
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

  test('the palette searches workspace symbols on #', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('#LoginForm');
    await expect(palette.getByRole('option', { name: /LoginForm/ })).toBeVisible();
  });

  test('the palette offers go to symbol on @', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('@');
    await expect(palette.getByRole('option', { name: 'Go to Symbol in Editor' })).toBeVisible();
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

  test('run build task reports when none is configured', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const runCommand = async (query: string) => {
      await page.keyboard.press('Control+KeyK');
      const palette = page.getByRole('dialog', { name: /command palette/i });
      await palette.getByPlaceholder(/type a command/i).fill(query);
      await page.keyboard.press('Enter');
    };
    await runCommand('tasks run build');
    await runCommand('notifications show');
    const center = page.getByRole('dialog', { name: 'Notifications' });
    await expect(center.getByText(/no build task found/i)).toBeVisible();
  });

  test('a notification shows a toast and a status-bar bell opens the center', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('git history');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').getByText(/open a folder to view its git history/i)).toBeVisible();
    await page.getByRole('button', { name: /show the notification center/i }).click();
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
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

  test('the git stashes dialog opens from the command palette', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('git stashes');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Git Stashes' });
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/open a folder under git to manage stashes/i)).toBeVisible();
  });

  test('the git remotes dialog opens from the command palette', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('git remotes');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Git Remotes' });
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/open a folder under git to manage remotes/i)).toBeVisible();
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

  test('the theme export shows the active theme as JSON', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('theme export');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Export theme' });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('textbox', { name: 'Theme JSON' })).toHaveValue(/"id"/);
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

  test('the Edit menu lists undo and redo', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const menu = page.getByRole('menu', { name: 'Edit' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Undo' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Redo' })).toBeVisible();
  });

  test('the menu bar opens release notes from the Help menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const menu = page.getByRole('menu', { name: 'Help' });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Release Notes' }).click();
    await expect(page.getByRole('dialog', { name: 'Release Notes' })).toBeVisible();
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

  test('the output panel switches between channels', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('view output');
    await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: 'Output' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('vsclaude ready.').first()).toBeVisible();
    await panel.getByRole('combobox', { name: 'Output channel' }).selectOption('Window');
    await expect(panel.getByText('Renderer window opened.').first()).toBeVisible();
    await expect(panel.getByText('vsclaude ready.')).toHaveCount(0);
  });

  test('the narration log opens as a log region', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('narration log');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('log', { name: 'Narration log' })).toBeVisible();
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

  test('the outline view lists code symbols', async ({ page }) => {
    await page.goto('/');
    // Select the TS file in the explorer tree (scoped to avoid the Open Editors
    // and breadcrumb buttons that share its name).
    await page.locator('.explorer-list').getByRole('button', { name: 'login-form.tsx', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('view outline');
    await page.keyboard.press('Enter');
    const outline = page.getByRole('region', { name: 'Outline' });
    await expect(outline).toBeVisible();
    // login-form.tsx declares a top-level LoginForm component.
    await expect(outline.getByRole('button', { name: 'LoginForm' })).toBeVisible();
  });

  test('accessibility help opens from the Help menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page.getByRole('menu', { name: 'Help' }).getByRole('menuitem', { name: 'Accessibility Help' }).click();
    const dialog = page.getByRole('dialog', { name: 'Accessibility help' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Command palette')).toBeVisible();
  });

  test('the snippet browser lists the built-in snippets', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('snippets insert');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Insert snippet' });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('clg')).toBeVisible();
    await expect(modal.getByText('console.log')).toBeVisible();
  });

  test('the process info panel shows runtime metrics', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('process info');
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Process info' });
    await expect(modal).toBeVisible();
    await expect(modal.getByText('CPU cores')).toBeVisible();
    await expect(modal.getByText('IPC protocol')).toBeVisible();
  });

  test('the hex view shows the active file as a hex dump', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'README.md', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('view hex');
    await page.keyboard.press('Enter');
    const hex = page.getByRole('dialog', { name: /hex view of readme/i });
    await expect(hex).toBeVisible();
    await expect(hex.getByText(/00000000/)).toBeVisible();
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

  test('raster image preview shows dimensions and zooms', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'pixie.png', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('image preview');
    await page.keyboard.press('Enter');
    const preview = page.getByRole('dialog', { name: /preview of pixie\.png/i });
    await expect(preview).toBeVisible();
    const img = preview.getByRole('img', { name: 'pixie.png' });
    await expect(img).toHaveAttribute('src', /^data:image\/png/);
    // The natural dimensions are read on load.
    await expect(preview.getByText(/16 x 16 px/)).toBeVisible();
    // Zoom in bumps the level off 100 percent.
    await expect(preview.getByText('Zoom 100%')).toBeVisible();
    await preview.getByRole('button', { name: 'Zoom in' }).click();
    await expect(preview.getByText('Zoom 125%')).toBeVisible();
    // Rotate turns the image a quarter turn.
    await preview.getByRole('button', { name: 'Rotate' }).click();
    await expect(img).toHaveAttribute('style', /rotate\(90deg\)/);
    // Reset returns to the neutral view.
    await preview.getByRole('button', { name: 'Reset view' }).click();
    await expect(img).toHaveAttribute('style', /rotate\(0deg\)/);
    await expect(preview.getByText('Zoom 100%')).toBeVisible();
  });

  test('media player opens an audio file with controls', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'chime.wav', exact: true }).click();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('media open player');
    await page.keyboard.press('Enter');
    const player = page.getByRole('dialog', { name: /media player for chime\.wav/i });
    await expect(player).toBeVisible();
    const audio = player.getByLabel('chime.wav');
    await expect(audio).toHaveAttribute('controls', '');
    await expect(audio).toHaveAttribute('src', /^data:audio\/wav/);
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

  test('the status bar changes the editor language mode', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // The default file is a .tsx, so the status bar shows TypeScript and is clickable.
    const langItem = page.getByRole('button', { name: /^Language TypeScript/i });
    await expect(langItem).toBeVisible();
    await langItem.click();
    // The palette opens filtered to Language Mode commands; pick JSON.
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Language Mode: JSON');
    await page.keyboard.press('Enter');
    // The editor language switched live, so the status bar now reads JSON.
    await expect(page.getByRole('button', { name: /^Language JSON/i })).toBeVisible();
  });

  test('the status bar changes the end of line sequence', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // Demo files use LF, so the status bar shows LF and is clickable.
    const eolItem = page.getByRole('button', { name: /^End of line LF/i });
    await expect(eolItem).toBeVisible();
    await eolItem.click();
    // The palette opens filtered to End of Line commands; pick CRLF.
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('End of Line: CRLF');
    await page.keyboard.press('Enter');
    // The conversion ran live, so the status bar now reads CRLF.
    await expect(page.getByRole('button', { name: /^End of line CRLF/i })).toBeVisible();
  });

  test('the command palette jumps to a symbol with @', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // The default file defines the LoginForm component at line 4.
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('@LoginForm');
    await page.keyboard.press('Enter');
    // The editor jumped to the symbol, so the cursor status reads line 4.
    await expect(page.getByRole('button', { name: /^Line 4,/i })).toBeVisible();
  });

  test('the command palette jumps to a workspace symbol with #', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // isExpired is defined in session.ts at line 7; the default open file is login-form.tsx.
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('#isExpired');
    await expect(palette.getByRole('option', { name: /isExpired/ })).toBeVisible();
    await page.keyboard.press('Enter');
    // The cross-file jump opened session.ts and revealed the symbol's line.
    await expect(page.getByText('session.ts').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Line 7,/i })).toBeVisible();
  });

  test('the outline highlights the symbol containing the cursor', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // Open the Outline view (the default file defines LoginForm at line 4).
    await page.keyboard.press('Control+KeyK');
    let palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('View: Outline');
    await page.keyboard.press('Enter');
    const item = page.getByRole('button', { name: 'LoginForm' });
    await expect(item).toBeVisible();
    // Move the caret into LoginForm; the outline should follow and highlight it.
    await page.keyboard.press('Control+KeyK');
    palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill(':5');
    await page.keyboard.press('Enter');
    await expect(item).toHaveAttribute('aria-current', 'true');
  });

  test('Ctrl+B toggles the primary sidebar and lets the editor reclaim the space', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const explorer = page.getByRole('navigation', { name: 'Files' });
    const editor = page.locator('.app-center');
    await expect(explorer).toBeVisible();
    const widthBefore = (await editor.boundingBox())?.width ?? 0;
    await page.keyboard.press('Control+KeyB');
    await expect(explorer).toBeHidden();
    // The editor must reclaim the freed column, not stay pinned to the 220px track.
    const widthAfter = (await editor.boundingBox())?.width ?? 0;
    expect(widthAfter).toBeGreaterThan(widthBefore);
    await page.keyboard.press('Control+KeyB');
    await expect(explorer).toBeVisible();
  });

  test('Ctrl+J toggles the bottom panel', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const problems = page.getByRole('region', { name: 'Problems' });
    await expect(problems).toBeHidden();
    await page.keyboard.press('Control+KeyJ');
    await expect(problems).toBeVisible();
    await page.keyboard.press('Control+KeyJ');
    await expect(problems).toBeHidden();
  });

  test('a breadcrumb folder dropdown jumps to a sibling file', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // Default file is src/auth/login-form.tsx, so the trail is src / auth / login-form.tsx.
    const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumbs' });
    await breadcrumbs.getByRole('button', { name: 'src' }).click();
    const menu = page.getByRole('menu', { name: /src contents/i });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: /App\.tsx/ }).click();
    // The chosen sibling opened, so the breadcrumb file segment now reads App.tsx.
    await expect(breadcrumbs.getByRole('button', { name: /App\.tsx/ })).toBeVisible();
  });

  test('code-intelligence commands are in the palette', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Go to Definition');
    await expect(palette.getByRole('option', { name: /Go to Definition/i })).toBeVisible();
  });

  test('Go Back and Go Forward step through the navigation history', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // The editor opens at line 1. Jump to the LoginForm symbol (line 4) via @, which
    // records the line-1 origin in the history. (Ctrl+K works here: the editor is not
    // yet focused, so Monaco does not capture it as a chord.)
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('@LoginForm');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /^Line 4,/i })).toBeVisible();
    // Alt+Left goes back to the origin, Alt+Right returns (Monaco does not bind these).
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(page.getByRole('button', { name: /^Line 1,/i })).toBeVisible();
    await page.keyboard.press('Alt+ArrowRight');
    await expect(page.getByRole('button', { name: /^Line 4,/i })).toBeVisible();
  });

  test('the merge conflict bar resolves a conflict', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // session.config.ts ships with an unresolved merge conflict.
    await page.getByRole('button', { name: 'session.config.ts', exact: true }).click();
    const bar = page.getByRole('region', { name: 'Merge conflicts' });
    await expect(bar).toBeVisible();
    await expect(bar.getByText(/1 merge conflict/i)).toBeVisible();
    // The conflict regions are decorated inline in the editor.
    await expect(page.locator('.conflict-marker').first()).toBeVisible();
    await bar.getByRole('button', { name: 'Accept Current' }).click();
    // Resolving rewrites the file, so the conflict (and the bar) disappear.
    await expect(bar).toBeHidden();
  });

  test('conflict decorations do not duplicate when switching files', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const tree = page.locator('.explorer-list');
    await tree.getByRole('button', { name: 'session.config.ts', exact: true }).click();
    const markers = page.locator('.conflict-marker');
    await expect(markers.first()).toBeVisible();
    const initial = await markers.count();
    // Switch to another file and back; the decorations must replace, not accumulate.
    await tree.getByRole('button', { name: 'login-form.tsx', exact: true }).click();
    await tree.getByRole('button', { name: 'session.config.ts', exact: true }).click();
    await expect(markers.first()).toBeVisible();
    await expect(markers).toHaveCount(initial);
  });

  test('the sidebar sash resizes the explorer', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const files = page.getByRole('navigation', { name: 'Files' });
    await expect(files).toBeVisible();
    const before = (await files.boundingBox())!.width;
    const sash = page.getByRole('separator', { name: 'Resize sidebar' });
    await sash.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
    const after = (await files.boundingBox())!.width;
    expect(after).toBeGreaterThan(before + 50);
  });

  test('the bottom panel sash resizes the dock', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const dock = page.locator('.app-bottom');
    await expect(dock).toBeVisible();
    const before = (await dock.boundingBox())!.height;
    const sash = page.getByRole('separator', { name: 'Resize panel' });
    await sash.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowUp');
    const after = (await dock.boundingBox())!.height;
    expect(after).toBeGreaterThan(before + 50);
  });

  test('importing a theme JSON applies it as a custom theme', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Theme: Import');
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Import theme' });
    await expect(dialog).toBeVisible();
    // A complete theme (all ColorTokens keys) with a distinctive background, so the
    // assertion proves a consumed variable actually applied, not just data-theme.
    const theme = {
      id: 'imported-test',
      name: 'Imported',
      appearance: 'dark',
      color: {
        bg: '#123456',
        surface: '#1a1a1a',
        surfaceElevated: '#222222',
        border: '#333333',
        text: '#eeeeee',
        textMuted: '#aaaaaa',
        accent: '#4f8cff',
        accentMuted: '#2a4a80',
        accentContrast: '#ffffff',
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',
        info: '#58a6ff',
        glow: '#4f8cff',
      },
    };
    await dialog.getByLabel('Theme JSON').fill(JSON.stringify(theme));
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'imported-test');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    );
    expect(bg).toBe('#123456');
  });

  test('select for compare diffs two files', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // Select the default open file as the compare base.
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Select for Compare');
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    // Open a different file (focus moves to the explorer, so Ctrl+K still opens the
    // palette rather than a Monaco chord), then compare it against the base.
    await page.locator('.explorer-list').getByRole('button', { name: 'session.ts', exact: true }).click();
    await page.keyboard.press('Control+KeyK');
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/type a command/i).fill('Compare with Selected');
    await page.keyboard.press('Enter');
    await expect(page.getByText('selected for compare')).toBeVisible();
  });

  test('Toggle Full Screen enters and leaves fullscreen', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const shell = page.locator('.app-shell');
    await expect(shell).toHaveAttribute('data-fullscreen', 'false');
    const run = async () => {
      await page.keyboard.press('Control+KeyK');
      const palette = page.getByRole('dialog', { name: /command palette/i });
      await palette.getByPlaceholder(/type a command/i).fill('Toggle Full Screen');
      await page.keyboard.press('Enter');
      await expect(palette).toBeHidden();
    };
    await run();
    await expect(shell).toHaveAttribute('data-fullscreen', 'true');
    await run();
    await expect(shell).toHaveAttribute('data-fullscreen', 'false');
  });

  test('Reset Layout restores the default sidebar width and visibility', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const files = page.getByRole('navigation', { name: 'Files' });
    const sash = page.getByRole('separator', { name: 'Resize sidebar' });
    await sash.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight');
    const widened = (await files.boundingBox())!.width;
    expect(widened).toBeGreaterThan(250);
    // Hide the sidebar with Ctrl+B as well, so reset must restore both size and visibility.
    await page.keyboard.press('Control+KeyB');
    await expect(files).toBeHidden();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Reset Layout');
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    await expect(files).toBeVisible();
    const reset = (await files.boundingBox())!.width;
    expect(reset).toBeLessThan(widened);
    expect(reset).toBeLessThanOrEqual(240);
  });

  test('F6 cycles focus through the main regions and wraps', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const inRegion = (selector: string) =>
      page.evaluate((s) => !!document.activeElement?.closest(s), selector);
    await page.keyboard.press('F6');
    expect(await inRegion('.activity-bar')).toBe(true);
    await page.keyboard.press('F6');
    expect(await inRegion('nav[aria-label="Files"]')).toBe(true);
    await page.keyboard.press('F6');
    expect(await inRegion('.app-center')).toBe(true);
    await page.keyboard.press('F6');
    expect(await inRegion('.app-bottom')).toBe(true);
    await page.keyboard.press('F6');
    expect(await inRegion('.status-bar')).toBe(true);
    // Forward from the last region wraps to the first.
    await page.keyboard.press('F6');
    expect(await inRegion('.activity-bar')).toBe(true);
    // Shift+F6 steps back (wrapping to the status bar).
    await page.keyboard.press('Shift+F6');
    expect(await inRegion('.status-bar')).toBe(true);
  });

  test('closing the command palette restores focus to the trigger', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // Focus a non-dialog element, open the palette, dismiss it, and expect focus back.
    const sash = page.getByRole('separator', { name: 'Resize sidebar' });
    await sash.focus();
    await expect(sash).toBeFocused();
    await page.keyboard.press('Control+KeyK');
    await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sash).toBeFocused();
  });

  test('closing the theme export modal restores focus too', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    const sash = page.getByRole('separator', { name: 'Resize sidebar' });
    await sash.focus();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Theme: Export');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Export theme' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sash).toBeFocused();
  });

  test('an open modal traps Tab focus inside it', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Theme: Export');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Export theme' })).toBeVisible();
    const inDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    // Tab forward and backward repeatedly; focus must never escape the dialog.
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inDialog()).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await inDialog()).toBe(true);
  });

  test('Toggle Editor Read-only makes the editor reject edits', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    const editorPanel = page.locator('.editor-panel');
    await expect(editorPanel).toBeVisible();
    const runToggle = async () => {
      // Click the neutral brand tag so the Monaco editor does not capture the Ctrl+K chord.
      await page.getByText('Claude Code, in motion').click();
      await page.keyboard.press('Control+KeyK');
      const palette = page.getByRole('dialog', { name: /command palette/i });
      await expect(palette).toBeVisible();
      await palette.getByPlaceholder(/type a command/i).fill('Toggle Editor Read-only');
      await page.keyboard.press('Enter');
      await expect(palette).not.toBeVisible();
    };
    await runToggle();
    await expect(editorPanel).toHaveAttribute('data-readonly', 'true');
    // Edits are rejected: type into the editor and confirm the first line is unchanged.
    const firstLine = page.locator('.view-lines .view-line').first();
    const before = (await firstLine.innerText()).trim();
    await page.locator('.monaco-editor').first().click();
    await page.keyboard.type('ZZZZ');
    await expect(firstLine).toHaveText(before);
    // Toggling again restores editability.
    await runToggle();
    await expect(editorPanel).not.toHaveAttribute('data-readonly', 'true');
  });

  test('search history persists across reloads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+Shift+KeyF');
    const box = page.getByRole('region', { name: 'Search' }).getByRole('textbox', { name: 'Search' });
    await box.fill('persistme');
    await box.press('Enter');
    // Reload: the recent-query history should survive.
    await page.reload();
    await expect(page.getByText('vsclaude').first()).toBeVisible();
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+Shift+KeyF');
    const box2 = page.getByRole('region', { name: 'Search' }).getByRole('textbox', { name: 'Search' });
    await box2.click();
    await box2.press('ArrowUp');
    await expect(box2).toHaveValue('persistme');
  });

  test('the explorer scrolls the revealed file into view', async ({ page }) => {
    // A short viewport makes the file tree overflow, so reaching a bottom file needs a scroll.
    await page.setViewportSize({ width: 1100, height: 340 });
    await page.goto('/');
    const filesNav = page.getByRole('navigation', { name: 'Files' });
    await expect(filesNav).toBeVisible();
    // Open a file at the bottom of the tree via quick-open; auto-reveal scrolls it into view.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyP');
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await palette.getByPlaceholder(/search files by name/i).fill('package.json');
    await page.keyboard.press('Enter');
    const activeRow = filesNav.locator('.explorer-row--active');
    await expect(activeRow).toContainText('package.json');
    await expect(activeRow).toBeInViewport();
  });

  test('the explorer reveals the opened file even when the agent is on another file', async ({ page }) => {
    // Regression guard: with the agent's activePath differing from the opened file, the scroll must
    // target the OPENED row, not the (often higher) activePath row.
    await page.setViewportSize({ width: 1100, height: 360 });
    await page.goto('/');
    const filesNav = page.getByRole('navigation', { name: 'Files' });
    await expect(filesNav).toBeVisible();
    // Let the demo session advance so activePath points at a source file, then pause to freeze it.
    await page.waitForTimeout(5000);
    await page.getByRole('button', { name: 'Pause' }).click();
    // Scroll the tree to the top so the bottom file starts off-screen.
    await page.locator('.explorer-panel').evaluate((el) => el.scrollTo(0, 0));
    const pkgRow = filesNav.locator('.explorer-list').getByRole('button', { name: /package\.json/ });
    await expect(pkgRow).not.toBeInViewport();
    // Open the bottom file; it must scroll into view despite the activePath row also being active.
    await page.getByText('Claude Code, in motion').click();
    await page.keyboard.press('Control+KeyP');
    const palette = page.getByRole('dialog', { name: /go to file/i });
    await palette.getByPlaceholder(/search files by name/i).fill('package.json');
    await page.keyboard.press('Enter');
    await expect(pkgRow).toBeInViewport();
  });

  test('follow system theme applies the preferred dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.setItem(
        'vsclaude.settings',
        JSON.stringify({ followSystemTheme: true, preferredDarkTheme: 'high-contrast' }),
      );
    });
    await page.goto('/');
    // The OS is dark + following is on, so the chosen preferred dark theme should apply.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'high-contrast');
  });

  test('F6 skips regions with no focusable child (minimal mode)', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Claude Code, in motion').click();
    // In minimal mode the center (PixieStage) and the bottom (narration footer) have
    // no focusables, so F6 must skip them rather than stalling.
    await page.keyboard.press('Control+KeyK');
    const palette = page.getByRole('dialog', { name: /command palette/i });
    await palette.getByPlaceholder(/type a command/i).fill('Switch to minimal mode');
    await page.keyboard.press('Enter');
    await expect(palette).toBeHidden();
    const inRegion = (selector: string) =>
      page.evaluate((s) => !!document.activeElement?.closest(s), selector);
    await page.keyboard.press('F6');
    expect(await inRegion('.activity-bar')).toBe(true);
    await page.keyboard.press('F6');
    expect(await inRegion('.status-bar')).toBe(true);
  });
});
