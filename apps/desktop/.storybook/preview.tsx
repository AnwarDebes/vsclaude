import { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';
import { DEFAULT_SETTINGS } from '@vsclaude/contracts';
import { applyTheme } from '../src/lib/theme';
import { PixieActionSprite } from '../src/components/ActionIcon';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'cozy',
      values: [
        { name: 'cozy', value: '#161210' },
        { name: 'light', value: '#f7f3ef' },
      ],
    },
    controls: { expanded: true },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        applyTheme(DEFAULT_SETTINGS);
      }, []);
      return (
        <div style={{ padding: 24, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
          <PixieActionSprite />
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
