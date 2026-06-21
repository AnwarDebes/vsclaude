import type { Meta, StoryObj } from '@storybook/react-vite';
import { TokenPanel } from './TokenPanel';
import { tokens, tree } from '../stories/fixtures';

const meta: Meta<typeof TokenPanel> = {
  title: 'Panels/TokenPanel',
  component: TokenPanel,
  args: { tokens, tree },
  decorators: [(Story) => <div style={{ height: 240, maxWidth: 360 }}>{<Story />}</div>],
};
export default meta;

export const Default: StoryObj<typeof TokenPanel> = {};
