import './style.css';
import { TREASURE_IDS } from './data/world';
import { Game } from './engine/game';
import { SceneRenderer } from './scenes/renderer';
import { SoundEngine } from './audio/sound';
import type { OutputLine } from './engine/types';

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

function sceneFlags(): Record<string, boolean> {
  const f = game.state.flags;
  return {
    windowOpen: !!f['windowOpen'],
    trapDoorOpen: !!f['trapDoorOpen'],
    rugMoved: !!f['rugMoved'],
    caseGlow: TREASURE_IDS.some((id) => game.state.loc[id] === 'inside:trophyCase'),
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

function syncScene(roomChanged: boolean) {
  const lit = game.isLit();
  const sceneId = game.state.dead ? 'darkness' : lit ? game.room.scene : 'darkness';
  renderer.setScene(sceneId, sceneFlags());
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

function submit(raw: string) {
  const text = raw.trim();
  if (!text) return;
  skipTyping = true; // finish anything still typing
  print({ kind: 'echo', text });
  const before = game.state.room;
  const fx = game.execute(text);
  for (const line of fx.lines) print(line);
  for (const s of fx.sfx) sound.play(s);
  syncScene(game.state.room !== before || fx.moved || fx.died);
  refreshChips();
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
