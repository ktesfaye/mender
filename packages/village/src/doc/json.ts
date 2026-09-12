/* Lossless JSON for the layout.

   `base-layout.json` carries Unity instance ids, and 116 of the demo's 2,329
   objects have one larger than 2^53 -- the largest is 9,184,538,994,280,546,318.
   `JSON.parse` turns those into the nearest double and the exact value is gone,
   so a plain parse-then-stringify round trip REWRITES 116 ids. Nothing throws;
   the file just quietly stops describing the same objects, and `village.py diff`
   reports 116 added and 115 removed after an edit that placed one barrel.

   That is the worst kind of bug: silent, invisible in the picture, and it
   corrupts identity in a file whose whole job is to be ground truth.

   The fix is the JSON source-text access the language now provides. A reviver
   can see the ORIGINAL text of each primitive, so an id too large to survive as
   a double is kept as its digit string instead, and `JSON.rawJSON` writes it
   back out verbatim. Ids are only ever compared, never arithmetic, so carrying
   one as a string costs nothing. */

/* `JSON.rawJSON` and the reviver's source-text context are ES2025 and ship in
   both Node 24 and the Chromium this runs on, but TypeScript's lib does not
   describe them yet. */
declare global {
  interface JSON {
    rawJSON(text: string): unknown;
  }
}

const DIGITS = /^-?\d+$/;

/** A big integer preserved as its exact source text. */
export type BigId = string;

export function isBigId(v: unknown): v is BigId {
  return typeof v === 'string' && DIGITS.test(v);
}

export function parseLayout<T>(text: string): T {
  return JSON.parse(text, function (_key, value, context?: { source?: string }) {
    const src = context?.source;
    if (typeof value !== 'number' || src === undefined) return value;
    // Only integers that cannot survive as doubles. Everything else is left a
    // number so arithmetic on positions and offsets keeps working.
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) return src;
    return value;
  }) as T;
}

export function stringifyLayout(layout: unknown, space: string | number = 1): string {
  return JSON.stringify(
    layout,
    (key, value) => {
      // Only the id field is ever a preserved big integer; a stray digit string
      // anywhere else is real string data and must stay quoted.
      if (key === 'id' && isBigId(value)) return JSON.rawJSON(value);
      return value;
    },
    space
  );
}
