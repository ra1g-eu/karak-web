import type { Coord, Dir, ItemId, Rotation } from './types';

/**
 * Intents sent by a client. Every command names the player sending it; the engine rejects
 * commands from anyone but the active player.
 */
export type Command =
    /** Step onto the neighbouring tile, or explore if the space is undiscovered (R-TURN-3). */
    | { type: 'move'; playerId: string; dir: Dir }
    /** Place the tile drawn while exploring (R-EXPLORE-2). */
    | { type: 'placeTile'; playerId: string; rotation: Rotation }
    /** Jump between teleportation gates for one move (R-TG-2). */
    | { type: 'teleport'; playerId: string; to: Coord }
    /** Roll 2d6 against the monster (R-COMBAT-1). */
    | { type: 'rollDice'; playerId: string }
    /** Spend one Magic Bolt for +1 after the roll (R-BOLT-1). */
    | { type: 'useBolt'; playerId: string }
    /** Compare the total with the monster's strength and apply the result. */
    | { type: 'resolveCombat'; playerId: string }
    /** Inventory was full after a win: drop the new loot or a carried item of that slot (R-COMBAT-WIN). */
    | { type: 'chooseLootDrop'; playerId: string; drop: ItemId }
    /**
     * End the turn on the current tile, optionally doing one tile action (R-END-2):
     * heal at a fountain, open a chest with a key, or pick up a dropped item
     * (with `drop` naming a carried item to leave behind if the slot is full).
     */
    | {
          type: 'endTurn';
          playerId: string;
          action?: TileAction;
      };

export type TileAction =
    { type: 'heal' } | { type: 'openChest' } | { type: 'pickUp'; item: ItemId; drop?: ItemId };

export type CommandType = Command['type'];
