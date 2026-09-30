import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { withBackgroundTasks } from './background-tasks';

const update = (update: object) =>
  JSON.stringify({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: 's', update } });

describe('withBackgroundTasks', () => {
  it('folds a background command lifecycle into its own step and drops the rest', async () => {
    const lines = [
      update({ sessionUpdate: 'tool_call_update', toolCallId: 'bash1', status: 'completed' }),
      update({ sessionUpdate: 'async_task_spawned', asyncTaskId: 't1', toolCallId: 'bash1' }),
      update({ sessionUpdate: 'async_task_progress', asyncTaskId: 't1' }),
      update({ sessionUpdate: 'tool_call_update', toolCallId: 'bash1', status: 'completed' }),
      update({ sessionUpdate: 'async_task_state_update', asyncTaskId: 't1', state: 'failed' }),
      update({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } }),
    ];
    let out = '';
    for await (const chunk of withBackgroundTasks(Readable.from([lines.join('\n') + '\n'])))
      out += chunk;
    const got = out
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line).params.update)
      .map((u) => [u.sessionUpdate, u.toolCallId, u.status, u._meta?.claudeCode?.menderBackground]);
    expect(got).toEqual([
      ['tool_call_update', 'bash1', 'completed', undefined],
      ['tool_call_update', 'bash1', 'in_progress', true],
      ['tool_call_update', 'bash1', 'in_progress', true],
      ['tool_call_update', 'bash1', 'failed', true],
      ['agent_message_chunk', undefined, undefined, undefined],
    ]);
  });
});
