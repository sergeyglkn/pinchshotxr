// Voxel PINCHSHOT logo, built like the in-game one:
// Tiny5 glyphs sampled to a pixel grid, each font pixel = 2 x 2 cubes,
// gradient A -> B -> C along the word, appear wave + idle swell line.
(function () {
  const A = [238, 242, 250], B = [140, 175, 240], C = [40, 100, 228];
  const SUB = 2, FILL = 0.92;
  const SWEEP = 0.8, JITTER = 0.3, GROW = 0.35, OVERSHOOT = 1.6;
  const WAVE_PERIOD = 3.5, WAVE_WIDTH = 0.07, WAVE_AMP = 0.18;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(t) {
    const [p, q, u] = t < 0.5 ? [A, B, t * 2] : [B, C, (t - 0.5) * 2];
    return [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)];
  }
  function rgb(c, k) { return `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`; }
  function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function easeOutBack(t) { const c = OVERSHOOT, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function sampleGrid(text) {
    const F = 200, cv = document.createElement("canvas");
    cv.width = F * text.length; cv.height = F * 1.6;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.font = `${F}px "Tiny5"`; g.textBaseline = "alphabetic"; g.fillStyle = "#fff";
    g.fillText(text, 10, F * 1.2);
    const img = g.getImageData(0, 0, cv.width, cv.height).data;
    let top = cv.height, bot = -1, left = cv.width, right = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (img[(y * cv.width + x) * 4 + 3] > 128) {
        if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x;
      }
    }
    if (bot < 0) return null;
    const cell = (bot - top + 1) / 5;
    const cols = Math.round((right - left + 1) / cell);
    const px = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) {
      const x = Math.floor(left + (c + 0.5) * cell), y = Math.floor(top + (r + 0.5) * cell);
      if (img[(y * cv.width + x) * 4 + 3] > 128) px.push([c, r]);
    }
    return { cols, rows: 5, px };
  }

  function build(grid) {
    const on = new Set(grid.px.map(([c, r]) => c + "," + r));
    const cubes = [];
    const W = grid.cols * SUB, H = grid.rows * SUB;
    for (const [c, r] of grid.px) for (let i = 0; i < SUB; i++) for (let j = 0; j < SUB; j++) {
      const x = c * SUB + i, y = r * SUB + j;
      const n = hash(x, y), n2 = hash(y + 17, x + 3);
      const topEdge = j === 0 && !on.has(c + "," + (r - 1));
      const lifted = topEdge && n < 0.14;
      const popped = !lifted && n2 < 0.05;
      cubes.push({
        x, y, t: (x + 0.5) / W, n,
        lift: lifted ? 0.18 + n2 * 0.15 : 0,
        rot: lifted ? (n2 - 0.5) * 0.22 : 0,
        pop: popped ? 1.07 : 1,
        light: popped ? 1.08 : 1,
      });
    }
    return { cubes, W, H };
  }

  function render(canvas, model, time) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cell = cssW / (model.W + 0.6);
    const cssH = cell * (model.H + 0.9);
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + "px";
    }
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);
    const size = cell * FILL, depth = cell * 0.42, side = cell * 0.16;
    const appearEnd = SWEEP + JITTER + GROW;
    const wavePos = time > appearEnd ? ((time - appearEnd) % WAVE_PERIOD) / WAVE_PERIOD * 1.3 - 0.15 : -9;

    const list = model.cubes.map((q) => {
      let s;
      if (reduce) s = 1;
      else {
        const k = Math.min(Math.max((time - (q.t * SWEEP + q.n * JITTER)) / GROW, 0), 1);
        s = k <= 0 ? 0 : easeOutBack(k);
      }
      const d = Math.abs(q.t - wavePos) / WAVE_WIDTH;
      const swell = reduce ? 0 : WAVE_AMP * Math.max(0, 1 - d * d) * (0.92 + q.n * 0.16);
      return { q, s: s * q.pop * (1 + swell) };
    });

    // Pass 1: block depth (bottom + right faces), pass 2: front faces.
    for (let pass = 0; pass < 2; pass++) {
      for (const { q, s } of list) {
        if (s <= 0.001) continue;
        const cx = (q.x + 0.5 + 0.3) * cell, cy = (q.y + 0.5 + 0.3 - q.lift) * cell;
        const h = size * s / 2;
        const col = grad(q.t);
        g.save();
        g.translate(cx, cy);
        if (q.rot) g.rotate(q.rot);
        if (pass === 0) {
          g.fillStyle = rgb(col, 0.32);
          g.beginPath();
          g.moveTo(-h, h); g.lineTo(h, h); g.lineTo(h + side * s, h + depth * s); g.lineTo(-h + side * s, h + depth * s);
          g.closePath(); g.fill();
          g.fillStyle = rgb(col, 0.5);
          g.beginPath();
          g.moveTo(h, -h); g.lineTo(h + side * s, -h + depth * s); g.lineTo(h + side * s, h + depth * s); g.lineTo(h, h);
          g.closePath(); g.fill();
        } else {
          g.fillStyle = rgb(col, q.light);
          g.fillRect(-h, -h, h * 2, h * 2);
          g.fillStyle = "rgba(255,255,255,0.22)";
          g.fillRect(-h, -h, h * 2, Math.max(1, h * 0.16));
        }
        g.restore();
      }
    }
  }

  async function init() {
    const canvases = document.querySelectorAll("canvas.voxel-logo");
    if (!canvases.length) return;
    try { await document.fonts.load('200px "Tiny5"', "PINCHSHOT"); } catch (e) {}
    const grid = sampleGrid("PINCHSHOT");
    if (!grid || grid.px.length < 40) { document.documentElement.classList.add("no-voxel"); return; }
    const model = build(grid);
    const start = performance.now();
    canvases.forEach((cv) => cv.classList.add("ready"));
    const animated = [...canvases].filter((cv) => cv.dataset.animate !== "off");
    const still = [...canvases].filter((cv) => cv.dataset.animate === "off");
    const drawStill = () => still.forEach((cv) => render(cv, model, 99));
    drawStill();
    addEventListener("resize", drawStill);
    if (!animated.length) return;
    const frame = (now) => {
      const t = (now - start) / 1000;
      animated.forEach((cv) => render(cv, model, t));
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if (reduce) addEventListener("resize", () => animated.forEach((cv) => render(cv, model, 99)));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
