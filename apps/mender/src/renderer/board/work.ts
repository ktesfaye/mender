import type { Ask } from '@shared/agents';

/** The keys an answer is given on: there is no pointer target to click. */
const ANSWERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Which option a keystroke picks, or nothing if it picks none. */
export function answerFor(ask: Ask, key: string): string | undefined {
  const at = ANSWERS.indexOf(key);
  return at === -1 ? undefined : ask.options[at]?.optionId;
}
