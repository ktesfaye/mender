/**
 * A row, which is how everything in this app that is not the yard is said.
 *
 * A file, a change, a commit, a folder, a search, a shell, a pull request, the
 * finder, what a slash opens: all of them are computed by files that know
 * nothing about how any of it is drawn, and all of them come out as this. That
 * was true when the rows went into a canvas and it is still true now they go
 * into the page.
 *
 * Nothing here is a widget. There are no buttons, no boxes and no columns: a
 * board is a list of lines, some of which have a mark in the margin and some of
 * which can be pressed.
 */

/**
 * What a line is written in, which is what it means rather than what colour it
 * is. Something quoted exactly — a name, a path, a flag — reads cool against
 * the rest so it is a thing rather than a word. `keen` went well, `sore` went
 * wrong, `warn` wants you or fell short, and `stress` is something the writer
 * leaned on.
 */
export type Tone = 'ink' | 'faded' | 'keen' | 'sore' | 'warn' | 'quoted' | 'stress';

/** A stretch of one line written differently from the rest of it. */
export interface Run {
  text: string;
  tone?: Tone;
}

/** Which end of a line survives when it is too long for the board. */
export type Keep = 'front' | 'tail';

/** Which face a line is written in, when it is not the default. */
export type Hand = 'hand' | 'type';

/** What a row does when it is pressed, if it does anything. */
type Pick = { pick?: string; face?: Hand };

export type Row = (
  | { kind: 'title'; text: string }
  /** Being written now, with the cursor after it. */
  | { kind: 'typed'; text: string }
  | { kind: 'line'; text: string; tone?: Tone; keep?: Keep }
  /** A mark in the margin and the thing itself after it, columns lining up. */
  | { kind: 'entry'; mark: string; text: string; tone?: Tone; keep?: Keep }
  /**
   * Something somebody said, wrapped rather than cut off.
   *
   * `runs` is for writing that changes partway along — a name quoted inside a
   * sentence. `in` moves the whole thing right, which is how a list inside a
   * list is told from the list it is inside.
   */
  | { kind: 'prose'; text: string; tone?: Tone; mark?: string; runs?: Run[]; in?: number }
  | { kind: 'heading'; text: string }
  | { kind: 'gap' }
) &
  Pick;
