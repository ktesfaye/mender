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
 * Past a lashing of rope round the beam, the rack ends with its own doings, each a
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

import { gripCarried } from '../grip';
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
  /** Asking or hurt, or only out of usage, which glows low rather than calling. */
  wants?: 'asking' | 'hurt' | 'limited';
}

export interface Shelf {
  show(projects: OnShelf[]): void;
  /** Fold it away, or bring it back. */
  fold(away?: boolean): void;
  /** The picture on the sky's slot: what the sky over the island is doing now. */
  setSky(picture: string): void;
  close(): void;
}

type Want = 'asking' | 'hurt' | 'limited' | undefined;

/* The same two colours a lit house's window uses (`village/folk.ts`'s own
   `LIGHT` table): amber for somebody asking, red for somebody hurt. It is a
   glow round the board's own outline rather than round a box, so the board
   stays the shape it was drawn. */
const GLOW: Record<'asking' | 'hurt' | 'limited' | 'none', string> = {
  limited: 'drop-shadow(0 0 2px #d0583e) drop-shadow(0 0 7px #d0583e88)',
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
    picture.style.cssText = `max-width:${room}px;max-height:${room}px;display:block;${PAINTED}`;
    const seat = document.createElement('div');
    seat.style.cssText = 'position:relative;display:block;line-height:0';
    seat.appendChild(picture);
    /* A picture drawn as pixels stays pixels. A favicon at sixteen across
       blown up smooth is a smudge; blown up square it is still the favicon. */
    picture.addEventListener('load', () => {
      const big = Math.max(picture.naturalWidth, picture.naturalHeight);
      if (big < room) {
        picture.style.imageRendering = 'pixelated';
        picture.style.width = `${picture.naturalWidth * Math.max(1, Math.floor(room / big))}px`;
      }
    });
    face.appendChild(seat);
    /* The grain of the board it is painted on, showing up through it: the
       planks' own picture laid over the face, cut to the face's own shape
       and blended in soft, so it reads as painted onto the wood rather than
       stuck on top of it. */
    const grain = document.createElement('div');
    const cut = cutOf('rack/board');
    grain.style.cssText = [
      'position:absolute',
      'inset:0',
      'pointer-events:none',
      `background-image:url(${cut?.sheet ?? ''})`,
      `background-size:${(cut?.sheetWide ?? 0) * X}px ${(cut?.sheetTall ?? 0) * X}px`,
      `background-position:${-((cut?.x ?? 0) + 4) * X}px ${-((cut?.y ?? 0) + 4) * X}px`,
      'image-rendering:pixelated',
      'mix-blend-mode:soft-light',
      'opacity:.55',
      `-webkit-mask-image:url("${project.icon}")`,
      '-webkit-mask-size:contain',
      '-webkit-mask-repeat:no-repeat',
      '-webkit-mask-position:center',
    ].join(';');
    seat.appendChild(grain);
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
  end.style.zIndex = '2';
  end.style.transition = `filter 520ms ${EASE}`;
  root.appendChild(end);

  /* No word on it: the whole beam is the handle, and a press anywhere along
     the wood the boards hang from folds the rack away, unless that press
     carried the window somewhere instead. A short length of bare beam stands
     before the first board so there is always some of it to take hold of. */
  const stub = document.createElement('div');
  stub.style.cssText = `flex:none;width:${8 * X}px;height:${BEAM}px`;
  root.appendChild(stub);
  root.addEventListener('click', (event) => {
    if (gripCarried()) return;
    const on = event.target instanceof Element ? event.target : null;
    if (on?.closest('[data-project],[data-shelf]')) return;
    fold(!away);
  });

  const strip = document.createElement('div');
  strip.style.cssText = STRIP;
  strip.dataset.grip = '';
  root.appendChild(strip);

  /* The name, on a small board of its own that drops on two chains from
     under whatever is being pointed at, and slides along under the next one
     rather than going up and coming down again. Never pressable: the pointer
     goes straight through it. */
  const tag = document.createElement('div');
  tag.style.cssText = TAG;
  const tagChains = [chain(0, 0, false), chain(0, 0, false)];
  for (const each of tagChains) tag.appendChild(each);
  const tagPlate = document.createElement('div');
  tagPlate.style.cssText = TAG_PLATE;
  tag.appendChild(tagPlate);
  root.appendChild(tag);
  let tagFor: HTMLElement | null = null;
  let tagLeave = 0;

  const showTag = (over: HTMLElement, name: string): void => {
    window.clearTimeout(tagLeave);
    const already = tagFor !== null;
    tagFor = over;
    tagPlate.textContent = name;
    const wide = tagPlate.offsetWidth;
    const box = over.getBoundingClientRect();
    const rack = root.getBoundingClientRect();
    const swing = over.querySelector<HTMLElement>('.swing');
    const bottom = (swing?.getBoundingClientRect().bottom ?? box.bottom) - rack.top;
    const middle = box.left - rack.left + box.width / 2;
    const left = Math.round(Math.max(4, Math.min(rack.width - wide - 6, middle - wide / 2)));
    const top = Math.round(bottom - X * 2);
    /* The chains hang straight down off the board above, so they stay put
       under it however far the name runs either side. */
    const reach = Math.min(box.width, BOARD) / 2 - 7 * X;
    tagChains[0].style.left = `${Math.round(middle - left - reach - X)}px`;
    tagChains[1].style.left = `${Math.round(middle - left + reach - X * 2)}px`;
    for (const each of tagChains) each.style.top = '0px';
    if (!already) {
      tag.style.transition = 'none';
      tag.style.left = `${left}px`;
      tag.style.top = `${top}px`;
      tag.style.transform = `translateY(-${X * 5}px)`;
      void tag.offsetWidth;
      tag.style.transition = TAG_MOVES;
    }
    tag.style.left = `${left}px`;
    tag.style.top = `${top}px`;
    tag.style.opacity = '1';
    tag.style.transform = 'translateY(0)';
  };

  const hideTag = (atOnce = false): void => {
    window.clearTimeout(tagLeave);
    /* A moment's grace, so going from one board to the next slides the tag
       along rather than putting it up and taking it down. */
    tagLeave = window.setTimeout(
      () => {
        tagFor = null;
        tag.style.opacity = '0';
        tag.style.transform = `translateY(-${X * 5}px)`;
      },
      atOnce ? 0 : 90
    );
  };

  const named = (node: HTMLElement, name: () => string | undefined): void => {
    node.addEventListener('pointerenter', () => {
      const now = name();
      if (now) showTag(node, now);
    });
    node.addEventListener('pointerleave', () => hideTag());
    node.addEventListener('pointerdown', () => hideTag(true));
  };

  /* Where the projects stop and the rack's own doings start, rope lashed
     round the beam, drawn over the wood and a pixel proud of it either side. Folded away
     with the sky, out on the island only when there is anything left of the
     projects to stand it beside. */
  const band = sprite('rack/bracket', X);
  band.style.cssText += `;position:relative;z-index:3;flex:none;align-self:flex-start;margin:-${X}px ${PAD}px 0`;

  /* The sky has a token of its own out on the island, showing what it is
     doing right now: pressing it opens the hour and the weather. Standing in
     a project it folds away, since the sky is the island's, not the yard's. */
  const skyMark = document.createElement('img');
  skyMark.alt = '';
  skyMark.draggable = false;
  skyMark.style.cssText = `width:${9 * X}px;height:${9 * X}px;image-rendering:pixelated`;
  const weather = hangToken(skyMark);
  weather.dataset.shelf = 'sky';
  named(weather, () => 'the sky');
  weather.addEventListener('click', (event) => {
    event.stopPropagation();
    sky();
  });

  /* The windmill has no island of its own to stand on yet, so the rack
     carries its own way in: a wheel, always here, on the island or standing
     deep in a project alike, right beside the fire that takes you home. */
  const wheel = hangToken('rack/glyph-wheel');
  wheel.dataset.shelf = 'windmill';
  named(wheel, () => 'settings');
  wheel.addEventListener('click', () => settings());

  const fire = hangToken('rack/glyph-fire');
  fire.dataset.shelf = 'island';
  named(fire, () => 'the island');
  fire.addEventListener('click', () => out());
  let inside = false;

  const nodes = new Map<string, HTMLDivElement>();
  const held = new Map<string, OnShelf>();
  let away = false;
  let last: OnShelf[] = [];

  /* A board folds away by being drawn up on its chains behind the beam, and
     only then does the gap it hung in close, its neighbours sliding up to
     where it was. Unfolding is the same played back: the gap opens and the
     board drops into it. Several at once go one after another, `order`
     saying which turn is this one's, so the rack rolls up and down rather
     than every board blinking at once. Nothing is touched when a board is
     already where it is asked to be, since the rack is repainted far more
     often than it folds. */
  const up = (node: HTMLDivElement, on: boolean, wide: number, order = 0, now = true): void => {
    const state = on ? 'up' : 'away';
    if (node.dataset.hung === state) return;
    node.dataset.hung = state;
    const turn = order * STAGGER;
    const lift = on ? turn + 140 : turn;
    const close = on ? turn : turn + 170;
    node.style.transition = now
      ? [
          `filter 520ms ${EASE}`,
          `opacity 160ms ease ${on ? lift : lift + 150}ms`,
          `transform 300ms ${EASE} ${lift}ms`,
          `width 360ms ${EASE} ${close}ms`,
          `margin 360ms ${EASE} ${close}ms`,
        ].join(',')
      : 'none';
    node.style.opacity = on ? '1' : '0';
    node.style.transform = on ? 'translateY(0)' : `translateY(-${TALL}px)`;
    node.style.width = on ? `${wide}px` : '0px';
    node.style.marginLeft = on ? '0px' : `-${PAD}px`;
    node.style.pointerEvents = on ? 'auto' : 'none';
  };

  const worstWant = (projects: OnShelf[]): Want =>
    projects.some((project) => project.wants === 'hurt')
      ? 'hurt'
      : projects.some((project) => project.wants === 'asking')
        ? 'asking'
        : projects.some((project) => project.wants === 'limited')
          ? 'limited'
          : undefined;

  /* Folded shut, every other project is behind the beam, so the beam carries
     the question the open boards would answer: does anywhere else want him.
     It takes the same warm or red light a board would, worst first, the way
     a house's own light would read it. */
  const settle = (): void => {
    const want = away ? worstWant(last) : undefined;
    const glow = want ? GLOW[want] : GLOW.none;
    for (const each of [beam, end]) each.style.filter = glow;
  };

  /* Puts each where it belongs along the strip, touching only the ones
     that are not already there. Taking an element out of the page and
     putting it back, even in the very same place, throws away whatever it
     was in the middle of easing toward, which is what used to make the rack
     blink rather than fold: it was being rebuilt on every repaint. */
  const lineUp = (order: HTMLElement[]): void => {
    order.forEach((each, at) => {
      const there = strip.children[at];
      if (there !== each) strip.insertBefore(each, there ?? null);
    });
  };
  const tail = (): void => {
    const boards = last
      .map((project) => nodes.get(project.id))
      .filter((node): node is HTMLDivElement => !!node);
    lineUp([...boards, band, weather, wheel, fire]);
  };

  function show(projects: OnShelf[]): void {
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
    if (away) hideTag(true);

    settle();

    const wanted = new Set(projects.map((project) => project.id));
    for (const [id, node] of nodes) {
      if (wanted.has(id)) continue;
      node.style.opacity = '0';
      node.style.transform = 'translateY(-12px)';
      window.setTimeout(() => node.remove(), 220);
      nodes.delete(id);
      held.delete(id);
    }

    /* Whose turn it is to go: unfolding drops them in from the handle
       outward, folding draws them up from the far end back toward it. */
    const going = projects.filter((project) => {
      const node = nodes.get(project.id);
      return node && node.dataset.hung !== (!away || project.here ? 'up' : 'away');
    });
    const turnOf = (id: string): number => {
      const at = going.findIndex((project) => project.id === id);
      return at === -1 ? 0 : away ? going.length - 1 - at : at;
    };

    for (const project of projects) {
      const on = !away || project.here;
      let node = nodes.get(project.id);
      if (!node) {
        node = hangBoard();
        node.dataset.hung = 'up';
        node.style.transition += `,transform 260ms ${EASE},opacity 220ms ease`;
        node.style.opacity = '0';
        node.style.transform = 'translateY(-12px)';
        node.dataset.project = project.id;
        named(node, () => held.get(project.id)?.name);
        node.addEventListener('click', (event) => {
          if (justDragged) {
            event.stopImmediatePropagation();
            return;
          }
          open(project.id);
        });
        node.addEventListener('pointerdown', (event) => hold(project.id, event));
        nodes.set(project.id, node);
        strip.insertBefore(node, band.parentNode === strip ? band : null);
        if (!on) up(node, false, BOARD, 0, false);
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
        up(node, on, BOARD, turnOf(project.id));
      }
      paintBoard(node, project);
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
    const saved = new Map<HTMLDivElement, string>();
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
        /* While one is carried the rest step aside straight away, without
           the turns they take when the rack folds. */
        for (const each of nodes.values()) {
          saved.set(each, each.style.transition);
          each.style.transition = `filter 520ms ${EASE},transform 180ms ${EASE}`;
        }
        node.style.transition = `filter 520ms ${EASE},transform 0s`;
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
      node.style.transition = `filter 520ms ${EASE},transform 160ms ${EASE}`;
      node.style.transform = `translate(${(to - from) * STEP}px,0)`;
      window.setTimeout(() => {
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, id);
        for (const each of nodes.values()) {
          each.style.transition = 'none';
          each.style.transform = 'translateY(0)';
        }
        last = next
          .map((other) => held.get(other))
          .filter((project): project is OnShelf => !!project);
        tail();
        for (const each of nodes.values()) {
          void each.offsetWidth;
          each.style.transition = saved.get(each) ?? '';
        }
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
    show(last);
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
  /* In front of what hangs off it, so a board folding away is drawn up
     behind the wood rather than over it. */
  'z-index:2',
  'left:12px',
  'right:0',
  'top:0',
  `height:${BEAM}px`,
  'background-image:url(./rack/beam.png)',
  'background-repeat:repeat-x',
  `background-size:${32 * X}px ${BEAM}px`,
  'image-rendering:pixelated',
  `transition:filter 520ms ${EASE}`,
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

/* How far apart, one board's turn from the next, when several fold at once. */
const STAGGER = 22;

/* The face painted on the planks sits down in its carved square: a hard
   dark edge where the lip throws its shadow in, a lit edge where the light
   catches the far lip, and its colours pulled a little toward the wood's own
   warmth so a bright app icon does not read as a sticker. */
const PAINTED = [
  'filter:sepia(.18) saturate(.88) brightness(.96)',
  'drop-shadow(-1px -1px 0 rgba(36,18,6,.7))',
  'drop-shadow(1px 1px 0 rgba(255,232,186,.28))',
].join(' ');

const TAG = [
  'position:absolute',
  'left:0',
  'top:0',
  'z-index:3',
  'pointer-events:none',
  'opacity:0',
  `transform:translateY(-${5 * X}px)`,
].join(';');

const TAG_MOVES = [
  `left 200ms ${EASE}`,
  `top 200ms ${EASE}`,
  'opacity 140ms ease',
  `transform 220ms ${EASE}`,
].join(',');

/* A small board of the same wood, the name in the flags' own lettering in
   cream with the ink under it, hung a chain's length below. */
const TAG_PLATE = [
  'position:relative',
  `margin-top:${5 * X}px`,
  `padding:${3 * X}px ${4 * X}px ${2 * X}px`,
  "font-family:'Silkscreen',monospace",
  'font-size:16px',
  'line-height:1',
  'text-transform:lowercase',
  'white-space:nowrap',
  'color:#f4e3c0',
  'text-shadow:0 2px 0 #2a1508',
  'background:#74593a',
  `border:${X}px solid #482510`,
  `box-shadow:inset 0 ${X}px 0 #947e5c,inset 0 -${X}px 0 #56351d`,
].join(';');

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
].join(';');
