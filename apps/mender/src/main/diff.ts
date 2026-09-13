/**
 * What changed between two versions of a file, line by line.
 *
 * Git has a diff of its own and we do not use it: what reaches the board has
 * to be lines with a mark on them, not a patch to parse back apart, and the
 * shortest way to lines is to work them out here. This is Myers' algorithm,
 * which is the one git itself uses — the shortest edit script, so a moved
 * brace does not drag the rest of the function along with it.
 *
 * The head and tail that both sides share are taken off first. That is the
 * part nobody is looking at, and taking it off is what keeps the search small
 * enough to be worth doing at all.
 */

/** What happened to one line: nothing, taken out, or put in. */
export type Mark = ' ' | '-' | '+';

export interface Edit {
  mark: Mark;
  text: string;
}

/**
 * Past this many differences the search stops being worth its memory, and a
 * file this far from itself is not something anybody reads on a board anyway.
 */
const FAR = 3000;

export function changedLines(before: readonly string[], after: readonly string[]): Edit[] {
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
  let tail = 0;
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }

  const was = before.slice(head, before.length - tail);
  const now = after.slice(head, after.length - tail);
  const middle = was.length && now.length ? myers(was, now) : plainly(was, now);

  return [
    ...before.slice(0, head).map((text): Edit => ({ mark: ' ', text })),
    ...middle,
    ...before.slice(before.length - tail).map((text): Edit => ({ mark: ' ', text })),
  ];
}

/** One side is empty, so there is nothing to line up: it all went or all came. */
function plainly(was: readonly string[], now: readonly string[]): Edit[] {
  return [
    ...was.map((text): Edit => ({ mark: '-', text })),
    ...now.map((text): Edit => ({ mark: '+', text })),
  ];
}

function myers(was: readonly string[], now: readonly string[]): Edit[] {
  const n = was.length;
  const m = now.length;
  const most = Math.min(n + m, FAR);
  const span = 2 * most + 1;
  /* One row of the frontier per step, kept so the path can be walked back
     afterwards. The frontier is the furthest point reached on each diagonal,
     and the diagonals run from -d to d, hence the offset into the middle. */
  const trace: Int32Array[] = [];
  const reach = new Int32Array(span);

  for (let d = 0; d <= most; d++) {
    trace.push(reach.slice());
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && (reach[k - 1 + most] ?? 0) < (reach[k + 1 + most] ?? 0));
      let x = down ? (reach[k + 1 + most] ?? 0) : (reach[k - 1 + most] ?? 0) + 1;
      let y = x - k;
      // Free moves: as far along this diagonal as the two sides keep agreeing.
      while (x < n && y < m && was[x] === now[y]) {
        x += 1;
        y += 1;
      }
      reach[k + most] = x;
      if (x >= n && y >= m) return walked(trace, was, now, most);
    }
  }
  // Too far apart to be worth the search; say it plainly rather than guess.
  return plainly(was, now);
}

/** The path back out of the frontier, as the lines it went through. */
function walked(
  trace: readonly Int32Array[],
  was: readonly string[],
  now: readonly string[],
  most: number
): Edit[] {
  const edits: Edit[] = [];
  let x = was.length;
  let y = now.length;

  for (let d = trace.length - 1; d >= 0; d--) {
    const reach = trace[d] as Int32Array;
    const k = x - y;
    const down = k === -d || (k !== d && (reach[k - 1 + most] ?? 0) < (reach[k + 1 + most] ?? 0));
    const wasK = down ? k + 1 : k - 1;
    const wasX = reach[wasK + most] ?? 0;
    const wasY = wasX - wasK;

    while (x > wasX && y > wasY) {
      edits.push({ mark: ' ', text: was[x - 1] ?? '' });
      x -= 1;
      y -= 1;
    }
    if (d === 0) break;
    if (down) {
      edits.push({ mark: '+', text: now[wasY] ?? '' });
      y = wasY;
    } else {
      edits.push({ mark: '-', text: was[wasX] ?? '' });
      x = wasX;
    }
  }
  return edits.reverse();
}
