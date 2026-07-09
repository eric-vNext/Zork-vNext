// High-fidelity scene set: the white house exterior and its interiors.
// Each scene splits into paintBase (static, cached by the renderer) and
// paint (animated layer drawn on top every frame).

import type { SceneDef } from './scenes';
import {
  type SceneCtx,
  boardedPlanks, bricks, clapboards, flames, flicker, fog, glow, grain,
  lightShaft, mulberry32, ridge, shade, shingles, softShadow, stars, treeBand,
} from './paint';

// ---------------------------------------------------------------------------
// shared: the dusk sky and the colonial house
// ---------------------------------------------------------------------------

function duskSky(s: SceneCtx, sunX: number) {
  const { ctx, w, h } = s;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#10162e');
  g.addColorStop(0.28, '#2f2b52');
  g.addColorStop(0.5, '#65486a');
  g.addColorStop(0.7, '#b56a56');
  g.addColorStop(0.86, '#e8a463');
  g.addColorStop(1, '#f6c97d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // the sinking sun
  glow(s, sunX, h * 0.68, w * 0.34, 'rgba(255,190,105,0.65)');
  glow(s, sunX, h * 0.68, w * 0.12, 'rgba(255,240,200,0.85)');
}

function distantWoods(s: SceneCtx, seed: number) {
  const { h } = s;
  ridge(s, h * 0.58, 24, 0.5, 'rgba(64,50,88,0.55)', seed); // hazed far hills
  ridge(s, h * 0.66, 20, 0.6, 'rgba(45,36,68,0.75)', seed + 1);
  treeBand(s, h * 0.755, h * 0.18, '#221c38', seed + 2, 30);
  treeBand(s, h * 0.795, h * 0.15, '#171226', seed + 3, 40);
}

function meadow(s: SceneCtx, seed: number) {
  const { ctx, w, h } = s;
  const g = ctx.createLinearGradient(0, h * 0.76, 0, h);
  g.addColorStop(0, '#3d2c40');
  g.addColorStop(0.5, '#2a1d30');
  g.addColorStop(1, '#150e1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.76, w, h * 0.24);
  // static grass texture: fine dark strokes
  const rnd = mulberry32(seed);
  ctx.strokeStyle = 'rgba(10,6,16,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 160; i++) {
    const x = rnd() * w;
    const y = h * (0.78 + rnd() * 0.21);
    const l = 3 + rnd() * 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 3, y - l);
    ctx.stroke();
  }
}

function wornPath(s: SceneCtx, fromX: number, toX: number, toY: number) {
  const { ctx, w, h } = s;
  ctx.save();
  const g = ctx.createLinearGradient(0, toY, 0, h);
  g.addColorStop(0, 'rgba(122,92,84,0.35)');
  g.addColorStop(1, 'rgba(140,105,92,0.6)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(fromX - w * 0.09, h + 4);
  ctx.quadraticCurveTo(fromX - w * 0.03, h * 0.92, toX - 14, toY);
  ctx.lineTo(toX + 14, toY);
  ctx.quadraticCurveTo(fromX + w * 0.16, h * 0.94, fromX + w * 0.13, h + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface HouseOpts {
  cx: number;
  gy: number;
  k: number;
  view: 'front' | 'side' | 'back';
  windowOpen?: boolean;
}

/** returns chimney-top position so scenes can attach smoke */
function colonialHouse(s: SceneCtx, o: HouseOpts): { chimX: number; chimY: number } {
  const { ctx } = s;
  const k = o.k;
  const W = 168 * k;
  const H = 104 * k;
  const x0 = o.cx - W / 2;
  const y0 = o.gy - H;

  softShadow(s, o.cx - W * 0.12, o.gy + 6 * k, W * 0.72, 14 * k, 0.45);

  // --- walls: warm-lit right (sun side), cool left
  clapboards(s, x0, y0, W, H, '#c9b6c0', '#f6e9d0', 401, 5.5 * k);
  // ambient occlusion under the eaves
  let g = ctx.createLinearGradient(0, y0, 0, y0 + 14 * k);
  g.addColorStop(0, 'rgba(38,22,40,0.5)');
  g.addColorStop(1, 'rgba(38,22,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, W, 14 * k);
  // corner boards
  ctx.fillStyle = '#e8dcc6';
  ctx.fillRect(x0, y0, 4 * k, H);
  ctx.fillRect(x0 + W - 4 * k, y0, 4 * k, H);
  // foundation stones
  ctx.fillStyle = '#4a3a44';
  ctx.fillRect(x0, o.gy - 7 * k, W, 7 * k);
  const rnd = mulberry32(402);
  for (let sx = x0; sx < x0 + W; sx += 12 * k) {
    ctx.fillStyle = shade('#5c4a52', (rnd() - 0.5) * 0.25);
    ctx.fillRect(sx + 1, o.gy - 6 * k, 10 * k, 5 * k);
  }

  // --- roof
  const eaveY = y0;
  const ridgeY = y0 - 42 * k;
  shingles(
    s,
    [
      [x0 - 9 * k, eaveY],
      [x0 + 26 * k, ridgeY],
      [x0 + W - 26 * k, ridgeY],
      [x0 + W + 9 * k, eaveY],
    ],
    '#443344',
    403,
    6.5 * k
  );
  // ridge cap catches the last light
  ctx.strokeStyle = 'rgba(255,205,150,0.55)';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.moveTo(x0 + 25 * k, ridgeY);
  ctx.lineTo(x0 + W - 25 * k, ridgeY);
  ctx.stroke();
  // fascia board
  ctx.fillStyle = '#efe2ca';
  ctx.fillRect(x0 - 9 * k, eaveY - 3 * k, W + 18 * k, 4.5 * k);

  // --- chimney
  const chimX = x0 + W * 0.68;
  const chimY = ridgeY - 26 * k;
  bricks(s, chimX - 8 * k, chimY, 16 * k, 34 * k, '#7a4638', 404, 8 * k, 4 * k);
  ctx.fillStyle = '#5a3630';
  ctx.fillRect(chimX - 10 * k, chimY - 3 * k, 20 * k, 4 * k);

  // --- windows
  const win = (wx: number, wy: number, ww: number, wh: number, mode: 'dusk' | 'boarded' | 'lit') => {
    // trim
    ctx.fillStyle = '#ece0c8';
    ctx.fillRect(wx - 2.5 * k, wy - 2.5 * k, ww + 5 * k, wh + 5 * k);
    // recess
    ctx.fillStyle = '#241a28';
    ctx.fillRect(wx, wy, ww, wh);
    if (mode === 'boarded') {
      boardedPlanks(s, wx, wy, ww, wh, '#8a7358', 405 + Math.round(wx));
    } else {
      // glass: sky reflection above, warmth below
      const gg = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (mode === 'lit') {
        gg.addColorStop(0, '#f7c97e');
        gg.addColorStop(1, '#e89a4e');
      } else {
        gg.addColorStop(0, '#3d3a5e');
        gg.addColorStop(0.55, '#2a2338');
        gg.addColorStop(1, '#54344a');
      }
      ctx.fillStyle = gg;
      ctx.fillRect(wx + 1 * k, wy + 1 * k, ww - 2 * k, wh - 2 * k);
      // diagonal glint
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx, wy, ww, wh);
      ctx.clip();
      ctx.strokeStyle = mode === 'lit' ? 'rgba(255,245,215,0.5)' : 'rgba(190,190,230,0.28)';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.moveTo(wx - 4 * k, wy + wh * 0.75);
      ctx.lineTo(wx + ww * 0.7, wy - 4 * k);
      ctx.stroke();
      ctx.restore();
      // mullions
      ctx.strokeStyle = '#e8dcc4';
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      ctx.moveTo(wx + ww / 2, wy);
      ctx.lineTo(wx + ww / 2, wy + wh);
      ctx.moveTo(wx, wy + wh / 3);
      ctx.lineTo(wx + ww, wy + wh / 3);
      ctx.moveTo(wx, wy + (wh * 2) / 3);
      ctx.lineTo(wx + ww, wy + (wh * 2) / 3);
      ctx.stroke();
      if (mode === 'lit') glow(s, wx + ww / 2, wy + wh / 2, ww * 2.2, 'rgba(255,190,110,0.4)');
    }
    // sill
    ctx.fillStyle = '#ded2b8';
    ctx.fillRect(wx - 3.5 * k, wy + wh, ww + 7 * k, 3 * k);
    ctx.fillStyle = 'rgba(30,18,32,0.4)';
    ctx.fillRect(wx - 3.5 * k, wy + wh + 3 * k, ww + 7 * k, 2 * k);
    // shutters
    for (const sxx of [wx - 9.5 * k, wx + ww + 2.5 * k]) {
      ctx.fillStyle = '#39464a';
      ctx.fillRect(sxx, wy - 1 * k, 7 * k, wh + 2 * k);
      ctx.strokeStyle = 'rgba(12,18,20,0.6)';
      ctx.lineWidth = 1;
      for (let ly = wy + 3 * k; ly < wy + wh - 2 * k; ly += 4 * k) {
        ctx.beginPath();
        ctx.moveTo(sxx + 1 * k, ly);
        ctx.lineTo(sxx + 6 * k, ly);
        ctx.stroke();
      }
    }
  };

  const upperY = y0 + 12 * k;
  const lowerY = y0 + 58 * k;
  const ww = 19 * k;
  const wh = 26 * k;

  if (o.view === 'front') {
    win(o.cx - 52 * k, upperY, ww, wh, 'dusk');
    win(o.cx + 33 * k, upperY, ww, wh, 'dusk');
    win(o.cx - 52 * k, lowerY, ww, wh, 'dusk');
    win(o.cx + 33 * k, lowerY, ww, wh, 'dusk');
    // --- the boarded front door
    const dw = 26 * k;
    const dh = 46 * k;
    const dx = o.cx - dw / 2;
    const dy = o.gy - dh;
    ctx.fillStyle = '#ece0c8'; // architrave
    ctx.fillRect(dx - 4 * k, dy - 6 * k, dw + 8 * k, dh + 6 * k);
    ctx.fillStyle = '#2e2028';
    ctx.fillRect(dx - 1.5 * k, dy - 3 * k, dw + 3 * k, dh + 3 * k);
    ctx.fillStyle = '#5c4434';
    ctx.fillRect(dx, dy, dw, dh);
    grain(s, dx, dy, dw, dh, 406, true, 0.14);
    // recessed panels
    ctx.fillStyle = 'rgba(20,10,10,0.35)';
    for (const [px, py] of [[0.14, 0.08], [0.56, 0.08], [0.14, 0.52], [0.56, 0.52]] as const) {
      ctx.fillRect(dx + dw * px, dy + dh * py, dw * 0.3, dh * 0.36);
    }
    boardedPlanks(s, dx, dy, dw, dh, '#93805e', 407);
    // stone step
    ctx.fillStyle = '#6b5a5e';
    ctx.fillRect(dx - 5 * k, o.gy, dw + 10 * k, 5 * k);
    ctx.fillStyle = 'rgba(255,220,170,0.25)';
    ctx.fillRect(dx - 5 * k, o.gy, dw + 10 * k, 1.5 * k);
  } else if (o.view === 'back') {
    win(o.cx - 56 * k, upperY, ww, wh, 'boarded');
    win(o.cx + 37 * k, upperY, ww, wh, 'boarded');
    win(o.cx - 56 * k, lowerY, ww, wh, 'boarded');
    // THE small kitchen window — your way in
    const kw = 24 * k;
    const kh = 20 * k;
    const kx = o.cx + 34 * k;
    const ky = o.gy - 34 * k;
    win(kx, ky, kw, kh, 'lit');
    if (o.windowOpen) {
      // raised sash: a dark slot along the bottom
      ctx.fillStyle = '#120a14';
      ctx.fillRect(kx + 1 * k, ky + kh - 5 * k, kw - 2 * k, 5 * k);
    }
    // back step
    ctx.fillStyle = '#6b5a5e';
    ctx.fillRect(kx - 2 * k, o.gy, kw + 4 * k, 4 * k);
  } else {
    // side: everything boarded
    win(o.cx - 45 * k, upperY, ww, wh, 'boarded');
    win(o.cx + 26 * k, upperY, ww, wh, 'boarded');
    win(o.cx - 45 * k, lowerY, ww, wh, 'boarded');
    win(o.cx + 26 * k, lowerY, ww, wh, 'boarded');
    // tiny attic vent in the gable line
    ctx.fillStyle = '#241a28';
    ctx.beginPath();
    ctx.arc(o.cx, y0 - 20 * k, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ded2b8';
    ctx.lineWidth = 1.5 * k;
    ctx.stroke();
  }

  // climbing ivy on the shadow corner
  const ivy = mulberry32(408);
  ctx.fillStyle = 'rgba(38,58,42,0.8)';
  for (let i = 0; i < 26; i++) {
    const iy = o.gy - ivy() * H * 0.7;
    const ix = x0 + ivy() * 16 * k * (1 - (o.gy - iy) / H);
    ctx.beginPath();
    ctx.arc(ix, iy, (1.5 + ivy() * 3) * k, 0, Math.PI * 2);
    ctx.fill();
  }

  return { chimX, chimY: chimY - 4 * k };
}

// --- shared dynamic bits ------------------------------------------------

function chimneySmoke(s: SceneCtx, chimX: number, chimY: number) {
  const { ctx } = s;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const p = (s.t * 0.1 + i * 0.2) % 1;
    const x = chimX + Math.sin(s.t * 0.6 + i * 2) * 5 - p * 22;
    const y = chimY - p * 75;
    const r = 4 + p * 17;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(200,185,205,${0.16 * (1 - p)})`);
    g.addColorStop(1, 'rgba(200,185,205,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function driftingClouds(s: SceneCtx, seed: number) {
  const { ctx, w, h } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const speed = 4 + i * 2.2;
    const span = w * 1.5;
    const x = ((s.t * speed + rnd() * span) % span) - w * 0.25;
    const y = h * (0.06 + rnd() * 0.16);
    const r = w * (0.1 + rnd() * 0.08);
    for (const [dx, dr] of [[-0.5, 0.7], [0, 1], [0.55, 0.75]] as const) {
      const g = ctx.createRadialGradient(x + dx * r, y, 0, x + dx * r, y, r * dr);
      g.addColorStop(0, 'rgba(235,180,160,0.10)');
      g.addColorStop(1, 'rgba(235,180,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + dx * r - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}

function swayingGrass(s: SceneCtx, seed: number, fromY: number) {
  const { ctx, w, h } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    const y = fromY + rnd() * (h - fromY);
    const near = (y - fromY) / (h - fromY);
    const l = 5 + near * 13 + rnd() * 5;
    const sway = Math.sin(s.t * 1.3 + x * 0.04 + rnd() * 6) * (1.5 + near * 2.5);
    ctx.strokeStyle = `rgba(${38 + near * 30},${30 + near * 22},${52 + near * 20},${0.5 + near * 0.4})`;
    ctx.lineWidth = 1 + near;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway * 0.5, y - l * 0.6, x + sway * 1.7, y - l);
    ctx.stroke();
  }
  ctx.restore();
}

function eveningBirds(s: SceneCtx) {
  const { ctx, w, h } = s;
  const cycle = 13;
  const p = (s.t % cycle) / cycle;
  if (p > 0.32) return;
  const k = p / 0.32;
  ctx.save();
  ctx.strokeStyle = 'rgba(20,14,32,0.75)';
  ctx.lineWidth = 1.6;
  for (let b = 0; b < 3; b++) {
    const bx = w * (-0.06 + k * 1.12) - b * 26;
    const by = h * (0.14 + b * 0.025) + Math.sin(k * 10 + b) * 7;
    const flap = Math.sin(s.t * 9 + b * 2) * 3.5;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - flap);
    ctx.quadraticCurveTo(bx, by + 2, bx + 6, by - flap);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// WEST OF HOUSE
// ---------------------------------------------------------------------------

let houseChim = { chimX: 0, chimY: 0 };

const whiteHouse: SceneDef = {
  particles: [
    { kind: 'firefly', count: 16, hue: '#ffe9a3' },
    { kind: 'leaf', count: 5, hue: '#caa46a' },
  ],
  paintBase(s) {
    duskSky(s, s.w * 0.78);
    distantWoods(s, 21);
    meadow(s, 23);
    const k = Math.min(s.w, 620) / 420;
    wornPath(s, s.w * 0.42, s.w * 0.6, s.h * 0.83);
    houseChim = colonialHouse(s, { cx: s.w * 0.6, gy: s.h * 0.815, k, view: 'front' });

    // the small mailbox, foreground left
    const { ctx } = s;
    const mx = s.w * 0.185;
    const my = s.h * 0.895;
    softShadow(s, mx + 6, my + 4, 30, 8, 0.4);
    ctx.fillStyle = '#4a3830';
    ctx.fillRect(mx - 2.5, my - 34, 5, 34);
    grain(s, mx - 2.5, my - 34, 5, 34, 31, true, 0.2);
    const bg = ctx.createLinearGradient(mx - 16, 0, mx + 16, 0);
    bg.addColorStop(0, '#3d3548');
    bg.addColorStop(0.6, '#6b5f78');
    bg.addColorStop(1, '#8a7a90');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(mx - 16, my - 52, 32, 19, [9, 9, 3, 3]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,225,180,0.3)'; // dusk glint on the lid
    ctx.beginPath();
    ctx.roundRect(mx - 16, my - 52, 32, 4, [9, 9, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#2a2230'; // door seam
    ctx.fillRect(mx + 12.5, my - 50, 2, 15);
    ctx.fillStyle = '#a5323a'; // the little flag
    ctx.fillRect(mx - 20, my - 56, 3, 10);
    ctx.fillRect(mx - 20, my - 56, 8, 4);
  },
  paint(s) {
    stars(s, 46, 11, s.h * 0.26, 0.8);
    driftingClouds(s, 12);
    eveningBirds(s);
    chimneySmoke(s, houseChim.chimX, houseChim.chimY);
    fog(s, s.h * 0.84, 34, 'rgba(255,185,120,0.45)', 0.13, 4, 3);
    swayingGrass(s, 24, s.h * 0.88);
  },
};

// ---------------------------------------------------------------------------
// NORTH / SOUTH OF HOUSE
// ---------------------------------------------------------------------------

let sideChim = { chimX: 0, chimY: 0 };

const houseSide: SceneDef = {
  particles: [{ kind: 'firefly', count: 11, hue: '#ffe9a3' }],
  paintBase(s) {
    duskSky(s, s.w * 0.24);
    distantWoods(s, 41);
    meadow(s, 43);
    wornPath(s, s.w * 0.62, s.w * 0.5, s.h * 0.86);
    const k = Math.min(s.w, 620) / 450;
    sideChim = colonialHouse(s, { cx: s.w * 0.36, gy: s.h * 0.83, k, view: 'side' });
  },
  paint(s) {
    stars(s, 40, 13, s.h * 0.26, 0.8);
    driftingClouds(s, 14);
    chimneySmoke(s, sideChim.chimX, sideChim.chimY);
    fog(s, s.h * 0.86, 30, 'rgba(255,185,120,0.4)', 0.12, 4, 5);
    swayingGrass(s, 44, s.h * 0.89);
  },
};

// ---------------------------------------------------------------------------
// BEHIND HOUSE
// ---------------------------------------------------------------------------

let backChim = { chimX: 0, chimY: 0 };

const behindHouse: SceneDef = {
  particles: [{ kind: 'firefly', count: 11, hue: '#ffe9a3' }],
  paintBase(s) {
    duskSky(s, s.w * 0.2);
    distantWoods(s, 51);
    meadow(s, 53);
    const k = Math.min(s.w, 620) / 440;
    wornPath(s, s.w * 0.7, s.w * 0.52, s.h * 0.845);
    backChim = colonialHouse(s, {
      cx: s.w * 0.38,
      gy: s.h * 0.825,
      k,
      view: 'back',
      windowOpen: s.flags['windowOpen'],
    });
  },
  paint(s) {
    stars(s, 40, 15, s.h * 0.26, 0.8);
    driftingClouds(s, 16);
    chimneySmoke(s, backChim.chimX, backChim.chimY);
    // warm spill from the kitchen window breathing gently
    const k = Math.min(s.w, 620) / 440;
    const wx = s.w * 0.38 + 34 * k + 12 * k;
    const wy = s.h * 0.825 - 24 * k;
    glow(s, wx, wy, 60 * k, `rgba(255,185,100,${0.1 + 0.05 * flicker(s.t, 4)})`);
    fog(s, s.h * 0.86, 30, 'rgba(255,185,120,0.4)', 0.12, 4, 7);
    swayingGrass(s, 54, s.h * 0.89);
  },
};

// ---------------------------------------------------------------------------
// KITCHEN
// ---------------------------------------------------------------------------

const kitchen: SceneDef = {
  particles: [
    { kind: 'dust', count: 22, hue: '#ffe6b8' },
    { kind: 'sparkle', count: 6, hue: '#ffedc9' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    // plaster wall, warm near the window (right), cool in the corners
    const wall = ctx.createLinearGradient(0, 0, w, 0);
    wall.addColorStop(0, '#2b1e2c');
    wall.addColorStop(0.62, '#48333c');
    wall.addColorStop(1, '#5c4340');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    // plaster mottle
    const rnd = mulberry32(61);
    for (let i = 0; i < 44; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,230,200,0.025)' : 'rgba(15,8,20,0.04)';
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h * 0.72, 12 + rnd() * 36, 0, Math.PI * 2);
      ctx.fill();
    }

    // ceiling + hewn beams
    ctx.fillStyle = '#150d18';
    ctx.fillRect(0, 0, w, h * 0.07);
    for (const by of [h * 0.09, h * 0.2]) {
      ctx.fillStyle = '#221420';
      ctx.fillRect(0, by - h * 0.022, w, h * 0.044);
      grain(s, 0, by - h * 0.022, w, h * 0.044, 62 + by, false, 0.12);
      ctx.fillStyle = 'rgba(255,215,170,0.08)';
      ctx.fillRect(0, by + h * 0.022 - 2, w, 2);
    }

    // west doorway (dark passage to the living room)
    ctx.fillStyle = '#0c0710';
    ctx.beginPath();
    ctx.roundRect(w * 0.005, h * 0.3, w * 0.105, h * 0.5, [6, 6, 0, 0]);
    ctx.fill();
    const dg = ctx.createLinearGradient(w * 0.005, 0, w * 0.11, 0);
    dg.addColorStop(0, 'rgba(60,35,45,0.5)');
    dg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(w * 0.005, h * 0.3, w * 0.105, h * 0.5);
    ctx.fillStyle = '#3a2a34'; // door frame
    ctx.fillRect(w * 0.108, h * 0.29, w * 0.015, h * 0.51);

    // the dark staircase upward, far right
    ctx.fillStyle = '#0a060e';
    ctx.fillRect(w * 0.885, h * 0.28, w * 0.115, h * 0.52);
    ctx.strokeStyle = 'rgba(255,190,130,0.14)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const sy = h * (0.74 - i * 0.09);
      ctx.beginPath();
      ctx.moveTo(w * (0.895 + i * 0.014), sy);
      ctx.lineTo(w * 0.995, sy);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a2a34';
    ctx.fillRect(w * 0.873, h * 0.27, w * 0.014, h * 0.53);

    // --- the window over the garden, deep-set and glowing with dusk
    const wx = w * 0.6;
    const wy = h * 0.3;
    const ww = w * 0.23;
    const wh = h * 0.3;
    ctx.fillStyle = '#1a1020'; // deep reveal
    ctx.fillRect(wx - 12, wy - 12, ww + 24, wh + 24);
    ctx.fillStyle = '#55404a';
    ctx.fillRect(wx - 7, wy - 7, ww + 14, wh + 14);
    const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
    glass.addColorStop(0, '#f2b968');
    glass.addColorStop(0.55, '#e89355');
    glass.addColorStop(1, '#b06248');
    ctx.fillStyle = glass;
    ctx.fillRect(wx, wy, ww, wh);
    // silhouetted treeline through the glass
    ctx.fillStyle = 'rgba(60,30,50,0.55)';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh * 0.62);
    for (let px = 0; px <= ww; px += 8) {
      ctx.lineTo(wx + px, wy + wh * (0.55 + Math.sin(px * 0.24) * 0.06 + (px % 16 === 0 ? -0.09 : 0)));
    }
    ctx.lineTo(wx + ww, wy + wh);
    ctx.lineTo(wx, wy + wh);
    ctx.closePath();
    ctx.fill();
    // sun disc low in the glass
    glow(s, wx + ww * 0.32, wy + wh * 0.5, ww * 0.34, 'rgba(255,225,160,0.55)');
    // mullions
    ctx.strokeStyle = '#2c1f28';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    if (s.flags['windowOpen']) {
      ctx.fillStyle = '#120a14';
      ctx.fillRect(wx, wy + wh - 7, ww, 7);
    }
    ctx.fillStyle = '#63494f'; // sill
    ctx.fillRect(wx - 12, wy + wh + 12, ww + 24, 7);
    ctx.fillStyle = 'rgba(255,215,160,0.22)';
    ctx.fillRect(wx - 12, wy + wh + 12, ww + 24, 2);

    // --- plank floor
    const floorY = h * 0.74;
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, '#31201f');
    fg.addColorStop(1, '#1a0f12');
    ctx.fillStyle = fg;
    ctx.fillRect(0, floorY, w, h - floorY);
    let py = floorY;
    let rowH = 5;
    let rowI = 0;
    while (py < h) {
      ctx.fillStyle = `rgba(0,0,0,${0.3 - rowI * 0.01})`;
      ctx.fillRect(0, py, w, 1.2);
      if (rowH > 9) grain(s, 0, py, w, rowH, 63 + rowI, false, 0.07);
      py += rowH;
      rowH *= 1.35;
      rowI++;
    }
    // pool of window light on the floor
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pool = ctx.createLinearGradient(wx - ww, floorY, wx - ww * 2.2, h);
    pool.addColorStop(0, 'rgba(255,180,100,0.16)');
    pool.addColorStop(1, 'rgba(255,180,100,0.02)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.moveTo(wx - 10, floorY + 4);
    ctx.lineTo(wx + ww * 0.9, floorY + 4);
    ctx.lineTo(wx + ww * 0.4, h);
    ctx.lineTo(wx - ww * 1.5, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- crockery shelf
    const shY = h * 0.33;
    ctx.fillStyle = '#241722';
    ctx.fillRect(w * 0.14, shY, w * 0.34, 6);
    grain(s, w * 0.14, shY, w * 0.34, 6, 64, false, 0.15);
    for (const bx of [w * 0.17, w * 0.44]) {
      ctx.beginPath();
      ctx.moveTo(bx, shY + 6);
      ctx.lineTo(bx + 8, shY + 18);
      ctx.lineTo(bx - 8, shY + 18);
      ctx.closePath();
      ctx.fillStyle = '#1c1119';
      ctx.fill();
    }
    // plates + jug, rim-lit from the window
    for (const [px, pr] of [[w * 0.19, 13], [w * 0.25, 15]] as const) {
      ctx.fillStyle = '#1f141e';
      ctx.beginPath();
      ctx.arc(px, shY - pr, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,140,0.5)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(px, shY - pr, pr - 1, -0.7, 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#241820'; // jug
    ctx.beginPath();
    ctx.moveTo(w * 0.33, shY);
    ctx.bezierCurveTo(w * 0.315, shY - 22, w * 0.325, shY - 26, w * 0.335, shY - 30);
    ctx.lineTo(w * 0.355, shY - 30);
    ctx.bezierCurveTo(w * 0.365, shY - 26, w * 0.375, shY - 22, w * 0.36, shY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,140,0.45)';
    ctx.beginPath();
    ctx.moveTo(w * 0.358, shY - 4);
    ctx.bezierCurveTo(w * 0.372, shY - 20, w * 0.36, shY - 26, w * 0.352, shY - 29);
    ctx.stroke();
    // two mugs
    for (const mxx of [w * 0.4, w * 0.445]) {
      ctx.fillStyle = '#20151e';
      ctx.fillRect(mxx, shY - 14, 14, 14);
      ctx.strokeStyle = 'rgba(255,200,140,0.4)';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(mxx + 14, shY - 11, 5, 7);
    }

    // --- farmhouse table
    const t1 = [w * 0.13, h * 0.635] as const;
    const t2 = [w * 0.52, h * 0.635] as const;
    const t3 = [w * 0.58, h * 0.755] as const;
    const t4 = [w * 0.06, h * 0.755] as const;
    softShadow(s, w * 0.32, h * 0.87, w * 0.3, h * 0.045, 0.5);
    // legs (turned)
    const leg = (lx: number, ly: number, lh: number, wd: number) => {
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(lx - wd / 2, ly, wd, lh);
      ctx.fillStyle = '#4a3020';
      ctx.beginPath();
      ctx.ellipse(lx, ly + lh * 0.4, wd * 0.85, wd * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,190,130,0.14)';
      ctx.fillRect(lx + wd * 0.15, ly, wd * 0.2, lh);
    };
    leg(w * 0.115, h * 0.755, h * 0.165, 13);
    leg(w * 0.525, h * 0.755, h * 0.165, 13);
    leg(w * 0.175, h * 0.72, h * 0.12, 9);
    leg(w * 0.47, h * 0.72, h * 0.12, 9);
    // apron
    ctx.fillStyle = '#472e1e';
    ctx.beginPath();
    ctx.moveTo(...t4);
    ctx.lineTo(...t3);
    ctx.lineTo(t3[0], t3[1] + h * 0.045);
    ctx.lineTo(t4[0], t4[1] + h * 0.045);
    ctx.closePath();
    ctx.fill();
    // top, lit from the window on the right
    const tg = ctx.createLinearGradient(t4[0], 0, t3[0], 0);
    tg.addColorStop(0, '#5c3d28');
    tg.addColorStop(1, '#8a5c38');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(...t1);
    ctx.lineTo(...t2);
    ctx.lineTo(...t3);
    ctx.lineTo(...t4);
    ctx.closePath();
    ctx.fill();
    // plank seams + grain on the top
    ctx.strokeStyle = 'rgba(25,12,8,0.4)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) {
      const k2 = i / 4;
      ctx.beginPath();
      ctx.moveTo(t1[0] + (t4[0] - t1[0]) * k2, t1[1] + (t4[1] - t1[1]) * k2);
      ctx.lineTo(t2[0] + (t3[0] - t2[0]) * k2, t2[1] + (t3[1] - t2[1]) * k2);
      ctx.stroke();
    }
    grain(s, w * 0.08, h * 0.64, w * 0.48, h * 0.11, 66, false, 0.08);
    ctx.fillStyle = 'rgba(255,220,170,0.2)'; // table edge highlight
    ctx.beginPath();
    ctx.moveTo(...t4);
    ctx.lineTo(...t3);
    ctx.lineTo(t3[0] - 3, t3[1] + 2.5);
    ctx.lineTo(t4[0] + 3, t4[1] + 2.5);
    ctx.closePath();
    ctx.fill();

    // --- on the table: sack, board + knife, bottle
    // brown sack
    const sx = w * 0.185;
    const sy = h * 0.66;
    ctx.fillStyle = '#59391f';
    ctx.beginPath();
    ctx.moveTo(sx - 26, sy + 28);
    ctx.bezierCurveTo(sx - 32, sy - 4, sx - 18, sy - 26, sx, sy - 28);
    ctx.bezierCurveTo(sx + 20, sy - 26, sx + 30, sy - 2, sx + 26, sy + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b492a'; // rolled top
    ctx.beginPath();
    ctx.ellipse(sx, sy - 24, 17, 7, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,15,8,0.5)'; // creases
    ctx.lineWidth = 1.4;
    for (const [cx1, cy1, cx2, cy2] of [[-18, 20, -8, -12], [2, 24, 6, -16], [18, 18, 12, -8]] as const) {
      ctx.beginPath();
      ctx.moveTo(sx + cx1, sy + cy1);
      ctx.quadraticCurveTo(sx + (cx1 + cx2) / 2 + 4, sy + (cy1 + cy2) / 2, sx + cx2, sy + cy2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,200,140,0.35)';
    ctx.beginPath();
    ctx.moveTo(sx + 24, sy + 20);
    ctx.quadraticCurveTo(sx + 30, sy - 4, sx + 18, sy - 22);
    ctx.stroke();

    // cutting board + knife
    ctx.fillStyle = '#7a5836';
    ctx.beginPath();
    ctx.roundRect(w * 0.3, h * 0.665, w * 0.11, h * 0.028, 4);
    ctx.fill();
    grain(s, w * 0.3, h * 0.665, w * 0.11, h * 0.028, 67, false, 0.12);
    ctx.save();
    ctx.translate(w * 0.345, h * 0.672);
    ctx.rotate(-0.06);
    ctx.fillStyle = '#c9d4de';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.052, -2);
    ctx.quadraticCurveTo(w * 0.06, 1, w * 0.05, 3.5);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2e1c14';
    ctx.fillRect(-w * 0.026, -0.5, w * 0.027, 5);
    ctx.restore();
    // crumbs
    ctx.fillStyle = 'rgba(230,190,140,0.5)';
    const cr = mulberry32(68);
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(w * (0.29 + cr() * 0.14), h * (0.66 + cr() * 0.035), 1.5, 1.5);
    }

    // the glass bottle of water
    const bx = w * 0.465;
    const by = h * 0.655;
    ctx.save();
    ctx.fillStyle = 'rgba(150,200,215,0.16)';
    ctx.beginPath();
    ctx.roundRect(bx - 9, by - 26, 18, 40, [4, 4, 5, 5]);
    ctx.fill();
    ctx.fillRect(bx - 3.5, by - 40, 7, 15);
    ctx.fillStyle = 'rgba(120,180,205,0.35)'; // the water inside
    ctx.beginPath();
    ctx.roundRect(bx - 7.5, by - 12, 15, 24.5, [2, 2, 4, 4]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,235,250,0.6)'; // rim + highlight
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(bx - 9, by - 26, 18, 40, [4, 4, 5, 5]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx + 4.5, by - 22);
    ctx.lineTo(bx + 4.5, by + 8);
    ctx.stroke();
    ctx.fillStyle = '#8a6a42'; // cork
    ctx.fillRect(bx - 3.5, by - 45, 7, 6);
    ctx.restore();

    // vignette
    const v = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,4,12,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },
  paint(s) {
    const { ctx, w, h } = s;
    // breathing shaft of dusk light
    lightShaft(s, w * 0.71, w * 0.2, w * 0.5, w * 0.42, h * 0.98, `rgba(255,185,105,${0.07 + 0.03 * flicker(s.t * 0.5, 2)})`, 1);

    // gauze curtain, swaying
    const wx = w * 0.6;
    const wy = h * 0.3;
    const wh = h * 0.3;
    const sway = Math.sin(s.t * 0.85) * 5 + Math.sin(s.t * 2.1) * 1.6;
    ctx.save();
    ctx.fillStyle = 'rgba(238,220,190,0.8)';
    ctx.beginPath();
    ctx.moveTo(wx - 14, wy - 14);
    ctx.lineTo(wx + 22, wy - 14);
    ctx.bezierCurveTo(wx + 14, wy + wh * 0.35, wx + 26 + sway, wy + wh * 0.7, wx + 12 + sway * 1.6, wy + wh + 22);
    ctx.bezierCurveTo(wx - 4 + sway, wy + wh * 0.8, wx - 10, wy + wh * 0.4, wx - 14, wy + wh * 0.1);
    ctx.closePath();
    ctx.fill();
    // fold shadows
    ctx.strokeStyle = 'rgba(130,100,80,0.35)';
    ctx.lineWidth = 3;
    for (const fx of [0.25, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(wx - 14 + 36 * fx, wy - 10);
      ctx.bezierCurveTo(wx - 8 + 30 * fx, wy + wh * 0.4, wx + 30 * fx + sway * fx * 2, wy + wh * 0.7, wx + 24 * fx + sway * 1.4 * fx, wy + wh + 14);
      ctx.stroke();
    }
    ctx.restore();

    // hanging iron & herbs, swinging gently from the beam
    const hang = (hx: number, len: number, phase: number, draw: (bottomY: number) => void) => {
      const a = Math.sin(s.t * 0.8 + phase) * 0.045;
      ctx.save();
      ctx.translate(hx, h * 0.222);
      ctx.rotate(a);
      ctx.strokeStyle = '#181018';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, len);
      ctx.stroke();
      draw(len);
      ctx.restore();
    };
    hang(w * 0.2, h * 0.09, 0, (yb) => {
      ctx.fillStyle = '#191019';
      ctx.beginPath();
      ctx.arc(0, yb + 13, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,195,130,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, yb + 13, 12.5, -0.6, 1.0);
      ctx.stroke();
      ctx.fillStyle = '#191019';
      ctx.fillRect(-2.5, yb - 4, 5, 9);
    });
    hang(w * 0.285, h * 0.065, 2.2, (yb) => {
      ctx.fillStyle = '#171017';
      ctx.beginPath();
      ctx.arc(0, yb + 10, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,195,130,0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, yb + 10, 9.5, -0.6, 1.0);
      ctx.stroke();
    });
    hang(w * 0.36, h * 0.055, 4.1, (yb) => {
      // dried herb bundle
      ctx.fillStyle = '#3d4a2e';
      ctx.beginPath();
      ctx.moveTo(0, yb);
      ctx.bezierCurveTo(-10, yb + 10, -8, yb + 24, 0, yb + 30);
      ctx.bezierCurveTo(8, yb + 24, 10, yb + 10, 0, yb);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,215,150,0.35)';
      ctx.lineWidth = 1;
      for (const lx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(lx * 0.4, yb + 4);
        ctx.lineTo(lx, yb + 26);
        ctx.stroke();
      }
    });
    hang(w * 0.43, h * 0.075, 1.3, (yb) => {
      // string of onions
      for (let i = 0; i < 3; i++) {
        const oy = yb + 8 + i * 13;
        ctx.fillStyle = shade('#a5703a', -0.12 * i);
        ctx.beginPath();
        ctx.ellipse(0, oy, 7.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,160,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-2, oy - 1.5, 4, -1.8, -0.2);
        ctx.stroke();
      }
    });

    // bottle sparkle
    glow(s, w * 0.469, h * 0.635, 9, `rgba(255,245,220,${0.25 + 0.2 * Math.max(0, Math.sin(s.t * 1.7))})`);
  },
};

// ---------------------------------------------------------------------------
// LIVING ROOM
// ---------------------------------------------------------------------------

const livingRoom: SceneDef = {
  particles: [
    { kind: 'ember', count: 12, hue: '#ffb46a' },
    { kind: 'dust', count: 12, hue: '#ffe6b8' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    // plaster above, glowing faintly toward the hearth
    const wall = ctx.createRadialGradient(w * 0.38, h * 0.6, w * 0.05, w * 0.42, h * 0.55, w * 0.9);
    wall.addColorStop(0, '#462b32');
    wall.addColorStop(0.5, '#2e1c27');
    wall.addColorStop(1, '#190f1e');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, h);
    // crown + ceiling shadow
    ctx.fillStyle = '#120b16';
    ctx.fillRect(0, 0, w, h * 0.06);
    ctx.fillStyle = '#2a1a24';
    ctx.fillRect(0, h * 0.06, w, 5);

    // wainscot
    const rail = h * 0.56;
    const wain = ctx.createLinearGradient(0, rail, 0, h * 0.8);
    wain.addColorStop(0, '#33202a');
    wain.addColorStop(1, '#221118');
    ctx.fillStyle = wain;
    ctx.fillRect(0, rail, w, h * 0.24);
    ctx.fillStyle = '#41282e'; // chair rail
    ctx.fillRect(0, rail - 5, w, 6);
    ctx.fillStyle = 'rgba(255,200,150,0.1)';
    ctx.fillRect(0, rail - 5, w, 1.6);
    ctx.strokeStyle = 'rgba(12,6,12,0.55)'; // stiles
    ctx.lineWidth = 3;
    for (let px = w * 0.045; px < w; px += w * 0.09) {
      ctx.beginPath();
      ctx.moveTo(px, rail + 4);
      ctx.lineTo(px, h * 0.795);
      ctx.stroke();
    }

    // plank floor
    const floorY = h * 0.8;
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, '#33201f');
    fg.addColorStop(1, '#170d10');
    ctx.fillStyle = fg;
    ctx.fillRect(0, floorY, w, h - floorY);
    let py = floorY;
    let rowH = 6;
    let rowI = 0;
    while (py < h) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, py, w, 1.2);
      if (rowH > 10) grain(s, 0, py, w, rowH, 71 + rowI, false, 0.06);
      py += rowH;
      rowH *= 1.4;
      rowI++;
    }

    // --- the gothic door, nailed shut
    const gd = { x: w * 0.045, y: h * 0.3, w: w * 0.135, h: h * 0.48 };
    ctx.fillStyle = '#191019'; // arch recess
    ctx.beginPath();
    ctx.moveTo(gd.x - 6, gd.y + gd.h);
    ctx.lineTo(gd.x - 6, gd.y + gd.h * 0.28);
    ctx.quadraticCurveTo(gd.x + gd.w / 2, gd.y - gd.h * 0.16, gd.x + gd.w + 6, gd.y + gd.h * 0.28);
    ctx.lineTo(gd.x + gd.w + 6, gd.y + gd.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2b1a17'; // the door
    ctx.beginPath();
    ctx.moveTo(gd.x, gd.y + gd.h);
    ctx.lineTo(gd.x, gd.y + gd.h * 0.3);
    ctx.quadraticCurveTo(gd.x + gd.w / 2, gd.y - gd.h * 0.08, gd.x + gd.w, gd.y + gd.h * 0.3);
    ctx.lineTo(gd.x + gd.w, gd.y + gd.h);
    ctx.closePath();
    ctx.fill();
    grain(s, gd.x, gd.y, gd.w, gd.h, 72, true, 0.16);
    // iron straps
    ctx.fillStyle = '#3d3a44';
    for (const sy2 of [gd.y + gd.h * 0.42, gd.y + gd.h * 0.72]) {
      ctx.fillRect(gd.x + 2, sy2, gd.w - 4, 7);
      ctx.fillStyle = '#23212a';
      for (let rx = gd.x + 8; rx < gd.x + gd.w - 4; rx += 12) ctx.fillRect(rx, sy2 + 2, 2.5, 2.5);
      ctx.fillStyle = '#3d3a44';
    }
    // strange gothic lettering
    ctx.strokeStyle = 'rgba(216,178,116,0.4)';
    ctx.lineWidth = 1.6;
    const gl = mulberry32(73);
    let lx = gd.x + 9;
    while (lx < gd.x + gd.w - 9) {
      const ly = gd.y + gd.h * 0.55;
      const seg = 3 + gl() * 5;
      ctx.beginPath();
      ctx.moveTo(lx, ly + (gl() - 0.5) * 6);
      ctx.lineTo(lx + seg * 0.5, ly - 4 - gl() * 4);
      ctx.lineTo(lx + seg, ly + (gl() - 0.5) * 6);
      if (gl() > 0.5) ctx.lineTo(lx + seg, ly + 5);
      ctx.stroke();
      lx += seg + 3.5;
    }
    // nailed-shut plank
    boardedPlanks(s, gd.x + 4, gd.y + gd.h * 0.24, gd.w - 8, gd.h * 0.5, '#5c4a32', 74);

    // --- fireplace
    const fp = { x: w * 0.22, y: h * 0.43, w: w * 0.3, h: h * 0.37 };
    // stone surround
    bricks(s, fp.x, fp.y, fp.w, fp.h, '#54424a', 75, 17, 9);
    ctx.strokeStyle = 'rgba(255,180,110,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(fp.x, fp.y, fp.w, fp.h);
    // mantel shelf
    ctx.fillStyle = '#241419';
    ctx.fillRect(fp.x - 12, fp.y - 10, fp.w + 24, 12);
    grain(s, fp.x - 12, fp.y - 10, fp.w + 24, 12, 76, false, 0.14);
    ctx.fillStyle = 'rgba(255,200,150,0.16)';
    ctx.fillRect(fp.x - 12, fp.y - 10, fp.w + 24, 2);
    // firebox
    const fb = { x: fp.x + fp.w * 0.16, y: fp.y + fp.h * 0.32, w: fp.w * 0.68, h: fp.h * 0.6 };
    ctx.fillStyle = '#060205';
    ctx.beginPath();
    ctx.roundRect(fb.x, fb.y, fb.w, fb.h, [fb.w * 0.24, fb.w * 0.24, 0, 0]);
    ctx.fill();
    const ember = ctx.createLinearGradient(0, fb.y + fb.h * 0.5, 0, fb.y + fb.h);
    ember.addColorStop(0, 'rgba(120,30,10,0)');
    ember.addColorStop(1, 'rgba(255,110,40,0.55)');
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.roundRect(fb.x, fb.y, fb.w, fb.h, [fb.w * 0.24, fb.w * 0.24, 0, 0]);
    ctx.fill();
    // logs
    ctx.save();
    ctx.translate(fb.x + fb.w / 2, fb.y + fb.h * 0.88);
    for (const [ang, off] of [[-0.16, -4], [0.2, 3]] as const) {
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = '#2b1610';
      ctx.beginPath();
      ctx.roundRect(-fb.w * 0.34, off - 5, fb.w * 0.68, 11, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,140,60,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-fb.w * 0.3, off + 4.5);
      ctx.lineTo(fb.w * 0.3, off + 4.5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // andirons
    ctx.fillStyle = '#191418';
    ctx.fillRect(fb.x + 6, fb.y + fb.h - 12, 4, 12);
    ctx.fillRect(fb.x + fb.w - 10, fb.y + fb.h - 12, 4, 12);
    // hearth slab
    ctx.fillStyle = '#4d3d42';
    ctx.beginPath();
    ctx.moveTo(fp.x - 10, fp.y + fp.h);
    ctx.lineTo(fp.x + fp.w + 10, fp.y + fp.h);
    ctx.lineTo(fp.x + fp.w + 22, fp.y + fp.h + h * 0.035);
    ctx.lineTo(fp.x - 22, fp.y + fp.h + h * 0.035);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,190,120,0.14)';
    ctx.fillRect(fp.x - 10, fp.y + fp.h, fp.w + 20, 2);

    // mantel dressing: candlesticks + a small portrait
    for (const cx2 of [fp.x + 6, fp.x + fp.w - 12]) {
      ctx.fillStyle = '#8a6a2e';
      ctx.fillRect(cx2, fp.y - 26, 5, 16);
      ctx.beginPath();
      ctx.ellipse(cx2 + 2.5, fp.y - 10, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8dcc4';
      ctx.fillRect(cx2 + 0.5, fp.y - 38, 4, 12);
    }
    ctx.fillStyle = '#6b5426'; // frame
    ctx.fillRect(fp.x + fp.w * 0.36, fp.y - 42, fp.w * 0.26, 32);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(fp.x + fp.w * 0.36 + 3, fp.y - 39, fp.w * 0.26 - 6, 26);

    // --- wingback armchair in profile, facing the fire
    const ch = { x: w * 0.545, y: h * 0.55, w: w * 0.135, h: h * 0.27 };
    softShadow(s, ch.x + ch.w * 0.5, ch.y + ch.h + 5, ch.w * 0.8, 9, 0.5);
    const chDark = '#2e1218';
    const chMid = '#3d1a21';
    const chLit = '#54242c';
    // tall back column (away from the fire)
    ctx.fillStyle = chMid;
    ctx.beginPath();
    ctx.roundRect(ch.x + ch.w * 0.6, ch.y, ch.w * 0.4, ch.h * 0.9, [ch.w * 0.22, ch.w * 0.12, 0, 0]);
    ctx.fill();
    // wing curling toward the fire
    ctx.beginPath();
    ctx.moveTo(ch.x + ch.w * 0.62, ch.y + ch.h * 0.02);
    ctx.quadraticCurveTo(ch.x + ch.w * 0.3, ch.y + ch.h * 0.04, ch.x + ch.w * 0.32, ch.y + ch.h * 0.34);
    ctx.lineTo(ch.x + ch.w * 0.62, ch.y + ch.h * 0.4);
    ctx.closePath();
    ctx.fill();
    // seat box
    ctx.fillStyle = chDark;
    ctx.beginPath();
    ctx.roundRect(ch.x, ch.y + ch.h * 0.52, ch.w * 0.92, ch.h * 0.36, [6, 4, 4, 6]);
    ctx.fill();
    // seat cushion catching the firelight
    ctx.fillStyle = chLit;
    ctx.beginPath();
    ctx.roundRect(ch.x + ch.w * 0.02, ch.y + ch.h * 0.46, ch.w * 0.62, ch.h * 0.16, 7);
    ctx.fill();
    // arm roll
    ctx.fillStyle = chMid;
    ctx.beginPath();
    ctx.ellipse(ch.x + ch.w * 0.24, ch.y + ch.h * 0.44, ch.w * 0.22, ch.h * 0.1, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(ch.x + ch.w * 0.24, ch.y + ch.h * 0.44, ch.w * 0.22, ch.h * 0.1, -0.08, 0.6, 2.4);
    ctx.stroke();
    // turned legs
    ctx.fillStyle = '#1c0d10';
    ctx.beginPath();
    ctx.moveTo(ch.x + ch.w * 0.08, ch.y + ch.h * 0.88);
    ctx.lineTo(ch.x + ch.w * 0.14, ch.y + ch.h * 0.88);
    ctx.lineTo(ch.x + ch.w * 0.12, ch.y + ch.h * 1.02);
    ctx.lineTo(ch.x + ch.w * 0.07, ch.y + ch.h * 1.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ch.x + ch.w * 0.78, ch.y + ch.h * 0.9);
    ctx.lineTo(ch.x + ch.w * 0.86, ch.y + ch.h * 0.9);
    ctx.lineTo(ch.x + ch.w * 0.84, ch.y + ch.h * 1.02);
    ctx.lineTo(ch.x + ch.w * 0.79, ch.y + ch.h * 1.02);
    ctx.closePath();
    ctx.fill();

    // --- trophy case with the sword above
    const tc = { x: w * 0.72, y: h * 0.34, w: w * 0.22, h: h * 0.42 };
    softShadow(s, tc.x + tc.w / 2, tc.y + tc.h + 8, tc.w * 0.7, 10, 0.5);
    ctx.fillStyle = '#2b171d'; // carcass
    ctx.beginPath();
    ctx.roundRect(tc.x - 6, tc.y - 8, tc.w + 12, tc.h + 14, 4);
    ctx.fill();
    grain(s, tc.x - 6, tc.y - 8, tc.w + 12, tc.h + 14, 77, true, 0.1);
    ctx.fillStyle = '#41232b'; // crown
    ctx.fillRect(tc.x - 10, tc.y - 12, tc.w + 20, 8);
    ctx.fillStyle = 'rgba(255,200,150,0.14)';
    ctx.fillRect(tc.x - 10, tc.y - 12, tc.w + 20, 1.6);
    // interior
    const ig = ctx.createLinearGradient(0, tc.y, 0, tc.y + tc.h);
    ig.addColorStop(0, '#1d1018');
    ig.addColorStop(1, '#120a12');
    ctx.fillStyle = ig;
    ctx.fillRect(tc.x + 3, tc.y, tc.w - 6, tc.h);
    ctx.fillStyle = '#33202a'; // shelves
    for (const shy of [tc.y + tc.h * 0.33, tc.y + tc.h * 0.66]) {
      ctx.fillRect(tc.x + 3, shy, tc.w - 6, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(tc.x + 3, shy + 4, tc.w - 6, 3);
      ctx.fillStyle = '#33202a';
    }
    // glass sheen
    ctx.save();
    ctx.beginPath();
    ctx.rect(tc.x + 3, tc.y, tc.w - 6, tc.h);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,240,220,0.07)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(tc.x - 14, tc.y + tc.h * 0.85);
    ctx.lineTo(tc.x + tc.w * 0.8, tc.y - 10);
    ctx.moveTo(tc.x + 10, tc.y + tc.h * 1.05);
    ctx.lineTo(tc.x + tc.w * 1.1, tc.y + tc.h * 0.1);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#241014'; // feet
    ctx.fillRect(tc.x, tc.y + tc.h + 6, 7, 9);
    ctx.fillRect(tc.x + tc.w - 7, tc.y + tc.h + 6, 7, 9);

    // the elvish sword
    ctx.save();
    ctx.translate(tc.x + tc.w / 2, tc.y - h * 0.075);
    ctx.rotate(-0.09);
    const bl = tc.w * 0.44;
    ctx.fillStyle = '#241419'; // mounts
    ctx.fillRect(-bl * 0.55, 6, 6, 12);
    ctx.fillRect(bl * 0.45, 6, 6, 12);
    const sg = ctx.createLinearGradient(0, -3, 0, 3);
    sg.addColorStop(0, '#8fa2b8');
    sg.addColorStop(0.5, '#eef4fb');
    sg.addColorStop(1, '#7a8ba0');
    ctx.fillStyle = sg;
    ctx.beginPath(); // blade with a point
    ctx.moveTo(-bl, 0);
    ctx.lineTo(-bl + 8, -3.2);
    ctx.lineTo(bl * 0.62, -3.2);
    ctx.lineTo(bl * 0.62, 3.2);
    ctx.lineTo(-bl + 8, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,140,0.8)'; // fuller line
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-bl + 10, 0);
    ctx.lineTo(bl * 0.58, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,210,255,0.45)'; // runes
    ctx.lineWidth = 1.2;
    for (let rx = -bl * 0.7; rx < bl * 0.4; rx += 11) {
      ctx.beginPath();
      ctx.moveTo(rx, -1.5);
      ctx.lineTo(rx + 3, 1.5);
      if ((rx * 7) % 3 > 1) ctx.lineTo(rx + 6, -1.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#6b5426'; // crossguard
    ctx.fillRect(bl * 0.62, -8, 5, 16);
    ctx.fillStyle = '#3d2a20'; // grip
    ctx.fillRect(bl * 0.62 + 5, -3, 16, 6);
    ctx.strokeStyle = 'rgba(190,150,90,0.5)';
    for (let gx = 0; gx < 14; gx += 4) {
      ctx.beginPath();
      ctx.moveTo(bl * 0.62 + 6 + gx, -3);
      ctx.lineTo(bl * 0.62 + 8 + gx, 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a6a2e'; // pommel
    ctx.beginPath();
    ctx.arc(bl * 0.62 + 24, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- the rug / trap door tableau
    const rx = w * 0.44;
    const ry = h * 0.885;
    if (!s.flags['rugMoved']) {
      // the great oriental rug
      softShadow(s, rx, ry + 4, w * 0.23, h * 0.04, 0.35);
      const rugG = ctx.createLinearGradient(rx - w * 0.21, 0, rx + w * 0.21, 0);
      rugG.addColorStop(0, '#5c1f2c');
      rugG.addColorStop(0.5, '#7d2e3a');
      rugG.addColorStop(1, '#521c28');
      ctx.fillStyle = rugG;
      ctx.beginPath();
      ctx.ellipse(rx, ry, w * 0.21, h * 0.052, 0, 0, Math.PI * 2);
      ctx.fill();
      // border bands
      ctx.strokeStyle = '#2e3a5c';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(rx, ry, w * 0.185, h * 0.043, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#c9964a';
      ctx.lineWidth = 1.6;
      for (const kk of [0.205, 0.165]) {
        ctx.beginPath();
        ctx.ellipse(rx, ry, w * kk, h * 0.052 * (kk / 0.21), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // medallion
      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(1, 0.32);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#c9964a';
      ctx.fillRect(-16, -16, 32, 32);
      ctx.fillStyle = '#2e3a5c';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
      ctx.fillStyle = '#c9964a';
      for (const dx of [-0.11, 0.11]) {
        ctx.beginPath();
        ctx.ellipse(rx + w * dx, ry, 5, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // fringe
      ctx.strokeStyle = 'rgba(220,200,160,0.55)';
      ctx.lineWidth = 1.2;
      for (let i = -4; i <= 4; i++) {
        const fy = ry + i * h * 0.01;
        const span = Math.sqrt(Math.max(0, 1 - (i / 5) ** 2));
        ctx.beginPath();
        ctx.moveTo(rx - w * 0.21 * span - 1, fy);
        ctx.lineTo(rx - w * 0.21 * span - 7, fy + 1);
        ctx.moveTo(rx + w * 0.21 * span + 1, fy);
        ctx.lineTo(rx + w * 0.21 * span + 7, fy + 1);
        ctx.stroke();
      }
    } else {
      // rug heaped against the wall, still trying to look dignified
      softShadow(s, w * 0.16, ry + 6, w * 0.13, h * 0.03, 0.45);
      ctx.fillStyle = '#6b2432';
      ctx.beginPath();
      ctx.moveTo(w * 0.055, ry + h * 0.038);
      for (let i = 0; i < 5; i++) {
        const fx = w * (0.08 + i * 0.05);
        ctx.quadraticCurveTo(fx, ry - h * (0.07 + (i % 2) * 0.03), fx + w * 0.028, ry + h * 0.034);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20,8,12,0.35)'; // fold shadows
      for (let i = 0; i < 4; i++) {
        const fx = w * (0.1 + i * 0.05);
        ctx.beginPath();
        ctx.moveTo(fx + w * 0.02, ry + h * 0.034);
        ctx.quadraticCurveTo(fx + w * 0.008, ry - h * 0.02, fx + w * 0.016, ry - h * (0.05 + (i % 2) * 0.03));
        ctx.lineTo(fx + w * 0.024, ry - h * (0.045 + (i % 2) * 0.03));
        ctx.quadraticCurveTo(fx + w * 0.02, ry - h * 0.015, fx + w * 0.034, ry + h * 0.034);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#c9964a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.06, ry + h * 0.022);
      for (let i = 0; i < 5; i++) {
        const fx = w * (0.08 + i * 0.05);
        ctx.quadraticCurveTo(fx, ry - h * (0.06 + (i % 2) * 0.03), fx + w * 0.028, ry + h * 0.018);
      }
      ctx.stroke();

      // the trap door
      const td = { x: rx - w * 0.115, y: ry - h * 0.04, w: w * 0.23, h: h * 0.072 };
      if (s.flags['trapDoorOpen']) {
        // the lid stands nearly upright on its hinge at the back edge
        ctx.fillStyle = '#33241a'; // underside, never sun-bleached
        ctx.beginPath();
        ctx.moveTo(td.x + 8, td.y + 2);
        ctx.lineTo(td.x + td.w - 8, td.y + 2);
        ctx.lineTo(td.x + td.w - 16, td.y - h * 0.11);
        ctx.lineTo(td.x + 16, td.y - h * 0.11);
        ctx.closePath();
        ctx.fill();
        grain(s, td.x + 12, td.y - h * 0.11, td.w - 26, h * 0.11, 79, true, 0.14);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; // lid plank seams
        ctx.lineWidth = 1.4;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(td.x + 8 + ((td.w - 16) / 4) * i, td.y + 2);
          ctx.lineTo(td.x + 16 + ((td.w - 32) / 4) * i, td.y - h * 0.11);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,195,130,0.3)'; // lamplit top edge
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(td.x + 16, td.y - h * 0.11);
        ctx.lineTo(td.x + td.w - 16, td.y - h * 0.11);
        ctx.stroke();
        // dangling iron ring
        ctx.strokeStyle = '#565058';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(td.x + td.w / 2, td.y - h * 0.045, 6, 0, Math.PI * 2);
        ctx.stroke();
        // the pit: framed opening, blackness below
        ctx.fillStyle = '#54432e'; // worn frame
        ctx.beginPath();
        ctx.moveTo(td.x - 6, td.y);
        ctx.lineTo(td.x + td.w + 6, td.y);
        ctx.lineTo(td.x + td.w + 16, td.y + td.h + 4);
        ctx.lineTo(td.x - 16, td.y + td.h + 4);
        ctx.closePath();
        ctx.fill();
        const pit = ctx.createLinearGradient(0, td.y, 0, td.y + td.h);
        pit.addColorStop(0, '#0a0f0c');
        pit.addColorStop(1, '#010203');
        ctx.fillStyle = pit;
        ctx.beginPath();
        ctx.moveTo(td.x, td.y + 3);
        ctx.lineTo(td.x + td.w, td.y + 3);
        ctx.lineTo(td.x + td.w + 9, td.y + td.h);
        ctx.lineTo(td.x - 9, td.y + td.h);
        ctx.closePath();
        ctx.fill();
        // the top of a rickety staircase, caught by the room's light
        ctx.strokeStyle = 'rgba(150,115,70,0.65)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(td.x + td.w * (0.3 + i * 0.05), td.y + 9 + i * 8);
          ctx.lineTo(td.x + td.w * (0.7 - i * 0.05), td.y + 9 + i * 8);
          ctx.stroke();
        }
      } else {
        softShadow(s, rx, ry + 6, w * 0.15, h * 0.028, 0.3);
        ctx.fillStyle = '#4a3322';
        ctx.beginPath();
        ctx.moveTo(td.x, td.y);
        ctx.lineTo(td.x + td.w, td.y);
        ctx.lineTo(td.x + td.w + 10, td.y + td.h);
        ctx.lineTo(td.x - 10, td.y + td.h);
        ctx.closePath();
        ctx.fill();
        grain(s, td.x - 6, td.y, td.w + 14, td.h, 78, false, 0.16);
        ctx.strokeStyle = 'rgba(20,10,6,0.6)';
        ctx.lineWidth = 1.4;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(td.x + (td.w / 4) * i - 2, td.y);
          ctx.lineTo(td.x + (td.w / 4) * i - 5 + 2.5 * i, td.y + td.h);
          ctx.stroke();
        }
        // iron ring
        ctx.strokeStyle = '#565058';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(td.x + td.w / 2, td.y + td.h * 0.62, 8, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#3a363e';
        ctx.fillRect(td.x + td.w / 2 - 3, td.y + td.h * 0.32, 6, 4);
      }
    }

    // vignette
    const v = ctx.createRadialGradient(w * 0.45, h * 0.5, w * 0.22, w * 0.5, h * 0.5, w * 0.9);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(6,3,10,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },
  paint(s) {
    const { ctx, w, h } = s;
    const fl = flicker(s.t);
    const fp = { x: w * 0.22, y: h * 0.43, w: w * 0.3, h: h * 0.37 };
    const fbx = fp.x + fp.w * 0.5;
    const fby = fp.y + fp.h * 0.9;

    // the fire itself
    flames(s, fbx, fby - 4, h * 0.052, 5, 1);
    glow(s, fbx, fby - h * 0.05, w * 0.09 * (0.85 + 0.3 * fl), `rgba(255,150,60,${0.5 + 0.2 * fl})`);

    // firelight washing over the room
    glow(s, fbx, fby - h * 0.06, w * 0.62, `rgba(255,140,60,${0.07 + 0.055 * fl})`);
    // hearth pool + floor reflection streaks
    glow(s, fbx, fp.y + fp.h + h * 0.03, w * 0.14, `rgba(255,160,70,${0.16 + 0.1 * fl})`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,150,70,${0.035 + 0.03 * fl})`;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(fbx - w * (0.1 - i * 0.02), fp.y + fp.h + h * (0.045 + i * 0.035), w * (0.2 - i * 0.04), 3.5 - i);
    }
    ctx.restore();

    // candle flames on the mantel
    for (const [cx2, ph] of [[fp.x + 8.5, 0], [fp.x + fp.w - 9.5, 2.4]] as const) {
      const cfl = flicker(s.t * 1.4, ph);
      glow(s, cx2, fp.y - 40, 13 + cfl * 5, `rgba(255,210,130,${0.5 + 0.25 * cfl})`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,240,190,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx2, fp.y - 41, 1.8, 4 + cfl * 1.5, Math.sin(s.t * 3 + ph) * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // firelight rim on the armchair's fire-facing edges
    const ch = { x: w * 0.545, y: h * 0.55, w: w * 0.135, h: h * 0.27 };
    ctx.save();
    ctx.strokeStyle = `rgba(255,175,95,${0.3 + 0.22 * fl})`;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); // seat front + wing edge
    ctx.moveTo(ch.x + 1, ch.y + ch.h * 0.86);
    ctx.lineTo(ch.x + 1, ch.y + ch.h * 0.5);
    ctx.moveTo(ch.x + ch.w * 0.33, ch.y + ch.h * 0.34);
    ctx.quadraticCurveTo(ch.x + ch.w * 0.31, ch.y + ch.h * 0.05, ch.x + ch.w * 0.62, ch.y + ch.h * 0.02);
    ctx.stroke();
    ctx.restore();

    // a slow glint travelling the sword blade
    const gp = (s.t % 6.5) / 6.5;
    if (gp < 0.22) {
      const k = gp / 0.22;
      const tc = { x: w * 0.72, y: h * 0.34, w: w * 0.22 };
      const bl = tc.w * 0.44;
      const gx = tc.x + tc.w / 2 - bl + k * bl * 1.6;
      const gy = tc.y - h * 0.075 + (gx - (tc.x + tc.w / 2)) * -0.09;
      glow(s, gx, gy, 14, `rgba(220,240,255,${Math.sin(k * Math.PI) * 0.55})`);
    }

    // treasure shimmer inside the case
    if (s.flags['caseGlow']) {
      const tc = { x: w * 0.72, y: h * 0.34, w: w * 0.22, h: h * 0.42 };
      glow(s, tc.x + tc.w / 2, tc.y + tc.h * 0.5, tc.w * 0.55, `rgba(255,205,105,${0.12 + 0.05 * Math.sin(s.t * 1.3)})`);
    }

    // something breathes below the open trap door
    if (s.flags['rugMoved'] && s.flags['trapDoorOpen']) {
      glow(s, w * 0.44, h * 0.905, w * 0.11, `rgba(90,215,160,${0.13 + 0.07 * Math.sin(s.t * 1.1)})`);
      glow(s, w * 0.44, h * 0.9, w * 0.05, `rgba(140,255,200,${0.1 + 0.05 * Math.sin(s.t * 1.7)})`);
    }
  },
};

export const hifiScenes: Record<string, SceneDef> = {
  whiteHouse,
  houseSide,
  behindHouse,
  kitchen,
  livingRoom,
};
