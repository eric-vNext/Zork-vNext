import {
  type SceneCtx, type ParticleKind,
  sky, glow, ridge, treeBand, stalactites, stalagmites, stars, fog, lightShaft, lerp, mulberry32,
} from './paint';

export interface ParticleSpec { kind: ParticleKind; count: number; hue?: string }
export interface SceneDef {
  paint: (s: SceneCtx) => void;
  particles?: ParticleSpec[];
}

// ------------------------------------------------------------- shared bases

function goldenSky(s: SceneCtx) {
  sky(s, [
    [0, '#1c2440'],
    [0.35, '#3d3a5c'],
    [0.62, '#8a5a6b'],
    [0.8, '#d98e54'],
    [1, '#f2b968'],
  ]);
  stars(s, 60, 11, s.h * 0.4, 0.7);
  // low sun
  glow(s, s.w * 0.78, s.h * 0.72, s.w * 0.3, 'rgba(255,196,110,0.75)');
  glow(s, s.w * 0.78, s.h * 0.72, s.w * 0.1, 'rgba(255,236,190,0.9)');
}

function meadowGround(s: SceneCtx, seed: number) {
  ridge(s, s.h * 0.8, 10, 0.4, '#2e2338', seed);
  ridge(s, s.h * 0.88, 8, 0.5, '#241a2c', seed + 1);
  sGrass(s, s.h * 0.86, '#1b1422', seed + 2);
}

function sGrass(s: SceneCtx, baseY: number, color: string, seed: number) {
  const { ctx, w } = s;
  const rnd = mulberry32(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 120; i++) {
    const x = rnd() * w;
    const y = baseY + rnd() * (s.h - baseY);
    const hgt = 4 + rnd() * 9;
    const sway = Math.sin(s.t * 1.4 + x * 0.05) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y - hgt * 0.6, x + sway * 1.6, y - hgt);
    ctx.stroke();
  }
}

function drawHouse(s: SceneCtx, cx: number, groundY: number, scale: number, showDoor: boolean, windowGlow: boolean) {
  const { ctx } = s;
  const hw = 150 * scale, hh = 100 * scale;
  ctx.save();
  // body
  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(cx - hw / 2, groundY - hh, hw, hh);
  // shading side
  ctx.fillStyle = 'rgba(120,90,110,0.35)';
  ctx.fillRect(cx + hw * 0.1, groundY - hh, hw * 0.4, hh);
  // roof
  ctx.fillStyle = '#4a3644';
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.6, groundY - hh);
  ctx.lineTo(cx, groundY - hh - 62 * scale);
  ctx.lineTo(cx + hw * 0.6, groundY - hh);
  ctx.closePath();
  ctx.fill();
  // chimney
  ctx.fillStyle = '#5b4350';
  ctx.fillRect(cx + hw * 0.22, groundY - hh - 52 * scale, 16 * scale, 34 * scale);
  // boarded door
  if (showDoor) {
    ctx.fillStyle = '#6b5344';
    ctx.fillRect(cx - 14 * scale, groundY - 44 * scale, 28 * scale, 44 * scale);
    ctx.strokeStyle = '#3d2f26';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 14 * scale, groundY - 40 * scale);
    ctx.lineTo(cx + 14 * scale, groundY - 14 * scale);
    ctx.moveTo(cx + 14 * scale, groundY - 40 * scale);
    ctx.lineTo(cx - 14 * scale, groundY - 14 * scale);
    ctx.stroke();
  }
  // windows
  ctx.fillStyle = windowGlow ? '#ffd98a' : '#2c2735';
  const wy = groundY - hh * 0.62;
  ctx.fillRect(cx - hw * 0.34, wy, 18 * scale, 22 * scale);
  ctx.fillRect(cx + hw * 0.22, wy, 18 * scale, 22 * scale);
  if (windowGlow) {
    glow(s, cx - hw * 0.34 + 9 * scale, wy + 11 * scale, 40 * scale, 'rgba(255,200,120,0.5)');
    glow(s, cx + hw * 0.22 + 9 * scale, wy + 11 * scale, 40 * scale, 'rgba(255,200,120,0.5)');
  }
  // board strokes on windows
  if (!windowGlow) {
    ctx.strokeStyle = '#4d4254';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(cx - hw * 0.34, wy, 18 * scale, 22 * scale);
    ctx.strokeRect(cx + hw * 0.22, wy, 18 * scale, 22 * scale);
  }
  ctx.restore();
}

interface CaveOpts {
  base?: string; mid?: string; near?: string;
  glowColor?: string; glowX?: number; glowY?: number; glowR?: number;
  floorY?: number;
}

function caveBase(s: SceneCtx, seed: number, o: CaveOpts = {}) {
  const floorY = o.floorY ?? s.h * 0.82;
  sky(s, [
    [0, o.base ?? '#06080e'],
    [0.55, o.mid ?? '#0c1220'],
    [1, o.near ?? '#141c2e'],
  ]);
  if (o.glowColor) {
    glow(s, o.glowX ?? s.w * 0.5, o.glowY ?? s.h * 0.6, o.glowR ?? s.w * 0.35, o.glowColor, 0.9);
  }
  stalactites(s, 'rgba(3,5,9,0.95)', seed, s.h * 0.28);
  ridge(s, s.h * 0.6, 40, 0.6, 'rgba(5,8,14,0.8)', seed + 3);
  stalagmites(s, floorY, '#05070c', seed + 1, s.h * 0.2);
}

// ------------------------------------------------------------- the scenes

export const sceneDefs: Record<string, SceneDef> = {
  // ---------- surface
  whiteHouse: {
    particles: [
      { kind: 'firefly', count: 14, hue: '#ffe9a3' },
      { kind: 'leaf', count: 6, hue: '#caa46a' },
    ],
    paint(s) {
      goldenSky(s);
      ridge(s, s.h * 0.66, 26, 0.5, '#2a2742', 21);
      treeBand(s, s.h * 0.74, s.h * 0.2, '#221d33', 22, 34);
      meadowGround(s, 23);
      drawHouse(s, s.w * 0.62, s.h * 0.82, Math.min(s.w, 640) / 460, true, false);
      // mailbox
      const mx = s.w * 0.24, my = s.h * 0.86;
      s.ctx.fillStyle = '#3a3148';
      s.ctx.fillRect(mx - 2, my - 26, 4, 26);
      s.ctx.fillStyle = '#4d4260';
      s.ctx.beginPath();
      s.ctx.roundRect(mx - 12, my - 40, 24, 15, 6);
      s.ctx.fill();
      fog(s, s.h * 0.82, 40, 'rgba(255,190,120,0.5)', 0.16, 5, 3);
    },
  },

  houseSide: {
    particles: [{ kind: 'firefly', count: 10, hue: '#ffe9a3' }],
    paint(s) {
      goldenSky(s);
      treeBand(s, s.h * 0.7, s.h * 0.24, '#221d33', 31, 30);
      meadowGround(s, 32);
      drawHouse(s, s.w * 0.3, s.h * 0.84, Math.min(s.w, 640) / 420, false, false);
      fog(s, s.h * 0.84, 36, 'rgba(255,190,120,0.4)', 0.14, 5, 4);
    },
  },

  behindHouse: {
    particles: [{ kind: 'firefly', count: 10, hue: '#ffe9a3' }],
    paint(s) {
      goldenSky(s);
      treeBand(s, s.h * 0.68, s.h * 0.26, '#221d33', 41, 28);
      meadowGround(s, 42);
      drawHouse(s, s.w * 0.34, s.h * 0.84, Math.min(s.w, 640) / 420, false, s.flags['windowOpen'] ?? false);
      fog(s, s.h * 0.85, 36, 'rgba(255,190,120,0.4)', 0.14, 5, 5);
    },
  },

  forest: {
    particles: [
      { kind: 'firefly', count: 18, hue: '#d9f0a3' },
      { kind: 'mist', count: 8, hue: 'rgba(140,180,140,0.5)' },
    ],
    paint(s) {
      sky(s, [
        [0, '#0d1a16'],
        [0.5, '#16281f'],
        [1, '#213526'],
      ]);
      glow(s, s.w * 0.5, s.h * 0.15, s.w * 0.4, 'rgba(190,230,150,0.25)');
      lightShaft(s, s.w * 0.3, 40, s.w * 0.36, 140, s.h * 0.9, 'rgba(220,255,180,0.16)', 0.8);
      lightShaft(s, s.w * 0.68, 30, s.w * 0.6, 110, s.h * 0.9, 'rgba(220,255,180,0.12)', 0.8);
      treeBand(s, s.h * 0.72, s.h * 0.45, '#0c1712', 51, 40);
      treeBand(s, s.h * 0.84, s.h * 0.52, '#080f0c', 52, 55);
      // foreground trunks
      const rnd = mulberry32(53);
      s.ctx.fillStyle = '#050a08';
      for (let i = 0; i < 5; i++) {
        const x = rnd() * s.w;
        s.ctx.fillRect(x, 0, 14 + rnd() * 26, s.h);
      }
      ridge(s, s.h * 0.9, 8, 0.5, '#040806', 54);
    },
  },

  tree: {
    particles: [
      { kind: 'leaf', count: 12, hue: '#a8c96a' },
      { kind: 'firefly', count: 8, hue: '#ffe9a3' },
    ],
    paint(s) {
      goldenSky(s);
      // distant canopy below — we are up high
      ridge(s, s.h * 0.72, 30, 0.7, '#1c2b1e', 61);
      ridge(s, s.h * 0.8, 24, 0.7, '#131f15', 62);
      fog(s, s.h * 0.78, 60, 'rgba(255,200,130,0.5)', 0.2, 6, 63);
      // big branch across the view
      const { ctx } = s;
      ctx.strokeStyle = '#2b1f1a';
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20, s.h * 0.62);
      ctx.quadraticCurveTo(s.w * 0.45, s.h * 0.5, s.w + 20, s.h * 0.58);
      ctx.stroke();
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(s.w * 0.3, s.h * 0.55);
      ctx.quadraticCurveTo(s.w * 0.4, s.h * 0.3, s.w * 0.55, s.h * 0.18);
      ctx.stroke();
      // leaf clusters
      const rnd = mulberry32(64);
      for (let i = 0; i < 24; i++) {
        const x = rnd() * s.w, y = rnd() * s.h * 0.5;
        glow(s, x, y, 26 + rnd() * 30, 'rgba(90,140,60,0.14)');
      }
      // the nest
      ctx.fillStyle = '#57422c';
      ctx.beginPath();
      ctx.ellipse(s.w * 0.62, s.h * 0.55, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38291b';
      ctx.beginPath();
      ctx.ellipse(s.w * 0.62, s.h * 0.53, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // egg glint
      glow(s, s.w * 0.62, s.h * 0.52, 18, 'rgba(255,235,170,0.5)');
    },
  },

  clearing: {
    particles: [
      { kind: 'firefly', count: 12, hue: '#d9f0a3' },
      { kind: 'dust', count: 20, hue: '#fff2cf' },
    ],
    paint(s) {
      sky(s, [
        [0, '#13231b'],
        [0.5, '#1e3423'],
        [1, '#2c4a2c'],
      ]);
      lightShaft(s, s.w * 0.5, 90, s.w * 0.5, 260, s.h * 0.92, 'rgba(235,255,190,0.2)', 0.9);
      treeBand(s, s.h * 0.7, s.h * 0.4, '#0d1a12', 71, 36);
      treeBand(s, s.h * 0.82, s.h * 0.34, '#091209', 72, 46);
      ridge(s, s.h * 0.86, 10, 0.4, '#122015', 73);
      sGrass(s, s.h * 0.86, '#0c1810', 74);
      // the grating
      const gx = s.w * 0.5, gy = s.h * 0.9;
      const { ctx } = s;
      ctx.save();
      ctx.fillStyle = '#2e2a26';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 60, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#57504a';
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(gx, gy, 60, 18, 0, 0, Math.PI * 2);
        ctx.moveTo(gx + i * 20 - 8, gy - 14);
        ctx.lineTo(gx + i * 20 + 8, gy + 14);
        ctx.stroke();
      }
      ctx.restore();
      glow(s, gx, gy, 50, 'rgba(120,255,160,0.08)');
    },
  },

  canyon: {
    particles: [{ kind: 'dust', count: 16, hue: '#ffd9a8' }],
    paint(s) {
      sky(s, [
        [0, '#242038'],
        [0.4, '#5c3a52'],
        [0.7, '#c96f4a'],
        [1, '#eda45e'],
      ]);
      glow(s, s.w * 0.5, s.h * 0.42, s.w * 0.35, 'rgba(255,190,120,0.5)');
      ridge(s, s.h * 0.5, 40, 0.8, '#4a2c3e', 81);
      ridge(s, s.h * 0.62, 50, 0.9, '#382132', 82);
      // river ribbon
      const { ctx } = s;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,170,0.7)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.w * 0.2, s.h);
      ctx.quadraticCurveTo(s.w * 0.45, s.h * 0.78, s.w * 0.52, s.h * 0.62);
      ctx.stroke();
      ctx.restore();
      // canyon walls
      ridge(s, s.h * 0.74, 60, 1, '#271729', 83);
      fog(s, s.h * 0.7, 60, 'rgba(255,170,110,0.5)', 0.2, 7, 84);
    },
  },

  canyonBottom: {
    particles: [
      { kind: 'mist', count: 10, hue: 'rgba(180,200,230,0.5)' },
      { kind: 'sparkle', count: 14, hue: '#bfe3ff' },
    ],
    paint(s) {
      sky(s, [
        [0, '#171a30'],
        [0.6, '#2c2c48'],
        [1, '#3c3a56'],
      ]);
      // towering walls either side
      const { ctx } = s;
      ctx.fillStyle = '#100c1e';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(s.w * 0.3, 0); ctx.lineTo(s.w * 0.16, s.h); ctx.lineTo(0, s.h); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s.w, 0); ctx.lineTo(s.w * 0.7, 0); ctx.lineTo(s.w * 0.86, s.h); ctx.lineTo(s.w, s.h); ctx.closePath(); ctx.fill();
      lightShaft(s, s.w * 0.5, 120, s.w * 0.5, 240, s.h, 'rgba(200,215,255,0.13)', 0.9);
      // river
      const g = ctx.createLinearGradient(0, s.h * 0.8, 0, s.h);
      g.addColorStop(0, '#26314f');
      g.addColorStop(1, '#111726');
      ctx.fillStyle = g;
      ctx.fillRect(0, s.h * 0.8, s.w, s.h * 0.2);
      // shimmering water lines
      ctx.strokeStyle = 'rgba(160,200,255,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const y = s.h * (0.82 + i * 0.02);
        const off = Math.sin(s.t * 1.2 + i) * 14;
        ctx.beginPath();
        ctx.moveTo(s.w * 0.2 + off, y);
        ctx.lineTo(s.w * 0.5 + off, y);
        ctx.stroke();
      }
      ridge(s, s.h * 0.84, 12, 0.6, '#0b0916', 91);
    },
  },

  rainbow: {
    particles: [
      { kind: 'mist', count: 14, hue: 'rgba(200,220,255,0.6)' },
      { kind: 'sparkle', count: 22, hue: '#ffffff' },
    ],
    paint(s) {
      sky(s, [
        [0, '#28304f'],
        [0.5, '#4a5578'],
        [0.8, '#8d92ac'],
        [1, '#b7b3c4'],
      ]);
      // the falls
      const { ctx } = s;
      const fx = s.w * 0.78;
      const g = ctx.createLinearGradient(fx - 40, 0, fx + 40, 0);
      g.addColorStop(0, 'rgba(190,215,255,0)');
      g.addColorStop(0.5, 'rgba(220,235,255,0.8)');
      g.addColorStop(1, 'rgba(190,215,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(fx - 40, s.h * 0.18, 80, s.h * 0.62);
      // falling streaks
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const x = fx - 26 + i * 9;
        const off = (s.t * 260 + i * 47) % (s.h * 0.6);
        ctx.beginPath();
        ctx.moveTo(x, s.h * 0.18 + off);
        ctx.lineTo(x, s.h * 0.18 + off + 26);
        ctx.stroke();
      }
      // rainbow arc
      const solid = s.flags['rainbowSolid'];
      const hues = ['#ff5f5f', '#ffb35f', '#ffe95f', '#7ee87e', '#5fb9ff', '#9f7eff'];
      ctx.save();
      ctx.globalAlpha = solid ? 0.85 : 0.4 + 0.08 * Math.sin(s.t * 0.8);
      ctx.lineWidth = solid ? 9 : 6;
      hues.forEach((hue, i) => {
        ctx.strokeStyle = hue;
        ctx.beginPath();
        ctx.arc(s.w * 0.45, s.h * 1.06, s.h * 0.72 + i * (solid ? 9 : 6), Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      });
      ctx.restore();
      if (solid) glow(s, s.w * 0.24, s.h * 0.62, 60, 'rgba(255,220,120,0.65)');
      // rocky beach
      ridge(s, s.h * 0.78, 16, 0.7, '#241f33', 101);
      ridge(s, s.h * 0.88, 10, 0.6, '#161221', 102);
      fog(s, s.h * 0.6, 80, 'rgba(220,235,255,0.5)', 0.2, 10, 103);
    },
  },

  // ---------- interiors
  kitchen: {
    particles: [{ kind: 'dust', count: 18, hue: '#ffe6b8' }],
    paint(s) {
      sky(s, [
        [0, '#1e1626'],
        [0.6, '#2c1f2e'],
        [1, '#3a2a33'],
      ]);
      const { ctx } = s;
      // window with evening light
      const wx = s.w * 0.72, wy = s.h * 0.34;
      lightShaft(s, wx, 90, wx - 120, 300, s.h, 'rgba(255,205,130,0.16)', 1);
      ctx.fillStyle = '#efc27a';
      ctx.beginPath();
      ctx.roundRect(wx - 55, wy - 75, 110, 150, 8);
      ctx.fill();
      glow(s, wx, wy, 160, 'rgba(255,200,120,0.45)');
      ctx.strokeStyle = '#241a24';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(wx, wy - 75); ctx.lineTo(wx, wy + 75);
      ctx.moveTo(wx - 55, wy); ctx.lineTo(wx + 55, wy);
      ctx.stroke();
      // table
      ctx.fillStyle = '#171019';
      ctx.fillRect(s.w * 0.12, s.h * 0.72, s.w * 0.4, 12);
      ctx.fillRect(s.w * 0.15, s.h * 0.72, 12, s.h * 0.2);
      ctx.fillRect(s.w * 0.45, s.h * 0.72, 12, s.h * 0.2);
      // sack + bottle silhouettes
      ctx.fillStyle = '#241a20';
      ctx.beginPath();
      ctx.ellipse(s.w * 0.26, s.h * 0.69, 26, 20, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(s.w * 0.37, s.h * 0.62, 12, 34);
      glow(s, s.w * 0.37 + 6, s.h * 0.66, 20, 'rgba(160,220,255,0.3)');
      // hanging pans
      ctx.strokeStyle = '#0f0a12';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const px = s.w * (0.15 + i * 0.09);
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, s.h * 0.12 + i * 8); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, s.h * 0.15 + i * 8, 12, 0, Math.PI * 2); ctx.stroke();
      }
    },
  },

  livingRoom: {
    particles: [
      { kind: 'ember', count: 10, hue: '#ffb46a' },
      { kind: 'dust', count: 14, hue: '#ffe6b8' },
    ],
    paint(s) {
      sky(s, [
        [0, '#150f1c'],
        [0.6, '#241723'],
        [1, '#33202a'],
      ]);
      const { ctx } = s;
      // fireplace
      const fx = s.w * 0.18, fy = s.h * 0.66;
      ctx.fillStyle = '#0d0810';
      ctx.fillRect(fx - 70, fy - 90, 140, 90);
      ctx.fillStyle = '#1f1218';
      ctx.fillRect(fx - 55, fy - 75, 110, 75);
      glow(s, fx, fy - 26, 90, 'rgba(255,150,60,0.75)');
      glow(s, fx, fy - 20, 40, 'rgba(255,220,140,0.9)');
      // flame flicker
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const flick = Math.sin(s.t * 7 + i * 2.2) * 6;
        ctx.fillStyle = 'rgba(255,170,70,0.5)';
        ctx.beginPath();
        ctx.ellipse(fx - 20 + i * 10, fy - 14, 6, 16 + flick, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // sword on the wall
      const sx = s.w * 0.5, sy = s.h * 0.26;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.15);
      ctx.fillStyle = '#9fb2c8';
      ctx.fillRect(-70, -3, 140, 6);
      ctx.fillStyle = '#5d4a63';
      ctx.fillRect(48, -9, 10, 18);
      ctx.restore();
      glow(s, sx, sy, 60, 'rgba(160,200,255,0.14)');
      // trophy case
      ctx.fillStyle = '#241a2c';
      ctx.fillRect(s.w * 0.72, s.h * 0.3, s.w * 0.18, s.h * 0.5);
      ctx.strokeStyle = 'rgba(255,210,130,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.w * 0.735, s.h * 0.32, s.w * 0.15, s.h * 0.46);
      glow(s, s.w * 0.81, s.h * 0.55, 70, 'rgba(255,210,120,0.12)');
      // rug or trap door
      if (s.flags['trapDoorOpen']) {
        ctx.fillStyle = '#050308';
        ctx.beginPath();
        ctx.ellipse(s.w * 0.45, s.h * 0.88, 80, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        glow(s, s.w * 0.45, s.h * 0.88, 60, 'rgba(90,220,160,0.15)');
      } else {
        ctx.fillStyle = '#5c2f3a';
        ctx.beginPath();
        ctx.ellipse(s.w * 0.45, s.h * 0.88, 100, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7c4a50';
        ctx.stroke();
      }
    },
  },

  attic: {
    particles: [{ kind: 'dust', count: 26, hue: '#cbb89a' }],
    paint(s) {
      sky(s, [
        [0, '#0b0810'],
        [1, '#191220'],
      ]);
      const { ctx } = s;
      // rafters
      ctx.strokeStyle = '#050308';
      ctx.lineWidth = 18;
      for (let i = 0; i < 5; i++) {
        const x = s.w * (0.1 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(x - 60, 0);
        ctx.lineTo(x + 60, s.h * 0.5);
        ctx.stroke();
      }
      lightShaft(s, s.w * 0.35, 30, s.w * 0.42, 120, s.h * 0.9, 'rgba(200,190,150,0.12)', 1);
      // rope coil
      ctx.strokeStyle = '#5a4630';
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(s.w * 0.62, s.h * 0.82, 40 - i * 8, 14 - i * 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ridge(s, s.h * 0.88, 6, 0.3, '#06040a', 111);
    },
  },

  // ---------- underground
  cellar: {
    particles: [
      { kind: 'dust', count: 16, hue: '#9db4d6' },
      { kind: 'drip', count: 3, hue: '#7fa8d9' },
    ],
    paint(s) {
      caveBase(s, 201, { glowColor: 'rgba(110,150,220,0.14)', glowY: s.h * 0.35 });
      const { ctx } = s;
      // metal ramp
      ctx.fillStyle = '#141a28';
      ctx.beginPath();
      ctx.moveTo(0, s.h * 0.2);
      ctx.lineTo(s.w * 0.34, s.h * 0.86);
      ctx.lineTo(0, s.h * 0.86);
      ctx.closePath();
      ctx.fill();
      lightShaft(s, s.w * 0.6, 26, s.w * 0.64, 90, s.h * 0.85, 'rgba(160,200,255,0.1)', 1);
    },
  },

  chasm: {
    particles: [{ kind: 'mist', count: 12, hue: 'rgba(80,110,160,0.5)' }],
    paint(s) {
      caveBase(s, 211, { glowColor: 'rgba(60,90,150,0.12)' });
      const { ctx } = s;
      // the abyss
      const g = ctx.createLinearGradient(0, s.h * 0.55, 0, s.h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(s.w * 0.18, s.h);
      ctx.quadraticCurveTo(s.w * 0.4, s.h * 0.6, s.w * 0.62, s.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(s.w * 0.18, s.h * 0.92, s.w * 0.44, s.h * 0.08);
    },
  },

  gallery: {
    particles: [{ kind: 'dust', count: 14, hue: '#d9c9a8' }],
    paint(s) {
      caveBase(s, 221, { mid: '#141019', near: '#221a24', glowColor: 'rgba(200,160,90,0.1)' });
      const { ctx } = s;
      // empty frames
      ctx.strokeStyle = '#3a2e3c';
      ctx.lineWidth = 6;
      ctx.strokeRect(s.w * 0.12, s.h * 0.3, 90, 70);
      ctx.strokeRect(s.w * 0.68, s.h * 0.26, 80, 100);
      // THE painting
      const px = s.w * 0.42, py = s.h * 0.28, pw = 120, ph = 95;
      ctx.fillStyle = '#c8a25a';
      ctx.fillRect(px - 8, py - 8, pw + 16, ph + 16);
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, '#7a9bd9');
      g.addColorStop(0.6, '#d98e6b');
      g.addColorStop(1, '#4a3358');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      glow(s, px + pw / 2, py + ph / 2, 140, 'rgba(255,215,140,0.2)');
    },
  },

  studio: {
    particles: [{ kind: 'dust', count: 16, hue: '#e8cfd9' }],
    paint(s) {
      caveBase(s, 231, { mid: '#161019', near: '#241a22' });
      const { ctx } = s;
      const rnd = mulberry32(232);
      const colors = ['#c85a7a', '#5a9bc8', '#c8b45a', '#7ac86a', '#9a6ac8'];
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
        ctx.globalAlpha = 0.25 + rnd() * 0.3;
        ctx.beginPath();
        ctx.arc(rnd() * s.w, s.h * (0.3 + rnd() * 0.6), 2 + rnd() * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // chimney with light above
      const cx = s.w * 0.7;
      ctx.fillStyle = '#0a070d';
      ctx.fillRect(cx - 50, 0, 100, s.h * 0.5);
      ctx.clearRect(cx - 26, 0, 52, s.h * 0.46);
      lightShaft(s, cx, 40, cx, 70, s.h * 0.8, 'rgba(255,210,140,0.14)', 1);
    },
  },

  trollRoom: {
    particles: [{ kind: 'ember', count: 8, hue: '#ff7a5a' }],
    paint(s) {
      const dead = s.flags['trollDead'];
      caveBase(s, 241, {
        glowColor: dead ? 'rgba(120,140,180,0.1)' : 'rgba(255,80,50,0.16)',
        glowY: s.h * 0.55,
      });
      const { ctx } = s;
      if (!dead) {
        // hulking silhouette
        const tx = s.w * 0.62, ty = s.h * 0.82;
        const sway = Math.sin(s.t * 1.1) * 5;
        ctx.fillStyle = '#0a0508';
        ctx.beginPath();
        ctx.ellipse(tx + sway, ty - 70, 55, 75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx + sway, ty - 155, 30, 0, Math.PI * 2);
        ctx.fill();
        // eyes
        ctx.fillStyle = '#ff5a3a';
        ctx.beginPath();
        ctx.arc(tx + sway - 10, ty - 160, 4, 0, Math.PI * 2);
        ctx.arc(tx + sway + 10, ty - 160, 4, 0, Math.PI * 2);
        ctx.fill();
        glow(s, tx + sway, ty - 158, 30, 'rgba(255,90,50,0.4)');
        // axe
        ctx.save();
        ctx.translate(tx + sway + 60, ty - 110);
        ctx.rotate(Math.sin(s.t * 1.1) * 0.2 + 0.4);
        ctx.fillStyle = '#241a20';
        ctx.fillRect(-4, -60, 8, 90);
        ctx.fillStyle = '#4d4658';
        ctx.beginPath();
        ctx.moveTo(-4, -60); ctx.quadraticCurveTo(-42, -48, -6, -20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // claw marks
      ctx.strokeStyle = 'rgba(120,30,30,0.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s.w * 0.16 + i * 12, s.h * 0.3);
        ctx.lineTo(s.w * 0.2 + i * 12, s.h * 0.48);
        ctx.stroke();
      }
    },
  },

  passage: {
    particles: [{ kind: 'dust', count: 12, hue: '#a8b8d0' }],
    paint(s) {
      caveBase(s, 251, { glowColor: 'rgba(120,160,220,0.08)' });
      const { ctx } = s;
      // receding tunnel
      for (let i = 0; i < 5; i++) {
        const k = i / 5;
        ctx.strokeStyle = `rgba(30,40,64,${0.5 - k * 0.4})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const cx = s.w * lerp(0.5, 0.62, k);
        const cy = s.h * lerp(0.55, 0.6, k);
        ctx.ellipse(cx, cy, s.w * (0.42 - k * 0.36), s.h * (0.4 - k * 0.33), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      glow(s, s.w * 0.62, s.h * 0.6, 40, 'rgba(140,180,240,0.12)');
    },
  },

  roundRoom: {
    particles: [{ kind: 'dust', count: 14, hue: '#b8c4d8' }],
    paint(s) {
      caveBase(s, 261, { glowColor: 'rgba(150,170,220,0.1)', glowY: s.h * 0.5 });
      const { ctx } = s;
      // radial passages
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const cx = s.w * 0.5 + Math.cos(a) * s.w * 0.34;
        const cy = s.h * 0.6 + Math.sin(a) * s.h * 0.22;
        ctx.fillStyle = '#04060b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 34, 48, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // circular floor pattern
      ctx.strokeStyle = 'rgba(120,140,190,0.16)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(s.w * 0.5, s.h * 0.84, i * 60, i * 16, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },

  engravings: {
    particles: [{ kind: 'dust', count: 12, hue: '#d0c090' }],
    paint(s) {
      caveBase(s, 271, { glowColor: 'rgba(220,180,100,0.1)', glowY: s.h * 0.42 });
      const { ctx } = s;
      const rnd = mulberry32(272);
      ctx.strokeStyle = 'rgba(230,195,120,0.4)';
      ctx.lineWidth = 2;
      // rows of glyph dashes
      for (let row = 0; row < 5; row++) {
        const y = s.h * (0.26 + row * 0.09);
        let x = s.w * 0.2;
        while (x < s.w * 0.8) {
          const len = 6 + rnd() * 18;
          if (rnd() > 0.3) {
            ctx.beginPath();
            if (rnd() > 0.5) {
              ctx.moveTo(x, y); ctx.lineTo(x + len, y);
            } else {
              ctx.moveTo(x, y - 5); ctx.lineTo(x + len / 2, y + 5); ctx.lineTo(x + len, y - 5);
            }
            ctx.stroke();
          }
          x += len + 8;
        }
      }
      glow(s, s.w * 0.5, s.h * 0.4, s.w * 0.3, 'rgba(255,210,130,0.07)');
    },
  },

  dome: {
    particles: [{ kind: 'dust', count: 20, hue: '#b8c8e0' }],
    paint(s) {
      sky(s, [
        [0, '#0a0d18'],
        [0.5, '#0d1322'],
        [1, '#060810'],
      ]);
      const { ctx } = s;
      // vast dome curve
      ctx.strokeStyle = 'rgba(140,160,210,0.25)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(s.w * 0.5, s.h * 1.5, s.h * (1.1 + i * 0.09), Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      glow(s, s.w * 0.5, s.h * 0.3, s.w * 0.4, 'rgba(120,150,220,0.1)');
      // railing
      ctx.strokeStyle = '#241c2c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, s.h * 0.72);
      ctx.quadraticCurveTo(s.w * 0.5, s.h * 0.62, s.w, s.h * 0.72);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const x = (i / 11) * s.w;
        const y = s.h * 0.72 - Math.sin((i / 11) * Math.PI) * s.h * 0.075;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 40);
        ctx.stroke();
      }
      // rope
      if (s.flags['ropeTied']) {
        ctx.strokeStyle = '#8a6a42';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const sway = Math.sin(s.t * 0.8) * 6;
        ctx.moveTo(s.w * 0.5, s.h * 0.655);
        ctx.quadraticCurveTo(s.w * 0.5 + sway, s.h * 0.85, s.w * 0.5 + sway * 1.5, s.h * 1.02);
        ctx.stroke();
      }
      // darkness below
      const g = ctx.createLinearGradient(0, s.h * 0.7, 0, s.h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, '#000');
      ctx.fillStyle = g;
      ctx.fillRect(0, s.h * 0.7, s.w, s.h * 0.3);
    },
  },

  torchRoom: {
    particles: [
      { kind: 'ember', count: 18, hue: '#ffb45a' },
      { kind: 'dust', count: 10, hue: '#e0c8a8' },
    ],
    paint(s) {
      caveBase(s, 281, {
        glowColor: 'rgba(255,150,60,0.22)',
        glowX: s.w * 0.5, glowY: s.h * 0.52, glowR: s.w * 0.45,
      });
      const { ctx } = s;
      // pedestal
      const px = s.w * 0.5, py = s.h * 0.82;
      ctx.fillStyle = '#d8cfc4';
      ctx.fillRect(px - 22, py - 70, 44, 70);
      ctx.fillRect(px - 34, py - 76, 68, 10);
      ctx.fillRect(px - 34, py - 6, 68, 8);
      // flame
      const flick = Math.sin(s.t * 8) * 4 + Math.sin(s.t * 13) * 2;
      glow(s, px, py - 96, 46 + flick, 'rgba(255,190,90,0.9)');
      glow(s, px, py - 100, 110, 'rgba(255,140,50,0.4)');
      ctx.fillStyle = '#fff0c0';
      ctx.beginPath();
      ctx.ellipse(px, py - 94, 7, 15 + flick * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // rope from above
      if (s.flags['ropeTied']) {
        ctx.strokeStyle = '#8a6a42';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const sway = Math.sin(s.t * 0.8) * 8;
        ctx.moveTo(s.w * 0.3, 0);
        ctx.quadraticCurveTo(s.w * 0.3 + sway, s.h * 0.14, s.w * 0.3 + sway, s.h * 0.26);
        ctx.stroke();
      }
    },
  },

  temple: {
    particles: [{ kind: 'dust', count: 22, hue: '#d8c8a0' }],
    paint(s) {
      sky(s, [
        [0, '#0d0b14'],
        [0.6, '#181226'],
        [1, '#241a2e'],
      ]);
      const { ctx } = s;
      lightShaft(s, s.w * 0.32, 60, s.w * 0.38, 180, s.h, 'rgba(230,200,140,0.1)', 1);
      lightShaft(s, s.w * 0.66, 50, s.w * 0.6, 150, s.h, 'rgba(230,200,140,0.08)', 1);
      // marble pillars
      for (let i = 0; i < 4; i++) {
        const x = s.w * (0.14 + i * 0.24);
        const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
        g.addColorStop(0, '#1c1626');
        g.addColorStop(0.5, '#4a3f56');
        g.addColorStop(1, '#171220');
        ctx.fillStyle = g;
        ctx.fillRect(x - 26, s.h * 0.14, 52, s.h * 0.72);
        ctx.fillRect(x - 34, s.h * 0.1, 68, 16);
        ctx.fillRect(x - 34, s.h * 0.84, 68, 14);
      }
      ridge(s, s.h * 0.9, 6, 0.3, '#0a0812', 291);
      glow(s, s.w * 0.5, s.h * 0.5, s.w * 0.35, 'rgba(200,170,110,0.08)');
    },
  },

  egyptian: {
    particles: [
      { kind: 'sparkle', count: 16, hue: '#ffd97a' },
      { kind: 'dust', count: 12, hue: '#d8b880' },
    ],
    paint(s) {
      sky(s, [
        [0, '#150e08'],
        [0.6, '#241708'],
        [1, '#33200a'],
      ]);
      const { ctx } = s;
      glow(s, s.w * 0.5, s.h * 0.62, s.w * 0.4, 'rgba(255,180,60,0.18)');
      // hieroglyph columns
      const rnd = mulberry32(301);
      ctx.strokeStyle = 'rgba(255,205,110,0.3)';
      ctx.lineWidth = 2;
      for (let c = 0; c < 6; c++) {
        const x = s.w * (0.1 + c * 0.16);
        for (let y = s.h * 0.14; y < s.h * 0.6; y += 26) {
          const kind = Math.floor(rnd() * 3);
          ctx.beginPath();
          if (kind === 0) ctx.arc(x, y, 6, 0, Math.PI * 2);
          else if (kind === 1) { ctx.moveTo(x - 7, y + 6); ctx.lineTo(x, y - 6); ctx.lineTo(x + 7, y + 6); ctx.closePath(); }
          else { ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); }
          ctx.stroke();
        }
      }
      // the golden coffin
      const cx = s.w * 0.5, cy = s.h * 0.78;
      ctx.save();
      const g = ctx.createLinearGradient(cx - 110, cy, cx + 110, cy);
      g.addColorStop(0, '#8a6018');
      g.addColorStop(0.5, '#ffce5e');
      g.addColorStop(1, '#7a5414');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - 110, cy + 26);
      ctx.lineTo(cx - 80, cy - 30);
      ctx.lineTo(cx + 80, cy - 30);
      ctx.lineTo(cx + 110, cy + 26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(s, cx, cy - 10, 130, 'rgba(255,205,90,0.3)');
    },
  },

  altar: {
    particles: [
      { kind: 'ember', count: 6, hue: '#ffd08a' },
      { kind: 'dust', count: 16, hue: '#d8c8b0' },
    ],
    paint(s) {
      sky(s, [
        [0, '#0d0a12'],
        [0.6, '#1a1420'],
        [1, '#262030'],
      ]);
      lightShaft(s, s.w * 0.5, 70, s.w * 0.5, 210, s.h * 0.96, 'rgba(255,235,190,0.14)', 1);
      const { ctx } = s;
      // altar block
      const ax = s.w * 0.5, ay = s.h * 0.74;
      const g = ctx.createLinearGradient(ax - 90, ay, ax + 90, ay);
      g.addColorStop(0, '#3a3444');
      g.addColorStop(0.5, '#8d8498');
      g.addColorStop(1, '#332e40');
      ctx.fillStyle = g;
      ctx.fillRect(ax - 90, ay - 40, 180, 76);
      ctx.fillRect(ax - 104, ay - 52, 208, 14);
      // candles
      for (const dx of [-58, 58]) {
        ctx.fillStyle = '#e8dcc8';
        ctx.fillRect(ax + dx - 4, ay - 84, 8, 32);
        const flick = Math.sin(s.t * 9 + dx) * 2;
        glow(s, ax + dx, ay - 90, 22 + flick, 'rgba(255,205,120,0.85)');
      }
      glow(s, ax, ay - 60, 140, 'rgba(255,230,170,0.14)');
      // dark hole in the corner
      ctx.fillStyle = '#010102';
      ctx.beginPath();
      ctx.ellipse(s.w * 0.85, s.h * 0.94, 55, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  loudRoom: {
    particles: [
      { kind: 'mist', count: 14, hue: 'rgba(140,190,230,0.5)' },
      { kind: 'sparkle', count: 18, hue: '#bfe8ff' },
    ],
    paint(s) {
      caveBase(s, 311, { mid: '#0c1622', near: '#12202e', glowColor: 'rgba(90,170,230,0.14)' });
      const { ctx } = s;
      // sheet of water down the far wall
      const g = ctx.createLinearGradient(0, s.h * 0.1, 0, s.h * 0.8);
      g.addColorStop(0, 'rgba(150,210,255,0)');
      g.addColorStop(0.5, 'rgba(150,210,255,0.22)');
      g.addColorStop(1, 'rgba(150,210,255,0.05)');
      ctx.fillStyle = g;
      ctx.fillRect(s.w * 0.6, s.h * 0.1, s.w * 0.32, s.h * 0.7);
      ctx.strokeStyle = 'rgba(200,235,255,0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const x = s.w * (0.62 + i * 0.05);
        const off = (s.t * 300 + i * 61) % (s.h * 0.66);
        ctx.beginPath();
        ctx.moveTo(x, s.h * 0.1 + off);
        ctx.lineTo(x, s.h * 0.1 + off + 20);
        ctx.stroke();
      }
      // concentric sound rings
      if (!s.flags['echoSolved']) {
        ctx.strokeStyle = 'rgba(160,210,255,0.12)';
        for (let i = 0; i < 4; i++) {
          const r = ((s.t * 60 + i * 70) % 280) + 10;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.w * 0.4, s.h * 0.6, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // platinum gleam
      glow(s, s.w * 0.35, s.h * 0.84, 40, 'rgba(230,240,255,0.35)');
    },
  },

  deepCanyon: {
    particles: [{ kind: 'mist', count: 10, hue: 'rgba(90,130,180,0.5)' }],
    paint(s) {
      sky(s, [
        [0, '#070a12'],
        [0.6, '#0c1220'],
        [1, '#0a0e18'],
      ]);
      const { ctx } = s;
      // canyon walls in layers going down
      ridge(s, s.h * 0.4, 30, 0.9, '#0e1424', 321);
      ridge(s, s.h * 0.55, 36, 0.9, '#0a0f1c', 322);
      ridge(s, s.h * 0.72, 40, 0.9, '#060a14', 323);
      // glow from far below
      glow(s, s.w * 0.5, s.h * 1.05, s.w * 0.4, 'rgba(80,160,220,0.25)');
      const g = ctx.createLinearGradient(0, s.h * 0.6, 0, s.h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(30,70,110,0.3)');
      ctx.fillStyle = g;
      ctx.fillRect(0, s.h * 0.6, s.w, s.h * 0.4);
    },
  },

  reservoir: {
    particles: [
      { kind: 'mist', count: 12, hue: 'rgba(120,170,210,0.5)' },
      { kind: 'sparkle', count: 16, hue: '#a8d8f0' },
    ],
    paint(s) {
      const drained = s.flags['reservoirDrained'];
      caveBase(s, 331, { mid: '#0b141e', near: '#101c28', glowColor: 'rgba(80,150,210,0.12)', floorY: s.h * 0.66 });
      const { ctx } = s;
      if (!drained) {
        // vast dark water with moving highlights
        const g = ctx.createLinearGradient(0, s.h * 0.66, 0, s.h);
        g.addColorStop(0, '#16283a');
        g.addColorStop(1, '#060c14');
        ctx.fillStyle = g;
        ctx.fillRect(0, s.h * 0.66, s.w, s.h * 0.34);
        ctx.strokeStyle = 'rgba(140,200,240,0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
          const y = s.h * (0.68 + i * 0.03);
          const off = Math.sin(s.t * 0.9 + i * 1.4) * 24;
          ctx.beginPath();
          ctx.moveTo(s.w * 0.15 + off, y);
          ctx.lineTo(s.w * 0.55 + off, y);
          ctx.stroke();
        }
      } else {
        // mud flats and the trunk
        const g = ctx.createLinearGradient(0, s.h * 0.66, 0, s.h);
        g.addColorStop(0, '#2a2018');
        g.addColorStop(1, '#120c08');
        ctx.fillStyle = g;
        ctx.fillRect(0, s.h * 0.66, s.w, s.h * 0.34);
        // stream
        ctx.fillStyle = 'rgba(100,150,190,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, s.h * 0.74);
        ctx.quadraticCurveTo(s.w * 0.5, s.h * 0.7, s.w, s.h * 0.76);
        ctx.quadraticCurveTo(s.w * 0.5, s.h * 0.76, 0, s.h * 0.78);
        ctx.closePath();
        ctx.fill();
        // trunk of jewels
        const tx = s.w * 0.55, ty = s.h * 0.85;
        ctx.fillStyle = '#3d2c1a';
        ctx.fillRect(tx - 40, ty - 26, 80, 30);
        ctx.beginPath();
        ctx.ellipse(tx, ty - 26, 40, 12, 0, Math.PI, 0);
        ctx.fill();
        glow(s, tx, ty - 20, 60, 'rgba(255,120,200,0.3)');
        glow(s, tx - 14, ty - 24, 20, 'rgba(120,255,220,0.5)');
        glow(s, tx + 16, ty - 22, 18, 'rgba(255,230,120,0.5)');
      }
    },
  },

  dam: {
    particles: [
      { kind: 'mist', count: 12, hue: 'rgba(150,190,220,0.5)' },
      { kind: 'sparkle', count: 10, hue: '#cfe8ff' },
    ],
    paint(s) {
      sky(s, [
        [0, '#0a1018'],
        [0.5, '#122030'],
        [1, '#1a2c40'],
      ]);
      const { ctx } = s;
      glow(s, s.w * 0.5, s.h * 0.3, s.w * 0.4, 'rgba(100,170,230,0.12)');
      // the great dam wall sweeping across
      const g = ctx.createLinearGradient(0, s.h * 0.35, 0, s.h);
      g.addColorStop(0, '#2c3648');
      g.addColorStop(1, '#141a26');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, s.h * 0.42);
      ctx.quadraticCurveTo(s.w * 0.5, s.h * 0.3, s.w, s.h * 0.46);
      ctx.lineTo(s.w, s.h);
      ctx.lineTo(0, s.h);
      ctx.closePath();
      ctx.fill();
      // expansion joints
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      for (let i = 1; i < 7; i++) {
        const x = (i / 7) * s.w;
        ctx.beginPath();
        ctx.moveTo(x, s.h * 0.38 + Math.sin((i / 7) * Math.PI) * -s.h * 0.06);
        ctx.lineTo(x, s.h);
        ctx.stroke();
      }
      // sluice torrent
      if (s.flags['gatesOpen']) {
        const wg = ctx.createLinearGradient(0, s.h * 0.5, 0, s.h);
        wg.addColorStop(0, 'rgba(190,225,255,0.85)');
        wg.addColorStop(1, 'rgba(120,180,230,0.1)');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(s.w * 0.42, s.h * 0.48);
        ctx.lineTo(s.w * 0.58, s.h * 0.48);
        ctx.lineTo(s.w * 0.66, s.h);
        ctx.lineTo(s.w * 0.34, s.h);
        ctx.closePath();
        ctx.fill();
        fog(s, s.h * 0.9, 50, 'rgba(210,235,255,0.7)', 0.3, 16, 341);
      }
      // control panel + bubble
      ctx.fillStyle = '#0d121c';
      ctx.fillRect(s.w * 0.12, s.h * 0.6, 90, 60);
      const bubbleOn = s.flags['bubbleGlowing'];
      ctx.fillStyle = bubbleOn ? '#7aff9a' : '#1d3324';
      ctx.beginPath();
      ctx.arc(s.w * 0.12 + 45, s.h * 0.6 + 18, 8, 0, Math.PI * 2);
      ctx.fill();
      if (bubbleOn) glow(s, s.w * 0.12 + 45, s.h * 0.6 + 18, 30, 'rgba(120,255,150,0.6)');
      // bolt
      ctx.fillStyle = '#4a5468';
      ctx.beginPath();
      ctx.arc(s.w * 0.12 + 45, s.h * 0.6 + 44, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  lobby: {
    particles: [{ kind: 'dust', count: 14, hue: '#c8b8a0' }],
    paint(s) {
      caveBase(s, 351, { mid: '#141210', near: '#201c16', glowColor: 'rgba(220,180,110,0.08)' });
      const { ctx } = s;
      // faded tourist posters
      for (const [x, hue] of [[0.2, '#3a4a5c'], [0.5, '#5c4a3a'], [0.76, '#3a5c4a']] as [number, string][]) {
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(s.w * x, s.h * 0.26, 90, 120);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#0c0a08';
        ctx.strokeRect(s.w * x, s.h * 0.26, 90, 120);
      }
      // reception desk
      ctx.fillStyle = '#181410';
      ctx.fillRect(s.w * 0.3, s.h * 0.72, s.w * 0.4, s.h * 0.16);
    },
  },

  maintenance: {
    particles: [{ kind: 'dust', count: 10, hue: '#b0b8c0' }],
    paint(s) {
      caveBase(s, 361, { mid: '#10141a', near: '#1a2028', glowColor: 'rgba(150,170,200,0.08)' });
      const { ctx } = s;
      // pipes
      ctx.strokeStyle = '#2c3440';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(0, s.h * 0.2);
      ctx.lineTo(s.w * 0.7, s.h * 0.2);
      ctx.quadraticCurveTo(s.w * 0.78, s.h * 0.2, s.w * 0.78, s.h * 0.3);
      ctx.lineTo(s.w * 0.78, s.h * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.w, s.h * 0.34);
      ctx.lineTo(s.w * 0.2, s.h * 0.34);
      ctx.stroke();
      // button panel
      const bx = s.w * 0.24, by = s.h * 0.56;
      ctx.fillStyle = '#0d1016';
      ctx.fillRect(bx - 20, by - 20, 190, 70);
      const colors = ['#4a7ac8', '#e8c84a', '#8a5c3a', '#c84a4a'];
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(bx + i * 44, by + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        const pulse = 0.2 + 0.15 * Math.sin(s.t * 2 + i * 1.7);
        glow(s, bx + i * 44, by + 14, 20, `rgba(255,255,255,${pulse * 0.25})`);
      });
    },
  },

  maze: {
    particles: [{ kind: 'dust', count: 8, hue: '#98a0b0' }],
    paint(s) {
      caveBase(s, 371, { base: '#04050a', mid: '#080b14', near: '#0e121e', glowColor: 'rgba(100,120,160,0.06)' });
      const { ctx } = s;
      // oppressive close walls, offset openings
      ctx.fillStyle = '#03040a';
      ctx.beginPath();
      ctx.moveTo(s.w * 0.3, 0);
      ctx.lineTo(s.w * 0.44, s.h * 0.4);
      ctx.lineTo(s.w * 0.4, s.h);
      ctx.lineTo(s.w * 0.1, s.h);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s.w, 0);
      ctx.lineTo(s.w * 0.68, s.h * 0.3);
      ctx.lineTo(s.w * 0.74, s.h);
      ctx.lineTo(s.w, s.h);
      ctx.closePath();
      ctx.fill();
      glow(s, s.w * 0.56, s.h * 0.55, 60, 'rgba(140,160,220,0.1)');
    },
  },

  mazeSkeleton: {
    particles: [{ kind: 'dust', count: 10, hue: '#a8a090' }],
    paint(s) {
      sceneDefs.maze.paint(s);
      const { ctx } = s;
      // the fallen adventurer
      const sx = s.w * 0.52, sy = s.h * 0.88;
      ctx.strokeStyle = '#c8bfa8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      // ribcage arcs
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(sx - 20 + i * 12, sy - 8, 12, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      // skull
      ctx.fillStyle = '#d8cfb8';
      ctx.beginPath();
      ctx.arc(sx + 44, sy - 12, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(sx + 41, sy - 14, 2.5, 0, Math.PI * 2);
      ctx.arc(sx + 48, sy - 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // key glint
      glow(s, sx - 50, sy - 4, 18, 'rgba(255,230,140,0.55)');
    },
  },

  grating: {
    particles: [{ kind: 'dust', count: 24, hue: '#cfe0b8' }],
    paint(s) {
      caveBase(s, 381, { base: '#05070c', mid: '#0a0e16', near: '#10141e' });
      const open = s.flags['gratingOpen'];
      // light through the grid
      lightShaft(s, s.w * 0.5, open ? 150 : 90, s.w * 0.5, open ? 320 : 200, s.h * 0.95, `rgba(220,255,190,${open ? 0.22 : 0.1})`, 1);
      const { ctx } = s;
      // the grating itself overhead
      ctx.save();
      ctx.strokeStyle = '#1c1a16';
      ctx.lineWidth = 8;
      const gy = s.h * 0.08;
      ctx.beginPath();
      ctx.ellipse(s.w * 0.5, gy, 120, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (!open) {
        for (let i = -4; i <= 4; i++) {
          ctx.beginPath();
          ctx.moveTo(s.w * 0.5 + i * 26 - 10, gy - 20);
          ctx.lineTo(s.w * 0.5 + i * 26 + 10, gy + 20);
          ctx.stroke();
        }
      }
      ctx.restore();
      glow(s, s.w * 0.5, gy, 90, `rgba(200,255,170,${open ? 0.4 : 0.16})`);
    },
  },

  cyclops: {
    particles: [{ kind: 'dust', count: 10, hue: '#c0a890' }],
    paint(s) {
      const fled = s.flags['cyclopsFled'];
      const asleep = s.flags['cyclopsAsleep'];
      caveBase(s, 391, { mid: '#120c10', near: '#1e1418', glowColor: fled ? 'rgba(255,220,150,0.12)' : 'rgba(200,80,60,0.12)' });
      const { ctx } = s;
      if (fled) {
        // smashed east wall with light pouring through
        ctx.fillStyle = '#08050a';
        ctx.beginPath();
        ctx.moveTo(s.w * 0.7, s.h * 0.2);
        ctx.lineTo(s.w * 0.92, s.h * 0.16);
        ctx.lineTo(s.w * 0.96, s.h * 0.86);
        ctx.lineTo(s.w * 0.66, s.h * 0.9);
        ctx.closePath();
        ctx.fill();
        lightShaft(s, s.w * 0.82, 140, s.w * 0.74, 220, s.h, 'rgba(255,225,160,0.14)', 1);
      } else {
        // the giant, breathing
        const bx = s.w * 0.6, by = s.h * 0.9;
        const breathe = Math.sin(s.t * (asleep ? 0.7 : 1.6)) * 8;
        ctx.fillStyle = '#0c0709';
        ctx.beginPath();
        ctx.ellipse(bx, by - 100, 110, 130 + breathe, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by - 250 + breathe * 0.5, 55, 0, Math.PI * 2);
        ctx.fill();
        if (!asleep) {
          // the eye
          const ey = by - 255 + breathe * 0.5;
          glow(s, bx, ey, 40, 'rgba(255,180,60,0.7)');
          ctx.fillStyle = '#ffcf6a';
          ctx.beginPath();
          ctx.ellipse(bx, ey, 16, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#160a06';
          ctx.beginPath();
          ctx.ellipse(bx + Math.sin(s.t * 0.6) * 5, ey, 5, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // zzz
          ctx.fillStyle = 'rgba(200,190,220,0.5)';
          ctx.font = `${Math.round(s.h * 0.05)}px serif`;
          for (let i = 0; i < 3; i++) {
            const zt = (s.t * 0.5 + i * 0.33) % 1;
            ctx.globalAlpha = (1 - zt) * 0.6;
            ctx.fillText('z', bx + 70 + i * 18, by - 260 - zt * 60);
          }
          ctx.globalAlpha = 1;
        }
      }
    },
  },

  treasure: {
    particles: [
      { kind: 'sparkle', count: 30, hue: '#ffe08a' },
      { kind: 'firefly', count: 6, hue: '#ffd9a0' },
    ],
    paint(s) {
      const thiefDead = s.flags['thiefDead'];
      caveBase(s, 401, { mid: '#141008', near: '#241a0a', glowColor: 'rgba(255,200,90,0.2)', glowY: s.h * 0.7 });
      const { ctx } = s;
      // heaps of gold
      ridge(s, s.h * 0.82, 20, 0.8, '#2e2008', 402);
      glow(s, s.w * 0.3, s.h * 0.85, 90, 'rgba(255,210,110,0.35)');
      glow(s, s.w * 0.7, s.h * 0.88, 110, 'rgba(255,190,90,0.3)');
      // chalice on a stand
      const cx = s.w * 0.5, cy = s.h * 0.7;
      ctx.fillStyle = '#3a2c14';
      ctx.fillRect(cx - 16, cy, 32, s.h * 0.12);
      ctx.fillStyle = '#e8ecf4';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 34);
      ctx.quadraticCurveTo(cx, cy - 6, cx + 20, cy - 34);
      ctx.lineTo(cx + 14, cy - 44);
      ctx.lineTo(cx - 14, cy - 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 3, cy - 12, 6, 14);
      glow(s, cx, cy - 34, 50, 'rgba(220,235,255,0.5)');
      if (!thiefDead) {
        // the thief lurking at the wall
        const tx = s.w * 0.82, ty = s.h * 0.86;
        ctx.fillStyle = '#0a070c';
        ctx.beginPath();
        ctx.ellipse(tx, ty - 60, 30, 62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx, ty - 130, 16, 0, Math.PI * 2);
        ctx.fill();
        // stiletto glint
        const glint = Math.max(0, Math.sin(s.t * 2.2));
        glow(s, tx - 26, ty - 80, 14, `rgba(220,230,255,${glint * 0.7})`);
      }
    },
  },

  // ---------- special
  darkness: {
    paint(s) {
      sky(s, [
        [0, '#000000'],
        [1, '#050508'],
      ]);
      // a pair of eyes blinks somewhere in the black
      const cycle = (s.t % 7) / 7;
      if (cycle > 0.72 && cycle < 0.9) {
        const rnd = mulberry32(Math.floor(s.t / 7) * 13 + 5);
        const x = s.w * (0.2 + rnd() * 0.6);
        const y = s.h * (0.3 + rnd() * 0.4);
        const blink = Math.min(1, Math.sin(((cycle - 0.72) / 0.18) * Math.PI) * 1.6);
        s.ctx.fillStyle = `rgba(255,210,80,${0.8 * blink})`;
        s.ctx.beginPath();
        s.ctx.ellipse(x - 14, y, 6, 8 * blink, 0, 0, Math.PI * 2);
        s.ctx.ellipse(x + 14, y, 6, 8 * blink, 0, 0, Math.PI * 2);
        s.ctx.fill();
        glow(s, x, y, 50, `rgba(255,180,60,${0.14 * blink})`);
      }
    },
  },
};
