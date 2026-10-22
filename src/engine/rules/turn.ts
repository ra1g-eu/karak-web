import { type Ctx, currentPlayer } from '../context';
import type { GameState } from '../types';

/** R-TURN-1 */
export const MOVES_PER_TURN = 4;

/** Starts the turn of the player at `index`, skipping unconscious heroes (R-HP-2). */
export function startTurn(ctx: Ctx, index: number): void {
    const { state } = ctx;
    state.currentPlayerIndex = index;
    // Each skip wakes the hero up, so this terminates within one lap.
    for (;;) {
        const player = currentPlayer(state);
        if (!player.unconscious) break;
        player.unconscious = false;
        player.hp = 1;
        ctx.events.push({ type: 'turnSkipped', playerId: player.id, reason: 'unconscious' });
        ctx.events.push({ type: 'heroRecovered', playerId: player.id, hp: player.hp });
        advanceIndex(state);
    }
    const player = currentPlayer(state);
    state.turn = {
        movesLeft: MOVES_PER_TURN,
        path: [{ ...player.position }],
        phase: { type: 'awaitingAction' },
    };
    ctx.events.push({ type: 'turnStarted', playerId: player.id, round: state.round });
}

/** Ends the active player's turn and starts the next one (R-SETUP-6: seat order). */
export function endTurn(ctx: Ctx): void {
    ctx.events.push({ type: 'turnEnded', playerId: currentPlayer(ctx.state).id });
    advanceIndex(ctx.state);
    startTurn(ctx, ctx.state.currentPlayerIndex);
}

function advanceIndex(state: GameState): void {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === state.startingPlayerIndex) state.round++;
}
