import { Transform, type Readable } from 'node:stream';

/**
 * What a command left running in the background is doing, folded into the
 * command's own step.
 *
 * Claude's bridge reports a background command's life (started, still going,
 * finished, failed) as `async_task_*` session updates, a JetBrains extension
 * the ACP SDK's own validation rejects outright. So they are rewritten here,
 * off the wire, into ordinary `tool_call_update`s on the Bash call that
 * started the command, marked `menderBackground` so the transcript keeps the
 * step running past the end of its turn. The Bash call's own result, which
 * only says the command went into the background, is held at running while
 * the command is still going.
 */
export function withBackgroundTasks(stdout: Readable): Readable {
  const live = new Map<string, string>();
  const done = new Set<string>();
  let pending = '';
  const rewrite = (line: string): string | null => {
    if (!line.includes('"session/update"')) return line;
    let message: {
      method?: string;
      params?: { sessionId?: string; update?: Record<string, unknown> };
    };
    try {
      message = JSON.parse(line);
    } catch {
      return line;
    }
    const update = message.params?.update;
    if (message.method !== 'session/update' || !update) return line;
    const kind = String(update.sessionUpdate ?? '');
    const said = (next: Record<string, unknown>): string =>
      JSON.stringify({ ...message, params: { ...message.params, update: next } });
    const step = (toolCallId: string, status: string): string =>
      said({
        sessionUpdate: 'tool_call_update',
        toolCallId,
        status,
        _meta: { claudeCode: { menderBackground: true } },
      });

    if (kind === 'async_task_spawned' || kind === 'async_task_progress') {
      const id = String(update.asyncTaskId ?? '');
      const toolCallId = typeof update.toolCallId === 'string' ? update.toolCallId : live.get(id);
      if (!id || !toolCallId || done.has(id)) return null;
      const known = live.has(id);
      live.set(id, toolCallId);
      return known ? null : step(toolCallId, 'in_progress');
    }
    if (kind === 'async_task_state_update') {
      const id = String(update.asyncTaskId ?? '');
      const toolCallId = typeof update.toolCallId === 'string' ? update.toolCallId : live.get(id);
      const state = String(update.state ?? '');
      if (!id || !toolCallId) return null;
      if (state === 'running') {
        live.set(id, toolCallId);
        return step(toolCallId, 'in_progress');
      }
      live.delete(id);
      done.add(id);
      return step(toolCallId, state === 'failed' ? 'failed' : 'completed');
    }
    if (kind.startsWith('async_task_')) return null;
    if (
      kind === 'tool_call_update' &&
      (update.status === 'completed' || update.status === 'failed') &&
      [...live.values()].includes(String(update.toolCallId))
    ) {
      return said({
        ...update,
        status: 'in_progress',
        _meta: {
          ...(update._meta as object | undefined),
          claudeCode: {
            ...((update._meta as { claudeCode?: object } | undefined)?.claudeCode ?? {}),
            menderBackground: true,
          },
        },
      });
    }
    return line;
  };
  const through = new Transform({
    transform(chunk: Buffer, _encoding, next) {
      pending += chunk.toString('utf8');
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      const out = lines.map(rewrite).filter((line): line is string => line !== null);
      next(null, out.length ? `${out.join('\n')}\n` : undefined);
    },
    flush(next) {
      const last = pending ? rewrite(pending) : null;
      next(null, last ?? undefined);
    },
  });
  return stdout.pipe(through);
}
