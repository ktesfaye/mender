import type { Mood, WorkingState } from '@shared/agents';

/**
 * What was still going in a session, kept as it changes, so a village closed
 * in the middle of the work can put it back to work when it opens again.
 *
 * Closing the app stops every agent's CLI and everybody it had sent out with
 * it, and nothing in the agent's own record says the turn never finished. So
 * the village writes down what it can see going on, and the next sitting says
 * it back to the session in the one way that gets the work going again.
 */
export interface CutOff {
  mood: Mood;
  /** Helpers still out, by what they were sent to do. */
  helpers: { errand: string; background?: boolean }[];
  /** Commands it had left running in the background, as it ran them. */
  commands?: string[];
  /** What was said while it worked that it had not read yet. */
  unread: string[];
}

/** What of this session would be lost if the app closed right now, or null. */
export function goingIn(state: WorkingState): CutOff | null {
  const helpers = state.told.errands
    .filter((one) => one.running)
    .map((one) => ({ errand: one.errand, ...(one.background ? { background: true } : {}) }));
  const commands = state.told.deeds
    .filter((one) => one.background && one.running)
    .map((one) => one.did);
  /* A question for him at the foot of a finished answer is the asking mood
     too, but nothing is cut off by closing on it: the answer is on disk and
     the question keeps. Only a prompt mid-turn is lost. */
  const busy = state.mood === 'working' || (state.mood === 'asking' && Boolean(state.asking));
  if (!busy && !helpers.length && !commands.length) return null;
  return {
    mood: state.mood,
    helpers,
    ...(commands.length ? { commands } : {}),
    unread: state.queued.map((one) => one.text),
  };
}


/** And the part only the agent reads, saying exactly what was cut off. */
export function pickUpNote(cut: CutOff): string {
  const parts = [
    '[mender, for the agent only: the app was closed while you were in the middle of this, ' +
      'which stopped you, every helper you had sent out, and every command you had left ' +
      'running in the background. Pick up exactly where you left off: start again whatever ' +
      'had not finished, including those background commands, without redoing anything that ' +
      'is already done.',
  ];
  if (cut.mood === 'asking')
    parts.push('You were waiting on a permission question; ask it again if you still need to.');
  if (cut.helpers.length) {
    const named = cut.helpers
      .map((one) => `"${one.errand}"${one.background ? ' (in the background)' : ''}`)
      .join(', ');
    parts.push(
      `These helpers were still out and never came back, so send each one out again for the ` +
        `same job, the same way, unless what it was doing is already done: ${named}.`
    );
  }
  if (cut.commands?.length)
    parts.push(
      `These commands were still running in the background and were stopped, so run each ` +
        `again the same way unless it is no longer needed: ` +
        cut.commands.map((one) => `\`${one}\``).join(', ') +
        '.'
    );
  if (cut.unread.length)
    parts.push(
      `These were said to you while you worked and you had not read them yet: ` +
        cut.unread.map((text) => `"${text}"`).join(', ') +
        '.'
    );
  return `\n\n${parts.join(' ')}]`;
}
