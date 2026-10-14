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

  const fire = hearth();
  it.appendChild(fire);

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;flex-direction:column;gap:10px;flex:1;min-width:0';
  it.appendChild(right);

  const words = document.createElement('div');
  words.style.cssText = 'font-size:21px;line-height:1.4;letter-spacing:.01em;color:#ebe3d3';
  right.appendChild(words);

  const reset = failure.resetAt;
  const since = failure.since ?? Date.now();
  /* What the count runs to: the moment it actually goes again when that is
     armed, or the moment the limit lifts when it is not. */
  const goes = failure.carryOnAt ?? reset;
  const cells: HTMLElement[] = [];
  const glows: HTMLElement[] = [];
  const sparks: HTMLElement[] = [];
  const big = document.createElement('span');
  big.style.cssText = BIG;
  let goal: HTMLElement | undefined;
  if (reset !== undefined) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-end;gap:14px;max-width:560px';
    const strip = document.createElement('div');
    strip.style.cssText = `position:relative;flex:1;min-width:0;height:${TALL}px;display:flex;align-items:flex-end;gap:2px`;
    for (let i = 0; i < CELLS; i += 1) {
      const cell = document.createElement('div');
      cell.style.cssText = `position:relative;flex:1;min-width:2px;height:${TALL}px;transition:height 600ms steps(4,end),background-color 600ms steps(4,end)`;
      /* The front fills from the bottom as the minutes go, so the strip is
         seen moving within a cell and not only once a cell is spent. */
      const glow = document.createElement('div');
      glow.style.cssText = `position:absolute;left:0;right:0;bottom:0;height:0;background:${FRONT};transition:height 900ms steps(6,end)`;
      cell.appendChild(glow);
      strip.appendChild(cell);
      cells.push(cell);
      glows.push(glow);
    }
    /* Embers lifting off the front, each on its own clock. */
    for (let i = 0; i < 4; i += 1) {
      const spark = document.createElement('div');
      spark.style.cssText = `position:absolute;bottom:${TALL - 3}px;width:2px;height:2px;opacity:0;pointer-events:none;background:${i % 2 ? '#ffb07a' : FRONT};animation:yard-spark ${1500 + i * 380}ms linear ${i * 420}ms infinite;transition:left 900ms steps(6,end)`;
      strip.appendChild(spark);
      sparks.push(spark);
    }
    /* Where it picks back up: a small gold post at the far end, only when it
       will, since a post nobody is walking to is a promise. */
    if (failure.carryOnAt !== undefined) {
      goal = document.createElement('div');
      goal.style.cssText = `position:absolute;right:-6px;bottom:-3px;width:3px;height:${TALL + 8}px;background:#e8c070;box-shadow:0 0 6px rgba(232,192,112,.7);animation:yard-banked 2s ease-in-out infinite`;
      strip.appendChild(goal);
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
    const going = done && failure.carryOnAt !== undefined && failure.carryOnAt > now;
    words.textContent = headline(failure, done);
    /* Lifted, the fire catches again. */
    fire.dataset.lifted = done ? 'yes' : '';

    if (reset !== undefined) {
      const span = Math.max(1, reset - since);
      const part = Math.min(1, Math.max(0, (now - since) / span));
      const exact = part * CELLS;
      const front = Math.min(CELLS - 1, Math.floor(exact));
      const within = exact - front;
      cells.forEach((cell, i) => {
        const glow = glows[i]!;
        let tone = COLD;
        let tall = TALL;
        let fill = 0;
        let shadow = '';
        let motion = '';
        if (done) {
          tone = LIFTED;
          motion = going ? `yard-pack-wait 1.2s ease-in-out ${-i * 0.04}s infinite` : '';
        } else if (i < front) {
          /* Spent coals, the ones just behind the front still warm. */
          const behind = front - i;
          tone = behind === 1 ? '#a8502c' : behind === 2 ? '#86422a' : SPENT;
          tall = behind <= 2 ? 6 : 4;
        } else if (i === front) {
          tone = 'rgba(255,138,90,.28)';
          fill = Math.max(0.15, within);
          shadow = '0 0 12px rgba(255,110,70,.85)';
          motion = 'yard-banked 2.6s ease-in-out infinite';
        } else {
          /* Still to wait, with a slow shimmer running down toward the front. */
          motion = `yard-pack-wait 3.2s ease-in-out ${-((CELLS - i) * 0.12)}s infinite`;
        }
        if (cell.style.background !== tone) cell.style.background = tone;
        cell.style.height = `${tall}px`;
        cell.style.boxShadow = shadow;
        if (cell.style.animation !== motion) cell.style.animation = motion;
        glow.style.height = `${Math.round(fill * TALL)}px`;
      });
      const at = cells[front];
      sparks.forEach((spark, n) => {
        spark.style.display = done ? 'none' : '';
        if (at) spark.style.left = `${at.offsetLeft + at.offsetWidth / 2 - 1 + (n % 2 ? 2 : -2)}px`;
      });
      if (goal) goal.style.background = done ? LIFTED : '#e8c070';
      big.style.color = done ? LIFTED : FRONT;
      big.textContent =
        goes !== undefined && goes > now
          ? leftFor(goes - now)
          : done
            ? 'now'
            : leftFor(reset - now);
    }

    const parts: string[] = [];
    const limit = failure.kind === 'limit';
    if (failure.since !== undefined)
      parts.push(`${limit ? 'hit' : 'since'} ${clockOf(failure.since)}`);
    if (going) parts.push('carrying on');
    else if (failure.untilOnline) parts.push("carries on by itself once you're back online");
    else if (failure.carryOnAt !== undefined)
      parts.push(
        `${limit ? 'carries on' : 'tries again'} by itself at ${clockOf(failure.carryOnAt)}`
      );
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
    const armed = failure.carryOnAt !== undefined || !!failure.untilOnline;
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
          pressing(`carry on by itself at ${clockOf(reset!)}`, () => does.press('failure:carryon')),
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
    return done ? "Claude's servers should be back" : "Claude's servers are having a rough patch";
  }
  if (failure.kind === 'connection') return "Can't reach Claude. The internet looks to be down";
  if (done)
    return failure.carryOnAt !== undefined
      ? 'The limit lifted, carrying on'
      : 'The limit has lifted';
  return 'Out of usage';
}

/** The banked hearth: the fire, low and red, with the odd spark still going up. */
function hearth(): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'position:relative;width:80px;height:64px;flex:none;margin-top:4px';
  const glow = document.createElement('div');
  glow.style.cssText =
    'position:absolute;left:-28px;top:-30px;width:120px;height:120px;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(242,102,90,.42),rgba(0,0,0,0) 60%);animation:yard-banked 3.2s ease-in-out infinite';
  it.appendChild(glow);
  const fire = sprite(KIT_NAMES.fire, 2);
  fire.classList.add('banked-fire');
  fire.style.cssText +=
    ';left:0;top:0;filter:saturate(1.3) brightness(.9) hue-rotate(-16deg);animation:yard-banked 3.2s ease-in-out infinite';
  it.appendChild(fire);
  /* Coals catching and dimming under the ash, each on its own clock. */
  for (let i = 0; i < 3; i += 1) {
    const coal = document.createElement('div');
    coal.style.cssText = `position:absolute;left:${22 + i * 8}px;top:${38 - (i % 2) * 4}px;width:4px;height:4px;background:#ff7a4a;box-shadow:0 0 6px #ff6a3a;opacity:.2;animation:yard-banked ${1700 + i * 650}ms ease-in-out ${i * 500}ms infinite`;
    it.appendChild(coal);
  }
  for (let i = 0; i < 3; i += 1) {
    const spark = document.createElement('div');
    spark.style.cssText = `position:absolute;left:${24 + i * 7}px;top:22px;width:2px;height:2px;opacity:0;background:${i % 2 ? '#ff8a5a' : '#c95a3a'};animation:yard-spark ${2600 + i * 700}ms linear ${i * 1100}ms infinite`;
    it.appendChild(spark);
  }
  /* And a thread of smoke, which is what a banked fire mostly makes. */
  for (let i = 0; i < 2; i += 1) {
    const smoke = document.createElement('div');
    smoke.style.cssText = `position:absolute;left:${28 + i * 6}px;top:14px;width:4px;height:4px;opacity:0;background:rgba(170,160,150,.45);animation:yard-smoke ${4200 + i * 1500}ms ease-out ${i * 2100}ms infinite`;
    it.appendChild(smoke);
  }
  return it;
}

/** How long is left, ticking: `16h 51m 03s`, `42m 07s`, `9s`. */
function leftFor(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n: number): string => String(n).padStart(2, '0');
  if (days) return `${days}d ${hours}h ${two(minutes)}m`;
  if (hours) return `${hours}h ${two(minutes)}m ${two(seconds)}s`;
  if (minutes) return `${minutes}m ${two(seconds)}s`;
  return `${seconds}s`;
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
