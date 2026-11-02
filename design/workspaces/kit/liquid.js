// Draws liquid-glass-studio's main pass under every .lg element, over the page background image.
window.liquid = async function liquid(bgUrl, params = {}) {
  const P = Object.assign(
    {
      blur: 36, tint: [26, 22, 18, 0.55], refThickness: 22, refDistance: 0.05, refFactor: 1.4,
      refDispersion: 7, fresnelRange: 30, fresnelHardness: 0.2, fresnelFactor: 0.2,
      glareRange: 30, glareHardness: 0.2, glareFactor: 0.9, glareConvergence: 0.5,
      glareOpposite: 0.8, glareAngle: -45, roundness: 5,
    },
    params,
  );
  const dpr = window.devicePixelRatio || 1;
  const W = innerWidth * dpr, H = innerHeight * dpr;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0';
  document.body.prepend(cv);
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false });
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = bgUrl; });

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, LG.vert)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const pH = prog(LG.h), pV = prog(LG.v), pM = prog(LG.main);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const quad = (p) => { const loc = gl.getAttribLocation(p, 'a_position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); };

  const tex = (src) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (src) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  };
  const bg = tex(img);
  // the blur reads a lifted copy, so glass over a dark yard gathers what little light is there
  const lc = document.createElement('canvas'); lc.width = img.width; lc.height = img.height;
  const lx = lc.getContext('2d'); lx.filter = `brightness(${P.lift || 1}) saturate(${P.sat || 1})`; lx.drawImage(img, 0, 0);
  const bgLift = tex(lc);
  const fbo = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  const tA = tex(), tB = tex(); const fA = fbo(tA), fB = fbo(tB);

  const radius = Math.round(P.blur * dpr);
  const sigma = radius / 3; const k = []; let sum = 0;
  for (let i = 0; i <= radius; i++) { const w = Math.exp(-0.5 * (i * i) / (sigma * sigma)); k.push(w); sum += i ? 2 * w : w; }
  const weights = k.map((w) => w / sum);

  gl.viewport(0, 0, W, H);
  const blurPass = (p, from, to) => {
    gl.useProgram(p); quad(p); gl.bindFramebuffer(gl.FRAMEBUFFER, to);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, from);
    gl.uniform1i(gl.getUniformLocation(p, 'u_prevPassTexture'), 0);
    gl.uniform2f(gl.getUniformLocation(p, 'u_resolution'), W, H);
    gl.uniform1i(gl.getUniformLocation(p, 'u_blurRadius'), radius);
    gl.uniform1fv(gl.getUniformLocation(p, 'u_blurWeights'), weights);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
  blurPass(pH, bgLift, fA);
  blurPass(pV, tA, fB);

  // first pass draws the plain background, every glass then draws over its own rect
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const u = (n) => gl.getUniformLocation(pM, n);
  gl.useProgram(pM); quad(pM);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tB); gl.uniform1i(u('u_blurredBg'), 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bg); gl.uniform1i(u('u_bg'), 1);
  gl.uniform2f(u('u_resolution'), W, H);
  gl.uniform1f(u('u_dpr'), dpr);
  gl.uniform1i(u('STEP'), 9);
  gl.uniform1i(u('u_showShape1'), 0);
  gl.uniform1f(u('u_mergeRate'), 0.0001);
  gl.uniform4f(u('u_tint'), P.tint[0] / 255, P.tint[1] / 255, P.tint[2] / 255, P.tint[3]);
  gl.uniform1f(u('u_refThickness'), P.refThickness);
  gl.uniform1f(u('u_refDistance'), P.refDistance);
  gl.uniform1f(u('u_refFactor'), P.refFactor);
  gl.uniform1f(u('u_refDispersion'), P.refDispersion);
  gl.uniform1f(u('u_refFresnelRange'), P.fresnelRange);
  gl.uniform1f(u('u_refFresnelHardness'), P.fresnelHardness);
  gl.uniform1f(u('u_refFresnelFactor'), P.fresnelFactor);
  gl.uniform1f(u('u_glareRange'), P.glareRange);
  gl.uniform1f(u('u_glareHardness'), P.glareHardness);
  gl.uniform1f(u('u_glareConvergence'), P.glareConvergence);
  gl.uniform1f(u('u_glareOppositeFactor'), P.glareOpposite);
  gl.uniform1f(u('u_glareFactor'), P.glareFactor);
  gl.uniform1f(u('u_glareAngle'), (P.glareAngle * Math.PI) / 180);
  gl.uniform1i(u('u_blurEdge'), 1);
  gl.uniform1f(u('u_shapeRoundness'), P.roundness);

  gl.enable(gl.SCISSOR_TEST);
  const shapes = [...document.querySelectorAll('.lg')];
  let first = true;
  for (const el of shapes) {
    const r = el.getBoundingClientRect();
    const radiusPx = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
    const cx = (r.left + r.width / 2) * dpr, cy = H - (r.top + r.height / 2) * dpr;
    gl.uniform2f(u('u_mouseSpring'), cx, cy);
    gl.uniform1f(u('u_shapeWidth'), r.width);
    gl.uniform1f(u('u_shapeHeight'), r.height);
    gl.uniform1f(u('u_shapeRadius'), radiusPx);
    const o = Object.assign({}, P, JSON.parse(el.dataset.lg || '{}'));
    gl.uniform4f(u('u_tint'), o.tint[0] / 255, o.tint[1] / 255, o.tint[2] / 255, o.tint[3]);
    gl.uniform1f(u('u_refThickness'), o.refThickness);
    gl.uniform1f(u('u_glareFactor'), o.glareFactor);
    gl.uniform1f(u('u_refFresnelFactor'), o.fresnelFactor);
    if (first) { gl.disable(gl.SCISSOR_TEST); first = false; }
    else { gl.enable(gl.SCISSOR_TEST); gl.scissor(r.left * dpr - 4, H - r.bottom * dpr - 4, r.width * dpr + 8, r.height * dpr + 8); }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  document.body.dataset.ready = '1';
};
