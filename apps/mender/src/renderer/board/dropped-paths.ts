/**
 * A file dropped or pasted onto a real terminal, turned into what its shell
 * would want typed at it: its own path, escaped as one token, ready to sit on
 * the input line unsent — the same shape a path dropped onto the write line
 * already takes, except a shell has no separate "say" step to hold it until.
 *
 * Wrapped as a bracketed paste (`\x1b[200~…\x1b[201~`) rather than written a
 * character at a time, which is what tells whatever has bracket-paste mode on
 * — readline, zsh's own auto-quoting, Claude Code's own image detection —
 * that this is one paste and not a run of keystrokes. The trailing space has
 * to sit inside the markers: Claude Code discards the whole paste when
 * anything follows its end marker in the same write, leaving only that
 * trailing byte on the line.
 */

/** One path, escaped as a single POSIX shell token. */
export function escapeShellPath(path: string): string {
  return path.replace(/([\s'"\\$`!*?()[\]{}|;<>&#~])/g, '\\$1');
}

export function wrapAsBracketedPaste(text: string): string {
  return `\x1b[200~${text}\x1b[201~`;
}

/** What lands on the shell's input for the paths a drop or a paste resolved. */
export function pastedPaths(paths: readonly string[]): string {
  return wrapAsBracketedPaste(`${paths.map(escapeShellPath).join(' ')} `);
}
