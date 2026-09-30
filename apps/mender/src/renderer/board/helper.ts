import type { Hand } from '../yard/what';
import type { Row } from './row';

/**
 * Somebody a session sent out, walked up to.
 *
 * What they were sent for, whether they are still out, and everything they
 * have done out there, newest last and read the same way a session's own
 * steps are. While they are out, the one thing you can do about them is call
 * them back, which stops them alone: the session that sent them, and anybody
 * else it sent, carry on.
 */
export interface Walked {
  hand: Hand;
  /** Where calling them back has got to, if it has been pressed. */
  recall?: 'armed' | 'going' | 'refused' | 'done';
  /** Why calling them back did not work, when it did not. */
  because?: string;
}

export function helper(walked: Walked): Row[] {
  const { hand } = walked;
  const rows: Row[] = [{ kind: 'prose', text: hand.said }, { kind: 'gap' }];
  rows.push({ kind: 'line', text: standing(hand), tone: hand.wrong ? 'sore' : 'faded' });

  /* Once pressed, what happened stays said, even after they are home. */
  if ((hand.where === 'out' && hand.call) || walked.recall)
    rows.push({ kind: 'gap' }, recalling(walked));

  rows.push({ kind: 'gap' });
  if (!hand.steps.length) {
    rows.push({
      kind: 'line',
      text:
        hand.where === 'out'
          ? 'nothing to show from out there yet.'
          : 'nothing came back from out there.',
      tone: 'faded',
    });
    return rows;
  }
  rows.push({ kind: 'heading', text: 'what they did' });
  for (const step of hand.steps) {
    rows.push({
      kind: 'entry',
      mark: step.running ? '›' : step.tone === 'broken' ? '✗' : '·',
      text: step.note ? `${step.did}  ${step.note}` : step.did,
      tone: step.running ? 'ink' : step.tone === 'broken' ? 'sore' : 'faded',
      keep: 'front',
    });
  }
  return rows;
}

function standing(hand: Hand): string {
  if (hand.where === 'out') {
    const away = hand.background ? 'out on their own' : 'still out';
    return hand.gone ? `${away}, went ${hand.gone}` : away;
  }
  return hand.wrong ? 'came back hurt, or was called back.' : 'back, with an answer.';
}

function recalling(walked: Walked): Row {
  switch (walked.recall) {
    case 'armed':
      return {
        kind: 'entry',
        mark: '✗',
        text: 'press again — they stop where they are, and what they found goes with them',
        tone: 'sore',
        pick: 'recall!',
      };
    case 'going':
      return { kind: 'entry', mark: '✗', text: 'calling them back…', tone: 'faded' };
    case 'done':
      return { kind: 'entry', mark: '✗', text: 'called back.', tone: 'faded' };
    case 'refused':
      return {
        kind: 'entry',
        mark: '✗',
        text: `could not call them back${walked.because ? `: ${walked.because}` : '.'}`,
        tone: 'sore',
        pick: 'recall',
      };
    default:
      return { kind: 'entry', mark: '✗', text: 'call them back', tone: 'faded', pick: 'recall' };
  }
}
