import { chip, dom, h, pressable, sign } from '../glass/f';
import { stand } from '../yard/standing';
import type { Row } from './row';

/**
 * A real shell, on the wood.
 *
 * The grid itself — everything the shell has drawn, and the keyboard while
 * it is what is open — is a real terminal (`board/terminal.ts`), mounted
 * beside these rows rather than written as one of them. This is only ever
 * the title above it and, while it is not yet a place you can type into, the
 * word saying so.
 */

export interface Shell {
  /** What the checkout is called, said once at the top. */
  name: string;
  /** Set once the shell has actually started. */
  running: boolean;
  /** Set when it would not start, or has stopped. */
  stopped?: string;
  /** The second shell in this checkout, alive beside the first one's own
      tmux rather than in place of it. */
  second?: boolean;
  /** Armed for the second press, and what that press would end — null once
      asked and found to be nothing but the shell itself. */
  ending?: { armed: boolean; what: string | null } | null;
}

export function shell(state: Shell): Row[] {
  const root = h('div', 'f-root');
  const state_ = h('div', 'f-state');
  if (state.running && !state.stopped) {
    const live = chip('tmux · alive', '#ff9a4a');
    (live.firstElementChild as HTMLElement).style.boxShadow = '0 0 8px #ff9a4a';
    state_.append(live, chip('closing the village leaves it running'));
  }
  root.append(
    h(
      'div',
      'f-top',
      h(
        'div',
        '',
        h('h1', '', state.second ? 'a second shell in here' : 'a shell in here'),
        h('div', 'f-sub', h('span', 'g-mono', state.name))
      ),
      state_
    )
  );

  if (state.stopped) {
    const strip = h('div', 'f-strip f-sorest', sign('warn', '#f08a72', 18), state.stopped);
    root.append(strip);
    return [dom(root)];
  }
  if (!state.running) {
    root.append(h('div', 'f-note', 'starting it…'));
    return [dom(root)];
  }

  const tabs = h('div', 'f-tabs');
  const one = h('span', `f-tab${state.second ? '' : ' f-on'}`, 'shell 1');
  const two = h('span', `f-tab${state.second ? ' f-on' : ''}`, 'shell 2');
  tabs.append(
    state.second ? pressable(one, 'shell') : one,
    state.second ? two : pressable(two, 'shell2')
  );
  const armed = !!state.ending?.armed;
  const end = h(
    'span',
    'g-ghost f-end f-ghost-sore',
    sign('cross', '#f08a72', 12),
    armed
      ? state.ending?.what
        ? `ends ${state.ending.what}. press again to end it`
        : 'press again to end it'
      : 'End this shell'
  );
  pressable(end, 'shell-end');
  if (armed) stand(() => end.click(), end);
  tabs.append(end);
  root.append(tabs);
  return [dom(root)];
}
