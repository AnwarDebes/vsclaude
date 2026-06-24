/**
 * Sample file contents for the editor in the browser demo. In the native app the
 * editor reads and writes the real files through the Rust core (fs.readFile /
 * fs.writeFile); this map is only the offline starting point.
 */
export const demoFileContents: Record<string, string> = {
  'src/auth/login-form.tsx': `import { useState } from 'react';
import { useAuth } from './use-auth';

export function LoginForm() {
  const { signIn, pending } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = email.includes('@') && password.length >= 8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void signIn(email, password);
      }}
    >
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={!valid || pending}>
        Sign in
      </button>
    </form>
  );
}
`,
  'src/auth/login-form.test.tsx': `import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './login-form';

it('enables submit only when the form is valid', () => {
  render(<LoginForm />);
  const button = screen.getByRole('button', { name: /sign in/i });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.com' } });
  // ...
});
`,
  'src/auth/session.ts': `export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

export function isExpired(session: Session, now = Date.now()): boolean {
  return session.expiresAt <= now;
}
`,
  'src/auth/use-auth.ts': `import { useState } from 'react';

export function useAuth() {
  const [pending, setPending] = useState(false);
  async function signIn(email: string, password: string) {
    setPending(true);
    try {
      // call the provider
    } finally {
      setPending(false);
    }
  }
  return { signIn, pending };
}
`,
  'src/App.tsx': `export function App() {
  return <main>vsclaude</main>;
}
`,
  'src/main.tsx': `import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
`,
  'README.md': `# Aurora

A small demo project shown in the **vsclaude** editor.

## Getting started

- Run \`npm install\`
- Run \`npm run dev\`
- Open the [docs](https://example.com)

Press the Markdown preview command to render this file.`,
  'package.json': `{
  "name": "aurora",
  "version": "0.1.0",
  "private": true
}
`,
};

/** Read the demo content for a path, with a friendly fallback. */
export function demoContentFor(path?: string): string {
  if (!path) return '';
  return demoFileContents[path] ?? `// ${path}\n// (no preview available in the browser demo)\n`;
}
