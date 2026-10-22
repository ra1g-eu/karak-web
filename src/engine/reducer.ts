import type { Command } from './commands';
import { type Ctx, currentPlayer, RuleError } from './context';
import type { GameEvent } from './events';
import { chooseLootDrop, resolveCombat, rollDice, useBolt } from './rules/combat';
import { move, placeTile, teleport } from './rules/movement';
import { endTurnWithAction } from './rules/tileActions';
import type { GameState } from './types';

export type ApplyResult =
    | { ok: true; state: GameState; events: GameEvent[] }
    | { ok: false; code: string; error: string };

/**
 * The single entry point for changing a game: validates the command against the rules and
 * returns the new state plus what happened. The input state is never modified.
 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
    if (state.result) return { ok: false, code: 'game-over', error: 'The game is over' };
    if (command.playerId !== currentPlayer(state).id) {
        return { ok: false, code: 'not-your-turn', error: 'It is not your turn' };
    }

    const ctx: Ctx = { state: clone(state), events: [] };
    try {
        dispatch(ctx, command);
    } catch (e) {
        if (e instanceof RuleError) return { ok: false, code: e.code, error: e.message };
        throw e;
    }
    return { ok: true, state: ctx.state, events: ctx.events };
}

function dispatch(ctx: Ctx, command: Command): void {
    switch (command.type) {
        case 'move':
            return move(ctx, command.dir);
        case 'placeTile':
            return placeTile(ctx, command.rotation);
        case 'teleport':
            return teleport(ctx, command.to);
        case 'rollDice':
            return rollDice(ctx);
        case 'useBolt':
            return useBolt(ctx);
        case 'resolveCombat':
            return resolveCombat(ctx);
        case 'chooseLootDrop':
            return chooseLootDrop(ctx, command.drop);
        case 'endTurn':
            return endTurnWithAction(ctx, command.action);
    }
}

/** Deep copy. JSON round-tripping also guarantees the state stays plain data. */
export function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
