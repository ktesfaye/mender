import { pressing } from '../yard/press';
import { HOURS, WEATHERS, type Sky, type SkyChoice } from './sky';

/**
 * The sky, taken in hand.
 *
 * A right-click on the water offers it beside rearranging the districts: the
 * hour and the weather, each his own by default, and how much of whatever is
 * falling. Whatever is chosen happens to the island straight away, eased the
 * way the sky always is, and the slab stays up so the next one can be tried
 * against it. The one in force is written plainly, not gold, because pressing
 * it again would do nothing.
 */
export function skySlab(sky: Sky): HTMLElement {
  const slab = document.createElement('div');
  slab.className = 'menu slab sky-slab';
  const paint = (): void => {
    slab.replaceChildren();
    const chosen = sky.chosen;
    heading(slab, 'the hour');
    option(slab, 'as it is outside', chosen.time === 'real', () => choose({ time: 'real' }));
    for (const { name, hour } of HOURS) {
      option(slab, name, chosen.time === hour, () => choose({ time: hour }));
    }
    heading(slab, 'the weather');
    option(slab, 'as it is outside', chosen.weather === 'real', () => choose({ weather: 'real' }));
    for (const kind of WEATHERS) {
      option(slab, kind, chosen.weather === kind, () => choose({ weather: kind }));
    }
    if (
      chosen.weather === 'rain' ||
      chosen.weather === 'storm' ||
      chosen.weather === 'snow' ||
      chosen.weather === 'fog' ||
      chosen.weather === 'cloudy'
    ) {
      heading(slab, 'how much');
      const row = document.createElement('div');
      row.className = 'slab-line sky-amount';
      const less = pressing('less', () => choose({ amount: Math.max(0.3, chosen.amount - 0.25) }));
      const more = pressing('more', () => choose({ amount: Math.min(2, chosen.amount + 0.25) }));
      const said = document.createElement('span');
      said.className = 'sky-chosen';
      said.textContent = amountSaid(chosen.amount);
      row.append(less, said, more);
      slab.appendChild(row);
    }
  };
  const choose = (change: Partial<SkyChoice>): void => {
    sky.choose(change);
    paint();
    keepOnScreen(slab);
  };
  paint();
  return slab;
}

/** A slab that has grown past the bottom of the window moves up by as much. */
export function keepOnScreen(slab: HTMLElement): void {
  const box = slab.getBoundingClientRect();
  const over = box.bottom - (window.innerHeight - 12);
  if (over > 0) slab.style.top = `${Math.max(12, box.top - over)}px`;
}

function amountSaid(amount: number): string {
  if (amount < 0.6) return 'a little';
  if (amount < 0.9) return 'some';
  if (amount < 1.2) return 'plenty';
  if (amount < 1.6) return 'a lot';
  return 'as much as it can';
}

function heading(slab: HTMLElement, text: string): void {
  const head = document.createElement('div');
  head.className = 'menu-head';
  head.textContent = text;
  slab.appendChild(head);
}

function option(slab: HTMLElement, text: string, chosen: boolean, does: () => void): void {
  if (chosen) {
    const line = document.createElement('span');
    line.className = 'slab-line sky-chosen';
    line.textContent = text;
    slab.appendChild(line);
    return;
  }
  const line = pressing(text, does);
  line.className += ' slab-line';
  slab.appendChild(line);
}
