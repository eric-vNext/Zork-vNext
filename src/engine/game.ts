import { parse, type ParsedCommand } from './parser';
import type { DeathCause, Direction, GameState, ObjectDef, OutputLine, SfxName, TurnEffects } from './types';
import { LAMP_LIFE, MAX_SCORE, START_ROOM, TREASURE_IDS, objects, rooms } from '../data/world';

const SAVE_KEY = 'zork-vnext-save';
const CARRY_CAPACITY = 18;

function rnd(p: number): boolean {
  return Math.random() < p;
}

export class Game {
  state: GameState;
  private lastCommand: string | null = null;
  private wounds = 0;
  private turnsSinceWound = 0;
  private meleeThisTurn = false;
  private trollHp = 2;
  private thiefHp = 2;
  private cyclopsTimer = 0;
  private drainTimer = -1;
  private floodTimer = -1;
  private darkTurns = 0;

  constructor() {
    this.state = this.freshState();
  }

  private freshState(): GameState {
    const loc: Record<string, string> = {};
    const props: GameState['props'] = {};
    for (const o of Object.values(objects)) {
      loc[o.id] = o.start;
      props[o.id] = {
        open: o.startOpen ?? false,
        locked: o.startLocked ?? false,
        lit: o.id === 'torch', // the ivory torch burns eternally
        touched: false,
        dead: false,
      };
    }
    return {
      room: START_ROOM,
      score: 0,
      moves: 0,
      flags: {},
      loc,
      props,
      visited: {},
      lampLife: LAMP_LIFE,
      dead: false,
      won: false,
    };
  }

  // ------------------------------------------------------------- helpers

  get room() {
    return rooms[this.state.room];
  }

  roomDesc(): string {
    const d = this.room.desc;
    return typeof d === 'function' ? d(this.state) : d;
  }

  isLit(): boolean {
    if (!this.room.dark) return true;
    return this.lightInScope();
  }

  private lightInScope(): boolean {
    for (const o of Object.values(objects)) {
      if (!o.lightSource) continue;
      if (!this.state.props[o.id].lit) continue;
      const where = this.state.loc[o.id];
      if (where === 'player' || where === this.state.room) return true;
      if (where.startsWith('inside:')) {
        const holder = where.slice(7);
        const hp = this.state.props[holder];
        const hDef = objects[holder];
        if (!hp || !hDef) continue;
        const hLoc = this.state.loc[holder];
        if ((hp.open || hDef.transparent) && (hLoc === 'player' || hLoc === this.state.room)) return true;
      }
    }
    return false;
  }

  carried(): ObjectDef[] {
    return Object.values(objects).filter((o) => this.state.loc[o.id] === 'player');
  }

  private carriedSize(): number {
    let total = 0;
    for (const o of this.carried()) {
      total += o.size ?? 1;
      for (const inner of this.contentsOf(o.id)) total += inner.size ?? 1;
    }
    return total;
  }

  contentsOf(id: string): ObjectDef[] {
    return Object.values(objects).filter((o) => this.state.loc[o.id] === `inside:${id}`);
  }

  /** everything referencable from the player's position */
  private inScope(): ObjectDef[] {
    const out: ObjectDef[] = [];
    for (const o of Object.values(objects)) {
      const where = this.state.loc[o.id];
      if (where === 'player' || where === this.state.room) {
        out.push(o);
      } else if (where.startsWith('inside:')) {
        const holder = where.slice(7);
        const hDef = objects[holder];
        const hProps = this.state.props[holder];
        if (!hDef || !hProps) continue;
        const hLoc = this.state.loc[holder];
        const visible = hProps.open || hDef.transparent;
        if (visible && (hLoc === 'player' || hLoc === this.state.room)) out.push(o);
      }
    }
    return out;
  }

  resolveObject(phrase: string): ObjectDef | 'ambiguous' | null {
    const words = phrase.split(' ').filter(Boolean);
    if (words.length === 0) return null;
    const noun = words[words.length - 1];
    const adjs = words.slice(0, -1);
    const candidates = this.inScope().filter((o) => {
      if (!o.nouns.includes(noun)) return false;
      return adjs.every((a) => (o.adjectives ?? []).includes(a) || o.nouns.includes(a));
    });
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      // prefer carried, then touched
      const carriedFirst = candidates.filter((c) => this.state.loc[c.id] === 'player');
      if (carriedFirst.length === 1) return carriedFirst[0];
      return 'ambiguous';
    }
    return null;
  }

  // ------------------------------------------------------------- description

  describeRoom(full = true): OutputLine[] {
    const lines: OutputLine[] = [];
    if (!this.isLit()) {
      lines.push({ kind: 'danger', text: 'It is pitch black. You are likely to be eaten by a grue.' });
      return lines;
    }
    lines.push({ kind: 'room', text: this.room.name });
    if (full || !this.state.visited[this.room.id]) {
      lines.push({ kind: 'desc', text: this.roomDesc() });
    }
    // creatures
    if (this.state.room === 'trollRoom' && !this.state.props['troll'].dead) {
      lines.push({ kind: 'danger', text: 'A nasty-looking troll, brandishing a bloody axe, blocks all passages out of the room.' });
    }
    if (this.state.room === 'cyclopsRoom' && !this.state.flags['cyclopsFled'] && !this.state.flags['cyclopsAsleep']) {
      lines.push({ kind: 'danger', text: 'A hungry cyclops, standing at least ten feet tall, blocks the staircase.' });
    }
    if (this.state.room === 'cyclopsRoom' && this.state.flags['cyclopsAsleep']) {
      lines.push({ kind: 'desc', text: 'The cyclops is sleeping blissfully at the foot of the stairs.' });
    }
    if (this.state.room === 'treasureRoom' && !this.state.props['thief'].dead) {
      lines.push({ kind: 'danger', text: 'There is a suspicious-looking individual, holding a large bag, leaning against one wall. He is armed with a vicious stiletto.' });
    }
    // objects
    for (const o of Object.values(objects)) {
      if (o.scenery) continue;
      if (this.state.loc[o.id] !== this.state.room) continue;
      if (o.initial && !this.state.props[o.id].touched) {
        lines.push({ kind: 'desc', text: o.initial });
      } else {
        lines.push({ kind: 'desc', text: `There is ${o.article} here.` });
      }
      if (o.container && (this.state.props[o.id].open || o.transparent)) {
        const inner = this.contentsOf(o.id);
        if (inner.length > 0) {
          lines.push({ kind: 'desc', text: `The ${o.name} contains ${listNames(inner)}.` });
        }
      }
    }
    return lines;
  }

  // ------------------------------------------------------------- main loop

  execute(raw: string): TurnEffects {
    const fx: TurnEffects = { lines: [], sfx: [], moved: false, died: false, won: false };
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const sfx = (s: SfxName) => fx.sfx.push(s);
    this.meleeThisTurn = false;

    if (this.state.dead) {
      const cmd = raw.trim().toLowerCase();
      if (cmd === 'restart' || cmd === 'yes' || cmd === 'y') {
        return this.restart();
      }
      if (cmd === 'restore' || cmd === 'load') {
        return this.restore();
      }
      say('You are dead. Type RESTART to begin anew, or RESTORE to load a saved game.', 'sys');
      return fx;
    }

    let parsed = parse(raw);
    if (!parsed) {
      say('I beg your pardon?', 'sys');
      return fx;
    }
    if (parsed.verb === 'again') {
      if (!this.lastCommand) {
        say('You haven’t done anything yet.', 'sys');
        return fx;
      }
      parsed = parse(this.lastCommand)!;
    } else {
      this.lastCommand = raw;
    }

    // The Loud Room garbles everything except leaving or shouting ECHO
    if (
      this.state.room === 'loudRoom' &&
      !this.state.flags['echoSolved'] &&
      parsed.verb !== 'go' &&
      parsed.verb !== 'echo'
    ) {
      const w = parsed.raw.trim().split(/\s+/).pop() ?? '...';
      say(`${w} ${w} ...`, 'flavor');
      say('The room is deafening. Your words scatter and multiply into the roar.', 'desc');
      sfx('echo');
      this.state.moves++;
      return fx;
    }

    const preDark = !this.isLit();
    this.dispatch(parsed, fx);

    if (!this.state.dead && !this.state.won) {
      this.state.moves++;
      this.tick(fx, preDark);
    }

    fx.died = this.state.dead;
    fx.won = this.state.won;
    return fx;
  }

  /** world clock: lamp, timers, lurking monsters, grues */
  private tick(fx: TurnEffects, wasDarkBefore: boolean) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });

    // lamp battery
    if (this.state.props['lamp'].lit) {
      this.state.lampLife--;
      if (this.state.lampLife === 100) say('The lamp appears a bit dimmer.', 'flavor');
      if (this.state.lampLife === 50) say('The lamp is definitely dimmer now.', 'flavor');
      if (this.state.lampLife === 20) say('The lamp is nearly out. You should finish your business underground soon.', 'danger');
      if (this.state.lampLife <= 0) {
        this.state.props['lamp'].lit = false;
        say('The brass lantern flickers, dims, and goes out. Its batteries are dead.', 'danger');
        fx.sfx.push('lamp');
      }
    }

    // reservoir draining
    if (this.drainTimer > 0) {
      this.drainTimer--;
      if (this.drainTimer === 0) {
        this.state.flags['reservoirDrained'] = true;
        this.state.loc['trunk'] = 'reservoirSouth';
        if (this.state.room === 'reservoirSouth') {
          say('The water level has fallen dramatically! Lying half buried in the mud is an old trunk, bulging with jewels.', 'flavor');
          fx.sfx.push('rumble');
        }
      }
    }

    // maintenance room flooding (blue button mischief)
    if (this.floodTimer > 0) {
      this.floodTimer--;
      if (this.state.room === 'maintenance') {
        if (this.floodTimer > 0) {
          say(`The water level here is rising rapidly. It is now about ${['ankle', 'shin', 'knee', 'thigh', 'waist', 'chest'][Math.max(0, 5 - this.floodTimer)] ?? 'chest'}-deep.`, 'danger');
        }
      }
      if (this.floodTimer === 0) {
        this.state.flags['maintenanceFlooded'] = true;
        if (this.state.room === 'maintenance') {
          this.kill(fx, 'The room fills completely with cold, dark water. Your last thought is that you probably should not have pressed that button.', 'drowning');
          return;
        }
      }
    }

    // lurking troll — skip if we just traded blows with him this turn; fightTroll()
    // already rolls its own counter-attack, so this would be a second, redundant hit
    if (this.state.room === 'trollRoom' && !this.state.props['troll'].dead && !this.meleeThisTurn && rnd(0.3)) {
      say('The troll swings his axe at you and it nicks your arm!', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'troll');
      if (this.state.dead) return;
    }

    // the thief does not appreciate visitors — same deal, fightThief() already covers
    // the risk of a turn spent trading blows with him
    if (this.state.room === 'treasureRoom' && !this.state.props['thief'].dead && !this.meleeThisTurn && rnd(0.3)) {
      say('The thief slashes at you with his stiletto, grazing your shoulder!', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'thief');
      if (this.state.dead) return;
    }

    // the cyclops grows hungrier
    if (
      this.state.room === 'cyclopsRoom' &&
      !this.state.flags['cyclopsFled'] &&
      !this.state.flags['cyclopsAsleep']
    ) {
      this.cyclopsTimer++;
      if (this.cyclopsTimer === 3) say('The cyclops seems somewhat agitated.', 'danger');
      if (this.cyclopsTimer === 5) say('The cyclops is moving about the room, looking for something. Probably a light snack. Probably you.', 'danger');
      if (this.cyclopsTimer >= 7) {
        this.kill(fx, 'The cyclops, tired of all of your games and trickery, grabs you firmly. As he licks his chops, he says "Mmm. Just like Mom used to make ’em." It’s nice to be appreciated.', 'cyclops');
        return;
      }
    } else {
      this.cyclopsTimer = 0;
    }

    // grues
    const darkNow = !this.isLit();
    if (darkNow) {
      this.darkTurns++;
      if (wasDarkBefore && this.darkTurns >= 2 && rnd(0.35)) {
        this.kill(fx, 'Oh, no! You have walked into the slavering fangs of a lurking grue!', 'grue');
        fx.sfx.push('grue');
        return;
      }
      if (this.darkTurns === 1) {
        fx.lines.push({ kind: 'danger', text: 'It is pitch black. You are likely to be eaten by a grue.' });
      } else {
        fx.lines.push({ kind: 'danger', text: 'You hear a quiet slavering noise somewhere close by...' });
        fx.sfx.push('grue');
      }
    } else {
      this.darkTurns = 0;
    }

    this.healWounds(fx);
  }

  private wound(fx: TurnEffects, cause: 'troll' | 'thief') {
    this.wounds++;
    this.turnsSinceWound = 0;
    if (this.wounds >= 3) {
      this.kill(fx, 'It appears that that last blow was too much for you. I’m afraid you are dead.', cause);
    }
  }

  /** wounds heal with rest, as diagnose has always claimed */
  private healWounds(fx: TurnEffects) {
    if (this.wounds <= 0) return;
    this.turnsSinceWound++;
    if (this.turnsSinceWound >= 20) {
      this.turnsSinceWound = 0;
      this.wounds--;
      fx.lines.push({ kind: 'flavor', text: 'The ache in your bruises has faded — you feel a little steadier on your feet.' });
    }
  }

  private kill(fx: TurnEffects, message: string, cause: DeathCause) {
    fx.lines.push({ kind: 'danger', text: message });
    fx.lines.push({ kind: 'danger', text: '\n      ****  You have died  ****\n' });
    fx.lines.push({
      kind: 'sys',
      text: `In this game you scored ${this.state.score} points (of a possible ${MAX_SCORE}), in ${this.state.moves} moves. Type RESTART to try again, or RESTORE to load a saved game.`,
    });
    fx.sfx.push('die');
    this.state.dead = true;
    fx.died = true;
    fx.deathCause = cause;
  }

  // ------------------------------------------------------------- dispatch

  private dispatch(p: ParsedCommand, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const sfx = (s: SfxName) => fx.sfx.push(s);
    const dark = !this.isLit();

    const needObj = (phrase: string | undefined, verbing: string): ObjectDef | null => {
      if (!phrase) {
        say(`What do you want to ${verbing}?`, 'sys');
        return null;
      }
      if (dark && phrase !== 'lamp' && phrase !== 'lantern' && phrase !== 'light' && phrase !== 'torch') {
        say('It’s too dark to see!', 'sys');
        return null;
      }
      const o = this.resolveObject(phrase);
      if (o === 'ambiguous') {
        say(`Which ${phrase} do you mean?`, 'sys');
        return null;
      }
      if (!o) {
        say(`You can’t see any ${phrase} here!`, 'sys');
        return null;
      }
      return o;
    };

    switch (p.verb) {
      case '?unknown':
        say(`I don’t know the word "${p.dobj}".`, 'sys');
        return;

      case 'go':
        if (!p.direction) {
          if (p.dobj === 'rainbow') return this.crossRainbow(fx);
          say('Which way?', 'sys');
          return;
        }
        this.move(p.direction, fx);
        return;

      case 'climb': {
        if (!p.dobj) {
          say('Climb what?', 'sys');
          return;
        }
        if (p.dobj.includes('tree') && this.state.room === 'forestPath') return this.move('up', fx);
        if (p.dobj.includes('rope') && this.state.room === 'domeRoom') return this.move('down', fx);
        if (p.dobj.includes('chimney') && this.state.room === 'studio') return this.move('up', fx);
        if (p.dobj.includes('stair')) return this.move('up', fx);
        say('You can’t climb that.', 'sys');
        return;
      }

      case 'look':
        fx.lines.push(...this.describeRoom(true));
        return;

      case 'examine': {
        const o = needObj(p.dobj, 'examine');
        if (!o) return;
        if (o.id === 'trapDoor') {
          say(this.state.props['trapDoor'].open ? 'The trap door is open, revealing a rickety staircase descending into darkness.' : 'The trap door is closed.');
          return;
        }
        if (o.container) {
          const open = this.state.props[o.id].open || o.transparent;
          const inner = this.contentsOf(o.id);
          let text = o.desc ?? `It looks like an ordinary ${o.name}.`;
          if (o.openable && !o.transparent) text += this.state.props[o.id].open ? ' It is open.' : ' It is closed.';
          if (open) text += inner.length ? ` The ${o.name} contains ${listNames(inner)}.` : ` The ${o.name} is empty.`;
          say(text);
          return;
        }
        say(o.desc ?? `You see nothing special about the ${o.name}.`);
        return;
      }

      case 'search': {
        const o = needObj(p.dobj, 'look in');
        if (!o) return;
        if (!o.container) {
          say(`You can’t look inside ${o.article}.`, 'sys');
          return;
        }
        if (!this.state.props[o.id].open && !o.transparent) {
          say(`The ${o.name} is closed.`);
          return;
        }
        const inner = this.contentsOf(o.id);
        say(inner.length ? `The ${o.name} contains ${listNames(inner)}.` : `The ${o.name} is empty.`);
        return;
      }

      case 'lookunder': {
        const o = needObj(p.dobj, 'look under');
        if (!o) return;
        if (o.id === 'rug' && !this.state.flags['rugMoved']) {
          say('Underneath the rug you can feel the hard edge of something wooden. Perhaps you should move the rug aside.');
          return;
        }
        say('There is nothing but dust there.');
        return;
      }

      case 'inventory': {
        const items = this.carried();
        if (items.length === 0) {
          say('You are empty-handed.');
          return;
        }
        say('You are carrying:');
        for (const o of items) {
          let line = `  ${cap(o.article)}`;
          if (o.id === 'lamp') line += this.state.props['lamp'].lit ? ' (providing light)' : '';
          if (o.id === 'torch') line += ' (providing light)';
          say(line);
          if (o.container && (this.state.props[o.id].open || o.transparent)) {
            const inner = this.contentsOf(o.id);
            if (inner.length) say(`    The ${o.name} contains ${listNames(inner)}.`);
          }
        }
        return;
      }

      case 'take':
        return this.doTake(p, fx);

      case 'drop': {
        const o = needObj(p.dobj, 'drop');
        if (!o) return;
        if (this.state.loc[o.id] !== 'player') {
          say(`You aren’t carrying the ${o.name}.`, 'sys');
          return;
        }
        this.state.loc[o.id] = this.state.room;
        say('Dropped.');
        sfx('drop');
        return;
      }

      case 'put': {
        if (!p.dobj || !p.iobj) {
          say('Put what where?', 'sys');
          return;
        }
        const o = needObj(p.dobj, 'put');
        if (!o) return;
        const dest = needObj(p.iobj, 'put things in');
        if (!dest) return;
        return this.doPut(o, dest, fx);
      }

      case 'open':
        return this.doOpen(p, fx, needObj);

      case 'close': {
        const o = needObj(p.dobj, 'close');
        if (!o) return;
        if (!o.openable) {
          say(`You can’t close that.`, 'sys');
          return;
        }
        if (!this.state.props[o.id].open) {
          say('It is already closed.');
          return;
        }
        this.state.props[o.id].open = false;
        if (o.id === 'window') this.state.flags['windowOpen'] = false;
        if (o.id === 'trapDoor') this.state.flags['trapDoorOpen'] = false;
        if (o.id === 'grating') this.state.flags['gratingOpen'] = false;
        say('Closed.');
        sfx('close');
        return;
      }

      case 'read': {
        const o = needObj(p.dobj, 'read');
        if (!o) return;
        if (o.readText) {
          say(o.readText, 'flavor');
          this.state.props[o.id].touched = true;
          return;
        }
        say(`There is nothing written on the ${o.name}.`);
        return;
      }

      case 'move': {
        const o = needObj(p.dobj, 'move');
        if (!o) return;
        if (o.id === 'rug') {
          if (this.state.flags['rugMoved']) {
            say('Having moved the rug once, you find it impossible to move it again.');
            return;
          }
          this.state.flags['rugMoved'] = true;
          this.state.loc['trapDoor'] = 'livingRoom';
          say('With a great effort, the rug is moved to one side of the room, revealing the dusty cover of a closed trap door.');
          sfx('rumble');
          return;
        }
        say(`Moving the ${o.name} reveals nothing.`);
        return;
      }

      case 'turn': {
        if (!p.dobj) {
          say('Turn what?', 'sys');
          return;
        }
        const o = needObj(p.dobj, 'turn');
        if (!o) return;
        if (o.id === 'bolt') {
          const withWhat = p.iobj ? this.resolveObject(p.iobj) : null;
          const hasWrench = this.state.loc['wrench'] === 'player';
          if (p.iobj && withWhat !== objects['wrench']) {
            say('The bolt won’t turn with that.');
            return;
          }
          if (!hasWrench) {
            say('The bolt won’t turn with your best efforts. Perhaps a tool would help.');
            return;
          }
          if (!this.state.flags['bubbleGlowing']) {
            say('The bolt won’t budge. The green plastic bubble beside it remains dark.');
            return;
          }
          if (this.state.flags['gatesOpen']) {
            say('The sluice gates are already open.');
            return;
          }
          this.state.flags['gatesOpen'] = true;
          this.drainTimer = 3;
          say('The sluice gates open and water pours through the dam! Somewhere below, a great reservoir begins to drain.', 'flavor');
          sfx('rumble');
          sfx('splash');
          return;
        }
        say(`You can’t turn the ${o.name}.`, 'sys');
        return;
      }

      case 'press': {
        if (!p.dobj) {
          say('Press what?', 'sys');
          return;
        }
        if (this.state.room !== 'maintenance' || !/button|blue|yellow|red|brown/.test(p.dobj)) {
          say('There is nothing here to press.', 'sys');
          return;
        }
        return this.pressButton(p.dobj, fx);
      }

      case 'unlock': {
        const o = needObj(p.dobj, 'unlock');
        if (!o) return;
        if (o.id !== 'grating') {
          say(`The ${o.name} has no lock.`, 'sys');
          return;
        }
        const key = p.iobj ? this.resolveObject(p.iobj) : this.carried().find((c) => c.id === 'skeletonKey') ?? null;
        if (!key || key === 'ambiguous' || key.id !== 'skeletonKey') {
          say('You need the right key for that.');
          return;
        }
        if (this.state.loc['skeletonKey'] !== 'player') {
          say('You aren’t carrying the skeleton key.');
          return;
        }
        if (!this.state.props['grating'].locked) {
          say('The grating is already unlocked.');
          return;
        }
        this.state.props['grating'].locked = false;
        say('The skull-and-crossbones lock springs open with a rusty click.');
        sfx('unlock');
        return;
      }

      case 'light': {
        const o = p.dobj ? this.resolveObject(p.dobj) : objects['lamp'];
        if (!o || o === 'ambiguous') {
          say('Light what?', 'sys');
          return;
        }
        if (o.id === 'matchbook') {
          say('One of the matches flares and promptly dies in the draft. You’ll want a sturdier light down here.');
          sfx('match');
          return;
        }
        if (!o.lightSource) {
          say(`You can’t light the ${o.name}.`, 'sys');
          return;
        }
        if (this.state.loc[o.id] !== 'player' && this.state.loc[o.id] !== this.state.room) {
          say(`You don’t have the ${o.name}.`, 'sys');
          return;
        }
        if (o.id === 'lamp' && this.state.lampLife <= 0) {
          say('A burned-out lamp won’t light.');
          return;
        }
        if (this.state.props[o.id].lit) {
          say('It is already on.');
          return;
        }
        this.state.props[o.id].lit = true;
        say('The brass lantern is now on.');
        sfx('lamp');
        if (this.room.dark) {
          fx.lines.push(...this.describeRoom(true));
        }
        return;
      }

      case 'extinguish': {
        const o = p.dobj ? this.resolveObject(p.dobj) : objects['lamp'];
        if (!o || o === 'ambiguous') {
          say('Turn off what?', 'sys');
          return;
        }
        if (o.id === 'torch') {
          say('You nearly burn your hand trying. The flame will not be put out.');
          return;
        }
        if (!o.lightSource || !this.state.props[o.id].lit) {
          say('It is already off.');
          return;
        }
        this.state.props[o.id].lit = false;
        say('The brass lantern is now off.');
        sfx('lamp');
        if (!this.isLit()) {
          fx.lines.push({ kind: 'danger', text: 'It is now pitch black.' });
        }
        return;
      }

      case 'attack':
        return this.doAttack(p, fx);

      case 'give':
        return this.doGive(p, fx);

      case 'eat': {
        const o = needObj(p.dobj, 'eat');
        if (!o) return;
        if (o.id === 'lunch') {
          this.state.loc['lunch'] = 'nowhere';
          say('Thank you very much. It really hit the spot.');
          return;
        }
        if (o.id === 'garlic') {
          this.state.loc['garlic'] = 'nowhere';
          say('What the heck! You won’t make friends this way, but nobody around here is too friendly anyhow. Gulp!');
          return;
        }
        say(`I don’t think the ${o.name} would agree with you.`, 'sys');
        return;
      }

      case 'drink': {
        const o = needObj(p.dobj ?? 'water', 'drink');
        if (!o) return;
        if (o.id === 'water' || o.id === 'bottle') {
          if (this.state.loc['water'] === 'nowhere') {
            say('The bottle is empty.');
            return;
          }
          if (o.id === 'water' && this.state.loc['water'] === 'inside:bottle' && !this.state.props['bottle'].open) {
            say('You’ll have to open the bottle first.');
            return;
          }
          this.state.loc['water'] = 'nowhere';
          say('Thank you very much. I was rather thirsty (from all this talking, probably).');
          sfx('splash');
          return;
        }
        say(`You can’t drink that!`, 'sys');
        return;
      }

      case 'wave': {
        const o = needObj(p.dobj, 'wave');
        if (!o) return;
        if (o.id === 'sceptre') {
          if (this.state.loc['sceptre'] !== 'player') {
            say('You aren’t holding the sceptre.');
            return;
          }
          if (this.state.room === 'endOfRainbow' || this.state.room === 'canyonBottom') {
            if (this.state.flags['rainbowSolid']) {
              say('The rainbow shimmers appreciatively. It is already quite solid.');
              return;
            }
            this.state.flags['rainbowSolid'] = true;
            this.state.loc['potOfGold'] = 'endOfRainbow';
            say('Suddenly, the rainbow appears to become solid and, I venture, walkable (I think the giveaway was the stairs and bannister).', 'flavor');
            if (this.state.room === 'endOfRainbow') {
              say('A shimmering pot of gold appears at the end of the rainbow.', 'flavor');
            }
            sfx('treasure');
            return;
          }
          say('A dazzling display of colors briefly emanates from the sceptre.');
          return;
        }
        say(`Waving the ${o.name} accomplishes nothing.`);
        return;
      }

      case 'tie': {
        const o = needObj(p.dobj, 'tie');
        if (!o) return;
        if (o.id !== 'rope') {
          say(`You can’t tie the ${o.name} to anything.`, 'sys');
          return;
        }
        if (this.state.room !== 'domeRoom') {
          say('There is nothing here to tie the rope to.');
          return;
        }
        if (this.state.loc['rope'] !== 'player' && this.state.loc['rope'] !== 'domeRoom') {
          say('You don’t have the rope.');
          return;
        }
        if (this.state.flags['ropeTied']) {
          say('The rope is already securely fastened to the railing.');
          return;
        }
        this.state.flags['ropeTied'] = true;
        this.state.loc['rope'] = 'nowhere'; // becomes part of the scenery
        say('The rope drops over the side and comes within ten feet of the floor below.');
        return;
      }

      case 'untie': {
        if (this.state.flags['ropeTied'] && this.state.room === 'domeRoom') {
          say('The knot has fused solid. Some Frobozz Magic Knot, that.');
          return;
        }
        say('Nothing here is tied down.', 'sys');
        return;
      }

      case 'pray': {
        if (this.state.room === 'altar') {
          say('Your prayers are heard. The temple dissolves around you like morning mist...', 'flavor');
          sfx('pray');
          this.state.room = 'forestW';
          this.state.visited['forestW'] = true;
          fx.moved = true;
          fx.lines.push(...this.describeRoom(true));
          return;
        }
        say('If you pray enough, your prayers may be answered.');
        return;
      }

      case 'echo': {
        if (this.state.room === 'loudRoom' && !this.state.flags['echoSolved']) {
          this.state.flags['echoSolved'] = true;
          say('echo echo echo...', 'flavor');
          say('The acoustics of the room change subtly, and the roar dies to a whisper. Suddenly it is eerily quiet.', 'flavor');
          sfx('echo');
          return;
        }
        say('echo...', 'flavor');
        return;
      }

      case 'ulysses': {
        if (this.state.room === 'cyclopsRoom' && !this.state.flags['cyclopsFled']) {
          this.state.flags['cyclopsFled'] = true;
          this.state.flags['cyclopsAsleep'] = false;
          say('The cyclops, hearing the name of his father’s deadly nemesis, flees the room by knocking down the wall on the east of the room.', 'flavor');
          sfx('rumble');
          return;
        }
        say('Wasn’t he a sailor?');
        return;
      }

      case 'cross':
        return this.crossRainbow(fx);

      case 'wait':
        say('Time passes.');
        return;

      case 'jump':
        if (this.state.room === 'upATree') {
          say('You jump out of the tree, landing in a heap on the ground. Ouch. Nothing broken, probably.');
          this.state.room = 'forestPath';
          fx.moved = true;
          fx.lines.push(...this.describeRoom(false));
          return;
        }
        say('Wheeeeeeeeee!!!!!');
        return;

      case 'smell':
        if (this.state.room === 'kitchen' || this.state.loc['sack'] === 'player') {
          say('It smells of hot peppers.');
          return;
        }
        say('It smells like the Great Underground Empire down here: old stone, cold water, and something faintly reptilian.');
        return;

      case 'listen':
        if (this.state.room === 'loudRoom' && !this.state.flags['echoSolved']) {
          say('The roar of rushing water is deafening.');
          return;
        }
        say('You hear nothing unusual — which, down here, is its own kind of unsettling.');
        return;

      case 'xyzzy':
        say('A hollow voice says "Fool."', 'flavor');
        return;

      case 'zork':
        say('At your service!', 'flavor');
        return;

      case 'hello':
        if (this.state.room === 'treasureRoom' && !this.state.props['thief'].dead) {
          say('The thief nods, without taking his eyes off your possessions.');
          return;
        }
        say('Good day.');
        return;

      case 'curse':
        say('Such language in a high-class establishment like this!', 'flavor');
        return;

      case 'sing':
        say('Your singing summons a faint, disapproving echo. The Great Underground Empire has standards.', 'flavor');
        return;

      case 'sleep':
        say('This is no time for a nap. There are treasures to find.');
        return;

      case 'swim':
        say('Swimming isn’t usually allowed in the dungeon. Health regulations, you know.');
        return;

      case 'knock':
        say('Nobody’s home.');
        return;

      case 'count':
        say(`You have ${this.carried().length} item${this.carried().length === 1 ? '' : 's'}, ${this.state.score} points, and a nagging feeling you are being watched.`);
        return;

      case 'yes':
      case 'no':
        say('You sound rather sure of yourself.');
        return;

      case 'throw': {
        const o = needObj(p.dobj, 'throw');
        if (!o) return;
        if (this.state.loc[o.id] !== 'player') {
          say(`You aren’t carrying the ${o.name}.`, 'sys');
          return;
        }
        this.state.loc[o.id] = this.state.room;
        say(`Thrown. The ${o.name} clatters to the ground.`);
        fx.sfx.push('drop');
        return;
      }

      case 'score':
        say(`Your score is ${this.state.score} (of a possible ${MAX_SCORE}), in ${this.state.moves} moves.`, 'sys');
        say(this.rankFor(this.state.score), 'sys');
        return;

      case 'diagnose':
        if (this.wounds === 0) say('You are in perfect health, all things considered.');
        else if (this.wounds === 1) say('You have a light wound, which will heal with rest.');
        else say('You have serious wounds. Another blow could be your last.', 'danger');
        return;

      case 'help':
        say(
          'Move with compass directions (N, S, E, W, NE, UP, DOWN...). Useful verbs: LOOK, EXAMINE, TAKE, DROP, OPEN, CLOSE, READ, PUT X IN Y, ATTACK X WITH Y, LIGHT LAMP, and a few older, stranger words. Collect the treasures of the Great Underground Empire and store them in the trophy case. SAVE and RESTORE preserve your progress. And keep out of the dark: the grues are hungry.',
          'sys'
        );
        return;

      case 'save':
        return this.save(fx);

      case 'restore': {
        const restored = this.restore();
        fx.lines.push(...restored.lines);
        fx.sfx.push(...restored.sfx);
        fx.moved = restored.moved;
        return;
      }

      case 'restart': {
        const r = this.restart();
        fx.lines.push(...r.lines);
        fx.sfx.push(...r.sfx);
        fx.moved = true;
        return;
      }

      default:
        say(`You can’t do that here.`, 'sys');
        return;
    }
  }

  // ------------------------------------------------------------- verbs

  private doTake(p: ParsedCommand, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (!p.dobj) {
      say('Take what?', 'sys');
      return;
    }
    if (!this.isLit()) {
      say('It’s too dark to see!', 'sys');
      return;
    }

    if (p.dobj === 'all' || p.dobj === 'everything') {
      const here = Object.values(objects).filter(
        (o) => this.state.loc[o.id] === this.state.room && o.portable && !o.scenery
      );
      if (here.length === 0) {
        say('There is nothing here to take.', 'sys');
        return;
      }
      for (const o of here) this.takeOne(o, fx, true);
      return;
    }

    const o = this.resolveObject(p.dobj);
    if (o === 'ambiguous') {
      say(`Which ${p.dobj} do you mean?`, 'sys');
      return;
    }
    if (!o) {
      say(`You can’t see any ${p.dobj} here!`, 'sys');
      return;
    }
    this.takeOne(o, fx, false);
  }

  private takeOne(o: ObjectDef, fx: TurnEffects, batch: boolean) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const prefix = batch ? `${o.name}: ` : '';

    if (this.state.loc[o.id] === 'player') {
      say(`${prefix}You already have it.`, 'sys');
      return;
    }
    if (!o.portable || o.scenery) {
      const custom: Record<string, string> = {
        rug: 'The rug is extremely heavy and cannot be carried.',
        trophyCase: 'The trophy case is securely fastened to the wall.',
        house: 'An interesting idea, but the house is somewhat larger than your pockets.',
        troll: 'The troll spits in your face, grunting "Better luck next time" in a rather barbarous accent.',
        thief: 'Once you got him, what would you do with him?',
        cyclops: 'The cyclops doesn’t take kindly to being lifted.',
        water: 'The water slips through your fingers.',
        skeleton: 'A ghost appears in the room and is appalled at your desecration of the remains of a fellow adventurer. It curses you and vanishes. You feel a chill.',
      };
      say(`${prefix}${custom[o.id] ?? 'You can’t take that.'}`, 'sys');
      return;
    }
    // treasure under a watchful eye
    if (this.state.room === 'treasureRoom' && !this.state.props['thief'].dead && o.treasure) {
      say('Realizing just in time that the thief is watching, you stay your hand. He fingers his stiletto meaningfully.', 'danger');
      return;
    }
    // container the object is inside must be open
    const where = this.state.loc[o.id];
    if (where.startsWith('inside:')) {
      const holder = where.slice(7);
      if (!this.state.props[holder].open && !objects[holder].transparent) {
        say(`${prefix}The ${objects[holder].name} is closed.`, 'sys');
        return;
      }
      if (!this.state.props[holder].open) {
        say(`${prefix}You can’t reach it through the glass.`, 'sys');
        return;
      }
    }
    if (o.id === 'water') {
      fx.lines.push({ kind: 'sys', text: 'The water slips through your fingers. Better keep it in the bottle.' });
      return;
    }
    if (this.carriedSize() + (o.size ?? 1) > CARRY_CAPACITY) {
      say(`${prefix}Your load is too heavy. You’ll have to drop something first.`, 'sys');
      return;
    }
    this.state.loc[o.id] = 'player';
    this.state.props[o.id].touched = true;
    if (o.treasure && !this.state.flags[`takeScored:${o.id}`]) {
      this.state.flags[`takeScored:${o.id}`] = true;
      this.state.score += o.treasure.takeValue;
      fx.sfx.push('treasure');
      say(`${prefix}Taken. (Your score just went up ${o.treasure.takeValue} point${o.treasure.takeValue === 1 ? '' : 's'}.)`, 'flavor');
      return;
    }
    fx.sfx.push('take');
    say(`${prefix}Taken.`);
  }

  private doPut(o: ObjectDef, dest: ObjectDef, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (this.state.loc[o.id] !== 'player') {
      say(`You aren’t carrying the ${o.name}.`, 'sys');
      return;
    }
    if (!dest.container) {
      say(`You can’t put things in the ${dest.name}.`, 'sys');
      return;
    }
    if (!this.state.props[dest.id].open) {
      say(`The ${dest.name} is closed.`);
      return;
    }
    if (o.id === dest.id) {
      say('That would require a degree in topology.', 'sys');
      return;
    }
    const load = this.contentsOf(dest.id).reduce((s, x) => s + (x.size ?? 1), 0);
    if (load + (o.size ?? 1) > (dest.capacity ?? 4)) {
      say(`There’s no room for the ${o.name} in the ${dest.name}.`);
      return;
    }
    this.state.loc[o.id] = `inside:${dest.id}`;
    fx.sfx.push('drop');

    if (dest.id === 'trophyCase' && o.treasure && !this.state.flags[`caseScored:${o.id}`]) {
      this.state.flags[`caseScored:${o.id}`] = true;
      this.state.score += o.treasure.caseValue;
      fx.sfx.push('deposit');
      say(`As you place the ${o.name} in the trophy case, it gleams with a satisfied light. (Your score just went up ${o.treasure.caseValue} point${o.treasure.caseValue === 1 ? '' : 's'}.)`, 'flavor');
      this.checkVictory(fx);
      return;
    }
    say('Done.');
  }

  private doOpen(p: ParsedCommand, fx: TurnEffects, needObj: (phrase: string | undefined, verbing: string) => ObjectDef | null) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const o = needObj(p.dobj, 'open');
    if (!o) return;

    if (o.id === 'egg') {
      say('You have neither the tools nor the expertise. The clasp is delicate beyond anything you’ve seen, and you dare not force it.');
      return;
    }
    if (!o.openable) {
      say(`You must tell me how to do that to a ${o.name}.`, 'sys');
      return;
    }
    if (this.state.props[o.id].locked) {
      say(`The ${o.name} is locked.`);
      fx.sfx.push('fail');
      return;
    }
    if (this.state.props[o.id].open) {
      say('It is already open.');
      return;
    }
    this.state.props[o.id].open = true;
    fx.sfx.push('open');

    if (o.id === 'window') {
      this.state.flags['windowOpen'] = true;
      say('With great effort, you open the window far enough to allow entry.');
      return;
    }
    if (o.id === 'trapDoor') {
      this.state.flags['trapDoorOpen'] = true;
      say('The door reluctantly opens to reveal a rickety staircase descending into darkness.');
      fx.sfx.push('door');
      return;
    }
    if (o.id === 'grating') {
      this.state.flags['gratingOpen'] = true;
      if (this.state.room === 'gratingRoom') {
        say('The grating opens to reveal trees above you. A pile of leaves rains down through it.');
      } else {
        say('The grating opens.');
      }
      fx.sfx.push('door');
      return;
    }
    const inner = this.contentsOf(o.id);
    if (inner.length > 0) {
      say(`Opening the ${o.name} reveals ${listNames(inner)}.`);
    } else {
      say(`Opened.`);
    }
  }

  private doAttack(p: ParsedCommand, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (!p.dobj) {
      say('Attack what?', 'sys');
      return;
    }
    const target = this.resolveObject(p.dobj);
    if (!target || target === 'ambiguous') {
      say(`You can’t see any ${p.dobj} here!`, 'sys');
      return;
    }
    let weapon: ObjectDef | null = null;
    if (p.iobj) {
      const w = this.resolveObject(p.iobj);
      if (!w || w === 'ambiguous' || this.state.loc[w.id] !== 'player') {
        say(`You aren’t holding any ${p.iobj}.`, 'sys');
        return;
      }
      weapon = w;
    } else {
      weapon = this.carried().find((c) => c.weapon) ?? null;
    }

    if (target.id === 'troll') return this.fightTroll(weapon, fx);
    if (target.id === 'thief') return this.fightThief(weapon, fx);
    if (target.id === 'cyclops') {
      say('The cyclops shrugs off your blows as mere annoyances. He seems, if anything, hungrier.', 'danger');
      fx.sfx.push('swordHit');
      return;
    }
    say(`Attacking the ${target.name} is pointless.`, 'sys');
  }

  private fightTroll(weapon: ObjectDef | null, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (this.state.props['troll'].dead) {
      say('The troll is already quite dead. Beating a dead troll is considered bad form.', 'sys');
      return;
    }
    this.meleeThisTurn = true;
    if (!weapon) {
      say('Attacking the troll with your bare hands is suicidal. He laughs — a horrid, gurgling sound — and swings his axe.', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'troll');
      return;
    }
    fx.sfx.push('sword');
    const hitChance = weapon.id === 'sword' ? 0.6 : 0.45;
    if (rnd(hitChance)) {
      this.trollHp--;
      fx.sfx.push('swordHit');
      if (this.trollHp <= 0) {
        this.state.props['troll'].dead = true;
        this.state.loc['troll'] = 'nowhere';
        this.state.loc['axe'] = 'trollRoom';
        say(`The fatal blow strikes the troll square in the heart: he dies. Almost as soon as the troll breathes his last breath, a cloud of sinister black fog envelops him, and when the fog lifts, the carcass has disappeared. His bloody axe clatters to the floor.`, 'flavor');
        return;
      }
      say(`Your ${weapon.name} crashes down, and the troll staggers back, bellowing in pain!`);
    } else {
      say(`You charge, but the troll parries your ${weapon.name} with the flat of his axe.`);
    }
    if (rnd(0.4)) {
      say('The axe sweeps past as you jump aside — not quite fast enough. It grazes your ribs!', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'troll');
    }
  }

  private fightThief(weapon: ObjectDef | null, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (this.state.props['thief'].dead) {
      say('Enough. He is dead, and robbing corpses is his department.', 'sys');
      return;
    }
    this.meleeThisTurn = true;
    if (!weapon) {
      say('The thief sidesteps your grasp with insulting ease and pricks your arm with his stiletto.', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'thief');
      return;
    }
    fx.sfx.push('sword');
    const hitChance = weapon.id === 'knife' ? 0.65 : 0.5;
    if (rnd(hitChance)) {
      this.thiefHp--;
      fx.sfx.push('swordHit');
      if (this.thiefHp <= 0) {
        this.state.props['thief'].dead = true;
        this.state.loc['thief'] = 'nowhere';
        this.state.loc['stiletto'] = 'treasureRoom';
        for (const o of Object.values(objects)) {
          if (this.state.loc[o.id] === 'inside:thiefBag') this.state.loc[o.id] = 'treasureRoom';
        }
        fx.sfx.push('thief');
        say('The thief staggers, makes a strangely formal little bow, and expires. His stiletto clatters to the floor beside his large bag. The treasures of his lair are yours.', 'flavor');
        return;
      }
      say(`A quick thrust! The thief winces, surprised to find an amateur drawing blood.`);
    } else {
      say('The thief parries your blow lazily, stifling a yawn.');
    }
    if (rnd(0.4)) {
      say('The stiletto flicks out like a serpent’s tongue and stings your shoulder!', 'danger');
      fx.sfx.push('hurt');
      this.wound(fx, 'thief');
    }
  }

  private doGive(p: ParsedCommand, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (!p.dobj || !p.iobj) {
      say('Give what to whom?', 'sys');
      return;
    }
    // accept both "give lunch to cyclops" and "give cyclops lunch"
    let itemPhrase = p.dobj;
    let targetPhrase = p.iobj;
    const maybeTarget = this.resolveObject(p.dobj);
    if (maybeTarget && maybeTarget !== 'ambiguous' && (maybeTarget.id === 'cyclops' || maybeTarget.id === 'troll' || maybeTarget.id === 'thief')) {
      itemPhrase = p.iobj;
      targetPhrase = p.dobj;
    }
    const item = this.resolveObject(itemPhrase);
    const target = this.resolveObject(targetPhrase);
    if (!item || item === 'ambiguous') {
      say(`You don’t have any ${itemPhrase}.`, 'sys');
      return;
    }
    if (!target || target === 'ambiguous') {
      say(`You can’t see any ${targetPhrase} here.`, 'sys');
      return;
    }
    if (this.state.loc[item.id] !== 'player' && !(item.id === 'water' && this.state.loc['bottle'] === 'player')) {
      say(`You aren’t carrying the ${item.name}.`, 'sys');
      return;
    }

    if (target.id === 'cyclops') {
      if (item.id === 'lunch') {
        this.state.loc['lunch'] = 'nowhere';
        this.state.flags['cyclopsAte'] = true;
        this.cyclopsTimer = 0;
        say('The cyclops says "Mmm Mmm. I love hot peppers! But oh, could I use a drink. Perhaps I could drink the blood of that thing." From the gleam in his eye, it could be surmised that you are "that thing".', 'flavor');
        return;
      }
      if (item.id === 'water' || item.id === 'bottle') {
        if (!this.state.flags['cyclopsAte']) {
          say('The cyclops is not thirsty — he is hungry. Ravenously so. He eyes you like a canapé.', 'danger');
          return;
        }
        this.state.loc['water'] = 'nowhere';
        this.state.flags['cyclopsAsleep'] = true;
        this.cyclopsTimer = 0;
        say('The cyclops takes the bottle, checks that it’s open, and drains it in one gulp. He burps loudly, staggers, and drops to the floor, out cold. The staircase behind him stands unguarded.', 'flavor');
        fx.sfx.push('rumble');
        return;
      }
      say('The cyclops is not so easily impressed.', 'sys');
      return;
    }
    if (target.id === 'troll') {
      say('The troll, who is remarkably coordinated, catches it — and, not having the most discriminating tastes, gleefully eats it.', 'flavor');
      this.state.loc[item.id] = 'nowhere';
      return;
    }
    if (target.id === 'thief') {
      if (item.treasure) {
        this.state.loc[item.id] = `inside:thiefBag` as string;
        say('The thief examines it with the eye of a professional, is momentarily overcome with gratitude, and pockets it. His gratitude, like your treasure, quickly disappears.', 'flavor');
        return;
      }
      say('The thief sneers at your worthless trinket.', 'sys');
      return;
    }
    say(`The ${target.name} shows no interest.`, 'sys');
  }

  private pressButton(phrase: string, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const color = ['blue', 'yellow', 'brown', 'red'].find((c) => phrase.includes(c));
    if (!color) {
      say('Which button? They are blue, yellow, brown, and red.', 'sys');
      return;
    }
    switch (color) {
      case 'yellow':
        if (this.state.flags['bubbleGlowing']) {
          say('Click. Nothing else appears to happen.');
          return;
        }
        this.state.flags['bubbleGlowing'] = true;
        say('Click. Somewhere to the south, machinery hums to life. (Something has changed at the dam.)', 'flavor');
        fx.sfx.push('rumble');
        return;
      case 'brown':
        this.state.flags['bubbleGlowing'] = false;
        say('Click. The distant hum of machinery dies away.');
        return;
      case 'red': {
        const lit = !this.state.flags['maintLights'];
        this.state.flags['maintLights'] = lit;
        rooms['maintenance'].dark = !lit;
        say(lit ? 'The lights within the room come on.' : 'The room goes dark.');
        fx.sfx.push('lamp');
        return;
      }
      case 'blue':
        if (this.floodTimer >= 0 || this.state.flags['maintenanceFlooded']) {
          say('The button is jammed — and given the water pouring from the wall, that may be the least of your problems.', 'danger');
          return;
        }
        this.floodTimer = 6;
        say('There is a rumbling sound, and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe). It might be wise not to linger.', 'danger');
        fx.sfx.push('splash');
        return;
    }
  }

  private crossRainbow(fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    if (this.state.room !== 'endOfRainbow') {
      say('There is no rainbow here to cross.', 'sys');
      return;
    }
    if (!this.state.flags['rainbowSolid']) {
      say('You can’t walk on light. (Can you? You take a tentative step; your boot passes straight through. No.)');
      return;
    }
    say('You walk a little way up the shimmering arc, take in a breathtaking view of Aragain Falls, lose your nerve, and stroll back down. Magnificent — but your business is underground.', 'flavor');
  }

  // ------------------------------------------------------------- movement

  private move(dir: Direction, fx: TurnEffects) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });

    // combat blocks
    if (this.state.room === 'trollRoom' && !this.state.props['troll'].dead && dir !== 'south') {
      say('The troll fends you off with a menacing gesture.', 'danger');
      return;
    }
    if (
      this.state.room === 'cyclopsRoom' &&
      dir === 'up' &&
      !this.state.flags['cyclopsFled'] &&
      this.state.flags['cyclopsAsleep']
    ) {
      // sleeping cyclops lets you pass
      this.enterRoom('treasureRoom', fx, 'You tiptoe past the snoring giant and up the stairs.');
      return;
    }

    const exit = this.room.exits[dir];
    if (!exit) {
      say('You can’t go that way.', 'sys');
      fx.sfx.push('fail');
      return;
    }
    const def = typeof exit === 'string' ? { to: exit } : exit;
    if (def.ifFlag && !this.state.flags[def.ifFlag]) {
      say(def.blocked ?? 'You can’t go that way.', 'sys');
      fx.sfx.push('fail');
      return;
    }
    if (!def.to) {
      say(def.blocked ?? 'You can’t go that way.', 'sys');
      fx.sfx.push('fail');
      return;
    }

    // special: chimney squeeze
    if (this.state.room === 'studio' && dir === 'up') {
      if (this.carried().length > 2) {
        say('You can’t fit up the chimney with all that you’re carrying. (Two smallish items at most, and elbows in.)', 'sys');
        return;
      }
      this.state.flags['chimneyClimbed'] = true;
      this.enterRoom('kitchen', fx, 'You squirm and scrape your way up the dark chimney, emerging dusty and triumphant in the kitchen fireplace.');
      return;
    }

    // special: the coffin will not fit everywhere
    if (this.state.loc['coffin'] === 'player') {
      if ((this.state.room === 'temple' && dir === 'up') || (this.state.room === 'altar' && dir === 'down')) {
        say('You haven’t a prayer of getting the coffin through there.', 'sys');
        return;
      }
    }

    this.enterRoom(def.to, fx);
  }

  private enterRoom(roomId: string, fx: TurnEffects, flavor?: string) {
    const say = (text: string, kind: OutputLine['kind'] = 'desc') => fx.lines.push({ kind, text });
    const from = this.state.room;
    this.state.room = roomId;
    fx.moved = true;
    fx.sfx.push('step');
    if (flavor) say(flavor, 'flavor');

    // trap door slams behind first-time delvers
    if (roomId === 'cellar' && from === 'livingRoom' && !this.state.flags['chimneyClimbed']) {
      this.state.props['trapDoor'].open = false;
      this.state.flags['trapDoorOpen'] = false;
      say('The trap door crashes shut behind you, and you hear someone barring it.', 'danger');
      fx.sfx.push('door');
    }

    const room = rooms[roomId];
    const firstVisit = !this.state.visited[roomId];
    fx.lines.push(...this.describeRoom(firstVisit));
    // dark rooms only count as visited (and score) once seen with light
    if (firstVisit && this.isLit()) {
      this.state.visited[roomId] = true;
      if (room.score) {
        this.state.score += room.score;
        say(`(Your score just went up ${room.score} points.)`, 'flavor');
      }
    }
  }

  // ------------------------------------------------------------- meta

  private checkVictory(fx: TurnEffects) {
    const allIn = TREASURE_IDS.every((id) => this.state.loc[id] === 'inside:trophyCase');
    if (!allIn || this.state.won) return;
    this.state.score += 10;
    this.state.won = true;
    fx.won = true;
    fx.sfx.push('win');
    fx.lines.push({
      kind: 'flavor',
      text: 'As the final treasure settles into the trophy case, the room fills with a warm golden light. An almost inaudible voice whispers: "Look to your treasures for the final secret."',
    });
    fx.lines.push({
      kind: 'flavor',
      text: 'An elderly gentleman in tattered robes appears before you — the Dungeon Master himself. He bows deeply. "All the treasures of the Great Underground Empire, restored. You are truly a master adventurer."',
    });
    fx.lines.push({
      kind: 'sys',
      text: `**** You have won ****\n\nYour score is ${this.state.score} (of a possible ${MAX_SCORE}), in ${this.state.moves} moves. Rank: ${this.rankFor(this.state.score).replace('This score gives you the rank of ', '')}\n\nYou may continue exploring, or type RESTART to play again.`,
    });
  }

  private rankFor(score: number): string {
    const pct = score / MAX_SCORE;
    let rank = 'Beginner';
    if (pct >= 1) rank = 'Master Adventurer';
    else if (pct >= 0.85) rank = 'Wizard';
    else if (pct >= 0.65) rank = 'Master';
    else if (pct >= 0.45) rank = 'Adventurer';
    else if (pct >= 0.25) rank = 'Junior Adventurer';
    else if (pct >= 0.1) rank = 'Amateur Adventurer';
    return `This score gives you the rank of ${rank}.`;
  }

  save(fx: TurnEffects) {
    try {
      const blob = JSON.stringify({
        state: this.state,
        wounds: this.wounds,
        turnsSinceWound: this.turnsSinceWound,
        trollHp: this.trollHp,
        thiefHp: this.thiefHp,
        drainTimer: this.drainTimer,
        floodTimer: this.floodTimer,
      });
      localStorage.setItem(SAVE_KEY, blob);
      fx.lines.push({ kind: 'sys', text: 'Game saved.' });
    } catch {
      fx.lines.push({ kind: 'sys', text: 'Saving failed — your browser may be blocking storage.' });
    }
  }

  restore(): TurnEffects {
    const fx: TurnEffects = { lines: [], sfx: [], moved: true, died: false, won: false };
    const blob = localStorage.getItem(SAVE_KEY);
    if (!blob) {
      fx.lines.push({ kind: 'sys', text: 'No saved game found.' });
      fx.moved = false;
      return fx;
    }
    try {
      const data = JSON.parse(blob);
      this.state = data.state;
      this.wounds = data.wounds ?? 0;
      this.turnsSinceWound = data.turnsSinceWound ?? 0;
      this.trollHp = data.trollHp ?? 2;
      this.thiefHp = data.thiefHp ?? 2;
      this.drainTimer = data.drainTimer ?? -1;
      this.floodTimer = data.floodTimer ?? -1;
      this.darkTurns = 0;
      rooms['maintenance'].dark = !this.state.flags['maintLights'];
      fx.lines.push({ kind: 'sys', text: 'Game restored.' });
      fx.lines.push(...this.describeRoom(true));
    } catch {
      fx.lines.push({ kind: 'sys', text: 'The saved game appears to be corrupted.' });
      fx.moved = false;
    }
    return fx;
  }

  restart(): TurnEffects {
    this.state = this.freshState();
    this.wounds = 0;
    this.turnsSinceWound = 0;
    this.trollHp = 2;
    this.thiefHp = 2;
    this.cyclopsTimer = 0;
    this.drainTimer = -1;
    this.floodTimer = -1;
    this.darkTurns = 0;
    this.lastCommand = null;
    rooms['maintenance'].dark = true;
    const fx: TurnEffects = { lines: [], sfx: [], moved: true, died: false, won: false };
    fx.lines.push(...this.intro());
    return fx;
  }

  intro(): OutputLine[] {
    const lines: OutputLine[] = [
      { kind: 'flavor', text: 'ZORK vNEXT — The Great Underground Empire' },
      {
        kind: 'sys',
        text: 'A loving modern port of the 1977 classic by Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling. Type HELP for a primer, or just start walking.',
      },
    ];
    this.state.visited[this.state.room] = true;
    lines.push(...this.describeRoom(true));
    return lines;
  }
}

// ------------------------------------------------------------- small helpers

function listNames(items: ObjectDef[]): string {
  const names = items.map((o) => o.article);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
