/**
 * Game state types. Everything here is plain JSON: no classes, no Maps, no shared references,
 * so a state can be cloned, saved, sent over the network and replayed.
 */

/** Compass side of a tile. The board's y axis grows southwards. */
export type Dir = 'N' | 'E' | 'S' | 'W';

/** Number of clockwise quarter turns applied to a tile. */
export type Rotation = 0 | 1 | 2 | 3;

export interface Coord {
    x: number;
    y: number;
}

export type TileShape = 'deadEnd' | 'straight' | 'corner' | 'tee' | 'cross';
export type TileKind = 'tunnel' | 'room' | 'gate' | 'fountain';

export type MonsterId =
    | 'rat'
    | 'spider'
    | 'turnkey'
    | 'mummy'
    | 'skeletonWarrior'
    | 'skeletonKing'
    | 'fallen'
    | 'dragon';

/** A token in the bag of monsters and treasures (§2.1). */
export type BagToken = MonsterId | 'chest';

export type WeaponId = 'daggers' | 'sword' | 'axe';
export type SpellId = 'magicBolt' | 'healingPortal';
/** Equipment: anything that lives in an inventory slot. */
export type ItemId = WeaponId | SpellId | 'key';
export type TreasureId = 'chest' | 'fallen' | 'ruby';

export type HeroId = 'warrior' | 'thief' | 'wizard' | 'warlock' | 'swordsman' | 'oracle';

export interface PlacedTile {
    /** Key into TILE_TYPES. */
    typeId: string;
    rotation: Rotation;
    /** Monster standing on the tile, face up. Only rooms ever hold one. */
    monster: MonsterId | null;
    /** A locked chest waiting for a hero with a key (C-08). */
    chest: boolean;
    /** Equipment dropped here, available to any hero who ends a turn on the tile (C-09). */
    items: ItemId[];
}

export interface Player {
    id: string;
    name: string;
    heroId: HeroId;
    position: Coord;
    hp: number;
    maxHp: number;
    weapons: WeaponId[];
    spells: SpellId[];
    hasKey: boolean;
    treasures: TreasureId[];
    /** At 0 HP; skips the next turn (R-HP-2). */
    unconscious: boolean;
    cursed: boolean;
}

/** What the active player is in the middle of. Each phase allows a fixed set of commands. */
export type Phase =
    | { type: 'awaitingAction' }
    | { type: 'placingTile'; typeId: string; at: Coord; validRotations: Rotation[] }
    | {
          type: 'combat';
          monster: MonsterId;
          at: Coord;
          /** Null until the dice are rolled. */
          dice: [number, number] | null;
          boltsUsed: number;
      }
    | { type: 'choosingLootDrop'; loot: ItemId; at: Coord }
    /** Combat is over; only EndTurn is allowed (R-COMBAT-END). */
    | { type: 'turnEnding' }
    | { type: 'gameOver' };

export interface TurnState {
    movesLeft: number;
    /** Every tile the hero stood on this turn, in order, starting with the turn's first tile. */
    path: Coord[];
    phase: Phase;
}

export interface Score {
    playerId: string;
    vp: number;
}

export interface GameState {
    /** Bumped whenever the state shape changes, so old saves can be detected. */
    schemaVersion: 1;
    /** Seeded PRNG state (see rng.ts). */
    rng: number;
    players: Player[];
    /** Keyed by `"x,y"` (see coordKey). */
    board: Record<string, PlacedTile>;
    /** Face-down tile pile; the next tile drawn is the last element. */
    tilePile: string[];
    /** Bag of tokens; the next token drawn is the last element. */
    bag: BagToken[];
    startingPlayerIndex: number;
    currentPlayerIndex: number;
    round: number;
    turn: TurnState;
    /** Set when the dragon dies (R-WIN-*). */
    result: { scores: Score[]; winnerIds: string[] } | null;
}
