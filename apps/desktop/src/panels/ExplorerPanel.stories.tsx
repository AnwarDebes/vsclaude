import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplorerPanel } from './ExplorerPanel';
import { demoFiles } from '../session/demo-session';

const meta: Meta<typeof ExplorerPanel> = {
  title: 'Panels/ExplorerPanel',
  component: ExplorerPanel,
  args: { files: demoFiles, openPath: 'src/auth/login-form.tsx' },
  decorators: [(Story) => <div style={{ height: 360, maxWidth: 260 }}>{<Story />}</div>],
};
export default meta;

export const Default: StoryObj<typeof ExplorerPanel> = {};
