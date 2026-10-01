import { HOURS, type Sky, type SkyChoice, type WeatherKind } from './sky';

/**
 * The sky, taken in hand.
 *
 * A right-click on the water offers it beside rearranging the districts. Not a
 * list of words: the hour is a slider whose track is the island's own light
 * across the day, from the low sun coming up on the left to the moon on the
 * right, and dragging it moves the light on the island as you go. The weather
 * is a row of the kit's kind of pixel pictures, the one in force set in a
 * frame. How much of whatever is falling is a second slider, a few drops to a
 * downpour. "Outside" puts either half back to the real one where he is.
 *
 * Everything happens to the island straight away, eased the way the sky always
 * is, and the panel stays up so the next thing can be tried against it.
 */

/** The hour slider runs from first light to past midnight, where night is night. */
const FIRST = 4.5;
const LAST = 24.5;

const WEATHER: { kind: WeatherKind; name: string; icon: string }[] = [
  { kind: 'clear', name: 'clear', icon: 'sun' },
  { kind: 'cloudy', name: 'cloudy', icon: 'cloud' },
  { kind: 'rain', name: 'rain', icon: 'rain' },
  { kind: 'storm', name: 'storm', icon: 'storm' },
  { kind: 'snow', name: 'snow', icon: 'snow' },
  { kind: 'fog', name: 'fog', icon: 'fog' },
];

/* Pixel pictures, one character a pixel, drawn in the kit's own manner: a
   dark outline where it helps, flat colour, nothing smoothed. */
const PALETTE: Record<string, string> = {
  k: '#2a1a0e',
  y: '#ffd35a',
  Y: '#fff1a8',
  o: '#f39a3a',
  w: '#f4ecdc',
  W: '#ffffff',
  g: '#b9b3a8',
  G: '#8d877f',
  d: '#5f5a63',
  b: '#6fb4e8',
  B: '#3f86c6',
  m: '#e9e2c8',
  h: '#6a8f3a',
  s: '#dbe9f6',
};

const ICONS: Record<string, string[]> = {
  sun: [
    '....y....',
    '.y..y..y.',
    '..yyyyy..',
    '..yYYYy..',
    'yyyYYYyyy',
    '..yYYYy..',
    '..yyyyy..',
    '.y..y..y.',
    '....y....',
  ],
  rise: [
    '.........',
    '.o..o..o.',
    '...ooo...',
    '..ooyoo..',
    '.ooyyyoo.',
    'ooyyYyyoo',
    'hhhhhhhhh',
    '.hhhhhhh.',
    '.........',
  ],
  moon: [
    '...mmm...',
    '..mmm....',
    '.mmm.....',
    '.mmm...m.',
    '.mmm.....',
    '.mmmm....',
    '..mmmmmm.',
    '...mmmm..',
    '.m.......',
  ],
  cloud: [
    '.........',
    '...www...',
    '..wWWWw..',
    '.wwWWWwww',
    'wWWWWWWWw',
    'wwwwwwwww',
    '.ggggggg.',
    '.........',
    '.........',
  ],
  rain: [
    '...ggg...',
    '..gwwwg..',
    '.gwwwwwgg',
    'gwwwwwwwg',
    '.ggggggg.',
    '..b..b..b',
    '.b..b..b.',
    'b..b..b..',
    '.........',
  ],
  storm: [
    '...ddd...',
    '..dGGGd..',
    '.dGGGGGdd',
    'dGGGGGGGd',
    '.ddyyddd.',
    '..yy..b..',
    '.yyyy.b..',
    '...yy..b.',
    '...y.....',
  ],
  snow: [
    '....s....',
    '.s..s..s.',
    '..s.W.s..',
    '...WWW...',
    'ssWWWWWss',
    '...WWW...',
    '..s.W.s..',
    '.s..s..s.',
    '....s....',
  ],
  fog: [
    '.........',
    '.gggggg..',
    '.........',
    '...ggggggg',
    '.........',
    'gggggg...',
    '.........',
    '..ggggggg',
    '.........',
  ],
  outside: [
    '..kkkkk..',
    '.k.....k.',
    'k...k...k',
    'k...k...k',
    'k...kkk.k',
    'k.......k',
    '.k.....k.',
    '..kkkkk..',
    '.........',
  ],
  few: [
    '.........',
    '.........',
    '..b......',
    '.........',
    '.....b...',
    '.........',
    '.b.......',
    '.........',
    '.........',
  ],
  many: [
    'b..b..b..',
    '.b..b..b.',
    '..b..b..b',
    'b..b..b..',
    '.b..b..b.',
    '..b..b..b',
    'b..b..b..',
    '.b..b..b.',
    '..b..b..b',
  ],
};

/** A pixel picture as crisp SVG, every pixel a square. */
function icon(name: string, size: number, tint?: string): SVGSVGElement {
  const rows = ICONS[name] ?? [];
  const w = Math.max(...rows.map((row) => row.length));
  const h = rows.length;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String((size * h) / w));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.classList.add('sky-icon');
  rows.forEach((row, y) => {
    row.split('').forEach((char, x) => {
      const fill = char === '.' ? null : (tint ?? PALETTE[char]);
      if (!fill) return;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', fill);
      svg.appendChild(rect);
    });
  });
  return svg;
}

/** A picture of what the sky is doing right now, as an image the rack can wear. */
export function skyPicture(sky: Sky): string {
  const look = sky.current;
  const chosen = sky.chosen.weather;
  const kind =
    chosen === 'storm' || (chosen === 'real' && look.flash > 0)
      ? 'storm'
      : look.snow > 0.1
        ? 'snow'
        : look.rain > 0.1
          ? 'rain'
          : look.fog > 0.3
            ? 'fog'
            : look.cloud > 0.6
              ? 'cloud'
              : look.dark > 0.5
                ? 'moon'
                : 'sun';
  const svg = icon(kind, 9);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.outerHTML)}`;
}

export function skySlab(sky: Sky): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'menu sky-panel';
  panel.addEventListener('contextmenu', (event) => event.preventDefault());

  /* ── the hour ───────────────────────────────────────────────────────── */
  const hourHead = heading('the hour');
  const hourOutside = chip('outside', () => {
    sky.choose({ time: 'real' });
    paint();
  });
  hourHead.appendChild(hourOutside);
  const hour = slider({
    left: icon('rise', 22),
    right: icon('moon', 22),
    track: hourGradient(sky),
    thumb: () => {
      const at = shownHour();
      return icon(at > 6.5 && at < 19.8 ? 'sun' : 'moon', 14);
    },
    value: () => (shownHour() - FIRST) / (LAST - FIRST),
    set: (t) => {
      const raw = FIRST + t * (LAST - FIRST);
      sky.choose({ time: Math.round(raw * 12) / 12 });
      paint();
    },
  });
  const hourSaid = document.createElement('div');
  hourSaid.className = 'sky-said';
  const marks = document.createElement('div');
  marks.className = 'sky-marks';
  for (const { name, hour: at } of HOURS) {
    const mark = document.createElement('span');
    mark.className = 'press sky-mark';
    mark.textContent = name;
    mark.style.left = `${((at - FIRST) / (LAST - FIRST)) * 100}%`;
    mark.addEventListener('mousedown', (event) => event.preventDefault());
    mark.addEventListener('click', () => {
      sky.choose({ time: at });
      paint();
    });
    marks.appendChild(mark);
  }

  /* ── the weather ────────────────────────────────────────────────────── */
  const weatherHead = heading('the weather');
  const weatherOutside = chip('outside', () => {
    sky.choose({ weather: 'real' });
    paint();
  });
  weatherHead.appendChild(weatherOutside);
  const tiles = document.createElement('div');
  tiles.className = 'sky-tiles';
  const tileOf = new Map<WeatherKind, HTMLElement>();
  for (const { kind, name, icon: art } of WEATHER) {
    const tile = document.createElement('button');
    tile.className = 'sky-tile';
    tile.appendChild(icon(art, 30));
    const label = document.createElement('span');
    label.textContent = name;
    tile.appendChild(label);
    tile.addEventListener('mousedown', (event) => event.preventDefault());
    tile.addEventListener('click', () => {
      sky.choose({ weather: kind });
      paint();
    });
    tiles.appendChild(tile);
    tileOf.set(kind, tile);
  }

  /* ── how much ───────────────────────────────────────────────────────── */
  const amountHead = heading('how much');
  const amount = slider({
    left: icon('few', 20),
    right: icon('many', 20),
    track: 'linear-gradient(90deg, #2c4d66, #4d86b4 60%, #9cc7ea)',
    thumb: () => icon('rain', 14),
    value: () => (sky.chosen.amount - 0.3) / 1.7,
    set: (t) => {
      sky.choose({ amount: 0.3 + t * 1.7 });
      paint();
    },
  });

  panel.append(hourHead, hour.root, marks, hourSaid, weatherHead, tiles, amountHead, amount.root);

  function shownHour(): number {
    const chosen = sky.chosen;
    let at = chosen.time === 'real' ? sky.current.hour : chosen.time;
    if (at < FIRST) at += 24;
    return Math.min(LAST, Math.max(FIRST, at));
  }

  function paint(): void {
    const chosen: SkyChoice = sky.chosen;
    hour.paint();
    amount.paint();
    const real = chosen.time === 'real';
    hourOutside.dataset.on = real ? 'yes' : '';
    hour.root.dataset.real = real ? 'yes' : '';
    const at = shownHour() % 24;
    hourSaid.textContent = `${clock(at)} · ${real ? 'as it is outside' : partOfDay(at)}`;
    weatherOutside.dataset.on = chosen.weather === 'real' ? 'yes' : '';
    for (const [kind, tile] of tileOf) {
      tile.dataset.on = chosen.weather === kind ? 'yes' : '';
    }
    const falls = chosen.weather !== 'real' && chosen.weather !== 'clear';
    amountHead.hidden = !falls;
    amount.root.hidden = !falls;
    keepOnScreen(panel);
  }

  paint();
  // The real hour moves while the panel is up; keep the thumb on it.
  const ticking = window.setInterval(() => {
    if (!panel.isConnected) {
      window.clearInterval(ticking);
      return;
    }
    if (sky.chosen.time === 'real') paint();
  }, 20_000);
  return panel;
}

/** A slider in the kit's manner: a pixel picture either end, a track, a thumb. */
function slider(options: {
  left: SVGSVGElement;
  right: SVGSVGElement;
  track: string;
  thumb: () => SVGSVGElement;
  value: () => number;
  set: (t: number) => void;
}): { root: HTMLElement; paint: () => void } {
  const root = document.createElement('div');
  root.className = 'sky-slider';
  const track = document.createElement('div');
  track.className = 'sky-track';
  track.style.background = options.track;
  const thumb = document.createElement('div');
  thumb.className = 'sky-thumb';
  track.appendChild(thumb);
  root.append(options.left, track, options.right);

  const at = (clientX: number): number => {
    const box = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };
  track.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    track.setPointerCapture(event.pointerId);
    track.dataset.held = 'yes';
    options.set(at(event.clientX));
    const move = (next: PointerEvent): void => options.set(at(next.clientX));
    const up = (): void => {
      track.dataset.held = '';
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', up);
      track.removeEventListener('pointercancel', up);
    };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);
  });

  let shown = '';
  const paint = (): void => {
    const t = Math.min(1, Math.max(0, options.value()));
    thumb.style.left = `${t * 100}%`;
    const art = options.thumb();
    const key = art.innerHTML;
    if (key !== shown) {
      shown = key;
      thumb.replaceChildren(art);
    }
  };
  return { root, paint };
}

/** The island's own light across the slider's hours, as the track. */
function hourGradient(sky: Sky): string {
  const stops: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const at = (FIRST + t * (LAST - FIRST)) % 24;
    const [r, g, b] = sky.lightAt(at);
    // The light, shown as a sky: blue enough to read as one at noon.
    const colour = [r * 120 + 20, g * 165 + 20, b * 215 + 25].map((v) =>
      Math.round(Math.min(255, v))
    );
    stops.push(`rgb(${colour.join(',')}) ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** What an hour looks like, said the way you would say it. */
function partOfDay(hour: number): string {
  if (hour < 5.5) return 'the middle of the night';
  if (hour < 7.5) return 'dawn';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 17.5) return 'afternoon';
  if (hour < 18.8) return 'golden hour';
  if (hour < 20) return 'dusk';
  if (hour < 22) return 'evening';
  return 'night';
}

function clock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

function heading(text: string): HTMLElement {
  const head = document.createElement('div');
  head.className = 'menu-head sky-head';
  const said = document.createElement('span');
  said.textContent = text;
  head.appendChild(said);
  return head;
}

/** "Outside": gold to press, plain cream with its clock lit once it is in force. */
function chip(text: string, does: () => void): HTMLElement {
  const line = document.createElement('span');
  line.className = 'press sky-chip';
  line.append(icon('outside', 11, 'currentColor'), document.createTextNode(text));
  line.addEventListener('mousedown', (event) => event.preventDefault());
  line.addEventListener('click', does);
  return line;
}

/** A panel that has grown past the bottom of the window moves up by as much. */
export function keepOnScreen(slab: HTMLElement): void {
  if (!slab.isConnected) return;
  const box = slab.getBoundingClientRect();
  const over = box.bottom - (window.innerHeight - 12);
  if (over > 0) slab.style.top = `${Math.max(12, box.top - over)}px`;
  const wide = box.right - (window.innerWidth - 12);
  if (wide > 0) slab.style.left = `${Math.max(12, box.left - wide)}px`;
}
