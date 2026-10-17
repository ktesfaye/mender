/**
 * Return says yes and Escape says no to whatever is asking.
 *
 * Every window that comes up asking something, and every two-press cost armed
 * on the wood, has a yes and usually a no that the hand would otherwise have
 * to go and press. Whatever is asking says so here, and the keys answer it
 * wherever the keyboard happens to be, so a window answers them whether or
 * not anything inside it has focus. Only the newest thing asking answers, and
 * it stops answering once it is taken down or has left the page; one with no
 * no lets Escape fall through to whatever is under it.
 */

export interface Ask {
  /** What Return does. */
  yes?: () => void;
  /** What Escape does. */
  no?: () => void;
  /** Once this is off the page the ask is over, said or not. */
  at?: Element;
  /** Still asking after it is answered: a window whose keys step through it. */
  keep?: boolean;
}

const asking: Ask[] = [];

/** Something is asking. The returned function takes it down. */
export function ask(one: Ask): () => void {
  /* A board redraws its armed line often, so what it drew last time is let
     go here rather than piling up. */
  for (let i = asking.length - 1; i >= 0; i--) {
    if (asking[i]?.at?.isConnected === false) asking.splice(i, 1);
  }
  asking.push(one);
  return () => {
    const at = asking.indexOf(one);
    if (at >= 0) asking.splice(at, 1);
  };
}

/** A first press already made: Return is the second, until it is taken down. */
export function stand(yes: () => void, at?: Element): () => void {
  return ask({ yes, at });
}

/* Heard from the moment the page loads, ahead of every other listener, and
   on the way down, so it is heard before the write line, a field or the
     window's own Escape takes the key as its own. */
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.shiftKey) return;
      const which = event.key === 'Enter' ? 'yes' : event.key === 'Escape' ? 'no' : null;
      if (!which) return;
      for (let i = asking.length - 1; i >= 0; i--) {
        const one = asking[i];
        if (!one) continue;
        if (one.at && !one.at.isConnected) {
          asking.splice(i, 1);
          continue;
        }
        const answer = one[which];
        if (!answer) {
          /* A two-press line has no no of its own: Escape walks past it to
             whatever is under it, but Return stops at the newest. */
          if (which === 'no') continue;
          return;
        }
        if (!one.keep) asking.splice(i, 1);
        event.preventDefault();
        event.stopImmediatePropagation();
        answer();
        return;
      }
    },
  true
);
