import {
  BufferImageSource,
  Container,
  Geometry,
  Matrix,
  Mesh,
  Rectangle,
  RenderTexture,
  Shader,
  Sprite,
  Texture,
  type Renderer,
} from 'pixi.js';
import type { SkyLook } from './sky';

/**
 * The whole island under the sky, rather than a dark sheet laid over it.
 *
 * A wash over the top makes night a picture with the lights turned down; what
 * this does is relight it. Every pixel the island draws is first taken back
 * toward the light the sky has right now — deep blue moonlight with most of
 * the colour gone, the warm low gold at either end of the day, the flat grey
 * of an overcast afternoon — and then whatever is giving off light of its own
 * adds its colour back, only where it reaches. That is why grass by the fire
 * at midnight is green and grass a few steps from it is not: the fire is
 * putting the green back.
 *
 * The light is drawn into a texture of its own, a handful of soft sprites in
 * the world's coordinates, and read here a world pixel at a time, banded into
 * steps, so it lands on the art's own grid rather than as an airbrush.
 *
 * Everything the weather does to the ground is here too, because it is all
 * the same question — what does this pixel look like right now: clouds
 * passing over, the ground going dark and shining under rain, snow whitening
 * whatever faces up, mist lying in drifts, and a lightning flash. And moss:
 * a district whose project nobody has committed to in weeks goes dry and
 * mossy and overgrown, measured from git rather than from anything said here.
 *
 * At noon on a clear day none of it does anything, and then the filter is
 * taken off entirely: the art is drawn exactly as he drew it and costs nothing
 * extra.
 */

const vertex = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vTextureCoord;
out vec2 vScreen;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vScreen = aPosition;
  vTextureCoord = aUV;
}
`;

const fragment = /* glsl */ `#version 300 es
precision highp float;
in vec2 vTextureCoord;
in vec2 vScreen;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uLight;
uniform sampler2D uMoss;

uniform vec3 uAmbient;
uniform float uDesat;
uniform float uDark;
uniform float uLow;
uniform float uCloud;
uniform float uFog;
uniform float uCover;
uniform float uWet;
uniform float uFlash;
uniform float uTime;
uniform float uMossOn;
uniform vec2 uScreen;
uniform mat3 uToWorld;
uniform vec4 uMossBox;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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

void main(void) {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.001) {
    finalColor = src;
    return;
  }
  vec3 c = src.rgb / src.a;
  /* The sea draws itself at half strength while this is on: it is the one
     thing in the picture snow, moss and puddles never land on. */
  float landed = step(0.75, src.a);

  /* Which world pixel this is. Everything below is decided per world pixel,
     not per screen pixel, so it stays on the art's grid at any zoom. */
  vec2 world = (uToWorld * vec3(vScreen, 1.0)).xy;
  vec2 wp = floor(world) + 0.5;
  float t = uTime;

  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  /* Grass, the way he painted it: olive more than green, so it is told by
     having much more green than blue and about as much as red. */
  float green = clamp((c.g - c.b) * 3.0, 0.0, 1.0) * smoothstep(0.8, 0.95, c.g / max(c.r, 0.01));

  /* Moss: a district nobody has committed to in a while. Its grass dries
     toward straw, its colours fade, and moss creeps over everything in
     clumps, roofs and paths included, the longer it has been. */
  if (uMossOn > 0.5 && landed > 0.5) {
    vec2 mossAt = (wp - uMossBox.xy) / uMossBox.zw;
    bool inside = mossAt.x >= 0.0 && mossAt.y >= 0.0 && mossAt.x <= 1.0 && mossAt.y <= 1.0;
    float age = inside ? texture(uMoss, mossAt).r : 0.0;
    if (age > 0.003) {
      vec3 straw = vec3(lum * 1.08 + 0.06, lum * 0.98 + 0.04, lum * 0.55);
      c = mix(c, straw, green * age * 0.55);
      c = mix(c, vec3(lum), age * 0.25);
      float clump = noise(wp / 9.0) * 0.65 + noise(wp / 3.0) * 0.35;
      float speck = hash(floor(wp));
      float grows = smoothstep(1.0 - age * 0.75, 1.0 - age * 0.75 + 0.12, clump);
      vec3 moss = mix(vec3(0.24, 0.34, 0.14), vec3(0.33, 0.43, 0.18), speck);
      c = mix(c, moss * (0.7 + lum * 0.6), grows * (0.45 + 0.4 * step(0.5, speck)) * age);
      // Cracked and gone grey round the edges: dark flecks where it is oldest.
      c *= 1.0 - step(1.0 - age * 0.09, speck) * 0.35;
    }
  }

  /* Rain darkens what it soaks and leaves it shining: darker, richer, with a
     cold glint here and there that comes and goes. */
  if (uWet > 0.001 && landed > 0.5) {
    c = mix(c, c * c * 1.15, uWet * 0.5);
    float glint = step(0.985, hash(floor(wp / 2.0) + floor(t * 0.7)));
    c += vec3(0.5, 0.6, 0.75) * glint * uWet * (1.0 - green) * 0.25;
  }

  /* Snow lies on whatever faces up: thickest on grass and roofs, drifting,
     thinner on what is darker and more upright. */
  if (uCover > 0.001 && landed > 0.5) {
    float drift = noise(wp / 22.0) * 0.55 + noise(wp / 7.0) * 0.3 + noise(wp / 2.5) * 0.15;
    /* Grass holds it most, grey slate and stone take a good deal, and the
       brown of a trodden path the least, so the roads stay open. */
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    float slate = 1.0 - smoothstep(0.06, 0.16, sat);
    float takes = 0.2 + green * 0.8 + slate * 0.3;
    float lies = smoothstep(0.62, 0.7, drift * 0.45 + takes * 0.5 + uCover * 0.35 - 0.25);
    /* The shaded side of anything keeps its own colour, so a tree is still a
       tree under it, and a roof still has its courses. */
    lies *= mix(0.35, 1.0, smoothstep(0.14, 0.38, lum));
    vec3 snow = mix(vec3(0.86, 0.9, 0.97), vec3(0.97, 0.98, 1.0), step(0.5, noise(wp / 3.0)));
    c = mix(c, snow * (0.85 + lum * 0.25), lies * min(1.0, uCover * 1.2) * 0.92);
  }

  /* The sky's own light, and what has gone grey under it. */
  float l2 = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(c, vec3(l2), uDesat);

  /* Clouds passing over, the same ones whose shadows cross the water: slow,
     big, and darker the heavier the sky. */
  vec2 sky = world / 1100.0 + vec2(t * 0.0035, -t * 0.0012);
  float cloud = noise(sky) * 0.65 + noise(sky * 2.3 + 5.1) * 0.35;
  float shade = 1.0 - (0.06 + uCloud * 0.16) * smoothstep(0.48, 0.72, cloud) * (1.0 - uDark * 0.7);

  /* Light given off by something, read where this world pixel is on screen
     and banded so a pool of lamplight steps the way pixel art does. */
  vec2 at = vScreen / uScreen;
  vec3 light = texture(uLight, at).rgb;
  /* Banded by how bright it is, not channel by channel: stepping each colour
     on its own puts green and pink rings round a warm fire. */
  float power = max(max(light.r, light.g), light.b);
  float stepped = floor(power * 7.0 + 0.4) / 7.0;
  light = power > 0.001 ? light * (stepped / power) : vec3(0.0);

  /* Light past full only warms what it falls on a little further, rather
     than burning it out to yellow. */
  vec3 lit = uAmbient * shade + light * uDark;
  lit = min(lit, vec3(1.0)) + max(lit - vec3(1.0), vec3(0.0)) * 0.3;
  c *= lit;

  /* A low sun warms whatever is bright. */
  c += vec3(0.07, 0.03, -0.02) * uLow * l2;

  /* Mist in drifts, thicker the further it lies. */
  if (uFog > 0.001) {
    vec2 m = world / 260.0 + vec2(t * 0.012, t * 0.004);
    float mist = noise(m) * 0.6 + noise(m * 2.7 + 3.3) * 0.4;
    vec3 fogColour = mix(vec3(0.78, 0.82, 0.86), vec3(0.24, 0.28, 0.38), uDark) * (uAmbient * 0.3 + 0.7);
    c = mix(c, fogColour, clamp(uFog * (0.35 + mist * 0.65), 0.0, 0.85));
  }

  c += vec3(0.75, 0.82, 1.0) * uFlash * 0.45;

  finalColor = vec4(c, 1.0);
}
`;

/**
 * Light, drawn into a texture of its own.
 *
 * Soft round sprites, each tinted and added: a lamp is one, the fire is a
 * couple at different sizes, a lit window is a small warm one. Drawn at half
 * the screen's size, because nothing about a pool of light is sharper than
 * that and a quarter of the pixels is a quarter of the cost.
 */
export class Lights {
  /** Everything that gives off light, in world pixels. Not on the stage. */
  readonly root = new Container();
  private target: RenderTexture | null = null;
  private readonly glow = softDot();

  /** A pool of light, kept: move it or change it by holding the sprite. */
  add(x: number, y: number, radius: number, color: number, strength = 1): Sprite {
    const sprite = new Sprite(this.glow);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.width = radius * 2;
    sprite.height = radius * 2;
    sprite.tint = color;
    sprite.alpha = Math.min(1, strength);
    sprite.blendMode = 'add';
    this.root.addChild(sprite);
    return sprite;
  }

  /** Render the light as it falls on screen right now. */
  draw(renderer: Renderer, world: Container, width: number, height: number): Texture {
    const scale = 0.5;
    const w = Math.max(1, Math.ceil(width * scale));
    const h = Math.max(1, Math.ceil(height * scale));
    if (!this.target || this.target.width !== w || this.target.height !== h) {
      this.target?.destroy(true);
      this.target = RenderTexture.create({ width: w, height: h, resolution: 1 });
    }
    const transform = new Matrix().copyFrom(world.worldTransform).prepend(new Matrix());
    transform.a *= scale;
    transform.b *= scale;
    transform.c *= scale;
    transform.d *= scale;
    transform.tx *= scale;
    transform.ty *= scale;
    renderer.render({
      container: this.root,
      target: this.target,
      clear: true,
      clearColor: [0, 0, 0, 1],
      transform,
    });
    return this.target;
  }

  destroy(): void {
    this.target?.destroy(true);
    this.root.destroy({ children: true });
  }
}

/** A white dot that fades to nothing at its edge, the falloff squared. */
function softDot(): Texture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const v = Math.max(0, 1 - d);
      const a = Math.round(v * v * 255);
      const i = (y * size + x) * 4;
      // Premultiplied: what is added is the light itself.
      data[i] = a;
      data[i + 1] = a;
      data[i + 2] = a;
      data[i + 3] = a;
    }
  }
  return new Texture({
    source: new BufferImageSource({
      resource: data,
      width: size,
      height: size,
      alphaMode: 'premultiplied-alpha',
    }),
  });
}

/** How old each cell of the island looks, as a texture the grade reads. */
export interface Moss {
  /** The texture, one texel a cell, red the age nought to one. */
  texture: Texture;
  /** Where its first cell sits in world pixels, and how big it is in them. */
  box: [number, number, number, number];
}

export function mossTexture(cells: Map<string, number>, cell: number): Moss | null {
  if (!cells.size) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const key of cells.keys()) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const width = x1 - x0 + 1;
  const height = y1 - y0 + 1;
  const data = new Uint8Array(width * height * 4);
  for (const [key, age] of cells) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    // World y is up and the screen's is down, so row 0 is the northernmost.
    const row = y1 - y;
    const i = (row * width + (x - x0)) * 4;
    data[i] = Math.round(Math.min(1, age) * 255);
    data[i + 3] = 255;
  }
  const texture = new Texture({
    source: new BufferImageSource({
      resource: data,
      width,
      height,
      // Blended between cells, so a neglected district fades into its
      // neighbour across a few pixels rather than stopping at a cell's edge.
      scaleMode: 'linear',
      addressMode: 'clamp-to-edge',
    }),
  });
  return {
    texture,
    box: [x0 * cell, -(y1 + 1) * cell, width * cell, height * cell],
  };
}

/**
 * The grade, drawn over the screen from a picture of the world taken first.
 *
 * Not a Pixi filter: a filter draws what it covers into a texture borrowed
 * from a pool, a power-of-two size bigger than the screen, and the island's
 * thousands of tiles drawn into one of those land a hair off the pixel grid
 * and open hairline seams between them. So the world is drawn into a texture
 * of exactly the screen's size that this owns, and a quad over the screen
 * reads it back through the grade. The world itself is then not drawn again.
 */
export class Grade {
  readonly mesh: Mesh<Geometry, Shader>;
  private readonly uniforms: Record<string, unknown>;
  private readonly shader: Shader;
  private target: RenderTexture | null = null;
  private width = 0;
  private height = 0;

  constructor() {
    const geometry = new Geometry({
      attributes: {
        aPosition: [0, 0, 1, 0, 1, 1, 0, 1],
        aUV: [0, 0, 1, 0, 1, 1, 0, 1],
      },
      indexBuffer: [0, 1, 2, 0, 2, 3],
    });
    this.shader = Shader.from({
      gl: { vertex, fragment },
      resources: {
        gradeUniforms: {
          uAmbient: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
          uDesat: { value: 0, type: 'f32' },
          uDark: { value: 0, type: 'f32' },
          uLow: { value: 0, type: 'f32' },
          uCloud: { value: 0, type: 'f32' },
          uFog: { value: 0, type: 'f32' },
          uCover: { value: 0, type: 'f32' },
          uWet: { value: 0, type: 'f32' },
          uFlash: { value: 0, type: 'f32' },
          uTime: { value: 0, type: 'f32' },
          uMossOn: { value: 0, type: 'f32' },
          uScreen: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uToWorld: { value: new Matrix(), type: 'mat3x3<f32>' },
          uMossBox: { value: new Float32Array([0, 0, 1, 1]), type: 'vec4<f32>' },
        },
        uTexture: Texture.WHITE.source,
        uLight: Texture.WHITE.source,
        uMoss: Texture.WHITE.source,
      },
    });
    this.mesh = new Mesh({ geometry, shader: this.shader });
    this.mesh.eventMode = 'none';
    this.mesh.visible = false;
    this.uniforms = (
      this.shader.resources.gradeUniforms as { uniforms: Record<string, unknown> }
    ).uniforms;
  }

  /** Whether the sky is doing anything a pixel would show. */
  static needed(look: SkyLook, moss: boolean): boolean {
    const [r, g, b] = look.ambient;
    return (
      moss ||
      Math.abs(r - 1) + Math.abs(g - 1) + Math.abs(b - 1) > 0.01 ||
      look.desat > 0.005 ||
      look.cloud > 0.02 ||
      look.fog > 0.005 ||
      look.cover > 0.005 ||
      look.wet > 0.005 ||
      look.flash > 0 ||
      look.low > 0.02
    );
  }

  /**
   * Take the picture of the world the grade reads, and hide the world from
   * the frame's own drawing: the quad stands in for it.
   */
  photograph(
    renderer: Renderer,
    camera: Container,
    world: Container,
    width: number,
    height: number
  ): void {
    const resolution = renderer.resolution;
    if (!this.target || this.width !== width || this.height !== height) {
      this.target?.destroy(true);
      this.target = RenderTexture.create({ width, height, resolution, scaleMode: 'nearest' });
      this.width = width;
      this.height = height;
      this.mesh.geometry.getAttribute('aPosition').buffer.data = new Float32Array([
        0,
        0,
        width,
        0,
        width,
        height,
        0,
        height,
      ]);
    }
    // Only the world: anything else riding on the camera draws over it as it is.
    const others = camera.children.filter((child) => child !== world && child.visible);
    for (const child of others) child.visible = false;
    world.renderable = true;
    renderer.render({
      container: camera,
      target: this.target,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
    world.renderable = false;
    for (const child of others) child.visible = true;
    this.shader.resources.uTexture = this.target.source;
    this.mesh.visible = true;
  }

  /** Back to the world drawn as it is, with nothing over it. */
  off(world: Container): void {
    world.renderable = true;
    this.mesh.visible = false;
  }

  set(
    look: SkyLook,
    light: Texture,
    screen: { width: number; height: number },
    toWorld: Matrix,
    moss: Moss | null
  ): void {
    const u = this.uniforms as {
      uAmbient: Float32Array;
      uScreen: Float32Array;
      uMossBox: Float32Array;
      uToWorld: Matrix;
      [key: string]: unknown;
    };
    u.uAmbient[0] = look.ambient[0];
    u.uAmbient[1] = look.ambient[1];
    u.uAmbient[2] = look.ambient[2];
    u.uDesat = look.desat;
    u.uDark = look.dark;
    u.uLow = look.low;
    u.uCloud = look.cloud;
    u.uFog = look.fog;
    u.uCover = look.cover;
    u.uWet = look.wet;
    u.uFlash = look.flash;
    u.uTime = (performance.now() / 1000) % 3600;
    u.uScreen[0] = screen.width;
    u.uScreen[1] = screen.height;
    u.uToWorld.copyFrom(toWorld);
    this.shader.resources.uLight = light.source;
    if (moss) {
      u.uMossOn = 1;
      u.uMossBox.set(moss.box);
      this.shader.resources.uMoss = moss.texture.source;
    } else {
      u.uMossOn = 0;
      this.shader.resources.uMoss = Texture.WHITE.source;
    }
  }

  destroy(): void {
    this.target?.destroy(true);
    this.mesh.destroy();
  }
}

/**
 * A rectangle covering the screen exactly, in the world's own coordinates.
 *
 * Exactly, with no padding: the filter draws the island into a texture of its
 * own at wherever this lands on screen, and a rectangle that lands half a
 * pixel off the screen's grid draws every tile half a pixel off too, which
 * opens a hairline seam between neighbouring tiles all over the grass.
 */
export function screenInWorld(world: Container, width: number, height: number): Rectangle {
  const inverse = world.worldTransform.clone().invert();
  const a = inverse.apply({ x: 0, y: 0 });
  const b = inverse.apply({ x: width, y: height });
  return new Rectangle(
    Math.min(a.x, b.x),
    Math.min(a.y, b.y),
    Math.abs(b.x - a.x),
    Math.abs(b.y - a.y)
  );
}
