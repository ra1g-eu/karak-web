import { kindAt } from '../board';
import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import type { Coord } from '../types';
import { findPlayer } from './heroes';
import { carries, removeItem } from './inventory';

/**
 * R-PORTAL-1/2, C-16: send any hero (the caster included) to a revealed fountain with full HP
 * and no curse. Costs no move and doesn't end the turn; usable whenever the caster is free to
 * act, including after a fight before the turn ends. Always discarded (Magical Affinity is for
 * bolts only).
 */
export function castPortal(ctx: Ctx, targetId: string, to: Coord): void {
    const { state } = ctx;
    requirePhase(state, 'awaitingAction', 'turnEnding');
    const caster = currentPlayer(state);
    if (!carries(caster, 'healingPortal')) fail('no-portal', 'No Portal of Healing to cast');
    const target = findPlayer(ctx, targetId);
    if (kindAt(state, to) !== 'fountain') fail('no-fountain', 'Pick a revealed healing fountain');

    removeItem(caster, 'healingPortal');
    const from = { ...target.position };
    const curseLifted = target.cursed;
    target.position = { ...to };
    target.hp = target.maxHp;
    target.cursed = false;
    target.unconscious = false;
    if (target.id === caster.id) state.turn.path.push({ ...to });
    ctx.events.push({
        type: 'portalCast',
        playerId: caster.id,
        targetId,
        from,
        to: { ...to },
        hp: target.hp,
        curseLifted,
    });
}
