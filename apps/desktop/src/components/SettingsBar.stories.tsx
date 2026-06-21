import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import { SettingsBar } from './SettingsBar';

const meta: Meta<typeof SettingsBar> = {
  title: 'Components/SettingsBar',
  component: SettingsBar,
  args: {
    settings: DEFAULT_SETTINGS,
    onSettings: () => undefined,
    playing: true,
    setPlaying: () => undefined,
    restart: () => undefined,
    index: 4,
    total: 22,
  },
};
export default meta;

export const Default: StoryObj<typeof SettingsBar> = {};
export const Paused: StoryObj<typeof SettingsBar> = { args: { playing: false } };
