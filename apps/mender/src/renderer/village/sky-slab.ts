import { glaze } from '../glass/glass';
import { ISLAND_LOOK } from '../glass/island-look';
import { px } from '../glass/px';
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
    (chosen !== 'real' && chosen.includes('storm')) || (chosen === 'real' && look.flash > 0)
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

const GLYPH: Record<WeatherKind, { sign: string; tint: string }> = {
  clear: { sign: 'sun_i', tint: '#ffd47a' },
  cloudy: { sign: 'cloud', tint: '#cfd6e4' },
  rain: { sign: 'rain', tint: '#7aaaff' },
  storm: { sign: 'storm', tint: '#c7b6ff' },
  snow: { sign: 'snow', tint: '#e6f1ff' },
  fog: { sign: 'fog', tint: '#d8d2c4' },
};

const RAIN_WORDS = ['a few drops', 'a light shower', 'steady rain', 'heavy rain', 'a downpour'];
const SNOW_WORDS = ['a few flakes', 'a flurry', 'steady snow', 'heavy snow', 'a blizzard'];
const THICK_WORDS = ['a wisp', 'a little', 'some', 'a lot', 'thick'];
const CELLS = 8;

function span(cls: string, words = ''): HTMLSpanElement {
  const made = document.createElement('span');
  made.className = cls;
  made.textContent = words;
  return made;
}

function div(cls: string, ...kids: (Node | string)[]): HTMLDivElement {
  const made = document.createElement('div');
  made.className = cls;
  made.append(...kids);
  return made;
}

export function skySlab(sky: Sky): HTMLElement {
  const panel = div('i-pane i-sky');
  glaze(panel, ISLAND_LOOK);
  panel.addEventListener('contextmenu', (event) => event.preventDefault());

  /* ── the heading ────────────────────────────────────────────────────── */
  const own = span('g-chip');
  const ownDot = span('g-dot');
  own.append(ownDot, document.createTextNode(''));
  panel.appendChild(
    div(
      'i-top',
      div(
        '',
        div('g-pix', "the island's"),
        Object.assign(document.createElement('h1'), { textContent: 'the sky' })
      ),
      own
    )
  );
  (panel.querySelector('.g-pix') as HTMLElement).style.marginBottom = '8px';

  /* ── the hour ───────────────────────────────────────────────────────── */
  const hourSide = span('i-small');
  const hourHead = div('i-sec', span('g-pix', 'the hour'), hourSide);
  hourHead.style.marginTop = '22px';
  hourHead.style.marginBottom = '0';
  const bigTime = document.createElement('b');
  const partWord = document.createElement('span');
  const said = div('i-time', bigTime, partWord);

  const hour = slider({
    left: px('sun_i', '#ffb86b', 18),
    right: px('moon', '#b9c3ff', 18),
    track: hourGradient(sky),
    thumb: () => {
      const at = shownHour();
      return px(at > 6.5 && at < 19.8 ? 'sun_i' : 'moon', '#3a2508', 18);
    },
    value: () => (shownHour() - FIRST) / (LAST - FIRST),
    set: (t) => {
      const raw = FIRST + t * (LAST - FIRST);
      sky.choose({ time: Math.round(raw * 12) / 12 });
      paint();
    },
  });
  const marks = div('i-ticks');
  marks.style.height = '30px';
  HOURS.forEach(({ name, hour: at }, index) => {
    const mark = span('', name);
    mark.style.left = `${((at - FIRST) / (LAST - FIRST)) * 100}%`;
    if (index % 2 === 1) mark.style.top = '14px';
    mark.addEventListener('mousedown', (event) => event.preventDefault());
    mark.addEventListener('click', () => {
      sky.choose({ time: at });
      paint();
    });
    marks.appendChild(mark);
  });

  /* ── the weather ────────────────────────────────────────────────────── */
  const weatherSide = span('i-small');
  const weatherHead = div('i-sec', span('g-pix', 'the weather'), weatherSide);
  const tiles = div('i-wx');
  const tileOf = new Map<WeatherKind, HTMLElement>();
  for (const { kind, name } of WEATHER) {
    const glyph = GLYPH[kind];
    const tile = div('i-tile', span('i-ic'), name);
    tile.firstElementChild?.appendChild(px(glyph.sign, glyph.tint, 22));
    tile.addEventListener('mousedown', (event) => event.preventDefault());
    /* Each picture is on or off, and any of them go together. Taking the
       last one off hands the weather back to outside. */
    tile.addEventListener('click', () => {
      const now = sky.chosen.weather;
      const kinds = now === 'real' ? [] : [...now];
      const next = kinds.includes(kind) ? kinds.filter((one) => one !== kind) : [...kinds, kind];
      sky.choose({ weather: next.length ? next : 'real' });
      paint();
    });
    tiles.appendChild(tile);
    tileOf.set(kind, tile);
  }

  /* ── how much ───────────────────────────────────────────────────────── */
  const amountSaid = span('i-small');
  const amountHead = div('i-sec', span('g-pix', 'how much'), amountSaid);
  const cells = div('i-cells');
  for (let i = 0; i < CELLS; i++) cells.appendChild(document.createElement('i'));
  const amountEnd = span('');
  amountEnd.style.display = 'flex';
  const level = (): number => Math.round(((sky.chosen.amount - 0.3) / 1.7) * (CELLS - 1)) + 1;
  const reach = (clientX: number): void => {
    const box = cells.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const lit = Math.min(CELLS, Math.max(1, Math.ceil(t * CELLS)));
    sky.choose({ amount: 0.3 + ((lit - 1) / (CELLS - 1)) * 1.7 });
    paint();
  };
  cells.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    cells.setPointerCapture(event.pointerId);
    reach(event.clientX);
    const move = (next: PointerEvent): void => reach(next.clientX);
    const up = (): void => {
      cells.removeEventListener('pointermove', move);
      cells.removeEventListener('pointerup', up);
      cells.removeEventListener('pointercancel', up);
    };
    cells.addEventListener('pointermove', move);
    cells.addEventListener('pointerup', up);
    cells.addEventListener('pointercancel', up);
  });
  const amount = div('i-amt', px('drop', '#7aaaff', 14), cells, amountEnd);
  const wordsLow = span('');
  const wordsHigh = span('');
  const amountWords = div('i-words', wordsLow, wordsHigh);

  /* ── the foot ───────────────────────────────────────────────────────── */
  const back = document.createElement('span');
  back.className = 'g-pill';
  back.append(px('clock', '#2a1b09', 14), document.createTextNode('back to outside'));
  back.addEventListener('mousedown', (event) => event.preventDefault());
  back.addEventListener('click', () => {
    sky.choose({ time: 'real', weather: 'real' });
    paint();
  });
  const foot = div('i-ft', span('', 'kept on this machine'), back);

  panel.append(
    hourHead,
    said,
    hour.root,
    marks,
    weatherHead,
    tiles,
    amountHead,
    amount,
    amountWords,
    foot
  );

  function shownHour(): number {
    const chosen = sky.chosen;
    let at = chosen.time === 'real' ? sky.current.hour : chosen.time;
    if (at < FIRST) at += 24;
    return Math.min(LAST, Math.max(FIRST, at));
  }

  function paint(): void {
    const chosen: SkyChoice = sky.chosen;
    hour.paint();
    const timeReal = chosen.time === 'real';
    const weatherReal = chosen.weather === 'real';
    const at = shownHour() % 24;
    bigTime.textContent = clock(at);
    partWord.textContent = timeReal ? `${partOfDay(at)} · as outside` : partOfDay(at);
    const now = new Date();
    const outside = clock(now.getHours() + now.getMinutes() / 60);
    hourSide.textContent = `outside it is ${outside}`;
    weatherSide.textContent = 'any of them together';
    const mine = !timeReal || !weatherReal;
    ownDot.style.background = mine ? 'var(--g-gold)' : 'var(--g-moss)';
    own.lastChild!.textContent = mine ? 'your own sky' : 'as outside';
    back.classList.toggle('i-pill-off', !mine);
    for (const [kind, tile] of tileOf) {
      tile.dataset.on = !weatherReal && chosen.weather.includes(kind) ? 'yes' : '';
    }
    const kinds: WeatherKind[] = chosen.weather === 'real' ? [] : chosen.weather;
    const falls = kinds.some((one) => one !== 'clear');
    const wet = kinds.some((one) => one === 'rain' || one === 'storm' || one === 'snow');
    const snowy = kinds.includes('snow') && !kinds.includes('rain') && !kinds.includes('storm');
    amountHead.hidden = !falls;
    amount.hidden = !falls;
    amountWords.hidden = !falls;
    const lit = level();
    [...cells.children].forEach((cell, i) => cell.classList.toggle('i-f', i < lit));
    const words = !wet ? THICK_WORDS : snowy ? SNOW_WORDS : RAIN_WORDS;
    amountSaid.textContent =
      words[Math.round(((lit - 1) / (CELLS - 1)) * (words.length - 1))] ?? '';
    wordsLow.textContent = words[0] ?? '';
    wordsHigh.textContent = words[words.length - 1] ?? '';
    amountEnd.replaceChildren(
      px(
        snowy ? 'snow' : wet ? 'rain' : 'cloud',
        snowy ? '#e6f1ff' : wet ? '#7aaaff' : '#cfd6e4',
        18
      )
    );
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

/** A slider: a sign either end, a track of the day's own colours, a gold thumb. */
function slider(options: {
  left: SVGSVGElement;
  right: SVGSVGElement;
  track: string;
  thumb: () => SVGSVGElement;
  value: () => number;
  set: (t: number) => void;
}): { root: HTMLElement; paint: () => void } {
  const root = div('i-track');
  const bar = div('i-bar');
  bar.style.background = options.track;
  const thumb = div('i-thumb');
  for (const [side, art] of [
    ['left:4px', options.left],
    ['right:4px', options.right],
  ] as const) {
    const end = span('i-ends');
    end.style.cssText += side;
    end.appendChild(art);
    root.appendChild(end);
  }
  root.append(bar, thumb);

  const at = (clientX: number): number => {
    const box = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };
  root.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    root.setPointerCapture(event.pointerId);
    root.dataset.held = 'yes';
    options.set(at(event.clientX));
    const move = (next: PointerEvent): void => options.set(at(next.clientX));
    const up = (): void => {
      root.dataset.held = '';
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', up);
    };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
  });

  let shown = '';
  const paint = (): void => {
    const t = Math.min(1, Math.max(0, options.value()));
    thumb.style.left = `calc(30px + (100% - 60px) * ${t})`;
    const art = options.thumb();
    const key = art.innerHTML;
    if (key !== shown) {
      shown = key;
      thumb.replaceChildren(art);
    }
  };
  return { root, paint };
}

/**
 * The day across the slider, as a sky rather than as the island's light: the
 * light barely changes colour, so drawn as it is the whole track read as one
 * blue. This is the same sun, exaggerated, from deep night through a pink and
 * orange dawn to a bright pale noon, a gold evening, a violet dusk and night.
 */
const SKY: { at: number; colour: [number, number, number] }[] = [
  { at: -1, colour: [14, 18, 48] },
  { at: -0.3, colour: [26, 30, 78] },
  { at: -0.08, colour: [92, 58, 128] },
  { at: 0.0, colour: [232, 112, 84] },
  { at: 0.08, colour: [255, 176, 92] },
  { at: 0.25, colour: [150, 206, 240] },
  { at: 0.6, colour: [196, 232, 252] },
  { at: 1, colour: [255, 246, 196] },
];

function hourGradient(sky: Sky): string {
  const stops: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const at = (FIRST + t * (LAST - FIRST)) % 24;
    const height = sky.sunHeight(at);
    let colour = SKY[SKY.length - 1]!.colour;
    for (let k = 1; k < SKY.length; k++) {
      const high = SKY[k]!;
      if (height > high.at) continue;
      const low = SKY[k - 1]!;
      const f = (height - low.at) / (high.at - low.at);
      colour = low.colour.map((v, c) => Math.round(v + (high.colour[c]! - v) * f)) as [
        number,
        number,
        number,
      ];
      break;
    }
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

export function clock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
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
