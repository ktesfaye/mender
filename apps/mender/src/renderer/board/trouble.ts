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

/**
 * What the filesystem said, said the way somebody would say it.
 *
 * The one that earns its own sentence is a stale write: somebody else changed
 * the file while you had a line of it down on the board, and overwriting them
 * silently is how work disappears.
 */
export function unwritten(error: { type?: string; message?: string }): string {
  switch (error.type) {
    case 'etag-mismatch':
      return 'the file changed underneath you, so nothing was written. open it again.';
    case 'not-found':
      return 'that file is not there any more.';
    case 'permission-denied':
      return 'this machine will not let anybody write it.';
    case 'is-a-directory':
      return 'that is a folder, not a file.';
    case 'not-a-directory':
      return 'something on the way there is a file, not a folder.';
    case 'already-exists':
      return 'there is already something there.';
    case 'invalid-path':
      return 'that is not a path this checkout can hold.';
    default:
      return error.message ? error.message : 'it could not be written.';
  }
}

/**
 * What the other end said about a pull request, said the way somebody would.
 *
 * The same rule as git's failures: every distinct thing that can go wrong gets
 * its own sentence, because the next move is different in each case. Where
 * GitHub's own words are the useful part they are kept inside the sentence.
 */
export function refused(error: { type?: string; message?: string; reason?: string }): string {
  const said = (error.message ?? error.reason ?? '').trim();
  switch (error.type) {
    case 'invalid_repository':
      return 'that remote is not a github repository this can talk to.';
    case 'remote_not_ready':
      return 'the branch is not up there yet. send it up first.';
    case 'cross_host_pr':
      return 'the two ends are on different githubs.';
    case 'host_unreachable':
      return 'it could not reach github.';
    case 'auth_required':
      return 'nothing on this machine is signed in to github. run `gh auth login`.';
    case 'forbidden':
      return 'that account is not allowed to do this here.';
    case 'not_found':
      return 'github says there is no such thing.';
    case 'rate_limited':
      return 'github has had enough questions for now. try again shortly.';
    case 'merge_conflict':
      return 'it and the other end have both moved since they agreed.';
    case 'not_mergeable':
      return said ? `github will not put it in: ${said}` : 'github will not put it in yet.';
    default:
      return said || 'github would not say what went wrong.';
  }
}
