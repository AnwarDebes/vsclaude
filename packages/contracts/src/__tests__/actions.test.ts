import { describe, it, expect } from 'vitest';
import {
  AGENT_ACTIONS,
  AGENT_ACTION_IDS,
  AGENT_ACTION_BY_ID,
  ACTION_CATEGORIES,
  actionsInCategory,
  isActionId,
} from '../actions.js';
import { AGENT_EVENT_TYPES } from '../agent-event.js';
import { PIXIE_STATES } from '../motion.js';

describe('agent action catalog', () => {
  it('contains exactly 200 actions', () => {
    expect(AGENT_ACTIONS).toHaveLength(200);
    expect(AGENT_ACTION_IDS).toHaveLength(200);
  });

  it('has 20 categories of 10 actions each', () => {
    expect(ACTION_CATEGORIES).toHaveLength(20);
    for (const category of ACTION_CATEGORIES) {
      expect(actionsInCategory(category)).toHaveLength(10);
    }
  });

  it('every id is unique', () => {
    expect(new Set(AGENT_ACTION_IDS).size).toBe(200);
  });

  it('every action maps to a real event type and Pixie state', () => {
    for (const action of AGENT_ACTIONS) {
      expect(AGENT_EVENT_TYPES).toContain(action.event);
      expect(PIXIE_STATES).toContain(action.state);
      expect(action.caption.length).toBeGreaterThan(0);
    }
  });

  it('looks actions up by id and validates ids', () => {
    expect(AGENT_ACTION_BY_ID.commit?.state).toBe('git');
    expect(AGENT_ACTION_BY_ID.read?.event).toBe('file_read');
    expect(AGENT_ACTION_BY_ID.deploy?.category).toBe('operate');
    expect(isActionId('rebase')).toBe(true);
    expect(isActionId('not-a-real-action')).toBe(false);
  });

  it('includes the headline behaviors', () => {
    for (const id of ['greet', 'think', 'type', 'search', 'commit', 'spawn', 'done', 'stuck']) {
      expect(isActionId(id)).toBe(true);
    }
  });
});
