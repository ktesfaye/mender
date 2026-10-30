import type { Ask } from '@shared/agents';

/** The keys an answer is given on: there is no pointer target to click. */
const ANSWERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** The id "that's everything" carries: not a real option, it sends every
 *  mark a multi-select question has picked up so far. */
export const SEND_ALL = '__send_all__';

/**
 * The options a gate shows, in key order.
 *
 * On a plain question this is just the agent's own options. On a multi-select
 * one — several things asking at once — it is those, each marked or not, plus
 * one line at the end that is not an answer at all: "that's everything",
 * which is what actually sends the marks.
 */
export function answersFor(ask: Ask): {
  optionId: string;
  requestId?: string;
  name: string;
  about?: string;
  preview?: string;
  kind?: 'other' | 'submit' | 'talk';
}[] {
  const answers = ask.options.map((option) => ({
    optionId: option.optionId,
    requestId: option.requestId,
    name: option.picked ? `✓ ${option.name}` : option.name,
    ...(option.about ? { about: option.about } : {}),
    ...(option.preview ? { preview: option.preview } : {}),
    ...(option.kind ? { kind: option.kind } : {}),
  }));
  if (ask.multi)
    answers.push({ optionId: SEND_ALL, requestId: undefined, name: "that's everything" });
  return answers;
}

/** Which option a keystroke picks, or nothing if it picks none. */
export function answerFor(
  ask: Ask,
  key: string
): { optionId: string; requestId?: string } | undefined {
  const at = ANSWERS.indexOf(key);
  return at === -1 ? undefined : answersFor(ask)[at];
}
