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
/** Sea beyond the field in every direction, far enough that the camera never finds its edge. */
const SEA = 40000;

const vertex = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aField;
out vec2 vWorld;
out vec2 vField;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vWorld = aPosition;
  vField = aField;
}
`;

const fragment = /* glsl */ `#version 300 es
precision highp float;

in vec2 vWorld;
in vec2 vField;
out vec4 finalColor;

uniform sampler2D uField;
uniform float uTime;
uniform float uReach;
uniform float uNear;

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

void main() {
  /* Whole world pixels, so every mark on the water lands on the same grid as
     the art standing next to it. */
  vec2 p = floor(vWorld) + 0.5;
  /* How many world pixels one screen pixel covers. Zoomed out, a one-pixel
     line is less than a pixel wide and would crawl, so the fine work fades. */
  float px = max(fwidth(vWorld.x), fwidth(vWorld.y));
  float fine = 1.0 - smoothstep(1.2, 2.6, px);
  float t = uTime;

  vec2 field = sampleField(vField);
  float near = field.x * uNear;
  float far = field.y * uReach;

  vec3 deep = vec3(0.141, 0.357, 0.427);
  vec3 mid = vec3(0.224, 0.502, 0.529);
  vec3 shallow = vec3(0.365, 0.651, 0.624);

  float open = smoothstep(0.0, uReach, far);
  vec3 c = mix(mid, deep, open);
  float shoal = 1.0 - smoothstep(0.0, 150.0, far);
  c = mix(c, shallow, shoal * shoal * 0.75);

  /* Slow broad swells of light across the open water. */
  float swell = noise(p / 260.0 + vec2(t * 0.020, t * 0.012));
  swell += 0.5 * noise(p / 110.0 - vec2(t * 0.035, -t * 0.02));
  c *= 0.96 + 0.05 * swell;

  /* The wash: how far up the water the foam reaches right now. It breathes in
     and out, and not all along the coast at once. */
  float along = noise(p / 90.0) * 6.2831;
  float wash = 17.0 + 5.0 * sin(t * 1.1 + along);
  float inWash = 1.0 - smoothstep(0.0, wash, near);

  vec3 foam = vec3(0.86, 0.95, 0.92);
  c = mix(c, foam, 0.3 * inWash * inWash * fine);

  /* Measured in world pixels, so a crack is one pixel wide at any size. */
  float cracks = net(p / 12.0 + vec2(0.0, t * 0.04), t) * 12.0;
  float crack = 1.0 - step(0.8, cracks);
  /* Not every edge of the net at once: it frays, and the fraying drifts. */
  float fray = smoothstep(0.2, 0.5, noise(p / 7.0 + vec2(t * 0.3, -t * 0.2)));
  c = mix(c, foam, crack * fray * sqrt(inWash) * 0.7 * fine);

  /* The line right at the foot of the rock, scalloped. */
  float lip = 1.6 + 1.1 * abs(sin(p.x * 0.27 + p.y * 0.21 + t * 0.9));
  float line = 1.0 - step(lip, near);
  c = mix(c, foam, line * 0.9);

  /* Flecks: short dashes of light on the open water, each on its own clock. */
  vec2 bin = vec2(58.0, 30.0);
  vec2 slot = floor((p + vec2(t * 2.0, 0.0)) / bin);
  vec2 local = mod(p + vec2(t * 2.0, 0.0), bin);
  vec2 at = hash2(slot) * (bin - vec2(10.0, 2.0));
  float len = 2.0 + floor(hash(slot + 3.1) * 4.0);
  float on = step(at.x, local.x) * step(local.x, at.x + len) * step(at.y, local.y) * step(local.y, at.y + 1.0);
  float blink = smoothstep(0.55, 1.0, sin(t * (0.5 + 0.6 * hash(slot + 7.7)) + 6.2831 * hash(slot + 9.3)));
  float offShore = smoothstep(18.0, 48.0, far);
  c = mix(c, vec3(0.66, 0.84, 0.84), on * blink * offShore * 0.75 * fine);

  /* A breath of noise under everything, or a gradient this gentle breaks into
     visible terraces in eight bits a channel. */
  c += (hash(floor(gl_FragCoord.xy)) - 0.5) / 255.0;

  finalColor = vec4(c, 1.0);
}
`;

export class Water {
  readonly mesh: Mesh<Geometry, Shader>;
  private readonly uniforms: { uniforms: { uTime: number } };

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

    const uniforms = {
      uTime: { value: 0, type: 'f32' },
      uReach: { value: REACH, type: 'f32' },
      uNear: { value: NEAR, type: 'f32' },
    } as const;
    const shader = Shader.from({
      gl: { vertex, fragment },
      resources: { uField: texture.source, waterUniforms: uniforms },
    });
    this.uniforms = shader.resources.waterUniforms as { uniforms: { uTime: number } };

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
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.mesh = new Mesh({ geometry, shader });
    this.mesh.eventMode = 'none';
    /* The field is a texture of its own and a mesh does not own its shader's
       resources, so it goes when the island is redrawn and this is thrown away. */
    this.mesh.once('destroyed', () => texture.destroy(true));
  }

  tick(_ticker: Ticker): void {
    this.uniforms.uniforms.uTime = (performance.now() / 1000) % 3600;
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
