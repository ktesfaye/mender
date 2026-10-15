/**
 * A board link as Jira writes it in the address bar: the new
 * `/jira/software/(c/)projects/KEY/boards/12`, the old
 * `RapidBoard.jspa?rapidView=12`, or a project's own page with no board in it.
 */
export function boardLinkOf(
  written: string
): { site: string; board?: number; key?: string } | null {
  const text = written.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  const site = hostOf(text);
  const board = /\/boards\/(\d+)/.exec(text)?.[1] ?? /[?&]rapidView=(\d+)/.exec(text)?.[1];
  const key = /\/projects\/([A-Za-z][A-Za-z0-9_]*)/.exec(text)?.[1]?.toUpperCase();
  return { site, ...(board ? { board: Number(board) } : {}), ...(key ? { key } : {}) };
}

/** `https://x.atlassian.net/jira/...` and `x` both mean `x.atlassian.net`. */
export function hostOf(written: string): string {
  const bare =
    written
      .trim()
      .replace(/^https?:\/\//, '')
      .split(/[/?#]/)[0] ?? '';
  return bare.includes('.') ? bare.toLowerCase() : `${bare.toLowerCase()}.atlassian.net`;
}
