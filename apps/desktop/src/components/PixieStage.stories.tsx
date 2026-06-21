import type { Meta, StoryObj } from '@storybook/react-vite';
import { PixieStage } from './PixieStage';

const meta: Meta<typeof PixieStage> = {
  title: 'Pixie/PixieStage',
  component: PixieStage,
  args: { actionId: 'read', stateLabel: 'reading', caption: 'Reading the auth module.' },
};
export default meta;

type Story = StoryObj<typeof PixieStage>;

export const Reading: Story = {};
export const Writing: Story = {
  args: { actionId: 'type', stateLabel: 'writing code', caption: 'Writing the login form.' },
};
export const Searching: Story = {
  args: { actionId: 'search', stateLabel: 'searching', caption: 'Searching the codebase.' },
};
export const Building: Story = {
  args: { actionId: 'build', stateLabel: 'building', caption: 'Building the project.' },
};
export const Testing: Story = {
  args: { actionId: 'test', stateLabel: 'running', caption: 'Running the tests.' },
};
export const Committing: Story = {
  args: { actionId: 'commit', stateLabel: 'using git', caption: 'Committing the change.' },
};
export const Delegating: Story = {
  args: { actionId: 'spawn', stateLabel: 'delegating', caption: 'Delegating to a worker.' },
};
export const Companion: Story = {
  args: { actionId: 'plan', stateLabel: 'planning', caption: 'Planning the work.', size: 92 },
};
