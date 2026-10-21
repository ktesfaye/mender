import { glaze } from '../glass/glass';
import '../glass/asks.css';
import { px } from '../glass/px';
import { pressing, twice } from './press';
import { KIT_NAMES, sprite } from './sprite';
import { astop } from './walk';
import type { FailureView } from './what';

/**
 * The fire banked on a limit, drawn as the wait it is.
 *
 * One pane of lantern glass: the banked hearth, how long is left set large
 * beside it, and the wait itself as a strip of cells running from when it was
 * hit to when it lifts. What is behind is spent coals, the front is the one
 * cell still glowing, and what is ahead sits cold until the front reaches it.
 * Under it are the ways on, each a tile of its own. A wait with no end Claude
 * would name keeps the hearth and drops the strip, since there is nothing to
 * measure.
 */

const CELLS = 48;
const TALL = 18;
const COLD = 'rgba(255,240,215,.1)';
const SPENT = 'rgba(240,138,114,.42)';
const LIFTED = 'rgba(155,210,138,.55)';

export interface WaitDoings {
  press(what: string): void;
}

/** A way on, as a tile: the press inside it does the work and the tile is only
 *  a larger place to put a finger. */
function tile(
  sign: string,
  tone: string,
  kind: string,
  press: HTMLElement,
  about: string
): HTMLElement {
  const it = document.createElement('div');
  it.className = `gl-tile ${kind}`;
  const icon = document.createElement('div');
  icon.className = 'gl-ic';
  icon.appendChild(px(sign, tone, 17));
  const tx = document.createElement('div');
  tx.className = 'gl-tx';
  tx.appendChild(press);
  const d = document.createElement('span');
  d.textContent = about;
  tx.appendChild(d);
  it.append(icon, tx);
  it.addEventListener('mousedown', (event) => event.preventDefault());
  it.addEventListener('click', (event) => {
    if (event.target !== press) press.click();
  });
  return it;
}

/** The whole of it, for the foot of the middle column. */
export function waitOut(failure: FailureView, does: WaitDoings): HTMLElement {
  const it = glaze(document.createElement('div'), {
    tint: 'rgba(14, 15, 18, 0.5)',
    blur: 24,
    thick: 26,
  });
  it.classList.add('gl');
  it.dataset.key = 'failure';
  it.dataset.wait = '';

  const head = document.createElement('div');
  head.className = 'gl-head';
  const tagEl = document.createElement('span');
  tagEl.className = 'ga-tag sore';
  const tagText = document.createElement('span');
  tagText.className = 'g-pix';
  tagEl.appendChild(tagText);
  head.appendChild(tagEl);
  it.appendChild(head);

  const reset = failure.resetAt;
  const since = failure.since ?? Date.now();
  /* What the count runs to: the moment it actually goes again when that is
     armed, or the moment the limit lifts when it is not. */
  const goes = failure.carryOnAt ?? reset;

  const body = document.createElement('div');
  body.className = 'gl-body';
  it.appendChild(body);
  const fire = document.createElement('div');
  fire.className = 'gl-fire';
  fire.appendChild(hearth());
  body.appendChild(fire);
  const right = document.createElement('div');
  body.appendChild(right);
  const big = document.createElement('div');
  big.className = 'gl-cd';
  const unit = document.createElement('small');
  const num = document.createElement('span');
  big.append(num, unit);
  const words = document.createElement('div');
  words.className = 'gl-cap';
  right.append(big, words);

  const cells: HTMLElement[] = [];
  const glows: HTMLElement[] = [];
  const labels: HTMLElement[] = [];
  let flag: HTMLElement | undefined;
  if (reset !== undefined) {
    const strip = document.createElement('div');
    strip.className = 'gl-strip';
    if (failure.carryOnAt !== undefined || failure.untilOnline) {
      flag = document.createElement('span');
      flag.className = 'gl-flag';
      flag.appendChild(px('bell', '#9bd28a', 14));
      strip.appendChild(flag);
    }
    const row = document.createElement('div');
    row.className = 'gl-cells';
    for (let i = 0; i < CELLS; i += 1) {
      const cell = document.createElement('i');
      /* The front fills from the bottom as the minutes go, so the strip is
         seen moving within a cell and not only once a cell is spent. */
      const glow = document.createElement('b');
      cell.appendChild(glow);
      row.appendChild(cell);
      cells.push(cell);
      glows.push(glow);
    }
    strip.appendChild(row);
    const lab = document.createElement('div');
    lab.className = 'gl-lab';
    for (let i = 0; i < 3; i += 1) {
      const l = document.createElement('span');
      lab.appendChild(l);
      labels.push(l);
    }
    strip.appendChild(lab);
    it.appendChild(strip);
  }

  const meta = document.createElement('div');
  meta.className = 'gl-meta';
  it.appendChild(meta);

  const tiles = document.createElement('div');
  tiles.className = 'gl-tiles';
  it.appendChild(tiles);

  let lifted: boolean | undefined;

  function draw(): void {
    const now = Date.now();
    const done = reset !== undefined && reset <= now;
    const going = done && failure.carryOnAt !== undefined && failure.carryOnAt > now;
    const armed = failure.carryOnAt !== undefined || !!failure.untilOnline;
    const limit = failure.kind === 'limit';
    words.textContent = headline(failure, done);
    /* Lifted, the fire catches again. */
    fire.dataset.lifted = done ? 'yes' : '';
    tagEl.className = `ga-tag ${armed ? 'moss' : 'sore'}`;
    tagEl.replaceChildren(
      px(armed ? 'check' : 'hourglass', 'currentColor', 11),
      Object.assign(tagText, {
        textContent: armed
          ? failure.carryOnAt !== undefined
            ? `armed · carries on at ${clockOf(failure.carryOnAt)}`
            : 'armed · carries on once you are back online'
          : limit
            ? 'out of usage'
            : failure.kind === 'connection'
              ? 'no connection'
              : 'trouble at the other end',
      })
    );

    if (reset !== undefined) {
      const span = Math.max(1, reset - since);
      const part = Math.min(1, Math.max(0, (now - since) / span));
      const exact = part * CELLS;
      const front = Math.min(CELLS - 1, Math.floor(exact));
      const within = exact - front;
      cells.forEach((cell, i) => {
        const glow = glows[i]!;
        let tone = COLD;
        let fill = 0;
        let shadow = '';
        let motion = '';
        if (done) {
          tone = LIFTED;
          motion = going ? `yard-pack-wait 1.2s ease-in-out ${-i * 0.04}s infinite` : '';
        } else if (i < front) {
          tone = SPENT;
        } else if (i === front) {
          tone = 'rgba(255,154,74,.3)';
          fill = Math.max(0.15, within);
          shadow = '0 0 14px 3px rgba(255,154,74,.6)';
          motion = 'yard-banked 2.6s ease-in-out infinite';
        }
        if (cell.style.background !== tone) cell.style.background = tone;
        cell.style.boxShadow = shadow;
        if (cell.style.animation !== motion) cell.style.animation = motion;
        glow.style.height = `${Math.round(fill * TALL)}px`;
      });
      labels[0]!.textContent = `${limit ? 'hit' : 'since'} ${clockOf(since)}`;
      labels[1]!.textContent = done ? '' : `now ${clockOf(now)}`;
      labels[2]!.textContent = `${done ? 'lifted' : 'lifts'} ${clockOf(reset)}`;
      big.style.color = done ? '#cfeac4' : '#ffb49a';
      if (goes !== undefined && goes > now) {
        num.textContent = leftFor(goes - now);
        unit.textContent =
          failure.carryOnAt !== undefined ? 'until it carries on' : 'until it lifts';
      } else {
        num.textContent = done ? 'now' : leftFor(reset - now);
        unit.textContent = done ? '' : 'until it lifts';
      }
    } else {
      big.style.display = 'none';
      words.classList.add('gl-lone');
    }

    const parts: string[] = [];
    if (reset === undefined && failure.since !== undefined)
      parts.push(`${limit ? 'hit' : 'since'} ${clockOf(failure.since)}`);
    if (going) parts.push('carrying on');
    else if (failure.untilOnline) parts.push("carries on by itself once you're back online");
    else if (failure.carryOnAt !== undefined)
      parts.push(
        `${limit ? 'carries on' : 'tries again'} by itself at ${clockOf(failure.carryOnAt)}`
      );
    else if (reset === undefined && limit) parts.push("Claude didn't say when it lifts");
    meta.textContent = parts.join(' · ');
    meta.style.display = meta.textContent ? '' : 'none';

    if (flag) flag.style.right = '-4px';

    if (lifted !== done) {
      lifted = done;
      lay(done);
    }
  }

  function lay(done: boolean): void {
    tiles.replaceChildren();
    const armed = failure.carryOnAt !== undefined || !!failure.untilOnline;
    const offered = done || failure.canRetry || reset === undefined;
    if (offered) {
      tiles.appendChild(
        tile(
          'redo',
          '#f2c66d',
          'hot',
          astop(
            pressing(done ? 'carry on now' : 'try again now', () => does.press('failure:retry')),
            'failure:retry'
          ),
          done ? 'it picks up where it stopped' : 'sends it again straight away'
        )
      );
    } else {
      tiles.appendChild(
        tile(
          'redo',
          '#8b8478',
          'dim',
          Object.assign(document.createElement('span'), { textContent: 'try again now' }),
          'would only hit the limit again'
        )
      );
    }
    if (armed) {
      const t = tile(
        'check',
        '#9bd28a',
        'arm',
        Object.assign(document.createElement('span'), {
          className: 'gl-fix',
          textContent: 'carrying on by itself',
        }),
        failure.carryOnAt !== undefined
          ? `at ${clockOf(failure.carryOnAt)} it is told to carry on, and does`
          : "once you're back online it carries on"
      );
      const off = astop(
        pressing("don't carry on by itself", () => does.press('failure:cancel')),
        'failure:carryon'
      );
      off.classList.add('gl-sub');
      t.querySelector('.gl-tx')!.appendChild(off);
      t.addEventListener('click', (event) => {
        if (event.target !== off) off.click();
      });
      tiles.appendChild(t);
    } else if (failure.canCarryOn && !done) {
      tiles.appendChild(
        tile(
          'hourglass',
          '#f2c66d',
          'hot',
          astop(
            pressing('carry on when it lifts', () => does.press('failure:carryon')),
            'failure:carryon'
          ),
          `tells it to carry on, by itself, at ${clockOf(reset!)}`
        )
      );
    }
    tiles.appendChild(
      tile(
        'back',
        '#f08a72',
        'bad',
        astop(
          twice('start over', 'this conversation is gone for good', {
            while: 'starting over',
            run: async () => {
              does.press('failure:new');
              return { said: 'started over.' };
            },
          }),
          'failure:new'
        ),
        'the conversation is what it costs'
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
