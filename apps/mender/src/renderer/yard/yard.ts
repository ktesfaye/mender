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

import { GUTTER, MARGIN, type Layer } from './frame';
import { KIT_NAMES, sprite } from './sprite';
import type { Hand, Made, Note, Posture, Step, Thought, Yard } from './what';
import { box, exact, firelight, folk, label, row, rule, said, stack, trim } from './write';

/* Where the bands sit, measured off the designs. The top band and the bottom
   band are fixed; everything between them is what the window gives us. */
const HEAD = { title: 22, meta: 56, rule: 92, label: 112, top: 142 } as const;
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

export interface Standing {
  /** Rewrite everything. Cheap: the yard is a couple of hundred elements. */
  show(yard: Yard): void;
  /** Take it down and give the village back. */
  close(): void;
}

export function makeYard(layer: Layer): Standing {
  const root = box({ left: 0, top: 0, right: 0, bottom: 0 });
  root.style.pointerEvents = 'none';
  layer.root.appendChild(root);

  let last: Yard | undefined;
  layer.onResize(() => last && show(last));

  function show(yard: Yard): void {
    last = yard;
    root.replaceChildren();
    const columns = layer.columns();
    /* Everything from under the header rule to above the line you write on.
       The columns live in here and the bands top and bottom do not. */
    const floor = window.innerHeight - MARGIN - (layer.cramped() ? RAIL_BARE : RAIL_TALL) - 60;

    scrims(root);
    head(root, yard, layer.edge());
    asked(root, columns.asked, yard, floor, layer.cramped());
    thinking(root, columns.thinking, yard, floor);
    made(root, columns.made, yard, floor);
    line(root, yard, layer.edge());
    rail(root, yard, layer.cramped(), layer.edge());
  }

  return {
    show,
    close: () => root.remove(),
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
function head(root: HTMLElement, yard: Yard, edge: number): void {
  const title = box({ left: edge, top: HEAD.title }, TITLE);
  title.textContent = yard.project.name;
  root.appendChild(title);

  const said = [
    yard.project.on,
    yard.session?.agent,
    yard.project.going,
    yard.project.turns ? `${yard.project.turns} turns` : undefined,
    yard.project.spawned ? `${yard.project.spawned} agents spawned` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const meta = box({ left: edge + 2, top: HEAD.meta });
  meta.appendChild(exact(said, 12));
  root.appendChild(meta);

  if (yard.session?.permissions) {
    const flag = box({ right: edge, top: 26 }, FLAG);
    flag.textContent = yard.session.permissions;
    root.appendChild(flag);
  }

  const room = yard.session?.room;
  const about = [
    room === undefined ? undefined : `context ${Math.round(room * 100)}%`,
    yard.session?.model,
  ]
    .filter(Boolean)
    .join(' · ');
  if (about) {
    const it = box({ right: edge, top: 50 });
    it.appendChild(exact(about, 12));
    root.appendChild(it);
  }

  root.appendChild(rule({ left: edge, right: edge, top: HEAD.rule }, true));
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
  cramped: boolean
): void {
  root.appendChild(label('what you asked', { left: at.x, top: HEAD.label }));

  /* The glance at the other sessions sits at the foot of the column, so the
     post and the notes on it get everything above that and no more. */
  const under = elsewhere(root, at, yard, floor);
  const room = under - 20 - HEAD.top;

  root.appendChild(
    box(
      { left: at.x, top: HEAD.top - 2, width: 12, height: room },
      'background:linear-gradient(90deg,#54391e,#3a2712)'
    )
  );

  const notes = yard.session?.notes ?? [];
  const [newest, ...older] = notes;
  if (!newest) return;

  const card = pinned(newest, { left: at.x + 22, top: HEAD.top, width: at.wide - 60 });
  root.appendChild(card);

  if (!older.length || cramped) return;
  /* The card is as tall as whatever was written on it, which nothing knows
     until it is in, so the rest of the post is placed off its real height. */
  const below = HEAD.top + card.offsetHeight + 22;
  const list = stack(
    { left: at.x + 22, top: below, width: at.wide - 60, height: Math.max(0, under - 20 - below) },
    14
  );
  list.style.overflow = 'hidden';
  for (const note of older) list.appendChild(weathered(note));
  const tail = said('', '#a89272');
  tail.style.fontSize = '10px';
  list.appendChild(tail);
  root.appendChild(list);

  const dropped = trim(list, under - 20 - below);
  const many = (yard.session?.olderNotes ?? 0) + dropped;
  tail.textContent = many ? `${many} older notes further down the post` : '';
}

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
  card.appendChild(document.createTextNode(note.said));
  return card;
}

const CARD = [
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
  it.appendChild(said(`${note.when} · ${note.standing ? 'standing' : answered(note)}`));
  const body = document.createElement('span');
  body.style.cssText =
    "font-family:'Caveat',cursive;font-size:17px;line-height:1.25;color:#cbb491";
  body.textContent = note.said;
  it.appendChild(body);
  return it;
}

function answered(note: Note): string {
  return note.answered ? 'answered' : 'unanswered';
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
  floor: number
): number {
  const others = yard.rail.filter((one) => !one.here).slice(0, 3);
  if (!others.length) return floor;
  const tall = 30 + others.length * 23;
  const top = floor - tall;
  root.appendChild(rule({ left: at.x, top: top - 20, width: at.wide - 20 }));
  root.appendChild(label(`elsewhere in ${yard.project.name.toLowerCase()}`, { left: at.x, top }));

  const list = stack({ left: at.x, top: top + 30, width: at.wide }, 9);
  list.style.fontSize = '14px';
  list.style.fontFamily = "'Josefin Sans',sans-serif";
  for (const one of others) {
    const line = row(10);
    line.appendChild(box({ width: 8, height: 8 }, `background:${TONE[one.posture]};position:relative`));
    const text = document.createElement('span');
    text.style.color = one.posture === 'wants-you' ? '#ff9a6a' : '#dcc8a0';
    text.textContent = `${one.name} · ${one.saying}`;
    line.appendChild(text);
    list.appendChild(line);
  }
  root.appendChild(list);
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
  floor: number
): void {
  root.appendChild(rule({ left: at.x - GUTTER / 2, top: 104, width: 1, height: floor - 104 }));
  root.appendChild(label('what it is thinking', { left: at.x, top: HEAD.label }));

  const thoughts = yard.session?.thoughts ?? [];
  if (!thoughts.length) return;

  const room = floor - HEAD.top;
  const stream = stack({ left: at.x, top: HEAD.top, width: at.wide, height: room }, 20);
  stream.style.cssText += ";font-family:'Cormorant Garamond',serif;overflow:hidden";

  const plan = thoughts.find((one) => one.plan);
  const between = exact('', 12, '#8a7452');
  if (plan) {
    stream.appendChild(thought(plan, 15, 'rgba(244,227,192,.46)', 'the plan it posted'));
    stream.appendChild(between);
  }

  /* The last few, dimmest first. Nothing here is a scroll yet: what does not
     fit is what the count above says went by. */
  const rest = thoughts.filter((one) => !one.plan);
  const shown = rest.slice(-4);
  shown.forEach((one, i) => {
    if (one.live) return;
    const far = shown.length - 1 - i;
    stream.appendChild(
      thought(one, far > 1 ? 15 : 16, far > 1 ? 'rgba(244,227,192,.55)' : 'rgba(244,227,192,.62)')
    );
  });

  const live = thoughts.find((one) => one.live);
  if (live) {
    const it = document.createElement('div');
    it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
    it.appendChild(said(`now${live.at ? ` · ${live.at} at this` : ''}`, '#ffc98a'));
    const body = document.createElement('span');
    body.style.cssText =
      'font-size:21px;line-height:1.35;color:#ffdca4;text-shadow:0 2px 10px rgba(0,0,0,.9)';
    body.textContent = live.said;
    it.appendChild(body);
    stream.appendChild(it);
  }

  root.appendChild(stream);

  /* The plan and the live thought are the two that never go: the first is what
     everything since is measured against, and the last is what is happening.
     What is dropped is the middle, and the count says how much. */
  const dropped = trim(stream, room, plan ? 2 : 0);
  const skipped = (yard.session?.olderThoughts ?? 0) + dropped;
  between.textContent = skipped ? `\u25b8 ${skipped} notes between then and now` : '';
}

function thought(one: Thought, size: number, ink: string, name?: string): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:5px';
  it.appendChild(said(name ? `${name} · ${one.when}` : one.when));
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
function made(
  root: HTMLElement,
  at: { x: number; wide: number },
  yard: Yard,
  floor: number
): void {
  root.appendChild(rule({ left: at.x - GUTTER / 2, top: 104, width: 1, height: floor - 104 }));
  root.appendChild(label('what it made', { left: at.x, top: HEAD.label }));

  /* The ground is the foot of this column whatever happened above it, so
     everything else in here gets the room between the header and the yard and
     not one pixel more. In a short window that means the cart loses its
     itinerary and then what it did loses its beginning, in that order, rather
     than either of them being written over the ground. */
  const patch = floor - YARD_BOX.tall;
  const room = Math.max(0, patch - 44 - HEAD.top);
  const above = box({ left: at.x, top: HEAD.top, width: at.wide, height: room }, 'overflow:hidden');
  root.appendChild(above);

  const session = yard.session;
  const output = session?.made[0];
  const y = output ? cart(above, at.wide, output) : 0;

  above.appendChild(rule({ left: 0, top: y + 10, width: at.wide }));
  above.appendChild(label('what it did', { left: 0, top: y + 30 }));

  const top = y + 60;
  const left = Math.max(0, room - top);
  const steps = stack({ left: 0, top, width: at.wide, height: left }, 10);
  steps.style.cssText += ";font-size:14px;line-height:1.3;font-family:'Josefin Sans',sans-serif;overflow:hidden";
  const earlier = session?.olderSteps;
  const count = exact('', 12, '#8a7452');
  steps.appendChild(count);
  for (const one of session?.steps ?? []) steps.appendChild(did(one));
  above.appendChild(steps);

  /* Appended first and counted after, because how many fit is a thing only the
     browser knows once the sprites in them have a height. */
  const dropped = trim(steps, left, 1);
  const many = (earlier?.many ?? 0) + dropped;
  count.textContent = many
    ? `\u25b8 ${many} earlier steps${earlier ? ` \u00b7 ${earlier.over}` : ''}`
    : '';

  ground(root, at, yard, floor);
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
  text.style.color = one.running ? '#ffc98a' : '#f4e3c0';
  text.textContent = one.note ? `${one.did} · ${one.note}` : one.did;
  line.appendChild(text);
  return line;
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
  head.appendChild(
    exact(`${hands.length} hands · ${back} back · ${hands.length - back} out`, 11, '#bfa476')
  );
  root.appendChild(head);

  const patch = box(
    { left: at.x, top, width: at.wide, height: YARD_BOX.tall },
    'overflow:hidden;background:#181410;border:2px solid #3a2712'
  );
  patch.style.position = 'absolute';

  /* The fire sits a little below and left of centre, and its light is the only
     thing telling you where the middle of this place is. */
  const fireX = Math.round(at.wide / 2) - 23;
  const fireY = 117;
  patch.appendChild(
    firelight({ left: fireX - 147, top: fireY - 104, width: 340, height: 240 }, 0.34, false)
  );
  const fire = sprite(KIT_NAMES.fire, 1);
  fire.style.cssText += `;left:${fireX}px;top:${fireY}px;animation:yard-flicker 480ms steps(2,end) infinite alternate`;
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

const HEAD_ROW =
  'display:flex;align-items:baseline;justify-content:space-between;white-space:nowrap';

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

/* ── the one place you write ───────────────────────────────────────────────
   One line, no box, no hint, and a cursor that is the only thing on this
   screen saying the app is awake. */
function line(root: HTMLElement, yard: Yard, edge: number): void {
  root.appendChild(rule({ left: edge, right: edge, bottom: 186 }, true));
  const at = box({ left: edge, right: edge, bottom: 146 }, 'display:flex;align-items:center;gap:10px');
  const prompt = document.createElement('span');
  prompt.style.cssText = "font-family:'Caveat',cursive;font-size:22px;color:#ab9470";
  prompt.textContent = yard.session ? '› say the next thing' : '› say what you want built';
  at.appendChild(prompt);
  at.appendChild(
    box({ width: 2, height: 20 }, 'position:relative;background:#f4e3c0;animation:yard-blink 900ms steps(1,end) infinite')
  );
  root.appendChild(at);
}

/* ── the rail ──────────────────────────────────────────────────────────────
   One lantern per session, hung off a beam. Lit means somebody is awake in
   there; dark is resting, still being cut, or broken. The one you are standing
   in hangs lowest and brightest, and the one that wants you flickers. */
function rail(root: HTMLElement, yard: Yard, cramped: boolean, edge: number): void {
  if (yard.rail.length < 2) return;
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
  const step = Math.min(LANTERN_STEP, Math.floor(room / yard.rail.length));
  const bare = cramped || step < 140;

  for (const [i, one] of yard.rail.entries()) {
    const x = i * step;
    const cord = one.here ? LANTERN.cordHere : LANTERN.cord;
    const top = 3 + cord;
    beam.appendChild(box({ left: x + 10, top: 3, width: 3, height: cord }, 'background:#3a2712'));

    if (one.lit) {
      const strength = one.here ? 0.3 : one.posture === 'wants-you' ? 0.16 : 0;
      if (strength) {
        beam.appendChild(firelight({ left: x - 34, top: top - 24, width: 90, height: 90 }, strength));
      }
    }

    const lamp = sprite(one.lit ? KIT_NAMES.lanternOn : KIT_NAMES.lanternOff, 2);
    lamp.style.cssText += `;left:${x}px;top:${top}px`;
    if (!one.here && one.lit) lamp.style.filter = 'brightness(.75)';
    if (!one.lit) lamp.style.filter = 'brightness(.75)';
    if (one.posture === 'wants-you') {
      lamp.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
    }
    beam.appendChild(lamp);

    /* A short window keeps the lanterns and gives up the words beside them:
       lit, dark, flickering and hanging lowest still say which is which. */
    if (bare) continue;
    const name = box({ left: x + 34, top: top + 2 });
    name.appendChild(exact(one.name, one.here ? 13 : 12, one.here ? '#ffdca4' : TONE[one.posture]));
    beam.appendChild(name);
    const under = box({ left: x + 34, top: top + 20 });
    under.appendChild(exact(one.saying, 11, one.here ? '#dcc8a0' : '#a89272'));
    beam.appendChild(under);
  }
  root.appendChild(beam);
}
