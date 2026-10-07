import { longFor } from './from';
import { pressing, twice } from './press';
import { KIT_NAMES, sprite } from './sprite';
import { astop } from './walk';
import type { FailureView } from './what';

/**
 * The fire banked on a limit, drawn as the wait it is.
 *
 * A banked hearth, low and red and barely breathing, and beside it the wait
 * itself as a strip of cells running from when it was hit to when it lifts:
 * what is behind is spent coals, the front is the one cell still glowing, and
 * what is ahead sits cold until the front reaches it. How long is left is set
 * large beside it, the way the packing strip sets its percentage, and when it
 * lifts the whole strip stands up green. A wait with no end Claude would name
 * keeps the hearth and drops the strip, since there is nothing to measure.
 */

const CELLS = 40;
const TALL = 14;
const COLD = 'rgba(150,160,190,.26)';
const SPENT = '#6a3a1c';
const FRONT = '#ff8a5a';
const LIFTED = '#a8c469';

const BIG = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:17px',
  'letter-spacing:.04em',
  'white-space:nowrap',
  'text-shadow:1px 1px 0 #120d07',
  'font-variant-numeric:tabular-nums',
].join(';');

const META = [
  "font-family:'Courier Prime',monospace",
  'font-size:12px',
  'color:#bfa476',
  'text-shadow:1px 1px 0 #120d07',
  'white-space:nowrap',
].join(';');

export interface WaitDoings {
  press(what: string): void;
}

/** The whole of it, for the foot of the middle column. */
export function waitOut(failure: FailureView, does: WaitDoings): HTMLElement {
  const it = document.createElement('div');
  it.dataset.key = 'failure';
  it.dataset.wait = '';
  it.style.cssText = 'display:flex;gap:22px;align-items:flex-start;padding:10px 0 6px';

  it.appendChild(hearth());

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;flex-direction:column;gap:10px;flex:1;min-width:0';
  it.appendChild(right);

  const words = document.createElement('div');
  words.style.cssText = 'font-size:21px;line-height:1.4;letter-spacing:.01em;color:#ebe3d3';
  right.appendChild(words);

  const reset = failure.resetAt;
  const since = failure.since ?? Date.now();
  let row: HTMLElement | undefined;
  const cells: HTMLElement[] = [];
  const big = document.createElement('span');
  big.style.cssText = BIG;
  if (reset !== undefined) {
    row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:14px;max-width:520px';
    const strip = document.createElement('div');
    strip.style.cssText = `position:relative;flex:1;min-width:0;height:${TALL}px;display:flex;align-items:flex-end;gap:2px`;
    for (let i = 0; i < CELLS; i += 1) {
      const cell = document.createElement('div');
      cell.style.cssText = `flex:1;min-width:2px;height:${TALL}px;transition:height 480ms steps(4,end),background-color 480ms steps(4,end)`;
      strip.appendChild(cell);
      cells.push(cell);
    }
    row.appendChild(strip);
    row.appendChild(big);
    right.appendChild(row);
  }

  const meta = document.createElement('span');
  meta.style.cssText = META;
  right.appendChild(meta);

  const actions = document.createElement('div');
  actions.style.cssText =
    "display:flex;gap:18px;flex-wrap:wrap;font-family:'Josefin Sans',sans-serif;font-size:14px;margin-top:2px";
  right.appendChild(actions);

  let lifted: boolean | undefined;

  function draw(): void {
    const now = Date.now();
    const done = reset !== undefined && reset <= now;
    words.textContent = headline(failure, done);

    if (reset !== undefined) {
      const span = Math.max(1, reset - since);
      const part = Math.min(1, Math.max(0, (now - since) / span));
      const front = Math.min(CELLS - 1, Math.floor(part * CELLS));
      cells.forEach((cell, i) => {
        cell.style.boxShadow = '';
        cell.style.animation = '';
        if (done) {
          cell.style.height = `${TALL}px`;
          cell.style.background = LIFTED;
        } else if (i < front) {
          cell.style.height = '4px';
          cell.style.background = SPENT;
        } else if (i === front) {
          cell.style.height = `${TALL}px`;
          cell.style.background = FRONT;
          cell.style.boxShadow = '0 0 10px rgba(255,110,70,.8)';
          cell.style.animation = 'yard-banked 2.6s ease-in-out infinite';
        } else {
          cell.style.height = `${TALL}px`;
          cell.style.background = COLD;
        }
      });
      big.style.color = done ? LIFTED : FRONT;
      big.textContent = done ? 'now' : leftFor(reset - now);
    }

    const parts: string[] = [];
    if (failure.since !== undefined) parts.push(`hit ${clockOf(failure.since)}`);
    if (failure.carryOnAt !== undefined) parts.push(`carries on by itself ${clockOf(failure.carryOnAt)}`);
    else if (reset !== undefined) parts.push(`${done ? 'lifted' : 'lifts'} ${clockOf(reset)}`);
    else if (failure.kind === 'limit') parts.push("Claude didn't say when it lifts");
    meta.textContent = parts.join(' · ');
    meta.style.display = meta.textContent ? '' : 'none';

    if (lifted !== done) {
      lifted = done;
      lay(done);
    }
  }

  function lay(done: boolean): void {
    actions.replaceChildren();
    const armed = failure.carryOnAt !== undefined;
    if (armed) {
      actions.appendChild(
        astop(
          pressing("don't carry on by itself", () => does.press('failure:cancel')),
          'failure:carryon'
        )
      );
    } else if (failure.canCarryOn && !done) {
      actions.appendChild(
        astop(
          pressing(`carry on by itself at ${clockOf(reset!)}`, () =>
            does.press('failure:carryon')
          ),
          'failure:carryon'
        )
      );
    }
    if (done || failure.canRetry || reset === undefined) {
      actions.appendChild(
        astop(
          pressing(done ? 'carry on now' : 'try again now', () => does.press('failure:retry')),
          'failure:retry'
        )
      );
    }
    actions.appendChild(
      astop(
        twice('start over', 'this conversation is gone for good', {
          while: 'starting over',
          run: async () => {
            does.press('failure:new');
            return { said: 'started over.' };
          },
        }),
        'failure:new'
      )
    );
  }

  drawers.set(it, draw);
  draw();
  ticking();
  return it;
}

function headline(failure: FailureView, done: boolean): string {
  if (failure.kind === 'service') {
    return done ? 'The other end should be back' : 'The other end is having a rough patch';
  }
  if (failure.kind === 'connection') return 'Lost the line to the agent';
  if (done) return failure.carryOnAt !== undefined ? 'The limit lifted, carrying on' : 'The limit has lifted';
  return 'Out of usage';
}

/** The banked hearth: the fire, low and red, with the odd spark still going up. */
function hearth(): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'position:relative;width:64px;height:64px;flex:none;margin-top:4px';
  const glow = document.createElement('div');
  glow.style.cssText =
    'position:absolute;left:-28px;top:-30px;width:120px;height:120px;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(242,102,90,.42),rgba(0,0,0,0) 60%);animation:yard-banked 3.2s ease-in-out infinite';
  it.appendChild(glow);
  const fire = sprite(KIT_NAMES.fire, 2);
  fire.style.cssText +=
    ';left:0;top:0;filter:saturate(1.3) brightness(.9) hue-rotate(-16deg);animation:yard-banked 3.2s ease-in-out infinite';
  it.appendChild(fire);
  for (let i = 0; i < 3; i += 1) {
    const spark = document.createElement('div');
    spark.style.cssText = `position:absolute;left:${24 + i * 7}px;top:22px;width:2px;height:2px;opacity:0;background:${i % 2 ? '#ff8a5a' : '#c95a3a'};animation:yard-spark ${3200 + i * 900}ms linear ${i * 1400}ms infinite`;
    it.appendChild(spark);
  }
  return it;
}

/** How long is left, short and large: `2h 41m`, `12m`, `40s`. */
function leftFor(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 1) return `${Math.max(1, Math.ceil(ms / 1000))}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return longFor(ms).split(' ').slice(0, 2).join(' ');
}

function clockOf(at: number): string {
  const when = new Date(at);
  const clock = when
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s+/g, '');
  if (Math.abs(at - Date.now()) < 20 * 3_600_000) return clock;
  return `${when.toLocaleDateString([], { weekday: 'short' }).toLowerCase()} ${clock}`;
}

const drawers = new WeakMap<HTMLElement, () => void>();
let timer: number | undefined;

/** Keeps every wait on the board counting, and stops when none is. */
function ticking(): void {
  if (timer !== undefined) return;
  timer = window.setInterval(() => {
    const live = document.querySelectorAll<HTMLElement>('[data-wait]');
    if (!live.length) {
      window.clearInterval(timer);
      timer = undefined;
      return;
    }
    if (!document.hasFocus()) return;
    for (const el of live) drawers.get(el)?.();
  }, 1000);
}
