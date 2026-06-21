import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwarmPanel } from './SwarmPanel';
import { actionByAgent, edges, roster, tokens } from '../stories/fixtures';

const meta: Meta<typeof SwarmPanel> = {
  title: 'Panels/SwarmPanel',
  component: SwarmPanel,
  args: { roster, edges, actionByAgent, tokens },
  decorators: [(Story) => <div style={{ height: 460, maxWidth: 560 }}>{<Story />}</div>],
};
export default meta;

export const Default: StoryObj<typeof SwarmPanel> = {};
