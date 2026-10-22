import { coordKey } from './board';
import { RuleError, type Ctx } from './context';
import { HEROES } from './data/heroes';
import { CHEST_COUNT, MONSTERS } from './data/monsters';
import { START_TILE, TILE_PILE_COUNTS } from './data/tiles';
import type { GameEvent } from './events';
import { rollD6, seedToRng, shuffle } from './rng';
import { startTurn } from './rules/turn';
import type { BagToken, GameState, HeroId, MonsterId, Player } from './types';

export const MIN_PLAYERS = 2;
/** §2: five inventory sheets. */
export const MAX_PLAYERS = 5;
/** R-SETUP-3 */
export const STARTING_HP = 5;

export interface PlayerConfig {
    /** Defaults to `p1`, `p2`, … */
    id?: string;
    name: string;
    heroId: HeroId;
}

export interface GameConfig {
    players: PlayerConfig[];
    seed: number;
}

export interface CreateGameResult {
    state: GameState;
    events: GameEvent[];
}

/** Builds a new game ready for the starting player's first move (§3 Setup). */
export function createGame(config: GameConfig): CreateGameResult {
    validateConfig(config);

    const state: GameState = {
        schemaVersion: 1,
        rng: seedToRng(config.seed),
        players: config.players.map((p, i) => newPlayer(p, i)),
        // R-SETUP-1, R-TILE-START
        board: {
            [coordKey({ x: 0, y: 0 })]: {
                typeId: START_TILE.id,
                rotation: 0,
                monster: null,
                chest: false,
                items: [],
            },
        },
        tilePile: [],
        bag: [],
        startingPlayerIndex: 0,
        currentPlayerIndex: 0,
        round: 1,
        turn: { movesLeft: 0, path: [], phase: { type: 'awaitingAction' } },
        result: null,
    };

    // R-SETUP-2
    state.tilePile = shuffle(
        state,
        TILE_PILE_COUNTS.flatMap(([type, count]) => Array<string>(count).fill(type.id)),
    );
    // R-SETUP-7, §2.1
    const monsters = (Object.keys(MONSTERS) as MonsterId[]).flatMap((id) =>
        Array<BagToken>(MONSTERS[id].count).fill(id),
    );
    state.bag = shuffle(state, [...monsters, ...Array<BagToken>(CHEST_COUNT).fill('chest')]);

    const ctx: Ctx = { state, events: [] };
    state.startingPlayerIndex = rollForStartingPlayer(ctx);
    startTurn(ctx, state.startingPlayerIndex);
    return { state, events: ctx.events };
}

function newPlayer(config: PlayerConfig, index: number): Player {
    return {
        id: config.id ?? `p${index + 1}`,
        name: config.name.trim(),
        heroId: config.heroId,
        // R-SETUP-5
        position: { x: 0, y: 0 },
        hp: STARTING_HP,
        maxHp: STARTING_HP,
        weapons: [],
        spells: [],
        hasKey: false,
        treasures: [],
        unconscious: false,
        cursed: false,
    };
}

function validateConfig(config: GameConfig): void {
    const { players } = config;
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
        throw new RuleError('player-count', `Karak needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
    }
    // R-SETUP-4: each hero once.
    const heroes = new Set(players.map((p) => p.heroId));
    if (heroes.size !== players.length) {
        throw new RuleError('duplicate-hero', 'Each hero can be picked by only one player');
    }
    for (const p of players) {
        if (!HEROES[p.heroId]) throw new RuleError('unknown-hero', `Unknown hero "${p.heroId}"`);
        if (!p.name.trim()) throw new RuleError('empty-name', 'Every player needs a name');
    }
    const ids = players.map((p, i) => p.id ?? `p${i + 1}`);
    if (new Set(ids).size !== ids.length) {
        throw new RuleError('duplicate-id', 'Player ids must be unique');
    }
}

/** R-SETUP-6: everyone rolls 2d6; highest starts; tied leaders roll again. */
function rollForStartingPlayer(ctx: Ctx): number {
    let contenders = ctx.state.players.map((_, i) => i);
    for (;;) {
        const rolls = contenders.map((i) => ({ i, total: rollD6(ctx.state) + rollD6(ctx.state) }));
        ctx.events.push({
            type: 'startingRolls',
            rolls: rolls.map((r) => ({
                playerId: ctx.state.players[r.i]?.id ?? '',
                total: r.total,
            })),
        });
        const best = Math.max(...rolls.map((r) => r.total));
        contenders = rolls.filter((r) => r.total === best).map((r) => r.i);
        if (contenders.length === 1) return contenders[0] ?? 0;
    }
}
