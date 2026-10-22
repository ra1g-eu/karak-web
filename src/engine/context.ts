import type { GameEvent } from './events';
import type { GameState, Phase, Player } from './types';

/** A command that breaks the rules. Caught by applyCommand and returned as an error result. */
export class RuleError extends Error {
    constructor(
        readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'RuleError';
    }
}

export function fail(code: string, message: string): never {
    throw new RuleError(code, message);
}

/** Mutable working copy of the state for one command, plus the events it produced. */
export interface Ctx {
    state: GameState;
    events: GameEvent[];
}

export function currentPlayer(state: GameState): Player {
    const player = state.players[state.currentPlayerIndex];
    if (!player) throw new Error(`No player at index ${state.currentPlayerIndex}`);
    return player;
}

export function requirePhase<T extends Phase['type']>(
    state: GameState,
    ...types: T[]
): Extract<Phase, { type: T }> {
    const phase = state.turn.phase;
    if (!(types as string[]).includes(phase.type)) {
        fail('wrong-phase', `Not allowed now (phase is "${phase.type}")`);
    }
    return phase as Extract<Phase, { type: T }>;
}
