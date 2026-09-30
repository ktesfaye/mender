import type { Pack } from '@shared/agents';
import { packedBy } from '@shared/packing';
import { longFor } from './from';

/**
 * The conversation being packed down, drawn as the room it takes.
 *
 * A strip of cells is everything it was holding in mind. While it packs, a hot front crosses what it was
 * holding and presses each cell flat behind it, sparks going up off the front;
 * once it has, what is left stands up green and what it let go of lies flat.
 * Claude says nothing while it works, so how far the front has got is its
 * clock against how long one usually takes here, said as such underneath.
 */

const CELLS = 48;
const TALL = 16;

const WARM = '#ffc98a';
const DONE = '#a8c469';

/** When the board first saw a packing it had no clock for, so it can still count. */
const firstSeen = new Map<string, number>();

function beganOf(id: string, pack: Pack): number {
  if (pack.began) return pack.began;
  const seen = firstSeen.get(id) ?? Date.now();
  firstSeen.set(id, seen);
  return seen;
}

/** A count of tokens, short: `850`, `45k`, `1.3m`. */
function short(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
}

/** How many of the strip's cells a number of tokens fills, never none. */
function cellsOf(tokens: number | undefined, size: number | undefined, fallback: number): number {
  if (!tokens || !size) return fallback;
  return Math.max(1, Math.min(CELLS, Math.round((tokens / size) * CELLS)));
}

const BIG = [
  "font-family:'Josefin Sans',sans-serif",
  'font-size:15px',
  'letter-spacing:.06em',
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

/** The words over the strip, set as large as an answer would be. */
function title(pack: Pack): string {
  if (pack.state === 'packing') return 'Packing the conversation down to make room';
  return 'Packed the conversation down';
}

/** The whole of it, for the live edge of the middle column. */
export function packed(id: string, pack: Pack): HTMLElement {
  const it = document.createElement('div');
  it.style.cssText = 'display:flex;flex-direction:column;gap:12px';
  it.dataset.pack = pack.state;

  const words = document.createElement('div');
  words.style.cssText = 'font-size:21px;line-height:1.5;letter-spacing:.01em;color:#ebe3d3';
  words.textContent = title(pack);
  it.appendChild(words);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:flex-end;gap:14px;max-width:520px';
  const strip = document.createElement('div');
  strip.style.cssText = `position:relative;flex:1;min-width:0;height:${TALL}px;display:flex;align-items:flex-end;gap:2px`;
  const cells: HTMLElement[] = [];
  for (let i = 0; i < CELLS; i += 1) {
    const cell = document.createElement('div');
    cell.style.cssText = `flex:1;min-width:2px;height:${TALL}px;transition:height 480ms steps(4,end),background-color 480ms steps(4,end)`;
    strip.appendChild(cell);
    cells.push(cell);
  }
  /* Sparks off the front, each on its own clock so they never rise in step. */
  const sparks: HTMLElement[] = [];
  if (pack.state === 'packing') {
    for (let i = 0; i < 4; i += 1) {
      const spark = document.createElement('div');
      spark.style.cssText = `position:absolute;bottom:${TALL - 4}px;width:2px;height:2px;opacity:0;background:${i % 2 ? WARM : '#ff8a4a'};animation:yard-spark ${1300 + i * 260}ms linear ${i * 330}ms infinite;pointer-events:none;transition:left 480ms steps(4,end)`;
      strip.appendChild(spark);
      sparks.push(spark);
    }
  }
  row.appendChild(strip);
  const big = document.createElement('span');
  big.style.cssText = `${BIG};color:${pack.state === 'packing' ? WARM : DONE}`;
  row.appendChild(big);
  it.appendChild(row);

  const meta = document.createElement('span');
  meta.style.cssText = META;
  it.appendChild(meta);

  const began = beganOf(id, pack);
  /* The whole strip is what it was holding, however much of the room that
     was: the thing being packed is the conversation, not the empty room. */
  const from = CELLS;

  function draw(): void {
    if (pack.state === 'packing') {
      const elapsed = Date.now() - began;
      const done = packedBy(elapsed, pack.expect);
      const front = Math.min(from - 1, Math.floor(done * from));
      cells.forEach((cell, i) => {
        cell.style.boxShadow = '';
        cell.style.animation = '';
        if (i < front) {
          cell.style.height = '3px';
          cell.style.background = '#7a4a22';
        } else if (i === front) {
          cell.style.height = `${TALL}px`;
          cell.style.background = WARM;
          cell.style.boxShadow = '0 0 10px rgba(255,168,60,.85)';
          cell.style.animation = 'yard-flicker 480ms steps(2,end) infinite alternate';
        } else {
          cell.style.height = `${TALL}px`;
          cell.style.background = 'rgba(235,227,211,.5)';
          /* A slow ripple running toward the front, so what is still to be
             packed reads as waiting for it rather than sitting dead. */
          cell.style.animation = `yard-pack-wait 1.8s ease-in-out ${-((from - i) * 0.09)}s infinite`;
        }
      });
      const at = cells[front];
      if (at) {
        const left = at.offsetLeft + at.offsetWidth / 2 - 1;
        sparks.forEach((spark, n) => (spark.style.left = `${left + (n % 2 ? 2 : -2)}px`));
      }
      big.textContent = `${Math.round(done * 100)}%`;
      meta.textContent =
        elapsed > pack.expect * 1.25
          ? `${longFor(elapsed)} in · longer than it usually takes`
          : `${longFor(elapsed)} in · usually about ${longFor(pack.expect).replace(/ 0s$/, '')}`;
      return;
    }
    const left = pack.to !== undefined ? cellsOf(pack.to, pack.from, 1) : 1;
    const fresh = pack.ended ? Date.now() - pack.ended : Infinity;
    cells.forEach((cell, i) => {
      cell.style.boxShadow = '';
      if (i < left) {
        cell.style.height = `${TALL}px`;
        cell.style.background = DONE;
        /* Standing back up, once, anchored to when it finished so the board
           being redrawn under it never plays it again. */
        if (fresh < 1600)
          cell.style.animation = `yard-pack-rise 520ms steps(4,end) ${i * 40 - fresh}ms both`;
      } else {
        cell.style.height = '2px';
        cell.style.background = 'rgba(168,196,105,.28)';
      }
    });
    big.textContent =
      pack.from && pack.to !== undefined ? `${short(pack.from)} → ${short(pack.to)}` : '';
    const took = pack.began && pack.ended ? `took ${longFor(pack.ended - pack.began)}` : '';
    const now =
      pack.to !== undefined && pack.size
        ? `now ${Math.max(1, Math.round((pack.to / pack.size) * 100))}% full`
        : '';
    meta.textContent = [took, now].filter(Boolean).join(' · ');
    meta.style.display = meta.textContent ? '' : 'none';
  }

  drawers.set(it, draw);
  /* Drawn once it is on the board, so the front knows where its cell is. */
  requestAnimationFrame(draw);
  draw();
  if (pack.state === 'packing') ticking();
  return it;
}

const drawers = new WeakMap<HTMLElement, () => void>();
let timer: number | undefined;

/** Keeps every packing on the board moving while any is, and stops when none is. */
function ticking(): void {
  if (timer !== undefined) return;
  timer = window.setInterval(() => {
    const live = document.querySelectorAll<HTMLElement>('[data-pack="packing"]');
    if (!live.length) {
      window.clearInterval(timer);
      timer = undefined;
      return;
    }
    for (const el of live) drawers.get(el)?.();
  }, 250);
}
