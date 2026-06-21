import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimelinePanel } from './TimelinePanel';
import { timeline } from '../stories/fixtures';

const meta: Meta<typeof TimelinePanel> = {
  title: 'Panels/TimelinePanel',
  component: TimelinePanel,
  args: { timeline },
  decorators: [(Story) => <div style={{ height: 480, maxWidth: 380 }}>{<Story />}</div>],
};
export default meta;

export const Default: StoryObj<typeof TimelinePanel> = {};
