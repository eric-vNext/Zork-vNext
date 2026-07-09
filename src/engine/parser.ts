import type { Direction } from './types';

export interface ParsedCommand {
  verb: string;
  dobj?: string; // raw noun phrase
  iobj?: string;
  prep?: string;
  direction?: Direction;
  raw: string;
}

const DIRECTIONS: Record<string, Direction> = {
  north: 'north', n: 'north',
  south: 'south', s: 'south',
  east: 'east', e: 'east',
  west: 'west', w: 'west',
  northeast: 'northeast', ne: 'northeast',
  northwest: 'northwest', nw: 'northwest',
  southeast: 'southeast', se: 'southeast',
  southwest: 'southwest', sw: 'southwest',
  up: 'up', u: 'up',
  down: 'down', d: 'down',
  in: 'in', inside: 'in', enter: 'in',
  out: 'out', outside: 'out', exit: 'out',
};

const VERB_SYNONYMS: Record<string, string> = {
  l: 'look', look: 'look', gaze: 'look',
  x: 'examine', examine: 'examine', inspect: 'examine', describe: 'examine',
  i: 'inventory', inv: 'inventory', inventory: 'inventory',
  take: 'take', get: 'take', grab: 'take', pick: 'take', acquire: 'take', carry: 'take',
  drop: 'drop', release: 'drop', discard: 'drop',
  put: 'put', place: 'put', insert: 'put', stow: 'put', deposit: 'put',
  open: 'open',
  close: 'close', shut: 'close',
  read: 'read', peruse: 'read',
  go: 'go', walk: 'go', run: 'go', travel: 'go', proceed: 'go', head: 'go',
  climb: 'climb',
  move: 'move', push: 'move', slide: 'move', shift: 'move',
  turn: 'turn', rotate: 'turn', twist: 'turn',
  press: 'press',
  unlock: 'unlock',
  lock: 'lock',
  attack: 'attack', kill: 'attack', fight: 'attack', hit: 'attack', strike: 'attack',
  stab: 'attack', slay: 'attack', murder: 'attack', swing: 'attack',
  eat: 'eat', consume: 'eat', devour: 'eat', taste: 'eat',
  drink: 'drink', quaff: 'drink', sip: 'drink',
  light: 'light',
  extinguish: 'extinguish', douse: 'extinguish',
  wave: 'wave', brandish: 'wave',
  tie: 'tie', attach: 'tie', fasten: 'tie',
  untie: 'untie',
  pray: 'pray',
  echo: 'echo',
  say: 'say', shout: 'say', yell: 'say', speak: 'say',
  wait: 'wait', z: 'wait',
  again: 'again', g: 'again',
  score: 'score',
  diagnose: 'diagnose',
  help: 'help', hint: 'help',
  save: 'save',
  restore: 'restore', load: 'restore',
  restart: 'restart',
  xyzzy: 'xyzzy', plugh: 'xyzzy', plover: 'xyzzy',
  zork: 'zork',
  hello: 'hello', hi: 'hello',
  jump: 'jump', leap: 'jump',
  smell: 'smell', sniff: 'smell',
  listen: 'listen',
  ulysses: 'ulysses', odysseus: 'ulysses',
  give: 'give', offer: 'give', feed: 'give',
  throw: 'throw', toss: 'throw', hurl: 'throw',
  search: 'search',
  cross: 'cross',
  knock: 'knock',
  count: 'count',
  curse: 'curse', damn: 'curse',
  sleep: 'sleep',
  sing: 'sing',
  swim: 'swim', dive: 'swim',
  yes: 'yes', y: 'yes',
  no: 'no',
};

const PREPOSITIONS = new Set([
  'in', 'into', 'inside', 'on', 'onto', 'at', 'to', 'with', 'using',
  'under', 'behind', 'from', 'through', 'over', 'off', 'about', 'around',
]);

const NOISE_WORDS = new Set(['the', 'a', 'an', 'some', 'that', 'this', 'my', 'of', 'please', 'then', 'and']);

/** normalize typography and case */
export function cleanInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parse(raw: string): ParsedCommand | null {
  const text = cleanInput(raw);
  if (!text) return null;

  let words = text.split(' ').filter((w) => !NOISE_WORDS.has(w));
  if (words.length === 0) return null;

  // bare direction, or "go <dir>"
  if (words.length === 1 && DIRECTIONS[words[0]]) {
    return { verb: 'go', direction: DIRECTIONS[words[0]], raw };
  }

  // "say ulysses" / "say echo" style — unwrap the quoted word
  if (words[0] === 'say' && words.length >= 2) {
    words = words.slice(1);
  }

  let verb = VERB_SYNONYMS[words[0]];
  if (!verb) {
    // maybe "climb tree", unknown verb — bail with the word for a nice error
    return { verb: '?unknown', dobj: words[0], raw };
  }
  let rest = words.slice(1);

  // "pick up X", "turn on/off X", "put down X"
  if (verb === 'take' && rest[0] === 'up') rest = rest.slice(1);
  if (verb === 'drop' && rest[0] === 'down') rest = rest.slice(1);
  if (verb === 'light' && rest[rest.length - 1] === 'on') rest = rest.slice(0, -1);
  if (verb === 'turn' && (rest[0] === 'on' || rest[0] === 'off')) {
    verb = rest[0] === 'on' ? 'light' : 'extinguish';
    rest = rest.slice(1);
  }
  if (verb === 'turn' && (rest[rest.length - 1] === 'on' || rest[rest.length - 1] === 'off')) {
    verb = rest[rest.length - 1] === 'on' ? 'light' : 'extinguish';
    rest = rest.slice(0, -1);
  }
  if (verb === 'move' && rest[0] === 'aside') rest = rest.slice(1);

  if (verb === 'go' || verb === 'climb') {
    if (rest.length >= 1 && DIRECTIONS[rest[0]]) {
      return { verb: 'go', direction: DIRECTIONS[rest[0]], raw };
    }
    if (verb === 'climb') {
      // climb tree / climb up tree / climb down
      if (rest[0] === 'up' || rest[0] === 'down') {
        if (rest.length === 1) return { verb: 'go', direction: rest[0] as Direction, raw };
        rest = rest.slice(1);
      }
      return { verb: 'climb', dobj: rest.join(' ') || undefined, raw };
    }
    return { verb: 'go', dobj: rest.join(' ') || undefined, raw };
  }

  // split at preposition: verb dobj [prep iobj]
  let prepIdx = -1;
  let prep: string | undefined;
  for (let k = 0; k < rest.length; k++) {
    if (PREPOSITIONS.has(rest[k])) {
      prepIdx = k;
      prep = rest[k];
      break;
    }
  }

  let dobj: string | undefined;
  let iobj: string | undefined;
  if (prepIdx === -1) {
    dobj = rest.join(' ') || undefined;
  } else {
    dobj = rest.slice(0, prepIdx).join(' ') || undefined;
    iobj = rest.slice(prepIdx + 1).join(' ') || undefined;
  }

  // "look at X" => examine
  if (verb === 'look' && prep && (prep === 'at' || prep === 'in' || prep === 'inside' || prep === 'under' || prep === 'behind') && iobj) {
    if (prep === 'at') return { verb: 'examine', dobj: iobj, raw };
    if (prep === 'in' || prep === 'inside') return { verb: 'search', dobj: iobj, raw };
    return { verb: 'lookunder', dobj: iobj, prep, raw };
  }

  return { verb, dobj, iobj, prep, direction: undefined, raw };
}
