import type { Meta, StoryObj } from '@storybook/react-vite';
import { ACTION_CATEGORIES, AGENT_ACTIONS, actionsInCategory } from '@vsclaude/contracts';
import { ActionIcon } from './ActionIcon';

const meta: Meta<typeof ActionIcon> = {
  title: 'Pixie/ActionIcon',
  component: ActionIcon,
  args: { id: 'commit', size: 96 },
};
export default meta;

type Story = StoryObj<typeof ActionIcon>;

/** A single action: Pixie performing it. */
export const Single: Story = {};

/** Every one of the 200 agent actions, each a distinct Pixie state and mood. */
export const EveryAction: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 16 }}>
      {AGENT_ACTIONS.map((a) => (
        <figure key={a.id} style={{ margin: 0, textAlign: 'center' }}>
          <ActionIcon id={a.id} size={64} label={a.caption} />
          <figcaption
            style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {a.label}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
};

/** Actions grouped by their category. */
export const ByCategory: Story = {
  render: () => (
    <div>
      {ACTION_CATEGORIES.map((category) => (
        <section key={category} style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{category}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {actionsInCategory(category).map((a) => (
              <ActionIcon key={a.id} id={a.id} size={52} label={a.label} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
