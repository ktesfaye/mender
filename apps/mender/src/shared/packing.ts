/**
 * Claude packing its conversation down to make room, pulled out of what it said.
 *
 * Claude's adapter says so in the answer itself: "Compacting..." when it
 * starts, once per status it hears, so an automatic one says it twice, then
 * "Compacting completed." or "Compacting failed: why". Left in, that reads as
 * the agent stammering. Pulled out, it is an event the board can draw.
 */

const START = 'Compacting...';
const END = /^\s*Compacting (completed\.|failed(?::[ \t]*([^\n]*)|\.))/;

export type Piece =
  | { kind: 'said'; text: string }
  | { kind: 'pack'; state: 'packing' | 'packed' | 'failed'; why?: string };

/** What was said, in order, with every packing lifted out of it as its own piece. */
export function piecesOf(text: string): Piece[] {
  const pieces: Piece[] = [];
  let rest = text;
  for (;;) {
    const at = rest.indexOf(START);
    if (at < 0) break;
    const before = rest.slice(0, at).trim();
    if (before) pieces.push({ kind: 'said', text: before });
    rest = rest.slice(at);
    while (rest.startsWith(START)) rest = rest.slice(START.length);
    const end = END.exec(rest);
    if (!end) {
      pieces.push({ kind: 'pack', state: 'packing' });
      continue;
    }
    rest = rest.slice(end[0].length);
    while (END.test(rest)) rest = rest.slice(END.exec(rest)![0].length);
    const why = end[2]?.trim();
    pieces.push(
      end[1].startsWith('completed')
        ? { kind: 'pack', state: 'packed' }
        : { kind: 'pack', state: 'failed', ...(why ? { why } : {}) }
    );
  }
  const tail = rest.trim();
  if (tail || pieces.length === 0) pieces.push({ kind: 'said', text: pieces.length ? tail : text });
  return pieces;
}

/** Claude's own summary of a conversation it packed down, handed back in as the next thing said. */
export function carried(text: string): boolean {
  return text
    .trimStart()
    .startsWith('This session is being continued from a previous conversation that ran out of context.');
}

/**
 * How long a packing usually takes when nothing better is known: the middle of
 * the ones Claude Code recorded on this machine, which run from under one
 * minute to about three, and barely depend on how full it was.
 */
export const USUAL_PACK = 125_000;

/**
 * How long this one is likely to take: the usual, shortened for a small
 * conversation, which is over in seconds, and a little longer for a huge one.
 * The ones on record grow with size, loosely, up to about four hundred
 * thousand tokens and hardly at all after that.
 */
export function packExpect(usual: number, from: number | undefined): number {
  if (!from) return usual;
  return Math.round(usual * Math.min(1.3, Math.max(0.2, from / 400_000)));
}

/**
 * How far along a packing probably is, from nought to just under one.
 *
 * Claude says nothing while it packs, so this is its clock against how long
 * one usually takes: brisk at first, most of the way by the usual time, and
 * creeping after that rather than sitting at a hundred while it still works.
 */
export function packedBy(elapsed: number, expect: number): number {
  const done = 1 - Math.exp((-1.9 * Math.max(0, elapsed)) / Math.max(1, expect));
  return Math.min(0.99, done);
}
