// Death is not one screen — it's five. A brief dramatized beat per cause,
// settling into a persistent mood that matches how the adventurer died.

import type { SceneDef } from './scenes';
import { type SceneCtx, flicker, glow, mulberry32 } from './paint';

function deathGround(s: SceneCtx, tint: [number, number, number], strength: number) {
  const { ctx, w, h } = s;
  ctx.fillStyle = '#020103';
  ctx.fillRect(0, 0, w, h);
  const [r, g, b] = tint;
  const grd = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.8);
  grd.addColorStop(0, `rgba(${r},${g},${b},${strength})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// GRUE — you never see it clearly, only what it leaves you with
// ---------------------------------------------------------------------------

const deathGrue: SceneDef = {
  paint(s) {
    const { ctx, w, h } = s;
    const t = s.t;
    deathGround(s, [40, 10, 8], 0.06);
    if (t < 0.9) {
      // a mass of deeper-than-black rushes the frame, gone before it resolves
      const lunge = Math.min(1, t / 0.35);
      const r = w * (0.15 + lunge * 0.9);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      // eyes, only for a flicker, already receding
      if (t > 0.15 && t < 0.55) {
        const eyeA = Math.max(0, 1 - (t - 0.15) / 0.4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,190,70,${0.85 * eyeA})`;
        for (const dx of [-14, 14]) {
          ctx.beginPath();
          ctx.ellipse(w * 0.5 + dx, h * 0.48, 5, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    // afterward: nothing. the true horror of a grue is you never see it again.
    if (t > 3 && t < 3.6) {
      glow(s, w * 0.5, h * 0.5, w * 0.06 * (1 - (t - 3) / 0.6), 'rgba(255,180,70,0.3)');
    }
  },
};

// ---------------------------------------------------------------------------
// TROLL — the axe finally lands
// ---------------------------------------------------------------------------

const deathTroll: SceneDef = {
  paint(s) {
    const { ctx, w, h } = s;
    const t = s.t;
    deathGround(s, [90, 15, 15], 0.1);
    if (t < 1.3) {
      const swing = Math.min(1, t / 0.28);
      const ang = -1.1 + swing * 2.3;
      ctx.save();
      ctx.translate(w * 0.5, h * 0.36);
      ctx.rotate(ang);
      // a huge blurred axe arc sweeping through frame
      const grd = ctx.createLinearGradient(-w * 0.7, 0, w * 0.7, 0);
      grd.addColorStop(0, 'rgba(120,120,140,0)');
      grd.addColorStop(0.5, `rgba(180,190,210,${0.5 * (1 - Math.abs(swing - 0.6))})`);
      grd.addColorStop(1, 'rgba(120,120,140,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(-w * 0.7, -h * 0.05, w * 1.4, h * 0.1);
      ctx.restore();
      if (swing > 0.85) {
        // impact flash
        const flashA = Math.max(0, 1 - (t - 0.24) / 0.5);
        ctx.fillStyle = `rgba(255,80,60,${0.5 * flashA})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    // slow red pulse afterward, like a fading heartbeat
    const pulse = 0.05 + 0.03 * flicker(t * 0.5, 1);
    glow(s, w * 0.5, h * 0.55, w * 0.5, `rgba(160,30,25,${pulse})`);
  },
};

// ---------------------------------------------------------------------------
// THIEF — a thin bright line, closer than it should be
// ---------------------------------------------------------------------------

const deathThief: SceneDef = {
  paint(s) {
    const { ctx, w, h } = s;
    const t = s.t;
    deathGround(s, [50, 20, 60], 0.08);
    if (t < 1) {
      const jab = Math.min(1, t / 0.22);
      const x = w * (0.15 + jab * 0.7);
      const grad = ctx.createLinearGradient(x - 30, h * 0.5, x + 30, h * 0.5);
      grad.addColorStop(0, 'rgba(220,230,245,0)');
      grad.addColorStop(0.5, `rgba(230,240,255,${0.8 * (1 - jab)})`);
      grad.addColorStop(1, 'rgba(220,230,245,0)');
      ctx.save();
      ctx.translate(x, h * 0.5);
      ctx.rotate(-0.25);
      ctx.fillStyle = grad;
      ctx.fillRect(-30, -3, 60, 6);
      ctx.restore();
      if (jab > 0.75) {
        const flashA = Math.max(0, 1 - (t - 0.16) / 0.4);
        ctx.fillStyle = `rgba(190,80,140,${0.35 * flashA})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    const pulse = 0.04 + 0.02 * flicker(t * 0.6, 3);
    glow(s, w * 0.5, h * 0.5, w * 0.4, `rgba(120,50,100,${pulse})`);
  },
};

// ---------------------------------------------------------------------------
// CYCLOPS — the maw closes
// ---------------------------------------------------------------------------

const deathCyclops: SceneDef = {
  paint(s) {
    const { ctx, w, h } = s;
    const t = s.t;
    deathGround(s, [140, 70, 20], 0.14);
    const close = Math.min(1, t / 0.9);
    // two great shapes closing from top and bottom, warm firelit color
    const gap = h * 0.5 * (1 - close);
    ctx.fillStyle = '#0c0704';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h * 0.5 - gap);
    ctx.quadraticCurveTo(w * 0.5, h * 0.5 - gap - 20, 0, h * 0.5 - gap);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w, h * 0.5 + gap);
    ctx.quadraticCurveTo(w * 0.5, h * 0.5 + gap + 20, 0, h * 0.5 + gap);
    ctx.closePath();
    ctx.fill();
    if (gap > 4) {
      glow(s, w * 0.5, h * 0.5, gap * 1.4, `rgba(255,170,70,${0.4 + 0.2 * (1 - close)})`);
    }
    const pulse = 0.06 + 0.03 * flicker(t * 0.5, 5);
    glow(s, w * 0.5, h * 0.55, w * 0.45, `rgba(180,90,30,${pulse})`);
  },
};

// ---------------------------------------------------------------------------
// DROWNING — the maintenance room, filling
// ---------------------------------------------------------------------------

const deathDrowning: SceneDef = {
  paint(s) {
    const { ctx, w, h } = s;
    const t = s.t;
    const rise = Math.min(1, t / 1.6);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04070c');
    g.addColorStop(1, '#0a1420');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const waterY = h * (1 - rise);
    ctx.save();
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, 'rgba(70,120,160,0.55)');
    wg.addColorStop(1, 'rgba(10,20,35,0.85)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, w, h - waterY);
    // rising bubbles
    const rnd = mulberry32(9);
    ctx.fillStyle = 'rgba(200,230,255,0.5)';
    for (let i = 0; i < 20; i++) {
      const bx = rnd() * w;
      const speed = 20 + rnd() * 40;
      const by = h - ((t * speed + rnd() * h) % h);
      if (by < waterY) continue;
      ctx.beginPath();
      ctx.arc(bx, by, 1 + rnd() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // the last dim light from above, fading as the water rises
    glow(s, w * 0.5, Math.max(0, waterY - 20), w * 0.3 * (1 - rise * 0.7), `rgba(140,180,210,${0.18 * (1 - rise * 0.6)})`);
  },
};

export const deathScenes: Record<string, SceneDef> = {
  deathGrue,
  deathTroll,
  deathThief,
  deathCyclops,
  deathDrowning,
};
