import { describe, expect, it } from 'vitest';
import { keptFailure } from './kept-failure';

const limit = {
  id: 'x',
  category: 'limit',
  severity: 'error',
  title: "You've hit your session limit",
  actions: [],
} as never;
const base = {
  activeTurnId: null,
  pendingPermissions: [],
  lastStopReason: null,
  lastTurnErrored: false,
  queuedPrompts: [],
  agentTurnActive: false,
  backgroundAgentCount: 0,
  isGenerating: false,
  canSubmit: true,
  canCancel: false,
};

describe('keptFailure', () => {
  it('holds a limit through the runtime suspending the session, and lets it go once awake', () => {
    const asleep = keptFailure(limit, { ...base, lifecycle: 'closed', suspended: true } as never);
    expect(asleep).toBe(limit);
    expect(keptFailure(asleep, { ...base, lifecycle: 'ready' } as never)).toBeNull();
  });
});
