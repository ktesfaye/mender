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
 * This is the only place in the village where a pressable thing is a box
 * rather than a line of gold writing, and that is deliberate: it is an
 * inventory rack out of a game, not a piece of the board. Everything else on
 * the wood follows the rule.
 *
 * Standing in a project, the rack ends with one more slot that is not a
 * project, pinned to its right end whatever order the projects are in: the
 * campfire the island grows from, and pressing it flies back
 * out to the whole island. Escape walks there too, a step at a time; this is
 * the one press that goes straight there from anywhere.
 *
 * A slot held and dragged along the rack lifts out of it and the others
 * step aside to make room; let go and it hangs there from then on. A press
 * that never really moved is still just a press.
 */

import { SLOT, slot, toolFor, updateSlot } from './face';
import { KIT_NAMES } from './sprite';
import { box } from './write';

const PAD = 6;
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
  close(): void;
}

export function makeShelf(
  at: HTMLElement,
  open: (id: string) => void,
  out: () => void,
  reorder: (ids: string[]) => void
): Shelf {
  const root = box({ right: 0, top: 0 }, RACK);
  at.appendChild(root);

  /* The label is also the handle. Pressing it folds the rack away, which is
     the only thing on this shelf that is not a project. It doubles as where
     a name appears when you are over a slot, so nothing has to be drawn
     under the rack and nothing collides with the two facts the header keeps
     in that corner. It is made once and kept: swapping its text is a cross
     fade, not a jump cut. */
  const label = document.createElement('div');
  label.style.cssText = LABEL;
  label.dataset.shelf = 'fold';
  label.addEventListener('click', () => fold(!away));
  root.appendChild(label);

  const strip = document.createElement('div');
  strip.style.cssText = STRIP;
  root.appendChild(strip);

  const fire = slot({ tool: KIT_NAMES.fire }, false);
  fire.dataset.shelf = 'island';
  fire.title = 'the island';
  fire.style.transition += `,opacity 220ms ease,width 220ms ${EASE},margin 220ms ${EASE}`;
  fire.addEventListener('pointerenter', () => crossfade(() => paintLabel('the island', '#f4e3c0')));
  fire.addEventListener('pointerleave', () => crossfade(settle));
  fire.addEventListener('click', () => out());
  strip.appendChild(fire);
  let inside = false;

  const nodes = new Map<string, HTMLDivElement>();
  const held = new Map<string, OnShelf>();
  let away = false;
  let last: OnShelf[] = [];
  let labelGen = 0;

  const width = (count: number): number =>
    (count === 0 ? 0 : count * SLOT + (count - 1) * PAD) + (inside ? SLOT + PAD : 0);

  const worstWant = (projects: OnShelf[]): 'asking' | 'hurt' | undefined =>
    projects.some((project) => project.wants === 'hurt')
      ? 'hurt'
      : projects.some((project) => project.wants === 'asking')
        ? 'asking'
        : undefined;

  const paintLabel = (text: string, color: string, glow?: string): void => {
    label.textContent = text;
    label.style.color = color;
    label.style.textShadow = glow ? `0 0 10px ${glow}` : 'none';
  };

  /* Folded shut, the rack is only this label, so it carries the same
     question the open slots would answer: does anywhere else want him.
     Worst first, the same way a house's own light would read it. */
  const settle = (): void => {
    const worst = away ? worstWant(last) : undefined;
    const text = away ? `projects · ${last.length}` : 'projects';
    if (!worst) {
      paintLabel(text, '#c4b186');
      return;
    }
    paintLabel(
      text,
      worst === 'hurt' ? '#ff7a52' : '#ffc46a',
      worst === 'hurt' ? '#ff7a52aa' : '#ffc46aaa'
    );
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

  function show(projects: OnShelf[], fading = false): void {
    last = projects;
    for (const project of projects) held.set(project.id, project);
    /* Only while there is somewhere to come back out of. It folds to nothing
       rather than being taken out, so arriving in a yard slides it in. */
    inside = projects.some((project) => project.here);
    fire.style.opacity = inside ? '1' : '0';
    fire.style.width = inside ? `${SLOT}px` : '0px';
    fire.style.marginLeft = inside ? '0px' : `-${PAD}px`;
    fire.style.borderWidth = inside ? '2px' : '0px';
    fire.style.pointerEvents = inside ? 'auto' : 'none';

    if (fading) crossfade(settle);
    else settle();
    strip.style.width = `${away ? 0 : width(projects.length)}px`;
    strip.style.opacity = away ? '0' : '1';
    strip.style.pointerEvents = away ? 'none' : 'auto';

    const wanted = new Set(projects.map((project) => project.id));
    for (const [id, node] of nodes) {
      if (wanted.has(id)) continue;
      node.style.opacity = '0';
      node.style.transform = 'scale(.6)';
      window.setTimeout(() => node.remove(), 220);
      nodes.delete(id);
      held.delete(id);
    }

    if (away) return;

    for (const project of projects) {
      const face = {
        tool: toolFor(project.at),
        ...(project.icon ? { icon: project.icon } : {}),
        ...(project.wants ? { wants: project.wants } : {}),
      };
      let node = nodes.get(project.id);
      if (!node) {
        node = slot(face, project.here);
        node.style.transition += `,opacity 220ms ease,transform 220ms ${EASE}`;
        node.style.opacity = '0';
        node.style.transform = 'scale(.6)';
        node.dataset.project = project.id;
        node.addEventListener('pointerenter', () => {
          const now = held.get(project.id);
          if (now) crossfade(() => paintLabel(now.name, '#f4e3c0'));
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
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!node) return;
            node.style.opacity = '1';
            node.style.transform = 'scale(1)';
          });
        });
      } else {
        updateSlot(node, face, project.here);
        strip.appendChild(node); // re-append moves it into place without touching it
      }
      node.title = project.name;
    }
    strip.appendChild(fire);
  }

  /* Dragging a slot along the rack. It follows the pointer sideways only,
     held inside the rack's own ends, and everything between where it was and
     where it would land slides one slot over to open the gap. Nothing is
     committed until it is let go. */
  const STEP = SLOT + PAD;
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

    const place = (dx: number): void => {
      const clamped = Math.max(-from * STEP, Math.min((order.length - 1 - from) * STEP, dx));
      to = Math.max(0, Math.min(order.length - 1, Math.round(from + clamped / STEP)));
      node.style.transform = `translateX(${clamped}px)`;
      order.forEach((other, at) => {
        if (at === from) return;
        const shift = from < at && at <= to ? -STEP : to <= at && at < from ? STEP : 0;
        const each = nodes.get(other);
        if (each) each.style.transform = shift ? `translateX(${shift}px)` : 'scale(1)';
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
        node.style.filter = 'brightness(1.15)';
      }
      place(dx);
    };

    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!lifted) return;
      justDragged = true;
      window.setTimeout(() => (justDragged = false), 0);
      /* It eases the rest of the way into its gap, and then the rack is
         rebuilt in the new order with every slot already where it is drawn,
         so nothing jumps when the transforms come off. */
      node.style.transition = `${kept},transform 160ms ${EASE}`;
      node.style.transform = `translateX(${(to - from) * STEP}px)`;
      window.setTimeout(() => {
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, id);
        for (const each of nodes.values()) {
          const settled = each === node ? kept : each.style.transition;
          each.style.transition = 'none';
          each.style.transform = 'scale(1)';
          void each.offsetWidth;
          each.style.transition = settled;
        }
        for (const other of next) {
          const each = nodes.get(other);
          if (each) strip.appendChild(each);
        }
        strip.appendChild(fire);
        node.style.zIndex = '';
        node.style.cursor = '';
        node.style.filter = '';
        if (to !== from) reorder(next);
      }, 160);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function fold(shut = true): void {
    if (away === shut) return;
    away = shut;
    show(last, true);
  }

  return {
    show,
    fold,
    close: () => root.remove(),
  };
}

const RACK = [
  'display:flex',
  'align-items:center',
  `padding:${PAD}px ${PAD * 2}px`,
  'background:#54391e',
  'border:2px solid #482510',
  'border-top:none',
  'border-right:none',
  'box-shadow:0 4px 0 rgba(72,37,16,.55)',
  'pointer-events:auto',
].join(';');

const LABEL = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:11px',
  'letter-spacing:.24em',
  'text-transform:uppercase',
  'color:#c4b186',
  'text-shadow:1px 1px 0 #120d07',
  'white-space:nowrap',
  `padding-right:${PAD}px`,
  'cursor:default',
  `transition:opacity 130ms ease,color 520ms ${EASE},text-shadow 520ms`,
].join(';');

/* Its own strip so folding is a real collapse: the width eases to nothing
   and the slots ride along inside it, rather than every slot just
   vanishing while the shelf reflows around them in one frame. */
const STRIP = [
  'display:flex',
  'align-items:center',
  `gap:${PAD}px`,
  'overflow:hidden',
  `transition:width 340ms ${EASE},opacity 260ms ease`,
].join(';');
