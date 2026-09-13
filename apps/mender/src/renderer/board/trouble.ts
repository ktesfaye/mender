/**
 * What git said, said the way somebody would say it.
 *
 * Every distinct thing that can go wrong gets its own distinct sentence. The
 * one thing worse than a failure you cannot act on is nine different failures
 * that all read "something went wrong": the whole point of a vocabulary is
 * that the next move is different in each case, so the wording has to be too.
 *
 * Where git's own words are the useful part — a hook's complaint, a server's
 * refusal — they are kept and put inside the sentence rather than replaced.
 */
export function trouble(error: { type?: string; message?: string; stderr?: string }): string {
  const said = (error.message ?? error.stderr ?? '').trim();
  switch (error.type) {
    case 'nothing_to_commit':
      return 'there is nothing in it to commit.';
    case 'empty_message':
      return 'a commit with nothing written on it is not a commit.';
    case 'hook_failed':
      return said ? `a hook stopped it: ${lowered(said)}` : 'a hook stopped it.';
    case 'no_remote':
      return 'this checkout has nowhere to push to.';
    case 'no_upstream':
      return 'this branch is not following anything yet.';
    case 'remote_not_found':
      return 'the remote it was pointed at is not there.';
    case 'auth_required':
      return 'it wants to know who you are, and nothing here can tell it.';
    case 'auth_failed':
      return 'it would not take who you say you are.';
    case 'network_error':
      return 'it could not reach the other end.';
    case 'rejected':
      return said ? `the other end refused it: ${lowered(said)}` : 'the other end refused it.';
    case 'hook_rejected':
      return said ? `a hook on the other end refused it: ${lowered(said)}` : 'a hook refused it.';
    case 'diverged':
      return 'this branch and the other end have both moved since they agreed.';
    case 'conflict':
      return 'it stopped on a conflict; the files it could not settle are in the tree.';
    case 'resolution_failed':
      return 'that checkout is not where it was.';
    case 'git_error':
      return said ? lowered(said) : 'git would not say what went wrong.';
    default:
      return said ? lowered(said) : 'it would not say what went wrong.';
  }
}

/** Git shouts its first word as often as not, and this is a sentence. */
function lowered(said: string): string {
  const first = said.split('\n')[0] ?? said;
  return /^[A-Z][a-z]/.test(first) ? `${first[0]?.toLowerCase()}${first.slice(1)}` : first;
}
