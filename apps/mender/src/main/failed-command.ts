/**
 * What a command that came back as an error actually was.
 *
 * Claude Code marks a lot of things as errors that went nothing like wrong. A
 * search that found nothing exits 1, and so does a test for a file that is not
 * there, and the agent asked both to find out. A command the permission check
 * or a hook would not let run never ran at all. Drawn as the sore cross, every
 * one of those read as the work breaking, a column of them in a busy session,
 * when the only thing that had happened was the agent looking.
 *
 * `wrong` is a command that ran and fell over. `held` never ran. `fine` asked
 * a question and the answer was no.
 */
export type Failed = 'wrong' | 'held' | 'fine';

const HELD = [
  /permission for this action was denied/i,
  /auto mode classifier/i,
  /doesn't want to proceed with this tool use/i,
  /tool use was rejected/i,
  /<tool_use_error>/i,
  /^blocked:/im,
  /hook .*(?:blocked|denied)/i,
];

/** The commands whose exit 1 means "no", not "broke". */
const ASKING = /^(grep|egrep|rg|ag|test|\[|diff|cmp|pgrep|which|command)$/;

export function howItFailed(command: string, output: string | undefined): Failed {
  const said = (output ?? '').replace(/^```\w*\n?|\n?```\s*$/g, '').trim();
  if (HELD.some((one) => one.test(said))) return 'held';
  const code = /^exit code (\d+)/i.exec(said);
  if (!code || code[1] !== '1') return 'wrong';
  const rest = said.slice(code[0].length).trim();
  const last = command
    .split(/\s*(?:&&|\|\||;|\n)\s*/)
    .filter(Boolean)
    .at(-1)
    ?.split('|')
    .at(-1)
    ?.trim()
    .split(/\s+/)[0];
  if (last && ASKING.test(last)) return 'fine';
  return rest ? 'wrong' : 'fine';
}
