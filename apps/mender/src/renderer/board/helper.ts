import type { Hand, Step } from '../yard/what';
import type { Row } from './row';
import { saying } from './writing';

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
  /** Whether sending them away has been pressed once and waits for the second. */
  away?: 'armed' | 'going';
  /** Why calling them back did not work, when it did not. */
  because?: string;
  /** Claude's own record of them: every step, and what they came back with. */
  trail?: { prompt?: string; steps: Step[]; answer?: string; agentId?: string } | null;
  /** What you have said to them from here, through the session. */
  told?: string[];
  /** The last thing the session said before that, so what comes after is the reply. */
  since?: string;
  /** What came back, as the session said it, and whether it is still coming. */
  reply?: { said: string; going: boolean };
  /** For a command, the last of what it has printed: undefined until read, null when there is none. */
  printed?: string | null;
}

export function helper(walked: Walked): Row[] {
  const { hand } = walked;
  if (hand.command !== undefined) return command(walked, hand.command);
  const rows: Row[] = [{ kind: 'prose', text: hand.said }, { kind: 'gap' }];
  rows.push({
    kind: 'line',
    text: hand.tokens ? `${standing(hand).replace(/\.$/, '')} · ${hand.tokens}` : standing(hand),
    tone: hand.wrong ? 'sore' : 'faded',
  });
  rows.push({ kind: 'gap' });
  rows.push({
    kind: 'line',
    text: 'what you write on the line now goes to them, passed on by the session.',
    tone: 'faded',
  });
  for (const said of walked.told ?? []) {
    rows.push({ kind: 'entry', mark: '→', text: `you told them: ${said}`, tone: 'ink' });
  }
  if (walked.told?.length) {
    rows.push({ kind: 'gap' }, { kind: 'heading', text: 'what came back' });
    if (walked.reply?.said) rows.push(...saying(walked.reply.said, undefined, 'ink'));
    if (!walked.reply?.said || walked.reply.going)
      rows.push({ kind: 'line', text: 'the session is passing it on…', tone: 'faded' });
  }

  /* Once pressed, what happened stays said, even after they are home. */
  if ((hand.where === 'out' && hand.call) || walked.recall)
    rows.push({ kind: 'gap' }, recalling(walked));
  if (hand.call) rows.push(sendingAway(walked));

  /* While they are out the live steps are the ones to follow; once they are
     back, or after a restart has lost them, Claude's own record says it. */
  const steps =
    hand.steps.length && (hand.where === 'out' || !walked.trail?.steps.length)
      ? hand.steps
      : (walked.trail?.steps ?? []);

  const answer = hand.where === 'out' ? undefined : walked.trail?.answer;
  if (answer) {
    rows.push({ kind: 'gap' }, { kind: 'heading', text: 'what they came back with' });
    rows.push(...saying(answer, undefined, 'ink'));
  }

  rows.push({ kind: 'gap' });
  if (!steps.length) {
    rows.push({
      kind: 'line',
      text:
        hand.where === 'out'
          ? 'nothing to show from out there yet.'
          : walked.trail === undefined
            ? 'reading what they did…'
            : walked.trail?.answer
              ? 'they answered straight off, without needing to do anything.'
              : 'nothing they did out there was kept.',
      tone: 'faded',
    });
    return rows;
  }
  rows.push({ kind: 'heading', text: 'what they did' });
  for (const step of steps) {
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

/**
 * A command left running in the background, walked up to: what it was for,
 * the command itself, whether it is still going, and the last of what it has
 * printed, which keeps coming while the board is open. Stopping it stops the
 * command alone; the session carries on, and hears it was stopped.
 */
function command(walked: Walked, line: string): Row[] {
  const { hand } = walked;
  const going = hand.where === 'out';
  const rows: Row[] = [{ kind: 'prose', text: hand.said }, { kind: 'gap' }];
  rows.push({
    kind: 'line',
    text: going
      ? hand.gone
        ? `still going in the background, started ${hand.gone}`
        : 'still going in the background'
      : walked.recall === 'done'
        ? 'you stopped it.'
        : hand.wrong
          ? 'it failed, or was stopped.'
          : 'it finished.',
    tone: hand.wrong ? 'sore' : 'faded',
  });
  rows.push({ kind: 'gap' }, ...saying(`\`\`\`sh\n${line}\n\`\`\``, undefined));
  if (going || walked.recall) rows.push({ kind: 'gap' }, stopping(walked));
  if (hand.call) rows.push(sendingAway(walked));
  rows.push(
    { kind: 'gap' },
    { kind: 'heading', text: going ? 'what it is printing' : 'what it printed' }
  );
  if (walked.printed === undefined) rows.push({ kind: 'line', text: 'reading it…', tone: 'faded' });
  else if (!walked.printed) rows.push({ kind: 'line', text: 'nothing yet.', tone: 'faded' });
  else rows.push(...saying(`\`\`\`\n${walked.printed}\n\`\`\``, undefined));
  return rows;
}

function stopping(walked: Walked): Row {
  switch (walked.recall) {
    case 'armed':
      return {
        kind: 'entry',
        mark: '✗',
        text: 'press again — the command stops where it is',
        tone: 'sore',
        pick: 'recall!',
        armed: true,
      };
    case 'going':
      return { kind: 'entry', mark: '✗', text: 'stopping it…', tone: 'faded' };
    case 'done':
      return { kind: 'entry', mark: '✗', text: 'stopped.', tone: 'faded' };
    case 'refused':
      return {
        kind: 'entry',
        mark: '✗',
        text: `could not stop it${walked.because ? `: ${walked.because}` : '.'}`,
        tone: 'sore',
        pick: 'recall',
      };
    default:
      return { kind: 'entry', mark: '✗', text: 'stop it', tone: 'faded', pick: 'recall' };
  }
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
        armed: true,
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

/**
 * Taking them off the yard for good. Two presses, like anything that cannot be
 * taken back, and the first says what it costs: a helper still out stops where
 * they stand, and whichever way, they are not drawn again.
 */
function sendingAway(walked: Walked): Row {
  if (walked.away === 'going')
    return { kind: 'entry', mark: '✗', text: 'sending them away…', tone: 'faded' };
  if (walked.away === 'armed')
    return {
      kind: 'entry',
      mark: '✗',
      text:
        walked.hand.command !== undefined
          ? walked.hand.where === 'out'
            ? 'press again — it stops and leaves the yard for good'
            : 'press again — it leaves the yard for good'
          : walked.hand.where === 'out'
            ? 'press again — they stop where they are and leave the yard for good'
            : 'press again — they leave the yard for good',
      tone: 'sore',
      pick: 'away!',
      armed: true,
    };
  return {
    kind: 'entry',
    mark: '✗',
    text: walked.hand.command !== undefined ? 'take it off the yard' : 'send them away',
    tone: 'faded',
    pick: 'away',
  };
}
