import { describe, expect, it } from 'vitest';
import { isAgentEvent, isAgentEventType } from '@vsclaude/contracts';
import {
  branchLabel,
  captionForAction,
  gitActionEvent,
  isGitAction,
  parsePorcelainStatus,
  scmChangeCount,
  scmGroups,
  summarizeStatus,
} from '../index.js';

/**
 * A representative `git status --porcelain=v1 -b` sample. It carries a branch
 * header with upstream and ahead tracking, three staged files, one modified
 * (unstaged) file, a combined staged plus unstaged file, and two untracked
 * files.
 */
const SAMPLE = [
  '## main...origin/main [ahead 2]',
  'A  src/new-feature.ts',
  'A  src/another.ts',
  'M  src/staged-edit.ts',
  ' M src/working-edit.ts',
  'MM src/both.ts',
  '?? notes.md',
  '?? scratch/tmp.txt',
].join('\n');

describe('parsePorcelainStatus', () => {
  it('parses the branch header with upstream and ahead count', () => {
    const model = parsePorcelainStatus(SAMPLE);
    expect(model.branch.branch).toBe('main');
    expect(model.branch.upstream).toBe('origin/main');
    expect(model.branch.ahead).toBe(2);
    expect(model.branch.behind).toBe(0);
    expect(model.branch.detached).toBe(false);
  });

  it('partitions staged, unstaged, and untracked files', () => {
    const model = parsePorcelainStatus(SAMPLE);
    // A , A , M , and the X column of MM => four staged entries.
    expect(model.staged.map((c) => c.path)).toEqual([
      'src/new-feature.ts',
      'src/another.ts',
      'src/staged-edit.ts',
      'src/both.ts',
    ]);
    // " M" and the Y column of "MM" => two unstaged entries.
    expect(model.unstaged.map((c) => c.path)).toEqual([
      'src/working-edit.ts',
      'src/both.ts',
    ]);
    expect(model.untracked.map((c) => c.path)).toEqual([
      'notes.md',
      'scratch/tmp.txt',
    ]);
    expect(model.clean).toBe(false);
  });

  it('treats a clean tree on a fresh branch as clean', () => {
    const model = parsePorcelainStatus('## No commits yet on main\n');
    expect(model.clean).toBe(true);
    expect(model.branch.branch).toBe('main');
    expect(model.staged).toHaveLength(0);
    expect(model.untracked).toHaveLength(0);
  });

  it('parses renames with an original path', () => {
    const model = parsePorcelainStatus('## main\nR  old.ts -> new.ts\n');
    expect(model.staged).toHaveLength(1);
    expect(model.staged[0]?.path).toBe('new.ts');
    expect(model.staged[0]?.origPath).toBe('old.ts');
  });

  it('parses ahead and behind together and detached HEAD', () => {
    const both = parsePorcelainStatus('## main...origin/main [ahead 1, behind 3]\n');
    expect(both.branch.ahead).toBe(1);
    expect(both.branch.behind).toBe(3);

    const detached = parsePorcelainStatus('## HEAD (no branch)\n');
    expect(detached.branch.detached).toBe(true);
    expect(detached.branch.branch).toBeUndefined();
  });
});

describe('summarizeStatus and branchLabel', () => {
  it('summarizes a mixed status into a compact string', () => {
    const model = parsePorcelainStatus(SAMPLE);
    expect(summarizeStatus(model)).toBe('4 staged, 2 modified, 2 untracked');
  });

  it('reports a clean tree and singular wording', () => {
    expect(summarizeStatus(parsePorcelainStatus('## main\n'))).toBe('clean');
    const oneEach = parsePorcelainStatus('## main\nM  a.ts\n?? b.ts\n');
    expect(summarizeStatus(oneEach)).toBe('1 staged, 1 untracked');
  });

  it('renders branch labels with ahead and behind markers', () => {
    const model = parsePorcelainStatus(SAMPLE);
    expect(branchLabel(model)).toBe('main ↑2');
    const behind = parsePorcelainStatus('## main...origin/main [ahead 1, behind 3]\n');
    expect(branchLabel(behind)).toBe('main ↑1 ↓3');
    expect(branchLabel(parsePorcelainStatus('## HEAD (no branch)\n'))).toBe('(detached)');
  });
});

describe('scmGroups', () => {
  it('splits a status into staged and changes (working plus untracked)', () => {
    const groups = scmGroups(parsePorcelainStatus(SAMPLE));
    expect(groups.staged.map((c) => c.path)).toEqual([
      'src/new-feature.ts',
      'src/another.ts',
      'src/staged-edit.ts',
      'src/both.ts',
    ]);
    expect(groups.changes.map((c) => c.path)).toEqual([
      'src/working-edit.ts',
      'src/both.ts',
      'notes.md',
      'scratch/tmp.txt',
    ]);
  });

  it('counts all change entries', () => {
    expect(scmChangeCount(parsePorcelainStatus(SAMPLE))).toBe(8);
    expect(scmChangeCount(parsePorcelainStatus('## main\n'))).toBe(0);
  });
});

describe('gitActionEvent', () => {
  it('builds a commit event with the expected caption and payload', () => {
    const event = gitActionEvent('commit', {
      provider: 'claude-code',
      message: 'feat: add parser',
      branch: 'main',
    });
    expect(isAgentEvent(event)).toBe(true);
    expect(event.type).toBe('git_action');
    expect(isAgentEventType('git_action')).toBe(true);
    expect(event.payload?.action).toBe('commit');
    expect(event.caption).toBe('Saving your work to git.');
    expect(event.payload?.message).toBe('feat: add parser');
    expect(event.payload?.ref).toBe('main');
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
  });

  it('threads a session id and supports a caption override', () => {
    const event = gitActionEvent('push', {
      provider: 'claude-code',
      remote: 'origin',
      sessionId: 'sess-123',
      caption: 'Shipping it.',
    });
    expect(event.sessionId).toBe('sess-123');
    expect(event.caption).toBe('Shipping it.');
    expect(event.payload?.remote).toBe('origin');
  });

  it('exposes captions for every known action', () => {
    expect(isGitAction('commit')).toBe(true);
    expect(isGitAction('nonsense')).toBe(false);
    expect(captionForAction('add')).toBe('Staging your changes.');
    expect(captionForAction('pull')).toBe('Pulling the latest changes.');
  });
});
