import { sceneDefs } from './scenes';
import {
  type Particle, type SceneCtx,
  drawParticles, filmGrain, hashSeed, mulberry32, spawnParticles,
} from './paint';

const FADE_SECONDS = 0.9;

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sceneId = 'whiteHouse';
  private flags: Record<string, boolean> = {};
  private particles: Particle[] = [];
  private sceneStart = performance.now();
  private fadeStart = -Infinity;
  private snapshot: HTMLCanvasElement | null = null;
  private lastFrame = performance.now();
  private running = false;
  private dpr = 1;
  /** cached static layer for scenes that split base/dynamic painting */
  private baseCache: HTMLCanvasElement | null = null;
  private baseKey = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement ?? canvas);
    }
  }

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const rect = parent.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.respawnParticles();
  }

  get width() {
    return this.canvas.width / this.dpr;
  }
  get height() {
    return this.canvas.height / this.dpr;
  }

  setScene(id: string, flags: Record<string, boolean>) {
    const changed = id !== this.sceneId;
    this.flags = flags;
    if (!changed) return;
    // snapshot the old frame for a crossfade
    try {
      const snap = document.createElement('canvas');
      snap.width = this.canvas.width;
      snap.height = this.canvas.height;
      snap.getContext('2d')!.drawImage(this.canvas, 0, 0);
      this.snapshot = snap;
      this.fadeStart = performance.now();
    } catch {
      this.snapshot = null;
    }
    this.sceneId = id;
    this.sceneStart = performance.now();
    this.respawnParticles();
  }

  updateFlags(flags: Record<string, boolean>) {
    this.flags = flags;
  }

  private respawnParticles() {
    const def = sceneDefs[this.sceneId] ?? sceneDefs.darkness;
    this.particles = [];
    if (!def.particles) return;
    const rng = mulberry32(hashSeed(this.sceneId) ^ 0x9e3779b9);
    for (const spec of def.particles) {
      this.particles.push(...spawnParticles(spec.kind, spec.count, this.width, this.height, rng, spec.hue));
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.frame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  private frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const def = sceneDefs[this.sceneId] ?? sceneDefs.darkness;
    const s: SceneCtx = {
      ctx,
      w: this.width,
      h: this.height,
      t: (now - this.sceneStart) / 1000,
      rng: mulberry32(hashSeed(this.sceneId)),
      flags: this.flags,
    };

    // static layer: painted once per (scene, size, flags) and blitted each frame
    if (def.paintBase) {
      const key = `${this.sceneId}|${this.canvas.width}x${this.canvas.height}|${JSON.stringify(this.flags)}`;
      if (key !== this.baseKey || !this.baseCache) {
        const off = document.createElement('canvas');
        off.width = this.canvas.width;
        off.height = this.canvas.height;
        const octx = off.getContext('2d')!;
        octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        def.paintBase({
          ctx: octx,
          w: this.width,
          h: this.height,
          t: 0,
          rng: mulberry32(hashSeed(this.sceneId)),
          flags: this.flags,
        });
        this.baseCache = off;
        this.baseKey = key;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.baseCache, 0, 0);
      ctx.restore();
    }

    def.paint(s);
    drawParticles(s, this.particles, dt);
    filmGrain(s, 0.045);

    // crossfade from the previous scene's last frame
    const fadeT = (now - this.fadeStart) / 1000 / FADE_SECONDS;
    if (this.snapshot && fadeT < 1) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - easeInOut(Math.min(1, fadeT));
      ctx.drawImage(this.snapshot, 0, 0);
      ctx.restore();
    } else if (this.snapshot && fadeT >= 1) {
      this.snapshot = null;
    }

    ctx.restore();
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
