import type { ClientCapabilities } from '@agentclientprotocol/sdk';

/**
 * Everything this client tells an agent it can do. Kept on its own, free of
 * imports, because `apps/mender/tooling/bridge-parity.mts` reads it too: an
 * agent bridge withholds whatever a client does not claim, so this is the one
 * list that decides what sessions here are missing compared with a terminal.
 */
export function clientCapabilities(canSpawnTerminal: boolean): ClientCapabilities {
  return {
    fs: { readTextFile: true, writeTextFile: true },
    terminal: canSpawnTerminal,
    /* Forms only: a question the agent asks with its answers laid out (Claude's
       AskUserQuestion comes through as one, and is withheld from the model
       entirely unless this is advertised). URL mode would need somewhere to
       open a page and come back from, and nothing here does that yet. */
    elicitation: { form: {} },
    /* Opts in to Claude's ACP adapter's "AIR" `sessionFailure` extension: a
       typed usage/rate limit, overload, empty quota, or auth-required report
       instead of ordinary transcript prose. Unknown `_meta` is ignored by
       every other provider, so this is safe to advertise unconditionally. */
    _meta: { jetbrains: { air: { version: 1, capabilities: ['sessionFailure'] } } },
  };
}
