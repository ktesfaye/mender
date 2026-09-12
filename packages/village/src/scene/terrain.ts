/* The autotile tables, ported verbatim from the handoff.

   THESE NUMBERS WERE MEASURED, NOT DESIGNED. Each pool is the set of sprites
   the artist actually used for one 8-neighbour signature, tallied off his own
   placements, with the repeats standing in for how often he reached for each
   one. They cannot be re-derived cheaply and must not be "tidied" -- a pool
   that looks redundant is a weighting.

   The compositing model they serve, read out of base-layout.json:

     layer "Dirt"      sorting_order -8   4,135 tiles   full field, under all
     layer "Layer 01"  sorting_order -7   3,315 tiles   grass, painted ON TOP
     layer "Layer 02"  sorting_order -5   3,662 tiles   second grass terrace

   Dirt is the BASE, grass is the OVERLAY. A road, a yard or a field plot is a
   HOLE IN THE GRASS, never dirt drawn on top of it. That is what gives the demo
   its ragged edges: the grass tileset's own fringe tiles overhang the dirt
   beneath. Painting dirt over grass produces a 32px staircase, which is the
   clearest single sign a scene was generated rather than placed.

   Signature bits: N=1 E=2 S=4 W=8 NE=16 SE=32 SW=64 NW=128
   Derived from the 3,315 Layer 01 grass placements, with counts:
     255 interior          12x643  63x42  46x40  81x36
     110 no N (top edge)    1x11   81x8   84x4
     205 no E (right edge) 18x12   64x7   15x3
     155 no S (bottom)     33x13   49x9   36x7   52x3
      55 no W (left edge)  16x10   66x10  19x6
      38 E+S  (TL corner)   0x7     3x1
      19 N+E  (BL corner)  32x3   35x2   29x1
      76 S+W  (TR corner)   2x9    13x1
     137 N+W  (BR corner)  34x8   37x1
     127 no NW (inner)     82x13  85x3  126x2
     191 no SW (inner)     50x10  53x4
     223 no SE (inner)     48x14  51x3
     239 no NE (inner)     80x14                                              */

const G = (n: number) => `terrain-grass/TX Tileset Grass_${n}.png`;
const T = (n: number) => `terrain-tiles/TX Tileset Terrain_${n}.png`;

/** Interior variants, weighted the way the demo weights them: mostly the plain
    tile, with occasional detail tiles carrying pebbles and small flowers.

    `81` WAS IN HERE AND IS THE MIRROR OF THE FAULT THE EDGE POOLS HAD. Six
    `fill` sprites were once found sitting in EDGE and OUTER, where an opaque
    tile cannot depict an edge; nobody then checked the other direction, and a
    SHAPED tile was sitting in the pool drawn on cells with all four cardinals
    filled. `atlas.json` gives 81 `shape: edge-N`, `covers: 0.576`, `opens: [N,
    NE, NW]` -- so one interior draw in sixty punched a 42%-open hole in the
    middle of a meadow with a solid block above it, which is a hard 32-pixel
    line and is exactly what `E3` counts.

    AND THE ARTIST DOES USE IT AS AN INTERIOR -- 102 of his 187 placements have
    grass on all four cardinals -- so this is not a wrong entry, it is a
    CONTEXT-DEPENDENT one, and that is the distinction that matters. It opens
    north, so it is only legal where the cell above it opens south. He draws
    the pair; this pass picks every cell independently and cannot promise the
    partner, which is the same fault the coast had before `joins` and `bonds`
    existed and the same reason a per-cell rule could never see it.

    So it comes out until grass has a joins table of its own. The cost is
    stated rather than hidden: one sixtieth less interior variety, and a sprite
    the artist genuinely uses is unavailable to us until the pass that could
    place it correctly exists. */
export const INTERIOR = [
  ...Array(26).fill(12),
  63,
  63,
  46,
  46,
  14,
  15,
  13,
  44,
  45,
  47,
  60,
  61,
  62,
  28,
  29,
  30,
  31,
  108,
  109,
  110,
  111,
  124,
  125,
  126,
  127,
  140,
  141,
  142,
  143,
  92,
  93,
  94,
  95,
];

/** The grass sprites that cover their cell completely, MEASURED off the kit's
    own alpha channels rather than inferred from the pools above.

    Grass is an overlay on dirt, so a shaped tile leaves the dirt showing --
    that is the whole reason the demo's paths have ragged edges instead of a
    32px staircase. The split is not a judgement call: of the 66 grass sprites
    the scene uses, 34 are 100% opaque and the other 32 top out at 91%, with
    nothing in between. So "can you see the ground here" is answerable exactly,
    which is what a NARROW TRAIL needs -- one is fringe tiles overlapping from
    both sides with no fully bare cell anywhere along it, and a model that only
    knows about bare cells cannot see it at all.

    Note 81 is NOT here. `INTERIOR` lists it as a fill variant and it is 58%
    covered; the pools are weighted draw lists, not a statement about coverage,
    which is exactly why this is measured separately. */
export const OPAQUE_GRASS = new Set([
  12, 13, 14, 15, 17, 20, 28, 29, 30, 31, 44, 45, 46, 47, 60, 61, 62, 63, 92, 93, 94, 95, 108, 109,
  110, 111, 124, 125, 126, 127, 140, 141, 142, 143,
]);

/** Does this grass file cover its cell, or does the dirt beneath show through? */
export function grassCovers(file: string) {
  const n = Number(file.match(/_(\d+)\.png$/)?.[1]);
  return Number.isFinite(n) && OPAQUE_GRASS.has(n);
}

/** The coast and terrace sprites that cover their cell, measured off the kit's
    alpha channels the same way `OPAQUE_GRASS` was: 43 of the 160 are solid to
    all four edges and the rest are shaped.

    THE SHAPED ONES ARE THE MAJORITY, and that is the point of the family --
    a cliff is drawn as stone standing in front of whatever is behind it, so its
    sprite is deliberately open where the water shows past the rock. Draw one
    over open sea with nothing beneath and the sea is what shows, which is
    correct on a shoreline and is a hole anywhere else. */
export const OPAQUE_RIM = new Set([
  37, 38, 39, 45, 46, 47, 66, 74, 98, 106, 114, 193, 194, 196, 197, 205, 208, 333, 336, 397, 400,
  429, 432, 462, 463, 494, 495, 526, 527, 589, 592, 674, 675, 685, 713, 714, 715, 716, 717, 743,
  750, 770, 771,
]);

/** The coast and terrace sprites that are FLAT GRASS -- ground you could stand
    on, rather than the rock face of a cliff.

    Straight out of the kit's own `terrain-classes.json`, which sorts all 160
    into `grass_flat`, `mixed`, `cliff_face`, `cap`, `foot` and `sparse`. Only
    the first is unambiguously a surface.

    THE VILLAGE IS TERRACED AND THE TERRACES ARE JOINED BY THEIR TOPS. Treating
    every coast-and-terrace tile as impassable -- which is what "it is not
    `hasGround`, it is a rim" amounts to -- walls each level off from the next,
    and the artist's own map comes apart into 23 pieces with barely half its
    ground in the largest. It is not that his village cannot be walked; it is
    that the top of a cliff is drawn from the same tileset as its face, and a
    model that cannot tell them apart calls the field on top of the hill a wall.
    With the flat ones admitted, 4,843 of his 5,020 walkable cells are one
    piece.

    AND IT IS `atlas.json`'s LIST, NOT A SECOND ONE. This was 43 numbers of the
    106 the atlas marks passable, and the missing 63 are the stairs, the bridge
    decks and a couple of walkable boulders -- the things whose entire purpose
    is to be walked on. Two models of "can you stand here" is the mistake this
    project has made three times: the router refused to cross a bridge that the
    critic happily walked over, so a yard on the far side of it came out as
    worked ground nobody could reach and no spur could be laid to it.

    Regenerate with:
      python - <<'EOF'
      import json, re
      A = json.load(open('assets/village-base/atlas.json'))['tiles']
      print(sorted(int(re.search(r'_(\d+)\.png', k).group(1))
                   for k, v in A.items()
                   if k.startswith('terrain-tiles/') and v.get('passable')))
      EOF */
export const FLAT_RIM = new Set([
  37, 38, 39, 45, 46, 47, 50, 65, 66, 67, 69, 71, 74, 81, 83, 98, 101, 103, 109, 111, 114, 133, 135,
  146, 194, 196, 197, 205, 206, 207, 208, 237, 238, 239, 240, 301, 302, 303, 304, 333, 334, 335,
  336, 387, 397, 398, 399, 400, 429, 430, 431, 432, 449, 451, 461, 462, 463, 464, 493, 494, 495,
  496, 525, 526, 527, 528, 557, 558, 559, 560, 589, 590, 591, 592, 674, 675, 679, 680, 681, 682,
  683, 684, 685, 686, 706, 707, 711, 712, 713, 714, 715, 716, 717, 718, 743, 744, 745, 746, 747,
  748, 749, 750, 770, 771, 961, 963,
]);

/** Could someone stand on the tile drawn here?

    Answered off a set of whole filenames rather than by parsing the number out
    of one. `reindex()` runs on every commit and the drive suite runs it seven
    thousand times, so a regex here is 12 million matches for an answer that is
    43 fixed strings. */
const FLAT_RIM_FILES = new Set([...FLAT_RIM].map(T));

export function standable(file: string | null | undefined) {
  if (!file) return false;
  return !file.startsWith('terrain-tiles/') || FLAT_RIM_FILES.has(file);
}

/** Does this terrain tile, whatever family it belongs to, hide what is behind
    it? All 32 dirt sprites do; grass and the coast are mixed.

    THE QUESTION EVERY GROUND MODEL IN HERE FAILS TO ASK. `hasGround` answers
    "is there a surface on this cell", which is what a brush needs and is not
    what the eye sees: a cell can carry two tiles, be perfectly good land in
    every check, and still show the water backdrop through both of them. */
export function covers(file: string | null | undefined) {
  if (!file) return false;
  if (file.startsWith('terrain-dirt/')) return true;
  const n = Number(file.match(/_(\d+)\.png$/)?.[1]);
  if (!Number.isFinite(n)) return false;
  if (file.startsWith('terrain-grass/')) return OPAQUE_GRASS.has(n);
  if (file.startsWith('terrain-tiles/')) return OPAQUE_RIM.has(n);
  return false;
}

/* ---- the meadow's edge -------------------------------------------------

   THE POOLS ARE THE ARTIST'S OWN, AND SO IS THE WEIGHTING. Every entry is a
   sprite `atlas.json` gives the matching `shape` -- `edge-E`, `outer-TR`,
   `inner-NW` -- and the repeats are proportional to how many times he placed
   it, counted off `base-layout.json` (the number in brackets below). Eight
   slots per pool, so the ratios survive rounding.

   SIX OF THESE WERE `fill` SPRITES, and they are the fault you see in a
   screenshot. `15` and `46` sat in `EDGE.E`, `29` in `OUTER.BL`, `13` in
   `OUTER.TR`, `126` in `INNER.NW`, `108` in `INNER.NE` -- all six opaque
   interior blocks with `opens: []`. An opaque tile cannot depict an edge, so
   one draw in seven along every meadow boundary came out as a razor-straight
   32-pixel line where the grass should overhang. It is the single most
   recognisable mark of generated content in this art, and it is what the
   critic scores as E3/E4.

   Two sprites the old pools had never reached come back with them: `69`
   (edge-W, 33 placements) and `83` (inner-NE, 8). Nothing was wrong with them;
   there was simply no slot left once a fill tile had taken one. */
export const EDGE: Record<'N' | 'E' | 'S' | 'W', number[]> = {
  // grass missing to the north: 81(187) 1(157) 84(68) 4(50)
  N: [81, 81, 81, 1, 1, 1, 84, 4],
  // 64(114) 18(71) 67(60) 21(39)
  E: [64, 64, 64, 18, 18, 67, 67, 21],
  // 33(192) 49(113) 36(83) 52(65)
  S: [33, 33, 33, 49, 49, 36, 36, 52],
  // 16(133) 66(70) 19(46) 69(33)
  W: [16, 16, 16, 16, 66, 66, 19, 69],
};
export const OUTER: Record<'TL' | 'TR' | 'BL' | 'BR', number[]> = {
  TL: [0, 0, 0, 0, 0, 0, 0, 3], // 0(76) 3(15)
  BL: [32, 32, 32, 32, 32, 32, 32, 35], // 32(67) 35(15)
  TR: [2, 2, 2, 2, 2, 2, 2, 5], // 2(73) 5(7)
  BR: [34, 34, 34, 34, 34, 34, 37, 37], // 34(74) 37(18)
};
export const INNER: Record<'NW' | 'NE' | 'SW' | 'SE', number[]> = {
  NW: [82, 82, 82, 82, 82, 82, 85, 85], // 82(65) 85(17)
  SW: [50, 50, 50, 50, 50, 50, 50, 53], // 50(61) 53(12)
  SE: [48, 48, 48, 48, 48, 48, 48, 51], // 48(67) 51(14)
  NE: [80, 80, 80, 80, 80, 80, 80, 83], // 80(63) 83(8)
};

/* ---- the coast --------------------------------------------------------

   MEASURED, WHOLE, FROM ALL 1,684 OF THE ARTIST'S COAST TILES. Regenerate with
   `python tools/coasttables.py`; do not hand-edit and do not "tidy" a pool that
   looks redundant, because the repeats ARE the weighting.

   THE SHORELINE IS TWO CELLS DEEP ON ITS SOUTH-FACING SIDE AND ONE EVERYWHERE
   ELSE. That asymmetry is not decoration, it is perspective: where the land is
   to the NORTH you are looking at the front of the cliff, so the artist gives it
   a grass LIP that spills over the top and a FACE hanging below it. On the other
   three sides you only ever see the edge, and one cell says everything.

   A LIP IS A COAST TILE WITH LAND IN ANY OF ITS EIGHT NEIGHBOURS, and the
   diagonal is the half that was missing. An earlier table was built from the
   four cardinal neighbours only, and so was the ring the brush laid: a cell
   touching land at the corner alone got no tile, and 88 of the artist's shapes
   collapsed into 21. Everything else fell through to a cardinal-only fallback
   that knows N/E/S/W and nothing about corners -- which is what a hard right
   angle on a headland IS. The tile that would have rounded it existed in the
   kit, was used 125 times by the artist for exactly that shape, and was in no
   table to be found: 33 and 41 for land to the south-east, 35 and 43 for the
   south-west, 97 and 105 for the north-east, 99 and 107 for the north-west.

   An earlier version of this file learned ONE row and learned it from the wrong
   one: signature 255 -- ground on all eight sides -- was dismissed as "inland
   cliff lips between terrace levels, not shoreline", and those 230 placements
   are exactly the lip row of every south-facing coast. The face row was then
   drawn where the lip belongs, so the grass stopped dead against bare stone and
   the boundary read as a hard edge. It is the one thing that made a generated
   coast obviously generated.

   Both tables are keyed on the 8-neighbour GROUND signature -- grass or dirt,
   NOT other rim tiles -- because what a coast tile has to depict is where the
   land is, and a neighbouring cliff is not land. Same bit order as
   `signature()`: N=1 E=2 S=4 W=8 NE=16 SE=32 SW=64 NW=128.

   The FACE table has ONE entry and that is correct rather than lossy: a face
   hangs a cell below a lip, so every one of its neighbours is coast and none of
   them is land, and all 253 of them key on signature 0. The corner variants
   that used to live here are lips now, which is where the artist put them.   */

export const LIP: Record<number, number[]> = {
  145: [46, 46, 38, 38, 196, 196, 197, 98, 194, 193, 106, 206], // n=230
  100: [130, 130, 34, 142, 134, 226, 228, 225, 229, 78, 290, 292], // n=202
  200: [109, 109, 355, 355, 69, 69, 67, 67, 101, 387, 483, 77], // n=59
  50: [71, 71, 111, 111, 481, 385, 65, 353, 73, 449, 103, 79], // n=53
  36: [70, 70, 34, 34, 289, 289, 134, 134, 142, 42, 292, 78], // n=46
  68: [134, 134, 134, 34, 34, 70, 70, 142, 142, 293, 42, 289], // n=45
  250: [67, 67, 109, 109, 385, 355, 449, 481, 483, 101, 451, 111], // n=45
  17: [98, 98, 98, 38, 38, 38, 193, 193, 193, 196, 196, 197], // n=42
  129: [98, 98, 98, 38, 38, 38, 46, 46, 197, 197, 106, 194], // n=39
  32: [33, 33, 33, 33, 33, 33, 33, 33, 41, 34, 292, 481], // n=34
  64: [35, 35, 35, 35, 35, 35, 35, 35, 43, 43, 712, 228], // n=34
  179: [39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 47], // n=32
  118: [131, 131, 131, 131, 135, 135, 135, 135, 139, 139, 143, 143], // n=30
  16: [97, 97, 97, 97, 97, 97, 97, 105, 105, 105, 385, 71], // n=29
  236: [129, 129, 129, 129, 129, 133, 133, 133, 133, 141, 137], // n=29
  128: [99, 99, 99, 99, 99, 99, 99, 107, 107, 107, 78, 70], // n=26
  217: [37, 37, 37, 37, 37, 37, 37, 37, 37, 45, 45, 45], // n=25
  72: [67, 67, 67, 67, 67, 67, 67, 101, 101, 75, 69, 45], // n=24
  18: [71, 71, 71, 71, 71, 111, 111, 65, 65, 385, 449, 353], // n=23
  34: [65, 65, 65, 65, 103, 103, 103, 353, 353, 39, 73, 111], // n=23
  186: [103, 103, 387, 387, 676, 676, 67, 483, 481, 451, 111, 101], // n=20
  178: [99, 99, 99, 99, 99, 107, 107, 107, 107, 708, 708, 708], // n=19
  232: [69, 69, 69, 69, 69, 737, 737, 737, 75, 67, 451, 109], // n=19
  234: [67, 67, 109, 109, 101, 101, 103, 73, 769, 451, 65, 449], // n=19
  136: [67, 67, 67, 69, 69, 69, 109, 109, 387, 133, 77, 101], // n=18
  216: [97, 97, 97, 97, 97, 97, 97, 105, 105, 105, 705, 705], // n=18
  218: [111, 111, 481, 481, 73, 387, 673, 385, 109, 769, 101, 65], // n=18
  122: [353, 353, 353, 353, 73, 772, 67, 385, 355, 111, 103, 449], // n=17
  114: [71, 71, 71, 71, 71, 71, 71, 740, 740, 740, 353, 79], // n=15
  245: [289, 289, 289, 290, 290, 142, 142, 292, 292, 293, 293, 34], // n=13
  54: [738, 738, 738, 738, 738, 135, 135, 135, 139, 139, 73, 718], // n=12
  204: [739, 739, 739, 739, 133, 133, 133, 129, 129, 67, 711, 137], // n=12
  201: [707, 707, 707, 707, 707, 37, 37, 37, 37, 77, 679], // n=9
  51: [706, 706, 706, 706, 706, 706, 706, 706, 39, 39, 39, 686], // n=8
  8: [67, 67, 67, 67, 67, 67, 67, 67, 67, 109, 109, 744], // n=7
  88: [97, 97, 97, 97, 97, 97, 97, 97, 705, 705, 705, 705], // n=6
  102: [135, 135, 135, 135, 134, 134, 290, 290, 143, 143, 336, 336], // n=6
  108: [133, 133, 133, 133, 141, 141, 141, 141, 134, 134, 333, 333], // n=6
  246: [135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135], // n=6
  2: [65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 749, 749], // n=5
  82: [71, 71, 71, 71, 71, 71, 71, 71, 71, 71, 673, 673], // n=5
  229: [34, 34, 42, 42, 290, 290, 142, 142, 134, 134], // n=5
  243: [35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 43, 43], // n=5
  249: [33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 41, 41], // n=5
  252: [133, 133, 133, 133, 133, 133, 133, 133, 133, 133, 133, 133], // n=5
  58: [772, 772, 772, 772, 772, 772, 676, 676, 676, 67, 67, 67], // n=4
  85: [134, 134, 134, 134, 134, 134, 134, 134, 134, 134, 134, 134], // n=4
  168: [69, 69, 69, 69, 69, 69, 69, 69, 69, 77, 77, 77], // n=4
  181: [42, 42, 42, 142, 142, 142, 289, 289, 289, 34, 34, 34], // n=4
  202: [769, 769, 769, 769, 769, 769, 483, 483, 483, 67, 67, 67], // n=4
  81: [37, 37, 37, 37, 45, 45, 45, 45, 301, 301, 301, 301], // n=3
  84: [131, 131, 131, 131, 131, 131, 131, 131, 70, 70, 70, 70], // n=3
  90: [101, 101, 101, 101, 111, 111, 111, 111, 673, 673, 673, 673], // n=3
  153: [46, 46, 46, 46, 38, 38, 38, 38, 37, 37, 37, 37], // n=3
  162: [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99], // n=3
  165: [134, 134, 134, 134, 134, 134, 134, 134, 134, 134, 134, 134], // n=3
  4: [135, 135, 135, 135, 135, 135, 78, 78, 78, 78, 78, 78], // n=2
  49: [41, 41, 41, 41, 41, 41, 33, 33, 33, 33, 33, 33], // n=2
  66: [673, 673, 673, 673, 673, 673, 35, 35, 35, 35, 35, 35], // n=2
  98: [35, 35, 35, 35, 35, 35, 449, 449, 449, 449, 449, 449], // n=2
  106: [109, 109, 109, 109, 109, 109, 385, 385, 385, 385, 385, 385], // n=2
  115: [71, 71, 71, 71, 71, 71, 35, 35, 35, 35, 35, 35], // n=2
  117: [142, 142, 142, 142, 142, 142, 142, 142, 142, 142, 142, 142], // n=2
  130: [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99], // n=2
  137: [67, 67, 67, 67, 67, 67, 69, 69, 69, 69, 69, 69], // n=2
  147: [39, 39, 39, 39, 39, 39, 197, 197, 197, 197, 197, 197], // n=2
  170: [67, 67, 67, 67, 67, 67, 103, 103, 103, 103, 103, 103], // n=2
  220: [133, 133, 133, 133, 133, 133, 141, 141, 141, 141, 141, 141], // n=2
  228: [134, 134, 134, 134, 134, 134, 34, 34, 34, 34, 34, 34], // n=2
  19: [38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38, 38], // n=1
  38: [103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 103], // n=1
  40: [77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77], // n=1
  55: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
  76: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
  112: [353, 353, 353, 353, 353, 353, 353, 353, 353, 353, 353, 353], // n=1
  124: [133, 133, 133, 133, 133, 133, 133, 133, 133, 133, 133, 133], // n=1
  161: [304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304, 304], // n=1
  164: [34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34], // n=1
  182: [135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135], // n=1
  191: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
  205: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
  209: [45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45], // n=1
  213: [42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42], // n=1
  221: [37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37], // n=1
  224: [69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69, 69], // n=1
  231: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
  233: [33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33], // n=1
  253: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
};
export const LIP_CARD: Record<number, number[]> = {
  1: [38, 38, 98, 98, 46, 46, 196, 197, 193, 194, 106, 205], // n=318
  4: [34, 134, 142, 130, 70, 289, 78, 226, 293, 225, 228, 229], // n=301
  8: [67, 67, 67, 69, 69, 109, 97, 101, 355, 77, 387, 705], // n=156
  2: [71, 71, 71, 65, 65, 111, 99, 353, 103, 385, 449, 107], // n=152
  10: [67, 109, 101, 385, 387, 103, 111, 481, 353, 483, 73, 449], // n=134
  0: [33, 33, 35, 35, 97, 97, 99, 99, 105, 107, 43, 41], // n=125
  6: [135, 135, 135, 135, 135, 131, 131, 139, 139, 143, 738, 103], // n=56
  12: [133, 133, 133, 133, 133, 129, 129, 129, 141, 739, 137, 134], // n=56
  3: [39, 39, 39, 39, 39, 39, 39, 39, 35, 706, 47, 686], // n=50
  9: [37, 37, 37, 37, 37, 37, 45, 45, 33, 707, 46, 77], // n=45
  5: [134, 134, 134, 142, 142, 289, 289, 34, 34, 42, 290, 292], // n=32
  13: [66, 66, 66, 66, 66, 66, 66, 66, 37, 37, 37, 37], // n=3
  7: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=2
  15: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], // n=1
};

export const FACE: Record<number, number[]> = {
  0: [78, 78, 70, 130, 229, 228, 129, 131, 225, 226, 138, 137], // n=253
};
export const FACE_CARD: Record<number, number[]> = {
  0: [78, 78, 70, 130, 229, 228, 129, 131, 225, 226, 138, 137], // n=253
};

export type Has = (x: number, y: number) => boolean;

function coastTile(
  exact: Record<number, number[]>,
  card: Record<number, number[]>,
  ground: Has,
  cx: number,
  cy: number,
  r: number
): string | null {
  /* Written out rather than looped. The obvious raster loop (top row left to
     right, then middle, then bottom) yields NW=1 N=2 NE=4 W=8 E=16 SW=32 S=64
     SE=128, which is NOT the order these tables are keyed in -- and a table
     lookup under a permuted key does not throw, it just misses every entry and
     falls through to null. The whole coast came out bare. The cardinal fallback
     also depends on N/E/S/W being the low four bits. */
  const s =
    (ground(cx, cy + 1) ? 1 : 0) |
    (ground(cx + 1, cy) ? 2 : 0) |
    (ground(cx, cy - 1) ? 4 : 0) |
    (ground(cx - 1, cy) ? 8 : 0) |
    (ground(cx + 1, cy + 1) ? 16 : 0) |
    (ground(cx + 1, cy - 1) ? 32 : 0) |
    (ground(cx - 1, cy - 1) ? 64 : 0) |
    (ground(cx - 1, cy + 1) ? 128 : 0);
  /* NO LAND ANYWHERE IN THE EIGHT MEANS OPEN WATER, and the cardinal fallback
     must not be asked. `s & 15` throws the diagonals away, so "land at the
     corner only" and "no land at all" arrive at the same bucket -- and since
     the corner pieces went into the tables, that bucket has an answer. Every
     cell of open sea inside a fresh hole then came back dressed as a shore: a
     size-3 tap on the plateau drew fourteen cells of stone with not a drop of
     blue in it. The exact tables are still consulted first, so `FACE`, whose
     every placement genuinely keys on 0, is unaffected. */
  const pool = exact[s] ?? (s ? card[s & 15] : undefined);
  return pool ? T(pool[(r * pool.length) | 0]) : null;
}

/** The cell where the land stops: grass on top, the cliff starting to show.
    Sits on the ring of non-ground cells around the island. */
export function lipSprite(ground: Has, cx: number, cy: number, r: number) {
  return coastTile(LIP, LIP_CARD, ground, cx, cy, r);
}

/** The cliff face, one cell below a lip whose ground is to the north. */
export function faceSprite(ground: Has, cx: number, cy: number, r: number) {
  return coastTile(FACE, FACE_CARD, ground, cx, cy, r);
}

/** Every coast sprite the tables can reach, so the preloader can warm them. */
export function reachableRim(): string[] {
  const want = new Set<number>();
  for (const t of [LIP, LIP_CARD, FACE, FACE_CARD])
    for (const pool of Object.values(t)) pool.forEach((n) => want.add(n));
  return [...want].map(T);
}

function pick(pool: number[], r: number) {
  return pool[(r * pool.length) | 0];
}

/** A deterministic stream. Seeded so a re-render never reshuffles a scene. */
export function rng(seed: number) {
  let s = seed || 1;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** Stable per-cell hash, so a cell's variant is a function of where it is
    rather than of when it was drawn.

    IT HAS TO AVALANCHE, and the first version did not. `(x*73856093) ^
    (y*19349663)` never mixes: the two products land in different bit ranges, so
    the TOP bits of the result are almost entirely x's, and stepping y by one
    moves them by about 2^-7 of their range. Read as a whole number that is
    fine, which is why the meadow -- `cellHash % INTERIOR.length`, the low bits
    -- always looked varied.

    The coast reads the top bits instead (`pool[(r * pool.length) | 0]`, where
    `r` is the hash scaled to 0..1), and there it meant a run of cells down one
    column drew the SAME TILE every time: fifteen copies of Terrain_355 stacked
    into a straight grey seam. That is the reported "we still can't handle
    corner pieces or just some side pieces" -- the pieces were all present, all
    identical, and a repeated edge tile reads as no edge at all. The artist's
    own shores wander a boulder at a time and never repeat more than twice.

    A murmur-style finaliser fixes it in both directions at once. `>>> 1` keeps
    the old non-negative 31-bit range, so `% n` still works where it is used. */
export function cellHash(x: number, y: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2545f491);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2d);
  return (h ^ (h >>> 16)) >>> 1;
}

/* ---- the solid meadow tile, weighted the way HE weighted it --------------

   THE SAME FAULT `redress`'s ARGMAX HAD, ONE FAMILY ALONG, AND IT WAS FIXED
   FOR THE COAST AND LEFT HERE. That note reads: *the argmax never ties, so
   every cell with the same signature got the same answer -- his west-facing
   shore uses 19 pieces with the commonest on 21%, and that pass drew it with 5
   on 92%.* The meadow had the identical shape of bug from a different
   direction: three separate files each carried

       const OPAQUE_GRASS = 'terrain-grass/TX Tileset Grass_12.png'

   as the answer to "a solid meadow tile goes here", `resurface` ranked its
   pools by a sprite's GLOBAL `used` count and so resolved every tie the same
   way, and the hand-typed `INTERIOR` list weighted the plain tile at 26 of 59.
   Measured on the composed map the commonest interior fill came out at 66.8%
   against the artist's 53.2%, and on the hand-built districts in `study/` at
   91-94%. His meadow is textured and ours is a sheet.

   THE WEIGHTS ARE HIS AND ARE NOT TYPED IN. `atlas.json`'s `grass.pools`
   already records, per neighbourhood, which piece he used and HOW OFTEN --
   that is the whole reason it exists rather than `facing`, which is deduped and
   gives every candidate a 1. Signature 255 is the full interior, and his hand
   there is 34 opaque sprites over 3,323 placements with the plain tile on 52.5%.

   AND IT IS PROVABLY FREE OF EVERY SEAM RULE, which is the only reason it may
   be done at all. `CLAUDE.md` records that wiring `pools` into `grassSprite` in
   place of its thirteen hand-typed lists made the map WORSE -- E3 2 -> 3, E4
   1 -> 4 -- because more variety per cell is more seam mismatches. That is true
   of the SHAPED pools and it cannot be true here: every candidate is filtered
   to `covers >= 1`, and all 34 of them carry a uniform grass seam on all four
   sides (checked, 34 of 34). Two opaque fills side by side cut nothing, notch
   nothing and put no hard line anywhere, so E1-E4 cannot move whichever one is
   chosen. E5 cannot move either, because the pool IS the set he used here.

   The two sprites the hand list was missing, 17 and 20, come back with it. */

type FillPool = { file: string; upto: number }[];
/** Until the atlas arrives: the hand-typed list, evenly weighted. Every entry
    is in `OPAQUE_GRASS`, so the fallback keeps the same guarantee. */
let FILL: FillPool = INTERIOR.map((n, i) => ({ file: G(n), upto: i + 1 }));
let FILL_TOTAL = INTERIOR.length;

/** Take the interior fill weights off `atlas.json`. Called once, where the
    atlas is loaded -- there is one reader of that file and this is not a
    second one, it is the same one handing over a table. */
export function setInteriorPool(
  atlas:
    | {
        tiles?: Record<string, { covers?: number }>;
        grass?: { pools?: Record<string, Record<string, number>> };
      }
    | null
    | undefined
) {
  const pool = atlas?.grass?.pools?.['255'];
  const tiles = atlas?.tiles;
  if (!pool || !tiles) return;
  const out: FillPool = [];
  let total = 0;
  for (const [file, count] of Object.entries(pool)) {
    if (!file.startsWith('terrain-grass/')) continue;
    if ((tiles[file]?.covers ?? 0) < 1) continue;
    total += count;
    out.push({ file, upto: total });
  }
  if (!out.length || total <= 0) return;
  FILL = out;
  FILL_TOTAL = total;
}

/** The solid meadow tile for this cell. Positional, so a cell's variant is a
    fact about where it is and not about when it was drawn -- which is what
    `cellHash` is for and why it has to avalanche. */
export function interiorFill(x: number, y: number): string {
  const u = (cellHash(x, y) / 0x80000000) * FILL_TOTAL;
  for (const e of FILL) if (u < e.upto) return e.file;
  return FILL[FILL.length - 1].file;
}

/** A plain interior tile: what the artist lays where a surface carries nothing. */
export function interiorGrass(x: number, y: number) {
  return interiorFill(x, y);
}

/** Resolve one grass cell against its neighbourhood. */
export function grassSprite(has: Has, cx: number, cy: number, r: number): string {
  const N = has(cx, cy + 1),
    E = has(cx + 1, cy),
    S = has(cx, cy - 1),
    W = has(cx - 1, cy);
  const card = (N ? 1 : 0) + (E ? 1 : 0) + (S ? 1 : 0) + (W ? 1 : 0);

  if (card === 4) {
    const NE = has(cx + 1, cy + 1),
      SE = has(cx + 1, cy - 1);
    const SW = has(cx - 1, cy - 1),
      NW = has(cx - 1, cy + 1);
    if (!NW) return G(pick(INNER.NW, r));
    if (!NE) return G(pick(INNER.NE, r));
    if (!SW) return G(pick(INNER.SW, r));
    if (!SE) return G(pick(INNER.SE, r));
    /* AND THIS STAYS THE HAND-TYPED LIST, WHICH WAS TRIED THE OTHER WAY AND
       MEASURED. Drawing here from `interiorFill` -- his own weights at
       signature 255 -- took the freehand spiral E3 19 -> 21 and E5 33 -> 36,
       and bought NOTHING: `resurface` scores its choice against the seam and
       breaks its ties on the same weights, so the composed map lands on his
       53.2% either way. Same answer this project already recorded when a
       bigger per-cell pool was wired into these thirteen lists, and the same
       reason: the fault was never in the cell. The weights belong in the pass
       that can see the neighbour. */
    return G(pick(INTERIOR, r));
  }
  if (card === 3) {
    if (!N) return G(pick(EDGE.N, r));
    if (!E) return G(pick(EDGE.E, r));
    if (!S) return G(pick(EDGE.S, r));
    return G(pick(EDGE.W, r));
  }
  if (card === 2) {
    if (E && S) return G(pick(OUTER.TL, r));
    if (N && E) return G(pick(OUTER.BL, r));
    if (S && W) return G(pick(OUTER.TR, r));
    if (N && W) return G(pick(OUTER.BR, r));
    /* Two opposite sides -- a one-cell isthmus. The demo has none, so this is
       a fall-through and NOT an interior: `interiorFill` draws from his pool at
       signature 255 and may only answer for signature 255. Handing it a shape
       he never drew scored E5 33 -> 36 on a freehand spiral. */
    return G(pick(INTERIOR, r));
  }
  // spurs and islands: the demo never makes them, and the mask cleaner removes
  // them before we get here. Same reason as the isthmus above -- not an
  // interior, so not his interior pool.
  return G(pick(INTERIOR, r));
}

/** Every grass sprite the tables can reach. The preloader asks for exactly
    these: guessing a range instead fires doomed requests that read as missing
    assets, and the baked scene only ever used a subset of the pools. */
export function reachableGrass(): string[] {
  const want = new Set<number>();
  /* Every opaque fill, not just the hand-typed list: `setInteriorPool` takes
     the interior weights off the artist's own pool at signature 255, which is
     that list plus `17` and `20`. Guessing a range fires doomed requests that
     read as missing assets; this is the superset the draw can reach. */
  OPAQUE_GRASS.forEach((n) => want.add(n));
  INTERIOR.forEach((n) => want.add(n));
  for (const k of ['N', 'E', 'S', 'W'] as const) EDGE[k].forEach((n) => want.add(n));
  for (const k of ['TL', 'TR', 'BL', 'BR'] as const) OUTER[k].forEach((n) => want.add(n));
  for (const k of ['NW', 'NE', 'SW', 'SE'] as const) INNER[k].forEach((n) => want.add(n));
  return [...want].map(G);
}
