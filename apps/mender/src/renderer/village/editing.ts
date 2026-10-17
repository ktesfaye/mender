import { CELL, type CellRun } from '@mender/village';
import type { Viewport } from 'pixi-viewport';
import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  type Application,
  type FederatedPointerEvent,
  type Texture,
} from 'pixi.js';
import { stir } from '../pace';
import { pressing } from '../yard/press';
import { ask as askKeys } from '../yard/standing';

/** Somewhere a project could stand: one of his districts, or a piece of one. */
export interface Place {
  id: string;
  name: string;
  /** The district a piece is cut out of. */
  of: string | null;
  cells: readonly CellRun[];
}

/** Who stands where, as far as rearranging is concerned. */
export interface Resident {
  id: string;
  name: string;
  district: string;
}

export interface EditingHost {
  /** Who lives where right now. */
  residents(): readonly Resident[];
  /** The picture the island is drawn as, to lift a district out of. */
  scene(): Container;
  /** Where it could go, what is wrong with where it can't, and who else moves if it goes. */
  moves(id: string): Promise<{ places: Record<string, string | null>; off: string | null }>;
  /** Stand it somewhere else. The error is said as it is. */
  move(id: string, to: string): Promise<string | null>;
  /** Take it off the map. */
  forget(id: string): Promise<void>;
  /** Off the island, still on the rack, every session kept. */
  putAway(id: string): Promise<void>;
  /** How many sessions it has, which is what forgetting it costs. */
  sessions(id: string): number;
  /** A point on screen that something written already covers. */
  covered(x: number, y: number): boolean;
  /** The flags, which can be picked up and stood somewhere else on their own land. */
  flags(): Flags;
  /** Stand a district's flag here from now on. */
  plant(district: string, foot: { x: number; y: number }): Promise<void>;
  /** Let the camera out over the whole map, every empty place on it; null is back to the land. */
  reach(map: { x: number; y: number; width: number; height: number } | null): void;
}

export interface Flags {
  at(x: number, y: number): string | null;
  lift(district: string, x: number, y: number): boolean;
  carry(x: number, y: number, fits: boolean): { x: number; y: number } | null;
  putBack(): void;
}

/* The light a place is lit with while it is being rearranged. The warm one
   is the hover's own, so a place you could drop on reads the way a place you
   could walk into already does; the sore one is the red a hurt house gets. */
const WARM = 0xffdf9e;
const SORE = 0xf2665a;
const SAND = 0xf4e3c0;

/**
 * Rearranging the island.
 *
 * A right-click out on the water asks for it, and while it is on, every
 * district is something you pick up rather than walk into. Picking one up
 * lifts the land itself off the island, houses and trees and all, and it goes
 * where the pointer goes; wherever it is let go is where that project lives
 * now. Onto somebody else's place and the two of them swap. Onto an empty
 * one, drawn as pale ground on the water while this is on, and it moves in.
 * Out onto the open sea, the district or only its flag, and a window comes up
 * over the island asking what it is to be: put away, which keeps it on the
 * rack with every session in it and only sends its land back to sea, or
 * removed, which forgets it and takes its sessions down, saying what that
 * costs.
 *
 * Nothing about the land moves: his districts stand where he drew them, and
 * what changes is who lives in which. What cannot be, a district that would no
 * longer reach the fire, lights red and says why, and letting go there puts
 * it back.
 *
 * A flag is picked up the same way, by its pole or its cloth, and let go
 * anywhere on its own district it stands there from then on. Off its own land
 * it goes red, and letting go puts it back.
 */
export class Editing {
  private on = false;
  private readonly overlay = new Container();
  /** Every empty place anybody could move to, as pale land on the water. */
  private readonly empty = new Graphics();
  /** Where the lifted district came from, dimmed while it is away. */
  private readonly hole = new Graphics();
  /** Where it would land if let go now. */
  private readonly aim = new Graphics();
  private readonly line: HTMLDivElement;
  private carrying: {
    who: Resident;
    from: Place;
    lifted: Container;
    texture: Texture;
    grabbed: { x: number; y: number };
    fits: { places: Record<string, string | null>; off: string | null } | null;
    over: Place | null;
  } | null = null;
  /** A flag in the hand: whose, and whether where it is now would do. */
  private flag: {
    who: Resident;
    district: string;
    foot: { x: number; y: number } | null;
    fits: boolean;
    /** Out on the open sea, where letting go asks to forget it. */
    sea: boolean;
  } | null = null;
  /** A put-away project being carried down off the rack onto the island. */
  private arriving: {
    who: Resident;
    fits: { places: Record<string, string | null>; off: string | null } | null;
    over: Place | null;
  } | null = null;
  /** A forget waiting on its second press, and the window asking it. */
  private forgetting: Resident | null = null;
  private asking: HTMLElement | null = null;
  /** Return is done and Escape backs out, for as long as the mode is on. */
  private keys: (() => void) | null = null;
  private busy = false;

  constructor(
    private readonly pixi: Application,
    private readonly camera: Viewport,
    private readonly places: readonly Place[],
    private readonly host: EditingHost,
    root: HTMLElement
  ) {
    this.overlay.eventMode = 'none';
    this.overlay.addChild(this.empty, this.hole, this.aim);
    this.overlay.visible = false;
    camera.addChild(this.overlay);

    this.line = document.createElement('div');
    this.line.className = 'editing-line';
    root.appendChild(this.line);

    const stage = pixi.stage;
    stage.on('pointerdown', (event) => this.down(event));
    stage.on('pointermove', (event) => this.moving(event));
    stage.on('pointerup', (event) => void this.up(event));
    stage.on('pointerupoutside', (event) => void this.up(event));
  }

  get active(): boolean {
    return this.on;
  }

  /** Whether a district is in the hand right now. */
  get holding(): boolean {
    return this.carrying !== null || this.flag !== null || this.arriving !== null;
  }

  /**
   * A put-away board pulled down off the rack: the island turns to edit
   * districts so the empty places show, and wherever it is let go is where
   * it comes back on. Onto an empty place it moves in; onto somebody's, the
   * two trade, and they are the one put away.
   */
  arrive(who: Resident): void {
    this.start();
    this.drop();
    this.arriving = { who, fits: null, over: null };
    const arriving = this.arriving;
    void this.host.moves(who.id).then((fits) => {
      if (this.arriving !== arriving) return;
      arriving.fits = fits;
      this.arriveOver(null);
    });
    this.say();
    stir();
  }

  /** Where on screen the carried board is now. Null is off the island. */
  arriveOver(at: { x: number; y: number } | null): void {
    const arriving = this.arriving;
    if (!arriving) return;
    const covered = at ? this.host.covered(at.x, at.y) : true;
    const point = at && !covered ? this.camera.toWorld(at.x, at.y) : null;
    const over = point ? this.placeAt(point.x, point.y) : null;
    arriving.over = over;
    this.aim.clear();
    if (over) {
      const why = arriving.fits ? arriving.fits.places[over.id] : null;
      for (const [x, y0, y1] of this.groundOf(over)) {
        this.aim.rect(x * CELL, -(y1 + 1) * CELL, CELL, (y1 - y0 + 1) * CELL);
      }
      this.aim.fill({ color: why ? SORE : WARM, alpha: why ? 0.38 : 0.3 });
    }
    this.say();
    stir();
  }

  /** Let go: onto a place it comes on there, anywhere else it stays away. */
  async arriveAt(at: { x: number; y: number }): Promise<void> {
    this.arriveOver(at);
    const arriving = this.arriving;
    this.arriving = null;
    this.aim.clear();
    if (!arriving) return;
    const over = arriving.over;
    if (!over) {
      this.say(`${arriving.who.name} stays put away.`);
      return;
    }
    const fits = arriving.fits ?? (await this.host.moves(arriving.who.id));
    const why = fits.places[over.id];
    if (why) {
      this.say(`${why}, so it stays.`);
      return;
    }
    const there = this.residentOn(over.id);
    this.busy = true;
    this.say(`bringing ${arriving.who.name} in…`);
    const wrong = await this.host.move(arriving.who.id, over.id);
    this.busy = false;
    this.refresh();
    this.say(
      wrong
        ? `${wrong}, so it stays.`
        : there
          ? `${arriving.who.name} is on the ${over.name.toLowerCase()}. ${there.name} is put away.`
          : `${arriving.who.name} is on the ${over.name.toLowerCase()} now.`
    );
  }

  start(): void {
    if (this.on) return;
    this.on = true;
    this.overlay.visible = true;
    this.unask();
    this.keys = askKeys({ yes: () => this.stop(), no: () => this.escaped(), keep: true });
    this.refresh();
    this.say();
    this.line.style.opacity = '1';
    this.host.reach(boxOf(this.places.flatMap((place) => place.cells)));
    stir();
  }

  stop(): void {
    if (!this.on) return;
    this.drop();
    this.arriving = null;
    this.on = false;
    this.overlay.visible = false;
    this.keys?.();
    this.keys = null;
    this.unask();
    this.line.style.opacity = '0';
    this.line.replaceChildren();
    this.camera.plugins.resume('drag');
    this.pixi.canvas.style.cursor = 'default';
    this.host.reach(null);
    stir();
  }

  /** Escape: a forget waiting on its second press first, then the whole mode. */
  escaped(): void {
    if (this.forgetting) {
      this.unask();
      this.say();
      return;
    }
    this.stop();
  }

  /** The island was drawn again: the overlay goes back on top of it. */
  refresh(): void {
    this.camera.addChild(this.overlay);
    this.empty.clear();
    if (!this.on) return;
    for (const place of this.vacant()) this.pale(this.empty, place.cells);
  }

  /* ── where things are ─────────────────────────────────────────────── */

  private residentOn(place: string): Resident | undefined {
    return this.host.residents().find((one) => one.district === place);
  }

  /**
   * The empty places worth showing: a whole district nobody is on, and a piece
   * nobody is on of a district somebody is, which is where a project can move
   * in beside them. A piece of an empty district is just that district.
   */
  private vacant(): Place[] {
    const taken = new Set(this.host.residents().map((one) => one.district));
    return this.places.filter(
      (place) => !taken.has(place.id) && (place.of === null || taken.has(place.of))
    );
  }

  /**
   * The place under a point in the world.
   *
   * A piece shares its cells with the district it is cut out of, so it
   * answers for them only while it is its own place: somebody lives on it, or
   * somebody lives on the rest and it is pale ground to move onto.
   */
  private placeAt(worldX: number, worldY: number): Place | null {
    const cell = `${Math.floor(worldX / CELL)},${Math.floor(-worldY / CELL)}`;
    const taken = new Set(this.host.residents().map((one) => one.district));
    let whole: Place | null = null;
    for (const place of this.places) {
      if (!owns(place.cells, cell)) continue;
      if (place.of === null) {
        whole = place;
        continue;
      }
      if (taken.has(place.id) || taken.has(place.of)) return place;
    }
    return whole;
  }

  /**
   * The ground a place actually stands on right now: a district with every
   * piece somebody else lives on cut out of it, so lifting it never takes
   * them along.
   */
  private groundOf(place: Place): readonly CellRun[] {
    if (place.of !== null) return place.cells;
    const given = new Set<string>();
    for (const piece of this.places) {
      if (piece.of !== place.id || !this.residentOn(piece.id)) continue;
      for (const [x, y0, y1] of piece.cells) for (let y = y0; y <= y1; y++) given.add(`${x},${y}`);
    }
    if (!given.size) return place.cells;
    const kept: CellRun[] = [];
    for (const [x, y0, y1] of place.cells) {
      let start: number | null = null;
      for (let y = y0; y <= y1 + 1; y++) {
        const mine = y <= y1 && !given.has(`${x},${y}`);
        if (mine && start === null) start = y;
        if (!mine && start !== null) {
          kept.push([x, start, y - 1]);
          start = null;
        }
      }
    }
    return kept;
  }

  /**
   * What a press on a place picks up. An empty piece is still its district's
   * land until somebody moves onto it, so pressing there lifts the district.
   */
  private grabbable(place: Place | null): Place | null {
    if (!place?.of || this.residentOn(place.id)) return place;
    return this.places.find((one) => one.id === place.of) ?? null;
  }

  /* ── the hand ─────────────────────────────────────────────────────── */

  private down(event: FederatedPointerEvent): void {
    if (!this.on || this.busy || event.button !== 0) return;
    if (this.host.covered(event.global.x, event.global.y)) return;
    if (this.liftFlag(event)) return;
    const point = this.camera.toWorld(event.global);
    const place = this.grabbable(this.placeAt(point.x, point.y));
    const who = place ? this.residentOn(place.id) : undefined;
    if (!place || !who) return;
    this.unask();
    this.camera.plugins.pause('drag');
    this.camera.plugins.pause('decelerate');

    const ground = this.groundOf(place);
    const box = boxOf(ground);
    const texture = this.pixi.renderer.generateTexture({
      target: this.host.scene(),
      frame: new Rectangle(box.x, box.y, box.width, box.height),
      resolution: 1,
    });
    const lifted = new Container();
    const land = new Sprite(texture);
    land.position.set(box.x, box.y);
    const cut = new Graphics();
    for (const [x, y0, y1] of ground) {
      cut.rect(x * CELL, -(y1 + 1) * CELL, CELL, (y1 - y0 + 1) * CELL);
    }
    cut.fill(0xffffff);
    land.mask = cut;
    /* A shadow under it, so it reads as held up off the water rather than
       slid along it. */
    const shadow = new Graphics();
    for (const [x, y0, y1] of ground) {
      shadow.rect(x * CELL + 10, -(y1 + 1) * CELL + 14, CELL, (y1 - y0 + 1) * CELL);
    }
    shadow.fill({ color: 0x000000, alpha: 0.28 });
    lifted.addChild(shadow, land, cut);
    lifted.alpha = 0.94;
    this.overlay.addChild(lifted);

    this.hole.clear();
    for (const [x, y0, y1] of ground) {
      this.hole.rect(x * CELL, -(y1 + 1) * CELL, CELL, (y1 - y0 + 1) * CELL);
    }
    this.hole.fill({ color: 0x0b0906, alpha: 0.55 });

    this.carrying = {
      who,
      from: place,
      lifted,
      texture,
      grabbed: { x: point.x, y: point.y },
      fits: null,
      over: place,
    };
    const carried = this.carrying;
    void this.host.moves(who.id).then((fits) => {
      if (this.carrying !== carried) return;
      carried.fits = fits;
      this.aimAt(carried.over);
    });
    this.pixi.canvas.style.cursor = 'grabbing';
    this.say();
    stir();
  }

  private moving(event: FederatedPointerEvent): void {
    if (!this.on) return;
    const point = this.camera.toWorld(event.global);
    if (this.flag) {
      this.carryFlag(event);
      return;
    }
    const carried = this.carrying;
    if (!carried) {
      /* The camera is still dragged by the water, so a district has to be
         taken out of its reach before the press lands on it rather than
         after: by then it has already started panning. */
      const covered = this.host.covered(event.global.x, event.global.y);
      const over = covered ? null : this.grabbable(this.placeAt(point.x, point.y));
      const flag = covered ? null : this.host.flags().at(event.global.x, event.global.y);
      const holds = (flag && this.residentOn(flag)) || (over && this.residentOn(over.id));
      if (holds) this.camera.plugins.pause('drag');
      else this.camera.plugins.resume('drag');
      this.pixi.canvas.style.cursor = holds ? 'grab' : 'default';
      return;
    }
    carried.lifted.position.set(point.x - carried.grabbed.x, point.y - carried.grabbed.y);
    this.pixi.canvas.style.cursor = 'grabbing';
    const over = this.placeAt(point.x, point.y);
    if (over?.id !== carried.over?.id) this.aimAt(over);
    stir();
  }

  private aimAt(over: Place | null): void {
    const carried = this.carrying;
    if (!carried) return;
    carried.over = over;
    this.aim.clear();
    if (over && over.id !== carried.from.id) {
      const why = carried.fits ? carried.fits.places[over.id] : null;
      for (const [x, y0, y1] of this.groundOf(over)) {
        this.aim.rect(x * CELL, -(y1 + 1) * CELL, CELL, (y1 - y0 + 1) * CELL);
      }
      this.aim.fill({ color: why ? SORE : WARM, alpha: why ? 0.38 : 0.3 });
    }
    this.say();
  }

  /* ── a flag ───────────────────────────────────────────────────────── */

  private liftFlag(event: FederatedPointerEvent): boolean {
    const district = this.host.flags().at(event.global.x, event.global.y);
    const who = district ? this.residentOn(district) : undefined;
    if (!district || !who) return false;
    if (!this.host.flags().lift(district, event.global.x, event.global.y)) return false;
    this.unask();
    this.camera.plugins.pause('drag');
    this.camera.plugins.pause('decelerate');
    this.flag = { who, district, foot: null, fits: true, sea: false };
    this.pixi.canvas.style.cursor = 'grabbing';
    this.say();
    stir();
    return true;
  }

  private carryFlag(event: FederatedPointerEvent): void {
    const flag = this.flag;
    if (!flag) return;
    const flags = this.host.flags();
    // Judged at the foot of the pole, which is what stands on the land.
    const foot = flags.carry(event.global.x, event.global.y, flag.fits);
    const fits = foot ? this.grabbable(this.placeAt(foot.x, foot.y))?.id === flag.district : false;
    if (fits !== flag.fits) flags.carry(event.global.x, event.global.y, fits);
    flag.foot = foot;
    this.pixi.canvas.style.cursor = 'grabbing';
    const sea = foot !== null && this.placeAt(foot.x, foot.y) === null;
    if (fits !== flag.fits || sea !== flag.sea) {
      flag.fits = fits;
      flag.sea = sea;
      this.say();
    }
    stir();
  }

  private async plantFlag(): Promise<void> {
    const flag = this.flag;
    this.flag = null;
    this.camera.plugins.resume('decelerate');
    if (!flag) return;
    if (!flag.foot) {
      this.host.flags().putBack();
      this.say();
      return;
    }
    if (flag.sea) {
      this.host.flags().putBack();
      const fits = await this.host.moves(flag.who.id);
      this.ask(flag.who, fits.off);
      return;
    }
    if (!flag.fits) {
      this.host.flags().putBack();
      this.say(`${flag.who.name}'s flag only stands on its own district, so it stays.`);
      return;
    }
    this.busy = true;
    await this.host.plant(flag.district, flag.foot);
    this.busy = false;
    this.refresh();
    this.say(`${flag.who.name}'s flag stands there now.`);
  }

  private async up(event: FederatedPointerEvent): Promise<void> {
    if (this.on && this.flag) {
      await this.plantFlag();
      return;
    }
    const carried = this.carrying;
    if (!this.on || !carried) return;
    const point = this.camera.toWorld(event.global);
    const over = this.placeAt(point.x, point.y);
    const fits = carried.fits ?? (await this.host.moves(carried.who.id));
    if (!over) {
      // Let go over open water: it asks, and whoever it stranded moves closer.
      this.drop();
      this.ask(carried.who, fits.off);
      return;
    }
    if (over.id === carried.from.id) {
      this.drop();
      this.say();
      return;
    }
    const why = fits.places[over.id];
    if (why) {
      this.drop();
      this.say(`${why}, so it stays.`);
      return;
    }
    /* It settles where it was let go while the island is composed again. */
    const box = boxOf(this.groundOf(over));
    const from = boxOf(this.groundOf(carried.from));
    carried.lifted.position.set(box.x - from.x, box.y - from.y);
    const swapped = this.residentOn(over.id);
    this.busy = true;
    this.say(`moving ${carried.who.name}…`);
    const wrong = await this.host.move(carried.who.id, over.id);
    this.busy = false;
    this.drop();
    this.refresh();
    this.say(
      wrong
        ? `${wrong}, so it stays.`
        : swapped
          ? `${carried.who.name} and ${swapped.name} swapped.`
          : `${carried.who.name} moved to the ${over.name.toLowerCase()}.`
    );
  }

  /** Put whatever is held back down, wherever it came from. */
  private drop(): void {
    if (this.flag) {
      this.flag = null;
      this.host.flags().putBack();
    }
    const carried = this.carrying;
    this.carrying = null;
    this.hole.clear();
    this.aim.clear();
    if (carried) {
      carried.lifted.destroy({ children: true });
      carried.texture.destroy(true);
    }
    this.camera.plugins.resume('decelerate');
    stir();
  }

  /* ── the line ─────────────────────────────────────────────────────── */

  /**
   * One line over the top of the island saying what the hand is doing, and
   * the way out. A result stands on it until the next thing happens.
   */
  private say(result?: string): void {
    if (!this.on) return;
    const carried = this.carrying;
    const parts: (string | HTMLElement)[] = [];
    const arriving = this.arriving;
    if (arriving) {
      const over = arriving.over;
      const why = over && arriving.fits?.places[over.id];
      const there = over ? this.residentOn(over.id) : undefined;
      parts.push(
        !over
          ? `let go on a place to bring ${arriving.who.name} back onto the island`
          : why
            ? why
            : there
              ? `bring ${arriving.who.name} in and put ${there.name} away`
              : `bring ${arriving.who.name} onto the ${over.name.toLowerCase()}`
      );
    } else if (this.forgetting) {
      parts.push(`put ${this.forgetting.name} away, or remove it?`);
    } else if (this.flag) {
      parts.push(
        this.flag.sea
          ? `let go on the water to put ${this.flag.who.name} away`
          : this.flag.fits
            ? `standing ${this.flag.who.name}'s flag`
            : `${this.flag.who.name}'s flag can only stand on its own district`
      );
    } else if (carried) {
      const over = carried.over;
      const why = over && carried.fits?.places[over.id];
      const there = over ? this.residentOn(over.id) : undefined;
      parts.push(
        !over
          ? `let go on the water to put ${carried.who.name} away`
          : over.id === carried.from.id
            ? `carrying ${carried.who.name}`
            : why
              ? why
              : there
                ? `swap ${carried.who.name} with ${there.name}`
                : `move ${carried.who.name} to the ${over.name.toLowerCase()}`
      );
    } else {
      parts.push(
        result ??
          'pick up a district or its flag to move it. let go of either on the water to put it away',
        '   ',
        pressing('done', () => this.stop())
      );
    }
    this.line.replaceChildren(...parts);
    this.line.classList.toggle('sore', Boolean(result?.endsWith('so it stays.')));
  }

  /**
   * The window over the island asking whether it really goes. It is the one
   * thing in edit districts that is not on the line, because what it takes
   * with it is every session there, and that deserves being stopped for.
   * Escape, a click off it or "keep it" all leave everything as it was.
   */
  private ask(who: Resident, shifts: string | null): void {
    this.unask();
    this.forgetting = who;
    const back = document.createElement('div');
    back.className = 'settings-back';
    const panel = document.createElement('div');
    panel.className = 'settings founding forgetting';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    back.appendChild(panel);
    let downOutside = false;
    back.addEventListener('pointerdown', (event) => {
      downOutside = event.target === back;
    });
    back.addEventListener('click', (event) => {
      if (downOutside && event.target === back) this.escaped();
      downOutside = false;
    });

    const head = document.createElement('div');
    head.className = 'settings-head';
    const heading = document.createElement('div');
    heading.className = 'settings-name founding-heading';
    heading.textContent = `Off the island?`;
    const title = document.createElement('div');
    title.className = 'settings-who';
    title.appendChild(heading);
    head.appendChild(title);

    const body = document.createElement('div');
    body.className = 'settings-body founding-body';
    const n = this.host.sessions(who.id);
    const hint = document.createElement('p');
    hint.className = 'settings-hint forgetting-cost';
    hint.textContent =
      `Put away, ${who.name} stays on the rack with everything in it and only its district goes back to sea. ` +
      (n === 0
        ? `Removed, it is forgotten.`
        : n === 1
          ? `Removed, it is forgotten and its one session is taken down with it.`
          : `Removed, it is forgotten and all ${n} of its sessions are taken down with it.`) +
      ' Either way the folder stays exactly where it is on disk.' +
      (shifts ? ` ${shifts}` : '');
    const list = document.createElement('div');
    list.className = 'founding-list';
    const away = pressing('put it away', () => void this.putAway(who));
    const remove = pressing(`remove ${who.name}`, () => void this.forget(who));
    remove.classList.add('forgetting-go');
    const keep = pressing('keep it here', () => this.escaped());
    for (const one of [away, remove, keep]) {
      const row = document.createElement('div');
      row.className = 'founding-row';
      row.appendChild(one);
      list.appendChild(row);
    }
    body.append(hint, list);
    panel.append(head, body);
    document.body.appendChild(back);
    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    panel.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
    this.asking = back;
    /* Return takes the gentler of the two, putting it away, since removing
       it takes its sessions with it. */
    askKeys({ yes: () => void this.putAway(who), no: () => this.escaped(), at: back });
    this.say();
  }

  private unask(): void {
    this.forgetting = null;
    this.asking?.remove();
    this.asking = null;
  }

  private async putAway(who: Resident): Promise<void> {
    this.unask();
    this.busy = true;
    this.say(`putting ${who.name} away…`);
    await this.host.putAway(who.id);
    this.busy = false;
    this.refresh();
    this.say(`${who.name} is put away. it is still on the rack.`);
  }

  private async forget(who: Resident): Promise<void> {
    this.unask();
    this.busy = true;
    this.say(`forgetting ${who.name}…`);
    await this.host.forget(who.id);
    this.busy = false;
    this.refresh();
    this.say(`${who.name} is forgotten. the folder is still where it was.`);
  }

  /** Pale ground on the water, thickest at its own edge. */
  private pale(into: Graphics, cells: readonly CellRun[]): void {
    for (const [x, y0, y1] of cells) {
      into.rect(x * CELL, -(y1 + 1) * CELL, CELL, (y1 - y0 + 1) * CELL);
    }
    into.fill({ color: SAND, alpha: 0.14 });
    const land = new Set<string>();
    for (const [x, y0, y1] of cells) for (let y = y0; y <= y1; y++) land.add(`${x},${y}`);
    for (const key of land) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      const edge = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => !land.has(`${x + (dx ?? 0)},${y + (dy ?? 0)}`));
      if (edge) into.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
    }
    into.fill({ color: SAND, alpha: 0.16 });
  }
}

function owns(cells: readonly CellRun[], cell: string): boolean {
  const [cx, cy] = cell.split(',').map(Number) as [number, number];
  return cells.some(([x, y0, y1]) => x === cx && cy >= y0 && cy <= y1);
}

/** A place's extent in world pixels, y down. */
function boxOf(cells: readonly CellRun[]): { x: number; y: number; width: number; height: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [x, a, b] of cells) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, a);
    y1 = Math.max(y1, b);
  }
  return {
    x: x0 * CELL,
    y: -(y1 + 1) * CELL,
    width: (x1 - x0 + 1) * CELL,
    height: (y1 - y0 + 1) * CELL,
  };
}
