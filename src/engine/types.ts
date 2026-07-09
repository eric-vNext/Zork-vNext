export type Direction =
  | 'north' | 'south' | 'east' | 'west'
  | 'northeast' | 'northwest' | 'southeast' | 'southwest'
  | 'up' | 'down' | 'in' | 'out';

export interface GameState {
  room: string;
  score: number;
  moves: number;
  flags: Record<string, boolean | number>;
  /** object id -> location: room id, 'player', 'inside:<objId>', or 'nowhere' */
  loc: Record<string, string>;
  /** mutable object properties that can change during play */
  props: Record<string, { open?: boolean; locked?: boolean; lit?: boolean; touched?: boolean; dead?: boolean }>;
  visited: Record<string, boolean>;
  lampLife: number;
  dead: boolean;
  won: boolean;
}

export interface ExitDef {
  to: string;
  /** flag name that must be truthy for the exit to work */
  ifFlag?: string;
  /** message shown when blocked (default "You can't go that way.") */
  blocked?: string;
}

export interface RoomDef {
  id: string;
  name: string;
  /** area label shown under the title, e.g. "The Great Underground Empire" */
  region: string;
  desc: string | ((s: GameState) => string);
  exits: Partial<Record<Direction, string | ExitDef>>;
  dark?: boolean;
  /** scene renderer id */
  scene: string;
  /** audio ambience id */
  ambience: string;
  /** points for first visit */
  score?: number;
}

export interface TreasureDef {
  takeValue: number;
  caseValue: number;
}

export interface ObjectDef {
  id: string;
  /** primary display name, with article, e.g. "a brass lantern" */
  article: string;
  /** short name used in messages, e.g. "brass lantern" */
  name: string;
  /** nouns the parser accepts */
  nouns: string[];
  adjectives?: string[];
  /** where it starts */
  start: string;
  /** examine text */
  desc?: string;
  /** line printed in room description while untouched (original position flavor) */
  initial?: string;
  portable?: boolean;
  container?: boolean;
  openable?: boolean;
  startOpen?: boolean;
  startLocked?: boolean;
  keyId?: string;
  transparent?: boolean;
  lightSource?: boolean;
  weapon?: boolean;
  readText?: string;
  treasure?: TreasureDef;
  /** capacity: rough size limit for containers */
  capacity?: number;
  size?: number;
  /** don't list in room contents (scenery) */
  scenery?: boolean;
}

export type OutputKind = 'room' | 'desc' | 'echo' | 'sys' | 'danger' | 'flavor';

export interface OutputLine {
  kind: OutputKind;
  text: string;
}

export type SfxName =
  | 'take' | 'drop' | 'open' | 'close' | 'unlock' | 'door'
  | 'treasure' | 'deposit' | 'sword' | 'swordHit' | 'hurt'
  | 'die' | 'win' | 'step' | 'fail' | 'lamp' | 'grue'
  | 'splash' | 'rumble' | 'pray' | 'echo' | 'match' | 'thief';

export interface TurnEffects {
  lines: OutputLine[];
  sfx: SfxName[];
  moved: boolean;
  died: boolean;
  won: boolean;
}
