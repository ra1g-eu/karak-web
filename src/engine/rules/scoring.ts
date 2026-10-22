import type { Ctx } from '../context';
import { TREASURE_VP } from '../data/items';
import type { GameState, Score } from '../types';

/** R-WIN-2: sum of treasure VP per player. */
export function computeScores(state: GameState): Score[] {
    return state.players.map((p) => ({
        playerId: p.id,
        vp: p.treasures.reduce((sum, t) => sum + TREASURE_VP[t], 0),
    }));
}

/**
 * R-WIN-1: the game ends immediately when the dragon dies.
 * Q-01 is open, so every player sharing the top score is listed as a winner for now.
 */
export function finishGame(ctx: Ctx): void {
    const scores = computeScores(ctx.state);
    const best = Math.max(...scores.map((s) => s.vp));
    const winnerIds = scores.filter((s) => s.vp === best).map((s) => s.playerId);
    ctx.state.result = { scores, winnerIds };
    ctx.state.turn.phase = { type: 'gameOver' };
    ctx.events.push({ type: 'gameEnded', scores, winnerIds });
}
