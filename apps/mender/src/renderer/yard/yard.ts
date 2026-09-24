/**
 * The yard.
 *
 * You open a project and you are standing in its yard at night. What you asked
 * for is nailed to a gatepost on the left. What the agent is thinking rises off
 * the fire in the middle, getting brighter and larger the more recent it is.
 * What it has made is loaded on the cart to the right, and under that is the
 * ground itself, with everybody it sent out standing either in the firelight
 * with an answer or out in the dark still working. Along the bottom, one
 * lantern per session in the project, yours hanging lowest.
 *
 * There is no roster board and there is no second board. A session is not
 * something you navigate to from a list; it is where you already are, and the
 * lanterns are how you get to the others.
 *
 * Everything here is written on the layer over the village rather than drawn
 * into it. Nothing in this file talks to the wire: it is handed a `Yard` and it
 * writes it down.
 */

import type { Row } from '../board/row';
import { GUTTER, MARGIN, type Layer } from './frame';
import { longFor } from './from';
import { makeLine, type Asking as Prompting, type Line } from './line';
import { forgetInk, ink, keyed, measure, play } from './motion';
import { pressing, twice } from './press';
import { makeRows } from './rows';
import { makeScrim, type Reading } from './scrim';
import { KIT_NAMES, sprite } from './sprite';
import { astop, walking, type Walking } from './walk';
import type {
  Asking as Ask,
  Fire,
  Hand,
  Live,
  Made,
  Note,
  Posture,
  Step,
  Thought,
  Yard,
} from './what';
import { box, exact, firelight, folk, label, row, rule, said, stack, trim } from './write';

/* Where the bands sit, measured off the designs, with one change: the top
   right corner belongs to the projects shelf, so the two facts the designs put
   up there drop below it and the whole band is that much deeper. */
const HEAD = {
  title: 22,
  meta: 56,
  aside: 70,
  under: 92,
  rule: 112,
  label: 132,
  top: 162,
} as const;
/* From the beam down to the bottom edge, which is what the rail lives in. Less
   of it when the lanterns are hanging bare, since there are no words under
   them to leave room for. */
const RAIL_TALL = 118;
const RAIL_BARE = 76;
/* How far apart two lanterns hang, and how much of one is the lantern itself. */
const LANTERN_STEP = 232;
const LANTERN = { wide: 22, tall: 38, cord: 16, cordHere: 30 };
/* The ground you can see under the cart, which is bottom-anchored so it stays
   above the line you write on however short the window is. */
const YARD_BOX = { wide: 380, tall: 214 };

/** What the five postures look like when they are a name on a lantern. */
const TONE: Record<Posture, string> = {
  working: '#e8d3a6',
  'wants-you': '#ff9a6a',
  done: '#a8c469',
  broken: '#d98a5a',
  resting: '#bfa476',
};

export interface Doings {
  /** Walk into another session in this project. */
  open(id: string): void;
  /** Something on a board of rows was pressed. */
  press(pick: string): void;
  /** Something was typed, for whatever is narrowing under the line. */
  typed(said: string): void;
  /** Answer the question somebody is standing at the gate with. */
  answer(id: string): void;
  /** Say something on the line. */
  say(said: string): void;
  /** Escape with nothing left on the line to throw away. */
  leave(): void;
  /** The village forgets this project. Only ever reached by two presses. */
  forget(): Promise<{ said: string } | { wrong: string; because?: string }>;
}

export interface Standing {
  /** Rewrite everything. Cheap: the yard is a couple of hundred elements. */
  show(yard: Yard): void;
  /** What the line is asking for at the moment. */
  asks(what: Prompting): void;
  /** Write the lines a slash or an @ has opened under the line. */
  narrowing(rows: Row[]): void;
  /**
   * Lay something over the yard to read, or take it away.
   *
   * The world dims further while this is up and the middle and right of the
   * yard go under it; what you asked for and the rail do not.
   */
  reading(what: Reading | null): void;
  readonly open: boolean;
  /** An arrow or a page key that nothing nearer wanted. */
  scrolled(key: string): boolean;
  /** Whether something written on covers that point of the window. */
  covers(x: number, y: number): boolean;
  /** Where the keyboard is, for whoever is listening to it. */
  readonly walk: Walking;
  readonly line: Line;
  /**
   * Whether the yard is up, and whether all of it is.
   *
   * `bare` keeps the line you write on and whatever is laid over it, and puts
   * the rest away. That is what the island wants: there is no yard out there,
   * but the finder and founding a place both need somewhere to write.
   */
  up(on: boolean, bare?: boolean): void;
  readonly showing: boolean;
  /**
   * What was just said to the agent, lifting off the line.
   *
   * It travels up to the gatepost and waits there until the agent's own
   * record of it arrives, which then takes its place without a seam.
   */
  fly(said: string): void;
  /** Take it down and give the village back. */
  close(): void;
}

/** The same words, however the line and the transcript each spaced them. */
function same(a: string, b: string): boolean {
  return a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
}

/** Which lanterns were on the beam last time, so a new one can be seen to
    arrive rather than simply being there. */
const onTheBeam = new Set<string>();

export function makeYard(layer: Layer, does: Doings): Standing {
  /* Everything the yard is, under one thing that can be taken away. The shelf
     of projects lives on the layer beside this rather than inside it, because
     the shelf is reachable from the island as well as from in here. */
  const stage = box({ left: 0, top: 0, right: 0, bottom: 0 });
  stage.style.cssText += ';pointer-events:none;display:none';
  layer.root.appendChild(stage);

  const root = box({ left: 0, top: 0, right: 0, bottom: 0 });
  root.style.pointerEvents = 'none';
  stage.appendChild(root);

  /* The two columns the scrim comes down over. Everything else on the yard —
     the head, the gatepost, the line, the rail — stays visible while you are
     reading something, so they are drawn outside this. */
  const covered = box({ left: 0, top: 0, right: 0, bottom: 0 });
  covered.style.pointerEvents = 'none';
  root.appendChild(covered);

  /* The line is made once and kept. Everything else on this screen is thrown
     away and written again whenever anything moves, and a line that went with
     it would lose whatever you were half-way through typing every time an
     agent said a word. */
  const writing = box(
    { left: 0, right: 0, bottom: 146 },
    'display:flex;align-items:center;gap:10px'
  );
  stage.appendChild(writing);
  /* What is in your hands sits beside the line rather than on it, because a
     picture is not writing: what the board says is that you have it, and
     pressing one puts it down again. */
  const hands = box({}, 'position:relative;display:flex;align-items:center;gap:8px;flex:none');
  writing.appendChild(hands);
  /* What you said while somebody was busy waits just above the line, with the
     line rather than with the yard, so it is still there while you are reading
     something else. It is a thing you might want back, and a thing you might
     want back does not go behind a wash. */
  const stillAt = box({ left: 0, right: 0, bottom: 196 }, 'padding:8px 0');
  stage.appendChild(stillAt);
  const line = makeLine(writing);
  /* And what a slash or an @ has opened sits just above the line, growing
     upward from it. It is under the line in the sense that matters — it is
     what the line has opened and it goes away when the line does — and it is
     drawn above it because below it is the rail and then the edge of the
     screen. Nothing here floats over anything. */
  const under = box(
    { left: 0, right: 0, bottom: 190 },
    [
      'max-height:280px',
      'overflow-y:auto',
      /* Born hidden: it holds nothing yet, and an empty box that is merely
         transparent still traps the keyboard's walk inside it and draws a
         bare strip of wash over whatever is open. `narrowing` turns it to
         flex the moment it has lines to show. */
      'display:none',
      'flex-direction:column',
      'justify-content:flex-end',
      /* The same wash everything read over the yard sits on, because this is
         read over the yard too and the village behind would otherwise be
         showing through the middle of a list of file names. */
      'background:rgba(72,37,16,.72)',
      'padding:10px 0',
      'pointer-events:auto',
    ].join(';')
  );
  under.dataset.narrowing = 'yes';
  const opened = makeRows(under, does.press);
  /* What the overlay last had on it, so a change of list moves the mark. */
  let lastNarrowed = '';
  stage.appendChild(under);
  /* Where the words were on the line the moment they were said, so that if
     they turn out to be for the agent they can be seen leaving from there. */
  let lastSaid: { text: string; rect: DOMRect } | null = null;
  line.onSay((text, rect) => {
    lastSaid = rect ? { text, rect } : null;
    does.say(text);
  });
  /* Return means whatever the slash or the @ has picked out, when one of them
     is open. The first line of either is already standing under the keyboard,
     because a list you have to arrow into before Return does anything is a
     list that made you press two keys to do one thing. */
  line.onInstead(standingInOverlay);

  /** Whether the keyboard's mark is on one of the lines the overlay opened. */
  function standingInOverlay(): boolean {
    if (under.style.display === 'none' || !walk.on) return false;
    return Boolean(under.querySelector(`[data-walk="${CSS.escape(walk.on)}"]`));
  }
  line.onEmpty(() => does.leave());
  line.onType((text) => does.typed(text));

  /* And the wash that comes down over the middle and right of the screen when
     you open something to read. The gatepost keeps its own column and the rail
     keeps its own strip, so neither is ever covered. */
  const scrim = makeScrim(stage, does.press);

  const walk = walking(layer.root);

  /* Where the wash comes down, which is the same whether or not there is a
     yard under it: from the gatepost's own column to the right edge. */
  function lay(): void {
    const columns = layer.columns();
    const floor = window.innerHeight - MARGIN - RAIL_TALL - 60;
    scrim.place(
      columns.thinking.x - GUTTER / 2,
      MARGIN - 8,
      HEAD.rule,
      window.innerHeight - floor - 20
    );
    writing.style.left = `${layer.edge()}px`;
    writing.style.right = `${layer.edge()}px`;
    /* What a slash or an @ opens takes the same ground a sub-board takes and
       no more: never over the gatepost, which is where what you asked for is
       and the one thing you want to still be able to read while you decide
       what to say next. */
    under.style.left = `${columns.thinking.x - GUTTER / 2}px`;
    under.style.right = `${layer.edge()}px`;
    /* Clear of the gatepost, because the gatepost has its own things to say
       down there and two columns of writing on the same line is a mess. */
    stillAt.style.left = `${columns.thinking.x}px`;
    stillAt.style.right = `${layer.edge()}px`;
  }

  let last: Yard | undefined;
  layer.onResize(() => {
    lay();
    if (last) show(last, false);
  });

  /* Whether the next rewrite is walking into this place rather than watching
     it change, which is when everything arrives in order instead of sliding. */
  let entering = true;
  /** What was said and is on its way up to the post. */
  let flight: { said: string; el: HTMLElement; rect: () => DOMRect } | null = null;
  /** When each session was first seen working, for a count with nothing else to start from. */
  const workingSince = new Map<string, number>();

  function show(yard: Yard, moving = true): void {
    const before = last;
    last = yard;
    const walkedIn =
      entering ||
      before?.project.id !== yard.project.id ||
      before?.session?.id !== yard.session?.id;
    entering = false;
    const was = moving && !walkedIn ? measure(stage) : new Map();
    root.replaceChildren(covered);
    covered.replaceChildren();
    const columns = layer.columns();
    /* Everything from under the header rule to above the line you write on.
       The columns live in here and the bands top and bottom do not. */
    const floor = window.innerHeight - MARGIN - (layer.cramped() ? RAIL_BARE : RAIL_TALL) - 60;

    scrims(root);
    lay();
    carried(hands, yard, does);
    head(root, yard, layer.edge(), does);
    /* A project nobody has worked in yet has nothing to put in three columns,
       and three headings over three empty columns is scaffolding, not a place.
       So it says the one true thing and lets the district behind it do the
       rest; the line at the bottom is already asking what to build. */
    if (yard.session) {
      asked(root, columns.asked, yard, floor, layer.cramped(), does);
      thinking(covered, columns.thinking, yard, floor, does, walkedIn, sinceOf(yard));
      made(covered, columns.made, yard, floor);
      still(stillAt, yard, does);
    } else {
      nobody(root, columns.asked, columns.made, yard, floor, does);
      stillAt.replaceChildren();
    }
    said_line(root, layer.edge());
    rail(root, yard, layer.cramped(), layer.edge(), does);
    /* What the line asks for follows what the yard is: somebody at the gate
       wants an answer, an empty project wants to know what to build, and
       anything else is the next thing you have to say. Not while something is
       laid over the yard, though: that has its own question. */
    if (!scrim.up) line.asks(yard.asking ? 'answer' : yard.session ? 'say' : 'start');

    /* The keyboard was standing on something before the rewrite and the board
       under it is new, so put the mark back on whatever it was standing on. */
    walk.again();

    if (!moving) return;
    /* The note that was just said, landing. The agent's own record of it has
       arrived on the post, so the one in flight hands over to it: the card
       carries on from wherever the words had got to. */
    const from = new Map<string, DOMRect>();
    const newest = yard.session?.notes[0];
    if (flight && newest && same(newest.said, flight.said) && !was.has(`note:${newest.id}`)) {
      from.set(`note:${newest.id}`, flight.rect());
      flight.el.remove();
      flight = null;
    }
    play(stage, was, { entering: walkedIn, from });
    /* Walking in, the bands and rules come up with the light rather than
       being there before it, and the keyed things arrive in order over them. */
    if (walkedIn) {
      root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    }
  }

  /** When the live count starts, from the note if it has a time and otherwise from now. */
  function sinceOf(yard: Yard): number | undefined {
    const session = yard.session;
    if (!session?.live) {
      if (session) workingSince.delete(session.id);
      return undefined;
    }
    if (session.live.since) return session.live.since;
    const seen = workingSince.get(session.id) ?? Date.now();
    workingSince.set(session.id, seen);
    return seen;
  }

  /* The count on the live edge goes up by itself. The yard is only rewritten
     when something changes, and a wait is exactly when nothing does. */
  const ticking = window.setInterval(() => {
    for (const el of stage.querySelectorAll<HTMLElement>('[data-since]')) {
      el.textContent = longFor(Date.now() - Number(el.dataset.since));
    }
  }, 1000);

  function fly(text: string): void {
    const leaving = lastSaid;
    lastSaid = null;
    const columns = layer.columns();
    if (!leaving || !same(leaving.text, text) || !last?.session) return;
    flight?.el.remove();
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      `left:${leaving.rect.left}px`,
      `top:${leaving.rect.top}px`,
      `max-width:${columns.asked.wide - 60}px`,
      "font-family:'Caveat',cursive",
      'font-size:19px',
      'line-height:1.25',
      'padding:12px 14px',
      'color:#f4e3c0',
      'pointer-events:none',
      'z-index:5',
      'transform-origin:top left',
      'white-space:pre-wrap',
    ].join(';');
    el.textContent = text;
    stage.appendChild(el);
    /* The line's own padding is none and the card's is twelve, so the words
       start twelve up and fourteen left of where they will read from. */
    const dx = columns.asked.x + 22 - leaving.rect.left;
    const dy = HEAD.top - leaving.rect.top;
    el.animate(
      [
        {
          transform: 'translate(-14px,-12px)',
          background: 'rgba(255,244,212,0)',
          color: '#f4e3c0',
        },
        {
          offset: 0.35,
          transform: `translate(${dx * 0.25 - 14}px,${dy * 0.5}px) rotate(-2deg)`,
          background: 'rgba(255,244,212,.85)',
          color: '#2c2013',
        },
        {
          transform: `translate(${dx}px,${dy}px) rotate(-.7deg)`,
          background: '#fff4d4',
          color: '#2c2013',
          boxShadow: '5px 5px 0 rgba(0,0,0,.5)',
        },
      ],
      { duration: 620, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' }
    );
    const mine = { said: text, el, rect: () => el.getBoundingClientRect() };
    flight = mine;
    /* If the agent never takes it, the note does not hang there forever. */
    window.setTimeout(() => {
      if (flight !== mine) return;
      flight = null;
      el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        fill: 'forwards',
      }).finished.then(
        () => el.remove(),
        () => el.remove()
      );
    }, 8000);
  }

  return {
    reading: (what) => {
      scrim.show(what);
      /* What is under it is still there and still live; it is simply not what
         you are looking at, so it stops taking the eye. */
      covered.style.visibility = what ? 'hidden' : '';
      line.asks(what?.asks ? (what.asks as Prompting) : 'say');
    },
    get open() {
      return scrim.up;
    },
    scrolled: (key) => scrim.scrolled(key),
    /* WHILE YOU ARE IN A YARD, THE YARD HAS THE SCREEN.
     *
     * The village keeps living behind it and the camera is still yours, but
     * the land is not a list of buttons any more: every gap between two
     * columns of writing was a district you could hover, light up and walk
     * into, so the screen was covered in targets nobody put there and a
     * missed click on the middle of a session threw you back out to the
     * island. Standing somewhere means the things behind it are scenery.
     *
     * Out on the island the layer is bare, carrying only the line you write
     * on, and then it covers exactly what it draws and nothing else. */
    covers: (x, y) => {
      /* Anything actually drawn on the layer, which out on the island is the
         rack of projects in the corner and the line you write on. Asked first,
         because the rack is up whether or not a yard is. */
      const at = document.elementFromPoint(x, y);
      if (at && at !== stage && at !== layer.root && layer.root.contains(at)) return true;
      if (stage.style.display === 'none') return false;
      return root.style.display !== 'none';
    },
    up: (on, bare = false) => {
      if (on && stage.style.display === 'none') entering = true;
      stage.style.display = on ? '' : 'none';
      if (on) lay();
      root.style.display = on && !bare ? '' : 'none';
      if (!on) line.write('');
    },
    get showing() {
      return stage.style.display !== 'none';
    },
    show: (yard) => show(yard),
    fly,
    narrowing: (rows) => {
      /* Asked before the lines are replaced, because afterwards there is
         nothing left to ask about. */
      const wasInside = standingInOverlay();
      opened.write(rows);
      under.style.display = rows.length ? 'flex' : 'none';

      /* The first line of it stands under the keyboard, drawn filled the way
         the designs draw it, so Return means it.
         It goes back to the first line every time the list itself changes,
         which is every letter you type. Leaving the mark where it was looks
         harmless until you notice that typing the whole of `/mode` left it
         sitting on `/model` from three letters ago, and return then set the
         model. Arrows move it; the next letter takes it back. */
      const now = rows.map((row) => row.pick ?? '').join('\u0000');
      const moved = now !== lastNarrowed;
      lastNarrowed = now;
      const first = rows.find((row) => row.pick)?.pick;
      if (first && (moved || !standingInOverlay())) walk.stand(first);
      else if (!rows.length && wasInside) walk.stand(null);
      else walk.again();
      /* Whatever it opened is read from the bottom up, because the thing it is
         narrowing towards is the nearest one to the line. */
      opened.root.scrollTop = opened.root.scrollHeight;
    },
    asks: (what) => line.asks(what),
    walk,
    line,
    close: () => {
      window.clearInterval(ticking);
      line.close();
      stage.remove();
    },
  };
}

/* ── the village behind, pushed down at both ends ──────────────────────────
   The world is dimmed as a whole elsewhere. These two are local: enough dark
   under the bottom band that the lanterns and the line you write on sit on
   something, without putting a panel there. */
function scrims(root: HTMLElement): void {
  root.appendChild(
    box(
      { left: 0, right: 0, bottom: 0, height: 260 },
      'background:linear-gradient(180deg,rgba(0,0,0,0),rgba(18,13,7,.55))'
    )
  );
  root.appendChild(
    box(
      { left: 0, right: 0, bottom: 0, height: 160 },
      'background:linear-gradient(0deg,rgba(18,13,7,.92),rgba(18,13,7,0))'
    )
  );
}

/* ── who and where ─────────────────────────────────────────────────────────
   The project's name, and under it the one line that says everything about
   the session you are standing in: its checkout, its agent, how long it has
   been going and how much of that was turns. To the right, the two things
   that are true of the agent rather than of the work. */
function head(root: HTMLElement, yard: Yard, edge: number, does: Doings): void {
  const title = box({ left: edge, top: HEAD.title }, TITLE);
  title.textContent = yard.project.name;
  root.appendChild(title);

  /* The head of the board is pressable wherever it leads somewhere. Where the
     checkout stands opens the checkout; where it is on disk walks into it. */
  const on = astop(
    pressing(yard.project.on, () => does.press('checkout')),
    'head:checkout'
  );
  on.style.cssText += META;
  const said = [
    yard.session?.agent,
    yard.project.going,
    counted(yard.project.turns, 'turn'),
    counted(yard.project.spawned, 'agent spawned', 'agents spawned'),
  ]
    .filter(Boolean)
    .join(' · ');
  const meta = box({ left: edge + 2, top: HEAD.meta }, 'display:flex;gap:6px;align-items:baseline');
  meta.append(on);
  if (said) {
    const dot = exact('·', 12, '#6b5a40');
    dot.style.position = 'relative';
    const rest = exact(said, 12);
    rest.style.position = 'relative';
    meta.append(dot, rest);
  }
  const into = astop(
    pressing(shortOf(yard.project.where), () => does.press('inside')),
    'head:in'
  );
  into.style.cssText += META;
  const dot2 = exact('·', 12, '#6b5a40');
  dot2.style.position = 'relative';
  meta.append(dot2, into);
  root.appendChild(meta);

  if (yard.session?.permissions) {
    const flag = box({ right: edge, top: HEAD.aside }, FLAG);
    flag.textContent = yard.session.permissions;
    root.appendChild(flag);
  }

  /* How much room it has left to think in. Nothing warns an agent when that
     runs out; the conversation simply starts losing its own beginning, so the
     village says it instead, and says it warmly once there is little left. */
  const room = yard.session?.room;
  const it = box({ right: edge, top: HEAD.under }, 'display:flex;gap:6px;align-items:baseline');
  if (room !== undefined) {
    it.appendChild(
      exact(`context ${Math.round(room * 100)}%`, 12, room < TIGHT ? '#ff9a6a' : undefined)
    );
  }
  if (yard.session?.model) {
    if (room !== undefined) {
      const dot = exact('·', 12, '#6b5a40');
      dot.style.position = 'relative';
      it.appendChild(dot);
    }
    it.appendChild(exact(yard.session.model, 12));
  }
  if (it.childElementCount) root.appendChild(it);

  /* And if the ground under all of it has moved, that is said before anything
     else, because nothing else on the board means a thing until it is put
     right. */
  const wrong = WRONG[yard.project.health];
  if (wrong) {
    const said = box({ left: edge, top: HEAD.under, width: 600 }, WOUND);
    said.textContent = wrong;
    root.appendChild(said);
  }

  root.appendChild(rule({ left: edge, right: edge, top: HEAD.rule }, true));
}

/** What each way a project can be wrong reads as, in words rather than a mark. */
const WRONG: Partial<Record<Yard['project']['health'], string>> = {
  'path-moved': 'this checkout is not where it was.',
  'not-git': 'there is no repository here any more.',
  'host-unreachable': 'the machine this is on is not answering.',
  abandoned: 'the village has forgotten this one.',
};

const WOUND = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:14px',
  'color:#e0735a',
  'text-shadow:1px 1px 0 #120d07',
].join(';');

/** How many of something, said rather than counted at. */
function counted(many: number | undefined, one: string, more?: string): string | undefined {
  if (!many) return undefined;
  return many === 1 ? `1 ${one}` : `${many} ${more ?? one + 's'}`;
}

const META = ";font-family:'Courier Prime',monospace;font-size:12px;position:relative";

/** The last thing in a path, which is the only part worth the room. */
function shortOf(path: string): string {
  return path.replace(/\/+$/, '').split('/').at(-1) ?? path;
}

/** Below this much room left, it stops being a footnote. */
const TIGHT = 0.15;

const TITLE = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:22px',
  'font-weight:600',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#f4e3c0',
  'text-shadow:2px 2px 0 #120d07',
  'white-space:nowrap',
].join(';');

const FLAG = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.18em',
  'text-transform:uppercase',
  'color:#ff9a6a',
  'white-space:nowrap',
].join(';');

/* ── what you asked ────────────────────────────────────────────────────────
   A gatepost with your notes on it. The newest is on parchment and slightly
   crooked, because somebody pinned it there; the ones under it have been up
   long enough to have weathered into the post. Under the whole column, a
   glance at the other sessions that want something. */
function asked(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  cramped: boolean,
  does: Doings
): void {
  root.appendChild(label('what you asked', { left: at.x, top: HEAD.label }));

  /* The glance at the other sessions sits at the foot of the column, so the
     post and the notes on it get everything above that and no more. */
  const under = elsewhere(root, at, yard, floor, does);
  const room = under - 20 - HEAD.top;

  /* The post is only as long as what is nailed to it, plus a little bare wood
     under the last note. A post running the height of the window with nothing
     on it is a stripe, not a gatepost. */
  const post = box(
    { left: at.x, top: HEAD.top - 2, width: 12, height: room },
    'background:linear-gradient(90deg,#54391e,#3a2712)'
  );
  root.appendChild(post);

  const notes = yard.session?.notes ?? [];
  const [newest, ...older] = notes;
  if (!newest) {
    post.style.height = '120px';
    return;
  }

  const card = keyed(
    pinned(newest, { left: at.x + 22, top: HEAD.top, width: at.wide - 60 }),
    `note:${newest.id}`
  );
  root.appendChild(card);
  /* A note is a note. Something long enough to fill the post on its own is
     not one, and it is usually not yours either: a resumed session hands back
     whatever was said to start it, summaries and instructions and all. So the
     parchment is only ever a few lines of it and says how many it is holding
     back, which is the same bargain the rest of this column already makes.
     The cut lands on a whole line, because half a line of handwriting sliced
     through the middle reads as the card being broken rather than trimmed. */
  const body = card.querySelector<HTMLElement>('[data-note="said"]');
  if (body) {
    const line = Math.max(1, Math.round(NOTE_LINE));
    const lines = Math.round(body.scrollHeight / line);
    if (lines > NOTE_LINES) {
      body.style.height = `${NOTE_LINES * line}px`;
      body.style.overflow = 'hidden';
      const more = said(`${lines - NOTE_LINES} more lines on this note`, '#b3651f');
      more.style.cssText += ';display:block;font-size:9px;padding-top:7px';
      card.appendChild(more);
    }
  }
  post.style.height = `${Math.min(room, card.offsetHeight + 60)}px`;

  if (!older.length || cramped) return;
  /* The card is as tall as whatever was written on it, which nothing knows
     until it is in, so the rest of the post is placed off its real height. */
  const below = HEAD.top + card.offsetHeight + 22;
  const list = stack(
    { left: at.x + 22, top: below, width: at.wide - 60, height: Math.max(0, under - 20 - below) },
    14
  );
  /* Not clipped: `trim` below takes off whatever does not fit, and a clipped
     list swallowed the note that was on the parchment while it slid down to
     join the others. */
  for (const note of older) list.appendChild(keyed(weathered(note), `note:${note.id}`));
  const tail = said('', '#a89272');
  tail.style.fontSize = '10px';
  list.appendChild(tail);
  root.appendChild(list);

  const dropped = trim(list, under - 20 - below);
  const many = (yard.session?.olderNotes ?? 0) + dropped;
  tail.textContent = many ? `${many} older notes further down the post` : '';
  post.style.height = `${Math.min(room, below + list.scrollHeight - HEAD.top + 40)}px`;
}

/** How many lines of one note the parchment holds, however long it was. */
const NOTE_LINES = 7;
/** What one of those lines is, at the card's own size and leading. */
const NOTE_LINE = 19 * 1.25;

/** The newest note: on parchment, pinned, and not quite straight. */
function pinned(note: Note, where: { left: number; top: number; width: number }): HTMLElement {
  const card = box(where, CARD);
  const tack = box(
    { left: 14, top: -6, width: 10, height: 10 },
    'background:#d8863a;box-shadow:1px 1px 0 #120d07'
  );
  card.appendChild(tack);
  const meta = said(
    `newest · ${note.when} · ${note.answered ? 'answered' : 'unanswered'}`,
    '#b3651f'
  );
  meta.style.display = 'block';
  meta.style.marginBottom = '5px';
  card.appendChild(meta);
  const body = document.createElement('div');
  body.dataset.note = 'said';
  body.textContent = note.said;
  card.appendChild(body);
  return card;
}

const CARD = [
  /* Over the notes under it, which slide down behind it when a new one lands. */
  'z-index:2',
  'background:#fff4d4',
  'color:#2c2013',
  'padding:12px 14px',
  'box-shadow:5px 5px 0 rgba(0,0,0,.5)',
  'transform:rotate(-.7deg)',
  "font-family:'Caveat',cursive",
  'font-size:19px',
  'line-height:1.25',
].join(';');

/** A note that has been on the post a while. */
function weathered(note: Note): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:3px';
  it.appendChild(
    said(`${note.when} · ${note.standing ? 'standing' : note.answered ? 'answered' : 'unanswered'}`)
  );
  const body = document.createElement('span');
  body.style.cssText = "font-family:'Caveat',cursive;font-size:17px;line-height:1.25;color:#cbb491";
  body.textContent = note.said;
  it.appendChild(body);
  return it;
}

/**
 * Everything else going on in this project, as three lines and no more.
 *
 * Not the roster: that is the rail along the bottom, and this is the glance
 * you take without looking down. Returns the top of the block, which is where
 * the gatepost above it has to stop.
 */
function elsewhere(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): number {
  const others = yard.rail.filter((one) => !one.here).slice(0, 3);
  const tall = 30 + others.length * 23 + 34;
  const top = floor - tall;
  root.appendChild(rule({ left: at.x, top: top - 20, width: at.wide - 20 }));
  /* Only when there is an elsewhere. One session in a project is not
     "elsewhere in" anything, and the line under it is about the project
     rather than about the work. */
  if (others.length) {
    root.appendChild(label(`elsewhere in ${yard.project.name.toLowerCase()}`, { left: at.x, top }));
  }

  const list = stack({ left: at.x, top: top + 30, width: at.wide }, 9);
  list.style.fontSize = '14px';
  list.style.fontFamily = "'Josefin Sans',sans-serif";
  for (const one of others) {
    const line = row(10);
    line.appendChild(
      box({ width: 8, height: 8 }, `background:${TONE[one.posture]};position:relative`)
    );
    const text = document.createElement('span');
    text.style.color = one.posture === 'wants-you' ? '#ff9a6a' : '#dcc8a0';
    text.textContent = `${one.name} · ${one.saying}`;
    line.appendChild(text);
    list.appendChild(line);
  }
  root.appendChild(list);

  /* The one thing this board offers about the project rather than about the
     work in it, at the very bottom, under everything, because forgetting a
     place is not something you should meet on your way into it. */
  const go = box({ left: at.x, top: top + 30 + others.length * 23 + 14 });
  go.appendChild(
    astop(
      twice('forget this project', yard.project.costs ?? 'it goes', {
        while: 'forgetting',
        run: does.forget,
      }),
      'forget'
    )
  );
  root.appendChild(go);
  return top;
}

/* ── what it is thinking ───────────────────────────────────────────────────
   The plan it posted at the start sits at the top and stays there, because it
   is the thing everything since is measured against. Under it, how many
   thoughts went by that you are not being shown, then the last few, each one
   a little brighter and a little larger than the one above it. The live one is
   at the bottom and is the only thing on this screen set large. */
function thinking(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings,
  walkedIn: boolean,
  since: number | undefined
): void {
  root.appendChild(
    rule({ left: at.x - GUTTER / 2, top: HEAD.rule + 12, width: 1, height: floor - HEAD.rule - 12 })
  );
  if (yard.asking) {
    gate(root, at, yard.asking, does);
    return;
  }

  root.appendChild(label('what it is thinking', { left: at.x, top: HEAD.label }));

  const thoughts = yard.session?.thoughts ?? [];
  const posted = yard.session?.plan ?? [];
  let top = HEAD.top;

  /* What it said it was going to do stays at the top and everything since
     scrolls under it, because the plan is what all of it is being measured
     against and scrolling away from it loses the measure. Only when it has
     actually posted one: the first thing an agent says is not a plan. */
  if (posted.length) {
    const said = box({ left: at.x, top, width: at.wide }, "font-family:'Josefin Sans',sans-serif");
    said.appendChild(label('what it means to do', {}));
    const list = stack({}, 4);
    list.style.position = 'relative';
    list.style.marginTop = '8px';
    for (const step of posted) {
      const line = row(10);
      const mark = document.createElement('span');
      mark.style.cssText = `width:14px;flex:none;color:${STEP[step.state]}`;
      mark.textContent = step.state === 'done' ? '·' : step.state === 'doing' ? '›' : ' ';
      const text = document.createElement('span');
      text.style.cssText = `font-size:14px;color:${STEP[step.state]}`;
      text.textContent = step.said;
      line.append(mark, text);
      list.appendChild(line);
    }
    said.appendChild(list);
    root.appendChild(said);
    top += said.offsetHeight + 20;
  }

  const live = yard.session?.live;
  if (!thoughts.length && !live) return;

  const room = Math.max(60, floor - top);
  const stream = stack({ left: at.x, top, width: at.wide, height: room }, 20);
  stream.style.cssText +=
    ";font-family:'Cormorant Garamond',serif;overflow-y:auto;pointer-events:auto";

  const older = yard.session?.olderThoughts ?? 0;
  if (older) stream.appendChild(exact(`\u25b8 ${older} more before these`, 12, '#8a7452'));

  /* Oldest first and dimmest first, so the column brightens as it comes down
     to what is happening now. The last one is set large and is the only thing
     on this screen that is, unless it was said before the newest note, in
     which case it is history like the rest and the live edge is what the agent
     is doing about what you said since. */
  const keep = new Set<string>();
  thoughts.forEach((one, i) => {
    const far = thoughts.length - 1 - i;
    if (one.live) {
      keep.add(one.id);
      const it = keyed(document.createElement('div'), `thought:${one.id}`);
      it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
      const head = said(one.quiet ? 'thinking' : 'now', '#ffc98a');
      it.appendChild(head);
      const body = document.createElement('span');
      body.style.cssText = one.quiet
        ? 'font-size:18px;line-height:1.4;font-style:italic;color:rgba(255,220,164,.78)'
        : 'font-size:21px;line-height:1.35;color:#ffdca4;text-shadow:0 2px 10px rgba(0,0,0,.9)';
      ink(body, one.id, one.said, !walkedIn);
      it.appendChild(body);
      stream.appendChild(it);
      return;
    }
    stream.appendChild(
      keyed(
        thought(
          one,
          far > 2 ? 15 : 16,
          far > 2 ? 'rgba(244,227,192,.46)' : 'rgba(244,227,192,.62)'
        ),
        `thought:${one.id}`
      )
    );
  });
  forgetInk(keep);

  if (live) stream.appendChild(ember(live, since));

  root.appendChild(stream);
  /* It follows the live edge while you are at it, and stays put while you have
     scrolled up to read something, because being yanked back down in the
     middle of a sentence is worse than missing the next one. */
  const kept = followed.get(yard.session?.id ?? '');
  stream.scrollTop = kept === undefined || walkedIn ? stream.scrollHeight : kept;
  stream.addEventListener('scroll', () => {
    const atEdge = stream.scrollTop + stream.clientHeight >= stream.scrollHeight - 24;
    if (atEdge) followed.delete(yard.session?.id ?? '');
    else followed.set(yard.session?.id ?? '', stream.scrollTop);
  });
}

/** Where the column was left scrolled to, for a session somebody scrolled up in. */
const followed = new Map<string, number>();

/**
 * The live edge: a small fire with sparks going up off it, what it is doing,
 * and how long it has been at it.
 *
 * Not a spinner. Nothing here spins, and a spinner says only that something
 * is happening, which the fire already says. This says what, and for how long.
 */
function ember(live: Live, since: number | undefined): HTMLElement {
  const it = keyed(document.createElement('div'), 'live');
  it.style.cssText = `display:flex;align-items:center;gap:14px;position:relative;padding:${live.answering ? '0' : '6px'} 0 4px`;

  const hearth = document.createElement('div');
  hearth.style.cssText = 'position:relative;width:46px;height:32px;flex:none';
  hearth.appendChild(
    box(
      /* Kept inside the column, which scrolls and so clips: a pool of light cut
         off by the column's own edge is a box, and light here is never a box. */
      { left: -6, top: -26, width: 84, height: 84 },
      'background:radial-gradient(circle at 50% 50%,rgba(255,168,60,.34),rgba(0,0,0,0) 62%);animation:yard-glow 2.4s ease-in-out infinite;pointer-events:none'
    )
  );
  const fire = sprite(KIT_NAMES.fire, 1);
  fire.style.cssText +=
    ';left:0;top:0;animation:yard-flicker 480ms steps(2,end) infinite alternate';
  hearth.appendChild(fire);
  /* Sparks, each on its own clock so they never rise in step. */
  for (let i = 0; i < 6; i += 1) {
    const spark = box(
      { left: 10 + ((i * 7) % 14), top: 8, width: 2, height: 2 },
      `background:${i % 2 ? '#ffc98a' : '#ff8a4a'};animation:yard-spark ${1400 + i * 230}ms linear ${i * 310}ms infinite;opacity:0`
    );
    hearth.appendChild(spark);
  }
  it.appendChild(hearth);

  const words = document.createElement('div');
  words.style.cssText = 'display:flex;align-items:baseline;gap:10px;min-width:0';
  const doing = document.createElement('span');
  doing.style.cssText = [
    "font-family:'Josefin Sans',sans-serif",
    'font-size:13px',
    'letter-spacing:.16em',
    'text-transform:uppercase',
    'color:#ffc98a',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'animation:yard-breathe 2.4s ease-in-out infinite',
  ].join(';');
  doing.textContent = live.doing;
  words.appendChild(doing);
  if (since) {
    const count = exact(longFor(Date.now() - since), 12, '#bfa476');
    count.dataset.since = String(since);
    count.style.position = 'relative';
    words.appendChild(count);
  }
  it.appendChild(words);
  return it;
}

/** What a step of a posted plan looks like, behind them, under their hands, or ahead. */
const STEP: Record<string, string> = {
  done: 'rgba(244,227,192,.42)',
  doing: '#ffdca4',
  ahead: '#a89272',
};

/**
 * Somebody standing at the gate with a question.
 *
 * It takes the whole middle of the board, because whatever it was thinking
 * stopped when it came to ask and nothing under that matters until you answer.
 * A number key answers it; so does pressing the line, because a line you can
 * press by hand and not by key is only half there and the other way round is
 * no better.
 */
function gate(root: HTMLElement, at: { x: number; wide: number }, asking: Ask, does: Doings): void {
  root.appendChild(label('it is asking', { left: at.x, top: HEAD.label }));
  const said = box({ left: at.x, top: HEAD.top, width: at.wide }, ASKED);
  said.textContent = asking.said;
  root.appendChild(said);

  const answers = stack({ left: at.x, top: HEAD.top + 90, width: at.wide }, 12);
  for (const [i, answer] of asking.answers.entries()) {
    const line = row(12);
    const key = document.createElement('span');
    key.style.cssText = KEY;
    key.textContent = String(i + 1);
    line.appendChild(key);
    const press = astop(
      pressing(answer.said, () => does.answer(answer.id)),
      `answer:${answer.id}`
    );
    press.style.cssText += "font-family:'Josefin Sans',sans-serif;font-size:16px";
    line.appendChild(press);
    answers.appendChild(line);
  }
  root.appendChild(answers);
}

const ASKED = [
  "font-family:'Cormorant Garamond',serif",
  'font-size:21px',
  'line-height:1.35',
  'color:#ffdca4',
  'text-shadow:0 2px 10px rgba(0,0,0,.9)',
].join(';');

const KEY = [
  "font-family:'Courier Prime',monospace",
  'font-size:12px',
  'color:#482510',
  'background:#a89272',
  'padding:1px 6px',
  'flex:none',
].join(';');

function thought(one: Thought, size: number, ink: string, name?: string): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
  /* Only where there is something true to say. A thought with no clock on it
     gets no line above it at all rather than an empty one. */
  const label = name ? (one.when ? `${name} · ${one.when}` : name) : one.when;
  if (label) it.appendChild(said(label));
  const body = document.createElement('span');
  body.style.cssText = `font-size:${size}px;line-height:1.4;color:${ink}`;
  body.textContent = one.said;
  it.appendChild(body);
  return it;
}

/* ── what it made, what it did, and the ground ─────────────────────────────
   The cart at the top with whatever came out of the session on it, then the
   steps it took to get there with a prop from the kit standing for each, and
   at the foot of the column the yard itself: the fire, and everybody it sent
   out, placed by what they are doing rather than listed. */
function made(root: HTMLElement, at: { x: number; wide: number }, yard: Yard, floor: number): void {
  const session = yard.session;
  const output = session?.made[0];
  const steps_ = session?.steps ?? [];
  const hands = session?.agents ?? [];

  /* NOTHING IS WRITTEN OVER NOTHING.
   *
   * A heading with an empty column under it does not say "this has not
   * happened yet", it says the screen is broken. So a section that has nothing
   * in it is not drawn at all: no cart until something has come off one, no
   * list of what it did until it has done something, no yard until it has sent
   * somebody out. The column's own rule goes with them, because a line down an
   * empty third of the screen is the same lie in thinner form. */
  if (!output && !steps_.length && !hands.length) return;

  root.appendChild(
    rule({ left: at.x - GUTTER / 2, top: HEAD.rule + 12, width: 1, height: floor - HEAD.rule - 12 })
  );

  /* The ground is the foot of this column whatever happened above it, so
     everything else in here gets the room between the header and the yard and
     not one pixel more. In a short window that means the cart loses its
     itinerary and then what it did loses its beginning, in that order, rather
     than either of them being written over the ground. */
  const patch = hands.length ? floor - YARD_BOX.tall : floor;
  const room = Math.max(0, patch - 44 - HEAD.top);
  const above = box({ left: at.x, top: HEAD.top, width: at.wide, height: room }, 'overflow:hidden');
  root.appendChild(above);

  let y = 0;
  if (output) {
    root.appendChild(label('what it made', { left: at.x, top: HEAD.label }));
    y = cart(above, at.wide, output);
  }

  if (steps_.length) {
    if (output) above.appendChild(rule({ left: 0, top: y + 10, width: at.wide }));
    const where = output ? { left: 0, top: y + 30 } : { left: at.x, top: HEAD.label };
    (output ? above : root).appendChild(label('what it did', where));
  }

  const top = output ? y + 60 : 0;
  const left = Math.max(0, room - top);
  const steps = stack({ left: 0, top, width: at.wide, height: left }, 10);
  steps.style.cssText +=
    ";font-size:14px;line-height:1.3;font-family:'Josefin Sans',sans-serif;overflow:hidden";
  const earlier = session?.olderSteps;
  const count = exact('', 12, '#8a7452');
  steps.appendChild(count);
  for (const one of steps_) steps.appendChild(keyed(did(one), `step:${one.id}`));
  if (steps_.length) above.appendChild(steps);

  /* Appended first and counted after, because how many fit is a thing only the
     browser knows once the sprites in them have a height. */
  const dropped = trim(steps, left, 1);
  const many = (earlier?.many ?? 0) + dropped;
  count.textContent = many
    ? `\u25b8 ${many} earlier steps${earlier ? ` \u00b7 ${earlier.over}` : ''}`
    : '';

  /* And the ground only once there is somebody standing on it. The fire is
     already said by the light of the whole screen and by the lantern on the
     rail, so a framed patch of dirt with nobody in it is a box for its own
     sake. */
  if (hands.length) ground(root, at, yard, floor);
}

/** The billboard and what is nailed to it. Returns where the next thing goes. */
function cart(root: HTMLElement, wide: number, output: Made): number {
  const board = sprite(KIT_NAMES.billboard, 2);
  board.style.cssText += ';left:0;top:-4px;filter:brightness(1.35)';
  root.appendChild(board);

  const beside = stack({ left: 148, top: 4, width: wide - 148, height: 104 }, 4);
  beside.style.overflow = 'hidden';
  const name = document.createElement('span');
  name.style.cssText =
    "font-family:'Caveat',cursive;font-size:22px;color:#f4e3c0;text-shadow:1px 2px 0 #120d07";
  name.textContent = output.what;
  beside.appendChild(name);
  const when = said(output.when, '#a8c469');
  when.style.cssText += ';font-size:12px;letter-spacing:.14em';
  beside.appendChild(when);
  if (output.warning) {
    const warn = document.createElement('span');
    warn.style.cssText = 'font-size:13px;color:#ff9a6a;margin-top:4px';
    warn.textContent = output.warning;
    beside.appendChild(warn);
  }
  root.appendChild(beside);
  /* What is nailed beside the board is the name, then when, then what is wrong
     with it, in that order of importance, and a board with no room for the
     third says two things rather than two and a half. */
  while (beside.scrollHeight > 104 && beside.children.length > 1) beside.lastChild?.remove();

  const lines = stack({ left: 0, top: 120, width: wide }, 6);
  for (const said of output.lines) {
    const line = document.createElement('span');
    line.style.cssText =
      "font-family:'Josefin Sans',sans-serif;font-size:14px;line-height:1.45;color:#dcc8a0";
    line.textContent = said;
    lines.appendChild(line);
  }
  root.appendChild(lines);
  return 120 + output.lines.length * 26 + 10;
}

/** One thing it did, with the prop that stands for it in a fixed slot. */
function did(one: Step): HTMLElement {
  const line = row(10);
  const slot = document.createElement('span');
  slot.style.cssText = 'width:44px;display:flex;justify-content:center;flex:none;position:relative';
  if (one.running) {
    /* Nothing spins in this village. Something happening now is a light that
       goes on and off, which is what a fire does. */
    slot.appendChild(
      box(
        { width: 11, height: 11 },
        'position:relative;border-radius:50%;background:#ff8a4a;box-shadow:0 0 0 5px rgba(255,138,74,.22);animation:yard-blink 700ms steps(1,end) infinite'
      )
    );
  } else {
    const prop = sprite(one.prop, 1);
    prop.style.position = 'relative';
    slot.appendChild(prop);
  }
  line.appendChild(slot);
  const text = document.createElement('span');
  /* Two lines and then it stops, because a step cut off mid-word halfway
     across the column reads as the board being broken, and a third line is
     the step telling you more than you glanced over for. */
  text.style.cssText =
    'white-space:normal;min-width:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden';
  text.style.color = one.running ? '#ffc98a' : '#f4e3c0';
  text.textContent = one.note ? `${one.did} · ${one.note}` : one.did;
  line.appendChild(text);
  return line;
}

/**
 * A project with nobody in it yet.
 *
 * The ground is still the ground and the fire is still cold in the middle of
 * it, so the yard is drawn as it always is. What is missing is every word: no
 * notes on the gatepost, nothing being thought, nothing on the cart. Writing
 * three headings over three empty columns says the board is broken rather than
 * that the work has not started, so it says that instead, once.
 */
function nobody(
  root: HTMLElement,
  at: { x: number; wide: number },
  patch: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): void {
  const line = box({ left: at.x, top: HEAD.top + 6, width: 520 }, EMPTY);
  line.textContent = 'nobody has worked in here yet.';
  root.appendChild(line);

  const how = box({ left: at.x, top: HEAD.top + 34, width: 520 });
  how.appendChild(exact('say what you want built, or hang a lantern on the rail.', 12, '#8a7a5e'));
  root.appendChild(how);

  /* The one thing this board still offers about the project itself, in the
     same place it sits when there is work here, so it does not move when the
     first session arrives. Nothing else: an empty project has no ground worth
     framing, no cart and nothing to have done. */
  elsewhere(root, at, yard, floor, does);
}

/**
 * The ground, and everybody on it.
 *
 * A patch rather than a list. The fire is the session, and where somebody is
 * standing is what they are doing: in the light with their face to you means
 * back with an answer, out in the dark with their back turned means still
 * working, and the further out the longer they have been gone. Only the ones
 * that need you get named; everybody else is a body, and a count says the rest.
 */
function ground(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number
): void {
  const hands = yard.session?.agents ?? [];
  const top = floor - YARD_BOX.tall;
  root.appendChild(rule({ left: at.x, top: top - 36, width: at.wide }));

  const head = box({ left: at.x, top: top - 22, width: at.wide }, HEAD_ROW);
  const name = label('the yard', {});
  name.style.position = 'relative';
  head.appendChild(name);
  const back = hands.filter((one) => one.where === 'in-light').length;
  /* A count of nobody is not information. An empty yard says so by being
     empty and by the fire being out in the middle of it. */
  if (yard.session) {
    head.appendChild(
      exact(`${hands.length} hands · ${back} back · ${hands.length - back} out`, 11, '#bfa476')
    );
  }
  root.appendChild(head);

  /* A window onto the ground, not a picture of one. The village is already
     drawn behind this whole screen, so the patch is a hole in the writing with
     a frame round it: what the agents are standing on is the actual land of
     this district, at the same light as the rest of the yard, warmed by the
     fire. A filled rectangle here was a brown slab with a campfire on it. */
  const patch = box(
    { left: at.x, top, width: at.wide, height: YARD_BOX.tall },
    'overflow:hidden;background:transparent;border:2px solid #3a2712'
  );
  patch.style.position = 'absolute';

  /* The fire sits a little below and left of centre, and its light is the only
     thing telling you where the middle of this place is. */
  const fireX = Math.round(at.wide / 2) - 23;
  const fireY = 117;
  const burning = yard.session?.fire ?? 'out';
  patch.appendChild(
    firelight(
      { left: fireX - 147, top: fireY - 104, width: 340, height: 240 },
      FIRELIGHT[burning],
      false
    )
  );
  /* The fire is the session. Lit is somebody working, banked is somebody who
     has stopped and is standing at the gate, embers is finished, and out is
     nobody home. Only a lit fire breathes; a banked one is still. */
  const fire = sprite(burning === 'out' ? KIT_NAMES.fireOut : KIT_NAMES.fire, 1);
  fire.style.cssText += `;left:${fireX}px;top:${fireY}px`;
  if (burning === 'lit') {
    fire.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
  }
  if (burning === 'banked') fire.style.filter = 'brightness(.62)';
  if (burning === 'embers') fire.style.filter = 'brightness(.45) saturate(.8)';
  patch.appendChild(fire);

  for (const [i, hand] of hands.entries()) patch.appendChild(standing(hand, i, at.wide));

  const here = yard.session;
  if (here) {
    const under = exact(
      `${here.agent}${here.thoughts.find((t) => t.live)?.at ? ` · ${here.thoughts.find((t) => t.live)?.at}` : ''}`,
      11,
      '#dcc8a0'
    );
    const at2 = box({ left: fireX - 20, top: fireY + 37 });
    at2.appendChild(under);
    patch.appendChild(at2);
  }

  root.appendChild(patch);
}

const EMPTY = ["font-family:'Josefin Sans',sans-serif", 'font-size:14px', 'color:#a89272'].join(
  ';'
);

const HEAD_ROW =
  'display:flex;align-items:baseline;justify-content:space-between;white-space:nowrap';

/** How much light each way of burning throws. */
const FIRELIGHT: Record<Fire, number> = { lit: 0.34, banked: 0.2, embers: 0.12, out: 0.04 };

/** One agent, standing where their state puts them. */
function standing(hand: Hand, i: number, wide: number): HTMLElement {
  const out = hand.where === 'out';
  /* In the light they cluster round the fire; out in the dark they are off to
     the side, and further off the longer they have been gone. */
  const near = [
    { left: Math.round(wide / 2) - 50, top: 70, flip: true },
    { left: Math.round(wide / 2) + 32, top: 72, flip: false },
    { left: Math.round(wide / 2) - 10, top: 102, flip: false },
  ];
  const spot = out
    ? { left: wide - 38 - (i % 2) * 16, top: 30 + (i % 3) * 28, flip: false }
    : (near[i % near.length] ?? near[0]!);

  const it = box({ left: spot.left, top: spot.top, width: 28, height: 54 });
  const figure = folk(out ? 'back' : 'front', { left: 0, top: 0 });
  figure.style.filter = out ? 'brightness(.5) saturate(.6)' : 'brightness(.95)';
  if (out) figure.style.animation = 'yard-step 800ms steps(2,end) infinite';
  if (spot.flip) figure.style.transform = 'scaleX(-1)';
  /* Identity, never status: an agent keeps its colour for the life of the
     session, so you can follow the same one across the yard. */
  figure.style.mixBlendMode = 'normal';
  it.appendChild(figure);

  if (out) {
    it.appendChild(
      box(
        { left: -6, top: -8, width: 8, height: 8 },
        'border-radius:50%;background:#ff8a4a;animation:yard-blink 700ms steps(1,end) infinite'
      )
    );
    const name = box({ left: -66, top: 52 });
    name.appendChild(exact(`${hand.errand} · out ${hand.gone ?? ''}`.trim(), 11, '#ffc98a'));
    it.appendChild(name);
  }
  return it;
}

/**
 * What is in your hands, beside the line.
 *
 * A picture is the one thing an agent can be shown, and it cannot be drawn on
 * the board, because the board is writing. So what the board says is that you
 * have it: it waits here until you say something and then goes with what you
 * said, and pressing it puts it down again.
 */
function carried(hands: HTMLElement, yard: Yard, does: Doings): void {
  hands.replaceChildren();
  for (const one of yard.session?.carrying ?? []) {
    const held = astop(
      pressing(`▣ ${one.name}`, () => does.press(`putdown:${one.id}`)),
      `carrying:${one.id}`
    );
    held.style.cssText += "font-family:'Courier Prime',monospace;font-size:12px";
    hands.appendChild(held);
  }
}

/* ── the one place you write ───────────────────────────────────────────────
   One line, no box, no hint, and a cursor that is the only thing on this
   screen saying the app is awake. */
/**
 * What you said while somebody was busy and they have not heard yet.
 *
 * It waits in the open above the line rather than disappearing into a queue,
 * because a thing you said that has not happened yet is a thing you might want
 * back, and pressing one takes it back.
 */
function still(at: HTMLElement, yard: Yard, does: Doings): void {
  at.replaceChildren();
  const waiting = yard.session?.waiting ?? [];
  if (!waiting.length) return;
  at.style.cssText += ';display:flex;flex-direction:column;gap:4px;background:rgba(72,37,16,.72)';
  at.appendChild(label('still to say, press to take one back', {}));
  for (const one of waiting) {
    const press = keyed(
      astop(
        pressing(one.said, () => does.press(`unsay:${one.id}`)),
        `unsay:${one.id}`
      ),
      `waiting:${one.id}`
    );
    press.style.cssText += "font-family:'Caveat',cursive;font-size:18px";
    at.appendChild(press);
  }
}

function said_line(root: HTMLElement, edge: number): void {
  root.appendChild(rule({ left: edge, right: edge, bottom: 186 }, true));
}

/* ── the rail ──────────────────────────────────────────────────────────────
   One lantern per session, hung off a beam. Lit means somebody is awake in
   there; dark is resting, still being cut, or broken. The one you are standing
   in hangs lowest and brightest, and the one that wants you flickers. */
function rail(root: HTMLElement, yard: Yard, cramped: boolean, edge: number, does: Doings): void {
  const beam = box({
    left: edge,
    right: edge,
    bottom: 0,
    height: cramped ? RAIL_BARE : RAIL_TALL,
  });
  beam.appendChild(box({ left: 0, right: 0, top: 0, height: 3 }, 'background:#3a2712'));

  /* Evenly along whatever beam there is, never wider apart than the designs
     hang them and never so close that two names touch. Past that the beam
     scrolls sideways rather than the lanterns getting any nearer. */
  const room = window.innerWidth - edge * 2;
  /* One more hook than there are lanterns, because the end of the rail is
     where a new session gets hung. */
  const step = Math.min(LANTERN_STEP, Math.floor(room / (yard.rail.length + 1)));
  const bare = cramped || step < 140;

  for (const [i, one] of yard.rail.entries()) {
    const x = i * step;
    const cord = one.here ? LANTERN.cordHere : LANTERN.cord;
    const top = 3 + cord;
    beam.appendChild(box({ left: x + 10, top: 3, width: 3, height: cord }, 'background:#3a2712'));

    if (one.lit) {
      const strength = one.here ? 0.3 : one.posture === 'wants-you' ? 0.16 : 0;
      if (strength) {
        beam.appendChild(
          firelight({ left: x - 34, top: top - 24, width: 90, height: 90 }, strength)
        );
      }
    }

    const lamp = keyed(
      sprite(one.lit ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 2),
      `lantern:${one.id}`
    );
    lamp.style.cssText += `;left:${x}px;top:${top}px`;
    if (!onTheBeam.has(one.id)) {
      onTheBeam.add(one.id);
      lamp.style.animation = 'yard-hang 240ms steps(3,end)';
    }
    const dimmed = one.here ? '' : 'brightness(.75)';
    lamp.style.filter = dimmed;
    if (one.posture === 'wants-you') {
      lamp.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
    }
    beam.appendChild(lamp);

    /* The one place in this app where a pressable thing is not gold.
       Everywhere else gold means "press me" and nothing else is gold; the rail
       keeps its posture tints because the rail's whole job is telling you, from
       across the room and without reading, which session wants you. Six gold
       names in a row would say nothing at all. What says it is pressable is the
       lantern: a physical object hanging there, lighting under your hand. */
    const hung = keyed(
      box({ left: x, top, width: bare ? 44 : Math.max(step, 120), height: 58 }),
      `hung:${one.id}`
    );
    hung.style.pointerEvents = one.here ? 'none' : 'auto';
    hung.style.cursor = 'default';

    /* A short window keeps the lanterns and gives up the words beside them:
       lit, dark, flickering and hanging lowest still say which is which. */
    if (!bare) {
      const name = box({ left: 34, top: 2 });
      const written = exact(one.name, one.here ? 13 : 12, one.here ? '#ffdca4' : TONE[one.posture]);
      /* The keyboard stands on the name rather than on the whole lantern,
         because the mark it leaves is a fill and a fill the size of a lantern
         is a slab of gold across the bottom of the screen. */
      if (!one.here) astop(written, `rail:${one.id}`);
      name.appendChild(written);
      hung.appendChild(name);
      const under = box({ left: 34, top: 20 });
      under.appendChild(exact(one.saying, 11, one.here ? '#dcc8a0' : '#a89272'));
      hung.appendChild(under);
    }

    if (!one.here) {
      if (bare) astop(lamp, `rail:${one.id}`);
      hung.addEventListener('mousedown', (event) => event.preventDefault());
      hung.addEventListener('click', () => does.open(one.id));
      hung.addEventListener('pointerenter', () => (lamp.style.filter = 'brightness(1.15)'));
      hung.addEventListener('pointerleave', () => (lamp.style.filter = dimmed));
    }
    beam.appendChild(hung);
  }

  /* THE END OF THE RAIL IS HOW A SESSION STARTS.
   *
   * It was three words of small type floating under a bare cord, and the one
   * thing somebody opening a project for the first time needs to find. So it
   * is hung the way the lanterns beside it are hung: an unlit lamp on the
   * hook, its name in gold where their names are, and what it does underneath
   * where their doing is. The whole of it takes the press, so the target is a
   * lantern rather than a line of twelve-point monospace. */
  const spare = yard.rail.length * step;
  const cord = 3 + LANTERN.cord;
  beam.appendChild(box({ left: spare + 10, top: 3, width: 3, height: LANTERN.cord }, HOOK));

  const lamp = sprite(KIT_NAMES.lanternOff, 2);
  lamp.style.cssText += `;left:${spare}px;top:${cord}px;filter:brightness(.7)`;
  beam.appendChild(lamp);

  const hook = box({ left: spare, top: cord, width: bare ? 44 : Math.max(step, 150), height: 58 });
  hook.style.pointerEvents = 'auto';
  hook.style.cursor = 'default';
  if (!bare) {
    const name = box({ left: 34, top: 2 });
    const start = astop(
      pressing('a new session', () => does.press('new')),
      'rail:new'
    );
    start.style.cssText += "font-family:'Courier Prime',monospace;font-size:13px";
    name.appendChild(start);
    hook.appendChild(name);
    const under = box({ left: 34, top: 20 });
    under.appendChild(exact('the hook is empty', 11, '#a89272'));
    hook.appendChild(under);
  } else {
    astop(lamp, 'rail:new');
  }
  hook.addEventListener('mousedown', (event) => event.preventDefault());
  hook.addEventListener('click', () => does.press('new'));
  hook.addEventListener('pointerenter', () => (lamp.style.filter = 'brightness(1.1)'));
  hook.addEventListener('pointerleave', () => (lamp.style.filter = 'brightness(.7)'));
  beam.appendChild(hook);
  root.appendChild(beam);
}

const HOOK = 'background:#3a2712';
