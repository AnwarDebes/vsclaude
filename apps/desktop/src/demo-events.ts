/**
 * A scripted AgentEvent timeline used by the first-run demo so a new user sees
 * Pixie come alive immediately, before connecting a real provider.
 *
 * This is demo data on purpose, clearly labeled. Once a provider is connected,
 * the very same component renders the real event stream with no changes, which
 * is the whole point of the AgentEvent design.
 */
import { createAgentEvent, type AgentEvent } from '@vsclaude/contracts';

const SESSION = 'demo-session';
const ROOT = 'root';
let seq = 0;
const base = 1_718_900_000_000;

function ev(
  type: AgentEvent['type'],
  payload?: Record<string, unknown>,
  extra?: Partial<AgentEvent>,
): AgentEvent {
  seq += 1;
  return createAgentEvent({
    id: `demo-${seq}`,
    sessionId: SESSION,
    agentId: ROOT,
    ts: base + seq * 1400,
    type,
    provider: 'claude-code',
    payload,
    ...extra,
  });
}

/** The scripted demo session: meet Pixie, plan, read, search, write, test, commit. */
export const demoEvents: AgentEvent[] = [
  ev('session_start', { cwd: '~/projects/aurora', model: 'claude-opus' }),
  ev('thinking', { text: 'The user wants a login form with validation. Let me plan.' }),
  ev('todo_update', {
    todos: [
      { id: 't1', text: 'Read the auth module', status: 'in_progress' },
      { id: 't2', text: 'Add the login form', status: 'pending' },
      { id: 't3', text: 'Write tests', status: 'pending' },
    ],
  }),
  ev('file_read', { path: 'src/auth/session.ts', language: 'typescript' }),
  ev('file_read', { path: 'src/auth/use-auth.ts', language: 'typescript' }),
  ev('search', { query: 'useAuth', kind: 'grep', matches: 7 }),
  ev('file_edit', {
    path: 'src/auth/login-form.tsx',
    language: 'typescript',
    additions: 48,
    deletions: 2,
    diff: '+ export function LoginForm() { /* ... */ }',
  }),
  ev('subagent_spawned', { childAgentId: 'worker-1', task: 'write tests for the login form' }),
  ev('command_run', { command: 'pnpm test login-form', cwd: '~/projects/aurora' }),
  ev('token_usage', { inputTokens: 18420, outputTokens: 2110, costUsd: 0.14, contextUsed: 20530, contextWindow: 200000 }),
  ev('git_action', { action: 'commit', message: 'feat(auth): add validated login form' }),
  ev('complete', { summary: 'Login form added with tests. All green.' }, { caption: 'Done! All tests pass.' }),
];
