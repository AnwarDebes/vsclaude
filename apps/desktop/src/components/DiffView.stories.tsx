import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView } from './DiffView';

const original = `export function greet(name) {
  return 'Hello ' + name;
}
`;
const modified = `export function greet(name: string): string {
  return \`Hello \${name}!\`;
}
`;

const meta: Meta<typeof DiffView> = {
  title: 'Components/DiffView',
  component: DiffView,
  args: { original, modified, language: 'typescript' },
  decorators: [(Story) => <div style={{ height: 320 }}>{<Story />}</div>],
};
export default meta;

export const SideBySide: StoryObj<typeof DiffView> = { args: { sideBySide: true } };
export const Inline: StoryObj<typeof DiffView> = { args: { sideBySide: false } };
