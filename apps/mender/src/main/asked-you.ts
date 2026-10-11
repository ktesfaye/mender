import type { Told } from '@shared/agents';

/**
 * Whether a finished answer ends by asking him something.
 *
 * The lantern only knew two ways of wanting him: a permission prompt and
 * Claude's own pick-a-choice question, both of which arrive as a form. An
 * answer that simply ends "that ok to build?" arrived as finished, and
 * finished, standing in it, reads as idle. So he closed the tab on a session
 * waiting for his word. This is the rule that catches it: not the whole
 * answer, only how it ends, since a question in the middle was answered on
 * the way down and one at the foot is the one left for him.
 */

/** A last line that asks for his word without a question mark. */
const ASKS =
  /\b(let me know|tell me|say (?:so|the word|which|if|yes)|your call|up to you|over to you|shall i|want me to|should i|which (?:one )?(?:do|would) you)\b/i;

/** Whether what it said ends by asking him something. */
export function asksYou(said: string): boolean {
  const lines = said.split('\n');
  let last = '';
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!.trim();
    if (line) {
      last = line;
      break;
    }
  }
  /* Emphasis, a trailing bracket or quote, and the list marker a question
     sometimes sits on are not part of what was asked. */
  const bare = last
    .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/[*_`~]+/g, '')
    .replace(/[)\]"'”’]+$/g, '')
    .trim();
  if (bare.endsWith('?')) return true;
  /* Only the last sentence is the one left for him: a "say so" earlier in
     the paragraph was followed by it carrying on, and one that hangs off an
     "if" is an invitation to object to what it already did, not a question. */
  const sentence = bare.split(/(?<=[.!?])\s+/).at(-1) ?? '';
  if (/^(?:if|unless)\b/i.test(sentence)) return false;
  return ASKS.test(sentence);
}

/**
 * Whether the newest thing it said, with the turn over, is a question for him.
 *
 * Not while it is still talking, not over a turn that was called off or
 * broke, and not once he has said something newer: then the question has
 * either been answered or passed over, and either way it is not what the
 * session is waiting on.
 */
export function wantsAnswer(told: Told): boolean {
  if (told.ended && told.ended !== 'done') return false;
  const last = told.thoughts.filter((one) => !one.quiet && !one.pack).at(-1);
  if (!last || last.trouble || last.since) return false;
  const newest = told.notes[0];
  if (newest && last.turn !== undefined && newest.turn !== undefined && newest.turn > last.turn)
    return false;
  if (newest && !newest.answered) return false;
  return asksYou(last.said);
}
