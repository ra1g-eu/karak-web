import { expect } from 'vitest';
import {
    applyCommand,
    type Command,
    coordKey,
    createGame,
    type Coord,
    type GameEvent,
    type GameState,
    type HeroId,
    type MonsterId,
    type PlacedTile,
    type Player,
    type Rotation,
} from '../../src/engine';
import { rollD6 } from '../../src/engine/rng';

/**
 * A fresh game where p1 (seat 0) is about to take the first turn of round 1.
 * p1 defaults to the Warlock: its skills only act when commanded, so base-rule tests stay
 * free of hero effects.
 */
export function newGame(heroes: HeroId[] = ['warlock', 'thief'], seed = 1): GameState {
    const { state } = createGame({
        seed,
        players: heroes.map((heroId, i) => ({ name: `Player ${i + 1}`, heroId })),
    });
    state.startingPlayerIndex = 0;
    resetTurn(state, 0);
    return state;
}

/** Makes `index` the active player with a fresh 4-move turn. */
export function resetTurn(state: GameState, index: number): void {
    state.currentPlayerIndex = index;
    const player = state.players[index] as Player;
    state.turn = {
        movesLeft: 4,
        path: [{ ...player.position }],
        phase: { type: 'awaitingAction' },
    };
}

export function player(state: GameState, index = state.currentPlayerIndex): Player {
    return state.players[index] as Player;
}

export function pid(state: GameState): string {
    return player(state).id;
}

interface TileSpec {
    at: Coord;
    typeId: string;
    rotation?: Rotation;
    monster?: MonsterId;
    chest?: boolean;
    items?: PlacedTile['items'];
}

export function putTiles(state: GameState, ...tiles: TileSpec[]): void {
    for (const t of tiles) {
        state.board[coordKey(t.at)] = {
            typeId: t.typeId,
            rotation: t.rotation ?? 0,
            monster: t.monster ?? null,
            chest: t.chest ?? false,
            items: t.items ?? [],
        };
    }
}

/** The given tiles are drawn next, in this order. */
export function stackPile(state: GameState, ...typeIds: string[]): void {
    state.tilePile.push(...[...typeIds].reverse());
}

/** The given bag tokens are drawn next, in this order. */
export function stackBag(state: GameState, ...tokens: GameState['bag']): void {
    state.bag.push(...[...tokens].reverse());
}

/** Rigs the seeded RNG so the next d6 rolls come out as `dice`, in order (up to 4). */
export function rigDice(state: GameState, ...dice: number[]): void {
    for (let seed = 0; seed < 10_000_000; seed++) {
        const probe = { rng: seed };
        if (dice.every((d) => rollD6(probe) === d)) {
            state.rng = seed;
            return;
        }
    }
    throw new Error(`No seed found for dice ${dice.join(',')}`);
}

/** A two-player game with `hero` in seat 0 (and a different hero in seat 1). */
export function gameAs(hero: HeroId, others: HeroId[] = []): GameState {
    const second: HeroId = hero === 'warlock' ? 'thief' : 'warlock';
    return newGame([hero, ...(others.length ? others : [second])]);
}

/** Puts a room with `monster` north of p1 on the start tile and steps into it. */
export function enterFight(state: GameState, monster: MonsterId, ...dice: number[]): GameState {
    putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', monster });
    const { state: inCombat } = run(state, { type: 'move', playerId: pid(state), dir: 'N' });
    if (dice.length) rigDice(inCombat, ...dice);
    return inCombat;
}

export interface RunResult {
    state: GameState;
    events: GameEvent[];
}

/** Applies commands in order, failing the test on the first rejected one. */
export function run(state: GameState, ...commands: Command[]): RunResult {
    const events: GameEvent[] = [];
    for (const command of commands) {
        const result = applyCommand(state, command);
        if (!result.ok) {
            throw new Error(`${command.type} rejected: ${result.code} (${result.error})`);
        }
        state = result.state;
        events.push(...result.events);
    }
    return { state, events };
}

export function expectRejected(state: GameState, command: Command, code: string): void {
    const result = applyCommand(state, command);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(code);
}

export function eventTypes(events: GameEvent[]): string[] {
    return events.map((e) => e.type);
}
