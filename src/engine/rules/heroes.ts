import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import type { HeroId, Player } from '../types';
import { MOVES_PER_TURN } from './turn';

/** §12: a hero's skills work only while they aren't cursed (R-CURSE-2). */
export function hasSkill(player: Player, hero: HeroId): boolean {
    return player.heroId === hero && !player.cursed;
}

export function requireSkill(player: Player, hero: HeroId, skill: string): void {
    if (!hasSkill(player, hero)) {
        fail(
            'no-skill',
            player.cursed
                ? `${skill}: cursed heroes can't use skills`
                : `${skill} isn't your skill`,
        );
    }
}

export function findPlayer(ctx: Ctx, id: string): Player {
    const player = ctx.state.players.find((p) => p.id === id);
    if (!player) fail('bad-target', `No player "${id}"`);
    return player;
}

/**
 * Warlock's Magic Swap (C-21): trade places with another hero. It costs all 4 moves, so it
 * must be the first thing done this turn; no combat happens at the new tile.
 */
export function magicSwap(ctx: Ctx, targetId: string): void {
    const { state } = ctx;
    requirePhase(state, 'awaitingAction');
    const player = currentPlayer(state);
    requireSkill(player, 'warlock', 'Magic Swap');
    if (state.turn.movesLeft !== MOVES_PER_TURN || state.turn.path.length !== 1) {
        fail('swap-start-only', 'Magic Swap costs all 4 moves, so it must start your turn');
    }
    const target = findPlayer(ctx, targetId);
    if (target.id === player.id) fail('bad-target', 'Pick another hero to swap with');
    const from = { ...player.position };
    const to = { ...target.position };
    player.position = { ...to };
    target.position = { ...from };
    state.turn.movesLeft = 0;
    state.turn.path.push({ ...to });
    ctx.events.push({ type: 'heroesSwapped', playerId: player.id, targetId, from, to });
}
