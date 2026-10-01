import type { RealWeather } from '@shared/sky';

/**
 * The sky over the island: what time of day it is there, and what the weather
 * is doing.
 *
 * By default it is his. The sun comes up and goes down when it does where he
 * is, and a grey day outside his window is a grey day on the island, so the
 * village is never a postcard that says noon at midnight. Either half can be
 * taken in hand instead, the hour or the weather, from the board the right
 * click on the water opens, and is kept on this machine until it is handed
 * back.
 *
 * Nothing here draws. It turns all of that into a handful of numbers — how
 * much light there is and of what colour, how wet, how white, how misty —
 * eased so that nothing about the sky ever changes in a single frame, and
 * everything that does draw reads them.
 */

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

export const WEATHERS: readonly WeatherKind[] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];

/** The hours a hand can set the sky to, by what they look like. */
export const HOURS = [
  { name: 'dawn', hour: 6.6 },
  { name: 'morning', hour: 9 },
  { name: 'noon', hour: 13 },
  { name: 'golden hour', hour: 18.1 },
  { name: 'dusk', hour: 19.15 },
  { name: 'night', hour: 23.5 },
] as const;

export interface SkyChoice {
  /** 'real' for his own clock, or an hour of the day to hold the sky at. */
  time: 'real' | number;
  /** 'real' for his own weather, or a kind of weather to hold it at. */
  weather: 'real' | WeatherKind;
  /** How much of it: a light shower to a downpour, a flurry to a blizzard. */
  amount: number;
}

const KEPT = 'mender.sky';

export function keptChoice(): SkyChoice {
  try {
    const read = JSON.parse(localStorage.getItem(KEPT) ?? 'null') as Partial<SkyChoice> | null;
    if (!read) return { time: 'real', weather: 'real', amount: 1 };
    return {
      time: typeof read.time === 'number' || read.time === 'real' ? read.time : 'real',
      weather:
        read.weather === 'real' || WEATHERS.includes(read.weather as WeatherKind)
          ? (read.weather as SkyChoice['weather'])
          : 'real',
      amount: typeof read.amount === 'number' ? Math.min(2, Math.max(0.3, read.amount)) : 1,
    };
  } catch {
    return { time: 'real', weather: 'real', amount: 1 };
  }
}

function keep(choice: SkyChoice): void {
  try {
    localStorage.setItem(KEPT, JSON.stringify(choice));
  } catch {
    // A sky that forgets the hand on it next launch is still a sky.
  }
}

/** What everything that draws reads, every frame. */
export interface SkyLook {
  /** The colour light is right now, each channel nought to a little over one. */
  ambient: [number, number, number];
  /** How much colour the dark takes out of things. */
  desat: number;
  /** How dark it is, nought at noon to one in the middle of the night. What
      lamps and windows are worth. */
  dark: number;
  /** How far down the sun is, for the warm low light of either end of the day. */
  low: number;
  cloud: number;
  rain: number;
  snow: number;
  fog: number;
  wind: number;
  /** How white the ground has gone, which lags the snow falling on it. */
  cover: number;
  /** How wet the ground is, which lags the rain. */
  wet: number;
  /** A lightning flash, nought to one, over in a moment. */
  flash: number;
  /** Stars on the water: dark and a clear sky. */
  stars: number;
  /** The real hour, nought to twenty-four, for anything that runs on one. */
  hour: number;
  /** Autumn, in the hemisphere he is in, for leaves coming down. */
  autumn: boolean;
}

interface Target {
  ambient: [number, number, number];
  desat: number;
  dark: number;
  low: number;
  cloud: number;
  rain: number;
  snow: number;
  fog: number;
  wind: number;
  thunder: boolean;
}

/* Keys by how high the sun is, minus one being the middle of the night and one
   high noon. The colours are what multiplies the art: night is a deep blue
   moonlight with most of the colour out of it, the ends of the day warm and
   low, and noon exactly the art as he drew it. */
const KEYS: { at: number; ambient: [number, number, number]; desat: number }[] = [
  { at: -1, ambient: [0.4, 0.48, 0.76], desat: 0.32 },
  { at: -0.35, ambient: [0.42, 0.5, 0.78], desat: 0.3 },
  { at: -0.12, ambient: [0.55, 0.55, 0.8], desat: 0.2 },
  { at: -0.02, ambient: [0.86, 0.6, 0.62], desat: 0.12 },
  { at: 0.06, ambient: [1.02, 0.74, 0.58], desat: 0.04 },
  { at: 0.2, ambient: [1.04, 0.92, 0.78], desat: 0 },
  { at: 0.42, ambient: [1, 1, 1], desat: 0 },
  { at: 1, ambient: [1, 1, 1], desat: 0 },
];

/** Somewhere sensible to put the sun before the real one is known. */
const DEFAULT_SUNRISE = 6.75;
const DEFAULT_SUNSET = 19;

export class Sky {
  private choice = keptChoice();
  private real: RealWeather | null = null;
  private readonly look: SkyLook = {
    ambient: [1, 1, 1],
    desat: 0,
    dark: 0,
    low: 0,
    cloud: 0,
    rain: 0,
    snow: 0,
    fog: 0,
    wind: 0,
    cover: 0,
    wet: 0,
    flash: 0,
    stars: 0,
    hour: 12,
    autumn: false,
  };
  private settled = false;
  private nextBolt = 0;
  private bolt = 0;
  private latitude = 45;
  private readonly listeners: (() => void)[] = [];

  /** Anything the sky has to tell straight away rather than on the next frame. */
  onChange(run: () => void): void {
    this.listeners.push(run);
  }

  get chosen(): SkyChoice {
    return { ...this.choice };
  }

  choose(change: Partial<SkyChoice>): void {
    this.choice = { ...this.choice, ...change };
    keep(this.choice);
    for (const run of this.listeners) run();
  }

  /** His weather, when it is known. */
  told(real: RealWeather | null, latitude?: number): void {
    this.real = real;
    if (latitude !== undefined) this.latitude = latitude;
  }

  /** What the sky is doing right now, worked out fresh and then eased toward. */
  tick(seconds: number): SkyLook {
    const target = this.target();
    const look = this.look;
    // The first frame lands where it should be: opening the app at night is
    // night, not a sunset played at speed.
    const by = this.settled ? Math.min(1, seconds * 0.6) : 1;
    const slow = this.settled ? Math.min(1, seconds * 0.25) : 1;
    for (let i = 0; i < 3; i++) look.ambient[i]! += (target.ambient[i]! - look.ambient[i]!) * by;
    look.desat += (target.desat - look.desat) * by;
    look.dark += (target.dark - look.dark) * by;
    look.low += (target.low - look.low) * by;
    look.cloud += (target.cloud - look.cloud) * slow;
    look.rain += (target.rain - look.rain) * slow;
    look.snow += (target.snow - look.snow) * slow;
    look.fog += (target.fog - look.fog) * slow;
    look.wind += (target.wind - look.wind) * slow;
    look.stars = look.dark * Math.max(0, 1 - look.cloud * 1.3) * (1 - look.fog);

    /* The ground keeps what fell on it: snow lies a while after it stops and
       takes a while to settle, and a shower leaves things dark and shining
       for a good while after. */
    if (!this.settled) {
      look.cover = target.snow > 0.05 ? 1 : 0;
      look.wet = target.rain > 0.05 ? 1 : 0;
    } else {
      look.cover =
        target.snow > 0.05
          ? Math.min(1, look.cover + seconds * target.snow * 0.03)
          : Math.max(0, look.cover - seconds * 0.004);
      look.wet =
        target.rain > 0.05
          ? Math.min(1, look.wet + seconds * target.rain * 0.06)
          : Math.max(0, look.wet - seconds * 0.003);
    }

    /* Lightning: a sudden white-blue flash, a second fainter one on its heels,
       and nothing for a good while. */
    const now = performance.now() / 1000;
    if (target.thunder) {
      if (now > this.nextBolt) {
        this.bolt = now;
        this.nextBolt = now + 7 + Math.random() * 18;
      }
      const since = now - this.bolt;
      look.flash =
        since < 0.09 ? 1 : since < 0.2 ? 0.25 : since < 0.3 ? 0.7 : Math.max(0, 0.7 - since * 1.4);
    } else {
      look.flash = 0;
    }
    look.hour = this.hourNow();
    look.autumn = this.isAutumn();
    this.settled = true;
    return look;
  }

  /** What the last tick worked out, without working anything out again. */
  get current(): SkyLook {
    return this.look;
  }

  /** Whether anything about the sky is moving on its own and wants drawing. */
  get stirring(): boolean {
    const look = this.look;
    return look.rain > 0.02 || look.snow > 0.02 || look.flash > 0;
  }

  private target(): Target {
    const hour = this.hourShown();
    const { rise, set } = this.sun();
    const elevation = sunAt(hour, rise, set);
    const key = keyAt(elevation);
    const weather = this.weatherShown();

    // Weather takes light out of the day and colour out of everything.
    const grey = weather.cloud * 0.22 + weather.rain * 0.16 + weather.fog * 0.08;
    const cool = weather.cloud * 0.5 + weather.rain * 0.5;
    const snowLift = weather.snow * 0.08;
    const ambient = key.ambient.map((value, i) => {
      // Overcast is a flat grey-blue light: the warm end of a sunset under it
      // is mostly gone.
      const flat = i === 2 ? 1 : 0.94;
      const toward = value * (1 - cool * 0.35) + flat * value * cool * 0.35;
      return Math.max(0.12, toward * (1 - grey) + snowLift);
    }) as [number, number, number];
    const dark = Math.max(0, Math.min(1, (0.08 - elevation) / 0.32)) ** 0.8;
    const dim = Math.min(1, grey * 1.6) * 0.35;
    return {
      ambient,
      desat: Math.min(0.6, key.desat + weather.cloud * 0.12 + weather.rain * 0.1),
      // A storm at four in the afternoon turns the lamps on too.
      dark: Math.min(1, dark + dim * (1 - dark)),
      low: Math.max(0, 1 - Math.abs(elevation) / 0.2) * (1 - weather.cloud * 0.8),
      ...weather,
    };
  }

  private weatherShown(): Omit<Target, 'ambient' | 'desat' | 'dark' | 'low'> {
    const amount = this.choice.amount;
    if (this.choice.weather === 'real') {
      const real = this.real;
      if (!real) return { cloud: 0.15, rain: 0, snow: 0, fog: 0, wind: 0.15, thunder: false };
      return {
        cloud: real.cloud,
        rain: real.rain,
        snow: real.snow,
        fog: real.fog,
        wind: Math.max(0.08, real.wind),
        thunder: real.thunder,
      };
    }
    const clamp = (value: number): number => Math.min(1, value * amount);
    switch (this.choice.weather) {
      case 'clear':
        return { cloud: 0.05, rain: 0, snow: 0, fog: 0, wind: 0.12, thunder: false };
      case 'cloudy':
        return { cloud: clamp(0.85), rain: 0, snow: 0, fog: 0, wind: 0.3, thunder: false };
      case 'rain':
        return { cloud: 0.9, rain: clamp(0.55), snow: 0, fog: 0.1, wind: 0.35, thunder: false };
      case 'storm':
        return {
          cloud: 1,
          rain: clamp(0.95),
          snow: 0,
          fog: 0.15,
          wind: clamp(0.85),
          thunder: true,
        };
      case 'snow':
        return { cloud: 0.8, rain: 0, snow: clamp(0.6), fog: 0.12, wind: 0.2, thunder: false };
      case 'fog':
        return { cloud: 0.6, rain: 0, snow: 0, fog: clamp(0.8), wind: 0.05, thunder: false };
    }
  }

  /** His local hour, or the one the sky has been held at. */
  private hourShown(): number {
    return this.choice.time === 'real' ? this.hourNow() : this.choice.time;
  }

  private hourNow(): number {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }

  /** Sunrise and sunset as local hours, today's real ones when they are known. */
  private sun(): { rise: number; set: number } {
    const real = this.real;
    if (!real?.sunrise || !real.sunset) return { rise: DEFAULT_SUNRISE, set: DEFAULT_SUNSET };
    const local = (at: number): number => {
      const date = new Date(at);
      return date.getHours() + date.getMinutes() / 60;
    };
    return { rise: local(real.sunrise), set: local(real.sunset) };
  }

  private isAutumn(): boolean {
    const month = new Date().getMonth();
    return this.latitude >= 0 ? month >= 8 && month <= 10 : month >= 2 && month <= 4;
  }
}

/**
 * How high the sun is at an hour, minus one to one.
 *
 * Not astronomy: a half sine across the day between sunrise and sunset and
 * another under the horizon across the night, which is all a picture needs and
 * puts the ends of the day exactly where his window has them.
 */
function sunAt(hour: number, rise: number, set: number): number {
  const day = set - rise;
  if (hour >= rise && hour <= set) return Math.sin((Math.PI * (hour - rise)) / day);
  const night = 24 - day;
  const since = hour > set ? hour - set : hour + 24 - set;
  return -Math.sin((Math.PI * since) / night);
}

function keyAt(elevation: number): { ambient: [number, number, number]; desat: number } {
  for (let i = 1; i < KEYS.length; i++) {
    const high = KEYS[i]!;
    if (elevation > high.at) continue;
    const lowKey = KEYS[i - 1]!;
    const t = (elevation - lowKey.at) / (high.at - lowKey.at);
    return {
      ambient: lowKey.ambient.map((value, c) => value + (high.ambient[c]! - value) * t) as [
        number,
        number,
        number,
      ],
      desat: lowKey.desat + (high.desat - lowKey.desat) * t,
    };
  }
  return { ambient: [1, 1, 1], desat: 0 };
}
