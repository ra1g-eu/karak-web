import type { BagToken, Coord, ItemId, MonsterId, Rotation, Score, TreasureId } from './types';

/** What happened, in order. Clients use events for the log and animations; state is the truth. */
export type GameEvent =
    | { type: 'startingRolls'; rolls: { playerId: string; total: number }[] }
    | { type: 'turnStarted'; playerId: string; round: number }
    | { type: 'turnSkipped'; playerId: string; reason: 'unconscious' }
    | { type: 'heroMoved'; playerId: string; from: Coord; to: Coord }
    | { type: 'tileDrawn'; playerId: string; typeId: string; at: Coord }
    | { type: 'tilePlaced'; playerId: string; typeId: string; at: Coord; rotation: Rotation }
    | { type: 'tokenDrawn'; playerId: string; token: BagToken; at: Coord }
    | { type: 'bagEmpty'; at: Coord }
    | { type: 'teleported'; playerId: string; from: Coord; to: Coord }
    | { type: 'combatStarted'; playerId: string; monster: MonsterId; at: Coord }
    | { type: 'diceRolled'; playerId: string; dice: [number, number] }
    | { type: 'boltUsed'; playerId: string }
    | {
          type: 'combatResolved';
          playerId: string;
          monster: MonsterId;
          total: number;
          strength: number;
          result: 'win' | 'tie' | 'loss';
      }
    | { type: 'heroRetreated'; playerId: string; from: Coord; to: Coord }
    | { type: 'heroWounded'; playerId: string; hp: number }
    | { type: 'heroFellUnconscious'; playerId: string }
    | { type: 'heroRecovered'; playerId: string; hp: number }
    | { type: 'lootTaken'; playerId: string; item: ItemId }
    | { type: 'treasureTaken'; playerId: string; treasure: TreasureId }
    | { type: 'itemDropped'; playerId: string; item: ItemId; at: Coord }
    | { type: 'itemPickedUp'; playerId: string; item: ItemId; at: Coord }
    | { type: 'chestOpened'; playerId: string; at: Coord }
    | { type: 'heroHealed'; playerId: string; hp: number; curseLifted: boolean }
    | { type: 'diceRerolled'; playerId: string; dice: [number, number]; reason: DiceRerollReason }
    | { type: 'hpSacrificed'; playerId: string; hp: number }
    | { type: 'monsterEvaded'; playerId: string; monster: MonsterId; at: Coord }
    | { type: 'turnContinues'; playerId: string; reason: 'unstoppable' }
    | { type: 'heroReincarnated'; playerId: string; from: Coord; to: Coord; hp: number }
    | { type: 'cursePlaced'; playerId: string; targetId: string; fromId: string | null }
    | { type: 'curseKept'; playerId: string; holderId: string }
    | { type: 'tokensDrawn'; playerId: string; options: BagToken[]; at: Coord }
    | { type: 'tokenReturned'; playerId: string; token: BagToken }
    | {
          type: 'portalCast';
          playerId: string;
          targetId: string;
          from: Coord;
          to: Coord;
          hp: number;
          curseLifted: boolean;
      }
    | { type: 'heroesSwapped'; playerId: string; targetId: string; from: Coord; to: Coord }
    | { type: 'turnEnded'; playerId: string }
    | { type: 'gameEnded'; scores: Score[]; winnerIds: string[] };

export type GameEventType = GameEvent['type'];

/** Warrior's Double Attack, or the Swordsman's Combat Training rerolling 1s. */
export type DiceRerollReason = 'doubleAttack' | 'combatTraining';
