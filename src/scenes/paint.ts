// Low-level painting helpers shared by all scenes.

export interface SceneCtx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since scene start */
  t: number;
  /** deterministic per-scene random stream — call rng() for 0..1 */
  rng: () => number;
  flags: Record<string, boolean>;
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

/** subtle film grain + scanline character, applied last */
export function filmGrain(s: SceneCtx, alpha = 0.05) {
  const { ctx, w, h } = s;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}
