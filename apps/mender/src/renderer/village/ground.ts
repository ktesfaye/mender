import { boundsOf, CELL, standingGround, type District, type Layout } from '@mender/village';
import { Container, Graphics } from 'pixi.js';

/**
 * What the pointer is over, and showing it.
 *
 * Pointing at a district is not hitting a sprite. A tree on the crop farm's
 * edge is the farm, the ground under it is the farm, and the gap between two of
 * its buildings is still the farm — so the hit test is against the land, cell by
 * cell, and it is a map lookup rather than a walk down a scene graph.
 */

/** Where a district sits in the world, in the pixels the renderer places in. */
export interface DistrictBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The middle of it on screen, which is where the camera looks. */
  centerX: number;
  centerY: number;
}

export class Ground {
  /** The wash that says what the pointer is over. Add it above the world. */
  readonly overlay = new Container();

  private readonly owner = new Map<string, District>();
  private readonly standing: ReadonlySet<string>;
  private readonly highlight = new Graphics();
  private over: District | null = null;

  constructor(districts: readonly District[], layout: Layout) {
    for (const district of districts) {
      for (const [y, x0, x1] of district.cells) {
        for (let x = x0; x <= x1; x++) this.owner.set(`${x},${y}`, district);
      }
    }
    this.standing = standingGround(layout);
    this.overlay.addChild(this.highlight);
    this.overlay.eventMode = 'none';
  }

  /** The district under a point in world coordinates, or null for open sea. */
  at(worldX: number, worldY: number): District | null {
    // Screen y runs down and the world's runs up, so the world point handed in
    // by the viewport is already negated; put it back before asking the grid.
    const cx = Math.floor(worldX / CELL);
    const cy = Math.floor(-worldY / CELL);
    return this.owner.get(`${cx},${cy}`) ?? null;
  }

  get hovered(): District | null {
    return this.over;
  }

  /**
   * Light on the district under the pointer.
   *
   * A warm wash, not an outline and not a tint: an outline is a selection box
   * from a different kind of app, and tinting would mean touching every sprite
   * standing on the ground. This is one shape over the top, and it reads as the
   * sun coming out on that part of the island.
   */
  hover(district: District | null): void {
    if (district === this.over) return;
    this.over = district;
    this.highlight.clear();
    if (!district) return;
    // The footprint includes the stone ring that holds it up, and light laid
    // over a cliff face is a bright square hanging in the sea. Only the ground
    // you could walk on takes it.
    for (const [y, x0, x1] of district.cells) {
      for (let x = x0; x <= x1; x++) {
        if (!this.standing.has(`${x},${y}`)) continue;
        this.highlight.rect(x * CELL, -(y + 1) * CELL, CELL, CELL);
      }
    }
    this.highlight.fill({ color: 0xffe9b0, alpha: 0.16 });
  }
}

export function districtBounds(district: District): DistrictBounds {
  const box = boundsOf(district);
  return {
    x: box.x,
    y: -(box.y + box.height),
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: -(box.y + box.height / 2),
  };
}
