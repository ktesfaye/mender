/**
 * What a project looks like on the rack.
 *
 * Its own picture if it has been given one: the app icon, the logo, whatever
 * that repository already uses for a face. Until then, a tool out of the kit,
 * handed out in the island's own order so a project keeps the same one for as
 * long as it has nothing better.
 *
 * The slot is the rack's, and the board that picks a picture draws its choices
 * in the same slots, because what you are choosing is what goes on the rack.
 */

import { cutOf, KIT_NAMES, sprite } from './sprite';

/** What a project can be, in order, while it has no picture of its own. */
const TOOLS = [
  KIT_NAMES.anvil,
  KIT_NAMES.sign,
  KIT_NAMES.barrel,
  KIT_NAMES.sack,
  KIT_NAMES.bucket,
  KIT_NAMES.crate,
  KIT_NAMES.pot,
  KIT_NAMES.rack,
  KIT_NAMES.roadSign,
  KIT_NAMES.table,
  KIT_NAMES.lanternOn,
  KIT_NAMES.cart,
] as const;

export const SLOT = 44;

/* The same two colours a lit house's window uses (`village/folk.ts`'s own
   `LIGHT` table): amber for somebody asking, red for somebody hurt. */
const WANTS: Record<'asking' | 'hurt' | 'none', string> = {
  none: '0 0 0 rgba(0,0,0,0)',
  asking: '0 0 14px 4px #ffc46aaa',
  hurt: '0 0 14px 4px #ff7a52aa',
};

/** The kit's stand-in for the project that came in at `at`. */
export function toolFor(at: number): string {
  return TOOLS[at % TOOLS.length] ?? TOOLS[0];
}

type Face = { icon?: string; tool: string; wants?: 'asking' | 'hurt' };

/** One slot on the rack, with a picture or a tool standing in it. */
export function slot(face: Face, here: boolean, size = SLOT): HTMLDivElement {
  const box = document.createElement('div');
  box.className = 'face';
  box.style.cssText = here ? SLOT_HERE(size) : SLOT_EMPTY(size);
  /* The same warm or red wash a lit house gets, eased in and out the same
     way — the rack answers "does anywhere else want me" without gaining a
     badge or a dot, the two things this app otherwise never draws. Its own
     colour eases the same way, so the slot that is yours never snaps into
     that from one paint to the next. */
  box.style.transition = 'box-shadow 520ms cubic-bezier(.2,.8,.2,1),background-color 320ms ease';
  box.style.boxShadow = WANTS[face.wants ?? 'none'];
  paintFace(box, face, size);
  return box;
}

/**
 * The same slot, repainted in place rather than rebuilt.
 *
 * The rack is repainted on every mood that changes island-wide, which is
 * often; tearing every slot down and standing it back up on each one is what
 * made it read as jittery, since it also restarted every wash already easing
 * in or out. Only what actually changed here — which one is yours, what it
 * wants, the picture it wears — is worth touching.
 */
export function updateSlot(box: HTMLDivElement, face: Face, here: boolean, size = SLOT): void {
  box.style.background = here ? '#e0b56a' : '#a48961';
  box.style.boxShadow = WANTS[face.wants ?? 'none'];
  paintFace(box, face, size);
}

function paintFace(box: HTMLDivElement, face: Face, size: number): void {
  const key = face.icon ?? face.tool;
  if (box.dataset.face === key) return;
  box.dataset.face = key;
  box.replaceChildren();

  if (face.icon) {
    const picture = document.createElement('img');
    picture.src = face.icon;
    picture.alt = '';
    picture.draggable = false;
    const room = size - 10;
    picture.style.cssText = `max-width:${room}px;max-height:${room}px;margin:auto;display:block`;
    /* A picture drawn as pixels stays pixels. A favicon at sixteen across
       blown up smooth is a smudge; blown up square it is still the favicon. */
    picture.addEventListener('load', () => {
      if (Math.max(picture.naturalWidth, picture.naturalHeight) < room) {
        picture.style.imageRendering = 'pixelated';
        const times = Math.max(
          1,
          Math.floor(room / Math.max(picture.naturalWidth, picture.naturalHeight))
        );
        picture.style.width = `${picture.naturalWidth * times}px`;
      }
    });
    box.appendChild(picture);
    return;
  }

  const cut = cutOf(face.tool);
  /* Whole multiples only, and the biggest one that still fits the slot, so a
     small prop is not lost in the middle of it. */
  const times = cut
    ? (Math.max(1, Math.min(3, Math.floor((size - 10) / Math.max(cut.w, cut.h)))) as 1 | 2 | 3)
    : 1;
  const prop = sprite(face.tool, times);
  prop.style.position = 'relative';
  prop.style.margin = 'auto';
  box.appendChild(prop);
}

const SLOT_EMPTY = (size: number): string =>
  [
    `width:${size}px`,
    `height:${size}px`,
    'flex:none',
    'display:flex',
    'background:#a48961',
    'border:2px solid #482510',
    'box-sizing:border-box',
    'cursor:default',
    'overflow:hidden',
  ].join(';');

/* The one that is yours is the filled slot, in the same thatch gold the
   keyboard's own mark uses, because they mean the same thing: this one. */
const SLOT_HERE = (size: number): string =>
  SLOT_EMPTY(size).replace('background:#a48961', 'background:#e0b56a');
