/**
 * The projects, on a shelf.
 *
 * The plank along the bottom used to carry one tag per project. The designs
 * give that plank to the sessions of whatever project you are in, so the
 * projects needed somewhere else, and a rack of tools on the wall is what they
 * got: one slot each, its own picture or a prop from the kit standing in it,
 * no names.
 *
 * It sits over everything, the island and the yard alike, so it is the one
 * thing in this app that is always within reach. Hovering a slot says which
 * project it is; pressing one goes there; the one you are in is the filled
 * slot. It folds away and comes back.
 *
 * It is drawn, not boxed: a log along the top of the window, and each project
 * a board of three planks hung off it on two chains, its face nailed on, the
 * one you are standing in painted gold. This is the one place in the village
 * where a pressable thing is a picture rather than a line of gold writing,
 * and that is deliberate: it is a sign out of the kit, not a piece of the
 * board. Everything else on the wood follows the rule.
 *
 * Past an iron band round the beam, the rack ends with its own doings, each a
 * small round token off one chain so none of them is ever mistaken for a
 * project, pinned to its right end whatever order the projects are in and
 * never folded away: a wheel,
 * which opens the windmill, since it has no island of its own to stand on
 * yet; and, standing in a project, the campfire the island grows from,
 * pressing it flies back out to the whole island. Escape walks there too, a
 * step at a time; this is the one press that goes straight there from
 * anywhere.
 *
 * Folding it away folds away the others, never where you are: the slot you
 * are standing in and the fire out of it stay up beside the handle, the
 * others closing up into them, so the way home is never a fold away.
 *
 * A slot held and dragged along the rack lifts out of it and the others
 * step aside to make room; let go and it hangs there from then on. A press
 * that never really moved is still just a press.
 */

import { toolFor } from './face';
import { cutOf, sprite } from './sprite';
import { box } from './write';

/* Every piece of the rack is drawn at twice its own pixels, the same two
   whole pixels a stroke of the flags' own lettering is. Drawn by
   tools/make-rack.py, in the kit's own outline and wood. */
const X = 2;
const PAD = 6;
const BEAM = 10 * X;
/* Chains come down off the beam's lowest row of wood. */
const CHAIN_AT = 9 * X;
const BOARD = 24 * X;
const TOKEN = 15 * X;
const BOARD_AT = CHAIN_AT + 6 * X;
const TOKEN_AT = CHAIN_AT + 10 * X;
const TALL = BOARD_AT + BOARD + 3 * X;
const EASE = 'cubic-bezier(.2,.8,.2,1)';

export interface OnShelf {
  id: string;
  name: string;
  /** Which tool stands for it, by where it came in the island's own order. */
  at: number;
  /** Its own picture, which outranks the tool whenever it has one. */
  icon?: string;
  here: boolean;
  /** Whether somebody in this project is asking or hurt, worst first. */
  wants?: 'asking' | 'hurt';
}

export interface Shelf {
  show(projects: OnShelf[]): void;
  /** Fold it away, or bring it back. */
  fold(away?: boolean): void;
  /** The picture on the sky's slot: what the sky over the island is doing now. */
  setSky(picture: string): void;
  close(): void;
}

type Want = 'asking' | 'hurt' | undefined;

/* The same two colours a lit house's window uses (`village/folk.ts`'s own
   `LIGHT` table): amber for somebody asking, red for somebody hurt. It is a
   glow round the board's own outline rather than round a box, so the board
   stays the shape it was drawn. */
const GLOW: Record<'asking' | 'hurt' | 'none', string> = {
  none: 'drop-shadow(0 0 0 rgba(0,0,0,0)) drop-shadow(0 0 0 rgba(0,0,0,0))',
  asking: 'drop-shadow(0 0 3px #ffc46a) drop-shadow(0 0 9px #ffc46acc)',
  hurt: 'drop-shadow(0 0 3px #ff7a52) drop-shadow(0 0 9px #ff7a52cc)',
};

/* Pointed at, what hangs off the chains drops a pixel as if tugged; pressed,
   it drops another. */
function tug(hang: HTMLDivElement, swing: HTMLDivElement): void {
  const to = (pixels: number): void => {
    swing.style.transform = `translateY(${pixels * X}px)`;
  };
  hang.addEventListener('pointerenter', () => to(1));
  hang.addEventListener('pointerleave', () => to(0));
  hang.addEventListener('pointerdown', () => to(2));
  hang.addEventListener('pointerup', () => to(1));
}

/** One length of chain, its top at `top`. */
function chain(left: number, top: number, long: boolean): HTMLDivElement {
  const link = sprite(long ? 'rack/chain-long' : 'rack/chain', X);
  link.style.left = `${left}px`;
  link.style.top = `${top}px`;
  return link;
}

/**
 * A board hung off the beam on two chains, with a project's face on it.
 *
 * Its own picture is nailed to the planks; until it has one, a prop out of
 * the kit stands for it. The one you are standing in is painted gold.
 */
function hangBoard(): HTMLDivElement {
  const hang = document.createElement('div');
  hang.style.cssText = HANG(BOARD);
  hang.appendChild(chain(3 * X, CHAIN_AT, false));
  hang.appendChild(chain(18 * X, CHAIN_AT, false));
  const swing = document.createElement('div');
  swing.className = 'swing';
  swing.style.cssText = SWING(BOARD_AT, BOARD);
  const plank = sprite('rack/board', X);
  plank.className = 'plank';
  swing.appendChild(plank);
  const face = document.createElement('div');
  face.className = 'face-on';
  face.style.cssText = FACE;
  swing.appendChild(face);
  hang.appendChild(swing);
  tug(hang, swing);
  return hang;
}

function paintBoard(hang: HTMLDivElement, project: OnShelf): void {
  const plank = hang.querySelector<HTMLDivElement>('.plank');
  const face = hang.querySelector<HTMLDivElement>('.face-on');
  if (!plank || !face) return;
  const want = project.here ? 'board-here' : 'board';
  if (plank.dataset.cut !== want) {
    plank.dataset.cut = want;
    const cut = cutOf(`rack/${want}`);
    if (cut) plank.style.backgroundPosition = `${-cut.x * X}px ${-cut.y * X}px`;
  }
  hang.style.filter = GLOW[project.wants ?? 'none'];

  const key = project.icon ?? toolFor(project.at);
  if (face.dataset.face === key) return;
  face.dataset.face = key;
  face.replaceChildren();
  const room = 16 * X;
  if (project.icon) {
    const picture = document.createElement('img');
    picture.src = project.icon;
    picture.alt = '';
    picture.draggable = false;
    picture.style.cssText = `max-width:${room}px;max-height:${room}px;display:block`;
    /* A picture drawn as pixels stays pixels. A favicon at sixteen across
       blown up smooth is a smudge; blown up square it is still the favicon. */
    picture.addEventListener('load', () => {
      const big = Math.max(picture.naturalWidth, picture.naturalHeight);
      if (big < room) {
        picture.style.imageRendering = 'pixelated';
        picture.style.width = `${picture.naturalWidth * Math.max(1, Math.floor(room / big))}px`;
      }
    });
    face.appendChild(picture);
    return;
  }
  const tool = toolFor(project.at);
  const cut = cutOf(tool);
  const times = cut
    ? (Math.max(1, Math.min(2, Math.floor(room / Math.max(cut.w, cut.h)))) as 1 | 2)
    : 1;
  const prop = sprite(tool, times);
  prop.style.position = 'relative';
  face.appendChild(prop);
}

/** A round of wood off one chain, for one of the rack's own doings. */
function hangToken(glyph: string | HTMLElement): HTMLDivElement {
  const hang = document.createElement('div');
  hang.style.cssText = HANG(TOKEN);
  hang.appendChild(chain(6 * X, CHAIN_AT, true));
  const swing = document.createElement('div');
  swing.className = 'swing';
  swing.style.cssText = SWING(TOKEN_AT, TOKEN);
  swing.appendChild(sprite('rack/token', X));
  const mark = typeof glyph === 'string' ? sprite(glyph, X) : glyph;
  mark.classList.add('mark');
  mark.style.left = `${3 * X}px`;
  mark.style.top = `${3 * X}px`;
  mark.style.position = 'absolute';
  swing.appendChild(mark);
  hang.appendChild(swing);
  tug(hang, swing);
  return hang;
}

export function makeShelf(
  at: HTMLElement,
  open: (id: string) => void,
  out: () => void,
  reorder: (ids: string[]) => void,
  settings: () => void,
  sky: () => void
): Shelf {
  const root = box({ right: 0, top: 0 }, RACK);
  // Its bare wood holds the window, like the empty part of any Mac toolbar.
  root.dataset.grip = '';
  at.appendChild(root);

  /* The beam, the length of the whole rack and on off the window's edge,
     sawn off at its left end. */
  const beam = document.createElement('div');
  beam.style.cssText = BEAM_LOG;
  beam.dataset.grip = '';
  root.appendChild(beam);
  const end = sprite('rack/beam-end', X);
  end.style.left = '0px';
  end.style.top = '0px';
  root.appendChild(end);

  /* The label is also the handle, burned into the beam. Pressing it folds the
     rack away. It doubles as where a name appears when you are over a board,
     so nothing has to be drawn under the rack and nothing collides with the
     two facts the header keeps in that corner. It is made once and kept:
     swapping its text is a cross fade, not a jump cut. */
  const label = document.createElement('div');
  label.style.cssText = LABEL;
  label.dataset.shelf = 'fold';
  label.addEventListener('click', () => fold(!away));
  root.appendChild(label);

  const strip = document.createElement('div');
  strip.style.cssText = STRIP;
  strip.dataset.grip = '';
  root.appendChild(strip);

  /* Where the projects stop and the rack's own doings start, an iron band
     round the beam. Folded away with the sky, out on the island only when
     there is anything left of the projects to stand it beside. */
  const band = sprite('rack/bracket', X);
  band.style.cssText += `;position:relative;flex:none;align-self:flex-start;margin:0 ${PAD}px`;

  /* The sky has a token of its own out on the island, showing what it is
     doing right now: pressing it opens the hour and the weather. Standing in
     a project it folds away, since the sky is the island's, not the yard's. */
  const skyMark = document.createElement('img');
  skyMark.alt = '';
  skyMark.draggable = false;
  skyMark.style.cssText = `width:${9 * X}px;height:${9 * X}px;image-rendering:pixelated`;
  const weather = hangToken(skyMark);
  weather.dataset.shelf = 'sky';
  weather.title = 'the sky';
  weather.addEventListener('pointerenter', () => crossfade(() => paintLabel('the sky')));
  weather.addEventListener('pointerleave', () => crossfade(settle));
  weather.addEventListener('click', (event) => {
    event.stopPropagation();
    sky();
  });

  /* The windmill has no island of its own to stand on yet, so the rack
     carries its own way in: a wheel, always here, on the island or standing
     deep in a project alike, right beside the fire that takes you home. */
  const wheel = hangToken('rack/glyph-wheel');
  wheel.dataset.shelf = 'windmill';
  wheel.title = 'settings';
  wheel.addEventListener('pointerenter', () => crossfade(() => paintLabel('settings')));
  wheel.addEventListener('pointerleave', () => crossfade(settle));
  wheel.addEventListener('click', () => settings());

  const fire = hangToken('rack/glyph-fire');
  fire.dataset.shelf = 'island';
  fire.title = 'the island';
  fire.addEventListener('pointerenter', () => crossfade(() => paintLabel('the island')));
  fire.addEventListener('pointerleave', () => crossfade(settle));
  fire.addEventListener('click', () => out());
  for (const each of [weather, wheel, fire]) each.style.transition += `,${SHUT}`;
  let inside = false;

  const nodes = new Map<string, HTMLDivElement>();
  const held = new Map<string, OnShelf>();
  let away = false;
  let last: OnShelf[] = [];
  let labelGen = 0;

  /* A board folds to nothing rather than being taken out: its width eases
     away and a margin swallows the gap it stood in, so its neighbours close
     up over it instead of jumping. */
  const up = (node: HTMLDivElement, on: boolean, wide: number): void => {
    node.style.opacity = on ? '1' : '0';
    node.style.width = on ? `${wide}px` : '0px';
    node.style.marginLeft = on ? '0px' : `-${PAD}px`;
    node.style.pointerEvents = on ? 'auto' : 'none';
  };

  const worstWant = (projects: OnShelf[]): Want =>
    projects.some((project) => project.wants === 'hurt')
      ? 'hurt'
      : projects.some((project) => project.wants === 'asking')
        ? 'asking'
        : undefined;

  const paintLabel = (text: string, want?: Want): void => {
    label.textContent = text;
    label.style.color = want === 'hurt' ? '#ff7a52' : want === 'asking' ? '#ffc46a' : INKED;
    label.style.textShadow =
      want === 'hurt'
        ? '0 0 8px #ff7a52, 0 2px 0 #3a1d0c'
        : want === 'asking'
          ? '0 0 8px #ffc46a, 0 2px 0 #3a1d0c'
          : BURNED;
  };

  /* Folded shut, every other project is only this label, so it carries the same
     question the open boards would answer: does anywhere else want him.
     Worst first, the same way a house's own light would read it. */
  const settle = (): void => {
    paintLabel(away ? `projects ${last.length}` : 'projects', away ? worstWant(last) : undefined);
  };

  /* A hover swaps the label to that project's name and back, and folding
     swaps it between "projects" and its resting count. All three fade the
     old text out before the new one fades in, rather than jump-cutting, and
     a crossed-out generation stops a quick in-and-out from landing the wrong
     text after its own fade has already moved on. */
  const crossfade = (paint: () => void): void => {
    const gen = ++labelGen;
    label.style.opacity = '0';
    window.setTimeout(() => {
      if (gen !== labelGen) return;
      paint();
      label.style.opacity = '1';
    }, 130);
  };

  const tail = (): void => {
    strip.appendChild(band);
    strip.appendChild(weather);
    strip.appendChild(wheel);
    strip.appendChild(fire);
  };

  function show(projects: OnShelf[], fading = false): void {
    last = projects;
    for (const project of projects) held.set(project.id, project);
    /* Only while there is somewhere to come back out of. It folds to nothing
       rather than being taken out, so arriving in a yard slides it in. */
    const was = inside;
    inside = projects.some((project) => project.here);
    up(fire, inside, TOKEN);
    up(weather, !inside, TOKEN);
    /* Walking into a yard folds it shut and walking back out to the island
       opens it; in between it stays however he left it. */
    if (inside !== was) away = inside;

    if (fading) crossfade(settle);
    else settle();

    const wanted = new Set(projects.map((project) => project.id));
    for (const [id, node] of nodes) {
      if (wanted.has(id)) continue;
      node.style.opacity = '0';
      node.style.transform = 'translateY(-12px)';
      window.setTimeout(() => node.remove(), 220);
      nodes.delete(id);
      held.delete(id);
    }

    for (const project of projects) {
      const on = !away || project.here;
      let node = nodes.get(project.id);
      if (!node) {
        node = hangBoard();
        node.style.transition += `,transform 260ms ${EASE},${SHUT}`;
        node.style.opacity = '0';
        node.style.transform = 'translateY(-12px)';
        node.dataset.project = project.id;
        node.addEventListener('pointerenter', () => {
          const now = held.get(project.id);
          if (now) crossfade(() => paintLabel(now.name));
        });
        node.addEventListener('pointerleave', () => crossfade(settle));
        node.addEventListener('click', (event) => {
          if (justDragged) {
            event.stopImmediatePropagation();
            return;
          }
          open(project.id);
        });
        node.addEventListener('pointerdown', (event) => hold(project.id, event));
        nodes.set(project.id, node);
        strip.appendChild(node);
        if (!on) up(node, false, BOARD);
        /* A new board drops onto its chains rather than fading up out of
           nothing. */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!node || !(!away || held.get(project.id)?.here)) return;
            node.style.opacity = '1';
            node.style.transform = 'translateY(0)';
          });
        });
      } else {
        strip.appendChild(node); // re-append moves it into place without touching it
        up(node, on, BOARD);
      }
      paintBoard(node, project);
      node.title = project.name;
    }
    const anyUp = projects.some((project) => !away || project.here);
    band.style.display = anyUp ? '' : 'none';
    tail();
  }

  /* Dragging a board along the rack. It follows the pointer sideways only,
     held inside the rack's own ends, and everything between where it was and
     where it would land slides one board over to open the gap. Nothing is
     committed until it is let go. */
  const STEP = BOARD + PAD;
  let justDragged = false;

  function hold(id: string, down: PointerEvent): void {
    if (down.button !== 0 || away) return;
    const node = nodes.get(id);
    if (!node) return;
    const order = last.map((project) => project.id);
    const from = order.indexOf(id);
    if (from === -1) return;
    const startX = down.clientX;
    let lifted = false;
    let to = from;
    const kept = node.style.transition;
    const glow = node.style.filter;

    const place = (dx: number): void => {
      const clamped = Math.max(-from * STEP, Math.min((order.length - 1 - from) * STEP, dx));
      to = Math.max(0, Math.min(order.length - 1, Math.round(from + clamped / STEP)));
      node.style.transform = `translate(${clamped}px,${X * 2}px)`;
      order.forEach((other, at) => {
        if (at === from) return;
        const shift = from < at && at <= to ? -STEP : to <= at && at < from ? STEP : 0;
        const each = nodes.get(other);
        if (each) each.style.transform = shift ? `translateX(${shift}px)` : 'translateY(0)';
      });
    };

    const move = (event: PointerEvent): void => {
      const dx = event.clientX - startX;
      if (!lifted) {
        if (Math.abs(dx) < 4) return;
        lifted = true;
        node.setPointerCapture(event.pointerId);
        node.style.transition = `${kept},transform 0s`;
        node.style.position = 'relative';
        node.style.zIndex = '2';
        node.style.cursor = 'grabbing';
        node.style.filter = `${glow} brightness(1.15)`;
      }
      place(dx);
    };

    const let_ = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', let_);
      window.removeEventListener('pointercancel', let_);
      if (!lifted) return;
      justDragged = true;
      window.setTimeout(() => (justDragged = false), 0);
      /* It eases the rest of the way into its gap, and then the rack is
         rebuilt in the new order with every board already where it is drawn,
         so nothing jumps when the transforms come off. */
      node.style.transition = `${kept},transform 160ms ${EASE}`;
      node.style.transform = `translate(${(to - from) * STEP}px,0)`;
      window.setTimeout(() => {
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, id);
        for (const each of nodes.values()) {
          const settled = each === node ? kept : each.style.transition;
          each.style.transition = 'none';
          each.style.transform = 'translateY(0)';
          void each.offsetWidth;
          each.style.transition = settled;
        }
        for (const other of next) {
          const each = nodes.get(other);
          if (each) strip.appendChild(each);
        }
        tail();
        node.style.zIndex = '';
        node.style.cursor = '';
        node.style.filter = glow;
        if (to !== from) reorder(next);
      }, 160);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', let_);
    window.addEventListener('pointercancel', let_);
  }

  function fold(shut = true): void {
    if (away === shut) return;
    away = shut;
    show(last, true);
  }

  return {
    show,
    fold,
    setSky: (picture) => {
      if (skyMark.src !== picture) skyMark.src = picture;
    },
    close: () => root.remove(),
  };
}

/* Burned into the log: the dark of a brand, with the lip of wood under it
   catching the light. */
const INKED = '#3a1d0c';
const BURNED = '0 2px 0 rgba(255,232,186,.22)';

const RACK = [
  'display:flex',
  'align-items:flex-start',
  `height:${TALL}px`,
  `padding:0 ${PAD * 2}px 0 ${12 * X}px`,
  'pointer-events:auto',
  /* The whole rack throws one shadow onto the island under it. */
  'filter:drop-shadow(0 3px 0 rgba(18,13,7,.45))',
].join(';');

const BEAM_LOG = [
  'position:absolute',
  'left:12px',
  'right:0',
  'top:0',
  `height:${BEAM}px`,
  'background-image:url(./rack/beam.png)',
  'background-repeat:repeat-x',
  `background-size:${32 * X}px ${BEAM}px`,
  'image-rendering:pixelated',
].join(';');

const LABEL = [
  "font-family:'Silkscreen',monospace",
  'font-size:16px',
  'line-height:1',
  'text-transform:lowercase',
  `color:${INKED}`,
  `text-shadow:${BURNED}`,
  'white-space:nowrap',
  'position:relative',
  'flex:none',
  /* The whole stretch of beam the word is burned into is the handle, not
     just the letters. Wide enough that most names fit without the beam
     growing under the pointer. */
  `height:${BEAM - X}px`,
  'min-width:128px',
  'display:flex',
  'align-items:center',
  `padding:${X}px ${PAD * 2}px 0 ${X * 2}px`,
  'cursor:default',
  `transition:opacity 130ms ease,color 520ms ${EASE},text-shadow 520ms`,
].join(';');

/* Its own strip so folding is a real collapse: the width eases to nothing
   and the boards ride along inside it, rather than every board just
   vanishing while the rack reflows around them in one frame. */
const STRIP = [
  'display:flex',
  'align-items:flex-start',
  `gap:${PAD}px`,
  'overflow:hidden',
  `height:${TALL}px`,
  'position:relative',
].join(';');

const SHUT = `opacity 220ms ease,width 340ms ${EASE},margin 340ms ${EASE}`;

const HANG = (wide: number): string =>
  [
    'position:relative',
    'flex:none',
    `width:${wide}px`,
    `height:${TALL}px`,
    'cursor:default',
    `transition:filter 520ms ${EASE}`,
  ].join(';');

const SWING = (top: number, size: number): string =>
  [
    'position:absolute',
    'left:0',
    `top:${top}px`,
    `width:${size}px`,
    `height:${size}px`,
    `transition:transform 160ms ${EASE}`,
  ].join(';');

const FACE = [
  'position:absolute',
  `left:${4 * X}px`,
  `top:${4 * X}px`,
  `width:${16 * X}px`,
  `height:${16 * X}px`,
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'filter:drop-shadow(2px 2px 0 rgba(58,29,12,.55))',
].join(';');
