// Prototype of the in-app glass: CSS backdrop-filter through an SVG lens filter, no WebGL.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let defs;
  let n = 0;
  function sdf(px, py, w, h, r) {
    const qx = Math.abs(px - w / 2) - (w / 2 - r);
    const qy = Math.abs(py - h / 2) - (h / 2 - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(ox, oy) - r;
  }
  function lensMap(w, h, r, T, scale) {
    const k = 2;
    const W = Math.ceil(w * k), H = Math.ceil(h * k);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const im = x.createImageData(W, H);
    const d = im.data;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const px = (i + 0.5) / k, py = (j + 0.5) / k;
        const s = sdf(px, py, w, h, r);
        let dx = 0, dy = 0;
        const depth = -s;
        if (depth >= 0 && depth < T) {
          const e = 0.5;
          const gx = sdf(px + e, py, w, h, r) - sdf(px - e, py, w, h, r);
          const gy = sdf(px, py + e, w, h, r) - sdf(px, py - e, w, h, r);
          const gl = Math.hypot(gx, gy) || 1;
          const t = 1 - depth / T;
          const m = 1 - Math.sqrt(1 - t * t);
          dx = (-gx / gl) * m;
          dy = (-gy / gl) * m;
        }
        const o = (j * W + i) * 4;
        d[o] = 128 + dx * 127;
        d[o + 1] = 128 + dy * 127;
        d[o + 2] = 128;
        d[o + 3] = 255;
      }
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL();
  }
  function el(tag, attrs, kids = []) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    kids.forEach((c) => e.appendChild(c));
    return e;
  }
  window.glaze = function glaze(node, o = {}) {
    const P = Object.assign({ blur: 10, thick: 28, bend: 70, spread: 0.18, sat: 1.25, tint: 'rgba(14,15,18,.42)' }, o);
    if (!defs) {
      const svg = el('svg', { width: 0, height: 0, style: 'position:absolute' });
      defs = el('defs', {});
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    const id = 'lens' + n++;
    const b = node.getBoundingClientRect();
    const r = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 28;
    const w = b.width, h = b.height;
    const map = lensMap(w, h, r, Math.min(P.thick, r), P.bend);
    const one = (s, ch) => {
      const m = ch === 'r' ? '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0' : ch === 'g' ? '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0' : '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0';
      return [
        el('feDisplacementMap', { in: 'soft', in2: 'map', scale: s, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + ch }),
        el('feColorMatrix', { in: 'd' + ch, type: 'matrix', values: m, result: 'c' + ch }),
      ];
    };
    const f = el('filter', { id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, [
      el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: P.blur, edgeMode: 'duplicate', result: 'blur' }),
      el('feColorMatrix', { in: 'blur', type: 'saturate', values: P.sat, result: 'soft' }),
      el('feImage', { href: map, x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }),
      ...one(P.bend * (1 + P.spread), 'r'),
      ...one(P.bend, 'g'),
      ...one(P.bend * (1 - P.spread), 'b'),
      el('feBlend', { in: 'cr', in2: 'cg', mode: 'screen', result: 'rg' }),
      el('feBlend', { in: 'rg', in2: 'cb', mode: 'screen' }),
    ]);
    defs.appendChild(f);
    node.style.backdropFilter = `url(#${id})`;
    node.style.background = P.tint;
    node.classList.add('glazed');
  };
})();
