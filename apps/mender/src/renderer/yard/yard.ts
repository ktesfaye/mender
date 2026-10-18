/**
 * The yard.
 *
 * You open a project and you are standing in its yard at night. What you asked
 * for is nailed to a gatepost on the left. What the agent is thinking rises off
 * the fire in the middle, getting brighter and larger the more recent it is.
 * What it has made is loaded on the cart to the right, and under that is the
 * ground itself, with everybody it sent out standing either in the firelight
 * with an answer or out in the dark still working. Along the bottom, one
 * lantern per session in the project, yours the brightest.
 *
 * There is no roster board and there is no second board. A session is not
 * something you navigate to from a list; it is where you already are, and the
 * lanterns are how you get to the others.
 *
 * Everything here is written on the layer over the village rather than drawn
 * into it. Nothing in this file talks to the wire: it is handed a `Yard` and it
 * writes it down.
 */

import type { Drew } from '@shared/building';
import { sessionLine } from '@shared/five-hours';
import type { Offer } from '../board/offer';
import {
  arrange,
  arrangement,
  bringBack,
  hidden,
  moved,
  PART_NAME,
  putAway,
  putAwayHere,
  save as keepArrangement,
  standIn,
  unmove,
  type Part,
} from './arrange';
import type { Building } from './building';
import { GUTTER, MARGIN, type Layer } from './frame';
import { longFor } from './from';
import { waitOut } from './limit';
import { makeLine, preview, unpreview, type Asking as Prompting, type Line } from './line';
import { makeMenu } from './menu';
import {
  arrive,
  catching,
  closeUp,
  FOLD_MS,
  foldAway,
  dwindling,
  forgetInk,
  keyed,
  leave,
  leavingInPlace,
  lettingGo,
  measure,
  measureParts,
  play,
  steppingOff,
  sweepingIn,
  swelling,
  unfold,
} from './motion';
import { packed } from './pack';
import { holdUp } from './picture-view';
import { larger, onThisMachine } from './pictures';
import { pressing } from './press';
import { prose } from './prose';
import { makeScrim, type Reading } from './scrim';
import { KIT_NAMES, emberLantern, greenLantern, sprite } from './sprite';
import { stand as standAsking } from './standing';
import { astop, walking, type Walking } from './walk';
import type {
  Asking as Ask,
  Chapter,
  Fire,
  Hand,
  Live,
  Note,
  Posture,
  Session,
  Signboard,
  Step,
  StepKind,
  Story,
  Thought,
  Yard,
} from './what';
import { hiddenCount, revealMore, windowStart } from './window';
import { box, exact, firelight, folk, label, row, rule, said, stack } from './write';

/*
 * On a Mac the window's own three buttons float over the top left corner of
 * the world, so everything from the title down starts under them. Sitting
 * beside them on the same line reads as the name being jammed into the
 * window's frame, however much room there is between them.
 */
const LIFT = /Mac/.test(navigator.userAgent) ? 30 : 0;

/* Where the bands sit, measured off the designs, with one change: the top
   right corner belongs to the projects shelf, so the two facts the designs put
   up there drop below it and the whole band is that much deeper. */
const HEAD = {
  title: 22 + LIFT,
  meta: 56 + LIFT,
  aside: 70 + LIFT,
  under: 92 + LIFT,
  rule: 112 + LIFT,
  /* Everything under the rule stands lower by however far the workspaces'
     signboards hang from it, which is nothing while there are none. */
  get below(): number {
    return 124 + LIFT + hung;
  },
  get label(): number {
    return 132 + LIFT + hung;
  },
  get top(): number {
    return 162 + LIFT + hung;
  },
};
/* How far under the beam the signboards reach, once a project has a
   workspace besides its own folder. */
const SIGNS = 50;
let hung = 0;
/* From the beam down to the bottom edge, which is what the rail lives in. Less
   of it when the lanterns are hanging bare, since there are no words under
   them to leave room for. */
const RAIL_TALL = 118;
/** The write line's own height at one row of writing. */
const ONE_ROW = 27;
/** Where what is still to say stands, over a line one row tall. */
const STILL_AT = 196;
const RAIL_BARE = 76;
/* How much of a lantern is the lantern itself. */
const LANTERN = { wide: 22, tall: 38, cord: 16 };

/** What the five postures look like when they are a name on a lantern. */
const TONE: Record<Posture, string> = {
  working: '#f4e3c0',
  'wants-you': '#ff9a6a',
  done: 'var(--yard-well)',
  /* A limit is a wait, not a reason to come: its name stays the idle tan, so
     it is never read across the room as one that wants you. The red is in
     the line under it and the glass. */
  waiting: '#a89272',
  broken: 'var(--yard-wrong)',
  resting: '#a89272',
};

/** And the line under the name, a step quieter than the name in the same hue. */
const SAYS: Record<Posture, string> = {
  working: '#a89272',
  'wants-you': '#e0a07a',
  done: '#9aae70',
  waiting: '#c4705f',
  broken: '#b86a60',
  resting: '#7d6a50',
};

/** The light a lantern throws round itself, by what it is saying: the colour
    and how strong. Idle, broken and still being set up throw none. */
const HALO: Partial<Record<Posture, [string, number]>> = {
  working: ['255,168,60', 0.14],
  'wants-you': ['255,120,60', 0.28],
  done: ['168,196,105', 0.26],
  waiting: ['242,102,90', 0.34],
};

/** What a thought that went wrong is headed with, and written in. */
/** Called off: neither wrong nor finished, so neither sore nor green. */
const STOPPED = '#c9a57a';

const TROUBLE = {
  wrong: { head: 'it stopped', ink: 'var(--yard-wrong)' },
  warn: { head: 'it stopped short', ink: 'var(--yard-warn)' },
  aside: { head: 'it warns', ink: 'var(--yard-wrong)' },
  stopped: { head: 'you stopped it', ink: STOPPED },
  closed: { head: 'the village closed', ink: STOPPED },
} as const;

/** Over the conversation being packed down, while it is and once it has. */
const PACKING = {
  packing: { head: 'packing', ink: '#ffc98a' },
  packed: { head: 'packed', ink: '#a8c469' },
} as const;

/** How the newest answer's turn stands, said over it: still going, finished, or called off. */
const ENDED = {
  going: { head: 'so far', ink: '#ffc98a' },
  running: { head: 'still running in the background', ink: '#ffc98a' },
  done: { head: 'done', ink: '#a8c469' },
  stopped: { head: 'you stopped it', ink: STOPPED },
  closed: { head: 'the village closed', ink: STOPPED },
  cut: { head: 'cut off', ink: '#e0866a' },
} as const;

export interface Doings {
  /** Walk into another session in this project. */
  open(id: string): void;
  /** Something on a board of rows was pressed. */
  press(pick: string): void;
  /** Something was typed, for whatever is narrowing under the line. */
  typed(said: string): void;
  /** Answer the question somebody is standing at the gate with, or, on a
   *  multi-select one, mark which pending question this answer belongs to. */
  answer(id: string, requestId?: string): void;
  /** Say something on the line. */
  say(said: string): void;
  /** Escape with nothing left on the line to throw away. */
  leave(): void;
  /** Call off what it is working on, but only if nothing has come of it yet,
   *  and put it back on the line. Whether it did. */
  takeBack?(): Promise<boolean>;
  /** What deleting a workspace would throw away, said before it is done. */
  dropCost?(id: string): Promise<string>;
  /** What closing these sessions would throw away, said before it is done. */
  closeCost?(ids: string[]): Promise<string>;
  /** Close these sessions, standing in `keep` if the one you are in goes. */
  closeMany?(ids: string[], keep: string): void;
}

export interface Standing {
  /** Rewrite everything. Cheap: the yard is a couple of hundred elements. */
  show(yard: Yard): void;
  /** What the line is asking for at the moment. */
  asks(what: Prompting): void;
  /** Write the lines a slash or an @ has opened under the line. */
  narrowing(offers: Offer[], from: number): void;
  /** Whether a slash or an @ has a list open with a line of it picked out. */
  narrowed(): boolean;
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
  /** A key for the question at the gate, wherever the keyboard is; true if it took it. */
  answerKey(event: KeyboardEvent): boolean;
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

/**
 * Which way along the rail from one yard to the next: right is on, left is
 * back, and the empty hook is past the last lantern.
 */
function wayAlong(before: Yard, yard: Yard): number {
  const at = (of: Yard): number => {
    const i = of.rail.findIndex((one) => one.here);
    return i < 0 ? of.rail.length : i;
  };
  return Math.sign(at(yard) - at(before));
}

/** The workspace a yard is standing in, when the project has any. */
function boardOf(yard: Yard | undefined): string | undefined {
  return yard?.workspaces?.find((one) => one.here)?.id;
}

/**
 * Over to another workspace rather than along to a neighbour: a different
 * rail of lanterns altogether, so which way is read off the beam above.
 */
function crossedBoards(before: Yard, yard: Yard): boolean {
  return (
    Boolean(before.workspaces?.length && yard.workspaces?.length) &&
    boardOf(before) !== boardOf(yard)
  );
}

function wayAcross(before: Yard, yard: Yard): number {
  const boards = inBeamOrder(yard.workspaces ?? []);
  const from = boards.findIndex((one) => one.id === boardOf(before));
  const to = boards.findIndex((one) => one.here);
  return from < 0 || to < 0 ? 1 : Math.sign(to - from) || 1;
}

/** In another workspace the lanterns are somebody else's, so they go with
    the session rather than standing on the rail. */
function lanternsMove(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-key^="lantern:"]')) {
    if (el.dataset.key !== 'lantern:+') el.dataset.moves = '';
  }
}

/** Part of the place rather than the session, so a switch leaves it standing. */
function stays<T extends HTMLElement>(el: T, name: string): T {
  el.dataset.stays = name;
  return el;
}

/** The session's own, even sitting inside something that stays. */
function moves<T extends HTMLElement>(el: T): T {
  el.dataset.moves = '';
  return el;
}

/** The session whose name at the top is being written over, and what is
    written so far. Held out here because the yard is drawn afresh on every
    change, and a rename has to survive the agent saying something meanwhile. */
let renaming: { id: string; written: string; caret: number } | null = null;

/** The same for a workspace's signboard, which the beam redraws as often. */
let renamingBoard: { id: string; written: string; since?: number } | null = null;

/** How long a switch waits on a waking session before showing it waking. */
const WAKE_HELD_MS = 320;

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
  const stillAt = box({ left: 0, right: 0, bottom: STILL_AT }, 'padding:8px 0');
  stage.appendChild(stillAt);
  const line = makeLine(writing);
  /* How far the line has grown past its one row. Everything above it, the
     rule, what is still to say and the bottoms of the columns, stands that
     much higher, so a long thing being written pushes the board up instead of
     being written over it. */
  let grown = 0;
  new ResizeObserver(() => {
    const tall = Math.round(writing.getBoundingClientRect().height);
    const now = tall > ONE_ROW + 6 ? tall - ONE_ROW : 0;
    if (now === grown) return;
    grown = now;
    stillAt.style.bottom = `${STILL_AT + grown}px`;
    if (last && stage.style.display !== 'none') redraw();
  }).observe(writing);
  /* And what a slash or an @ has opened stands on the line itself, its left
     edge on the slash you typed, the way a completion list stands on a caret.
     It is its own small solid slab rather than more writing on the wash,
     because a list of names read over a transcript was two things to read at
     once. It goes the moment the line stops asking for it. */
  const menu = makeMenu(stage, does.press, (pick) => walk.stand(pick));
  /* What the menu last had on it, so a change of list moves the mark. */
  let lastNarrowed = '';
  /* Where on the line what opened it starts, for standing it there. */
  let narrowedFrom = 0;
  /* Escape closes the list and keeps what you wrote. It stays closed until
     what you wrote changes, which is what a list you dismissed is expected to
     do everywhere else. */
  let dismissedAt: string | null = null;
  /* Walk and press it by key, before anything else hears about the key: the
     line is where your hands are and this is what the line has open. */
  line.onKey((event) => {
    /* A question up at the gate takes the arrows, return and the numbers
       while the line is empty: you are answering it, not writing. */
    if (menu.root.style.display === 'none' && askKey(last?.asking, line.written(), event, does))
      return true;
    /* Tab and shift-Tab step along the rail to the next session and the one
       before, whatever is half written, unless a list is open under the line
       and Tab is how it is picked. The line is where your hands are, so the
       step is taken here rather than letting the key fall through to the
       browser's own idea of Tab, which is to move the focus off the line. */
    const tabbed = event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey;
    if (menu.root.style.display === 'none') {
      if (tabbed) {
        does.press(event.shiftKey ? 'rail:back' : 'rail:forward');
        return true;
      }
      return recall(event);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      walk.step(event.key === 'ArrowDown' ? 1 : -1);
      return true;
    }
    if (tabbed && !event.shiftKey && walk.press()) return true;
    if (tabbed) {
      does.press(event.shiftKey ? 'rail:back' : 'rail:forward');
      return true;
    }
    if (event.key === 'Escape') {
      dismissedAt = line.written();
      menu.write([]);
      walk.stand(null);
      return true;
    }
    return false;
  });
  /* The arrows on the line walk back through what you have said here, the way
     a shell's do: up is the one before, down comes forward again and past the
     newest gives back whatever you had half-written. Only while the line is
     empty or still holding one it put there, so arrowing through a sentence
     you are in the middle of moves the caret, not the sentence. */
  let recalled = -1;
  let draft = '';
  let recalledIn: string | undefined;
  function fill(text: string): void {
    line.write(text);
    line.take();
    does.typed(text);
  }
  function recall(event: KeyboardEvent): boolean {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return false;
    if (event.shiftKey || event.metaKey || event.altKey || event.ctrlKey) return false;
    const notes = last?.session?.notes ?? [];
    if (recalledIn !== last?.session?.id) recalled = -1;
    const written = line.written();
    /* What is still waiting its turn comes off the queue first, all of it
       back on the line together, the way Claude Code's own up arrow does. */
    const queued = (last?.session?.waiting ?? []).filter((one) => !one.handed);
    if (event.key === 'ArrowUp' && recalled < 0 && written === '' && queued.length) {
      for (const one of queued) does.press(`unsay:${one.id}`);
      fill(queued.map((one) => one.said).join('\n'));
      return true;
    }
    /* Up on a turn that has not come to anything yet is "not yet": it is
       called off and what was asked comes back to the line. Once it has
       started answering, up walks back through what was said, as ever. */
    const session = last?.session;
    if (
      event.key === 'ArrowUp' &&
      recalled < 0 &&
      written === '' &&
      session?.fire === 'lit' &&
      does.takeBack
    ) {
      void does.takeBack().then((took) => {
        if (took || last?.session?.id !== session.id || line.written() !== '') return;
        goBack(1, '');
      });
      return true;
    }
    const untouched = recalled < 0 ? written === '' : written === notes[recalled]?.said;
    if (!untouched) {
      recalled = -1;
      return false;
    }
    return goBack(event.key === 'ArrowUp' ? 1 : -1, written);
  }
  function holdsRecalled(): boolean {
    if (recalled < 0 || recalledIn !== last?.session?.id) return false;
    return line.written() === last?.session?.notes?.[recalled]?.said;
  }
  function goBack(by: number, written: string): boolean {
    const notes = last?.session?.notes ?? [];
    const to = recalled + by;
    if (recalled < 0 && (to < 0 || !notes.length)) return false;
    if (to >= notes.length) return true;
    if (recalled < 0) draft = written;
    recalled = to;
    recalledIn = last?.session?.id;
    fill(to < 0 ? draft : (notes[to]?.said ?? ''));
    return true;
  }
  /* Where the words were on the line the moment they were said, so that if
     they turn out to be for the agent they can be seen leaving from there. */
  let lastSaid: { text: string; rect: DOMRect } | null = null;
  line.onSay((text, rect) => {
    recalled = -1;
    lastSaid = rect ? { text, rect } : null;
    does.say(text);
  });
  /* Return means whatever the slash or the @ has picked out, when one of them
     is open. The first line of either is already standing under the keyboard,
     because a list you have to arrow into before Return does anything is a
     list that made you press two keys to do one thing. */
  line.onInstead(standingInOverlay);
  line.onWaiting(() => (last?.session?.waiting ?? []).some((one) => !one.handed));

  /** Whether the keyboard's mark is on one of the lines the overlay opened. */
  function standingInOverlay(): boolean {
    if (menu.root.style.display === 'none' || !walk.on) return false;
    return Boolean(menu.root.querySelector(`[data-walk="${CSS.escape(walk.on)}"]`));
  }
  line.onEmpty(() => does.leave());
  line.onType((text) => does.typed(text));
  line.onPutDown((id) => does.press(`putdown:${id}`));
  line.onPickBack((id) => does.press(`pickback:${id}`));

  /* And the wash that comes down over the middle and right of the screen when
     you open something to read. The gatepost keeps its own column and the rail
     keeps its own strip, so neither is ever covered. */
  const scrim = makeScrim(stage, does.press);

  const walk = walking(layer.root);

  /* Where the wash comes down, which is the same whether or not there is a
     yard under it: from the gatepost's own column to the right edge. */
  function lay(): void {
    const columns = layer.columns(rightEmpty(last), leftEmpty(last));
    const floor = window.innerHeight - MARGIN - RAIL_TALL - 60 - grown;
    scrim.place(
      columns.thinking.x - GUTTER / 2,
      MARGIN - 8,
      HEAD.below - 12,
      window.innerHeight - floor - 20
    );
    writing.style.left = `${layer.edge()}px`;
    writing.style.right = `${layer.edge()}px`;
    stand();
    /* Clear of the gatepost, because the gatepost has its own things to say
       down there and two columns of writing on the same line is a mess. */
    stillAt.style.left = `${columns.thinking.x}px`;
    stillAt.style.right = `${layer.edge()}px`;
  }

  /** Stand the menu on the line, at whatever opened it. */
  function stand(): void {
    if (menu.root.style.display === 'none') return;
    const at = line.at(narrowedFrom);
    const top = line.root.getBoundingClientRect().top;
    menu.place(at?.left ?? layer.edge(), window.innerHeight - top + 10, top - HEAD.rule - 40);
  }

  /** A note pressed on the gatepost is written back on the line, to say again. */
  function pickNote(text: string): void {
    recalled = -1;
    fill(text);
  }
  /** The newest note's own mark has it go again at that note, without
   *  saying it a second time: the note stays the one it is working on. */
  function rerun(): void {
    recalled = -1;
    lastSaid = null;
    does.press('failure:retry');
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

  /** Which way along the rail the last switch went, for the board that
      arrives once a session it switched to has finished waking. */
  let lastWay = 0;

  /** The yard as it is actually drawn, which a held switch runs behind. */
  let drawn: Yard | undefined;
  /** A switch into a session still waking, held for a moment in case it wakes. */
  let holding = 0;
  /** Whether the session being left has already gone, while a switch was held. */
  let gone = false;

  function show(yard: Yard, moving = true): void {
    const before = drawn;
    last = yard;
    standIn(yard.session?.id);
    const walkedIn =
      entering ||
      before?.project.id !== yard.project.id ||
      before?.session?.id !== yard.session?.id;
    /* Along the rail to a neighbour, rather than in from the island or over
       from another project. That is a step sideways, and it moves like one. */
    const switched =
      moving &&
      !entering &&
      before !== undefined &&
      before.project.id === yard.project.id &&
      before.session?.id !== yard.session?.id;
    const crossed = switched && crossedBoards(before, yard);
    if (switched) lastWay = crossed ? wayAcross(before, yard) : wayAlong(before, yard);
    else if (walkedIn) lastWay = 0;
    /* A session being woken reads its whole history back in a piece at a
       time, and every piece is a rewrite. Drawing each one is the board
       flickering through every half-loaded state of the conversation, so while
       it wakes the fire is drawn once and left alone, and when it is up the
       whole of it comes in together. */
    const waking = Boolean(yard.session?.waking);
    const wasWaking = Boolean(before?.session?.waking) && !walkedIn;
    /* Every session is opened as waking until it says otherwise, and one that
       is already up says so a moment later. Drawn straight away, that was two
       switches on top of each other: into a waking board, then out of it. So
       the board you are leaving stays a beat, and only a wake long enough to
       notice gets a board of its own. */
    if (switched && waking && holding !== -1) {
      if (!holding) {
        if (crossed) lanternsMove(root);
        leavingInPlace([...movers(root), ...movers(stillAt)], lastWay);
        gone = true;
        holding = window.setTimeout(() => {
          holding = -1;
          if (last && stage.style.display !== 'none') show(last);
          holding = 0;
        }, WAKE_HELD_MS);
      }
      return;
    }
    if (holding > 0) window.clearTimeout(holding);
    if (holding > 0) holding = 0;
    if (waking && wasWaking && moving) return;
    drawn = yard;
    const woke = wasWaking && !waking;
    entering = false;
    const was = moving && (!walkedIn || switched) ? measure(stage) : new Map();
    /* A session taken down goes out on the rail rather than blinking off it,
       and the ones after it slide along into its place. */
    const still = new Set(yard.rail.map((one) => `lantern:${one.id}`));
    const goingOut = (
      moving && before?.project.id === yard.project.id
        ? [...root.querySelectorAll<HTMLElement>('[data-key^="lantern:"]')].filter(
            (el) => el.dataset.key !== 'lantern:+' && !still.has(el.dataset.key!)
          )
        : []
    ).map((el) => ({ el, at: el.getBoundingClientRect() }));
    if (crossed && !gone) lanternsMove(root);
    const off = (switched && !gone) || (woke && moving) ? stepOff() : null;
    const wentAlready = switched && gone;
    gone = false;
    root.replaceChildren(covered);
    covered.replaceChildren();
    hung = yard.workspaces?.length ? SIGNS : 0;
    const columns = layer.columns(rightEmpty(last), leftEmpty(last));
    /* Everything from under the header rule to above the line you write on.
       The columns live in here and the bands top and bottom do not. */
    const floor =
      window.innerHeight - MARGIN - (layer.cramped() ? RAIL_BARE : RAIL_TALL) - 60 - grown;

    regions = [];
    scrims(root);
    lay();
    carried(hands, line, yard, does);
    const headFrom = root.childElementCount;
    head(root, waking ? hushed(yard) : yard, layer.edge(), does);
    /* The heading is what stays up when Jira is written into the yard. */
    for (const one of Array.from(root.children).slice(headFrom))
      (one as HTMLElement).dataset.head = '';
    /* A project nobody has worked in yet has nothing to put in three columns,
       and three headings over three empty columns is scaffolding, not a place.
       So it says the one true thing and lets the district behind it do the
       rest; the line at the bottom is already asking what to build. */
    if (yard.session && waking) {
      /* The place stands while its session wakes: the headings, the rules
         and the changelog are the project's and already known, so only the
         middle waits, with the fire where the answer is about to land. */
      const blank: Yard = { ...yard, session: { ...BLANK, id: yard.session.id } };
      asked(root, columns.asked, blank, floor, layer.cramped(), pickNote);
      thinking(
        covered,
        columns.thinking,
        blank,
        floor,
        does,
        walkedIn,
        undefined,
        columns.asked.wide > 0
      );
      wakingUp(
        covered,
        columns.thinking,
        floor,
        wakingSinceOf(yard.session.id),
        yard.session.settingUp
      );
      stillAt.replaceChildren();
      stillAt.style.display = 'none';
    } else if (yard.session) {
      asked(
        root,
        columns.asked,
        yard,
        floor,
        layer.cramped(),
        pickNote,
        (id) => does.press(`unsay:${id}`),
        rerun
      );
      thinking(
        covered,
        columns.thinking,
        yard,
        floor,
        does,
        walkedIn,
        sinceOf(yard),
        columns.asked.wide > 0
      );
      made(covered, columns.made, yard, floor, does);
      /* What you said while it worked is on the post, above the parchment. */
      stillAt.replaceChildren();
      stillAt.style.display = 'none';
    } else {
      /* Nobody has started this one yet, and it is still a session: the same
         three columns, nothing in them, and the line under them is how it
         starts. A yard that looked different here was a screen of its own. */
      const blank: Yard = { ...yard, session: BLANK };
      asked(root, columns.asked, blank, floor, layer.cramped(), pickNote);
      thinking(
        covered,
        columns.thinking,
        blank,
        floor,
        does,
        walkedIn,
        undefined,
        columns.asked.wide > 0
      );
      made(covered, columns.made, blank, floor, does);
      stillAt.replaceChildren();
      stillAt.style.display = 'none';
    }
    said_line(root, layer.edge(), grown);
    rail(root, yard, layer.cramped(), layer.edge(), does);
    /* On the stage rather than the rail, which is drawn afresh on every
       change and would take it down mid-fade. */
    for (const { el, at } of goingOut) {
      delete el.dataset.key;
      el.style.left = `${at.left}px`;
      el.style.top = `${at.top}px`;
      for (const glow of el.querySelectorAll('[data-glow]')) glow.remove();
      el.style.filter = 'brightness(0.55)';
      stage.appendChild(el);
      void leave(el, 160).then(() => el.remove());
    }
    if (yard.session) grips(columns, floor);
    if (crossed) lanternsMove(root);
    /* What the line asks for follows what the yard is: somebody at the gate
       wants an answer, an empty project wants to know what to build, and
       anything else is the next thing you have to say. Not while something is
       laid over the yard, though: that has its own question. */
    if (!scrim.up)
      line.asks(
        yard.asking ? (yard.asking.writable ? 'own' : 'answer') : yard.session ? 'say' : 'start'
      );

    /* The keyboard was standing on something before the rewrite and the board
       under it is new, so put the mark back on whatever it was standing on. */
    walk.again();

    if (!moving) return;
    if (off || wentAlready) {
      /* What is the place's and not the session's stands where it was, so
         only what is actually changing is seen to go. */
      const standing = new Set(
        [...root.querySelectorAll<HTMLElement>('[data-stays]')].map((el) => el.dataset.stays)
      );
      if (off) {
        for (const el of off.ghost.querySelectorAll<HTMLElement>('[data-stays]')) {
          if (standing.has(el.dataset.stays)) el.style.visibility = 'hidden';
        }
        for (const el of off.ghost.querySelectorAll<HTMLElement>('[data-moves]')) {
          el.style.visibility = 'visible';
        }
        stage.insertBefore(off.ghost, root);
        for (const [el, top, left] of off.scrolled) {
          el.scrollTop = top;
          el.scrollLeft = left;
        }
        steppingOff(off.ghost, lastWay, woke && !switched);
      }
      play(stage, was, {
        only: (el) => Boolean(el.closest('[data-stays]')) && !el.closest('[data-moves]'),
      });
      sweepingIn([...movers(root), ...movers(stillAt)], lastWay, wentAlready, woke && !switched);
      if (switched) relit(before, yard);
      if (woke) lastWay = 0;
      return;
    }
    /* The note that was just said, landing. The agent's own record of it has
       arrived on the post, so the one in flight hands over to it: the card
       carries on from wherever the words had got to. */
    const from = new Map<string, DOMRect>();
    const newest = yard.session?.notes[0];
    /* Said while it worked, it lands above the parchment in plain ink instead. */
    const coming = yard.session?.waiting.find(
      (one) => flight && same(one.said, flight.said) && !was.has(`waiting:${one.id}`)
    );
    if (flight && newest && same(newest.said, flight.said) && !was.has(`note:${newest.id}`)) {
      from.set(`note:${newest.id}`, flight.rect());
      flight.el.remove();
      flight = null;
    } else if (flight && coming) {
      from.set(`waiting:${coming.id}`, flight.rect());
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

  /**
   * Lift what is on the yard off it, whole, so it can be seen leaving while
   * the next session is written in underneath. The nodes themselves go rather
   * than copies, so a column scrolled halfway down leaves from halfway down.
   */
  function stepOff(): { ghost: HTMLElement; scrolled: [HTMLElement, number, number][] } {
    const scrolled: [HTMLElement, number, number][] = [];
    for (const el of stage.querySelectorAll<HTMLElement>('*')) {
      if (el.scrollTop || el.scrollLeft) scrolled.push([el, el.scrollTop, el.scrollLeft]);
    }
    const ghost = box({ left: 0, top: 0, right: 0, bottom: 0 }, 'pointer-events:none');
    ghost.inert = true;
    const under = box({ left: 0, top: 0, right: 0, bottom: 0 });
    under.append(...covered.childNodes);
    const kept = stillAt.cloneNode(false) as HTMLElement;
    kept.append(...stillAt.childNodes);
    ghost.append(under, ...[...root.childNodes].filter((node) => node !== covered), kept);
    /* It is not there any more as far as anything else is concerned: nothing
       measures it, walks onto it or presses it on its way out. */
    for (const el of ghost.querySelectorAll<HTMLElement>('[data-key],[data-walk]')) {
      delete el.dataset.key;
      delete el.dataset.walk;
    }
    return { ghost, scrolled };
  }

  /** Everything on the yard that is the session's, at the size it moves in. */
  function movers(parent: HTMLElement): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement) || child.dataset.ownMotion !== undefined) continue;
      if (child.dataset.stays !== undefined) {
        out.push(...child.querySelectorAll<HTMLElement>('[data-moves]'));
      } else if (child === covered || child.querySelector('[data-stays]')) {
        out.push(...movers(child));
      } else out.push(child);
    }
    return out;
  }

  /** The lantern you took catches; the one you let go of turns down. */
  function relit(before: Yard, yard: Yard): void {
    const lamp = (id: string | undefined): HTMLElement | null =>
      id ? root.querySelector<HTMLElement>(`[data-lamp="${CSS.escape(id)}"]`) : null;
    const took = lamp(yard.rail.find((one) => one.here)?.id);
    const left = lamp(before.rail.find((one) => one.here)?.id);
    if (took) catching(took, took.style.filter);
    if (left) lettingGo(left, left.style.filter);
    const glow = root.querySelector<HTMLElement>('[data-glow="here"]');
    if (glow) swelling(glow);
    /* The light the one you let go of was throwing, drawn again for as long
       as it takes to go out. */
    if (left && before.rail.find((one) => one.here)?.lit) {
      const x = parseFloat(left.style.left);
      const y = parseFloat(left.style.top);
      const out = firelight({ left: x - 34, top: y - 24, width: 90, height: 90 }, 0.3);
      left.before(out);
      dwindling(out);
    }
  }

  /** When a session started waking, for the count beside its fire. */
  const wakingSince = new Map<string, number>();
  function wakingSinceOf(id: string): number {
    const seen = wakingSince.get(id) ?? Date.now();
    wakingSince.set(id, seen);
    return seen;
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
    /* Where the post will be once this is on it, even if it is the first. */
    const columns = layer.columns(rightEmpty(last), hidden('asked'));
    if (!leaving || !same(leaving.text, text) || !last?.session) return;
    flight?.el.remove();
    /* Said while it works, it is not read yet, so it lands in the post's own
       weathered ink above the parchment rather than taking the card. */
    const busy = last.session.fire === 'lit';
    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      `left:${leaving.rect.left}px`,
      `top:${leaving.rect.top}px`,
      `max-width:${columns.asked.wide - 60}px`,
      "font-family:'Mender Hand',cursive",
      `font-size:${busy ? 17 : 19}px`,
      'line-height:1.25',
      `padding:${busy ? '0' : '12px 14px'}`,
      'color:#f4e3c0',
      'pointer-events:none',
      'z-index:5',
      'transform-origin:top left',
      'white-space:pre-wrap',
    ].join(';');
    el.textContent = named(text);
    stage.appendChild(el);
    /* The line's own padding is none and the card's is twelve, so the words
       start twelve up and fourteen left of where they will read from. */
    const dx = columns.asked.x + 22 - leaving.rect.left;
    const dy = HEAD.top - leaving.rect.top;
    el.animate(
      busy
        ? [
            { transform: 'translate(0,0)', color: '#f4e3c0' },
            { transform: `translate(${dx}px,${dy + 20}px)`, color: '#cbb491' },
          ]
        : [
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

  /* ── dragging a rule, and right-clicking a part away ───────────────────── */

  /** Redraw at most once a frame while a rule is being dragged. */
  let redrawing = 0;
  function redraw(): void {
    if (redrawing || !last) return;
    redrawing = requestAnimationFrame(() => {
      redrawing = 0;
      if (last) show(last, false);
    });
  }

  /**
   * Every rule between two parts can be taken hold of and moved, and the parts
   * on either side take the room. There is nothing to see until the pointer is
   * on one: the rule itself warms, and the cursor says which way it goes.
   */
  function grips(columns: ReturnType<Layer['columns']>, floor: number): void {
    const top = HEAD.below;
    const tall = floor - top;
    if (columns.asked.wide) {
      const x =
        columns.asked.x +
        columns.asked.wide +
        (columns.thinking.x - columns.asked.x - columns.asked.wide) / 2;
      grip('col', { left: x - 5, top, width: 11, height: tall }, 'asked', columns.asked.wide);
    }
    if (columns.made.wide) {
      const end = columns.thinking.x + columns.thinking.wide;
      const x = end + (columns.made.x - end) / 2;
      grip('col', { left: x - 5, top, width: 11, height: tall }, 'made', columns.made.wide);
    }
    for (const line of root.querySelectorAll<HTMLElement>('[data-grip]')) {
      const at = line.getBoundingClientRect();
      grip(
        'row',
        { left: at.left, top: at.top - 5, width: at.width, height: 11 },
        line.dataset.grip as 'changelog' | 'now',
        Number(line.dataset.value)
      );
    }
  }

  function grip(
    way: 'col' | 'row',
    where: { left: number; top: number; width: number; height: number },
    what: 'asked' | 'made' | 'changelog' | 'now',
    from: number
  ): void {
    const it = stays(box(where), `grip:${what}`);
    it.className = `grip grip-${way}`;
    it.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const start = way === 'col' ? event.clientX : event.clientY;
      document.body.classList.add(`gripping-${way}`);
      const move = (next: PointerEvent): void => {
        const by = (way === 'col' ? next.clientX : next.clientY) - start;
        /* The left column and the post grow toward the pointer; the right
           column and the changelog grow away from it. */
        const size = what === 'asked' || what === 'now' ? from + by : from - by;
        /* A column is kept as its share of the page, so it holds its
           proportion when the window changes; a row is kept in pixels. */
        const kept = way === 'col' ? size / Math.max(1, layer.size().wide) : Math.round(size);
        arrange({ [what]: kept }, false);
        redraw();
      };
      const up = (): void => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove(`gripping-${way}`);
        keepArrangement();
        redraw();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    root.appendChild(it);
  }

  /** The small slab a right-click opens: put this away, bring that back. */
  let slab: HTMLElement | null = null;
  function unslab(): void {
    slab?.remove();
    slab = null;
  }
  /**
   * A workspace's own slab: one line that deletes it. The first press only
   * works out what would go with it and says so, in the sore ink, and nothing
   * happens until that line is pressed again.
   */
  function workspaceSlab(sign: HTMLElement, event: MouseEvent): void {
    const id = sign.dataset.workspace ?? '';
    const it = document.createElement('div');
    it.className = 'menu slab';
    let armed = false;
    const line = document.createElement('span');
    line.className = 'press slab-line';
    line.textContent = `delete ${sign.dataset.name ?? 'this workspace'}`;
    line.addEventListener('mousedown', (down) => down.preventDefault());
    line.addEventListener('click', () => {
      if (armed) {
        unslab();
        does.press(`workspace-drop:${id}`);
        return;
      }
      line.dataset.busy = 'yes';
      line.textContent = 'looking at what is in there…';
      void (does.dropCost?.(id) ?? Promise.resolve('')).then((cost) => {
        if (slab !== it) return;
        armed = true;
        delete line.dataset.busy;
        line.style.color = 'var(--yard-wrong)';
        line.style.whiteSpace = 'normal';
        line.style.maxWidth = '420px';
        line.textContent = `press again to delete it. ${cost}`;
        standAsking(() => line.click(), line);
      });
    });
    const rename = document.createElement('span');
    rename.className = 'press slab-line';
    rename.textContent = `rename ${sign.dataset.name ?? 'this workspace'}`;
    rename.addEventListener('mousedown', (down) => down.preventDefault());
    rename.addEventListener('click', () => {
      unslab();
      renamers.get(sign)?.();
    });
    it.append(rename, line);
    stage.appendChild(it);
    it.style.left = `${Math.min(event.clientX, window.innerWidth - it.offsetWidth - 12)}px`;
    it.style.top = `${Math.min(event.clientY, window.innerHeight - it.offsetHeight - 12)}px`;
    slab = it;
  }

  /**
   * A lantern's own slab: close every other session on the rail, or the ones
   * to one side of it. Each line names how many before it does anything, and
   * the second press on it closes them.
   */
  function lanternSlab(id: string, lantern: HTMLElement): boolean {
    const rail = (last?.rail ?? []).filter((one) => one.ground !== 'cutting');
    const at = rail.findIndex((one) => one.id === id);
    if (at < 0) return false;
    const sides = [
      { said: 'close others', ids: rail.filter((one) => one.id !== id) },
      { said: 'close to the left', ids: rail.slice(0, at) },
      { said: 'close to the right', ids: rail.slice(at + 1) },
      { said: 'close done', ids: rail.filter((one) => one.finished), apart: true },
    ];
    if (!sides.some((side) => side.ids.length)) return false;
    const it = document.createElement('div');
    it.className = 'menu slab lantern-slab';
    const head = document.createElement('div');
    head.className = 'menu-head';
    head.textContent = rail[at]!.name;
    it.appendChild(head);
    for (const side of sides) {
      if (side.apart) {
        const rule = document.createElement('div');
        rule.className = 'slab-rule';
        it.appendChild(rule);
      }
      const ids = side.ids.map((one) => one.id);
      const line = document.createElement('div');
      line.className = ids.length ? 'press slab-line slab-row' : 'slab-line slab-row slab-none';
      const said = document.createElement('span');
      said.textContent = side.said;
      const many = document.createElement('span');
      many.className = 'slab-many';
      many.textContent = ids.length ? String(ids.length) : '·';
      line.append(said, many);
      it.appendChild(line);
      if (!ids.length) continue;
      let armed = false;
      line.addEventListener('mousedown', (down) => down.preventDefault());
      line.addEventListener('click', () => {
        if (armed) {
          unslab();
          /* Close done can take the one pressed too, so you stand in
             whichever is left nearest it. */
          const left = rail.filter((one) => !ids.includes(one.id));
          const near =
            left.find((one) => one.id === id) ??
            left.find((one) => rail.indexOf(one) >= at) ??
            left.at(-1);
          does.closeMany?.(ids, near?.id ?? '');
          return;
        }
        line.dataset.busy = 'yes';
        said.textContent = 'looking at what is in them…';
        void (does.closeCost?.(ids) ?? Promise.resolve('')).then((cost) => {
          if (slab !== it) return;
          armed = true;
          delete line.dataset.busy;
          if (cost) line.style.color = 'var(--yard-wrong)';
          const which = ids.length === 1 ? 'it' : `all ${ids.length}`;
          said.textContent = `press again to close ${which}.${cost ? ` ${cost}` : ''}`;
          many.textContent = '';
          standAsking(() => line.click(), line);
        });
      });
    }
    stage.appendChild(it);
    /* Standing on the beam over the lantern it is about, so the names on
       the rail stay readable under it. */
    const lamp = lantern.getBoundingClientRect();
    const beam = lamp.top - 10;
    it.style.left = `${Math.max(12, Math.min(lamp.left, window.innerWidth - it.offsetWidth - 12))}px`;
    it.style.top = `${Math.max(12, beam - it.offsetHeight)}px`;
    slab = it;
    return true;
  }

  window.addEventListener('contextmenu', (event) => {
    unslab();
    const sign = (event.target as HTMLElement | null)?.closest?.<HTMLElement>(
      '.sign[data-workspace]'
    );
    if (sign && showing()) {
      event.preventDefault();
      workspaceSlab(sign, event);
      return;
    }
    const lantern = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-lantern]');
    if (lantern && showing() && !scrim.up) {
      event.preventDefault();
      if (lanternSlab(lantern.dataset.lantern ?? '', lantern)) return;
    }
    if (!showing() || root.style.display === 'none' || scrim.up || !last?.session) return;
    const part = partAt(event.clientX, event.clientY);
    const offers: { said: string; run: () => void }[] = [];
    if (part) offers.push({ said: `put ${PART_NAME[part]} away`, run: () => putAway(part) });
    for (const gone of putAwayHere()) {
      offers.push({ said: `bring back ${PART_NAME[gone]}`, run: () => bringBack(gone) });
    }
    if (moved()) offers.push({ said: 'put the dividers back', run: unmove });
    if (!offers.length) return;
    event.preventDefault();
    const it = document.createElement('div');
    it.className = 'menu slab';
    for (const offer of offers) {
      const line = pressing(offer.said, () => {
        offer.run();
        unslab();
        if (last) show(last, false);
      });
      line.className += ' slab-line';
      it.appendChild(line);
    }
    stage.appendChild(it);
    const wide = it.offsetWidth;
    const tall = it.offsetHeight;
    it.style.left = `${Math.min(event.clientX, window.innerWidth - wide - 12)}px`;
    it.style.top = `${Math.min(event.clientY, window.innerHeight - tall - 12)}px`;
    slab = it;
  });
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (slab && !slab.contains(event.target as Node)) unslab();
    },
    true
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (slab && event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        unslab();
      }
    },
    true
  );
  function showing(): boolean {
    return stage.style.display !== 'none';
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
    answerKey: (event) => askKey(last?.asking, line.written(), event, does),
    /* WHILE YOU ARE IN A YARD, THE YARD HAS THE SCREEN.
     *
     * The village keeps living behind it, though the camera is not yours, and
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
      if (!on && holding > 0) {
        window.clearTimeout(holding);
        holding = 0;
        gone = false;
      }
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
    narrowed: () => standingInOverlay(),
    narrowing: (offers, from) => {
      if (dismissedAt !== null && dismissedAt === line.written()) offers = [];
      else dismissedAt = null;
      /* A note walked back to with the arrows that happens to start with a
         slash is still being walked through, not asked about, so the list
         stays shut and the next up goes on to the one before it. */
      if (holdsRecalled()) offers = [];
      /* Asked before the lines are replaced, because afterwards there is
         nothing left to ask about. */
      const wasInside = standingInOverlay();
      narrowedFrom = from;
      menu.write(offers);
      stand();

      /* The first line of it stands under the keyboard, so Return means it.
         It goes back to the first line every time the list itself changes,
         which is every letter you type. Leaving the mark where it was looks
         harmless until you notice that typing the whole of `/mode` left it
         sitting on `/model` from three letters ago, and return then set the
         model. Arrows move it; the next letter takes it back. */
      const now = offers.map((one) => one.pick).join('\u0000');
      const moved = now !== lastNarrowed;
      lastNarrowed = now;
      const first = offers[0]?.pick;
      if (first && (moved || !standingInOverlay())) {
        walk.stand(first);
        if (moved) menu.root.querySelector('.menu-list')?.scrollTo({ top: 0 });
      } else if (!offers.length && wasInside) walk.stand(null);
      else walk.again();
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
    stays(
      box(
        { left: 0, right: 0, bottom: 0, height: 260 },
        'background:linear-gradient(180deg,rgba(0,0,0,0),rgba(18,13,7,.55))'
      ),
      'scrim:up'
    )
  );
  root.appendChild(
    stays(
      box(
        { left: 0, right: 0, bottom: 0, height: 160 },
        'background:linear-gradient(0deg,rgba(18,13,7,.92),rgba(18,13,7,0))'
      ),
      'scrim:down'
    )
  );
}

/** A workspace's signboard as a line you write on, painted on the board.
    Return keeps it, Escape or an empty line puts the old one back. */
function boardRenamer(
  face: HTMLElement,
  id: string,
  named: string,
  does: Doings
): HTMLInputElement {
  const input = document.createElement('input');
  input.value = renamingBoard?.written ?? named;
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Workspace name');
  input.style.cssText = [
    'font:inherit',
    'color:inherit',
    'caret-color:#482510',
    'background:transparent',
    'border:none',
    'border-bottom:1px solid #482510',
    'outline:none',
    'padding:0',
    'margin:0',
  ].join(';');
  const fit = (): void => {
    input.style.width = `${Math.max(input.value.length, 4) + 1}ch`;
  };
  fit();
  let done = false;
  const finish = (keep: boolean): void => {
    if (done) return;
    done = true;
    const written = input.value.trim();
    renamingBoard = null;
    const keeping = keep && written && written !== named;
    face.textContent = keeping ? written : named;
    if (keeping) does.press(`workspace-name:${id}\t${written}`);
  };
  input.addEventListener('input', () => {
    if (renamingBoard) renamingBoard = { ...renamingBoard, written: input.value };
    fit();
  });
  input.addEventListener('mousedown', (event) => event.stopPropagation());
  input.addEventListener('click', (event) => event.stopPropagation());
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => {
    if (!input.isConnected) return;
    /* A double press on a board you are not in walks into it as well, and
       walking in hands the keyboard to the line a moment later. That is not
       him leaving the name, so it is taken straight back. */
    if (renamingBoard && Date.now() - (renamingBoard.since ?? 0) < 1500) {
      requestAnimationFrame(() => input.isConnected && input.focus());
      return;
    }
    finish(true);
  });
  requestAnimationFrame(() => {
    if (!input.isConnected) return;
    input.focus();
    const at = input.value.length;
    if (input.value === named) input.select();
    else input.setSelectionRange(at, at);
  });
  return input;
}

/** The session's name as a line you write on, standing where the name was.
    Return keeps it, Escape or an empty line puts the old one back. */
function renamer(shown: HTMLElement, named: string, does: Doings): HTMLInputElement {
  const at = renaming;
  const input = document.createElement('input');
  input.value = at?.written ?? named;
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Session name');
  input.style.cssText = [
    "font-family:'Courier Prime',monospace",
    'font-size:20px',
    'font-weight:700',
    'color:#ffffff',
    'text-shadow:1px 1px 0 #120d07',
    'caret-color:#e8b84a',
    'background:transparent',
    'border:none',
    'border-bottom:1px solid #6b5a40',
    'outline:none',
    'padding:0',
    'margin:0',
    'pointer-events:auto',
    'vertical-align:bottom',
    'max-width:44vw',
  ].join(';');
  const fit = (): void => {
    input.style.width = `${Math.max(input.value.length, 6) + 1}ch`;
  };
  fit();
  let done = false;
  const finish = (keep: boolean): void => {
    if (done) return;
    done = true;
    const written = input.value.trim();
    renaming = null;
    if (keep && written && written !== named) {
      shown.textContent = written;
      does.press(`session-name:${written}`);
    }
    if (input.isConnected) input.replaceWith(shown);
  };
  input.addEventListener('input', () => {
    if (renaming)
      renaming = { ...renaming, written: input.value, caret: input.selectionStart ?? 0 };
    fit();
  });
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    } else if (renaming) {
      queueMicrotask(() => {
        if (renaming) renaming = { ...renaming, caret: input.selectionStart ?? 0 };
      });
    }
  });
  /* Pressing anywhere else keeps it, the way a name in settings is kept. A
     blur from the yard being drawn again is not that: the new one carries on. */
  input.addEventListener('blur', () => {
    if (input.isConnected) finish(true);
  });
  requestAnimationFrame(() => {
    if (!input.isConnected) return;
    input.focus();
    if (at && at.written !== named) input.setSelectionRange(at.caret, at.caret);
    else input.select();
  });
  return input;
}

/* ── who and where ─────────────────────────────────────────────────────────
   The project's name, and under it the one line that says everything about
   the session you are standing in: its checkout, its agent, how long it has
   been going and how much of that was turns. To the right, the two things
   that are true of the agent rather than of the work. */
function head(root: HTMLElement, yard: Yard, edge: number, does: Doings): void {
  /* The name is the project, so pressing it opens the project: what it looks
     like on the rack, what it is called, what its sessions take with them,
     and forgetting it. Nothing about the place itself lives anywhere else. */
  const title = stays(box({ left: edge, top: HEAD.title }, TITLE), 'title');
  title.appendChild(
    astop(
      pressing(yard.project.name, () => does.press('tend')),
      'head:project'
    )
  );
  /* And after it, which session in there you are standing in, the same name
     its lantern hangs under at the bottom, in bold white so it is the loudest
     thing at the top and the yard says where you are without looking down. */
  if (yard.session) {
    const slash = exact('/', 20, '#6b5a40');
    slash.style.cssText += ';letter-spacing:0;text-transform:none;padding:0 14px 0 18px';
    /* The rail's name, which follows the session being renamed as it works;
       the session's own is only what it was called when you walked in. */
    const named = yard.rail.find((one) => one.here)?.name ?? yard.session.name;
    const here = moves(exact(named, 20, '#ffffff'));
    here.style.cssText +=
      ';letter-spacing:0;text-transform:none;font-weight:700;max-width:44vw;' +
      'overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:bottom';
    /* A double press writes over it, and a name given that way is his: the
       namer never touches it again. */
    const id = yard.session.id;
    here.style.pointerEvents = 'auto';
    here.style.cursor = 'text';
    here.addEventListener('dblclick', (event) => {
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      renaming = { id, written: named, caret: named.length };
      here.replaceWith(renamer(here, named, does));
    });
    title.append(slash, renaming?.id === id ? renamer(here, named, does) : here);
    if (yard.session.dear) title.appendChild(dearTag());
  }
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

  /* How much of its room it has used up. Nothing warns an agent when that
     runs out; the conversation simply starts losing its own beginning, so the
     village says it instead: orange once it is getting full, red once it is
     nearly out. */
  const room = yard.session?.room;
  const cost = yard.session?.cost;
  const it = box(
    { right: edge, top: HEAD.under },
    'display:flex;gap:6px;align-items:baseline;pointer-events:auto'
  );
  it.className = 'yard-model-line';
  if (room !== undefined) {
    const ink = room < TIGHT ? 'var(--yard-wrong)' : room < LOW ? 'var(--yard-warn)' : undefined;
    it.appendChild(exact(`context ${Math.round((1 - room) * 100)}% used`, 12, ink));
  }
  if (cost) {
    if (room !== undefined) {
      const dot = exact('·', 12, '#6b5a40');
      dot.style.position = 'relative';
      it.appendChild(dot);
    }
    it.appendChild(exact(costText(cost), 12));
  }
  if (yard.session?.model) {
    if (room !== undefined || cost) {
      const dot = exact('·', 12, '#6b5a40');
      dot.style.position = 'relative';
      it.appendChild(dot);
    }
    it.appendChild(
      yard.session.dear ? dearModel(yard.session.model) : exact(yard.session.model, 12)
    );
  }
  if (it.childElementCount) root.appendChild(it);

  /* The five hours, said as this session's own part of it: the window is one
     meter for the whole account, and the meter alone never says who to stop.
     Orange once this one has had a big piece, red once it has had most. */
  /* Only while the pointer is on the line it belongs to, the one saying
     what it thinks with and how full its head is: it is a question asked,
     not a thing to read every time the board is looked at. */
  const five = yard.fiveHours && yard.session ? sessionLine(yard.fiveHours, yard.session.id) : null;
  if (five && it.childElementCount) {
    const ink =
      five.tone === 'wrong'
        ? 'var(--yard-wrong)'
        : five.tone === 'warn'
          ? 'var(--yard-warn)'
          : undefined;
    const line = exact(five.said, 12, ink ?? '#bfa476');
    line.className = 'yard-five';
    it.appendChild(line);
  }

  /* And if the ground under all of it has moved, that is said before anything
     else, because nothing else on the board means a thing until it is put
     right. */
  const wrong = WRONG[yard.project.health];
  if (wrong) {
    const said = box({ left: edge, top: HEAD.under, width: 600 }, WOUND);
    said.textContent = wrong;
    root.appendChild(said);
  }

  if (yard.workspaces?.length) signboards(root, inBeamOrder(yard.workspaces), edge, does);
  else
    root.appendChild(stays(rule({ left: edge, right: edge, top: HEAD.rule }, true), 'rule:head'));
}

/** How each board on the beam is written over, by the board drawn now. */
const renamers = new WeakMap<HTMLElement, () => void>();

/* A second press anywhere on a workspace's board writes over its name. */
window.addEventListener(
  'mousedown',
  (event) => {
    if (event.button !== 0 || event.detail < 2) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input')) return;
    const sign = target?.closest<HTMLElement>('.yard .sign[data-workspace]');
    const write = sign && renamers.get(sign);
    if (!write) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    hideSignCard();
    write();
  },
  true
);

/* ── who is in a workspace, said when its board is pointed at ──────────────
   Pointing at a board on the beam a moment brings a slab down under it with
   everybody in there, each in the tone their lantern burns and saying what
   their lantern says, so the beam can be read without walking along it. The
   beam is drawn afresh on every change, so the slab is held out here by which
   board it is for and written again onto whatever board is drawn next. */
let cardOn: { key: string; el: HTMLElement } | null = null;
let cardTimer = 0;

function hideSignCard(): void {
  window.clearTimeout(cardTimer);
  cardOn?.el.remove();
  cardOn = null;
}

function signCard(sign: HTMLElement, board: Signboard, root: HTMLElement): void {
  const key = board.id || '~folder';
  const show = (): void => {
    const stage = root.parentElement;
    if (!stage || !sign.isConnected || renamingBoard || carrying) return;
    cardOn?.el.remove();
    const it = cardOf(board);
    stage.appendChild(it);
    const at = sign.getBoundingClientRect();
    const left = Math.max(12, Math.min(at.left, window.innerWidth - it.offsetWidth - 12));
    it.style.left = `${left}px`;
    it.style.top = `${at.bottom + 8}px`;
    cardOn = { key, el: it };
  };
  sign.addEventListener('pointerenter', () => {
    window.clearTimeout(cardTimer);
    if (cardOn && cardOn.key !== key) cardOn.el.remove();
    cardTimer = window.setTimeout(show, cardOn ? 0 : 260);
  });
  sign.addEventListener('pointerleave', hideSignCard);
  sign.addEventListener('pointerdown', hideSignCard);
  sign.addEventListener('contextmenu', hideSignCard);
  if (cardOn?.key === key)
    requestAnimationFrame(() => (sign.matches(':hover') ? show() : hideSignCard()));
}

function cardOf(board: Signboard): HTMLElement {
  const it = document.createElement('div');
  it.className = 'menu sign-card';
  const head = document.createElement('div');
  head.className = 'sign-card-head';
  const name = document.createElement('span');
  name.textContent = board.name;
  head.appendChild(name);
  if (board.branch && board.branch !== board.name) {
    const branch = document.createElement('span');
    branch.className = 'sign-card-branch';
    branch.textContent = board.branch;
    head.appendChild(branch);
  }
  it.appendChild(head);
  const sessions = board.sessions ?? [];
  if (!sessions.length) {
    const empty = document.createElement('div');
    empty.className = 'sign-card-empty';
    empty.textContent = 'nobody in here yet';
    it.appendChild(empty);
  }
  const order: Posture[] = ['wants-you', 'broken', 'working', 'done', 'waiting', 'resting'];
  const ranked = [...sessions].sort((a, b) => order.indexOf(a.posture) - order.indexOf(b.posture));
  for (const one of ranked) {
    const line = document.createElement('div');
    line.className = 'sign-card-line';
    const mark = document.createElement('span');
    mark.className = 'sign-card-mark';
    mark.dataset.posture = one.posture;
    const who = document.createElement('span');
    who.className = 'sign-card-who';
    who.style.color = TONE[one.posture];
    who.textContent = one.name;
    const says = document.createElement('span');
    says.className = 'sign-card-says';
    says.style.color = SAYS[one.posture];
    says.textContent = one.saying;
    line.append(mark, who, says);
    it.appendChild(line);
  }
  if (board.id) {
    const foot = document.createElement('div');
    foot.className = 'sign-card-foot';
    foot.textContent = board.here
      ? 'double-click to rename · right-click to delete'
      : 'press to walk in · double-click to rename · right-click to delete';
    it.appendChild(foot);
  }
  return it;
}

/* ── the workspaces ────────────────────────────────────────────────────────
   Once a project has a workspace besides its own folder, the rule under the
   head is a beam, and every workspace hangs from it on two cords as a
   signboard with its name on: the one you are standing in painted gold, the
   rest bare timber you press to walk into, and a dashed one at the end that
   cuts another. Right-clicking one takes it down, in two. */
function signboards(
  root: HTMLElement,
  boards: readonly Signboard[],
  edge: number,
  does: Doings
): void {
  root.appendChild(stays(box({ left: 0, right: 0, top: HEAD.rule - 3, height: 8 }, BEAM), 'beam'));
  const hanging = box({ left: edge + 16, right: edge, top: HEAD.rule + 7 }, SIGN_ROW);
  hanging.className = 'signs';
  for (const board of boards) {
    const hung_ = document.createElement('div');
    hung_.className = board.here ? 'sign here' : 'sign';
    const cords = document.createElement('div');
    cords.className = 'cords';
    cords.append(document.createElement('span'), document.createElement('span'));
    const face = document.createElement('span');
    face.className = 'board';
    face.textContent = board.name;
    /* Light spills out under a board the way it does under a door, in the
       colour its loudest session's lantern burns: nothing when all idle. */
    if (board.light) {
      hung_.dataset.light = board.light;
      if (board.ember !== undefined) hung_.style.setProperty('--ember', String(board.ember));
    }
    hung_.append(cords, face);
    /* Any workspace is written over with a double press, the same as a
       session's name at the top. Its branch keeps its old name. The press
       that walks into one redraws the beam under the pointer, so the second
       press lands on a new board and is never a double-click to the browser;
       the press's own count is, which is what `beamPresses` reads. */
    if (board.id) {
      const write = (): void => {
        renamingBoard ??= { id: board.id, written: board.name, since: Date.now() };
        face.replaceChildren(boardRenamer(face, board.id, board.name, does));
      };
      renamers.set(hung_, write);
      if (renamingBoard?.id === board.id) write();
    }
    signCard(hung_, board, root);
    if (!board.here) {
      hung_.tabIndex = 0;
      astop(hung_, `workspace:${board.id}`);
      hung_.addEventListener('mousedown', (event) => event.preventDefault());
      const take = (): void => {
        handGold(hanging, hung_, board.id);
        does.press(`workspace:${board.id}`);
      };
      hung_.addEventListener('click', take);
      hung_.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        take();
      });
    }
    if (board.id) {
      hung_.dataset.workspace = board.id;
      hung_.dataset.name = board.name;
      hung_.addEventListener('pointerdown', (event) => liftBoard(board.id, event));
      hung_.addEventListener(
        'click',
        (event) => {
          if (justCarried) event.stopImmediatePropagation();
        },
        true
      );
    }
    hanging.appendChild(hung_);
  }
  const more = document.createElement('div');
  more.className = 'sign more';
  more.tabIndex = 0;
  more.title = 'a new workspace';
  astop(more, 'do:workspace');
  const cord = document.createElement('span');
  cord.className = 'cord';
  const plus = document.createElement('span');
  plus.className = 'board';
  plus.textContent = '+';
  more.append(cord, plus);
  more.addEventListener('mousedown', (event) => event.preventDefault());
  more.addEventListener('click', () => does.press('do:workspace'));
  more.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    does.press('do:workspace');
  });
  hanging.appendChild(more);
  root.appendChild(stays(hanging, 'signs'));
  if (carrying) {
    hanging.scrollLeft = carrying.scrolled;
    placeCarried(hanging);
  }
  /* Gold that moved without a press on the beam, Command-U or a session
     closing, still catches where it lands rather than simply being there. */
  const gold = boards.find((one) => one.here)?.id;
  if (goldWas !== undefined && gold !== undefined && gold !== goldWas) {
    catchGold(hanging.querySelector<HTMLElement>('.sign.here .board'));
  }
  goldWas = gold;
  /* However many there are, the one you are standing in is on the beam. */
  requestAnimationFrame(() => {
    const here = hanging.querySelector<HTMLElement>('.sign.here');
    if (!here || carrying) return;
    const over = here.offsetLeft + here.offsetWidth - hanging.clientWidth;
    if (over > 0 || here.offsetLeft < hanging.scrollLeft) {
      hanging.scrollLeft = Math.max(0, over + 12);
    }
  });
}

/* ── moving them along the beam ────────────────────────────────────────────
   A workspace's board held and slid along the beam comes with the pointer,
   swinging a little on its cords the way it is pulled, and the boards it
   passes step aside to open its gap. Let go, everything eases into place and
   the beam keeps that order from then on, on this machine. The project's own
   folder stays first and the dashed board stays last. A press that never
   really moved is still just a press. The yard is drawn afresh on every
   change, so what is being carried is held out here and put back on whatever
   boards are drawn next. */

const BEAM_ORDER_KEY = 'mender.beam-order';

/** The workspaces in the order they were last left on the beam, any new one
    after them in the order it came, the project's own folder first. */
export function inBeamOrder<T extends { id: string }>(boards: readonly T[]): T[] {
  const saved = beamOrder();
  if (!saved.length) return [...boards];
  const rank = (one: T, at: number): number => {
    if (!one.id) return -1;
    const kept = saved.indexOf(one.id);
    return kept === -1 ? saved.length + at : kept;
  };
  return boards
    .map((one, at) => ({ one, at: rank(one, at) }))
    .sort((a, b) => a.at - b.at)
    .map((each) => each.one);
}

function beamOrder(): string[] {
  try {
    const kept = JSON.parse(localStorage.getItem(BEAM_ORDER_KEY) ?? '[]') as unknown;
    return Array.isArray(kept) ? kept.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function keepBeamOrder(ids: string[]): void {
  const next = [...beamOrder().filter((id) => !ids.includes(id)), ...ids].slice(-400);
  localStorage.setItem(BEAM_ORDER_KEY, JSON.stringify(next));
}

/** The board being carried, where the pointer took hold of it, and how far
    the beam had scrolled by then. */
let carrying: {
  id: string;
  startX: number;
  x: number;
  scrolled: number;
  startScrolled: number;
  swing: number;
  lastX: number;
  to: number;
} | null = null;
/** A carry just ended on this press, so the click it ends in is not a press. */
let justCarried = false;

function liftBoard(id: string, down: PointerEvent): void {
  if (down.button !== 0 || carrying) return;
  if ((down.target as HTMLElement).closest('input')) return;
  const startX = down.clientX;
  const startY = down.clientY;
  let lifted = false;
  let settle = 0;

  const signs = (): HTMLElement | null => document.querySelector<HTMLElement>('.yard .signs');

  const move = (event: PointerEvent): void => {
    if (!lifted) {
      const dx = event.clientX - startX;
      if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(event.clientY - startY)) {
        if (Math.hypot(dx, event.clientY - startY) > 12) let_();
        return;
      }
      const row = signs();
      if (!row) return let_();
      lifted = true;
      const scrolled = row.scrollLeft;
      carrying = {
        id,
        startX,
        x: event.clientX,
        scrolled,
        startScrolled: scrolled,
        swing: 0,
        lastX: event.clientX,
        to: -1,
      };
      document.body.classList.add('carrying-board');
      window.getSelection()?.removeAllRanges();
    }
    if (!carrying) return;
    event.preventDefault();
    const row = signs();
    if (!row) return;
    /* Near either end of a beam too long for the window, it runs on under
       the board rather than the board stopping at the edge. */
    const box_ = row.getBoundingClientRect();
    const near = 40;
    if (event.clientX < box_.left + near)
      row.scrollLeft -= Math.ceil((box_.left + near - event.clientX) / 3);
    else if (event.clientX > box_.right - near)
      row.scrollLeft += Math.ceil((event.clientX - box_.right + near) / 3);
    carrying.scrolled = row.scrollLeft;
    /* It swings back against the way it is pulled, and settles once it stops. */
    const pull = event.clientX - carrying.lastX;
    carrying.swing = clamp(carrying.swing * 0.6 - pull * 0.4, -5, 5);
    carrying.lastX = event.clientX;
    carrying.x = event.clientX;
    placeCarried(row);
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      if (!carrying) return;
      carrying.swing = 0;
      const now = signs();
      if (now) placeCarried(now);
    }, 90);
  };

  const let_ = (): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', let_);
    window.removeEventListener('pointercancel', let_);
    window.clearTimeout(settle);
    if (!lifted || !carrying) return;
    justCarried = true;
    window.setTimeout(() => (justCarried = false), 0);
    document.body.classList.remove('carrying-board');
    const row = signs();
    const to = carrying.to;
    carrying = null;
    if (!row) return;
    dropCarried(row, id, to);
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', let_);
  window.addEventListener('pointercancel', let_);
}

/** The workspace boards on the beam, in the order they are laid out. */
function workspaceBoards(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>(':scope > .sign[data-workspace]')];
}

/** Puts the carried board under the pointer and the rest where its gap leaves them. */
function placeCarried(row: HTMLElement): void {
  if (!carrying) return;
  const boards = workspaceBoards(row);
  const from = boards.findIndex((one) => one.dataset.workspace === carrying?.id);
  if (from === -1) return;
  const held = boards[from];
  const gap =
    boards.length > 1 ? boards[1].offsetLeft - boards[0].offsetLeft - boards[0].offsetWidth : 18;
  const step = held.offsetWidth + gap;
  const first = boards[0].offsetLeft;
  const last = boards.at(-1)!;
  const end = last.offsetLeft + last.offsetWidth;
  /* Held to the stretch of beam the workspaces hang along. */
  const wanted = carrying.x - carrying.startX + (carrying.scrolled - carrying.startScrolled);
  const dx = clamp(wanted, first - held.offsetLeft, end - held.offsetWidth - held.offsetLeft);
  const middle = held.offsetLeft + dx + held.offsetWidth / 2;
  let to = from;
  for (let at = 0; at < boards.length; at++) {
    if (at === from) continue;
    const other = boards[at];
    const theirs = other.offsetLeft + other.offsetWidth / 2;
    if (at < from && middle < theirs) to = Math.min(to, at);
    if (at > from && middle > theirs) to = Math.max(to, at);
  }
  carrying.to = to;
  held.classList.add('carried');
  held.style.transition = 'none';
  held.style.zIndex = '2';
  held.style.position = 'relative';
  held.style.transform = `translateX(${dx}px)`;
  const face = held.querySelector<HTMLElement>('.board');
  if (face) {
    face.style.transformOrigin = '50% -12px';
    face.style.transition = 'transform 140ms ease-out';
    face.style.transform = reducedMotion() ? '' : `rotate(${carrying.swing}deg)`;
  }
  boards.forEach((other, at) => {
    if (at === from) return;
    const shift = from < at && at <= to ? -step : to <= at && at < from ? step : 0;
    other.style.transition = reducedMotion() ? 'none' : 'transform 180ms cubic-bezier(.2,.8,.2,1)';
    other.style.transform = shift ? `translateX(${shift}px)` : '';
  });
}

/** Let go: the boards are put in their new order and each eases there from
    wherever it was showing, the carried one swinging straight again. */
function dropCarried(row: HTMLElement, id: string, to: number): void {
  const boards = workspaceBoards(row);
  const from = boards.findIndex((one) => one.dataset.workspace === id);
  if (from === -1) return;
  const was = new Map(boards.map((one) => [one, one.getBoundingClientRect().left]));
  const held = boards[from];
  const face = held.querySelector<HTMLElement>('.board');
  const swung = face?.style.transform ?? '';
  for (const one of boards) {
    one.style.transition = 'none';
    one.style.transform = '';
  }
  if (face) {
    face.style.transition = 'none';
    face.style.transform = '';
  }
  if (to !== -1 && to !== from) {
    const order = [...boards];
    order.splice(from, 1);
    order.splice(to, 0, held);
    const after = order[to + 1] ?? row.querySelector<HTMLElement>(':scope > .sign.more');
    row.insertBefore(held, after);
    keepBeamOrder(order.map((one) => one.dataset.workspace ?? ''));
  }
  const still = reducedMotion();
  for (const one of boards) {
    const by = (was.get(one) ?? 0) - one.getBoundingClientRect().left;
    if (!still && by) {
      one.animate([{ transform: `translateX(${by}px)` }, { transform: 'translateX(0)' }], {
        duration: one === held ? 220 : 180,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      });
    }
  }
  if (face && swung && !still) {
    face.animate([{ transform: swung }, { transform: 'rotate(0deg)' }], {
      duration: 420,
      easing: 'cubic-bezier(.3,1.6,.5,1)',
    });
  }
  window.setTimeout(() => {
    held.classList.remove('carried');
    held.style.zIndex = '';
    held.style.position = '';
  }, 220);
}

const BEAM =
  'box-sizing:border-box;background:#5a3a1c;border-top:2px solid #3a2712;' +
  'border-bottom:2px solid #3a2712';
/** Which board was gold last time the beam was drawn. */
let goldWas: string | undefined;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The gold goes to the board you pressed the moment you press it, rather than
 * waiting for the yard behind to be drawn again. It flips, the way a painted
 * board would, and catches the light for a beat: easing between two paints
 * passes through the colour of its own lettering and the name goes.
 */
function handGold(hanging: HTMLElement, to: HTMLElement, id: string): void {
  const from = hanging.querySelector<HTMLElement>('.sign.here');
  if (from === to) return;
  from?.classList.remove('here');
  to.classList.add('here');
  goldWas = id;
  catchGold(to.querySelector<HTMLElement>('.board'));
}

function catchGold(face: HTMLElement | null): void {
  if (!face || reducedMotion()) return;
  face.animate([{ filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }], {
    duration: 260,
    easing: 'steps(4, end)',
  });
}

const SIGN_ROW =
  'display:flex;align-items:flex-start;gap:18px;overflow-x:auto;overflow-y:hidden;' +
  'scrollbar-width:none;padding:0 6px 6px 0;pointer-events:none';

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
  'color:var(--yard-wrong)',
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
const LOW = 0.4;
/** And below this, it is about to start forgetting. */
const TIGHT = 0.15;

/** What it has cost so far, in plain words rather than a currency badge. */
function costText(cost: { amount: number; currency: string }): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cost.currency }).format(
      cost.amount
    );
  } catch {
    return `${cost.amount.toFixed(2)} ${cost.currency}`;
  }
}

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

/* ── where each part is, for a right-click to find ──────────────────────── */

interface Region {
  part: Part;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Where each part that can be put away was drawn, last time the yard was. */
let regions: Region[] = [];

function region(part: Part, at: { x: number; wide: number }, top: number, bottom: number): void {
  regions.push({ part, left: at.x, right: at.x + at.wide, top, bottom });
}

function partAt(x: number, y: number): Part | undefined {
  return regions.find((one) => x >= one.left && x <= one.right && y >= one.top && y <= one.bottom)
    ?.part;
}

function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}

/* ── what you asked ────────────────────────────────────────────────────────
   A gatepost with your notes on it. The newest is on parchment and slightly
   crooked, because somebody pinned it there; the ones under it have been up
   long enough to have weathered into the post. Under the whole column, what
   went into each version of the checkout. */
function asked(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  cramped: boolean,
  pick: (said: string) => void,
  takeBack?: (id: string) => void,
  rerun?: () => void
): void {
  if (!at.wide) return;
  /* What you said while it worked goes on the post too, above the parchment
     and in the post's own weathered ink, because it has not been read yet.
     It only takes the parchment once the agent has picked it up. */
  const coming = yard.session?.waiting ?? [];
  const bare = !yard.session?.notes.length && !coming.length;
  /* The changelog sits at the foot of the column, so the post and the notes
     on it get everything above that and no more. An empty post still leaves
     it where it will be once something is said, rather than it dropping down
     the column under the first note. Either can be put away, and then the
     other has the column. */
  const under = hidden('changelog')
    ? floor
    : changelog(root, at, yard, floor, hidden('asked') || bare, hidden('asked'));
  if (hidden('asked') || bare) return;
  region('asked', at, HEAD.label, under - 20);
  /* Clear air between the last of the post and the changelog's rule, rather
     than the notes running into it. */
  const room = under - 44 - HEAD.top;

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
  root.appendChild(stays(label('what you asked', { left: at.x, top: HEAD.label }), 'label:asked'));
  /* Everything on the post scrolls as one, the parchment with it. Holding the
     newest still over the rest left a long one covering the whole column with
     nothing under it to reach and no way past it. The room over the first
     note is for the tack, and the room at the side for the card's tilt and
     its shadow, which a scroller would otherwise shave off. */
  const width = at.wide - 60;
  const list = stack(
    {
      left: at.x + 22,
      top: HEAD.top - 8,
      width: width + 40,
      height: Math.max(0, under - 36 - HEAD.top),
    },
    14
  );
  list.style.cssText +=
    ';align-items:flex-start;padding-top:8px;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;pointer-events:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 36px),transparent)';
  for (const one of coming) {
    const note = unheard(one);
    note.style.width = `${width}px`;
    if (!one.handed && takeBack) {
      note.style.pointerEvents = 'auto';
      note.style.cursor = 'pointer';
      note.addEventListener('mousedown', (event) => event.preventDefault());
      note.addEventListener('click', () => takeBack(one.id));
    }
    note.dataset.fold = `waiting:${one.id}`;
    list.appendChild(keyed(note, `waiting:${one.id}`));
  }
  if (newest) {
    const card = keyed(pinned(newest, { width }, rerun), `note:${newest.id}`);
    card.dataset.fold = newest.id;
    card.style.position = 'relative';
    card.style.flexShrink = '0';
    list.appendChild(pickable(card, newest.said, pick));
  }
  if (!cramped)
    for (const note of older) {
      const old = weathered(note);
      old.style.width = `${width}px`;
      old.dataset.fold = note.id;
      list.appendChild(pickable(keyed(old, `note:${note.id}`), note.said, pick));
    }
  root.appendChild(list);

  /* Where it was scrolled to is kept per session, until something new goes up
     on it, which is always worth being brought back up to see. */
  const id = yard.session?.id ?? '';
  const head = `${coming[0]?.id ?? ''}|${newest?.id ?? ''}`;
  if (postHead.get(id) !== head) postScrolled.delete(id);
  postHead.set(id, head);
  list.scrollTop = postScrolled.get(id) ?? 0;
  list.addEventListener('scroll', () => {
    /* A tall card's tilt pokes out past the side, and anything that scrolls
       the column sideways to it slid the whole note out of sight. */
    list.scrollLeft = 0;
    postScrolled.set(id, list.scrollTop);
  });
  const fit = (): void => {
    post.style.height = `${Math.min(room, list.scrollHeight + 40)}px`;
  };
  for (const one of list.querySelectorAll<HTMLElement>('[data-fold]')) folded(one, fit);
  fit();
}

/** Notes opened out past their first few lines, by id, across redraws. */
const openNotes = new Set<string>();

/**
 * A long note, a pasted log say, shows its first few lines and folds the rest
 * under a line that opens it, so it never runs the post off the screen. Has
 * to be measured, so it runs once the note is on the board.
 */
function folded(note: HTMLElement, fit: () => void): void {
  const key = note.dataset.fold ?? '';
  const body = note.querySelector<HTMLElement>('[data-note="said"]');
  if (!body) return;
  const most = parseFloat(getComputedStyle(body).lineHeight) * 8;
  if (body.scrollHeight <= most + 4) return;
  const lines = (body.textContent ?? '').split('\n').length;
  const paper = note.classList.contains('paper');
  const set = (): void => {
    const open = openNotes.has(key);
    body.style.maxHeight = open ? '' : `${most}px`;
    body.style.overflow = open ? '' : 'hidden';
    body.style.maskImage = open ? '' : 'linear-gradient(180deg,#000 55%,transparent)';
    toggle.textContent = open ? 'fold it' : lines > 8 ? `show all ${lines} lines` : 'show all';
    fit();
  };
  const toggle = pressing('', () => {
    if (openNotes.has(key)) openNotes.delete(key);
    else openNotes.add(key);
    set();
  });
  toggle.style.cssText += ';display:inline-block;margin-top:6px;align-self:flex-start';
  /* The board's gold all but vanishes on cream, so the paper's darker one. */
  if (paper) toggle.style.color = '#a8741c';
  /* Opening it is not the same as writing the note back on the line. */
  toggle.addEventListener('click', (event) => event.stopPropagation());
  body.after(toggle);
  set();
}

/** A note that writes itself back on the line when pressed, and looks no different. */
function pickable<T extends HTMLElement>(el: T, said: string, pick: (said: string) => void): T {
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'pointer';
  el.addEventListener('mousedown', (event) => event.preventDefault());
  el.addEventListener('click', () => pick(said));
  return el;
}

/** Where the post was left scrolled to, per session, across redraws. */
const postScrolled = new Map<string, number>();
const postHead = new Map<string, string>();

/** The newest note: on parchment, pinned, and not quite straight. */
function pinned(note: Note, where: { width: number }, rerun?: () => void): HTMLElement {
  const card = box(where, CARD);
  card.classList.add('paper');
  const tack = box(
    { left: 14, top: -6, width: 10, height: 10 },
    'background:#d8863a;box-shadow:1px 1px 0 #120d07'
  );
  card.appendChild(tack);
  const meta = said(
    `newest · ${note.when} · ${note.on ? 'working on it' : note.answered ? 'answered' : 'unanswered'}`,
    '#b3651f'
  );
  meta.style.display = 'block';
  meta.style.marginBottom = '5px';
  card.appendChild(meta);
  const body = document.createElement('div');
  body.dataset.note = 'said';
  body.style.whiteSpace = 'pre-wrap';
  body.textContent = named(note.said);
  card.appendChild(body);
  handed(card, note, '#b3651f');
  /* Already at it, there is nothing to go again at yet. */
  if (rerun && !note.on) card.appendChild(again(rerun));
  return card;
}

/**
 * The one mark on the parchment: has it go again at the newest note, without
 * going through the line or putting the note up a second time. Gold, but the
 * paper's own darker gold, because the board's would all but vanish on cream.
 */
function again(press: () => void): HTMLElement {
  const it = document.createElement('div');
  it.title = 'have another go';
  it.style.cssText = [
    'position:absolute',
    'top:9px',
    'right:10px',
    'width:18px',
    'height:18px',
    'pointer-events:auto',
    'color:#a8741c',
    'cursor:default',
  ].join(';');
  /* A loop with its head, in whole pixels. */
  const art = [
    '..####.#.',
    '.#....##.',
    '#....###.',
    '#........',
    '#.......#',
    '#.......#',
    '.#.....#.',
    '..#####..',
  ];
  const cells = art.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []
    )
  );
  it.innerHTML = `<svg viewBox="0 0 9 8" width="18" height="16" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
  it.addEventListener('mouseenter', () => (it.style.color = '#7c5210'));
  it.addEventListener('mouseleave', () => (it.style.color = '#a8741c'));
  it.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    it.style.transform = 'translate(1px,1px)';
  });
  it.addEventListener('mouseup', () => (it.style.transform = ''));
  it.addEventListener('click', (event) => {
    event.stopPropagation();
    press();
  });
  return it;
}

const CARD = [
  /* Over the notes under it, which slide down behind it when a new one lands. */
  'z-index:2',
  'background:#fff4d4',
  'color:#2c2013',
  'padding:12px 14px',
  'box-shadow:5px 5px 0 rgba(0,0,0,.5)',
  'transform:rotate(-.7deg)',
  "font-family:'Mender Hand',cursive",
  'font-size:19px',
  'line-height:1.25',
  /* However long a line runs without a space, it wraps on the card. */
  'overflow-wrap:anywhere',
].join(';');

/**
 * What was said, as the post reads it: a dropped file is called by its name
 * rather than by the whole way to it. Only the post is shortened; what went
 * to the agent, and what pressing the note writes back, keep the full path.
 */
export function named(said: string): string {
  return said
    .replace(/"(?:~|\/)[^"\n]*\/([^"\n/]+)"/g, '"$1"')
    .replace(/(^|\s)(?:~|\/)\S*\/([^\s/]+)(?=\s|$)/g, '$1$2');
}

/**
 * The pictures that went with a note, said under it since the post never
 * draws them. Pointing at that holds them up, the same as pointing at one
 * still on the line does.
 */
function handed(on: HTMLElement, note: Note, tone?: string): void {
  if (!note.pictures) return;
  const line = said(
    note.pictures === 1 ? 'and a picture' : `and ${note.pictures} pictures`,
    ...(tone ? [tone] : [])
  );
  line.style.display = 'block';
  line.style.marginTop = '5px';
  const seen = note.seen ?? [];
  if (seen.length) {
    line.style.alignSelf = 'flex-start';
    line.addEventListener('mouseenter', () => preview(line, seen.map(onThisMachine)));
    line.addEventListener('mouseleave', unpreview);
  }
  on.appendChild(line);
}

/** A note that has been on the post a while. */
function weathered(note: Note): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:3px;min-width:0';
  it.appendChild(
    said(`${note.when} · ${note.standing ? 'standing' : note.answered ? 'answered' : 'unanswered'}`)
  );
  const body = document.createElement('span');
  body.dataset.note = 'said';
  body.style.cssText =
    "display:block;white-space:pre-wrap;font-family:'Mender Hand',cursive;font-size:17px;line-height:1.25;color:#cbb491;overflow-wrap:anywhere";
  body.textContent = named(note.said);
  it.appendChild(body);
  handed(it, note);
  return it;
}

/** Something said while it worked, on the post but not yet read. */
function unheard(one: { said: string; handed?: boolean }): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:3px;min-width:0';
  it.appendChild(
    said(one.handed ? 'just now · not read yet' : 'waiting its turn · press to take back')
  );
  const body = document.createElement('span');
  body.dataset.note = 'said';
  body.style.cssText =
    "display:block;white-space:pre-wrap;font-family:'Mender Hand',cursive;font-size:17px;line-height:1.25;color:#cbb491;overflow-wrap:anywhere";
  body.textContent = one.said;
  it.appendChild(body);
  return it;
}

/**
 * What went into each version of this checkout, newest first, at the foot of
 * the column.
 *
 * The other sessions are the rail's to show, so this corner is the project's
 * own history instead: the version it is on and the few lines that went into
 * it, and every version before that further down the same small list. Nothing
 * here keeps a changelog; it is read off whichever commits moved the version
 * in the project's own manifest. Returns the top of the block, which is where
 * the gatepost above it has to stop.
 */
function changelog(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  alone = false,
  whole = false
): number {
  const versions = yard.versions ?? [];
  if (!versions.length) return floor;
  /* As tall as it was dragged to, or a share of the column, or all of it
     when the post has been put away. */
  const tall = whole
    ? floor - HEAD.label
    : clamp(
        arrangement().changelog ??
          Math.min(260, Math.max(130, Math.round((floor - HEAD.top) * 0.34))),
        90,
        Math.max(90, floor - HEAD.top - 160)
      );
  const top = floor - tall;
  region('changelog', at, whole ? HEAD.label : top - 20, floor);
  /* The rule divides it from the post, so with nothing on the post there is
     nothing to divide it from. It is also what you drag to give either of
     them more room. */
  if (!alone) {
    const line = keyed(
      stays(rule({ left: at.x, top: top - 20, width: at.wide - 20 }), 'rule:log'),
      'rule:log'
    );
    line.dataset.grip = 'changelog';
    line.dataset.value = String(tall);
    root.appendChild(line);
  }
  root.appendChild(keyed(stays(label('changelog', { left: at.x, top }), 'label:log'), 'label:log'));

  /* In the type and the cream the glance at the other sessions used to be
     written in: each version on its own line behind the same small square,
     and what went into it bulleted and indented under it, scrolling. */
  const list = stack({ left: at.x, top: top + 30, width: at.wide - 20, height: tall - 30 }, 14);
  list.style.fontSize = '14px';
  list.style.fontFamily = "'Josefin Sans',sans-serif";
  list.style.cssText +=
    ';overflow-y:auto;overflow-x:hidden;pointer-events:auto;scrollbar-width:none';
  const newest = versions.find((one) => one.version !== null);
  const lines: HTMLElement[] = [];
  for (const one of versions) {
    const block = document.createElement('div');
    block.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:none';
    const head = row(10);
    head.appendChild(
      box(
        { width: 8, height: 8 },
        `background:${one === newest ? TONE.working : TONE.resting};position:relative;flex:none`
      )
    );
    const name = document.createElement('span');
    name.style.color = one === newest ? '#f4e3c0' : '#dcc8a0';
    name.textContent = one.version === null ? 'not in a version yet' : `v${one.version}`;
    head.appendChild(name);
    block.appendChild(head);
    lines.push(head);
    for (const said of one.lines) {
      const line = document.createElement('div');
      line.style.cssText =
        'display:flex;gap:9px;align-items:baseline;padding-left:18px;font-size:13px;line-height:1.35;color:#dcc8a0';
      const dot = document.createElement('span');
      dot.style.cssText = 'flex:none;color:#a89272';
      dot.textContent = '\u2022';
      const text = document.createElement('span');
      text.style.cssText = 'min-width:0;overflow-wrap:anywhere';
      text.textContent = said;
      line.append(dot, text);
      block.appendChild(line);
      lines.push(line);
    }
    /* A shared repository puts hundreds in a release; the few above say what
       it was, and the rest is only how many. */
    if (one.more > 0) {
      const line = document.createElement('div');
      line.style.cssText =
        'padding-left:35px;font-size:12px;line-height:1.35;color:#a89272;font-style:italic';
      line.textContent = `and ${one.more} more`;
      block.appendChild(line);
      lines.push(line);
    }
    list.appendChild(block);
  }
  root.appendChild(keyed(stays(list, 'log'), 'log'));
  /* Only whole lines: one sliced through the middle by the bottom edge reads
     as the board being broken rather than as there being more. */
  const room = tall - 30;
  const last = lines.filter((one) => one.offsetTop + one.offsetHeight <= room).at(-1);
  if (last) list.style.height = `${last.offsetTop + last.offsetHeight}px`;

  const id = yard.project.id;
  list.scrollTop = logScrolled.get(id) ?? 0;
  list.addEventListener('scroll', () => logScrolled.set(id, list.scrollTop));
  return top;
}

/** Where the changelog was left scrolled to, per project, across redraws. */
const logScrolled = new Map<string, number>();

/* ── what it said ──────────────────────────────────────────────────────────
   Read from the bottom up, the way a conversation is: the answer set large
   at the foot of the column, right over the fire and the line you write on,
   the answers before it dimmed above it, and everything it thought and said
   on the way to each folded out of sight. Opened, the trail comes back in
   between them, each one a little dimmer the further up into the past. At the
   foot of the column, once an answer is finished, is the recap, where the
   whole thing stands, for whoever is coming back to it. */
function thinking(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings,
  walkedIn: boolean,
  since: number | undefined,
  ruled = true
): void {
  const thoughts = yard.session?.thoughts ?? [];
  const heading = label('what it said', { left: at.x, top: HEAD.label });
  /* A session has its columns from the moment it exists, said to or not, so a
     new one reads as the same place every other one is. */
  if (yard.session) {
    /* The answer is read, so the night is laid thicker behind it than
       anywhere else: the village still shows through, but not through the
       words. */
    root.appendChild(
      stays(
        box(
          {
            left: at.x - GUTTER / 2,
            top: HEAD.below,
            width: at.wide + GUTTER,
            height: floor - HEAD.below,
          },
          'background:rgba(18,13,7,.42);pointer-events:none'
        ),
        'shade:said'
      )
    );
    /* No rule down the left of it once the left column has been put away:
       there is nothing on the other side of it to divide it from. */
    if (ruled) {
      root.appendChild(
        stays(
          rule({
            left: at.x - GUTTER / 2,
            top: HEAD.below,
            width: 1,
            height: floor - HEAD.below,
          }),
          'rule:said'
        )
      );
    }
    root.appendChild(stays(heading, 'label:said'));
  }
  const top = HEAD.top;

  const live = yard.session?.live;
  const failure = yard.session?.failure;
  const asking = yard.asking;
  if (!thoughts.length && !live && !failure && !asking) return;

  const room = Math.max(60, floor - top);
  /* A question is pinned to the foot of the column, right over the line it
     is answered on, ruled off above and below, and what it said scrolls in
     the room left over it: the one thing the work is stopped on is never
     scrolled away from, and never read as one more paragraph of the answer. */
  let asked = 0;
  if (asking) {
    const pinned = keyed(box({ left: at.x, width: at.wide }, ASKING_BLOCK), 'gate');
    pinned.appendChild(gate(at.wide, asking, does));
    root.appendChild(pinned);
    asked = Math.min(pinned.offsetHeight, Math.round(room * 0.7));
    pinned.style.top = `${floor - asked}px`;
    pinned.style.height = `${asked}px`;
  }
  const stream = stack(
    { left: at.x, top, width: at.wide, height: Math.max(40, room - (asked ? asked + 18 : 0)) },
    20
  );
  /* The face is picked in fonts.css, the one place it is named. */
  stream.classList.add('said-face');
  stream.style.cssText += ';overflow-y:auto;pointer-events:auto;scrollbar-width:none';

  /* A long conversation is hundreds of turns, and laying every one of them on
     the wood at once is the whole column's cost paid on every single token
     that comes in, whether or not you are looking at any of it. So only the
     most recent stretch is actually drawn; the rest stays a number rather
     than DOM, and pressing it draws the next stretch back, the scroll held
     steady so the words you were reading do not jump. */
  const sessionId = yard.session?.id ?? '';
  const wholeSize = thoughts.length;
  let shown = Math.min(wholeSize, revealedThoughts.get(sessionId) ?? REVEAL_INITIAL);
  const server = yard.session?.olderThoughts ?? 0;

  /* Oldest at the top and the newest under it, the way a conversation reads.
     A short one starts under the heading like any other column; only once it
     runs past the foot does the column scroll to keep the newest in view. The
     column is at least as tall as the room, so the recap can sit at its foot
     however little was said above it. */
  const col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:20px;flex:none;min-height:100%';
  stream.appendChild(col);

  const older = document.createElement('div');
  col.appendChild(older);

  const items = document.createElement('div');
  items.style.cssText = 'display:flex;flex-direction:column;gap:20px';
  col.appendChild(items);

  const recap = yard.session?.recap;
  if (recap && !live && !failure && !asking) col.appendChild(recapped(recap));
  if (failure) col.appendChild(waitOut(failure, does));
  if (live) {
    col.appendChild(
      ember(live, since, yard.session?.building ? () => does.press('watch:build') : undefined)
    );
  }

  function laidOlder(): void {
    const hidden = hiddenCount(wholeSize, shown, server);
    older.replaceChildren();
    if (!hidden || !thinkingOpen()) return;
    const line = exact(`\u25b4 ${hidden} more before these`, 12, '#8a7452');
    if (windowStart(wholeSize, shown) > 0) {
      line.style.cursor = 'pointer';
      line.style.pointerEvents = 'auto';
      line.addEventListener('mousedown', (event) => event.preventDefault());
      line.addEventListener('click', () => {
        /* What comes back is drawn above what you were reading, so the
           column is held by its foot and the words stay where they were. */
        const fromFoot = stream.scrollHeight - stream.scrollTop;
        shown = revealMore(wholeSize, shown, REVEAL_CHUNK);
        revealedThoughts.set(sessionId, shown);
        laidOlder();
        laidItems();
        stream.scrollTop = stream.scrollHeight - fromFoot;
      });
    }
    older.appendChild(line);
  }

  /* Newest last and brightest last, so the column dims as it goes up into
     what was said before. The last one is set large and is the only thing on
     this screen that is, unless it was said before the newest note, in which
     case it is history like the rest and the live edge is what the agent is
     doing about what you said since. */
  const keep = new Set<string>();
  function laidItems(): void {
    items.replaceChildren();
    keep.clear();
    laidOne();
  }
  function laidOne(): void {
    const open = thinkingOpen();
    /* Folded, the stretch drawn is counted in what actually shows, or a long
       turn's reasoning would push every answer before it out of the window. */
    let start = windowStart(wholeSize, shown);
    if (!open) {
      let last = -1;
      thoughts.forEach((one, i) => {
        if (one.live && !one.quiet) last = i;
      });
      let left = shown;
      start = 0;
      for (let i = thoughts.length - 1; i >= 0; i -= 1) {
        const one = thoughts[i]!;
        if (i === last || one.answer || one.progress) left -= 1;
        if (left < 0) {
          start = i + 1;
          break;
        }
      }
    }
    /* Everything on the way to an answer is folded away, and only the
       answers themselves stay out, the older ones dimmed above the newest:
       most of the time what it said back is all anybody came for, and saying
       the next thing must not throw away what it said to the last.
       Pressing "now", or the column's own heading, opens
       the trail upward out of it and folds it again, so the answer never
       moves and there is no extra line on the board to do it with. */
    let answer = -1;
    thoughts.forEach((one, i) => {
      if (one.live && !one.quiet) answer = i;
    });
    /* With the trail open, what it did is laid between what it thought and
       said, in the order it happened, each edit with its lines right there:
       the whole of the way to the answer, not only the talking. */
    const trail = open ? (yard.session?.steps ?? []).filter((step) => step.seq !== undefined) : [];
    let next = 0;
    const firstSeq = thoughts[start]?.seq;
    if (start > 0 && firstSeq !== undefined)
      while (next < trail.length && trail[next]!.seq! < firstSeq) next += 1;
    const placeUpTo = (seq: number | undefined): void => {
      while (next < trail.length && (seq === undefined || trail[next]!.seq! < seq)) {
        const step = trail[next]!;
        next += 1;
        const it = keyed(did(step, does, true), `trail:${step.id}`);
        it.classList.add('trail-deed');
        it.dataset.folds = '1';
        keep.add(`trail:${step.id}`);
        items.appendChild(it);
      }
    };
    /* What would go if the trail were folded is marked, so folding can let
       exactly that go before the column is laid again without it. */
    let markFrom = 0;
    let marking = false;
    const marked = (): void => {
      if (marking)
        for (let c = markFrom; c < items.children.length; c += 1)
          (items.children[c] as HTMLElement).dataset.folds = '1';
      marking = false;
    };
    thoughts.slice(start).forEach((one, si) => {
      const i = start + si;
      const far = thoughts.length - 1 - i;
      marked();
      if (open && one.seq !== undefined) placeUpTo(one.seq);
      const out = i === answer || one.answer || one.progress;
      if (!open && !out) return;
      markFrom = items.children.length;
      marking = open && !out;
      if (one.live) {
        keep.add(one.id);
        const it = keyed(document.createElement('div'), `thought:${one.id}`);
        const trouble = one.trouble ? TROUBLE[one.trouble] : undefined;
        /* The same "how long ago" the gatepost puts over what you said, or
           how long it has been at it while it still is. */
        const clock = one.at ? `${one.at} at this` : one.when;
        const ended = one.ended ? ENDED[one.ended] : undefined;
        const pack = one.pack && one.pack.state !== 'failed' ? PACKING[one.pack.state] : undefined;
        const name = pack?.head ?? trouble?.head ?? ended?.head ?? (one.quiet ? 'thinking' : 'now');
        const state: TurnState = one.quiet
          ? 'quiet'
          : trouble
            ? 'trouble'
            : one.ended === 'done' || one.pack?.state === 'packed'
              ? 'done'
              : one.ended === 'stopped' || one.ended === 'closed' || one.ended === 'cut'
                ? 'stopped'
                : 'going';
        if (trouble && one.trouble && !pack) {
          items.appendChild(
            keyed(
              statusMark(troubleSign(one.trouble), trouble.head, trouble.ink, one.said, clock),
              `thought:${one.id}`
            )
          );
          return;
        }
        it.className = `said-turn said-newest said-${state}`;
        const head = turnHead(
          name,
          one.pack?.state !== 'packing' ? clock : undefined,
          pack?.ink ?? trouble?.ink ?? ended?.ink ?? '#ffc98a',
          state
        );
        folding(head);
        it.appendChild(head);
        if (one.pack && pack) {
          it.appendChild(packed(one.id, one.pack));
          items.appendChild(it);
          return;
        }
        const body = document.createElement('div');
        /* Set large, unless it is long enough that large is a wall: a whole
         report at the size of one sentence is read a word at a time. */
        const size = one.said.length > 700 ? 22 : 24;
        body.style.cssText = one.quiet
          ? 'font-size:18px;line-height:1.4;font-style:italic;color:rgba(255,220,164,.78)'
          : `font-size:${size}px;line-height:1.6;letter-spacing:var(--said-tracking,.01em);color:${trouble?.ink ?? '#ebe3d3'}`;
        if (!one.quiet) body.classList.add('clear');
        if (trouble) body.classList.add('prose-trouble');
        prose(body, one.id, one.said, !walkedIn, openLink(does));
        it.appendChild(body);
        items.appendChild(it);
        return;
      }
      /* Trouble keeps its colour as it goes into the history, dimmed with the
       rest, so scrolling back you can still see where it went wrong. */
      const trouble = one.trouble ? TROUBLE[one.trouble] : undefined;
      const fade = one.progress ? 0.74 : far > 2 ? 0.5 : 0.6;
      items.appendChild(
        keyed(
          thought(
            one,
            one.progress ? 17 : far > 2 ? 15 : 16,
            trouble
              ? `color-mix(in srgb, ${trouble.ink} ${Math.round(fade * 100)}%, transparent)`
              : `rgba(244,227,192,${fade})`,
            trouble?.head,
            trouble?.ink,
            openLink(does)
          ),
          `thought:${one.id}`
        )
      );
    });
    marked();
    if (open) placeUpTo(undefined);
    forgetInk(keep);
  }

  /** Open or fold the trail on the way to the answer. */
  let turning = false;
  function toggle(): void {
    if (turning) return;
    const opening = !thinkingOpen();
    setThinkingOpen(opening);
    const lay = (): Map<string, DOMRect> => {
      const was = measureParts(items);
      laidOlder();
      laidItems();
      followed.delete(sessionId);
      stream.scrollTop = stream.scrollHeight;
      return was;
    };
    if (opening) {
      unfold(stream, items, lay());
      return;
    }
    const going = [...(items.children as HTMLCollectionOf<HTMLElement>)].filter(
      (el) => el.dataset.folds
    );
    turning = true;
    older.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FOLD_MS, fill: 'forwards' });
    void foldAway(stream, going).then(() => {
      turning = false;
      /* The yard may have been written again while it let go, already folded. */
      if (!stream.isConnected) return;
      older.getAnimations().forEach((one) => one.cancel());
      const kept = new Map<string, DOMRect>();
      for (const [key, rect] of measureParts(items))
        if (!going.some((el) => el.dataset.key === key)) kept.set(key, rect);
      lay();
      closeUp(stream, items, kept);
    });
  }
  /** Something that opens and folds the trail when pressed, and looks no different. */
  function folding(el: HTMLElement): void {
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    el.style.alignSelf = 'flex-start';
    el.addEventListener('mousedown', (event) => event.preventDefault());
    el.addEventListener('click', toggle);
  }
  folding(heading);

  laidOlder();
  laidItems();

  root.appendChild(stream);
  /* It follows the live edge while you are at it, and stays put while you have
     scrolled up to read something, because being yanked back down in the
     middle of a sentence is worse than missing the next one. The answer inks
     in and a diagram draws late, so the foot is found again whenever the
     column grows, for as long as it is being followed. */
  /* A question is what the work is stopped on, so it is never left scrolled out of sight. */
  if (walkedIn || asking) followed.delete(sessionId);
  /* And so is the end of a turn: once it is done, whatever it came back with
     is what you are there to read, wherever you had scrolled to while it worked. */
  const working = Boolean(live);
  if (wasWorking.get(sessionId) && !working) followed.delete(sessionId);
  wasWorking.set(sessionId, working);
  const kept = followed.get(sessionId);
  const foot = (): void => {
    if (!stream.isConnected) return growing.disconnect();
    if (!followed.has(sessionId)) stream.scrollTop = stream.scrollHeight;
  };
  const growing = new ResizeObserver(foot);
  if (kept === undefined) foot();
  else stream.scrollTop = kept;
  growing.observe(col);
  heldWhereLeft(stream, followed, sessionId);
}

/**
 * Lets go of the live end only when somebody actually scrolls up. A scroll the
 * column made itself is reported a frame late, by which time the answer may
 * have inked in another line, so "not at the foot" alone would read that as
 * somebody scrolling away and stop following in the middle of an answer.
 */
function heldWhereLeft(el: HTMLElement, left: Map<string, number>, id: string): void {
  let last = el.scrollTop;
  el.addEventListener('scroll', () => {
    /* A column laid over by the next one still reports, with nothing in it,
       and nothing in it reads as sitting at the foot. */
    if (!el.isConnected) return;
    const top = el.scrollTop;
    const rose = top < last;
    last = top;
    if (top + el.clientHeight >= el.scrollHeight - 24) left.delete(id);
    else if (rose || left.has(id)) left.set(id, top);
  });
  /* While an answer inks in the column is laid again faster than a scroll is
     reported, so the wheel itself is what says somebody has gone up to read. */
  el.addEventListener(
    'wheel',
    (event) => {
      if (event.deltaY < 0) left.set(id, Math.max(0, el.scrollTop + event.deltaY));
    },
    { passive: true }
  );
}

/** Whether each session was working when its column was last laid. */
const wasWorking = new Map<string, boolean>();

type TurnState = 'going' | 'done' | 'stopped' | 'trouble' | 'quiet' | 'old';

/** Which small pixel sign a status carries. */
type Sign = 'going' | 'done' | 'stopped' | 'wrong' | 'warn';

/* Drawn in whole pixels, like everything else in the village. */
const SIGN_ART: Record<Exclude<Sign, 'going'>, string[]> = {
  done: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  stopped: ['.#####.', '#######', '##...##', '##...##', '##...##', '#######', '.#####.'],
  wrong: ['##...##', '.##.##.', '..###..', '..###..', '.##.##.', '##...##'],
  warn: ['...#...', '..###..', '..#.#..', '.##.##.', '.#####.', '###.###', '#######'],
};

/** A status's own small sign, in its own colour. */
function signOf(sign: Sign, ink: string): HTMLElement {
  const it = document.createElement('span');
  it.className = `said-sign said-sign-${sign}`;
  it.style.color = ink;
  if (sign === 'going') return it;
  const art = SIGN_ART[sign];
  const wide = Math.max(...art.map((row) => row.length));
  const cells = art.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []
    )
  );
  it.innerHTML = `<svg viewBox="0 0 ${wide} ${art.length}" width="${wide * 2}" height="${art.length * 2}" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
  return it;
}

/**
 * The line over an answer: how its turn stands, said with its sign and its
 * colour, and when.
 */
function turnHead(
  name: string,
  clock: string | undefined,
  ink: string | undefined,
  state: TurnState
): HTMLElement {
  const head = document.createElement('div');
  head.className = 'said-turn-head';
  const sign: Sign | undefined =
    state === 'going'
      ? 'going'
      : state === 'done'
        ? 'done'
        : state === 'stopped'
          ? 'stopped'
          : undefined;
  if (sign) head.appendChild(signOf(sign, ink ?? '#ffc98a'));
  const chip = document.createElement('span');
  chip.className = 'said-turn-chip';
  if (ink) chip.style.setProperty('--chip', ink);
  chip.textContent = clock ? `${name} · ${clock}` : name;
  head.appendChild(chip);
  return head;
}

/**
 * Something that happened to the turn rather than something said in it: you
 * stopped it, it broke off, it ran short. Not a paragraph dressed as an
 * answer but a marked line across the column, its sign and its colour, what
 * happened, and why in a quieter line under it when the why is long.
 */
function statusMark(
  sign: Sign,
  head: string,
  ink: string,
  why: string,
  clock?: string
): HTMLElement {
  const it = document.createElement('div');
  it.className = `said-status said-status-${sign}`;
  it.style.setProperty('--status', ink);
  const line = document.createElement('div');
  line.className = 'said-status-line';
  line.appendChild(signOf(sign, ink));
  const what = document.createElement('span');
  what.className = 'said-status-what';
  what.textContent = head;
  line.appendChild(what);
  const short = why.trim().replace(/\.$/, '');
  const inline = short.length <= 60;
  if (short && inline) {
    const rest = document.createElement('span');
    rest.className = 'said-status-why';
    rest.textContent = short.charAt(0).toLowerCase() + short.slice(1);
    line.appendChild(rest);
  }
  if (clock) {
    const when = document.createElement('span');
    when.className = 'said-status-when';
    when.textContent = clock;
    line.appendChild(when);
  }
  it.appendChild(line);
  if (short && !inline) {
    const rest = document.createElement('div');
    rest.className = 'said-status-long clear';
    rest.textContent = why.trim();
    it.appendChild(rest);
  }
  return it;
}

/** Which sign a kind of trouble is drawn with. */
function troubleSign(kind: NonNullable<Thought['trouble']>): Sign {
  return kind === 'stopped' || kind === 'closed' ? 'stopped' : kind === 'warn' ? 'warn' : 'wrong';
}

/**
 * Where the whole thing stands, once an answer is finished: what it was for,
 * what got done, and the one thing next. Always at the foot of the column,
 * right over the line you write on, however short the answer above it, since
 * it is the last thing read before saying the next. Quieter than the answer,
 * since it is for coming back to, not for reading twice.
 */
function recapped(text: string): HTMLElement {
  const it = keyed(document.createElement('div'), 'recap');
  it.style.cssText = 'display:flex;flex-direction:column;gap:5px;flex:none;margin-top:auto';
  it.appendChild(said('recap', '#b39a74'));
  const body = document.createElement('div');
  body.style.cssText =
    'font-size:17px;line-height:1.6;font-style:italic;letter-spacing:var(--said-tracking,0);color:rgba(235,222,196,.72)';
  body.textContent = text;
  it.appendChild(body);
  return it;
}

/** Where the column was left scrolled to, for a session somebody scrolled up in. */
const followed = new Map<string, number>();

/* Whether the trail on the way to an answer is open. Folded until somebody
   opens it, and remembered the way they left it, across sessions and launches,
   because it is a way of reading rather than a fact about any one session. */
const THINKING_KEY = 'mender.yard.thinking-open';
let thinkingOpenNow: boolean | undefined;
function thinkingOpen(): boolean {
  if (thinkingOpenNow === undefined) {
    try {
      thinkingOpenNow = localStorage.getItem(THINKING_KEY) === '1';
    } catch {
      thinkingOpenNow = false;
    }
  }
  return thinkingOpenNow;
}
function setThinkingOpen(open: boolean): void {
  thinkingOpenNow = open;
  try {
    localStorage.setItem(THINKING_KEY, open ? '1' : '0');
  } catch {
    // Only a convenience; the fold still works for this sitting.
  }
}

/** How many of a session's most recent thoughts are actually drawn, keyed by
    session id, so a long transcript's cost is what a screen's worth of it
    costs rather than its whole history's. */
const revealedThoughts = new Map<string, number>();
const REVEAL_INITIAL = 60;
const REVEAL_CHUNK = 80;

/**
 * The live edge: a small fire with sparks going up off it, what it is doing,
 * and how long it has been at it.
 *
 * Not a spinner. Nothing here spins, and a spinner says only that something
 * is happening, which the fire already says. This says what, and for how long.
 */
function ember(live: Live, since: number | undefined, watch?: () => void): HTMLElement {
  const it = keyed(document.createElement('div'), 'live');
  it.className = 'said-live';

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
  /* Building something with a face: the way to watch it is right where you
     are already looking to see how it is going. */
  if (watch) {
    const go = pressing('watch it', watch);
    go.className += ' said-live-watch';
    words.appendChild(go);
  }
  it.appendChild(words);
  return it;
}

/**
 * A session being woken: the fire, and how long it has been at it, in the
 * middle of the board and nothing else.
 *
 * It comes up only after a moment, because most wakes are over before you
 * would notice, and a wait too short to notice says nothing at all.
 */
function wakingUp(
  root: HTMLElement,
  at: { x: number; wide: number },
  floor: number,
  since: number,
  doing = 'waking up'
): void {
  const it = box(
    { left: at.x, top: HEAD.top, width: at.wide, height: Math.max(0, floor - HEAD.top) },
    'display:flex;align-items:center;justify-content:center;opacity:0;animation:yard-waking 420ms ease-out 350ms forwards'
  );
  /* It keeps its own pause before it shows, so a wake too quick to notice
     says nothing; a switch sweeping it in would show it straight away. */
  it.dataset.ownMotion = '';
  it.appendChild(ember({ doing, answering: false }, since));
  root.appendChild(it);
}

/** The head of a waking board, without the counts that are still being read in. */
function hushed(yard: Yard): Yard {
  const { going: _going, turns: _turns, spawned: _spawned, ...project } = yard.project;
  if (!yard.session) return { ...yard, project };
  const { room: _room, cost: _cost, model: _model, ...session } = yard.session;
  return { ...yard, project, session };
}

/** What a step of a posted plan looks like, behind them, under their hands, or ahead. */
const STEP: Record<string, string> = {
  done: 'color-mix(in srgb, var(--yard-well) 70%, transparent)',
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
/**
 * Where the keyboard is standing on the question up at the gate.
 *
 * The question is answered from the keyboard as much as by hand, wherever the
 * keyboard happens to be: the arrows walk a highlight over everything that
 * can be pressed, return presses what it is on, and a number presses that
 * answer outright. It is kept per question, so moving on starts the
 * highlight at the top of the next one, or on "send it" at the check.
 */
let askFocus = { key: '', at: 0 };

function askKeyOf(asking: Ask): string {
  return `${asking.said}|${asking.answers.map((one) => one.id).join(',')}`;
}

function askFocusOf(asking: Ask): number {
  const key = askKeyOf(asking);
  if (askFocus.key !== key) {
    const send = asking.answers.findIndex((one) => one.kind === 'submit');
    const reviewing = asking.answers.some((one) => one.id.startsWith('q:'));
    askFocus = { key, at: reviewing && send >= 0 ? send : 0 };
  }
  return Math.min(askFocus.at, asking.answers.length - 1);
}

/** Lights the line the keyboard is on, without drawing the question again. */
function lightAsk(at: number): void {
  for (const each of document.querySelectorAll<HTMLElement>('[data-ask-at]')) {
    const on = Number(each.dataset.askAt) === at;
    each.style.background = on ? 'rgba(255,201,138,.10)' : 'transparent';
    each.style.boxShadow = on ? 'inset 2px 0 0 #ffc98a' : 'none';
  }
}

/**
 * The question's own keys. True when it took the key: the arrows, return and
 * the numbers, but only while nothing is written on the line, because
 * anything written there is your own answer and return sends that instead.
 */
export function askKey(
  asking: Ask | undefined,
  written: string,
  event: KeyboardEvent,
  does: Doings
): boolean {
  if (!asking || written.trim()) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const at = askFocusOf(asking);
  const count = asking.answers.length;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    askFocus.at = (at + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
    lightAsk(askFocus.at);
    return true;
  }
  /* "send it" and "talk it over instead" sit side by side, so left and right
     walk between them, and from any answer step down onto that line. */
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const doings = asking.answers
      .map((one, index) => ({ one, index }))
      .filter(({ one }) => one.kind === 'submit' || one.kind === 'talk')
      .map(({ index }) => index);
    if (!doings.length) return true;
    const along = doings.indexOf(at);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    askFocus.at =
      along < 0
        ? doings[step > 0 ? 0 : doings.length - 1]
        : doings[(along + step + doings.length) % doings.length];
    lightAsk(askFocus.at);
    return true;
  }
  const pick = (index: number): boolean => {
    const answer = asking.answers[index];
    if (!answer) return false;
    askFocus.at = index;
    lightAsk(index);
    does.answer(answer.id, answer.requestId);
    return true;
  };
  /* Space ticks the answer under the light, the way a list of boxes does
     everywhere else; return does the same. */
  if (event.key === 'Enter' || event.key === ' ') return pick(at) || true;
  /* Tab sends whatever is ticked, so a question that takes several is never
     a walk down past every answer to reach the line that sends them. */
  if (event.key === 'Tab' && !event.shiftKey) {
    const send = asking.answers.findIndex((one) => one.kind === 'submit');
    return send >= 0 ? pick(send) : false;
  }
  if (/^[1-9]$/.test(event.key)) {
    const numbered = asking.answers
      .map((one, index) => ({ one, index }))
      .filter(({ one }) => one.kind !== 'submit' && one.kind !== 'talk');
    const hit = numbered[Number(event.key) - 1];
    return hit ? pick(hit.index) : true;
  }
  return false;
}

function gate(wide: number, asking: Ask, does: Doings): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'position:relative';
  const head = label(
    ['it is asking you', asking.header?.toLowerCase(), asking.step].filter(Boolean).join(' · '),
    {}
  );
  /* Pixel type for the header and the answers' names, the way a game puts a
     choice to you, so the question never reads as more of the answer. */
  head.style.cssText += ';font-family:Silkscreen,monospace;letter-spacing:.08em';
  head.style.color = '#ffc98a';
  head.dataset.q = 'head';
  it.appendChild(head);
  const said = document.createElement('div');
  said.style.cssText = `${ASKED};margin-top:12px;max-width:${wide}px`;
  said.textContent = asking.said;
  said.dataset.q = 'text';
  it.appendChild(said);

  const focus = askFocusOf(asking);
  /* Whether several can be picked: the answers then carry boxes rather than
     rings, so it is plain before pressing anything that picks add up. */
  const several =
    asking.answers.some((one) => one.kind === 'submit') &&
    !asking.answers.some((one) => one.id.startsWith('q:'));
  const reviewing = asking.answers.some((one) => one.id.startsWith('q:'));

  /* The answers, each a row of its own: a number, a ring or a box saying
     whether it is picked, its name and what it would mean. */
  const answers = document.createElement('div');
  answers.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-top:16px';
  /* What you can do with them, set right apart on one line of its own:
     these are not answers, so they never look like one. */
  const doings = document.createElement('div');
  doings.style.cssText =
    'display:flex;flex-wrap:wrap;align-items:center;gap:6px 22px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(244,227,192,.14)';

  let number = 0;
  for (const [i, answer] of asking.answers.entries()) {
    const action = answer.kind === 'submit' || answer.kind === 'talk';
    const go = (): void => {
      askFocus.at = i;
      does.answer(answer.id, answer.requestId);
    };
    const line = document.createElement('div');
    line.dataset.askAt = String(i);
    line.style.cssText = action
      ? 'display:inline-flex;align-items:center;gap:8px;padding:5px 10px;cursor:pointer;pointer-events:auto;border-radius:2px'
      : 'display:flex;align-items:baseline;gap:12px;padding:7px 10px;cursor:pointer;pointer-events:auto;border-radius:2px';
    line.addEventListener('mousedown', (event) => event.preventDefault());
    line.addEventListener('mouseenter', () => {
      askFocus.at = i;
      lightAsk(i);
    });
    line.addEventListener('click', go);

    if (action) {
      const name = document.createElement('span');
      name.className = 'press';
      name.textContent = answer.said;
      name.style.cssText +=
        answer.kind === 'submit'
          ? ';font-family:Silkscreen,monospace;font-size:13px;letter-spacing:.06em'
          : ";font-family:'Josefin Sans',sans-serif;font-size:14px;font-style:italic";
      line.appendChild(name);
      doings.appendChild(line);
      continue;
    }

    number += 1;
    const key = document.createElement('span');
    key.style.cssText = KEY;
    key.textContent = String(number);
    key.dataset.q = 'key';
    line.appendChild(key);
    const picked = answer.said.startsWith('✓ ');
    const plain = answer.said.replace(/^✓ /, '');
    if (!reviewing) {
      const mark = document.createElement('span');
      mark.style.cssText = `font-family:Silkscreen,monospace;font-size:13px;flex:none;width:22px;color:${picked ? '#ffc98a' : '#8a7452'}`;
      mark.textContent = answer.kind === 'other' ? '' : several ? (picked ? '[x]' : '[ ]') : '( )';
      line.appendChild(mark);
    }
    /* An agent marks its own favourite by writing it into the name; it reads
       better said quietly after the name than shouted inside it. */
    const favoured = /\s*\(recommended\)\s*$/i.test(plain);
    const name = document.createElement('span');
    name.className = 'press';
    name.textContent = plain.replace(/\s*\(recommended\)\s*$/i, '');
    name.style.cssText +=
      answer.kind === 'other'
        ? ";font-family:'Josefin Sans',sans-serif;font-size:15px;font-style:italic"
        : ';font-family:Silkscreen,monospace;font-size:13px;letter-spacing:.03em';
    name.dataset.q = 'option';
    const named = document.createElement('span');
    named.appendChild(name);
    if (favoured) {
      const tag = document.createElement('span');
      tag.style.cssText = `${ABOUT};margin-left:10px;font-style:italic`;
      tag.textContent = 'recommended';
      named.appendChild(tag);
    }
    const about =
      answer.about ?? (answer.kind === 'other' ? 'type it on the line below' : undefined);
    if (about) {
      const both = document.createElement('div');
      both.style.cssText = 'display:flex;flex-direction:column;gap:3px;min-width:0';
      both.appendChild(named);
      const under = document.createElement('div');
      under.style.cssText = ABOUT;
      under.textContent = about;
      under.dataset.q = 'about';
      both.appendChild(under);
      line.appendChild(both);
    } else line.appendChild(named);
    answers.appendChild(line);
  }
  it.appendChild(answers);

  /* How to work it, said once in the quiet ink: the keys are the same on
     every question, so this is the only place they need saying. */
  const how = document.createElement('span');
  how.style.cssText = `${ABOUT};font-style:italic;margin-left:auto`;
  how.textContent = reviewing
    ? '↑ ↓ to move · return to change one or send'
    : several
      ? '↑ ↓ to move · space ticks · tab sends · or write your own below'
      : '↑ ↓ to move · return picks · or write your own below';
  doings.appendChild(how);
  it.appendChild(doings);
  requestAnimationFrame(() => lightAsk(focus));
  return it;
}

const ABOUT = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:13px',
  'line-height:1.4',
  'color:#a89272',
].join(';');

const ASKING_BLOCK = [
  'box-sizing:border-box',
  'padding:18px 0 20px',
  'border-top:1px solid rgba(244,227,192,.22)',
  'border-bottom:1px solid rgba(244,227,192,.22)',
  'background:linear-gradient(rgba(18,13,7,.55),rgba(18,13,7,.3))',
  'overflow-y:auto',
  'scrollbar-width:none',
  'pointer-events:auto',
].join(';');

const ASKED = [
  'font-family:Silkscreen,monospace',
  'font-size:15px',
  'letter-spacing:.03em',
  'line-height:1.6',
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

/** A link an agent wrote, pressed out to whatever the machine reads the web with. */
function openLink(does: Doings): (url: string) => void {
  return (url) => does.press(`link:${url}`);
}

function thought(
  one: Thought,
  size: number,
  ink: string,
  name?: string,
  tone?: string,
  link?: (url: string) => void
): HTMLElement {
  if (one.trouble && name && tone) {
    const mark = statusMark(troubleSign(one.trouble), name, tone, one.said, one.when || undefined);
    mark.classList.add('said-status-older');
    return mark;
  }
  const it = document.createElement('div');
  it.className = `said-turn said-older${one.quiet ? ' said-quiet' : ''}`;
  /* Only where there is something true to say. A thought with no clock on it
     gets no line above it at all rather than an empty one. */
  const label = name ? (one.when ? `${name} · ${one.when}` : name) : one.when;
  if (label) it.appendChild(turnHead(label, undefined, tone, 'old'));
  const body = document.createElement('div');
  body.style.cssText = `font-size:${size}px;line-height:1.6;letter-spacing:var(--said-tracking,.01em);color:${ink}`;
  body.classList.add('clear');
  if (tone) body.classList.add('prose-trouble');
  prose(body, one.id, one.said, false, link);
  it.appendChild(body);
  return it;
}

/* ── what it is doing, what it did, and the ground ─────────────────────────
   At the top, whatever the session is in the middle of right now: a question
   it is standing at the gate with, or the plan it is working through, and
   nothing when it is neither. Under that, every step it took with a prop from
   the kit standing for each and the lines it actually changed under each
   edit, scrolling, following the live end the way the answer does. At the
   foot of the column the yard itself: the fire, and everybody it sent out,
   placed by what they are doing rather than listed. */
/**
 * Whether the left column has nothing in it to draw: nothing said yet and no
 * changelog, or whatever there is put away. It gives its room to the middle
 * the same way an empty right column does.
 */
function leftEmpty(yard: Yard | undefined): boolean {
  if (!yard) return false;
  return (
    (hidden('asked') || !yard.session?.notes.length) &&
    (hidden('changelog') || !yard.versions?.length)
  );
}

/**
 * Whether the right column has nothing in it to draw. Nothing is written over
 * nothing there, so an empty column gives its room to the middle rather than
 * standing as a blank strip down the side.
 */
function rightEmpty(yard: Yard | undefined): boolean {
  if (!yard) return false;
  const session = yard.session;
  if (!session || session.waking) return true;
  return (
    (hidden('now') || !session.story?.goal) &&
    (hidden('made') || !session.made?.length) &&
    (hidden('building') || !session.building) &&
    (hidden('did') ||
      (!session.story?.chapters.length && !session.agents?.some((one) => one.where === 'out')))
  );
}

function made(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): void {
  if (!at.wide) return;
  const session = yard.session;
  const story = session?.story;
  const goal = hidden('now') ? undefined : story?.goal;
  const output = hidden('made') ? [] : (session?.made ?? []);
  const chapters = hidden('did') ? [] : (story?.chapters ?? []);
  const ends = hidden('did') ? [] : (story?.ends ?? []);
  /* The ground is only stood on while somebody is still out there: once they
     are all home, the piece of work that sent them says so in a line. */
  const hands = hidden('did') ? [] : (session?.agents ?? []);
  const out = hands.some((one) => one.where === 'out');
  const building = hidden('building') ? undefined : session?.building;

  /* NOTHING IS WRITTEN OVER NOTHING.
   *
   * A heading with an empty column under it does not say "this has not
   * happened yet", it says the screen is broken. So a section that has nothing
   * in it is not drawn at all, and the column's own rule goes with them,
   * because a line down an empty third of the screen is the same lie in
   * thinner form. */
  if (!goal && !output.length && !chapters.length && !out && !building) return;

  root.appendChild(
    stays(
      rule({
        left: at.x - GUTTER / 2,
        top: HEAD.below,
        width: 1,
        height: floor - HEAD.below,
      }),
      'rule:did'
    )
  );

  /* The ground is the foot of this column whatever happened above it, so
     everything else in here gets the room between the header and the yard
     and not one pixel more. */
  const patch = out ? groundTop(hands.length, floor) : floor;
  /* What it is building stands at the head of the column and does not scroll
     with the story under it: the story follows the live end while it works,
     and the page is the one thing here worth keeping in view all the while. */
  let head = 0;
  if (building && session) {
    const page = built(session, building, at.wide, does);
    page.style.left = `${at.x}px`;
    page.style.top = `${HEAD.label}px`;
    root.appendChild(page);
    head = page.offsetHeight + (goal || output.length || chapters.length ? 22 : 0);
    region('building', at, HEAD.label, HEAD.label + page.offsetHeight);
  }
  const tall = Math.max(0, patch - (out ? 14 : 24) - HEAD.label - head);
  /* One column read top to bottom, scrolling as one: what it is after, what
     it made, how it went and what is left, so the story is never in two
     boxes scrolling against each other. */
  const it = box(
    { left: at.x, top: HEAD.label + head, width: at.wide, height: tall },
    [
      'display:flex',
      'flex-direction:column',
      "font-family:'Josefin Sans',sans-serif",
      'overflow-y:auto',
      'overflow-x:hidden',
      'pointer-events:auto',
      'scrollbar-width:none',
    ].join(';')
  );
  it.className = 'story';
  root.appendChild(it);

  const parts: HTMLElement[] = [];
  if (goal && story) parts.push(keyed(after(goal, story.state), 'story:goal'));
  if (output.length) parts.push(keyed(carted(at.wide, output, does), 'story:made'));
  if (chapters.length && session) parts.push(keyed(went(session, chapters, does), 'story:went'));
  if (ends.length) parts.push(keyed(loose(ends), 'story:ends'));
  parts.forEach((part, i) => {
    if (i) it.appendChild(storyRule());
    it.appendChild(part);
  });

  const top = HEAD.label + head;
  if (goal) region('now', at, top, top + (parts[0]?.offsetHeight ?? 0));
  const madePart = parts.find((one) => one.dataset.key === 'story:made');
  if (madePart)
    region('made', at, top + madePart.offsetTop, top + madePart.offsetTop + madePart.offsetHeight);
  const wentPart = parts.find((one) => one.dataset.key === 'story:went');
  if (wentPart) region('did', at, top + wentPart.offsetTop, floor);

  /* While it works the column follows the live end, the piece of work it is
     on; once it has stopped it opens on what it is after, at the top. Either
     way it stays where it was left once somebody has scrolled it. */
  const id = session?.id ?? '';
  const going = story?.state?.tone === 'going';
  const kept = storyFollowed.get(id);
  const settle = (): void => {
    if (storyFollowed.has(id)) return;
    it.scrollTop = going ? it.scrollHeight : 0;
  };
  if (kept === undefined) {
    settle();
    for (const wait of [60, 250, 700]) window.setTimeout(settle, wait);
  } else it.scrollTop = kept;
  heldWhereLeft(it, storyFollowed, id);
  /* Scrolled to the foot while it is not working is not "following": it
     opens at the top again next time unless it was left somewhere. */
  if (!going) it.addEventListener('scroll', () => storyFollowed.set(id, it.scrollTop));

  if (out) ground(root, at, yard, floor, does);
}

/** How long a change it just drew stays marked on the page. */
const JUST_DREW_MS = 9_000;

/**
 * What it is building: the page itself as it last looked, with what it just
 * drew marked on it, and the way into watching it.
 *
 * No frame round it. The page is lit, so it throws light on the wood under
 * it, and four ember corners hold it where a frame would be.
 */
function built(session: Session, building: Building, wide: number, does: Doings): HTMLElement {
  const it = keyed(document.createElement('div'), 'story:building');
  it.className = 'building';
  it.style.width = `${wide}px`;
  it.appendChild(label("what it's building", {}));
  const latest = building.looks.at(-1);
  if (!latest) return it;
  const working = session.fire === 'lit';

  const glass = document.createElement('div');
  glass.className = 'building-glass';
  glass.title = 'watch it build';
  const shot = document.createElement('img');
  shot.src = latest.image;
  shot.alt = building.page.name;
  shot.draggable = false;
  glass.appendChild(shot);
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    const bracket = document.createElement('i');
    bracket.className = `building-corner building-${corner}`;
    glass.appendChild(bracket);
  }
  if (working) {
    const tag = document.createElement('span');
    tag.className = 'building-live';
    tag.textContent = 'live';
    glass.appendChild(tag);
  }
  const since = Date.now() - latest.when;
  if (latest.drew && since < JUST_DREW_MS) glass.appendChild(justDrew(latest.drew, since));
  glass.addEventListener('mousedown', (event) => event.preventDefault());
  glass.addEventListener('click', () => does.press('watch:build'));
  it.appendChild(glass);

  const about = document.createElement('div');
  about.className = 'building-about';
  const ago =
    Date.now() - latest.at < 60_000 ? 'just now' : `${longFor(Date.now() - latest.at)} ago`;
  const looks = building.looks.length;
  about.textContent = [
    building.page.name,
    `${working ? 'redrawn' : 'last drawn'} ${ago}`,
    looks > 1 ? `${looks} looks` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  it.appendChild(about);

  const watch = pressing('watch it build', () => does.press('watch:build'));
  watch.className += ' building-watch';
  const key = document.createElement('span');
  key.className = 'building-key';
  key.textContent = '\u2318L';
  const line = document.createElement('div');
  line.className = 'building-line';
  line.append(watch, key);
  it.appendChild(line);
  return it;
}

/**
 * Where the last change landed, marked on the page and fading over a few
 * seconds. The yard is drawn afresh on every change, so the fade is started
 * however far into it it already is rather than from the top each time.
 */
export function justDrew(drew: Drew, since: number, big = false): HTMLElement {
  const mark = document.createElement('div');
  mark.className = big ? 'building-drew building-drew-big' : 'building-drew';
  mark.style.left = `${drew.x * 100}%`;
  mark.style.top = `${drew.y * 100}%`;
  mark.style.width = `${drew.w * 100}%`;
  mark.style.height = `${drew.h * 100}%`;
  mark.style.animationDelay = `-${Math.round(since)}ms`;
  mark.style.animationDuration = `${JUST_DREW_MS}ms`;
  const tab = document.createElement('span');
  tab.textContent = 'just drew';
  mark.appendChild(tab);
  return mark;
}

/** Where the story column was left scrolled to, by session. */
const storyFollowed = new Map<string, number>();

/** A rule between two parts of the story, with room either side of it. */
function storyRule(): HTMLElement {
  const line = document.createElement('div');
  line.className = 'story-rule';
  return line;
}

/** What the whole session is after, and where it stands in a word or two. */
function after(goal: string, state: Story['state']): HTMLElement {
  const it = document.createElement('div');
  it.className = 'story-part';
  it.appendChild(label("what it's after", {}));
  const said = document.createElement('div');
  said.className = 'story-goal';
  said.textContent = goal;
  it.appendChild(said);
  if (state) {
    const where = document.createElement('div');
    where.className = `story-state story-state-${state.tone}`;
    where.textContent = state.said;
    it.appendChild(where);
  }
  return it;
}

/** Which finished pieces of work have had their steps opened, across redraws. */
const openChapters = new Set<string>();
/** And which live ones have had everything before "just now" opened. */
const openLive = new Set<string>();

/** How many of a live piece's most recent steps stand under it. */
const JUST_NOW = 6;

/**
 * How it went: every piece of work it has been through, oldest first, each
 * with how it came out. The one it is on carries the plan it is working
 * through and the last few things it did; a finished one folds what it did
 * away under a line that opens it.
 */
function went(session: Session, chapters: Chapter[], does: Doings): HTMLElement {
  const it = document.createElement('div');
  it.className = 'story-part';
  it.appendChild(label('how it went', {}));
  const list = document.createElement('div');
  list.className = 'chapters';
  for (const chapter of chapters) {
    if (chapter.pushback) list.appendChild(pushedBack(chapter.pushback));
    list.appendChild(chaptered(session, chapter, does));
  }
  it.appendChild(list);
  return it;
}

/** Him putting it right, as its own step in the story, in the post's colour. */
function pushedBack(said: string): HTMLElement {
  const it = document.createElement('div');
  it.className = 'chapter chapter-you';
  it.appendChild(chapterSign('you'));
  const body = document.createElement('div');
  body.className = 'chapter-body';
  const title = document.createElement('div');
  title.className = 'chapter-title';
  title.textContent = `you said: ${said}`;
  body.appendChild(title);
  it.appendChild(body);
  return it;
}

function chaptered(session: Session, chapter: Chapter, does: Doings): HTMLElement {
  const live = chapter.state === 'going';
  const it = document.createElement('div');
  it.className = `chapter chapter-${chapter.state}${chapter.title ? '' : ' chapter-unnamed'}`;
  /* One not named yet is only what it did, with no sign or heading of its own. */
  if (chapter.title) it.appendChild(chapterSign(chapter.state));
  const body = document.createElement('div');
  body.className = 'chapter-body';
  if (chapter.title) {
    const title = document.createElement('div');
    title.className = 'chapter-title';
    title.textContent = chapter.title;
    body.appendChild(title);
  }

  /* What came of it, then the facts nobody has to work out: whether it went
     into a commit, a build, a push, and how many it sent out. */
  const steps = chapter.steps;
  const kinds = new Set(steps.map((one) => one.kind));
  const sent = steps.filter((one) => one.kind === 'send').length;
  const facts: (string | HTMLElement)[] = [];
  if (chapter.how) facts.push(chapter.how.replace(/[.\s]+$/, ''));
  if (!live && sent) facts.push(`sent ${sent === 1 ? 'one helper' : `${sent} helpers`} out`);
  /* Unless the line already says so, which the model is fond of doing. */
  const says = (word: RegExp): boolean => word.test(chapter.how ?? '');
  if (kinds.has('commit') && !says(/\bcommit/i))
    facts.push(tinted('committed', 'var(--yard-quoted)'));
  if (kinds.has('push') && !says(/\bpush/i)) facts.push(tinted('pushed', 'var(--yard-quoted)'));
  if (kinds.has('build') && !says(/\bbuil[td]/i)) facts.push('built');
  const open = live ? openLive.has(chapter.id) : openChapters.has(chapter.id);
  /* "Just now" is what it has done since the newest note, and no more than a
     handful of that; everything before it in this piece folds. */
  const recent = live ? Math.min(chapter.latest ?? steps.length, JUST_NOW) : 0;
  const folded = live ? steps.length - recent : steps.length;
  let toggle: HTMLElement | undefined;
  if (folded) {
    toggle = document.createElement('span');
    toggle.className = 'chapter-fold';
    const many = live
      ? `${folded} earlier ${folded === 1 ? 'step' : 'steps'}`
      : `${folded} ${folded === 1 ? 'step' : 'steps'}`;
    toggle.textContent = `${many} ${open ? '\u25be' : '\u25b8'}`;
    toggle.addEventListener('mousedown', (event) => event.preventDefault());
    facts.push(toggle);
  }
  if (facts.length) {
    const line = document.createElement('div');
    line.className = 'chapter-how';
    facts.forEach((one, i) => {
      if (i) line.append(' \u00b7 ');
      line.append(one);
    });
    body.appendChild(line);
  }

  if (live && session.plan.length) body.appendChild(planned(session.plan, false));

  const under = document.createElement('div');
  under.className = 'chapter-steps';
  const fill = (): void => {
    under.replaceChildren();
    const shown = live
      ? openLive.has(chapter.id)
        ? steps
        : recent
          ? steps.slice(-recent)
          : []
      : openChapters.has(chapter.id)
        ? steps
        : [];
    if (live && shown.length) {
      const now = said(openLive.has(chapter.id) ? 'what it did' : 'just now', '#8f7c5f');
      now.className = 'chapter-now';
      under.appendChild(now);
    }
    for (const one of shown) {
      const step = keyed(did(one, does), `step:${one.id}`);
      step.style.flex = 'none';
      under.appendChild(step);
    }
  };
  toggle?.addEventListener('click', () => {
    const set = live ? openLive : openChapters;
    if (set.has(chapter.id)) set.delete(chapter.id);
    else set.add(chapter.id);
    const many = toggle!.textContent!.replace(/\s[\u25b8\u25be]$/, '');
    toggle!.textContent = `${many} ${set.has(chapter.id) ? '\u25be' : '\u25b8'}`;
    fill();
  });
  fill();
  body.appendChild(under);
  it.appendChild(body);
  return it;
}

function tinted(text: string, ink: string): HTMLElement {
  const it = document.createElement('span');
  it.style.color = ink;
  it.textContent = text;
  return it;
}

/** What was left unfinished, unchecked, or waiting on him. */
function loose(ends: string[]): HTMLElement {
  const it = document.createElement('div');
  it.className = 'story-part';
  it.appendChild(label('loose ends', {}));
  const list = document.createElement('div');
  list.className = 'story-ends';
  for (const end of ends) {
    const line = document.createElement('div');
    line.className = 'story-end';
    line.textContent = end;
    list.appendChild(line);
  }
  it.appendChild(list);
  return it;
}

/* Each way a piece of work can stand has a sign of its own, in whole pixels
   like the steps': a tick for done, a half-filled ring for done in part, a
   dash for put down, the post's own speech mark for him putting it right,
   and the fire's ember for the one it is on now. */
const CHAPTER_ART: Record<'done' | 'partial' | 'dropped' | 'you', string[]> = {
  done: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  partial: ['..###..', '.#..##.', '#...###', '#...###', '.#..##.', '..###..'],
  dropped: ['.......', '.......', '#######', '.......', '.......', '.......'],
  you: ['#####..', '#...#..', '#...#..', '#####..', '...##..', '....#..'],
};
const CHAPTER_INK: Record<'done' | 'partial' | 'dropped' | 'you', string> = {
  done: 'var(--yard-well)',
  partial: 'var(--yard-warn)',
  dropped: '#8f7c5f',
  you: '#d8b47c',
};

function chapterSign(state: Chapter['state'] | 'you'): HTMLElement {
  const slot = document.createElement('span');
  slot.className = 'deed-sign chapter-sign';
  if (state === 'going') {
    const ember = document.createElement('span');
    ember.className = 'deed-ember';
    slot.appendChild(ember);
    return slot;
  }
  const art = CHAPTER_ART[state];
  slot.style.color = CHAPTER_INK[state];
  const wide = Math.max(...art.map((one) => one.length));
  const cells = art.flatMap((one, y) =>
    [...one].flatMap((c, x) =>
      c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []
    )
  );
  slot.innerHTML = `<svg viewBox="0 0 ${wide} ${art.length}" width="${wide * 2}" height="${art.length * 2}" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
  return slot;
}

/**
 * What it made, a line apiece.
 *
 * Each is its kind's own small sign, its name to press and how long ago, the
 * newest on top and set a little larger since it is the one you came back
 * for. A billboard in the hand was a big prop nobody ever pressed, holding
 * one name the size of a heading.
 */
function carted(wide: number, made: Session['made'], does: Doings): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = "position:relative;font-family:'Josefin Sans',sans-serif";
  it.appendChild(label('what it made', {}));

  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;gap:7px;margin-top:12px;max-width:${wide}px`;
  made.forEach((one, i) => {
    const line = document.createElement('div');
    line.style.cssText = 'display:flex;align-items:baseline;gap:9px;min-width:0';
    line.appendChild(madeSign(one.kind, i === 0));
    const picture = one.picture;
    const name = picture
      ? pressing(one.what, () => {
          unpreview();
          void onThisMachine(picture).then((src) => {
            if (src) holdUp(src, one.what, larger(picture));
            else does.press(one.pick);
          });
        })
      : pressing(one.what, () => does.press(one.pick));
    if (picture) {
      name.addEventListener('mouseenter', () => preview(name, [onThisMachine(picture)]));
      name.addEventListener('mouseleave', unpreview);
    }
    name.style.cssText += `;font-size:${i ? 13 : 15}px;line-height:1.3;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
    line.appendChild(name);
    const when = said(one.when, i ? '#7d6b4f' : '#a8c469');
    when.style.cssText += ';margin-left:auto;padding-left:8px;flex:none;white-space:nowrap';
    line.appendChild(when);
    list.appendChild(line);
  });
  it.appendChild(list);
  return it;
}

/* A page is a little globe, a file the same page "read" is drawn with, a
   build the same box a build step carries, in the colour of that step. */
const MADE_ART: Record<Session['made'][number]['kind'], string[]> = {
  page: ['..###..', '.#.#.#.', '#######', '#..#..#', '#######', '.#.#.#.', '..###..'],
  file: ['#####..', '#...##.', '#.....#', '#.###.#', '#.....#', '#.###.#', '#######'],
  build: ['.#####.', '#.....#', '#######', '#..#..#', '#..#..#', '#..#..#', '#######'],
};
const MADE_INK: Record<Session['made'][number]['kind'], string> = {
  page: '#8cc4d6',
  file: '#b39a74',
  build: '#ffa54f',
};

function madeSign(kind: Session['made'][number]['kind'], newest: boolean): HTMLElement {
  const slot = document.createElement('span');
  const art = MADE_ART[kind];
  const wide = Math.max(...art.map((one) => one.length));
  slot.style.cssText = `flex:none;align-self:center;display:inline-flex;color:${MADE_INK[kind]};opacity:${newest ? 1 : 0.7}`;
  const cells = art.flatMap((one, y) =>
    [...one].flatMap((c, x) =>
      c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []
    )
  );
  slot.innerHTML = `<svg viewBox="0 0 ${wide} ${art.length}" width="${wide * 2}" height="${art.length * 2}" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
  return slot;
}

/** The plan it posted, done steps inked out and the one it is on lit. */
function planned(plan: Session['plan'], headed = true): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = "position:relative;font-family:'Josefin Sans',sans-serif";
  if (headed) it.appendChild(label('the plan', {}));
  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;gap:${headed ? 7 : 5}px;margin-top:${headed ? 14 : 10}px`;
  for (const step of plan) {
    const line = document.createElement('div');
    line.style.cssText = `font-size:14px;line-height:1.3;color:${STEP[step.state]}`;
    if (step.state === 'done') {
      line.style.textDecoration = 'line-through';
      line.style.textDecorationColor = 'rgba(168,146,114,.55)';
    }
    if (step.state === 'doing') line.dataset.doing = '';
    line.textContent = step.said;
    list.appendChild(line);
  }
  it.appendChild(list);
  return it;
}

/** One thing it did, with the prop that stands for it in a fixed slot. */
function did(one: Step, does: Doings, whole = false): HTMLElement {
  const it = document.createElement('div');
  it.className = `deed${one.group ? ' deed-looked' : ''}${one.running ? ' deed-running' : ''}${one.tone === 'broken' ? ' deed-broken' : ''}`;
  if (one.group) {
    it.appendChild(lookedLine(one));
    return it;
  }
  it.appendChild(deedLine(one));
  if (one.diff?.length) it.appendChild(diffPreview(one, does, whole));
  return it;
}

/* ── the signs a step is drawn with ─────────────────────────────────────────
   Each kind of thing it did has a small sign of its own in whole pixels, in
   the colour of what it is: looking is the post's own tan, something new is
   green, something changed is cream, something run is the fire, git is the
   exact blue, a helper sent out is violet. A kit prop shrunk to fit a line
   was a blur; these are drawn at the size they are read. */
const DEED_ART: Record<StepKind, string[]> = {
  look: ['.........', '..#####..', '.#..#..#.', '#..###..#', '.#..#..#.', '..#####..', '.........'],
  read: ['#####..', '#...##.', '#.....#', '#.###.#', '#.....#', '#.###.#', '#######'],
  write: ['#####..', '#...##.', '#..#..#', '#.###.#', '#..#..#', '#.....#', '#######'],
  edit: ['.....##', '....###', '...###.', '..###..', '.###...', '##.....', '#......'],
  delete: ['.#####.', '#######', '.#...#.', '.#.#.#.', '.#.#.#.', '.#...#.', '.#####.'],
  run: ['...#...', '..##...', '..###.#', '.#####.', '.##.##.', '.#...#.', '..###..'],
  test: ['..###..', '..#.#..', '..#.#..', '.#...#.', '#.....#', '#.###.#', '#######'],
  build: ['.#####.', '#.....#', '#######', '#..#..#', '#..#..#', '#..#..#', '#######'],
  install: ['...#...', '...#...', '.#####.', '..###..', '...#...', '#.....#', '#######'],
  commit: ['.......', '..###..', '.#...#.', '##...##', '.#...#.', '..###..', '.......'],
  push: ['...#...', '..###..', '.#####.', '...#...', '...#...', '...#...', '.#####.'],
  git: ['.#...#.', '.#...#.', '.#..#..', '.#.#...', '.##....', '.#.....', '.#.....'],
  send: ['..##...', '..##...', '.####..', '#.##.#.', '..##...', '.#..#..', '.#..#..'],
  plan: ['#.#####', '.......', '#.#####', '.......', '#.#####', '.......', '#.###..'],
  tool: ['.......', '..###..', '.#####.', '.##.##.', '.#####.', '..###..', '.......'],
};

const DEED_INK: Record<StepKind, string> = {
  look: '#8f7c5f',
  read: '#b39a74',
  write: '#a8c469',
  edit: '#f4e3c0',
  delete: '#d98a6a',
  run: '#ffa54f',
  test: '#a8c469',
  build: '#ffa54f',
  install: '#f4e3c0',
  commit: '#8cc4d6',
  push: '#8cc4d6',
  git: '#8cc4d6',
  send: '#c9b2ff',
  plan: '#b39a74',
  tool: '#b39a74',
};

/** A step's sign: its kind's, the sore cross when it failed, a blinking ember while it runs. */
function deedSign(one: Step): HTMLElement {
  const slot = document.createElement('span');
  slot.className = 'deed-sign';
  if (one.running) {
    const ember = document.createElement('span');
    ember.className = 'deed-ember';
    slot.appendChild(ember);
    return slot;
  }
  const kind: StepKind = one.kind ?? (one.group ? 'look' : 'tool');
  const broke = one.tone === 'broken' || one.note === 'failed';
  const art = broke ? SIGN_ART.wrong : DEED_ART[kind];
  slot.style.color = broke ? 'var(--yard-wrong)' : DEED_INK[kind];
  const wide = Math.max(...art.map((row) => row.length));
  const cells = art.flatMap((row, y) =>
    [...row].flatMap((c, x) =>
      c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []
    )
  );
  slot.innerHTML = `<svg viewBox="0 0 ${wide} ${art.length}" width="${wide * 2}" height="${art.length * 2}" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
  return slot;
}

/**
 * A run of looking around, as one quiet line. Pressing it opens what each of
 * those actually was, small, under it; pressing it again folds them away.
 */
function lookedLine(one: Step): HTMLElement {
  const it = document.createElement('div');
  it.className = 'deed-body';
  const line = document.createElement('div');
  line.className = 'deed-line';
  line.appendChild(deedSign(one));
  const text = document.createElement('span');
  text.className = 'deed-said deed-said-looked';
  const open = openLooks.has(one.id);
  text.textContent = `${one.did} ${open ? '\u25be' : '\u25b8'}`;
  text.addEventListener('mousedown', (event) => event.preventDefault());
  line.appendChild(text);
  it.appendChild(line);
  const list = document.createElement('div');
  list.className = 'deed-under';
  const fill = (): void => {
    list.replaceChildren();
    if (!openLooks.has(one.id)) return;
    for (const each of one.group ?? []) {
      const said = document.createElement('span');
      said.className = 'deed-under-line';
      said.textContent = each.did;
      said.title = each.did;
      list.appendChild(said);
    }
  };
  text.addEventListener('click', () => {
    if (openLooks.has(one.id)) openLooks.delete(one.id);
    else openLooks.add(one.id);
    text.textContent = `${one.did} ${openLooks.has(one.id) ? '\u25be' : '\u25b8'}`;
    fill();
  });
  fill();
  it.appendChild(list);
  return it;
}

/** Which runs of looking around have been opened, across redraws. */
const openLooks = new Set<string>();

/** The line itself: the sign, what it did, and what came of it. */
function deedLine(one: Step): HTMLElement {
  const line = document.createElement('div');
  line.className = 'deed-line';
  line.appendChild(deedSign(one));
  const text = document.createElement('span');
  /* Two lines and then it stops, because a step cut off mid-word halfway
     across the column reads as the board being broken, and a third line is
     the step telling you more than you glanced over for. */
  text.className = 'deed-said';
  text.textContent = one.did;
  if (one.note) text.append('  ', ...noted(one.note));
  line.appendChild(text);
  return line;
}

/**
 * What a step cost or changed, in the colours a change is read in: what went
 * in is green and what came out is red, the same as on a change's own board.
 */
function noted(note: string): (string | HTMLElement)[] {
  const tinted = (text: string, ink: string): HTMLElement => {
    const it = document.createElement('span');
    it.style.color = ink;
    it.textContent = text;
    return it;
  };
  const counts = /^\+(\d+) −(\d+)$/.exec(note);
  if (counts) {
    return [
      tinted(`+${counts[1]}`, 'var(--yard-well)'),
      ' ',
      tinted(`−${counts[2]}`, 'var(--yard-wrong)'),
    ];
  }
  if (/^\d+ lines?$/.test(note) || note === 'passed') return [tinted(note, 'var(--yard-well)')];
  if (note === 'failed') return [tinted(note, 'var(--yard-wrong)')];
  return [tinted(note, '#8f7c5f')];
}

/**
 * What a step changed, read right under it: a few marked lines in the same
 * two tones a change is read in anywhere else, indented under the prop's
 * slot so it reads as belonging to the step rather than as its own line.
 *
 * When there was more than fits, the cap itself is the way to the rest —
 * pressing it opens the file's whole change, the same board a checkout's own
 * changed files already open onto.
 */
function diffPreview(one: Step, does: Doings, whole = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'deed-under deed-diff';
  const lines = one.diff ?? [];
  const fill = (): void => {
    wrap.replaceChildren();
    const open = whole || openDiffs.has(one.id);
    for (const marked of open ? lines : lines.slice(0, DIFF_SHOWN)) {
      const line = document.createElement('span');
      const kind = marked[0];
      line.className = `deed-diff-line${kind === '+' ? ' deed-diff-in' : kind === '-' ? ' deed-diff-out' : ''}`;
      line.textContent = `${kind === '+' || kind === '-' ? kind : ' '} ${marked.slice(1)}`;
      wrap.appendChild(line);
    }
    /* The rest of what was caught opens right here, under the step; only
       past that does the whole change go to the checkout's own board. */
    const unshown = open ? 0 : lines.length - DIFF_SHOWN;
    if (unshown > 0) {
      const more = pressing(`show all ${lines.length} lines`, () => {
        openDiffs.add(one.id);
        fill();
      });
      more.classList.add('deed-diff-more');
      wrap.appendChild(more);
    } else if (one.diffMore && one.path) {
      const more = pressing(`and ${one.diffMore} more lines, on the change`, () =>
        does.press(`change:${one.path}`)
      );
      more.classList.add('deed-diff-more');
      wrap.appendChild(more);
    } else if (open && openDiffs.has(one.id) && !whole) {
      const less = pressing('fold it', () => {
        openDiffs.delete(one.id);
        fill();
      });
      less.classList.add('deed-diff-more');
      wrap.appendChild(less);
    }
  };
  fill();
  return wrap;
}

/** How many lines of an edit stand under its step before it is opened. */
const DIFF_SHOWN = 8;

/** Which steps' edits have been opened in full, across redraws. */
const openDiffs = new Set<string>();

/** A session nobody has started: everything a session has, none of it yet. */
const BLANK: Session = {
  id: 'blank',
  name: '',
  branch: '',
  agent: '',
  fire: 'out',
  notes: [],
  thoughts: [],
  plan: [],
  steps: [],
  made: [],
  agents: [],
  waiting: [],
  carrying: [],
  pinnedNotes: [],
};

/**
 * The ground, and everybody on it, and under it who they are.
 *
 * The patch is the picture: the fire is the session, whoever is still working
 * stands in its light on the left, and whoever is back stands dimmed off to
 * the right, each with a number over their head. Under it is the same people
 * as a table, because a picture says who is where and a table says what each
 * has cost: the errand, how long they have been at it, and their tokens as a
 * bar against the hungriest of them. Pointing at a row, or at the one it
 * numbers, puts a cross at the end of it that sends them away.
 */
function ground(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number,
  does: Doings
): void {
  const hands = yard.session?.agents ?? [];
  const top = groundTop(hands.length, floor);
  root.appendChild(rule({ left: at.x, top, width: at.wide }));

  const working = hands.filter((one) => one.where === 'out');
  const back = hands.filter((one) => one.where !== 'out');
  /* Working first, so the numbers read left to right the way they stand. */
  const ordered = [...working, ...back];

  /* A window onto the ground, not a picture of one. The village is already
     drawn behind this whole screen, so the patch is a hole in the writing:
     what they are standing on is the actual land of this district, warmed by
     the fire. */
  const patchTop = top + GROUND.pad;
  const patch = box(
    { left: at.x, top: patchTop, width: at.wide, height: GROUND.patch },
    'overflow:hidden;background:transparent'
  );
  patch.style.position = 'absolute';

  /* They stand wherever they happen to, all round the fire, each always in
     the same spot for as long as they are out, since where one stands is
     worked out from who they are. The ones still working get first pick, so
     they are the ones by the fire. However many went out, the ground widens
     to hold them, and once it is wider than the column it scrolls sideways
     under the heading and the wheel walks along it. */
  const scattered = scatter(
    ordered.map((one) => ({ id: one.id, wide: one.command ? POT.wide : 28 })),
    Math.round(at.wide / 2) - 16
  );
  const sceneWide = Math.max(at.wide, scattered.half * 2 + 32);
  const centre = Math.round(sceneWide / 2);
  const strip = box(
    { left: 0, top: 0, width: at.wide, height: GROUND.patch },
    'overflow-x:auto;overflow-y:hidden;scrollbar-width:none'
  );
  strip.style.pointerEvents = 'auto';
  const scene = box({ left: 0, top: 0, width: sceneWide, height: GROUND.patch });
  strip.appendChild(scene);
  strip.addEventListener(
    'wheel',
    (event) => {
      if (sceneWide <= at.wide) return;
      event.preventDefault();
      strip.scrollLeft +=
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    },
    { passive: false }
  );
  const where = yard.session?.id ?? '';
  const kept = `${where}:${working.length}`;
  strip.addEventListener('scroll', () => groundScrolled.set(kept, strip.scrollLeft));

  const fireX = centre - 23;
  const fireY = 104;
  const burning = yard.session?.fire ?? 'out';
  scene.appendChild(
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
  scene.appendChild(fire);

  const rows = new Map<string, HTMLElement>();
  const figures = new Map<string, HTMLElement>();
  const lit = (id: string, on: boolean, from?: 'row'): void => {
    rows.get(id)?.toggleAttribute('data-lit', on);
    const figure = figures.get(id);
    figure?.toggleAttribute('data-lit', on);
    /* Pointing at a line whose figure is off along the strip brings it in. */
    if (on && from === 'row' && figure) {
      const x = figure.offsetLeft;
      if (x < strip.scrollLeft + 8 || x + 28 > strip.scrollLeft + at.wide - 8) {
        strip.scrollTo({ left: x - at.wide / 2 + 14, behavior: 'smooth' });
      }
    }
  };

  for (const hand of hands) {
    const spot = scattered.spots.get(hand.id) ?? { dx: 0, top: 40 };
    const half = hand.command ? POT.wide / 2 : 14;
    const one = (hand.command ? simmering : standing)(
      hand,
      { left: centre + spot.dx - half, top: spot.top },
      does,
      lit
    );
    figures.set(hand.id, one);
    scene.appendChild(one);
  }
  patch.appendChild(strip);

  const heading = box({ left: 14, right: 14, top: 12 }, 'pointer-events:none');
  const said = exact(atTheFire(hands), 14, '#ffc98a');
  said.style.whiteSpace = 'normal';
  heading.appendChild(said);
  patch.appendChild(heading);
  root.appendChild(patch);
  /* First sight is the fire in the middle of them. */
  strip.scrollLeft = groundScrolled.get(kept) ?? centre - at.wide / 2;

  /* The table: a heading row, one row each, and a foot with the total and
     the way to send the ones who are back home. */
  const tableTop = patchTop + GROUND.patch + GROUND.pad;
  const table = box(
    { left: at.x, top: tableTop, width: at.wide },
    'display:flex;flex-direction:column'
  );
  table.style.pointerEvents = 'auto';
  /* Commands spend no tokens, so a table of nothing but commands has no
     tokens column at all and the names take its room. */
  const counted = hands.some((one) => !one.command);
  table.appendChild(handRow(null, 0, at.wide, counted, does, lit));
  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;max-height:${GROUND.row * GROUND.rows}px;overflow-y:auto;scrollbar-width:none`;
  const most = Math.max(1, ...hands.map((one) => one.tokenCount ?? 0));
  ordered.forEach((hand) => {
    const one = handRow(hand, most, at.wide, counted, does, lit);
    rows.set(hand.id, one);
    list.appendChild(one);
  });
  table.appendChild(list);

  const foot = document.createElement('div');
  foot.style.cssText = `display:flex;align-items:center;justify-content:space-between;height:${GROUND.foot}px;margin-top:${GROUND.gap}px`;
  const total = hands.reduce((sum, one) => sum + (one.tokenCount ?? 0), 0);
  const roomy = at.wide >= 340;
  foot.appendChild(exact(total ? `${tokensShort(total)} tok total` : '', 12, '#a89272'));
  if (back.length) {
    const said = roomy
      ? back.length === 1
        ? 'send the finished one home'
        : `send the ${back.length} finished home`
      : `send ${back.length} home`;
    const home = twoPress(said, roomy ? 'press again, they leave for good' : 'press again', () =>
      does.press('away:finished')
    );
    home.style.cssText += [
      '',
      "font-family:'Courier Prime',monospace",
      `font-size:${roomy ? 13 : 12}px`,
      'font-weight:700',
      'color:#2a1d0e',
      'background:var(--yard-gold)',
      roomy ? 'padding:7px 16px' : 'padding:5px 10px',
      'box-shadow:inset 0 0 0 2px #7a5a28, 3px 3px 0 #120d07',
      'white-space:nowrap',
    ].join(';');
    home.addEventListener('mouseenter', () => (home.style.background = 'var(--yard-gold-hover)'));
    home.addEventListener('mouseleave', () => (home.style.background = 'var(--yard-gold)'));
    foot.appendChild(home);
  }
  table.appendChild(foot);
  root.appendChild(table);
}

/** How tall the ground is, rows and all, so the column above gives it room. */
function groundTall(many: number): number {
  const shown = Math.min(many, GROUND.rows);
  return GROUND.pad * 2 + GROUND.patch + GROUND.row * (shown + 1) + GROUND.gap + GROUND.foot;
}

function groundTop(many: number, floor: number): number {
  return floor - groundTall(many);
}

const GROUND = { pad: 12, patch: 184, row: 32, rows: 5, gap: 18, foot: 36 };

/** How much light each way of burning throws. */
const FIRELIGHT: Record<Fire, number> = { lit: 0.34, banked: 0.2, embers: 0.12, out: 0.04 };

/**
 * Where everybody stands, round a fire in the middle, as an offset from it.
 *
 * Each one's spot comes from a generator seeded with who they are, so the
 * same helper stands in the same place on every redraw, and the ones already
 * standing never move when somebody new arrives. A newcomer tries spots
 * clear of the fire, the heading and everybody else, and when there is no
 * room left the ground widens for them.
 */
function scatter(
  ids: readonly { id: string; wide: number }[],
  start: number
): { half: number; spots: Map<string, { dx: number; top: number }> } {
  const spots = new Map<string, { dx: number; top: number; wide: number }>();
  let half = Math.max(80, start);
  const low = 44;
  const high = GROUND.patch - 58;
  for (const { id, wide } of ids) {
    let seed = 0;
    for (const c of id) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) | 0;
    const random = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let placed: { dx: number; top: number; wide: number } | undefined;
    while (!placed) {
      for (let tries = 0; tries < 60 && !placed; tries += 1) {
        const dx = Math.round((random() * 2 - 1) * (half - wide / 2));
        const top = Math.round(low + random() * (high - low));
        const onFire = Math.abs(dx) < 28 + wide / 2 && top > 50 && top < 150;
        const crowded = [...spots.values()].some(
          (one) => Math.abs(one.dx - dx) < (one.wide + wide) / 2 + 2 && Math.abs(one.top - top) < 64
        );
        if (!onFire && !crowded) placed = { dx, top, wide };
      }
      if (!placed) half += 40;
    }
    spots.set(id, placed);
  }
  return { half, spots };
}

/** What the heading over the ground says: who is out there, and what is cooking. */
function atTheFire(hands: readonly Hand[]): string {
  const pots = hands.filter((one) => one.command).length;
  const people = hands.length - pots;
  const said = [
    people ? `${people} ${people === 1 ? 'hand' : 'hands'}` : '',
    pots ? `${pots} ${pots === 1 ? 'command' : 'commands'}` : '',
  ].filter(Boolean);
  return `${said.join(' and ')} at the fire`;
}

/** The pot a background command stands for, on its own fire. */
const POT = { wide: 62, tall: 58 };

/**
 * A command left running in the background, as a pot on a fire of its own:
 * lit and throwing sparks while it is going, cold once it has finished, and
 * a sore red under the pot if it failed. Pressed, it is walked up to like
 * anybody else out there.
 */
function simmering(
  hand: Hand,
  spot: { left: number; top: number },
  does: Doings,
  lit: (id: string, on: boolean) => void
): HTMLElement {
  const going = hand.where === 'out';
  const it = box({ left: spot.left, top: spot.top - 4, width: POT.wide, height: POT.tall });
  it.className = 'yard-hand';
  it.style.cursor = 'pointer';
  it.style.pointerEvents = 'auto';
  it.addEventListener('mousedown', (event) => event.preventDefault());
  it.addEventListener('click', () => does.press(`helper:${hand.id}`));
  it.addEventListener('mouseenter', () => lit(hand.id, true));
  it.addEventListener('mouseleave', () => lit(hand.id, false));

  /* The first child is what lights when it is pointed at, so it is the pot. */
  const pot = box({ left: 0, top: 0, width: POT.wide, height: POT.tall });
  const fire = sprite(going ? KIT_NAMES.fire : KIT_NAMES.fireOut, 1);
  fire.style.cssText += ';left:8px;top:26px';
  if (going) fire.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
  pot.appendChild(fire);
  const hung = sprite(going ? KIT_NAMES.cauldronLit : KIT_NAMES.cauldron, 1);
  hung.style.cssText += ';left:0;top:0';
  pot.appendChild(hung);
  pot.style.filter = going
    ? 'brightness(.95)'
    : hand.wrong
      ? 'brightness(.6) sepia(.6) hue-rotate(-30deg) saturate(2.2)'
      : 'brightness(.55) saturate(.2)';
  it.appendChild(pot);
  if (going) {
    it.appendChild(
      firelight({ left: -12, top: 14, width: POT.wide + 24, height: 50 }, 0.22, false)
    );
    for (let i = 0; i < 4; i += 1) {
      it.appendChild(
        box(
          { left: 26 + ((i * 5) % 10), top: 30, width: 2, height: 2 },
          `background:${i % 2 ? '#ffc98a' : '#ff8a4a'};animation:yard-spark ${1500 + i * 270}ms linear ${i * 380}ms infinite;opacity:0;pointer-events:none`
        )
      );
    }
  }
  return it;
}

/** Where each session's strip of ground was left scrolled to. */
const groundScrolled = new Map<string, number>();

/**
 * One of them, standing where their state puts them, with their number over
 * their head. Pressing one walks up to them.
 */
function standing(
  hand: Hand,
  spot: { left: number; top: number },
  does: Doings,
  lit: (id: string, on: boolean) => void
): HTMLElement {
  const out = hand.where === 'out';
  const it = box({ left: spot.left, top: spot.top, width: 28, height: 54 });
  it.className = 'yard-hand';
  it.style.cursor = 'pointer';
  it.style.pointerEvents = 'auto';
  it.addEventListener('mousedown', (event) => event.preventDefault());
  it.addEventListener('click', () => does.press(`helper:${hand.id}`));
  it.addEventListener('mouseenter', () => lit(hand.id, true));
  it.addEventListener('mouseleave', () => lit(hand.id, false));

  const figure = folk('front', { left: 0, top: 0 });
  figure.style.filter = out ? 'brightness(.95)' : 'brightness(.55) saturate(.2)';
  figure.style.mixBlendMode = 'normal';
  /* Working is somebody moving with an ember over their head; stopped is
     somebody standing still in the dark with none. */
  if (out) figure.style.animation = 'yard-step 800ms steps(2,end) infinite';
  it.appendChild(figure);
  if (out || hand.wrong) {
    const spark = handEmber(hand);
    spark.style.cssText += ';position:absolute;left:11px;top:-12px';
    it.appendChild(spark);
  }

  return it;
}

/**
 * One line of the table, or its heading when there is nobody to put on it.
 *
 * Pointing at a line lights it and the one it numbers, and puts a cross at
 * its right-hand end. The first press on the cross says what sending them
 * away costs where their clock and tokens were; the second does it.
 */
function handRow(
  hand: Hand | null,
  most: number,
  wide: number,
  counted: boolean,
  does: Doings,
  lit: (id: string, on: boolean, from?: 'row') => void
): HTMLElement {
  const line = document.createElement('div');
  line.className = hand ? 'yard-hand-row' : '';
  line.style.cssText = `position:relative;display:flex;align-items:center;flex:none;height:${GROUND.row}px;border-bottom:1px solid rgba(244,227,192,.1)`;
  const narrow = wide < 340;
  /* Under a roomy width the tokens are only their figure: a bar there is
     taken out of the names, which are what the line is read for. */
  const barred = wide >= 440;
  const W = narrow ? { run: 62, tok: 50 } : { run: 80, tok: barred ? 124 : 56 };
  if (!counted) W.tok = 0;
  const size = narrow ? 12 : 13;
  const lead = 18;
  /* The name takes whatever the clock and the tokens leave. The cross holds
     no room of its own: it is laid over the end of the line when pointed at. */
  const cell = (width: number | 'rest', child: HTMLElement, pad = 0): HTMLElement => {
    const it = document.createElement('div');
    it.style.cssText = `${width === 'rest' ? 'flex:1 1 0;min-width:0' : `flex:none;width:${width}px`};box-sizing:border-box;padding-right:${pad}px;overflow:hidden;display:flex;align-items:center;gap:6px`;
    it.appendChild(child);
    return it;
  };

  if (!hand) {
    const head = (text: string): HTMLElement => {
      const it = exact(text, 11, '#a89272');
      it.style.letterSpacing = '.12em';
      return it;
    };
    line.appendChild(cell(lead, document.createElement('span')));
    line.appendChild(cell('rest', head('HAND'), 12));
    line.appendChild(cell(W.run, head('RUNNING'), 8));
    if (counted) line.appendChild(cell(W.tok, head('TOKENS')));
    return line;
  }

  const out = hand.where === 'out';
  const ink = out ? '#f4e3c0' : '#a89272';
  line.style.cursor = 'pointer';
  line.addEventListener('mousedown', (event) => event.preventDefault());
  line.addEventListener('click', () => does.press(`helper:${hand.id}`));
  line.addEventListener('mouseenter', () => lit(hand.id, true, 'row'));
  line.addEventListener('mouseleave', () => lit(hand.id, false));

  line.appendChild(cell(lead, handEmber(hand)));
  const name = exact(hand.errand, size, ink);
  name.style.cssText += ';overflow:hidden;text-overflow:ellipsis;min-width:0';
  name.title = hand.said;
  const named = cell('rest', name, 12);
  line.appendChild(named);

  const costs = document.createElement('div');
  costs.style.cssText = 'display:flex;align-items:center;flex:none';
  const clock = exact(
    out && hand.since ? longFor(Date.now() - hand.since) : hand.ran ? longFor(hand.ran) : '',
    13,
    ink
  );
  if (out && hand.since) clock.dataset.since = String(hand.since);
  costs.appendChild(cell(W.run, clock, 8));
  const bar = document.createElement('div');
  bar.style.cssText = `display:flex;gap:${narrow ? 1 : 2}px;flex:none`;
  const filled = hand.tokenCount ? Math.max(1, Math.round((hand.tokenCount / most) * 10)) : 0;
  /* A command spends no tokens of its own, so it has no bar to fill. */
  for (let k = 0; k < (hand.command || !barred ? 0 : 10); k += 1) {
    const one = document.createElement('span');
    const on = k < filled;
    one.style.cssText = `width:${narrow ? 4 : 5}px;height:12px;background:${
      out ? (on ? '#d9a95a' : '#3a2c18') : on ? '#8a7c68' : '#3e3528'
    }`;
    bar.appendChild(one);
  }
  if (counted) {
    const tokens = cell(W.tok, bar);
    tokens.appendChild(exact(hand.tokenCount ? tokensShort(hand.tokenCount) : '', size, ink));
    costs.appendChild(tokens);
  }
  line.appendChild(costs);

  /* What the first press on the cross costs, standing where the clock and the
     tokens were, since they are what is about to stop counting. */
  const cost = exact(
    narrow
      ? out
        ? hand.command
          ? 'again to stop it'
          : 'again to stop them'
        : 'again to send off'
      : out
        ? hand.command
          ? 'press ✕ again to stop it'
          : 'press ✕ again to stop them'
        : 'press ✕ again to send off',
    11,
    '#f2665a'
  );
  /* Without a tokens column the clock alone is too narrow to say it in, so
     the name gives up what it needs while it is said. Its right end leaves
     room for the cross laid over the line. */
  cost.style.cssText += `;display:none;flex:none;width:${Math.max(W.run + W.tok, narrow ? 120 : 190)}px;justify-content:flex-end;padding-right:22px;box-sizing:border-box`;
  line.appendChild(cost);

  let armed: number | undefined;
  let unask = (): void => {};
  const disarm = (): void => {
    if (armed !== undefined) window.clearTimeout(armed);
    armed = undefined;
    unask();
    cost.style.display = 'none';
    costs.style.display = 'flex';
    line.removeAttribute('data-armed');
  };
  const cross = pressing('✕', () => {
    if (armed !== undefined) {
      disarm();
      does.press(`away:${hand.id}`);
      return;
    }
    costs.style.display = 'none';
    cost.style.display = 'flex';
    line.setAttribute('data-armed', '');
    unask = standAsking(() => cross.click(), cross);
    armed = window.setTimeout(disarm, 4000);
  });
  cross.className += ' yard-hand-cross';
  cross.style.cssText +=
    ";font-family:'Courier Prime',monospace;font-size:14px;position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center;padding:0 4px 0 18px;background:linear-gradient(to right,transparent,rgba(24,18,12,.92) 14px)";
  cross.addEventListener('click', (event) => event.stopPropagation());
  line.appendChild(cross);
  return line;
}

/**
 * Whether somebody is working, as one pixel ember: lit and pulsing while
 * they are, an empty square once they have stopped, red if they came back
 * hurt or were called back. The same mark over the figure and on its line.
 */
function handEmber(hand: Hand): HTMLElement {
  const it = document.createElement('span');
  it.style.cssText = 'display:block;width:7px;height:7px;flex:none;box-sizing:border-box';
  if (hand.where === 'out') {
    it.style.background = '#ff9a4a';
    it.style.animation = 'yard-ember 1100ms ease-in-out infinite';
  } else if (hand.wrong) it.style.background = '#f2665a';
  else it.style.border = '1px solid #6a5a44';
  return it;
}

/** A count of tokens said short for a table: `850`, `48.2k`, `1.3m`. */
function tokensShort(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/**
 * What is in your hands.
 *
 * A picture is the one thing an agent can be shown, and it cannot be drawn on
 * the board, because the board is writing. So it stands on the line among the
 * words as `[picture 1]`, shows itself when pointed at, goes with what you say,
 * and is put down by backspacing over it. A pinned note waits beside the line.
 */
function carried(hands: HTMLElement, line: Line, yard: Yard, does: Doings): void {
  hands.replaceChildren();
  line.carries(
    (yard.session?.carrying ?? []).map((one, at) => ({
      id: one.id,
      label: `[picture ${at + 1}]`,
      ...(one.preview ? { preview: one.preview } : {}),
    }))
  );
  for (const one of yard.session?.pinnedNotes ?? []) {
    const note = astop(
      pressing(`✎ ${one.label}`, () => does.press(`unnote:${one.id}`)),
      `pinned-note:${one.id}`
    );
    note.style.cssText += "font-family:'Courier Prime',monospace;font-size:12px";
    hands.appendChild(note);
  }
}

/* ── the one place you write ───────────────────────────────────────────────
   One line, no box, no hint, and a cursor that is the only thing on this
   screen saying the app is awake. */
function said_line(root: HTMLElement, edge: number, grown: number): void {
  root.appendChild(
    stays(rule({ left: edge, right: edge, bottom: 186 + grown }, true), 'rule:line')
  );
}

/* ── the rail ──────────────────────────────────────────────────────────────
   One lantern per session, hung off a beam. Lit is a reason to look: somebody
   working, whose light breathes; somebody asking, who flickers; or something
   finished you have not been in to see, which glows green until you have.
   Dark is idle, waiting out a limit (a faint red glow), broken, or still
   being set up. The one you are standing in burns brightest, and every one
   hangs on the same cord so the rail sits level. */
function rail(root: HTMLElement, yard: Yard, cramped: boolean, edge: number, does: Doings): void {
  /* The beam scrolls, so it clips; it reaches past the rule on both sides by
     enough that a lantern's glow is not cut straight down the middle. */
  const beam = box({
    left: edge - GLOW_ROOM,
    right: edge - GLOW_ROOM,
    bottom: 0,
    height: cramped ? RAIL_BARE : RAIL_TALL,
  });
  beam.appendChild(
    box({ left: GLOW_ROOM, right: GLOW_ROOM, top: 0, height: 3 }, 'background:#3a2712')
  );

  /* Each lantern takes as much beam as its whole name needs, and the ones
     after it are pushed along to make room: a name cut short is two sessions
     that can't be told apart. Past the window the beam scrolls sideways. */
  const bare = cramped;
  beam.style.overflowX = 'auto';
  beam.style.overflowY = 'hidden';
  beam.style.scrollbarWidth = 'none';
  /* What a lantern is doing changes every few seconds and its words change
     width with it. A span that followed them exactly shoved every lantern
     after it back and forth on each change, so a span only ever grows at
     once, in whole steps, and gives room back only once its words have been
     shorter for a good while. */
  const now = Date.now();
  const spans = yard.rail.map((one) => {
    if (bare) return 44 + WORDS_GAP;
    const needs =
      34 +
      Math.max(
        RAIL_NAME_MIN,
        widthOf(one.name, 12),
        Math.min(widthOf(one.saying, 11), RAIL_SAYING_MAX)
      ) +
      WORDS_GAP;
    const fits = Math.ceil(needs / RAIL_STEP) * RAIL_STEP;
    const held = railSpans.get(one.id);
    if (!held || fits > held.span) {
      railSpans.set(one.id, { span: fits, roomy: now });
      return fits;
    }
    if (fits === held.span) held.roomy = now;
    else if (now - held.roomy > RAIL_GIVES_BACK_MS) held.span = fits;
    return held.span;
  });
  const at = spans.map((_, i) => GLOW_ROOM + spans.slice(0, i).reduce((a, b) => a + b, 0));

  for (const [i, one] of yard.rail.entries()) {
    const step = spans[i]!;
    const cord = LANTERN.cord;
    const top = 3 + cord;
    /* Everything one lantern is, its cord, its light, the lamp and its words,
       hangs off one hook and moves along the beam as one. Keyed separately,
       the lamp slid and its cord and light jumped. */
    const slot = keyed(
      box({ left: at[i]!, top: 0, width: step, height: top + 58 }),
      `lantern:${one.id}`
    );
    beam.appendChild(slot);
    const x = 0;
    slot.appendChild(box({ left: x + 10, top: 3, width: 3, height: cord }, 'background:#3a2712'));

    const cutting = one.ground === 'cutting';
    const halo = HALO[one.posture];
    const waiting = one.posture === 'waiting';
    if (one.here && one.lit && !waiting) {
      /* The light you are standing in reaches past its lantern and over its
         name too, so the one you are in reads from across the room as a lit
         patch of the rail rather than one bright lamp among dim ones. */
      const reach = step + 40;
      const glow = box({ left: x - 34, top: top - 34, width: reach + 34, height: 110 });
      glow.style.pointerEvents = 'none';
      glow.appendChild(firelight({ left: 0, top: 10, width: 90, height: 90 }, 0.4));
      glow.appendChild(firelight({ left: 20, top: 0, width: reach, height: 110 }, 0.36, false));
      /* The light you are standing in belongs to its lantern: taking another
         one lets this one's light go and swells the new one's up in place. */
      glow.dataset.glow = 'here';
      slot.appendChild(glow);
    } else if (halo && !cutting) {
      const [tint, strength] = halo;
      /* Ember throws light from low in the glass, and more of it as the wait
         nears its end, so only the last stretch of a limit shows from afar. */
      const fill = one.ember ?? 0;
      const glow = box(
        { left: x - 34, top: top - 24, width: 90, height: 90 },
        waiting
          ? `background:radial-gradient(circle at 50% ${72 - fill * 12}%,rgba(${tint},${(0.08 + fill * 0.18).toFixed(3)}),rgba(0,0,0,0) ${44 + fill * 14}%);pointer-events:none`
          : `background:radial-gradient(circle at 50% 50%,rgba(${tint},${strength}),rgba(0,0,0,0) 62%);pointer-events:none`
      );
      if (one.posture === 'working') {
        glow.style.animation = 'yard-breathe 2.4s steps(6,end) infinite alternate';
      } else if (one.posture === 'wants-you') {
        glow.style.animation = 'yard-wants 480ms steps(2,end) infinite alternate';
      } else if (one.posture === 'waiting') {
        glow.style.animation = 'yard-banked 3.2s ease-in-out infinite';
      }
      slot.appendChild(glow);
    }

    /* Finished and not yet seen burns green in the glass, not only round it. */
    const lamp = waiting
      ? emberLantern(one.ember ?? 0, 2)
      : one.lit && one.posture === 'done'
        ? greenLantern(2)
        : sprite(one.lit ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 2);
    lamp.dataset.lamp = one.id;
    lamp.style.cssText += `;left:${x}px;top:${top}px`;
    if (!onTheBeam.has(one.id)) {
      onTheBeam.add(one.id);
      lamp.style.animation = 'yard-hang 240ms steps(3,end)';
    }
    /* Out of usage is dark with ember in its glass, banked rather than out:
       somebody is still in there, only waiting for the limit to lift. */
    const dimmed = waiting
      ? ''
      : one.here
        ? ''
        : one.posture === 'done'
          ? 'brightness(.9)'
          : 'brightness(.75)';
    lamp.style.filter = dimmed;
    if (cutting) lamp.style.opacity = '.45';
    if (one.posture === 'wants-you') {
      lamp.style.animation = 'yard-wants 480ms steps(2,end) infinite alternate';
    }
    slot.appendChild(lamp);

    /* The one place in this app where a pressable thing is not gold.
       Everywhere else gold means "press me" and nothing else is gold; the rail
       keeps its posture tints because the rail's whole job is telling you, from
       across the room and without reading, which session wants you. Six gold
       names in a row would say nothing at all. What says it is pressable is the
       lantern: a physical object hanging there, lighting under your hand. */
    const hung = box({ left: x, top, width: bare ? 44 : step, height: 58 });
    /* A lantern still being cut has nowhere to walk into yet: it hangs there
       to say so, not to be pressed. */
    hung.style.pointerEvents = cutting ? 'none' : 'auto';
    hung.dataset.lantern = one.id;
    hung.style.cursor = 'default';

    /* A short window keeps the lanterns and gives up the words beside them:
       lit, dark, flickering and brightest still say which is which. */
    if (!bare) {
      /* Everything beside a lantern stops short of the next one. A long name
         running on under its neighbour reads as the two sessions being one. */
      const wide = step - 34 - WORDS_GAP;
      const name = box({ left: 34, top: 2, width: wide }, CLIPPED);
      const written = exact(one.name, 12, one.here ? '#ffdca4' : TONE[one.posture]);
      if (one.here) written.style.textShadow = '1px 1px 0 #120d07,0 0 8px rgba(255,168,60,.55)';
      clipped(written, one.name);
      /* The keyboard stands on the name rather than on the whole lantern,
         because the mark it leaves is a fill and a fill the size of a lantern
         is a slab of gold across the bottom of the screen. */
      if (!one.here) astop(written, `rail:${one.id}`);
      name.appendChild(written);
      hung.appendChild(name);
      const under = box({ left: 34, top: 20, width: wide }, CLIPPED);
      const saying = exact(one.saying, 11, one.here && !waiting ? '#ecd6a8' : SAYS[one.posture]);
      if (cutting) {
        written.style.opacity = '.6';
        saying.style.opacity = '.6';
      }
      clipped(saying, one.saying);
      /* Thinking with Fable says so under the name, in its own violet,
         before whatever it is doing. */
      if (one.dear) {
        const dear = exact('fable ·', 11, DEAR);
        dear.style.position = 'relative';
        dear.style.marginRight = '6px';
        const gem = dearGem(8);
        gem.style.margin = '0 4px 0 0';
        under.style.display = 'flex';
        under.style.alignItems = 'center';
        under.append(gem, dear);
      }
      under.appendChild(saying);
      hung.appendChild(under);
      /* A new kind of doing comes up into the line rather than snapping over
         the last one; only the clock ticking on it changes nothing. */
      const kind = one.saying.split(' · ')[0]!;
      const was = railSaid.get(one.id);
      railSaid.set(one.id, kind);
      if (was !== undefined && was !== kind) arrive(under, 0, 4);
    }

    if (!one.here && !cutting) {
      if (bare) astop(lamp, `rail:${one.id}`);
      hung.addEventListener('mousedown', (event) => event.preventDefault());
      hung.addEventListener('click', () => does.open(one.id));
      hung.addEventListener('pointerenter', () => (lamp.style.filter = 'brightness(1.15)'));
      hung.addEventListener('pointerleave', () => (lamp.style.filter = dimmed));
    }
    slot.appendChild(hung);
  }

  /* THE END OF THE RAIL IS HOW A SESSION STARTS.
   *
   * It is a lantern and nothing else: an unlit lamp on the last hook with a
   * small plus in its glass. Words beside it said what the plus already says
   * and made the one empty hook the loudest thing on the beam. The plus is
   * banked gold, glowing faintly in the glass, and comes up to full gold under
   * the pointer. */
  const spare = GLOW_ROOM + spans.reduce((a, b) => a + b, 0);
  const cord = 3 + LANTERN.cord;
  /* Its cord, lamp and plus are one thing on one hook, so when the lanterns
     before it change it slides along to where it hangs now. */
  const end = keyed(box({ left: spare, top: 0, width: 22, height: cord + 38 }), 'lantern:+');
  end.style.pointerEvents = 'none';
  end.appendChild(box({ left: 10, top: 3, width: 3, height: LANTERN.cord }, HOOK));

  const lamp = sprite(KIT_NAMES.lanternOff, 2);
  lamp.style.cssText += `;left:0px;top:${cord}px;filter:brightness(.7)`;
  end.appendChild(lamp);

  const hook = box({ left: 0, top: cord, width: 22, height: 38 });
  hook.style.pointerEvents = 'auto';
  hook.style.cursor = 'default';
  hook.title = 'a new session · right-click for other ways';
  const plus = [
    box({ left: 10, top: 16, width: 2, height: 6 }, PLUS),
    box({ left: 8, top: 18, width: 6, height: 2 }, PLUS),
  ];
  for (const bar of plus) hook.appendChild(bar);
  astop(hook, 'rail:new');
  hook.addEventListener('mousedown', (event) => event.preventDefault());
  hook.addEventListener('click', () => does.press('new'));
  /* Right-clicking it skips the plain one and goes straight to the other ways
     of starting one: its own copy, its own terminal, an issue, a branch. */
  hook.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    does.press('new:ways');
  });
  hook.addEventListener('pointerenter', () => {
    lamp.style.filter = 'brightness(1.1)';
    for (const bar of plus) bar.style.background = 'var(--yard-gold)';
  });
  hook.addEventListener('pointerleave', () => {
    lamp.style.filter = 'brightness(.7)';
    for (const bar of plus) bar.style.background = PLUS_BANKED;
  });
  end.appendChild(hook);
  beam.appendChild(end);
  root.appendChild(beam);
  stays(beam, 'rail');
  beam.scrollLeft = railScrolled;
  beam.addEventListener('scroll', () => (railScrolled = beam.scrollLeft));
}

const HOOK = 'background:#3a2712';
const PLUS_BANKED = '#b08648';
const PLUS = `background:${PLUS_BANKED}`;
/* Where the beam was scrolled to, so hanging a lantern doesn't throw it back to the start. */
let railScrolled = 0;
/** How wide each lantern's stretch of beam is held, and when its words last needed all of it. */
const railSpans = new Map<string, { span: number; roomy: number }>();
/** What each lantern was last saying it was doing, so a change can be seen arriving. */
const railSaid = new Map<string, string>();
const RAIL_STEP = 24;
const RAIL_GIVES_BACK_MS = 20_000;

/** How much bare beam there is between the words beside one lantern and the next. */
const WORDS_GAP = 18;
const CLIPPED = 'overflow:hidden';
/** The least beam the words beside a lantern get, and the most its doing line may ask for. */
const RAIL_NAME_MIN = 120;
const RAIL_SAYING_MAX = 200;
const GLOW_ROOM = 40;

const ruler = document.createElement('canvas').getContext('2d');
/** How wide a line of the rail's type comes out, so a lantern can be hung that wide. */
function widthOf(text: string, size: number): number {
  if (!ruler) return text.length * size * 0.6;
  ruler.font = `${size}px 'Courier Prime', monospace`;
  return Math.ceil(ruler.measureText(text).width);
}

/** Cut off with an ellipsis at the box it is in, and whole on hover. */
function clipped(it: HTMLElement, whole: string): void {
  it.style.display = 'inline-block';
  it.style.maxWidth = '100%';
  it.style.verticalAlign = 'top';
  it.style.overflow = 'hidden';
  it.style.textOverflow = 'ellipsis';
  it.title = whole;
}

/**
 * A line that does something irreversible on its second press, the first
 * saying what it costs, and giving up on its own if nobody presses again.
 */
function twoPress(said: string, cost: string, go: () => void): HTMLSpanElement {
  let armed: number | undefined;
  let unask = (): void => {};
  const line = pressing(said, () => {
    if (armed !== undefined) {
      window.clearTimeout(armed);
      armed = undefined;
      unask();
      line.textContent = said;
      go();
      return;
    }
    line.textContent = cost;
    unask = standAsking(() => line.click(), line);
    armed = window.setTimeout(() => {
      armed = undefined;
      unask();
      if (line.isConnected) line.textContent = said;
    }, 4000);
  });
  return line;
}

/* ── the dear model ─────────────────────────────────────────────────────────
   Fable spends a window several times faster than anything else, so a session
   thinking with it says so on sight: a violet gem and the word on its own tag
   by the session's name, the model itself in violet with the gem, and the gem
   beside its name on the rail. Violet is used for nothing else in the
   village, so it is never mistaken for anything pressable or for a mood. */
const DEAR = '#c49bff';

function dearGem(size: number): HTMLElement {
  const art = ['..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'];
  const it = document.createElement('span');
  const cells = art.flatMap((row, y) =>
    row
      .split('')
      .flatMap((c, x) => (c === '#' ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`] : []))
  );
  it.innerHTML = `<svg viewBox="0 0 7 6" width="${size + 2}" height="${size}" shape-rendering="crispEdges" fill="${DEAR}">${cells.join('')}</svg>`;
  it.style.cssText = `display:inline-block;margin:0 0 0 6px;filter:drop-shadow(0 0 4px rgba(196,155,255,.7));vertical-align:middle`;
  return it;
}

function dearTag(): HTMLElement {
  const it = document.createElement('span');
  it.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:6px',
    'margin-left:16px',
    'padding:3px 9px 2px 5px',
    'vertical-align:middle',
    "font-family:'Josefin Sans',sans-serif",
    'font-size:12px',
    'font-weight:600',
    'letter-spacing:.2em',
    'text-transform:uppercase',
    'color:#f3e8ff',
    'background:rgba(110,60,190,.55)',
    'border:2px solid ' + DEAR,
    'box-shadow:0 0 14px rgba(160,110,255,.45)',
    'text-shadow:1px 1px 0 #120d07',
  ].join(';');
  const gem = dearGem(10);
  gem.style.margin = '0';
  it.append(gem, document.createTextNode('fable'));
  it.title =
    'Thinking with Fable, the dearest model. It spends your five hours several times faster.';
  return it;
}

function dearModel(model: string): HTMLElement {
  const it = exact(model, 12, DEAR);
  it.style.textShadow = '1px 1px 0 #120d07,0 0 8px rgba(196,155,255,.6)';
  it.style.position = 'relative';
  const wrap = document.createElement('span');
  wrap.style.cssText = 'display:inline-flex;align-items:baseline;gap:4px;position:relative';
  const gem = dearGem(9);
  gem.style.margin = '0';
  gem.style.alignSelf = 'center';
  wrap.append(gem, it);
  return wrap;
}
