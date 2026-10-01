import {
  BufferImageSource,
  Geometry,
  Matrix,
  Mesh,
  RenderTexture,
  Shader,
  Texture,
  type Container,
  type Renderer,
  type Ticker,
} from 'pixi.js';

/**
 * The sea, as water rather than as the colour behind the picture.
 *
 * The artist's own water is a Unity shader that ships with the pack and works
 * nowhere else, so there was never a sprite of it to place. This is ours, built
 * to read the same: shallow and green against the land and deepening to blue
 * out in the open, a line of foam at every foot of cliff with a net of it
 * washing in and out underneath, and short flecks of light coming and going on
 * the open water.
 *
 * Everything it knows about the land it learns by drawing the land. The ground
 * the scene already draws is rendered once into a mask, and how far every patch
 * of sea is from the nearest shore is worked out from that and handed to the
 * shader as a texture. That is the whole of the coupling: the coast is wherever
 * the artist's cliffs actually stand, pixel for pixel, not wherever the cells
 * say they should.
 */

/** World pixels per texel of the distance field. */
const STEP = 2;
/** How far out the shore still reads, in world pixels, before it is open sea. */
const REACH = 384;
/** How much of it is foam, in world pixels, stored at finer precision. */
const NEAR = 64;
/** World pixels per texel of the far field, which only ever sets the colour. */
const DEEP_STEP = 16;
/** How far out the water keeps getting deeper, in world pixels. */
const FAR = 2400;
/** Sea beyond the field in every direction, far enough that the camera never finds its edge. */
const SEA = 40000;

const vertex = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aField;
in vec2 aDeep;
out vec2 vWorld;
out vec2 vField;
out vec2 vDeep;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vWorld = aPosition;
  vField = aField;
  vDeep = aDeep;
}
`;

const fragment = /* glsl */ `#version 300 es
precision highp float;

in vec2 vWorld;
in vec2 vField;
in vec2 vDeep;
out vec4 finalColor;

uniform sampler2D uField;
uniform sampler2D uDeep;
uniform float uTime;
uniform float uFar;
uniform float uReach;
uniform float uNear;
uniform float uRain;
uniform float uStars;
uniform float uMark;
uniform vec3 uLift;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + 17.17));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/* Distance to the nearest edge of a drifting cellular net: the cracks in the
   foam. Each cell's point sways on its own clock so the net shifts rather than
   scrolls. */
float net(vec2 p, float t) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 h = hash2(cell + g);
      vec2 o = 0.5 + 0.38 * sin(t * (0.6 + 0.5 * h) + 6.2831 * h);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return d2 - d1;
}

/* One texel, both distances unpacked: the reach is two bytes, so it has to
   be put back together before it is blended, never after. */
vec2 texel(ivec2 at) {
  ivec2 size = textureSize(uField, 0);
  vec4 t = texelFetch(uField, clamp(at, ivec2(0), size - 1), 0);
  return vec2(t.r, (t.g * 255.0 * 256.0 + t.b * 255.0) / 65535.0);
}

/* The far field is coarse and only ever blended, two bytes of one distance. */
float deepTexel(ivec2 at) {
  ivec2 size = textureSize(uDeep, 0);
  vec4 t = texelFetch(uDeep, clamp(at, ivec2(0), size - 1), 0);
  return (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0;
}

float sampleDeep(vec2 uv) {
  vec2 at = uv * vec2(textureSize(uDeep, 0)) - 0.5;
  ivec2 i = ivec2(floor(at));
  vec2 f = fract(at);
  return mix(
    mix(deepTexel(i), deepTexel(i + ivec2(1, 0)), f.x),
    mix(deepTexel(i + ivec2(0, 1)), deepTexel(i + ivec2(1, 1)), f.x),
    f.y
  );
}

vec2 sampleField(vec2 uv) {
  vec2 at = uv * vec2(textureSize(uField, 0)) - 0.5;
  ivec2 i = ivec2(floor(at));
  vec2 f = fract(at);
  return mix(
    mix(texel(i), texel(i + ivec2(1, 0)), f.x),
    mix(texel(i + ivec2(0, 1)), texel(i + ivec2(1, 1)), f.x),
    f.y
  );
}

/* The open water's own detail: a small wave that rises out of the flat,
   stretches, and sinks back, somewhere new in its patch each time. Laid out on
   the grid it is drawn in, so it is always whole pixels: a light crest, a row of
   shade under it, and on the longest ones a row lifted over the middle. x is the
   crest, y the shade. */
vec2 wavelet(vec2 q, vec2 bin, float t, float seed) {
  vec2 slot = floor(q / bin);
  vec2 local = q - slot * bin;
  vec2 s = slot + seed;
  if (hash(s + 1.3) < 0.35) return vec2(0.0);
  float period = 4.5 + 4.0 * hash(s + 2.1);
  float clock = t / period + hash(s + 4.7);
  float n = floor(clock);
  float life = fract(clock);
  vec2 at = floor(hash2(s + n * 3.17) * (bin - vec2(16.0, 6.0))) + vec2(8.0, 3.0);
  float swell = sin(3.14159 * clamp(life * 1.4, 0.0, 1.0));
  float reach = 2.0 + floor(hash(s + n * 5.5) * 4.0);
  float span = floor(swell * reach + 0.5);
  if (span < 1.0) return vec2(0.0);
  vec2 d = local - at;
  float crest = step(abs(d.x), span) * step(abs(d.y), 0.5);
  float lifted = step(3.0, span) * step(abs(d.x), span - 2.0) * step(abs(d.y + 1.0), 0.5);
  float under = step(abs(d.x + 1.0), span - 1.0) * step(abs(d.y - 1.0), 0.5);
  return vec2(max(crest, lifted), under);
}

void main() {
  /* How many world pixels one screen pixel covers. Most of the time the whole
     island is in view and this is well over one, and the water is still water
     then: every mark below is sized so it never gets thinner than a pixel of
     the screen, rather than fading out. */
  float px = max(fwidth(vWorld.x), fwidth(vWorld.y));
  float u = max(1.0, px);
  /* Close in, whole world pixels, the same grid as the art beside it; far
     out, whole screen pixels. */
  vec2 p = (floor(vWorld / u) + 0.5) * u;
  float fine = 1.0 - smoothstep(1.2, 2.6, px);
  float t = uTime;

  vec2 field = sampleField(vField);
  float near = field.x * uNear;
  float far = field.y * uReach;
  float out_ = sampleDeep(vDeep) * uFar;

  vec3 abyss = vec3(0.105, 0.290, 0.380);
  vec3 deep = vec3(0.160, 0.396, 0.463);
  vec3 mid = vec3(0.208, 0.475, 0.518);
  vec3 shallow = vec3(0.330, 0.600, 0.580);
  vec3 foam = vec3(0.86, 0.95, 0.92);

  /* Deeper the further out, all the way to the edge of the view: the colour
     alone says which way the land is. */
  float open = smoothstep(0.0, uReach, far);
  vec3 c = mix(mid, deep, open);
  c = mix(c, abyss, smoothstep(uReach, uFar, out_));
  float shoal = 1.0 - smoothstep(0.0, 110.0, far);
  c = mix(c, shallow, shoal * shoal * 0.8);

  /* The shadows of clouds, a long way up and slow, too big to read as marks
     on the water. */
  vec2 sky = p / 1100.0 + vec2(t * 0.0035, t * 0.0012);
  float cloud = noise(sky) * 0.65 + noise(sky * 2.3 + 5.1) * 0.35;
  c *= 1.0 - 0.09 * smoothstep(0.48, 0.72, cloud);

  /* Waves coming in: lines that follow the coast outward, a few at a time,
     each broken along its length and gone before it is far from land. */
  float spacing = 30.0;
  float phase = far / spacing + t * 0.10;
  float ring = step(fract(phase), max(1.0, 1.2 * u) / spacing);
  float lapping = smoothstep(10.0, 22.0, far) * (1.0 - smoothstep(40.0, 150.0, far));
  float broken = smoothstep(0.4, 0.62, noise(p / 46.0 + floor(phase) * 7.31 + vec2(t * 0.04, 0.0)));
  c = mix(c, foam, ring * lapping * broken * 0.28);

  /* The wash: how far up the water the foam reaches right now. It breathes in
     and out, and not all along the coast at once. */
  float along = noise(p / 90.0) * 6.2831;
  float wash = 17.0 + 5.0 * sin(t * 1.1 + along);
  float inWash = 1.0 - smoothstep(0.0, wash, near);
  c = mix(c, foam, 0.3 * inWash * inWash * fine);

  /* Measured in world pixels, so a crack is one pixel wide at any size. */
  float cracks = net(p / 12.0 + vec2(0.0, t * 0.04), t) * 12.0;
  float crack = 1.0 - step(0.8, cracks);
  /* Not every edge of the net at once: it frays, and the fraying drifts. */
  float fray = smoothstep(0.2, 0.5, noise(p / 7.0 + vec2(t * 0.3, -t * 0.2)));
  c = mix(c, foam, crack * fray * sqrt(inWash) * 0.7 * fine);

  /* The line right at the foot of the rock, scalloped, and never thinner
     than a pixel on the screen. */
  float lip = max(1.6 + 1.1 * abs(sin(p.x * 0.27 + p.y * 0.21 + t * 0.9)), 1.5 * u);
  float line = 1.0 - step(lip, near);
  c = mix(c, foam, line * 0.9);

  /* Small waves rising and sinking all over the open water, drifting with
     the wind, in whole pixels of whatever grid the view is on. Two sets on
     different grids, so neither's rows ever line up into a pattern. */
  float offShore = smoothstep(24.0, 60.0, far);
  vec2 q = floor((vWorld + vec2(t * 3.0, t * 0.7)) / u);
  vec2 bin = max(vec2(78.0, 44.0) / sqrt(u), vec2(40.0, 24.0));
  vec2 w = wavelet(q, bin, t, 0.0);
  vec2 w2 = wavelet(q + floor(bin * vec2(0.5, 0.37)), bin * vec2(1.3, 1.2), t * 0.9, 41.0);
  w = max(w, w2);
  vec3 crestLight = mix(c, vec3(0.62, 0.83, 0.84), 0.55);
  c = mix(c, c * 0.84, w.y * (1.0 - w.x) * offShore);
  c = mix(c, crestLight, w.x * offShore);

  /* Glints: a single pixel of sun catching a wave, gone almost as soon as it
     is there. */
  vec2 gbin = max(vec2(70.0, 52.0) / sqrt(u), vec2(36.0, 27.0));
  vec2 gslot = floor(q / gbin);
  vec2 gat = floor(hash2(gslot + 71.0) * gbin);
  float glint = step(abs(q.x - gslot.x * gbin.x - gat.x), 0.5) * step(abs(q.y - gslot.y * gbin.y - gat.y), 0.5);
  float flash = pow(max(0.0, sin(t * (0.7 + 0.8 * hash(gslot + 7.7)) + 6.2831 * hash(gslot + 9.3))), 24.0);
  c = mix(c, vec3(0.93, 0.98, 0.96), glint * flash * offShore * 0.9);

  /* Rain on the water: a ring opening out of each drop, whole pixels, gone
     as it widens. Squashed, because the sea is seen from above and a little
     to the south like everything else. */
  if (uRain > 0.01) {
    vec2 rbin = max(vec2(22.0) / sqrt(u), vec2(12.0));
    vec2 rslot = floor(q / rbin);
    vec2 rlocal = q - rslot * rbin;
    float rclock = t * (1.1 + hash(rslot + 3.1)) + hash(rslot + 8.8) * 9.0;
    float rlife = fract(rclock);
    vec2 rat = floor(hash2(rslot + floor(rclock) * 1.7) * (rbin - 6.0)) + 3.0;
    vec2 rd = (rlocal - rat) * vec2(1.0, 1.7);
    float radius = rlife * 4.5;
    float rring = 1.0 - step(0.7, abs(length(rd) - radius));
    float falls = step(hash(rslot + floor(rclock) * 2.3), uRain);
    c = mix(c, foam, rring * falls * (1.0 - rlife) * 0.45);
    c *= 1.0 - uRain * 0.08;
  }

  /* Stars on a still night sea, and on a clear one only: a pixel each, some
     brighter, slowly coming and going. Lifted against the dark the grade is
     about to put on everything, so they still read once it has. */
  if (uStars > 0.01) {
    vec2 sbin = max(vec2(34.0, 30.0) / sqrt(u), vec2(18.0, 16.0));
    vec2 sslot = floor(q / sbin);
    vec2 sat = floor(hash2(sslot + 33.0) * sbin);
    vec2 sd = q - sslot * sbin - sat;
    float star = step(abs(sd.x), 0.5) * step(abs(sd.y), 0.5);
    float bright = hash(sslot + 5.5);
    float twinkle = 0.55 + 0.45 * sin(t * (0.6 + bright) + bright * 40.0);
    float shown = step(0.35, bright) * twinkle * offShore;
    c = mix(c, uLift * mix(0.75, 1.0, bright), star * shown * uStars);
  }

  /* A breath of noise under everything, or a gradient this gentle breaks into
     visible terraces in eight bits a channel. */
  c += (hash(floor(gl_FragCoord.xy)) - 0.5) / 255.0;

  /* While the sky's grade is on, the sea marks itself by drawing a shade
     short of opaque, so the grade can tell water from land and keep snow,
     moss and puddles off it. Premultiplied, so the grade gets the colour
     back exactly. Off, it is opaque like it always was. */
  finalColor = vec4(c * uMark, uMark);
}
`;

export class Water {
  readonly mesh: Mesh<Geometry, Shader>;
  private readonly uniforms: {
    uniforms: {
      uTime: number;
      uRain: number;
      uStars: number;
      uMark: number;
      uLift: Float32Array;
    };
  };

  /**
   * Measure the coast off the ground the scene draws, and lay water under it.
   *
   * `ground` is the scene's own root and `groundTop` where its terrain stops;
   * only the terrain is drawn into the mask, so a shadow or a bridge standing
   * out over the water leaves the water under it.
   */
  constructor(
    renderer: Renderer,
    root: Container,
    groundTop: number,
    island: { x: number; y: number; width: number; height: number }
  ) {
    const originX = island.x - REACH;
    const originY = island.y - REACH;
    const width = Math.ceil((island.width + REACH * 2) / STEP);
    const height = Math.ceil((island.height + REACH * 2) / STEP);
    const land = maskOf(renderer, root, groundTop, originX, originY, width, height);
    const field = fieldOf(land, width, height);

    const source = new BufferImageSource({
      resource: field,
      width,
      height,
      format: 'rgba8unorm',
      scaleMode: 'nearest',
      addressMode: 'clamp-to-edge',
    });
    const texture = new Texture({ source });

    const deepX = island.x - FAR;
    const deepY = island.y - FAR;
    const deepWidth = Math.ceil((island.width + FAR * 2) / DEEP_STEP);
    const deepHeight = Math.ceil((island.height + FAR * 2) / DEEP_STEP);
    const deepLand = new Uint8Array(deepWidth * deepHeight);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!land[y * width + x]) continue;
        const dx = Math.floor((originX + x * STEP - deepX) / DEEP_STEP);
        const dy = Math.floor((originY + y * STEP - deepY) / DEEP_STEP);
        deepLand[dy * deepWidth + dx] = 1;
      }
    }
    const deepSource = new BufferImageSource({
      resource: deepFieldOf(deepLand, deepWidth, deepHeight),
      width: deepWidth,
      height: deepHeight,
      format: 'rgba8unorm',
      scaleMode: 'nearest',
      addressMode: 'clamp-to-edge',
    });
    const deep = new Texture({ source: deepSource });

    const uniforms = {
      uTime: { value: 0, type: 'f32' },
      uReach: { value: REACH, type: 'f32' },
      uNear: { value: NEAR, type: 'f32' },
      uFar: { value: FAR, type: 'f32' },
      uRain: { value: 0, type: 'f32' },
      uStars: { value: 0, type: 'f32' },
      uMark: { value: 1, type: 'f32' },
      uLift: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
    } as const;
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { uField: texture.source, uDeep: deep.source, waterUniforms: uniforms },
    });
    this.uniforms = shader.resources.waterUniforms as Water['uniforms'];

    const x0 = island.x - SEA;
    const y0 = island.y - SEA;
    const x1 = island.x + island.width + SEA;
    const y1 = island.y + island.height + SEA;
    const geometry = new Geometry({
      attributes: {
        aPosition: [x0, y0, x1, y0, x1, y1, x0, y1],
        aField: [x0, y0, x1, y0, x1, y1, x0, y1].map((v, i) =>
          i % 2 ? (v - originY) / (height * STEP) : (v - originX) / (width * STEP)
        ),
        aDeep: [x0, y0, x1, y0, x1, y1, x0, y1].map((v, i) =>
          i % 2 ? (v - deepY) / (deepHeight * DEEP_STEP) : (v - deepX) / (deepWidth * DEEP_STEP)
        ),
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.mesh = new Mesh({ geometry, shader });
    this.mesh.eventMode = 'none';
    /* The field is a texture of its own and a mesh does not own its shader's
       resources, so it goes when the island is redrawn and this is thrown away. */
    this.mesh.once('destroyed', () => {
      texture.destroy(true);
      deep.destroy(true);
    });
  }

  tick(_ticker: Ticker): void {
    this.uniforms.uniforms.uTime = (performance.now() / 1000) % 3600;
  }

  /** What the sky is doing to the sea: rain on it, and stars in it. */
  weather(
    rain: number,
    stars: number,
    ambient: readonly [number, number, number],
    graded: boolean
  ): void {
    const u = this.uniforms.uniforms;
    u.uMark = graded ? 0.5 : 1;
    u.uRain = rain;
    u.uStars = stars;
    for (let i = 0; i < 3; i++) u.uLift[i] = Math.min(3, 0.95 / Math.max(0.2, ambient[i]!));
  }
}

/**
 * The land as a bitmap: one byte a texel, set where terrain was drawn.
 *
 * Everything past the terrain is hidden for the one render and put back
 * straight after, so the mask is exactly the ground and nothing standing on it.
 */
function maskOf(
  renderer: Renderer,
  root: Container,
  groundTop: number,
  originX: number,
  originY: number,
  width: number,
  height: number
): Uint8Array {
  const hidden: Container[] = [];
  root.children.forEach((child, index) => {
    const shadow = 'blendMode' in child && child.blendMode === 'multiply';
    if ((index >= groundTop || shadow) && child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  });
  const target = RenderTexture.create({ width, height, scaleMode: 'nearest' });
  const transform = new Matrix().translate(-originX, -originY).scale(1 / STEP, 1 / STEP);
  renderer.render({ container: root, target, clear: true, clearColor: [0, 0, 0, 0], transform });
  for (const child of hidden) child.visible = true;

  const { pixels } = renderer.extract.pixels(target);
  target.destroy(true);
  const land = new Uint8Array(width * height);
  for (let i = 0; i < land.length; i++) land[i] = (pixels[i * 4 + 3] ?? 0) > 127 ? 1 : 0;
  return land;
}

/**
 * How far each texel of sea is from land, packed for the shader: red is the
 * first few cells out at fine precision, for the foam, and green is the whole
 * reach, for the colour.
 */
function fieldOf(land: Uint8Array, width: number, height: number): Uint8Array {
  const squared = distanceSquared(land, width, height);
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < squared.length; i++) {
    const d = Math.sqrt(squared[i] ?? 0) * STEP;
    out[i * 4] = Math.round(Math.min(1, d / NEAR) * 255);
    const reach = Math.round(Math.min(1, d / REACH) * 65535);
    out[i * 4 + 1] = reach >> 8;
    out[i * 4 + 2] = reach & 255;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/** How far each texel is from land over the whole view, two bytes of it. */
function deepFieldOf(land: Uint8Array, width: number, height: number): Uint8Array {
  const squared = distanceSquared(land, width, height);
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < squared.length; i++) {
    const d = Math.sqrt(squared[i] ?? 0) * DEEP_STEP;
    const far = Math.round(Math.min(1, d / FAR) * 65535);
    out[i * 4] = far >> 8;
    out[i * 4 + 1] = far & 255;
    out[i * 4 + 3] = 255;
  }
  return out;
}

/* Felzenszwalb and Huttenlocher's exact distance transform: a column pass and
   a row pass of the lower envelope of parabolas, in texels squared. */
function distanceSquared(land: Uint8Array, width: number, height: number): Float32Array {
  const INF = 1e20;
  const grid = new Float32Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = land[i] ? 0 : INF;
  const size = Math.max(width, height);
  const f = new Float32Array(size);
  const d = new Float32Array(size);
  const v = new Int32Array(size);
  const z = new Float32Array(size + 1);

  const pass = (n: number): void => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    const cross = (q: number, r: number): number =>
      ((f[q] ?? 0) + q * q - ((f[r] ?? 0) + r * r)) / (2 * q - 2 * r);
    for (let q = 1; q < n; q++) {
      let s = cross(q, v[k] ?? 0);
      while (s <= (z[k] ?? 0)) {
        k--;
        s = cross(q, v[k] ?? 0);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while ((z[k + 1] ?? 0) < q) k++;
      const r = v[k] ?? 0;
      d[q] = (q - r) * (q - r) + (f[r] ?? 0);
    }
  };

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x] ?? INF;
    pass(height);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y] ?? INF;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x] ?? INF;
    pass(width);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x] ?? INF;
  }
  return grid;
}
