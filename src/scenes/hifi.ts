// High-fidelity scene set: the white house exterior and its interiors.
// Each scene splits into paintBase (static, cached by the renderer) and
// paint (animated layer drawn on top every frame).

import type { SceneDef } from './scenes';
import { iconFor } from './icons';
import {
  type SceneCtx,
  boardedPlanks, bricks, clapboards, flames, flicker, fog, glow, grain,
  lightShaft, mulberry32, ridge, shade, shingles, softShadow, stalactites, stars, torrent, treeBand, waterPlane,
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
    // THE small kitchen window — your way in. Fills the lower-right slot
    // of the same 2x2 grid as the boarded windows (mirrors the upper-right
    // window's x, the lower-left window's y), same frame size throughout.
    const kw = ww;
    const kh = wh;
    const kx = o.cx + 37 * k;
    const ky = lowerY;
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
      windowOpen: s.flags['windowOpen'] === true,
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
    // the treasures already won, arranged on the shelves
    const caseItems = String(s.flags['caseItems'] ?? '').split(',').filter(Boolean);
    if (caseItems.length) {
      const iconSz = tc.w * 0.21;
      const rows = [tc.y + tc.h * 0.33, tc.y + tc.h * 0.66, tc.y + tc.h];
      caseItems.forEach((id, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const ix = tc.x + 6 + col * (tc.w - 12 - iconSz) / 3;
        const iy = (rows[Math.min(row, 2)] ?? tc.y + tc.h) - iconSz - 2;
        ctx.drawImage(iconFor(id, Math.round(iconSz)), ix, iy, iconSz, iconSz);
      });
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

// ---------------------------------------------------------------------------
// VICTORY — the living room, transfigured, once the last treasure is home
// ---------------------------------------------------------------------------

const victory: SceneDef = {
  particles: [
    { kind: 'sparkle', count: 44, hue: '#ffe9a0' },
    { kind: 'firefly', count: 12, hue: '#ffd98a' },
    { kind: 'ember', count: 10, hue: '#ffb46a' },
  ],
  paintBase(s) {
    livingRoom.paintBase!(s);
  },
  paint(s) {
    livingRoom.paint(s);
    const { ctx, w, h } = s;
    // the case itself, the source of all this light
    const tc = { x: w * 0.72, y: h * 0.34, w: w * 0.22, h: h * 0.42 };
    const cx = tc.x + tc.w / 2;
    const cy = tc.y + tc.h / 2;
    const buildIn = Math.min(1, s.t / 2.4);
    const breathe = 0.85 + 0.15 * Math.sin(s.t * 0.9);

    // radiant golden rays sweeping slowly outward from the case
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rays = 16;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + s.t * 0.06;
      const len = Math.max(w, h) * (0.55 + 0.1 * Math.sin(s.t * 1.1 + i * 1.7)) * buildIn;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      grad.addColorStop(0, `rgba(255,220,140,${0.2 * buildIn * breathe})`);
      grad.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3 + 2 * Math.abs(Math.sin(i * 1.3));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();

    glow(s, cx, cy, w * 0.4 * buildIn * breathe, `rgba(255,205,110,${0.16 * buildIn})`);

    // the treasures, freed from their shelves, drifting in a slow halo
    const items = String(s.flags['caseItems'] ?? '').split(',').filter(Boolean);
    const ringCx = w * 0.46;
    const ringCy = h * 0.4;
    const ringR = Math.min(w, h) * 0.25 * buildIn;
    items.forEach((id, i) => {
      const a = (i / Math.max(1, items.length)) * Math.PI * 2 + s.t * 0.18;
      const ix = ringCx + Math.cos(a) * ringR;
      const iy = ringCy + Math.sin(a) * ringR * 0.5;
      const bob = Math.sin(s.t * 1.5 + i * 2) * 4;
      const sz = 32 * buildIn;
      if (sz < 2) return;
      glow(s, ix, iy + bob, sz * 1.5, `rgba(255,220,150,${0.4 * buildIn})`);
      ctx.drawImage(iconFor(id, Math.round(sz)), ix - sz / 2, iy + bob - sz / 2, sz, sz);
    });

    // a warm wash over the whole triumphant room
    const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
    wash.addColorStop(0, `rgba(255,205,110,${0.1 * buildIn})`);
    wash.addColorStop(1, 'rgba(255,205,110,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },
};

export const hifiScenes: Record<string, SceneDef> = {
  whiteHouse,
  houseSide,
  behindHouse,
  kitchen,
  livingRoom,
  victory,
};

// ---------------------------------------------------------------------------
// UNDERGROUND CREATURE SCENES — troll room, cyclops lair, treasure room
// ---------------------------------------------------------------------------

interface RockPalette { deep: string; mid: string; near: string }

/** faceted rock wall with strata cracks — shared cave backdrop */
function rockWall(s: SceneCtx, seed: number, p: RockPalette) {
  const { ctx, w, h } = s;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.deep);
  g.addColorStop(0.55, p.mid);
  g.addColorStop(1, p.near);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(seed);
  // faceted slabs
  for (let i = 0; i < 34; i++) {
    const fx = rnd() * w;
    const fy = rnd() * h * 0.85;
    const fw = 30 + rnd() * 90;
    const fh = 20 + rnd() * 60;
    const tone = (rnd() - 0.5) * 0.14;
    ctx.fillStyle = tone > 0 ? `rgba(210,190,220,${tone * 0.5})` : `rgba(5,2,10,${-tone})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + fw * (0.7 + rnd() * 0.3), fy + fh * 0.2 * rnd());
    ctx.lineTo(fx + fw, fy + fh);
    ctx.lineTo(fx + fw * 0.25 * rnd(), fy + fh * (0.75 + rnd() * 0.25));
    ctx.closePath();
    ctx.fill();
  }
  // cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 12; i++) {
    ctx.lineWidth = 0.8 + rnd() * 1.4;
    let cx2 = rnd() * w;
    let cy2 = rnd() * h * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    for (let k = 0; k < 4; k++) {
      cx2 += (rnd() - 0.5) * 46;
      cy2 += 14 + rnd() * 30;
      ctx.lineTo(cx2, cy2);
    }
    ctx.stroke();
  }
  stalactites(s, 'rgba(2,1,6,0.9)', seed + 5, h * 0.2, 20);
}

function caveFloor(s: SceneCtx, floorY: number, seed: number, base: string) {
  const { ctx, w, h } = s;
  const g = ctx.createLinearGradient(0, floorY, 0, h);
  g.addColorStop(0, shade(base, 0.12));
  g.addColorStop(1, shade(base, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, floorY + 8);
  const rnd = mulberry32(seed);
  for (let x = 0; x <= w; x += w / 8) {
    ctx.lineTo(x, floorY + (rnd() - 0.5) * 14);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // rubble
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 16; i++) {
    const rx = rnd() * w;
    const ry = floorY + 10 + rnd() * (h - floorY - 12);
    ctx.beginPath();
    ctx.ellipse(rx, ry, 3 + rnd() * 9, 2 + rnd() * 4, rnd(), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** a dark passage mouth with a jagged rim */
function passageMouth(s: SceneCtx, cx: number, cy: number, rx: number, ry: number, seed: number, glowColor?: string) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#020105';
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jag = 1 + (rnd() - 0.5) * 0.25;
    const px = cx + Math.cos(a) * rx * jag;
    const py = cy + Math.sin(a) * ry * jag;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  if (glowColor) glow(s, cx, cy, rx * 0.8, glowColor);
}

function bonesPile(s: SceneCtx, cx: number, cy: number, k: number, seed: number) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.strokeStyle = '#b8ab92';
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI;
    const len = (14 + rnd() * 22) * k;
    const bx = cx + (rnd() - 0.5) * 50 * k;
    const by = cy + (rnd() - 0.5) * 14 * k;
    ctx.lineWidth = (2.2 + rnd() * 1.4) * k;
    ctx.beginPath();
    ctx.moveTo(bx - (Math.cos(a) * len) / 2, by - (Math.sin(a) * len) / 4);
    ctx.lineTo(bx + (Math.cos(a) * len) / 2, by + (Math.sin(a) * len) / 4);
    ctx.stroke();
    // knuckle ends
    ctx.fillStyle = '#b8ab92';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(bx + (e * Math.cos(a) * len) / 2, by + (e * Math.sin(a) * len) / 4, 2.2 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // a skull, watching nothing
  ctx.fillStyle = '#c9bda3';
  ctx.beginPath();
  ctx.arc(cx + 18 * k, cy - 4 * k, 7.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx + 13 * k, cy - 1 * k, 9 * k, 6 * k);
  ctx.fillStyle = '#0a0808';
  ctx.beginPath();
  ctx.arc(cx + 15.5 * k, cy - 5.5 * k, 1.9 * k, 0, Math.PI * 2);
  ctx.arc(cx + 20.5 * k, cy - 5.5 * k, 1.9 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// THE TROLL ROOM
// ---------------------------------------------------------------------------

function drawTroll(s: SceneCtx, cx: number, gy: number, k: number) {
  const { ctx } = s;
  const breathe = Math.sin(s.t * 1.3) * 3 * k;
  const sway = Math.sin(s.t * 0.7) * 4 * k;
  const hide = '#3d4234';
  const hideDark = '#262b1e';
  const hideLit = '#565c46';

  ctx.save();
  ctx.translate(cx + sway, gy);

  // legs — wide, braced stance
  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.moveTo(-34 * k, 0);
  ctx.quadraticCurveTo(-40 * k, -34 * k, -26 * k, -58 * k);
  ctx.lineTo(-6 * k, -58 * k);
  ctx.quadraticCurveTo(-16 * k, -30 * k, -18 * k, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30 * k, 0);
  ctx.quadraticCurveTo(38 * k, -34 * k, 24 * k, -58 * k);
  ctx.lineTo(4 * k, -58 * k);
  ctx.quadraticCurveTo(14 * k, -30 * k, 14 * k, 0);
  ctx.closePath();
  ctx.fill();
  // clawed feet
  ctx.fillStyle = hideDark;
  for (const fx of [-26 * k, 22 * k]) {
    ctx.beginPath();
    ctx.ellipse(fx, -2 * k, 14 * k, 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#d8ccb0';
  for (const fx of [-26, 22]) {
    for (let t2 = 0; t2 < 3; t2++) {
      ctx.beginPath();
      ctx.moveTo((fx - 10 + t2 * 8) * k, -3 * k);
      ctx.lineTo((fx - 13 + t2 * 8) * k, 1 * k);
      ctx.lineTo((fx - 7 + t2 * 8) * k, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  // hunched torso
  const tg = ctx.createLinearGradient(-40 * k, 0, 40 * k, 0);
  tg.addColorStop(0, hideDark);
  tg.addColorStop(0.55, hide);
  tg.addColorStop(1, hideLit);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-38 * k, -52 * k);
  ctx.bezierCurveTo(-52 * k, -86 * k - breathe, -36 * k, -122 * k - breathe, 2 * k, -124 * k - breathe);
  ctx.bezierCurveTo(38 * k, -122 * k - breathe, 52 * k, -90 * k - breathe, 38 * k, -52 * k);
  ctx.quadraticCurveTo(0, -40 * k, -38 * k, -52 * k);
  ctx.closePath();
  ctx.fill();
  // belly plate
  ctx.fillStyle = '#5c5540';
  ctx.beginPath();
  ctx.ellipse(0, -72 * k - breathe * 0.5, 24 * k, 30 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,16,8,0.5)';
  ctx.lineWidth = 1.5 * k;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, -72 * k - breathe * 0.5 + i * 8 * k - 16 * k, 22 * k, 0.4, Math.PI - 0.4);
    ctx.stroke();
  }
  // ragged hide loincloth
  ctx.fillStyle = '#4a3524';
  ctx.beginPath();
  ctx.moveTo(-30 * k, -56 * k);
  for (let i = 0; i <= 6; i++) {
    ctx.lineTo((-30 + i * 10) * k, (-56 + (i % 2) * 12) * k);
  }
  ctx.lineTo(26 * k, -40 * k);
  ctx.lineTo(-30 * k, -40 * k);
  ctx.closePath();
  ctx.fill();

  // left arm hanging, knuckles near the floor
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.moveTo(-34 * k, -104 * k - breathe);
  ctx.bezierCurveTo(-58 * k, -96 * k, -62 * k, -50 * k, -56 * k, -18 * k);
  ctx.lineTo(-42 * k, -16 * k);
  ctx.bezierCurveTo(-46 * k, -52 * k, -38 * k, -84 * k, -26 * k, -98 * k - breathe);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hideDark; // fist
  ctx.beginPath();
  ctx.ellipse(-50 * k, -14 * k, 11 * k, 9 * k, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // right arm raised with the axe
  const armAng = -0.5 + Math.sin(s.t * 0.9) * 0.06;
  ctx.save();
  ctx.translate(30 * k, -108 * k - breathe);
  ctx.rotate(armAng);
  ctx.fillStyle = hideLit;
  ctx.beginPath();
  ctx.moveTo(-8 * k, -4 * k);
  ctx.bezierCurveTo(18 * k, -18 * k, 40 * k, -14 * k, 52 * k, -2 * k);
  ctx.lineTo(48 * k, 12 * k);
  ctx.bezierCurveTo(34 * k, 2 * k, 16 * k, 2 * k, -2 * k, 12 * k);
  ctx.closePath();
  ctx.fill();
  // the bloody axe
  ctx.translate(52 * k, 2 * k);
  ctx.rotate(-0.45);
  ctx.fillStyle = '#241a16';
  ctx.fillRect(-3.5 * k, -58 * k, 7 * k, 66 * k);
  grain(s, -3.5 * k, -58 * k, 7 * k, 66 * k, 91, true, 0.2);
  const axeG = ctx.createLinearGradient(-40 * k, -70 * k, 0, -40 * k);
  axeG.addColorStop(0, '#7a828e');
  axeG.addColorStop(1, '#3d434e');
  ctx.fillStyle = axeG;
  ctx.beginPath();
  ctx.moveTo(-2 * k, -60 * k);
  ctx.quadraticCurveTo(-38 * k, -64 * k, -44 * k, -38 * k);
  ctx.quadraticCurveTo(-26 * k, -44 * k, -2 * k, -38 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(140,20,20,0.55)'; // old blood on the edge
  ctx.beginPath();
  ctx.moveTo(-44 * k, -38 * k);
  ctx.quadraticCurveTo(-26 * k, -44 * k, -2 * k, -38 * k);
  ctx.lineTo(-4 * k, -34 * k);
  ctx.quadraticCurveTo(-26 * k, -40 * k, -42 * k, -34 * k);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // head — underbite, tusks, ember eyes
  const hy = -132 * k - breathe;
  ctx.fillStyle = hide;
  ctx.beginPath();
  ctx.ellipse(4 * k, hy, 24 * k, 20 * k, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hideDark; // jaw
  ctx.beginPath();
  ctx.ellipse(6 * k, hy + 12 * k, 20 * k, 10 * k, 0.05, 0, Math.PI);
  ctx.fill();
  // tusks
  ctx.fillStyle = '#e0d4b8';
  for (const tx of [-8, 18]) {
    ctx.beginPath();
    ctx.moveTo((tx + 4) * k, hy + 14 * k);
    ctx.quadraticCurveTo((tx + 1) * k, hy + 2 * k, (tx + 6) * k, hy + 2 * k);
    ctx.lineTo((tx + 8) * k, hy + 12 * k);
    ctx.closePath();
    ctx.fill();
  }
  // heavy brow
  ctx.fillStyle = hideDark;
  ctx.beginPath();
  ctx.ellipse(2 * k, hy - 8 * k, 22 * k, 8 * k, 0.08, Math.PI, 0);
  ctx.fill();
  // ears
  for (const ex of [-24, 30]) {
    ctx.beginPath();
    ctx.moveTo(ex * k, hy - 2 * k);
    ctx.lineTo((ex + (ex < 0 ? -8 : 8)) * k, hy - 14 * k);
    ctx.lineTo((ex + (ex < 0 ? 2 : -2)) * k, hy + 6 * k);
    ctx.closePath();
    ctx.fill();
  }
  // ember eyes
  const eyeGlow = 0.6 + 0.4 * Math.max(0, Math.sin(s.t * 1.9));
  ctx.fillStyle = `rgba(255,90,40,${eyeGlow})`;
  ctx.beginPath();
  ctx.ellipse(-5 * k, hy - 4 * k, 3.4 * k, 2.4 * k, 0.2, 0, Math.PI * 2);
  ctx.ellipse(14 * k, hy - 4 * k, 3.4 * k, 2.4 * k, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  glow(s, cx + sway + 4 * k, gy - 136 * k, 26 * k, `rgba(255,80,40,${0.18 * eyeGlow})`);
  // lamplight rim from the passage side
  ctx.save();
  ctx.strokeStyle = 'rgba(190,210,255,0.16)';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(cx + sway - 8 * k, gy - 90 * k, 48 * k, Math.PI * 0.75, Math.PI * 1.35);
  ctx.stroke();
  ctx.restore();
}

const trollRoomHifi: SceneDef = {
  particles: [
    { kind: 'dust', count: 12, hue: '#a89ab0' },
    { kind: 'mist', count: 6, hue: 'rgba(120,60,60,0.4)' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    rockWall(s, 210, { deep: '#0c0710', mid: '#1c1219', near: '#2a1a1c' });
    caveFloor(s, h * 0.82, 211, '#241318');
    // passages: east (right), south (bottom-left), the forbidding hole west
    passageMouth(s, w * 0.92, h * 0.62, w * 0.13, h * 0.22, 212);
    passageMouth(s, w * 0.1, h * 0.86, w * 0.12, h * 0.12, 213);
    passageMouth(s, w * 0.13, h * 0.5, w * 0.1, h * 0.14, 214, 'rgba(60,20,30,0.5)');
    // deep claw gouges
    for (const [gx, gy2, ga] of [[0.3, 0.3, 0.5], [0.68, 0.24, -0.4], [0.52, 0.42, 0.2]] as const) {
      ctx.save();
      ctx.translate(w * gx, h * gy2);
      ctx.rotate(ga);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = 'rgba(8,4,8,0.8)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(i * 10, 0);
        ctx.quadraticCurveTo(i * 10 + 4, 30, i * 10 + 2, 58);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(190,170,190,0.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(i * 10 + 2.5, 2);
        ctx.quadraticCurveTo(i * 10 + 6.5, 30, i * 10 + 4.5, 56);
        ctx.stroke();
      }
      ctx.restore();
    }
    // old bloodstains, dripping
    const rnd = mulberry32(215);
    for (const [bx, by2, br] of [[0.22, 0.6, 26], [0.6, 0.68, 34], [0.78, 0.36, 20]] as const) {
      ctx.fillStyle = 'rgba(96,14,20,0.5)';
      ctx.beginPath();
      ctx.ellipse(w * bx, h * by2, br, br * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const dx = w * bx + (rnd() - 0.5) * br * 1.4;
        ctx.fillRect(dx, h * by2, 2, 14 + rnd() * 26);
      }
    }
    bonesPile(s, w * 0.3, h * 0.9, 1, 216);
    if (s.flags['trollDead']) {
      // the abandoned axe where he fell
      const ax = w * 0.55;
      const ay = h * 0.9;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(0.9);
      ctx.fillStyle = '#241a16';
      ctx.fillRect(-3, -44, 6, 52);
      const axeG = ctx.createLinearGradient(-30, -52, 0, -30);
      axeG.addColorStop(0, '#7a828e');
      axeG.addColorStop(1, '#3d434e');
      ctx.fillStyle = axeG;
      ctx.beginPath();
      ctx.moveTo(-2, -46);
      ctx.quadraticCurveTo(-30, -50, -34, -28);
      ctx.quadraticCurveTo(-20, -34, -2, -28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(s, ax - 12, ay - 38, 22, 'rgba(180,200,230,0.14)');
    }
  },
  paint(s) {
    const { w, h } = s;
    if (!s.flags['trollDead']) {
      // menacing pool of red beneath him
      glow(s, w * 0.58, h * 0.7, w * 0.3, `rgba(160,40,30,${0.1 + 0.05 * flicker(s.t, 7)})`);
      drawTroll(s, w * 0.58, h * 0.87, Math.min(w, 560) / 420);
    } else {
      // a thinning wisp of sinister black fog
      const p = Math.min(1, s.t / 14);
      if (p < 1) {
        fog(s, h * 0.62, 70, `rgba(30,20,40,${0.5 * (1 - p)})`, 0.4, 5, 217);
      }
      glow(s, w * 0.5, h * 0.5, w * 0.3, 'rgba(90,110,160,0.06)');
    }
  },
};

// ---------------------------------------------------------------------------
// THE CYCLOPS ROOM
// ---------------------------------------------------------------------------

function drawCyclops(s: SceneCtx, cx: number, gy: number, k: number, asleep: boolean) {
  const { ctx } = s;
  const breathe = Math.sin(s.t * (asleep ? 0.6 : 1.2)) * 6 * k;
  const skin = '#6e5240';
  const skinDark = '#4a3428';
  const skinLit = '#8a6a50';

  ctx.save();
  ctx.translate(cx, gy);

  if (asleep) ctx.translate(0, 30 * k); // slumped down against the wall

  // legs folded / braced
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(-30 * k, -20 * k, 46 * k, 22 * k, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(38 * k, -18 * k, 40 * k, 20 * k, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // vast torso
  const tg = ctx.createLinearGradient(-70 * k, 0, 70 * k, 0);
  tg.addColorStop(0, skinDark);
  tg.addColorStop(0.5, skin);
  tg.addColorStop(1, skinLit);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-64 * k, -24 * k);
  ctx.bezierCurveTo(-80 * k, -90 * k - breathe, -52 * k, -150 * k - breathe, 0, -154 * k - breathe);
  ctx.bezierCurveTo(54 * k, -150 * k - breathe, 78 * k, -86 * k - breathe, 62 * k, -22 * k);
  ctx.quadraticCurveTo(0, -6 * k, -64 * k, -24 * k);
  ctx.closePath();
  ctx.fill();
  // gut crease + navel
  ctx.strokeStyle = 'rgba(30,18,12,0.45)';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.arc(0, -50 * k - breathe * 0.4, 40 * k, 0.5, Math.PI - 0.5);
  ctx.stroke();
  // fur wrap
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.moveTo(-58 * k, -34 * k);
  for (let i = 0; i <= 8; i++) {
    ctx.lineTo((-58 + i * 15) * k, (-34 + (i % 2) * 14) * k);
  }
  ctx.lineTo(58 * k, -10 * k);
  ctx.lineTo(-58 * k, -10 * k);
  ctx.closePath();
  ctx.fill();

  // arms
  ctx.fillStyle = skin;
  if (asleep) {
    // draped over the belly
    ctx.beginPath();
    ctx.ellipse(-14 * k, -58 * k - breathe * 0.4, 52 * k, 15 * k, 0.24, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // one arm reaching, fingers working hungrily
    ctx.fillStyle = skinLit;
    ctx.strokeStyle = 'rgba(15,8,5,0.55)';
    ctx.lineWidth = 2.5 * k;
    ctx.beginPath();
    ctx.moveTo(-52 * k, -120 * k - breathe);
    ctx.bezierCurveTo(-100 * k, -112 * k, -116 * k, -66 * k, -104 * k, -30 * k);
    ctx.lineTo(-82 * k, -28 * k);
    ctx.bezierCurveTo(-92 * k, -66 * k, -74 * k, -98 * k, -40 * k, -108 * k - breathe);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // grasping hand
    const fw = Math.sin(s.t * 2.3) * 3 * k;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-94 * k, -26 * k, 15 * k, 12 * k, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let f = 0; f < 3; f++) {
      ctx.beginPath();
      ctx.ellipse(-106 * k + f * 8 * k, -16 * k + fw * (f % 2 ? 1 : -1) * 0.4, 5 * k, 9 * k, 0.5 - f * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // head
  const hy = -172 * k - breathe;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, hy, 34 * k, 30 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // scalp knot
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(2 * k, hy - 26 * k, 12 * k, 7 * k, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // jaw + lower lip
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(0, hy + 20 * k, 24 * k, 12 * k, 0, 0, Math.PI);
  ctx.fill();
  if (!asleep) {
    // hungry maw, slightly open
    const jaw = 3 + Math.max(0, Math.sin(s.t * 0.8)) * 4;
    ctx.fillStyle = '#2a0f10';
    ctx.beginPath();
    ctx.ellipse(0, hy + 18 * k, 15 * k, jaw * k, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    for (let t2 = -2; t2 <= 2; t2++) {
      ctx.beginPath();
      ctx.moveTo(t2 * 6 * k - 2 * k, hy + 18 * k);
      ctx.lineTo(t2 * 6 * k, hy + (18 + jaw * 0.7) * k);
      ctx.lineTo(t2 * 6 * k + 2 * k, hy + 18 * k);
      ctx.closePath();
      ctx.fill();
    }
  }
  // massive brow
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(0, hy - 10 * k, 30 * k, 10 * k, 0, Math.PI, 0);
  ctx.fill();
  // THE eye
  if (asleep) {
    ctx.strokeStyle = '#2a180f';
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.arc(0, hy - 2 * k, 13 * k, 0.25, Math.PI - 0.25);
    ctx.stroke();
    // lashes
    for (let l = -1; l <= 1; l++) {
      ctx.beginPath();
      ctx.moveTo(l * 8 * k, hy + 9 * k);
      ctx.lineTo(l * 9 * k, hy + 13 * k);
      ctx.stroke();
    }
  } else {
    const track = Math.sin(s.t * 0.5) * 4 * k; // the eye follows you
    ctx.fillStyle = '#f3ead0';
    ctx.beginPath();
    ctx.ellipse(0, hy - 2 * k, 15 * k, 11 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b07830';
    ctx.beginPath();
    ctx.arc(track, hy - 2 * k, 6.5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#180c06';
    ctx.beginPath();
    ctx.arc(track, hy - 2 * k, 3 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(track - 2 * k, hy - 4.5 * k, 1.4 * k, 0, Math.PI * 2);
    ctx.fill();
    glow(s, track, hy - 2 * k, 26 * k, 'rgba(255,190,90,0.22)');
  }
  ctx.restore();

  if (asleep) {
    // drifting z's
    const { ctx: c2 } = s;
    c2.save();
    c2.fillStyle = '#c8bcd8';
    c2.font = `${Math.round(22 * k)}px Georgia, serif`;
    for (let i = 0; i < 3; i++) {
      const zt = (s.t * 0.4 + i * 0.33) % 1;
      c2.globalAlpha = Math.sin(zt * Math.PI) * 0.55;
      c2.fillText('z', cx + 60 * k + i * 20 * k + Math.sin(zt * 5 + i) * 6, gy - 170 * k - zt * 70 * k);
    }
    c2.restore();
  }
}

const cyclopsHifi: SceneDef = {
  particles: [{ kind: 'dust', count: 12, hue: '#c0a890' }],
  paintBase(s) {
    const { ctx, w, h } = s;
    const fled = s.flags['cyclopsFled'];
    rockWall(s, 230, { deep: '#100a0c', mid: '#221416', near: '#33201c' });
    caveFloor(s, h * 0.84, 231, '#2a1a14');
    // the stone staircase, rising to the right
    ctx.fillStyle = '#1a1012';
    ctx.beginPath();
    ctx.moveTo(w * 0.68, h * 0.84);
    ctx.lineTo(w * 1.02, h * 0.38);
    ctx.lineTo(w * 1.02, h * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,170,150,0.14)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const sx = w * (0.72 + i * 0.05);
      const sy = h * (0.82 - i * 0.07);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(Math.min(w * 1.01, sx + w * 0.14), sy);
      ctx.stroke();
    }
    // passage back to the maze, northwest
    passageMouth(s, w * 0.08, h * 0.56, w * 0.1, h * 0.16, 232);
    // gnawed bones everywhere — he likes people
    bonesPile(s, w * 0.24, h * 0.92, 1.3, 233);
    bonesPile(s, w * 0.52, h * 0.96, 1, 234);
    if (fled) {
      // the east wall is now a cyclops-shaped problem
      ctx.fillStyle = '#050208';
      ctx.beginPath();
      ctx.moveTo(w * 0.64, h * 0.84);
      ctx.lineTo(w * 0.6, h * 0.5);
      ctx.lineTo(w * 0.66, h * 0.34);
      ctx.lineTo(w * 0.76, h * 0.3);
      ctx.lineTo(w * 0.84, h * 0.44);
      ctx.lineTo(w * 0.8, h * 0.62);
      ctx.lineTo(w * 0.86, h * 0.84);
      ctx.closePath();
      ctx.fill();
      // rubble
      const rnd = mulberry32(235);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = shade('#3a2820', (rnd() - 0.5) * 0.3);
        const rx = w * (0.6 + rnd() * 0.28);
        const ry = h * (0.84 + rnd() * 0.1);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 8 + rnd() * 14, ry - 4 - rnd() * 8);
        ctx.lineTo(rx + 16 + rnd() * 10, ry + 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  },
  paint(s) {
    const { w, h } = s;
    const fled = s.flags['cyclopsFled'];
    const asleep = s.flags['cyclopsAsleep'];
    if (fled) {
      lightShaft(s, w * 0.73, w * 0.2, w * 0.7, w * 0.3, h * 0.9, 'rgba(255,220,160,0.1)', 1);
      glow(s, w * 0.73, h * 0.55, w * 0.2, `rgba(255,210,140,${0.1 + 0.04 * Math.sin(s.t * 0.7)})`);
    } else {
      glow(s, w * 0.42, h * 0.5, w * 0.4, `rgba(200,120,60,${0.06 + 0.03 * flicker(s.t, 3)})`);
      drawCyclops(s, w * 0.42, h * 0.9, Math.min(w, 560) / 400, !!asleep);
    }
  },
};

// ---------------------------------------------------------------------------
// THE TREASURE ROOM
// ---------------------------------------------------------------------------

function goldHeap(s: SceneCtx, cx: number, cy: number, rx: number, ry: number, seed: number) {
  const { ctx } = s;
  const rnd = mulberry32(seed);
  // mound
  const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  g.addColorStop(0, '#a8742a');
  g.addColorStop(1, '#4a2e0e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // individual coins catching the light
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd());
    const px = cx + Math.cos(a) * rx * rr * 0.92;
    const py = cy + Math.sin(a) * ry * rr * 0.85 - 2;
    const cr = 1.6 + rnd() * 2.6;
    ctx.fillStyle = shade('#d9a33c', (rnd() - 0.4) * 0.5);
    ctx.beginPath();
    ctx.ellipse(px, py, cr, cr * 0.55, rnd() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few gems
  for (let i = 0; i < 5; i++) {
    const px = cx + (rnd() - 0.5) * rx * 1.4;
    const py = cy + (rnd() - 0.5) * ry;
    const gc = ['#d94a6a', '#3ac98a', '#4a7ad9'][Math.floor(rnd() * 3)];
    ctx.fillStyle = gc;
    ctx.beginPath();
    ctx.moveTo(px, py - 4);
    ctx.lineTo(px + 3.5, py);
    ctx.lineTo(px, py + 4);
    ctx.lineTo(px - 3.5, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(px - 1, py - 2.5, 1.6, 1.6);
  }
}

function drawThief(s: SceneCtx, cx: number, gy: number, k: number) {
  const { ctx } = s;
  const sway = Math.sin(s.t * 0.6) * 2 * k;
  ctx.save();
  ctx.translate(cx + sway, gy);
  // his large bag, at his feet
  ctx.fillStyle = '#2e2118';
  ctx.beginPath();
  ctx.moveTo(-46 * k, 0);
  ctx.bezierCurveTo(-52 * k, -26 * k, -38 * k, -38 * k, -26 * k, -36 * k);
  ctx.bezierCurveTo(-16 * k, -32 * k, -14 * k, -10 * k, -18 * k, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,170,120,0.3)';
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath();
  ctx.arc(-32 * k, -34 * k, 8 * k, Math.PI * 0.2, Math.PI * 0.9);
  ctx.stroke();
  // cloaked body, leaning
  const cloak = ctx.createLinearGradient(-20 * k, 0, 24 * k, 0);
  cloak.addColorStop(0, '#171220');
  cloak.addColorStop(1, '#312840');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-14 * k, 0);
  ctx.bezierCurveTo(-20 * k, -50 * k, -8 * k, -92 * k, 8 * k, -108 * k);
  ctx.lineTo(20 * k, -102 * k);
  ctx.bezierCurveTo(26 * k, -70 * k, 24 * k, -30 * k, 22 * k, 0);
  ctx.closePath();
  ctx.fill();
  // hood, with darkness where a face should be
  ctx.fillStyle = '#241c30';
  ctx.beginPath();
  ctx.ellipse(12 * k, -114 * k, 14 * k, 16 * k, 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#07050c';
  ctx.beginPath();
  ctx.ellipse(15 * k, -112 * k, 8 * k, 11 * k, 0.24, 0, Math.PI * 2);
  ctx.fill();
  // sharp chin catching lamplight
  ctx.fillStyle = '#b09a84';
  ctx.beginPath();
  ctx.ellipse(17 * k, -105 * k, 4 * k, 3 * k, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // arm with the stiletto, idly inspecting it
  const wrist = Math.sin(s.t * 1.1) * 0.1;
  ctx.save();
  ctx.translate(20 * k, -72 * k);
  ctx.rotate(-0.5 + wrist);
  ctx.fillStyle = '#2a2138';
  ctx.beginPath();
  ctx.roundRect(0, -5 * k, 30 * k, 10 * k, 5 * k);
  ctx.fill();
  ctx.fillStyle = '#b09a84'; // hand
  ctx.beginPath();
  ctx.arc(32 * k, 0, 5 * k, 0, Math.PI * 2);
  ctx.fill();
  // the stiletto
  ctx.fillStyle = '#d8dee8';
  ctx.beginPath();
  ctx.moveTo(35 * k, -2 * k);
  ctx.lineTo(58 * k, -4 * k);
  ctx.lineTo(37 * k, 2.5 * k);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // one boot forward
  ctx.fillStyle = '#171220';
  ctx.beginPath();
  ctx.ellipse(4 * k, -2 * k, 12 * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const treasureHifi: SceneDef = {
  particles: [
    { kind: 'sparkle', count: 34, hue: '#ffe08a' },
    { kind: 'dust', count: 10, hue: '#e8cc9a' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    rockWall(s, 240, { deep: '#170f08', mid: '#2a1c0c', near: '#3d2a10' });
    caveFloor(s, h * 0.84, 241, '#33230e');
    // sconce brackets (flames drawn live)
    for (const sx of [w * 0.14, w * 0.86]) {
      ctx.fillStyle = '#241a10';
      ctx.beginPath();
      ctx.moveTo(sx - 7, h * 0.4);
      ctx.lineTo(sx + 7, h * 0.4);
      ctx.lineTo(sx + 3, h * 0.34);
      ctx.lineTo(sx - 3, h * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(sx - 2.5, h * 0.4, 5, h * 0.05);
    }
    // heaps of plunder
    goldHeap(s, w * 0.26, h * 0.9, w * 0.19, h * 0.05, 242);
    goldHeap(s, w * 0.72, h * 0.93, w * 0.23, h * 0.06, 243);
    goldHeap(s, w * 0.5, h * 0.97, w * 0.2, h * 0.045, 244);
    // discarded crumbling bags
    const rnd = mulberry32(245);
    for (const [bx, by2] of [[0.12, 0.94], [0.9, 0.88]] as const) {
      ctx.fillStyle = '#33261a';
      ctx.beginPath();
      ctx.ellipse(w * bx, h * by2, 22 + rnd() * 8, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,6,4,0.6)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(w * bx - 14, h * by2 - 8);
      ctx.quadraticCurveTo(w * bx, h * by2 - 2, w * bx + 16, h * by2 - 9);
      ctx.stroke();
    }
    // a crown, half-buried
    ctx.fillStyle = '#e0b34a';
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.9);
    for (let i = 0; i < 4; i++) {
      ctx.lineTo(w * 0.62 + i * 9 + 4.5, h * 0.9 - 10);
      ctx.lineTo(w * 0.62 + (i + 1) * 9, h * 0.9);
    }
    ctx.lineTo(w * 0.62 + 36, h * 0.9 + 7);
    ctx.lineTo(w * 0.62, h * 0.9 + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9344a';
    ctx.beginPath();
    ctx.arc(w * 0.62 + 18, h * 0.9 + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // the silver chalice on its ornate stand
    const cx = w * 0.5;
    const cy = h * 0.66;
    ctx.fillStyle = '#241708'; // stand column
    ctx.beginPath();
    ctx.moveTo(cx - 13, h * 0.84);
    ctx.lineTo(cx - 8, cy + 12);
    ctx.lineTo(cx + 8, cy + 12);
    ctx.lineTo(cx + 13, h * 0.84);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(cx - 20, h * 0.84, 40, 6);
    ctx.fillRect(cx - 12, cy + 8, 24, 5);
    // chalice: bowl, stem, foot in bright silver
    const sg = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
    sg.addColorStop(0, '#8a94a5');
    sg.addColorStop(0.45, '#f2f7ff');
    sg.addColorStop(1, '#6e7888');
    ctx.fillStyle = sg;
    ctx.beginPath(); // bowl
    ctx.moveTo(cx - 15, cy - 34);
    ctx.bezierCurveTo(cx - 15, cy - 16, cx - 7, cy - 10, cx, cy - 9);
    ctx.bezierCurveTo(cx + 7, cy - 10, cx + 15, cy - 16, cx + 15, cy - 34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // lip
    ctx.ellipse(cx, cy - 34, 15, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 2.5, cy - 10, 5, 14); // stem
    ctx.beginPath(); // knop
    ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // foot
    ctx.ellipse(cx, cy + 8, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // engraved bands
    ctx.strokeStyle = 'rgba(60,70,90,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 28, 13.5, 3, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 11, 2.5, 0, 0, Math.PI);
    ctx.stroke();
  },
  paint(s) {
    const { w, h } = s;
    // sconce torchlight
    for (const [sx, ph] of [[w * 0.14, 0], [w * 0.86, 3.1]] as const) {
      flames(s, sx, h * 0.345, h * 0.02, ph, 0.9);
      glow(s, sx, h * 0.32, w * 0.13, `rgba(255,150,60,${0.16 + 0.08 * flicker(s.t, ph)})`);
    }
    // hoard-glow breathing over everything
    glow(s, w * 0.5, h * 0.9, w * 0.42, `rgba(255,190,80,${0.1 + 0.05 * flicker(s.t * 0.6, 8)})`);
    // the chalice gleams
    glow(s, w * 0.5, h * 0.62, 34, `rgba(225,240,255,${0.25 + 0.12 * Math.sin(s.t * 1.4)})`);
    const gp = (s.t % 4.8) / 4.8;
    if (gp < 0.16) {
      glow(s, w * 0.5 - 12 + (gp / 0.16) * 24, h * 0.63, 10, `rgba(255,255,255,${Math.sin((gp / 0.16) * Math.PI) * 0.6})`);
    }
    if (!s.flags['thiefDead']) {
      drawThief(s, w * 0.83, h * 0.87, Math.min(w, 560) / 430);
      // the glint of a watched blade
      const tp = (s.t % 3.4) / 3.4;
      if (tp < 0.14) {
        glow(s, w * 0.865, h * 0.71, 9, `rgba(230,240,255,${Math.sin((tp / 0.14) * Math.PI) * 0.7})`);
      }
    } else {
      // his stiletto lies among the coins he loved
      const { ctx } = s;
      ctx.save();
      ctx.translate(w * 0.8, h * 0.9);
      ctx.rotate(0.3);
      ctx.fillStyle = '#d8dee8';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, -2);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a2138';
      ctx.fillRect(-10, -2.5, 10, 5);
      ctx.restore();
    }
  },
};

Object.assign(hifiScenes, {
  trollRoom: trollRoomHifi,
  cyclops: cyclopsHifi,
  treasure: treasureHifi,
});

// ---------------------------------------------------------------------------
// THE DOME ROOM — standing at the railing, looking down into the dark
// ---------------------------------------------------------------------------

const domeHifi: SceneDef = {
  particles: [
    { kind: 'dust', count: 18, hue: '#b8c8e0' },
    { kind: 'mist', count: 8, hue: 'rgba(70,90,140,0.5)' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d1222');
    g.addColorStop(0.45, '#0a0e1a');
    g.addColorStop(1, '#04050c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // the dome soars overhead: stone ribs converging toward an apex behind you
    for (let i = 0; i < 6; i++) {
      const r = h * (0.55 + i * 0.16);
      ctx.strokeStyle = `rgba(120,140,190,${0.22 - i * 0.03})`;
      ctx.lineWidth = 10 - i;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 1.25, r, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      // mortar joints between ribs
      ctx.strokeStyle = `rgba(8,10,20,${0.5 - i * 0.06})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 1.25, r - 6, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    // radial ribs
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1.12 + (i / 8) * 0.76);
      ctx.strokeStyle = 'rgba(90,110,160,0.14)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + Math.cos(a) * h * 0.52, h * 1.25 + Math.sin(a) * h * 0.52);
      ctx.lineTo(w * 0.5 + Math.cos(a) * h * 1.5, h * 1.25 + Math.sin(a) * h * 1.5);
      ctx.stroke();
    }
    glow(s, w * 0.5, h * 0.12, w * 0.4, 'rgba(90,120,190,0.1)');

    // THE VOID — the shaft falling away below the railing
    const void1 = ctx.createRadialGradient(w * 0.5, h * 0.95, w * 0.05, w * 0.5, h * 0.9, w * 0.6);
    void1.addColorStop(0, 'rgba(0,0,0,0.92)');
    void1.addColorStop(0.55, 'rgba(2,3,8,0.75)');
    void1.addColorStop(1, 'rgba(2,3,8,0)');
    ctx.fillStyle = void1;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // the worn wooden railing, your only friend here
    const railY = h * 0.72;
    ctx.strokeStyle = '#3a2c22';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-4, railY + h * 0.05);
    ctx.quadraticCurveTo(w * 0.5, railY - h * 0.075, w + 4, railY + h * 0.05);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,180,150,0.22)'; // lamplight on the handrail
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, railY + h * 0.045);
    ctx.quadraticCurveTo(w * 0.5, railY - h * 0.08, w + 4, railY + h * 0.045);
    ctx.stroke();
    // balusters
    ctx.strokeStyle = '#2c211a';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 13; i++) {
      const bx = (i / 13) * w;
      const by = railY + h * 0.05 - Math.sin((i / 13) * Math.PI) * h * 0.125;
      ctx.beginPath();
      ctx.moveTo(bx, by + 4);
      ctx.lineTo(bx, by + h * 0.1);
      ctx.stroke();
    }
    // narrow ledge underfoot
    const ledge = ctx.createLinearGradient(0, h * 0.86, 0, h);
    ledge.addColorStop(0, '#1c1826');
    ledge.addColorStop(1, '#0a0812');
    ctx.fillStyle = ledge;
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    ctx.fillStyle = 'rgba(140,160,210,0.08)';
    ctx.fillRect(0, h * 0.86, w, 2);
  },
  paint(s) {
    const { ctx, w, h } = s;
    // far, far below: the eternal flame of the ivory torch
    const tw = 0.8 + 0.2 * flicker(s.t, 3);
    glow(s, w * 0.5, h * 0.87, 9 * tw, 'rgba(255,180,80,0.55)');
    glow(s, w * 0.5, h * 0.87, 26 * tw, 'rgba(255,140,50,0.18)');

    if (s.flags['ropeTied']) {
      // the rope drops over the rail and vanishes toward that tiny light
      const sway = Math.sin(s.t * 0.7) * 7;
      const grad = ctx.createLinearGradient(0, h * 0.64, 0, h * 0.9);
      grad.addColorStop(0, '#96744a');
      grad.addColorStop(1, 'rgba(90,66,40,0.15)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.645);
      ctx.quadraticCurveTo(w * 0.5 + sway, h * 0.78, w * 0.5 + sway * 1.6, h * 0.9);
      ctx.stroke();
      // knot at the railing
      ctx.fillStyle = '#7a5c38';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.645, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,26,14,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.645, 4, 0.4, 2.6);
      ctx.stroke();
    }
    fog(s, h * 0.8, 50, 'rgba(60,80,130,0.4)', 0.14, 6, 91);
  },
};

// ---------------------------------------------------------------------------
// THE TORCH ROOM — the same shaft, seen from the bottom
// ---------------------------------------------------------------------------

const torchRoomHifi: SceneDef = {
  particles: [
    { kind: 'ember', count: 16, hue: '#ffb45a' },
    { kind: 'dust', count: 10, hue: '#e0c8a8' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05060e');
    g.addColorStop(0.5, '#120d16');
    g.addColorStop(1, '#241820');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // the dome, dizzyingly far overhead
    for (let i = 0; i < 5; i++) {
      const r = h * (0.3 + i * 0.13);
      ctx.strokeStyle = `rgba(150,120,90,${0.16 - i * 0.025})`;
      ctx.lineWidth = 7 - i;
      ctx.beginPath();
      ctx.arc(w * 0.5, -h * 0.28, r, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    // the frieze of elfin hacking rites, ringing the dome
    const rnd = mulberry32(93);
    ctx.strokeStyle = 'rgba(220,180,120,0.3)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (0.16 + (i / 14) * 0.68);
      const fx = w * 0.5 + Math.cos(a) * h * 0.62;
      const fy = -h * 0.28 + Math.sin(a) * h * 0.62;
      // tiny figure mid-hack
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate((rnd() - 0.5) * 0.3);
      ctx.beginPath();
      ctx.arc(0, -6, 2.4, 0, Math.PI * 2); // head
      ctx.moveTo(0, -3.5);
      ctx.lineTo(0, 4); // body
      ctx.moveTo(0, -1);
      ctx.lineTo(rnd() > 0.5 ? 6 : -6, -6); // hatchet arm, raised
      ctx.moveTo(0, 4);
      ctx.lineTo(-3, 9);
      ctx.moveTo(0, 4);
      ctx.lineTo(3, 9);
      ctx.stroke();
      ctx.restore();
    }
    // the railing, a distant silhouette at the dome's rim
    ctx.strokeStyle = 'rgba(30,24,20,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.5, -h * 0.28, h * 0.56, Math.PI * 0.22, Math.PI * 0.78);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.24 + (i / 9) * 0.54);
      const bx = w * 0.5 + Math.cos(a) * h * 0.56;
      const by = -h * 0.28 + Math.sin(a) * h * 0.56;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - 7);
      ctx.stroke();
    }

    // floor
    caveFloor(s, h * 0.84, 94, '#241a1c');
    // the grand staircase down, south
    ctx.fillStyle = '#0c0810';
    ctx.beginPath();
    ctx.roundRect(w * 0.8, h * 0.5, w * 0.24, h * 0.36, [10, 0, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,130,0.12)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.82 + i * 0.02), h * (0.62 + i * 0.048));
      ctx.lineTo(w * 1.02, h * (0.62 + i * 0.048));
      ctx.stroke();
    }

    // the white marble pedestal
    const px = w * 0.44;
    const py = h * 0.84;
    softShadow(s, px, py + 6, 60, 12, 0.5);
    const pg = ctx.createLinearGradient(px - 26, 0, px + 26, 0);
    pg.addColorStop(0, '#8a8078');
    pg.addColorStop(0.5, '#e8e0d4');
    pg.addColorStop(1, '#7a7068');
    ctx.fillStyle = pg;
    ctx.fillRect(px - 22, py - 74, 44, 74);
    // fluting
    ctx.strokeStyle = 'rgba(60,52,48,0.35)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 8, py - 70);
      ctx.lineTo(px + i * 8, py - 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#f2ece0'; // cap + base
    ctx.fillRect(px - 32, py - 82, 64, 10);
    ctx.fillRect(px - 32, py - 4, 64, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px - 32, py - 72, 64, 3);
    // the torch stub (flame drawn live)
    ctx.fillStyle = '#efe6d2';
    ctx.beginPath();
    ctx.moveTo(px - 5, py - 82);
    ctx.lineTo(px + 5, py - 82);
    ctx.lineTo(px + 3, py - 104);
    ctx.lineTo(px - 3, py - 104);
    ctx.closePath();
    ctx.fill();
  },
  paint(s) {
    const { ctx, w, h } = s;
    const px = w * 0.44;
    const py = h * 0.84;
    // the eternal flame
    flames(s, px, py - 102, h * 0.032, 9, 1.05);
    glow(s, px, py - 112, w * 0.1 * (0.9 + 0.2 * flicker(s.t, 9)), `rgba(255,190,90,${0.5 + 0.2 * flicker(s.t, 9)})`);
    glow(s, px, py - 100, w * 0.45, `rgba(255,150,60,${0.08 + 0.05 * flicker(s.t, 9)})`);
    // warm pool on the floor
    glow(s, px, py + 4, w * 0.2, `rgba(255,160,70,${0.14 + 0.07 * flicker(s.t, 4)})`);

    if (s.flags['ropeTied']) {
      // the rope dangles from the impossible ceiling, five feet too short
      const sway = Math.sin(s.t * 0.7) * 9;
      ctx.strokeStyle = '#8a6a42';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.quadraticCurveTo(w * 0.5 + sway * 0.6, h * 0.16, w * 0.5 + sway, h * 0.3);
      ctx.stroke();
      // frayed end
      ctx.lineWidth = 1.2;
      for (const d of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(w * 0.5 + sway, h * 0.3);
        ctx.lineTo(w * 0.5 + sway + d + Math.sin(s.t * 2 + d) * 1.5, h * 0.3 + 9);
        ctx.stroke();
      }
    }
  },
};

Object.assign(hifiScenes, {
  dome: domeHifi,
  torchRoom: torchRoomHifi,
});

// ---------------------------------------------------------------------------
// FLOOD CONTROL DAM #3, RESERVOIR SOUTH, END OF RAINBOW — the water set
// ---------------------------------------------------------------------------

const damHifi: SceneDef = {
  particles: [
    { kind: 'mist', count: 10, hue: 'rgba(150,190,220,0.5)' },
    { kind: 'sparkle', count: 10, hue: '#cfe8ff' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a1018');
    g.addColorStop(0.5, '#13202e');
    g.addColorStop(1, '#1a2c3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    glow(s, w * 0.5, h * 0.24, w * 0.42, 'rgba(100,170,230,0.12)');
    stalactites(s, 'rgba(3,6,10,0.9)', 141, h * 0.14, 16);

    // the mighty dam wall, sweeping across the canyon
    const crest = (x: number) => h * 0.42 - Math.sin((x / w) * Math.PI) * h * 0.07;
    const wallG = ctx.createLinearGradient(0, h * 0.32, 0, h);
    wallG.addColorStop(0, '#3d4a5c');
    wallG.addColorStop(0.5, '#2a3644');
    wallG.addColorStop(1, '#141c26');
    ctx.fillStyle = wallG;
    ctx.beginPath();
    ctx.moveTo(0, crest(0));
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, crest(x));
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    // concrete texture: pour lines following the crest curve
    ctx.strokeStyle = 'rgba(10,16,24,0.35)';
    ctx.lineWidth = 1.6;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = crest(x) + (h - crest(x)) * (i / 8) * 0.8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // expansion joints
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    for (let i = 1; i < 7; i++) {
      const x = (i / 7) * w;
      ctx.beginPath();
      ctx.moveTo(x, crest(x));
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,190,220,0.08)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 2.5, crest(x) + 4);
      ctx.lineTo(x + 2.5, h);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
    }
    // crest walkway + lamplit edge
    ctx.strokeStyle = '#4d5c6e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, crest(0) - 2);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, crest(x) - 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,225,250,0.25)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, crest(0) - 4);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, crest(x) - 4);
    ctx.stroke();
    // sluice gate housings
    for (const gx of [0.42, 0.58]) {
      ctx.fillStyle = '#1c2632';
      ctx.beginPath();
      ctx.roundRect(w * gx - 14, crest(w * gx) + h * 0.05, 28, h * 0.09, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,170,200,0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * gx - 14, crest(w * gx) + h * 0.05, 28, h * 0.09);
    }

    // the control panel
    const px = w * 0.14;
    const py = h * 0.6;
    softShadow(s, px + 45, py + 66, 60, 10, 0.4);
    const pg = ctx.createLinearGradient(px, py, px, py + 62);
    pg.addColorStop(0, '#18222e');
    pg.addColorStop(1, '#0c1218');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(px, py, 92, 62, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,180,210,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, 92, 62, 5);
    ctx.stroke();
    // rivets
    ctx.fillStyle = 'rgba(180,200,220,0.3)';
    for (const [rx2, ry2] of [[7, 7], [85, 7], [7, 55], [85, 55]] as const) {
      ctx.beginPath();
      ctx.arc(px + rx2, py + ry2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // the large metal bolt
    ctx.fillStyle = '#5a6878';
    ctx.beginPath();
    ctx.arc(px + 46, py + 42, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39434f';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      ctx.beginPath();
      ctx.arc(px + 46 + Math.cos(a) * 7, py + 42 + Math.sin(a) * 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(220,235,250,0.35)';
    ctx.beginPath();
    ctx.arc(px + 46, py + 42, 11, -2.4, -1.2);
    ctx.stroke();
  },
  paint(s) {
    const { ctx, w, h } = s;
    const crest = (x: number) => h * 0.42 - Math.sin((x / w) * Math.PI) * h * 0.07;
    // reservoir glimpsed beyond the crest — clipped so it stays behind the dam
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    for (let x = w; x >= 0; x -= 16) ctx.lineTo(x, crest(x) - 4);
    ctx.closePath();
    ctx.clip();
    waterPlane(s, h * 0.3, 'rgba(40,70,100,0.5)', 'rgba(10,20,34,0)', 142, 'rgba(150,200,240,0.2)');
    ctx.restore();
    if (s.flags['gatesOpen']) {
      for (const gx of [0.42, 0.58]) {
        torrent(s, w * gx, 26, w * gx + w * 0.02, 54, crest(w * gx) + h * 0.06, h * 0.98, 1);
      }
      fog(s, h * 0.94, 44, 'rgba(210,235,255,0.6)', 0.3, 14, 143);
    }
    // the green plastic bubble
    const px = w * 0.14;
    const py = h * 0.6;
    const on = s.flags['bubbleGlowing'];
    ctx.fillStyle = on ? '#7dff9d' : '#1d3324';
    ctx.beginPath();
    ctx.arc(px + 46, py + 17, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,220,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + 46, py + 17, 7.5, -2.2, -0.8);
    ctx.stroke();
    if (on) {
      glow(s, px + 46, py + 17, 26 + 6 * Math.sin(s.t * 2.4), 'rgba(120,255,150,0.55)');
    }
  },
};

const reservoirHifi: SceneDef = {
  particles: [
    { kind: 'mist', count: 12, hue: 'rgba(120,170,210,0.5)' },
    { kind: 'sparkle', count: 14, hue: '#a8d8f0' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    rockWall(s, 150, { deep: '#080e16', mid: '#101a26', near: '#182636' });
    if (s.flags['reservoirDrained']) {
      // mud flats, cracked and gleaming
      const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
      g.addColorStop(0, '#2e2418');
      g.addColorStop(1, '#100b06');
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      const rnd = mulberry32(151);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 26; i++) {
        ctx.lineWidth = 0.8 + rnd() * 1;
        let cx2 = rnd() * w;
        let cy2 = h * (0.64 + rnd() * 0.3);
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        for (let j = 0; j < 3; j++) {
          cx2 += (rnd() - 0.5) * 40;
          cy2 += (rnd() - 0.3) * 16;
          ctx.lineTo(cx2, cy2);
        }
        ctx.stroke();
      }
      // stranded debris
      ctx.fillStyle = '#1a1410';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * w, h * (0.66 + rnd() * 0.26), 8 + rnd() * 16, 3 + rnd() * 4, rnd(), 0, Math.PI * 2);
        ctx.fill();
      }
      // the trunk of jewels, half-buried in the mud
      const tx = w * 0.56;
      const ty = h * 0.82;
      softShadow(s, tx, ty + 8, 60, 12, 0.5);
      const tg = ctx.createLinearGradient(tx - 44, 0, tx + 44, 0);
      tg.addColorStop(0, '#2e2010');
      tg.addColorStop(0.5, '#54381c');
      tg.addColorStop(1, '#241808');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.roundRect(tx - 44, ty - 26, 88, 34, 5);
      ctx.fill();
      ctx.beginPath(); // domed lid, thrown back
      ctx.ellipse(tx, ty - 26, 44, 14, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#8a6a3a'; // banding
      ctx.lineWidth = 3;
      for (const bx of [-26, 0, 26]) {
        ctx.beginPath();
        ctx.moveTo(tx + bx, ty - 38);
        ctx.lineTo(tx + bx, ty + 8);
        ctx.stroke();
      }
      // jewels heaped inside
      const jr = mulberry32(152);
      for (let i = 0; i < 16; i++) {
        const jx = tx + (jr() - 0.5) * 70;
        const jy = ty - 28 - jr() * 8;
        ctx.fillStyle = ['#d94a6a', '#3ac98a', '#4a7ad9', '#e8c84a'][Math.floor(jr() * 4)];
        ctx.beginPath();
        ctx.moveTo(jx, jy - 3.5);
        ctx.lineTo(jx + 3, jy);
        ctx.lineTo(jx, jy + 3.5);
        ctx.lineTo(jx - 3, jy);
        ctx.closePath();
        ctx.fill();
      }
    }
  },
  paint(s) {
    const { w, h } = s;
    if (!s.flags['reservoirDrained']) {
      waterPlane(s, h * 0.58, '#1e3852', '#050b14', 153, 'rgba(150,205,245,0.3)');
      glow(s, w * 0.5, h * 0.58, w * 0.4, 'rgba(90,160,220,0.08)');
      fog(s, h * 0.56, 40, 'rgba(140,190,230,0.4)', 0.16, 7, 154);
    } else {
      // the stream still threading the mud
      waterPlane(s, h * 0.7, 'rgba(70,120,160,0.4)', 'rgba(20,40,60,0)', 155, 'rgba(170,215,250,0.3)');
      // jewel-fire glinting from the trunk
      const tx = w * 0.56;
      const ty = h * 0.82;
      glow(s, tx, ty - 30, 40, `rgba(255,170,220,${0.2 + 0.12 * Math.sin(s.t * 1.8)})`);
      glow(s, tx - 18, ty - 32, 14, `rgba(120,255,220,${0.3 + 0.2 * Math.sin(s.t * 2.7 + 1)})`);
      glow(s, tx + 20, ty - 28, 12, `rgba(255,230,120,${0.3 + 0.2 * Math.sin(s.t * 2.2 + 3)})`);
      fog(s, h * 0.74, 30, 'rgba(120,160,190,0.35)', 0.12, 5, 156);
    }
  },
};

const rainbowHifi: SceneDef = {
  particles: [
    { kind: 'mist', count: 14, hue: 'rgba(200,220,255,0.6)' },
    { kind: 'sparkle', count: 22, hue: '#ffffff' },
  ],
  paintBase(s) {
    const { ctx, w, h } = s;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#232a49');
    g.addColorStop(0.45, '#465177');
    g.addColorStop(0.75, '#8b8fab');
    g.addColorStop(1, '#b5b0c2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    glow(s, w * 0.3, h * 0.3, w * 0.4, 'rgba(190,200,240,0.14)');
    // far canyon walls framing the falls
    ridge(s, h * 0.34, 36, 0.8, '#2c2740', 161);
    ridge(s, h * 0.46, 30, 0.7, '#211d33', 162);
    // the rocky beach
    ridge(s, h * 0.78, 16, 0.7, '#262138', 163);
    ridge(s, h * 0.88, 10, 0.6, '#171126', 164);
    const rnd = mulberry32(165);
    ctx.fillStyle = '#0f0b1c';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(rnd() * w, h * (0.84 + rnd() * 0.13), 6 + rnd() * 18, 3 + rnd() * 7, rnd(), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  paint(s) {
    const { ctx, w, h } = s;
    const solid = s.flags['rainbowSolid'];
    // Aragain Falls, thundering
    torrent(s, w * 0.82, w * 0.1, w * 0.82, w * 0.17, h * 0.18, h * 0.74, 0.9);
    waterPlane(s, h * 0.74, 'rgba(120,150,190,0.55)', 'rgba(30,38,60,0.2)', 166, 'rgba(200,225,255,0.4)');
    fog(s, h * 0.68, 60, 'rgba(215,230,255,0.55)', 0.22, 10, 167);

    // the rainbow
    const hues = solid
      ? ['#ff6a6a', '#ffb35f', '#ffe95f', '#7ee87e', '#5fb9ff', '#a98aff']
      : ['#ff9a9a', '#ffcf9a', '#fff2a8', '#b2f0b2', '#a8d4ff', '#cbb4ff'];
    ctx.save();
    const pulse = solid ? 0.9 : 0.34 + 0.06 * Math.sin(s.t * 0.8);
    ctx.globalAlpha = pulse;
    ctx.lineCap = 'round';
    hues.forEach((hue, i) => {
      ctx.strokeStyle = hue;
      ctx.lineWidth = solid ? 10 : 6;
      ctx.beginPath();
      ctx.arc(w * 0.42, h * 1.1, h * 0.74 + i * (solid ? 10 : 6.5), Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
    });
    ctx.restore();
    if (solid) {
      // it holds weight now: a glassy sheen slides along the arc
      const sp = (s.t % 5.2) / 5.2;
      const a = Math.PI * (1.06 + sp * 0.88);
      const gx = w * 0.42 + Math.cos(a) * (h * 0.74 + 30);
      const gy = h * 1.1 + Math.sin(a) * (h * 0.74 + 30);
      glow(s, gx, gy, 34, `rgba(255,255,255,${Math.sin(sp * Math.PI) * 0.5})`);
      // and the pot of gold waits at its end
      const px2 = w * 0.2;
      const py2 = h * 0.8;
      ctx.fillStyle = '#1c1410';
      ctx.beginPath();
      ctx.ellipse(px2, py2, 22, 8, 0, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px2 - 22, py2);
      ctx.bezierCurveTo(px2 - 24, py2 - 22, px2 + 24, py2 - 22, px2 + 22, py2);
      ctx.closePath();
      ctx.fill();
      const gr = mulberry32(168);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = shade('#e8b93a', (gr() - 0.4) * 0.4);
        ctx.beginPath();
        ctx.ellipse(px2 + (gr() - 0.5) * 34, py2 - 20 - gr() * 5, 3, 1.8, gr(), 0, Math.PI * 2);
        ctx.fill();
      }
      glow(s, px2, py2 - 16, 34, `rgba(255,215,110,${0.35 + 0.14 * Math.sin(s.t * 1.6)})`);
    }
  },
};

Object.assign(hifiScenes, {
  dam: damHifi,
  reservoir: reservoirHifi,
  rainbow: rainbowHifi,
});
