// Low-level painting helpers shared by all scenes.

export interface SceneCtx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since scene start */
  t: number;
  /** deterministic per-scene random stream — call rng() for 0..1 */
  rng: () => number;
  flags: Record<string, boolean | string>;
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function sky(s: SceneCtx, stops: [number, string][]) {
  const g = s.ctx.createLinearGradient(0, 0, 0, s.h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  s.ctx.fillStyle = g;
  s.ctx.fillRect(0, 0, s.w, s.h);
}

export function glow(s: SceneCtx, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = s.ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  s.ctx.save();
  s.ctx.globalAlpha = alpha;
  s.ctx.globalCompositeOperation = 'lighter';
  s.ctx.fillStyle = g;
  s.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  s.ctx.restore();
}

/** rolling silhouette ridge across the canvas */
export function ridge(
  s: SceneCtx,
  baseY: number,
  amp: number,
  rough: number,
  color: string,
  seed: number,
  drift = 0
) {
  const { ctx, w, h } = s;
  const rnd = mulberry32(seed);
  const phase = rnd() * 100;
  const f1 = 0.006 + rnd() * 0.004;
  const f2 = 0.02 + rnd() * 0.02;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, h);
  for (let x = -10; x <= w + 10; x += 6) {
    const xx = x + drift;
    const y =
      baseY +
      Math.sin(xx * f1 + phase) * amp +
      Math.sin(xx * f2 + phase * 2) * amp * rough;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w + 10, h);
  ctx.closePath();
  ctx.fill();
}

/** a band of conifer silhouettes */
export function treeBand(
  s: SceneCtx,
  baseY: number,
  height: number,
  color: string,
  seed: number,
  gap = 26
) {
  const { ctx, w } = s;
  const rnd = mulberry32(seed);
  ctx.fillStyle = color;
  for (let x = -20; x < w + 20; x += gap * (0.6 + rnd() * 0.8)) {
    const th = height * (0.6 + rnd() * 0.8);
    const tw = th * (0.36 + rnd() * 0.2);
    const y = baseY + rnd() * 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - tw / 2, y);
    ctx.lineTo(x, y - th);
    ctx.lineTo(x + tw / 2, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 1.5, y - 2, 3, 6);
  }
}

/** hanging stalactites from the ceiling */
export function stalactites(s: SceneCtx, color: string, seed: number, maxLen: number, count = 26) {
  const { ctx, w } = s;
  const rnd = mulberry32(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const len = maxLen * (0.25 + rnd() * 0.75);
    const wd = 6 + rnd() * 16;
    ctx.beginPath();
    ctx.moveTo(x - wd / 2, 0);
    ctx.quadraticCurveTo(x - wd * 0.15, len * 0.55, x, len);
    ctx.quadraticCurveTo(x + wd * 0.15, len * 0.55, x + wd / 2, 0);
    ctx.closePath();
    ctx.fill();
  }
}

export function stalagmites(s: SceneCtx, baseY: number, color: string, seed: number, maxH: number, count = 14) {
  const { ctx, w, h } = s;
  const rnd = mulberry32(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const hh = maxH * (0.3 + rnd() * 0.7);
    const wd = 10 + rnd() * 22;
    ctx.beginPath();
    ctx.moveTo(x - wd / 2, baseY + 2);
    ctx.quadraticCurveTo(x - wd * 0.1, baseY - hh * 0.5, x, baseY - hh);
    ctx.quadraticCurveTo(x + wd * 0.1, baseY - hh * 0.5, x + wd / 2, baseY + 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, baseY, w, h - baseY);
}

export function stars(s: SceneCtx, count: number, seed: number, maxY: number, alpha = 0.9) {
  const { ctx, w } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * maxY;
    const r = rnd() * 1.2 + 0.3;
    const tw = 0.5 + 0.5 * Math.sin(s.t * (0.5 + rnd() * 2) + rnd() * 10);
    ctx.globalAlpha = alpha * tw * (0.4 + rnd() * 0.6);
    ctx.fillStyle = '#ffeecc';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** soft drifting fog band */
export function fog(s: SceneCtx, y: number, thickness: number, color: string, alpha: number, speed = 8, seed = 1) {
  const { ctx, w } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 3; i++) {
    const off = ((s.t * speed * (0.5 + i * 0.35) + rnd() * w) % (w * 1.6)) - w * 0.3;
    const g = ctx.createRadialGradient(off, y + i * thickness * 0.2, 0, off, y + i * thickness * 0.2, w * 0.45);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - thickness, w, thickness * 2.4);
  }
  ctx.restore();
}

/** volumetric light shaft */
export function lightShaft(s: SceneCtx, topX: number, topW: number, botX: number, botW: number, botY: number, color: string, alpha: number) {
  const { ctx } = s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, 0, botY);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha * (0.85 + 0.15 * Math.sin(s.t * 0.7));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(topX - topW / 2, 0);
  ctx.lineTo(topX + topW / 2, 0);
  ctx.lineTo(botX + botW / 2, botY);
  ctx.lineTo(botX - botW / 2, botY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- particles

export type ParticleKind = 'firefly' | 'dust' | 'ember' | 'sparkle' | 'drip' | 'leaf' | 'mist';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; phase: number; kind: ParticleKind; hue: string;
}

export function spawnParticles(kind: ParticleKind, count: number, w: number, h: number, rng: () => number, hue?: string): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rng() * w,
      y: rng() * h,
      vx: (rng() - 0.5) * 10,
      vy: kind === 'ember' ? -(4 + rng() * 14) : kind === 'drip' ? 30 + rng() * 60 : (rng() - 0.5) * 6,
      r: kind === 'mist' ? 30 + rng() * 60 : 0.6 + rng() * 1.8,
      phase: rng() * Math.PI * 2,
      kind,
      hue: hue ?? '#ffdf91',
    });
  }
  return out;
}

export function drawParticles(s: SceneCtx, ps: Particle[], dt: number) {
  const { ctx, w, h } = s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of ps) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'firefly') {
      p.x += Math.sin(s.t * 0.9 + p.phase) * 18 * dt;
      p.y += Math.cos(s.t * 0.7 + p.phase * 1.3) * 12 * dt;
    }
    if (p.x < -60) p.x = w + 50; if (p.x > w + 60) p.x = -50;
    if (p.y < -60) p.y = h + 50; if (p.y > h + 60) p.y = -50;
    const flicker =
      p.kind === 'firefly' || p.kind === 'ember'
        ? 0.35 + 0.65 * Math.max(0, Math.sin(s.t * 1.8 + p.phase * 3))
        : p.kind === 'sparkle'
          ? 0.2 + 0.8 * Math.max(0, Math.sin(s.t * 3 + p.phase * 5))
          : 0.5;
    if (p.kind === 'mist') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, p.hue);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      continue;
    }
    ctx.globalAlpha = flicker * 0.9;
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    if (p.kind === 'firefly' || p.kind === 'ember') {
      ctx.globalAlpha = flicker * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

let noiseTile: HTMLCanvasElement | null = null;

/** subtle film grain + scanlines + dither noise (breaks up gradient banding) */
export function filmGrain(s: SceneCtx, alpha = 0.05) {
  const { ctx, w, h } = s;
  ctx.save();
  // dither: a tiled static noise layer at very low alpha
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = 128;
    noiseTile.height = 128;
    const nctx = noiseTile.getContext('2d')!;
    const img = nctx.createImageData(128, 128);
    const rnd = mulberry32(0xd17e5);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  ctx.globalAlpha = 0.022;
  ctx.globalCompositeOperation = 'overlay';
  for (let ty = 0; ty < h; ty += 128) {
    for (let tx = 0; tx < w; tx += 128) {
      ctx.drawImage(noiseTile, tx, ty);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// High-fidelity material & lighting primitives
// ---------------------------------------------------------------------------

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** shift a hex color toward white (k>0) or black (k<0) */
export function shade(hex: string, k: number): string {
  const [r, g, b] = hexRgb(hex);
  const f = (c: number) => {
    const v = k >= 0 ? c + (255 - c) * k : c * (1 + k);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** layered-sine firelight signal, ~0.45..1.0 */
export function flicker(t: number, seed = 0): number {
  return (
    0.72 +
    0.28 *
      (0.55 * Math.sin(t * 7.3 + seed) +
        0.3 * Math.sin(t * 13.7 + seed * 1.7) +
        0.15 * Math.sin(t * 23.1 + seed * 2.3))
  );
}

/** layered animated fire: outer lick, mid body, bright core (additive) */
export function flames(s: SceneCtx, x: number, baseY: number, size: number, seed = 0, intensity = 1) {
  const { ctx } = s;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers: [string, number, number][] = [
    ['rgba(255, 80, 25, 0.30)', 1.35, 0.9],
    ['rgba(255, 145, 45, 0.5)', 1.0, 1.0],
    ['rgba(255, 225, 150, 0.85)', 0.55, 1.15],
  ];
  const tongues = 3;
  for (const [color, scale, speed] of layers) {
    ctx.fillStyle = color;
    for (let i = 0; i < tongues; i++) {
      const off = (i - (tongues - 1) / 2) * size * 0.42;
      const fl = flicker(s.t * speed, seed + i * 2.1);
      const hgt = size * scale * (0.7 + 0.5 * fl) * intensity;
      const wd = size * scale * 0.44 * (0.85 + 0.3 * Math.sin(s.t * 5.1 + i + seed));
      const sway = Math.sin(s.t * (2.6 + i * 0.9) + seed * 3 + i * 2) * size * 0.16;
      const bx = x + off;
      ctx.beginPath();
      ctx.moveTo(bx - wd / 2, baseY);
      ctx.bezierCurveTo(bx - wd / 2, baseY - hgt * 0.45, bx + sway * 0.4, baseY - hgt * 0.6, bx + sway, baseY - hgt);
      ctx.bezierCurveTo(bx + sway * 0.5 + wd / 2, baseY - hgt * 0.55, bx + wd / 2, baseY - hgt * 0.35, bx + wd / 2, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** longitudinal wood-grain streaks over an area (call after the base fill) */
export function grain(s: SceneCtx, x: number, y: number, w: number, h: number, seed: number, vertical = false, strength = 0.1) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  const len = vertical ? h : w;
  const across = vertical ? w : h;
  const lines = Math.max(3, Math.round(across / 5));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < lines; i++) {
    const a = (i + 0.5) / lines;
    const dark = rnd() > 0.5;
    ctx.strokeStyle = dark ? `rgba(20,10,8,${strength * (0.5 + rnd() * 0.8)})` : `rgba(255,235,200,${strength * 0.5 * rnd()})`;
    ctx.lineWidth = 0.7 + rnd() * 1.1;
    ctx.beginPath();
    const wob = 1.5 + rnd() * 3;
    const ph = rnd() * 10;
    for (let d = 0; d <= len; d += 7) {
      const cross = a * across + Math.sin(d * 0.04 + ph) * wob;
      const px = vertical ? x + cross : x + d;
      const py = vertical ? y + d : y + cross;
      if (d === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    if (rnd() > 0.86) {
      // a knot
      const kx = x + rnd() * w;
      const ky = y + rnd() * h;
      ctx.strokeStyle = `rgba(25,12,8,${strength * 1.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 2.5 + rnd() * 2, 1.5 + rnd(), rnd(), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** horizontal clapboard siding with per-board tint jitter and lap shadows */
export function clapboards(s: SceneCtx, x: number, y: number, w: number, h: number, leftColor: string, rightColor: string, seed: number, boardH = 6) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, leftColor);
  g.addColorStop(1, rightColor);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  for (let by = y; by < y + h; by += boardH) {
    const jitter = (rnd() - 0.5) * 0.08;
    ctx.fillStyle = jitter > 0 ? `rgba(255,245,225,${jitter})` : `rgba(40,25,40,${-jitter})`;
    ctx.fillRect(x, by, w, Math.min(boardH, y + h - by));
    ctx.fillStyle = 'rgba(45,28,45,0.35)';
    ctx.fillRect(x, by + boardH - 1, w, 1);
  }
}

/** shingled roof: clip to polygon, lay staggered courses */
export function shingles(s: SceneCtx, pts: [number, number][], base: string, seed: number, courseH = 7) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const top = Math.min(...ys);
  const bot = Math.max(...ys);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, shade(base, 0.25));
  g.addColorStop(1, shade(base, -0.35));
  ctx.fillStyle = g;
  ctx.fillRect(left, top, right - left, bot - top);
  let row = 0;
  for (let yy = top; yy < bot; yy += courseH, row++) {
    ctx.fillStyle = 'rgba(10,6,12,0.45)';
    ctx.fillRect(left, yy + courseH - 1.2, right - left, 1.2);
    ctx.fillStyle = `rgba(255,235,210,${0.04 + rnd() * 0.04})`;
    ctx.fillRect(left, yy, right - left, 1);
    // shingle joints, staggered per course
    ctx.fillStyle = 'rgba(10,6,12,0.3)';
    const off = (row % 2) * 5 + rnd() * 2;
    for (let xx = left + off; xx < right; xx += 10) {
      ctx.fillRect(xx, yy, 1, courseH - 1);
    }
  }
  ctx.restore();
}

/** running-bond brickwork */
export function bricks(s: SceneCtx, x: number, y: number, w: number, h: number, base: string, seed: number, bw = 11, bh = 5.5) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = shade(base, -0.55); // mortar
  ctx.fillRect(x, y, w, h);
  let row = 0;
  for (let yy = y; yy < y + h; yy += bh + 1, row++) {
    const off = (row % 2) * (bw / 2);
    for (let xx = x - bw + off; xx < x + w; xx += bw + 1) {
      const j = (rnd() - 0.5) * 0.24;
      ctx.fillStyle = shade(base, j);
      ctx.fillRect(xx, yy, bw, bh);
    }
  }
  ctx.restore();
}

/** weathered planks nailed across an opening */
export function boardedPlanks(s: SceneCtx, x: number, y: number, w: number, h: number, color: string, seed: number) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  const plank = (x1: number, y1: number, x2: number, y2: number, pw: number) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.hypot(x2 - x1, y2 - y1);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(ang);
    ctx.fillStyle = shade(color, (rnd() - 0.5) * 0.2);
    ctx.fillRect(-2, -pw / 2, len + 4, pw);
    ctx.fillStyle = 'rgba(20,12,8,0.35)';
    ctx.fillRect(-2, pw / 2 - 1.5, len + 4, 1.5);
    // nail heads
    ctx.fillStyle = 'rgba(15,10,10,0.8)';
    for (const nx of [4, len - 4]) {
      ctx.beginPath();
      ctx.arc(nx, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  plank(x - 2, y + h * 0.28, x + w + 2, y + h * 0.16, h * 0.16);
  plank(x - 2, y + h * 0.6, x + w + 2, y + h * 0.72, h * 0.16);
  plank(x + w * 0.15, y - 2, x + w * 0.85, y + h + 2, w * 0.2);
}

/** soft elliptical contact shadow */
export function softShadow(s: SceneCtx, x: number, y: number, rx: number, ry: number, alpha = 0.4) {
  const { ctx } = s;
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(5,2,8,${alpha})`);
  g.addColorStop(1, 'rgba(5,2,8,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
  ctx.restore();
}

/** animated water surface: layered ripple highlights over a depth gradient */
export function waterPlane(
  s: SceneCtx,
  topY: number,
  surfColor: string,
  deepColor: string,
  seed: number,
  highlight = 'rgba(160,210,250,0.35)'
) {
  const { ctx, w, h } = s;
  const g = ctx.createLinearGradient(0, topY, 0, h);
  g.addColorStop(0, surfColor);
  g.addColorStop(1, deepColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, topY, w, h - topY);
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = highlight;
  for (let i = 0; i < 14; i++) {
    const depth = i / 14;
    const y = topY + depth * (h - topY) * 0.9 + 3;
    const len = (0.12 + rnd() * 0.3) * w * (0.5 + depth);
    const speed = (8 + rnd() * 14) * (depth + 0.3);
    const x = ((rnd() * w * 2 + s.t * speed) % (w + len * 2)) - len;
    ctx.globalAlpha = 0.25 + depth * 0.5;
    ctx.lineWidth = 0.8 + depth * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + Math.sin(s.t * 1.2 + i) * 1.5);
    ctx.lineTo(x + len, y + Math.sin(s.t * 1.2 + i + 1.5) * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** falling water: a wedge of animated streaks with foam at the base */
export function torrent(
  s: SceneCtx,
  xTop: number,
  wTop: number,
  xBot: number,
  wBot: number,
  topY: number,
  botY: number,
  intensity = 1
) {
  const { ctx } = s;
  ctx.save();
  const g = ctx.createLinearGradient(0, topY, 0, botY);
  g.addColorStop(0, `rgba(200,228,255,${0.75 * intensity})`);
  g.addColorStop(0.7, `rgba(160,205,245,${0.45 * intensity})`);
  g.addColorStop(1, `rgba(150,200,240,${0.12 * intensity})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(xTop - wTop / 2, topY);
  ctx.lineTo(xTop + wTop / 2, topY);
  ctx.lineTo(xBot + wBot / 2, botY);
  ctx.lineTo(xBot - wBot / 2, botY);
  ctx.closePath();
  ctx.fill();
  // rushing streaks
  ctx.clip();
  ctx.strokeStyle = `rgba(240,250,255,${0.5 * intensity})`;
  ctx.lineWidth = 2;
  const height = botY - topY;
  for (let i = 0; i < 9; i++) {
    const k = i / 9;
    const x0 = xTop - wTop / 2 + wTop * k + wTop / 18;
    const x1 = xBot - wBot / 2 + wBot * k + wBot / 18;
    const off = (s.t * (240 + i * 30)) % (height * 0.5);
    for (let seg = off - height * 0.5; seg < height; seg += height * 0.5) {
      const t0 = Math.max(0, seg / height);
      const t1 = Math.min(1, (seg + height * 0.16) / height);
      if (t1 <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(lerp(x0, x1, t0), topY + t0 * height);
      ctx.lineTo(lerp(x0, x1, t1), topY + t1 * height);
      ctx.stroke();
    }
  }
  ctx.restore();
  // churn at the base
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const fx = xBot - wBot / 2 + ((i + 0.5) / 5) * wBot;
    const r = wBot * 0.16 * (1 + 0.3 * Math.sin(s.t * 3.4 + i * 1.9));
    const fg = ctx.createRadialGradient(fx, botY, 0, fx, botY, r);
    fg.addColorStop(0, `rgba(225,242,255,${0.4 * intensity})`);
    fg.addColorStop(1, 'rgba(225,242,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(fx - r, botY - r, r * 2, r * 2);
  }
  ctx.restore();
}
