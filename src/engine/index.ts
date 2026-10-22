/**
 * Karak game engine: pure, deterministic rules logic shared by the client and (later) the server.
 * Rules live in docs/RULES.md; code cites their IDs.
 */
export const ENGINE_VERSION = '0.2.0';

export * from './types';
export type { Command, TileAction } from './commands';
export type { GameEvent } from './events';
export { createGame, MAX_PLAYERS, MIN_PLAYERS } from './setup';
export type { GameConfig, PlayerConfig } from './setup';
export { applyCommand } from './reducer';
export type { ApplyResult } from './reducer';
export { combatTotal, computeScores, currentPlayer, legalCommands } from './queries';
export { coordKey, openingsOf, parseKey } from './board';
export { HEROES, HERO_IDS } from './data/heroes';
export { ITEM_NAMES, TREASURE_VP, WEAPON_BONUS } from './data/items';
export { MONSTERS } from './data/monsters';
export { getTileType, TILE_TYPES } from './data/tiles';
