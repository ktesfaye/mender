import { card, chip, dom, h, label, pressable, sign, writing } from '../glass/read';
import type { Hand, Step } from '../yard/what';
import type { Row } from './row';

/**
 * Somebody a session sent out, walked up to.
 *
 * What they were sent for, whether they are still out, and everything they
 * have done out there, newest last and read the same way a session's own
 * steps are. While they are out, the one thing you can do about them is call
 * them back, which stops them alone: the session that sent them, and anybody
 * else it sent, carry on.
 */
export interface Walked {
  hand: Hand;
  /** Where calling them back has got to, if it has been pressed. */
  recall?: 'armed' | 'going' | 'refused' | 'done';
  /** Whether sending them away has been pressed once and waits for the second. */
  away?: 'armed' | 'going';
  /** Why calling them back did not work, when it did not. */
  because?: string;
  /** Claude's own record of them: every step, and what they came back with. */
  trail?: { prompt?: string; steps: Step[]; answer?: string; agentId?: string } | null;
  /** What you have said to them from here, through the session. */
  told?: string[];
  /** The last thing the session said before that, so what comes after is the reply. */
  since?: string;
  /** What came back, as the session said it, and whether it is still coming. */
  reply?: { said: string; going: boolean };
  /** For a command, the last of what it has printed: undefined until read, null when there is none. */
  printed?: string | null;
}

const SIGN: Record<string, [string, string]> = {
  look: ['eye', '#cfc3ad'],
  read: ['page', '#cfc3ad'],
  write: ['plus', '#9bd28a'],
  edit: ['pen', '#f2c66d'],
  delete: ['cross', '#f08a72'],
  run: ['flame', '#ff9a4a'],
  test: ['bolt', '#9bd28a'],
  build: ['box', '#f2c66d'],
  install: ['down', '#f2c66d'],
  commit: ['commit', '#7aaaff'],
  push: ['up', '#7aaaff'],
  git: ['branch', '#7aaaff'],
  send: ['talk', '#cfc3ad'],
  plan: ['list', '#cfc3ad'],
  tool: ['spark', '#cfc3ad'],
};

/** How long, as somebody would say it: `6m 12s`. */
function span(ms: number): string {
  const all = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(all / 60);
  const h$ = Math.floor(m / 60);
  if (h$) return `${h$}h ${m % 60}m`;
  return m >= 10 ? `${m}m` : m ? `${m}m ${all % 60}s` : `${all}s`;
}

function outFor(hand: Hand): string | undefined {
  if (hand.where === 'out' && hand.since) return span(Date.now() - hand.since);
  if (hand.ran) return span(hand.ran);
  return undefined;
}

export function helper(walked: Walked): Row[] {
  const { hand } = walked;
  if (hand.command !== undefined) return command(walked, hand.command);
  const out = hand.where === 'out';
  const rows: Row[] = [];

  const top = h('div', 'gr-hhead');
  const av = h('div', out ? 'gr-av2' : 'gr-av2 still');
  av.appendChild(
    sign('hood', out ? '#ffc89d' : hand.wrong ? '#f08a72' : 'rgba(246,236,219,.5)', 34)
  );
  const who = h('div');
  who.appendChild(h('div', 'g-serif gr-h1', hand.errand));
  who.firstElementChild!.setAttribute('style', 'font-size:32px');
  const sub = h('div', 'gr-sub');
  const taken = outFor(hand);
  const standing$ = out
    ? hand.background
      ? `out on their own${taken ? ` · ${taken}` : ''}`
      : `still out${taken ? ` · ${taken}` : ''}`
    : hand.wrong
      ? 'came back hurt, or was called back'
      : `back, with an answer${taken ? ` · was out ${taken}` : ''}`;
  const state = chip(standing$, out ? '#ff9a4a' : hand.wrong ? '#f08a72' : '#9bd28a');
  if (out) state.style.color = '#ffc89d';
  sub.appendChild(state);
  who.appendChild(sub);
  top.append(av, who);
  rows.push(dom(top));

  const cols = h('div', 'gr-hcols');
  const left = h('div');
  const sent = card('gr-cd');
  sent.append(
    label('what they were sent for', 'gr-flush'),
    h('div', 'gr-quote', `\u201c${hand.said}\u201d`)
  );
  left.appendChild(sent);

  const steps =
    hand.steps.length && (out || !walked.trail?.steps.length)
      ? hand.steps
      : (walked.trail?.steps ?? []);
  const lab = label('every step they have taken');
  lab.style.display = 'flex';
  lab.style.justifyContent = 'space-between';
  if (out) lab.appendChild(h('span', 'gr-live', 'following'));
  left.appendChild(lab);
  if (steps.length) {
    const tl = h('div', 'gr-tl');
    for (const step of steps) {
      const bad = step.tone === 'broken';
      const [name, colour] = SIGN[step.kind ?? 'tool'] ?? ['spark', '#cfc3ad'];
      const el = h('div', `gr-st${step.running ? ' live' : ''}${bad ? ' bad' : ''}`);
      const sg = h('span', 'sg');
      sg.appendChild(
        sign(bad ? 'cross' : name, bad ? '#f08a72' : step.running ? '#ff9a4a' : colour, 14)
      );
      const tx = h('span', 'tx', step.did);
      if (step.note) tx.appendChild(h('em', '', step.note));
      el.append(sg, tx);
      if (step.running) el.appendChild(h('span', 'ago', 'now'));
      tl.appendChild(el);
    }
    left.appendChild(tl);
  } else {
    left.appendChild(
      h(
        'div',
        'gr-nt',
        out
          ? 'nothing to show from out there yet.'
          : walked.trail === undefined
            ? 'reading what they did…'
            : walked.trail?.answer
              ? 'they answered straight off, without needing to do anything.'
              : 'nothing they did out there was kept.'
      )
    );
  }

  const right = h('div');
  const line = card('gr-cd');
  line.append(label('the line is theirs while this is open', 'gr-flush'));
  const field = h('div', 'gr-line');
  field.append(h('i'), document.createTextNode(`say something to ${hand.errand}`));
  line.appendChild(field);
  line.appendChild(
    h(
      'div',
      'gr-nt',
      'what you write goes to them, carried by the session. what they say back is written here as it comes.'
    )
  );
  for (const said of walked.told ?? []) {
    const t = h('div', 'gr-v', `you told them: ${said}`);
    t.style.marginTop = '10px';
    line.appendChild(t);
  }
  if (walked.told?.length) {
    line.appendChild(label('what came back'));
    if (walked.reply?.said) line.appendChild(writing(walked.reply.said, 'gr-bare'));
    if (!walked.reply?.said || walked.reply.going)
      line.appendChild(h('div', 'gr-nt', 'the session is passing it on…'));
  }
  right.appendChild(line);

  const far = card('gr-cd');
  far.style.marginTop = '14px';
  far.appendChild(label('so far', 'gr-flush'));
  const kv = h('div', 'gr-kv');
  const a = h('div');
  a.append(h('b', '', String(steps.length)), document.createTextNode('steps taken'));
  kv.appendChild(a);
  if (taken) {
    const b = h('div');
    b.append(h('b', '', taken), document.createTextNode(out ? 'out' : 'was out'));
    kv.appendChild(b);
  }
  far.appendChild(kv);
  if (hand.tokens) {
    const tok = h('div', 'gr-tok');
    const l = h('div', 'l');
    l.appendChild(h('span', '', hand.tokens));
    tok.appendChild(l);
    far.appendChild(tok);
  }
  right.appendChild(far);
  cols.append(left, right);
  rows.push(dom(cols));

  const answer = out ? undefined : walked.trail?.answer;
  if (answer) {
    rows.push(dom(label('what they came back with')), dom(writing(answer)));
  }

  /* Once pressed, what happened stays said, even after they are home. */
  if ((out && hand.call) || walked.recall) rows.push(dom(recalling(walked, 'them')));
  if (hand.call) rows.push(dom(sendingAway(walked)));
  return rows;
}

/**
 * A command left running in the background, walked up to: what it was for,
 * the command itself, whether it is still going, and the last of what it has
 * printed, which keeps coming while the board is open. Stopping it stops the
 * command alone; the session carries on, and hears it was stopped.
 */
function command(walked: Walked, line: string): Row[] {
  const { hand } = walked;
  const going = hand.where === 'out';
  const rows: Row[] = [];

  const top = h('div', 'gr-hhead');
  const av = h('div', 'gr-av2');
  av.style.position = 'relative';
  av.appendChild(sign('flame', going ? '#ff9a4a' : 'rgba(246,236,219,.4)', 28));
  const who = h('div');
  const title = h('div', 'g-serif gr-h1', commandName(line));
  title.style.fontSize = '32px';
  who.appendChild(title);
  const sub = h('div', 'gr-sub');
  const said = going
    ? 'still going in the background'
    : walked.recall === 'done'
      ? 'you stopped it'
      : hand.wrong
        ? 'it failed, or was stopped'
        : 'it finished';
  const state = chip(said, going ? '#ff9a4a' : hand.wrong ? '#f08a72' : '#9bd28a');
  if (going) state.style.color = '#ffc89d';
  if (hand.wrong && !going) state.style.color = '#f08a72';
  sub.appendChild(state);
  if (hand.gone) sub.appendChild(h('span', '', `started ${hand.gone}`));
  who.appendChild(sub);
  top.append(av, who);
  rows.push(dom(top));

  const cols = h('div', 'gr-hcols');
  cols.style.gridTemplateColumns = '1fr 1.35fr';
  const left = h('div');
  const sent = card('gr-cd');
  sent.append(
    label('what it was for', 'gr-flush'),
    h('div', 'gr-quote', `\u201c${hand.said}\u201d`)
  );
  left.appendChild(sent);
  left.appendChild(label('the command'));
  const cmd = h('div', 'gr-cmd');
  for (const part of line.split('\n')) {
    const row = h('div');
    row.append(h('i', '', '$ '), document.createTextNode(part));
    cmd.appendChild(row);
  }
  left.appendChild(cmd);
  const taken = outFor(hand);
  const port =
    /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})|--port[ =](\d{2,5})|\b(?:PORT|port)[ =](\d{2,5})/.exec(
      line
    );
  const kv = h('div', 'gr-kv');
  if (taken) {
    const k = h('div');
    k.append(h('b', '', taken), document.createTextNode(going ? 'running' : 'ran'));
    kv.appendChild(k);
  }
  const portNo = port?.[1] ?? port?.[2] ?? port?.[3];
  if (portNo) {
    const k = h('div');
    k.append(h('b', '', `:${portNo}`), document.createTextNode('listening'));
    kv.appendChild(k);
  }
  if (kv.childElementCount) left.appendChild(kv);

  const right = h('div');
  const lab = label(going ? 'the last it has printed' : 'what it printed');
  lab.style.margin = '0';
  lab.style.display = 'flex';
  lab.style.justifyContent = 'space-between';
  if (going) lab.appendChild(h('span', 'gr-live', 'following'));
  right.appendChild(lab);
  const term = h('div', 'gr-term');
  if (walked.printed === undefined) term.textContent = 'reading it…';
  else if (!walked.printed) term.textContent = 'nothing yet.';
  else term.textContent = walked.printed;
  if (going) term.appendChild(h('span', 'cur'));
  right.appendChild(term);
  /* Following means staying at the foot as more arrives. */
  requestAnimationFrame(() => (term.scrollTop = term.scrollHeight));
  cols.append(left, right);
  rows.push(dom(cols));

  if (going || walked.recall) rows.push(dom(recalling(walked, 'it')));
  if (hand.call) rows.push(dom(sendingAway(walked)));
  return rows;
}

/** What to call a command: its first word that is not shell plumbing. */
function commandName(line: string): string {
  const last = line.trim().split('\n').pop() ?? line;
  const words = last
    .replace(/^(?:cd\s+\S+\s*(?:&&|;)\s*)+/, '')
    .trim()
    .split(/\s+/);
  const run =
    words[0] === 'npm' || words[0] === 'pnpm' || words[0] === 'yarn'
      ? words.slice(1).filter((w) => w !== 'run')
      : words;
  const name = run.slice(0, 2).join(' ');
  return /(^|\s)(dev|start|serve|watch)\b/.test(name) ? 'the dev server' : name || 'a command';
}

function recalling(walked: Walked, who: 'them' | 'it'): HTMLElement {
  const el = h('div', 'gr-warn');
  const t = h('div', 't');
  const button = (text: string, pick: string, armed = false): HTMLElement => {
    const b = h('span', armed ? 'g-pill g-sore' : 'g-ghost gr-sore', text);
    return pressable(b, pick, { armed });
  };
  switch (walked.recall) {
    case 'armed':
      el.appendChild(sign(who === 'it' ? 'stop' : 'back', '#f08a72', 16));
      t.append(
        h('b', '', who === 'it' ? 'stop it?' : 'call them back?'),
        document.createTextNode(
          who === 'it'
            ? ' the command stops where it is, and nothing else does.'
            : ' they stop where they are, and what they found goes with them. the session keeps going and hears they came back without an answer.'
        )
      );
      el.append(t, button(who === 'it' ? 'Stop it' : 'Call them back', 'recall!', true));
      break;
    case 'going':
      el.appendChild(sign('stop', '#f08a72', 16));
      t.textContent = who === 'it' ? 'stopping it…' : 'calling them back…';
      el.appendChild(t);
      break;
    case 'done':
      el.appendChild(sign('check', '#9bd28a', 16));
      t.textContent = who === 'it' ? 'stopped.' : 'called back.';
      el.appendChild(t);
      break;
    case 'refused':
      el.appendChild(sign('warn', '#f08a72', 16));
      t.append(
        h('b', '', `could not ${who === 'it' ? 'stop it' : 'call them back'}`),
        document.createTextNode(walked.because ? `: ${walked.because}` : '.')
      );
      el.append(t, button('Try again', 'recall'));
      break;
    default:
      el.appendChild(sign(who === 'it' ? 'stop' : 'back', '#f08a72', 16));
      t.append(
        h('b', '', who === 'it' ? 'stop it' : 'call them back'),
        document.createTextNode(
          who === 'it'
            ? ' ends the command and nothing else.'
            : ' stops them and nobody else. the session keeps going.'
        )
      );
      el.append(t, button(who === 'it' ? 'Stop it' : 'Call them back', 'recall'));
  }
  return el;
}

/**
 * Taking them off the yard for good. Two presses, like anything that cannot be
 * taken back, and the first says what it costs: a helper still out stops where
 * they stand, and whichever way, they are not drawn again.
 */
function sendingAway(walked: Walked): HTMLElement {
  const wrap = h('div', 'gr-quiet');
  const one = walked.hand.command !== undefined;
  const out = walked.hand.where === 'out';
  if (walked.away === 'going') {
    wrap.textContent = one ? 'taking it off the yard…' : 'sending them away…';
    return wrap;
  }
  if (walked.away === 'armed') {
    wrap.className = 'gr-danger';
    wrap.appendChild(sign('trash_y', '#f08a72', 17));
    const t = h('div', 'gr-danger-t');
    t.append(
      h('b', '', one ? 'take it off the yard?' : 'send them away?'),
      document.createTextNode(
        ` ${one ? (out ? 'it stops and leaves the yard for good.' : 'it leaves the yard for good.') : out ? 'they stop where they are and leave the yard for good.' : 'they leave the yard for good.'}`
      )
    );
    wrap.append(
      t,
      pressable(h('span', 'g-ghost gr-sore', one ? 'take it off' : 'send them away'), 'away!', {
        armed: true,
      })
    );
    return wrap;
  }
  const go = h('span', 'gr-gold', one ? 'take it off the yard' : 'send them away for good');
  go.style.cssText = 'font-weight:600;font-size:13px';
  wrap.append(
    pressable(go, 'away'),
    h('span', '', one ? '' : 'stops them first if they are still out')
  );
  return wrap;
}
