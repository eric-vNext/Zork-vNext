import './style.css';

// roundRect landed in Safari 16 / Chrome 99; give older engines the same API
// so the scene renderer and icons work everywhere.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | (number | DOMPointInit)[]
  ) {
    const toN = (v: number | DOMPointInit | undefined): number =>
      typeof v === 'number' ? v : v ? Number(v.x ?? 0) : 0;
    let r: number[];
    if (Array.isArray(radii)) r = radii.map(toN);
    else r = [toN(radii ?? 0)];
    const [tl, tr = tl, br = tl, bl = tr] = r;
    const cl = (v: number) => Math.max(0, Math.min(v, Math.abs(w) / 2, Math.abs(h) / 2));
    const [a, b, c, d] = [cl(tl), cl(tr), cl(br), cl(bl)];
    this.moveTo(x + a, y);
    this.lineTo(x + w - b, y);
    this.arcTo(x + w, y, x + w, y + b, b);
    this.lineTo(x + w, y + h - c);
    this.arcTo(x + w, y + h, x + w - c, y + h, c);
    this.lineTo(x + d, y + h);
    this.arcTo(x, y + h, x, y + h - d, d);
    this.lineTo(x, y + a);
    this.arcTo(x, y, x + a, y, a);
    this.closePath();
    return this;
  } as typeof CanvasRenderingContext2D.prototype.roundRect;
}
import { TREASURE_IDS } from './data/world';
import { Game } from './engine/game';
import { SceneRenderer } from './scenes/renderer';
import { SoundEngine } from './audio/sound';
import { iconFor } from './scenes/icons';
import type { OutputLine, SfxName } from './engine/types';

const game = new Game();
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new SceneRenderer(canvas);
const sound = new SoundEngine();

const transcript = document.getElementById('transcript')!;
const chipsEl = document.getElementById('chips')!;
const form = document.getElementById('cmdform') as HTMLFormElement;
const input = document.getElementById('cmd') as HTMLInputElement;
const statusRoom = document.getElementById('status-room')!;
const statusScore = document.getElementById('status-score')!;
const statusMoves = document.getElementById('status-moves')!;
const soundToggle = document.getElementById('sound-toggle') as HTMLButtonElement;
const titleCard = document.getElementById('room-title-card')!;
const roomTitle = document.getElementById('room-title')!;
const roomSubtitle = document.getElementById('room-subtitle')!;

// ---------------------------------------------------------------- transcript

const CHARS_PER_SEC = 420;
interface QueueItem { line: OutputLine; el: HTMLParagraphElement }
const typeQueue: QueueItem[] = [];
let typing = false;

function print(line: OutputLine) {
  const p = document.createElement('p');
  p.className = `t-${line.kind}`;
  transcript.appendChild(p);
  typeQueue.push({ line, el: p });
  if (!typing) void typeNext();
  trimTranscript();
}

async function typeNext() {
  const item = typeQueue.shift();
  if (!item) {
    typing = false;
    return;
  }
  typing = true;
  const { line, el } = item;
  if (line.kind === 'echo' || line.text.length > 600) {
    el.textContent = line.text;
    scrollDown();
  } else {
    let i = 0;
    const step = Math.max(1, Math.round(CHARS_PER_SEC / 60));
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (skipTyping) {
          el.textContent = line.text;
          scrollDown();
          resolve();
          return;
        }
        i += step;
        el.textContent = line.text.slice(0, i);
        scrollDown();
        if (i >= line.text.length) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  if (typeQueue.length === 0) skipTyping = false;
  void typeNext();
}

let skipTyping = false;
transcript.addEventListener('pointerdown', () => {
  if (typing) skipTyping = true;
});

function scrollDown() {
  transcript.scrollTop = transcript.scrollHeight;
}

function trimTranscript() {
  while (transcript.childElementCount > 250) {
    transcript.firstElementChild?.remove();
  }
}

// ---------------------------------------------------------------- scene sync

function sceneFlags(): Record<string, boolean | string> {
  const f = game.state.flags;
  return {
    windowOpen: !!f['windowOpen'],
    trapDoorOpen: !!f['trapDoorOpen'],
    rugMoved: !!f['rugMoved'],
    caseGlow: TREASURE_IDS.some((id) => game.state.loc[id] === 'inside:trophyCase'),
    caseItems: TREASURE_IDS.filter((id) => game.state.loc[id] === 'inside:trophyCase').join(','),
    rainbowSolid: !!f['rainbowSolid'],
    ropeTied: !!f['ropeTied'],
    echoSolved: !!f['echoSolved'],
    bubbleGlowing: !!f['bubbleGlowing'],
    gatesOpen: !!f['gatesOpen'],
    reservoirDrained: !!f['reservoirDrained'],
    gratingOpen: !!f['gratingOpen'],
    cyclopsFled: !!f['cyclopsFled'],
    cyclopsAsleep: !!f['cyclopsAsleep'],
    trollDead: !!game.state.props['troll']?.dead,
    thiefDead: !!game.state.props['thief']?.dead,
  };
}

let titleTimer: number | undefined;
let lastSceneId = '';
let deathScene = 'darkness';

const DEATH_SCENES: Record<string, string> = {
  grue: 'deathGrue',
  troll: 'deathTroll',
  thief: 'deathThief',
  cyclops: 'deathCyclops',
  drowning: 'deathDrowning',
};

function syncScene(roomChanged: boolean, transitionColor?: string) {
  const lit = game.isLit();
  const victorious = game.state.won && game.state.room === 'livingRoom';
  const sceneId = game.state.dead ? deathScene : victorious ? 'victory' : lit ? game.room.scene : 'darkness';
  renderer.setScene(sceneId, sceneFlags(), transitionColor);
  renderer.updateFlags(sceneFlags());
  sound.setAmbience(game.state.dead ? 'maze' : game.room.ambience);

  statusRoom.textContent = lit ? game.room.name : 'Darkness';
  statusScore.textContent = String(game.state.score);
  statusMoves.textContent = String(game.state.moves);

  if (sceneId !== lastSceneId) {
    lastSceneId = sceneId;
    roomChanged = true;
  }
  if (roomChanged) {
    roomTitle.textContent = lit ? game.room.name : 'Darkness';
    roomSubtitle.textContent = lit ? game.room.region : 'You are likely to be eaten by a grue';
    titleCard.classList.remove('fade');
    window.clearTimeout(titleTimer);
    titleTimer = window.setTimeout(() => titleCard.classList.add('fade'), 3200);
  }
}

// ---------------------------------------------------------------- chips

const DIR_LABEL: Record<string, string> = {
  north: 'N', south: 'S', east: 'E', west: 'W',
  northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW',
  up: 'UP', down: 'DOWN', in: 'IN', out: 'OUT',
};

function refreshChips() {
  chipsEl.innerHTML = '';
  const mk = (label: string, cmd: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = label;
    b.addEventListener('click', () => {
      sound.unlock();
      submit(cmd);
    });
    chipsEl.appendChild(b);
  };
  if (game.state.dead) {
    mk('⟲ RESTART', 'restart');
    mk('RESTORE', 'restore');
    return;
  }
  for (const dir of Object.keys(game.room.exits)) {
    const label = DIR_LABEL[dir];
    if (label && label !== 'IN' && label !== 'OUT') mk(label, dir);
  }
  mk('LOOK', 'look');
  mk('INV', 'inventory');
  if (game.isLit()) mk('TAKE ALL', 'take all');
  mk('SAVE', 'save');
}

// ---------------------------------------------------------------- input

function triggerImpacts(sfx: SfxName[]) {
  for (const name of sfx) {
    switch (name) {
      case 'swordHit':
        renderer.triggerFlash('rgba(255,255,255,0.3)', 120);
        renderer.triggerShake(4, 170);
        break;
      case 'hurt':
        renderer.triggerFlash('rgba(255,50,50,0.4)', 180);
        renderer.triggerShake(6, 220);
        break;
      case 'sword':
        renderer.triggerShake(2, 110);
        break;
      case 'die':
        renderer.triggerFlash('rgba(255,30,20,0.55)', 280);
        renderer.triggerShake(9, 320);
        break;
      case 'win':
        renderer.triggerFlash('rgba(255,225,150,0.4)', 320);
        break;
      case 'rumble':
        renderer.triggerShake(3, 260);
        break;
    }
  }
}

/** narratively loaded scene changes get a flash-cut instead of a plain dissolve */
function narrativeTransitionColor(before: string, fx: ReturnType<typeof game.execute>): string | undefined {
  if (
    game.state.room === 'cellar' &&
    before === 'livingRoom' &&
    fx.lines.some((l) => l.text.startsWith('The trap door crashes shut'))
  ) {
    return 'rgba(6,4,3,0.92)';
  }
  if (before === 'altar' && game.state.room === 'forestW') {
    return 'rgba(255,228,175,0.85)';
  }
  return undefined;
}

function submit(raw: string) {
  const text = raw.trim();
  if (!text) return;
  skipTyping = true; // finish anything still typing
  print({ kind: 'echo', text });
  const before = game.state.room;
  const fx = game.execute(text);
  for (const line of fx.lines) print(line);
  for (const s of fx.sfx) sound.play(s);
  triggerImpacts(fx.sfx);
  if (fx.died && fx.deathCause) {
    deathScene = DEATH_SCENES[fx.deathCause] ?? 'darkness';
  }
  if (/^(i|inv|inventory)$/i.test(text) && !game.state.dead) {
    showInventoryIcons();
  }
  syncScene(game.state.room !== before || fx.moved || fx.died, narrativeTransitionColor(before, fx));
  refreshChips();
}

function showInventoryIcons() {
  const items = game.carried();
  if (items.length === 0) return;
  const row = document.createElement('div');
  row.className = 'icon-row';
  for (const o of items) {
    const chip = document.createElement('span');
    chip.className = 'icon-chip';
    chip.title = o.name;
    chip.appendChild(iconFor(o.id, 40));
    row.appendChild(chip);
  }
  transcript.appendChild(row);
  scrollDown();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sound.unlock();
  const v = input.value;
  input.value = '';
  submit(v);
  input.focus();
});

// keep keyboard-avoidance sane on mobile
input.addEventListener('focus', () => {
  setTimeout(scrollDown, 250);
});

soundToggle.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.muted);
  soundToggle.classList.toggle('muted', sound.muted);
});

// first tap anywhere unlocks audio (browser autoplay policy)
window.addEventListener('pointerdown', () => sound.unlock(), { once: true });

// ---------------------------------------------------------------- boot

renderer.start();
for (const line of game.intro()) print(line);
syncScene(true);
refreshChips();

// desktop: focus the prompt
if (matchMedia('(pointer: fine)').matches) input.focus();
