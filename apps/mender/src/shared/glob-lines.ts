/**
 * One glob a line — what a project's settings hold for what search and
 * watching leave out beyond emdash's own default exclusion policy. Blank
 * lines and `#`-led ones are just spacing and notes.
 */
export function parseGlobLines(text: string): string[] {
  const globs: string[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    globs.push(line);
  }
  return globs;
}
