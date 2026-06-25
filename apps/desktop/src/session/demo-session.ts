/**
 * A rich, scripted multi-agent session: an orchestrator that delegates to two
 * worker agents. It exercises the whole pipeline (motion, agent tree, timeline,
 * swarm, tokens) so the IDE shell has something real to render before a provider
 * is connected. The exact same shapes flow from a live provider.
 */
import { createAgentEvent, type AgentEvent } from '@vsclaude/contracts';

const SESSION = 'demo-session';
const ORCH = 'orchestrator';
const W_AUTH = 'worker-auth';
const W_TEST = 'worker-tests';

let seq = 0;
const base = 1_718_900_000_000;

function ev(
  agentId: string,
  type: AgentEvent['type'],
  payload?: Record<string, unknown>,
  extra?: Partial<AgentEvent>,
): AgentEvent {
  seq += 1;
  return createAgentEvent({
    id: `e${seq}`,
    sessionId: SESSION,
    agentId,
    ts: base + seq * 1000,
    type,
    provider: 'claude-code',
    payload,
    ...extra,
  });
}

/** The orchestrator delegates building a validated login form to two workers. */
export const demoSession: AgentEvent[] = [
  ev(ORCH, 'session_start', { cwd: '~/projects/aurora', model: 'claude-opus' }),
  ev(ORCH, 'thinking', { text: 'The user wants a validated login form with tests. Let me plan.' }),
  ev(ORCH, 'todo_update', {
    todos: [
      { id: 't1', text: 'Read the auth module', status: 'in_progress' },
      { id: 't2', text: 'Build the login form', status: 'pending' },
      { id: 't3', text: 'Write tests', status: 'pending' },
    ],
  }),
  ev(ORCH, 'file_read', { path: 'src/auth/session.ts', language: 'typescript' }),
  ev(ORCH, 'search', { query: 'useAuth', kind: 'grep', matches: 7 }),

  ev(ORCH, 'subagent_spawned', { childAgentId: W_AUTH, task: 'build the login form' }),
  ev(W_AUTH, 'file_create', { path: 'src/auth/login-form.tsx', language: 'typescript' }, { parentAgentId: ORCH }),
  ev(
    W_AUTH,
    'file_edit',
    { path: 'src/auth/login-form.tsx', additions: 48, deletions: 2, diff: '+ validated form' },
    { parentAgentId: ORCH },
  ),
  ev(W_AUTH, 'token_usage', { inputTokens: 12400, outputTokens: 1820, costUsd: 0.09 }, { parentAgentId: ORCH }),

  ev(ORCH, 'subagent_spawned', { childAgentId: W_TEST, task: 'write the tests' }),
  ev(W_TEST, 'file_create', { path: 'src/auth/login-form.test.tsx', language: 'typescript' }, { parentAgentId: ORCH }),
  ev(W_TEST, 'command_run', { command: 'pnpm test login-form', cwd: '~/projects/aurora' }, { parentAgentId: ORCH }),
  ev(W_TEST, 'error', { message: 'expected the submit button to be enabled', recoverable: true }, { parentAgentId: ORCH }),
  ev(W_TEST, 'file_edit', { path: 'src/auth/login-form.test.tsx', additions: 6 }, { parentAgentId: ORCH }),
  ev(W_TEST, 'command_run', { command: 'pnpm test login-form', cwd: '~/projects/aurora' }, { parentAgentId: ORCH }),
  ev(W_TEST, 'token_usage', { inputTokens: 9800, outputTokens: 1240, costUsd: 0.06 }, { parentAgentId: ORCH }),

  ev(ORCH, 'subagent_finished', { childAgentId: W_AUTH, status: 'success', summary: 'Login form built' }),
  ev(ORCH, 'subagent_finished', { childAgentId: W_TEST, status: 'success', summary: 'Tests green' }),
  ev(ORCH, 'token_usage', { inputTokens: 20100, outputTokens: 2300, costUsd: 0.15 }),
  ev(ORCH, 'git_action', { action: 'commit', message: 'feat(auth): add validated login form' }),
  ev(ORCH, 'command_run', { command: 'pnpm build' }),
  ev(ORCH, 'complete', { summary: 'Login form added with tests. All green.' }, { caption: 'Done! All tests pass.' }),
];

/** A small demo file tree for the explorer panel. */
export const demoFiles = [
  { name: 'login-form.tsx', path: 'src/auth/login-form.tsx', kind: 'file' as const },
  { name: 'login-form.test.tsx', path: 'src/auth/login-form.test.tsx', kind: 'file' as const },
  { name: 'session.ts', path: 'src/auth/session.ts', kind: 'file' as const },
  { name: 'session.config.ts', path: 'src/auth/session.config.ts', kind: 'file' as const },
  { name: 'use-auth.ts', path: 'src/auth/use-auth.ts', kind: 'file' as const },
  { name: 'auth', path: 'src/auth', kind: 'directory' as const },
  { name: 'App.tsx', path: 'src/App.tsx', kind: 'file' as const },
  { name: 'main.tsx', path: 'src/main.tsx', kind: 'file' as const },
  { name: 'README.md', path: 'README.md', kind: 'file' as const },
  { name: 'logo.svg', path: 'logo.svg', kind: 'file' as const },
  { name: 'pixie.png', path: 'assets/pixie.png', kind: 'file' as const },
  { name: 'chime.wav', path: 'assets/chime.wav', kind: 'file' as const },
  { name: 'assets', path: 'assets', kind: 'directory' as const },
  { name: 'package.json', path: 'package.json', kind: 'file' as const },
  // A noise directory, hidden by the default files.exclude (see lib/excludes.ts).
  { name: 'index.js', path: 'node_modules/react/index.js', kind: 'file' as const },
];
