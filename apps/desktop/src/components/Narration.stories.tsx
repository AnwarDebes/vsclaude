import type { Meta, StoryObj } from '@storybook/react-vite';
import { Narration } from './Narration';
import { narration } from '../stories/fixtures';

const meta: Meta<typeof Narration> = {
  title: 'Components/Narration',
  component: Narration,
  args: { narration },
  decorators: [(Story) => <div style={{ maxWidth: 360 }}>{<Story />}</div>],
};
export default meta;

export const Default: StoryObj<typeof Narration> = {};
export const Empty: StoryObj<typeof Narration> = { args: { narration: [] } };
