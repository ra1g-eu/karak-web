import { describe, expect, it } from 'vitest';
import type { Command, GameState } from '../../src/engine';
import { enterFight, eventTypes, expectRejected, newGame, pid, player, run } from './helpers';

const curse = (playerId: string, targetId: string | null): Command => ({
    type: 'placeCurse',
    playerId,
    targetId,
});

/** p1 (Warlock) beats a Mummy; returns the state waiting for the curse choice. */
function slayMummy(state: GameState): GameState {
    const inCombat = enterFight(state, 'mummy', 6, 6);
    const id = pid(inCombat);
    return run(
        inCombat,
        { type: 'rollDice', playerId: id },
        { type: 'resolveCombat', playerId: id },
    ).state;
}

describe('the curse of Karak (§10)', () => {
    it('R-CURSE-1: slaying a Mummy makes the slayer curse another player', () => {
        const state = slayMummy(newGame());
        expect(player(state).spells).toEqual(['magicBolt']);
        expect(state.turn.phase).toEqual({ type: 'choosingCurseTarget', after: 'endTurn' });
        expectRejected(state, { type: 'endTurn', playerId: 'p1' }, 'wrong-phase');

        const { state: after, events } = run(state, curse('p1', 'p2'));
        expect(player(after, 1).cursed).toBe(true);
        expect(player(after, 0).cursed).toBe(false);
        expect(after.turn.phase).toEqual({ type: 'turnEnding' });
        expect(events).toEqual([
            { type: 'cursePlaced', playerId: 'p1', targetId: 'p2', fromId: null },
        ]);
    });

    it('R-CURSE-1: the slayer can’t curse themself', () => {
        const state = slayMummy(newGame());
        expectRejected(state, curse('p1', 'p1'), 'bad-target');
        expectRejected(state, curse('p1', 'nobody'), 'bad-target');
    });

    it('C-23: with no curse in play, someone must be cursed', () => {
        const state = slayMummy(newGame());
        expectRejected(state, curse('p1', null), 'curse-required');
    });

    it('R-CURSE-1: once in play, the curse can stay where it is', () => {
        const start = newGame(['warlock', 'thief', 'wizard']);
        player(start, 1).cursed = true;
        const state = slayMummy(start);
        const { state: after, events } = run(state, curse('p1', null));
        expect(player(after, 1).cursed).toBe(true);
        expect(eventTypes(events)).toEqual(['curseKept']);
    });

    it('R-CURSE-1: or move to a different player; there is only one curse', () => {
        const start = newGame(['warlock', 'thief', 'wizard']);
        player(start, 1).cursed = true;
        const state = slayMummy(start);
        const { state: after, events } = run(state, curse('p1', 'p3'));
        expect(after.players.map((p) => p.cursed)).toEqual([false, false, true]);
        expect(events[0]).toMatchObject({ type: 'cursePlaced', fromId: 'p2', targetId: 'p3' });
    });

    it('a cursed slayer can pass the curse on', () => {
        const start = newGame();
        player(start).cursed = true;
        const state = slayMummy(start);
        const { state: after } = run(state, curse('p1', 'p2'));
        expect(after.players.map((p) => p.cursed)).toEqual([false, true]);
    });

    it('with full spell slots, the loot choice comes first, then the curse', () => {
        const start = newGame();
        player(start).spells = ['healingPortal', 'healingPortal', 'healingPortal'];
        const state = slayMummy(start);
        expect(state.turn.phase).toMatchObject({
            type: 'choosingLootDrop',
            loot: 'magicBolt',
            monster: 'mummy',
        });
        const { state: after } = run(state, {
            type: 'chooseLootDrop',
            playerId: 'p1',
            drop: 'healingPortal',
        });
        expect(after.turn.phase).toEqual({ type: 'choosingCurseTarget', after: 'endTurn' });
    });

    it('R-CURSE-3: healing at a fountain lifts it (see also Portal of Healing)', () => {
        const state = newGame();
        player(state).cursed = true;
        const { state: after } = run(state, {
            type: 'endTurn',
            playerId: 'p1',
            action: { type: 'heal' },
        });
        expect(player(after, 0).cursed).toBe(false);
    });

    it('other monsters don’t curse anyone', () => {
        const inCombat = enterFight(newGame(), 'spider', 6, 6);
        const { state } = run(
            inCombat,
            { type: 'rollDice', playerId: 'p1' },
            { type: 'resolveCombat', playerId: 'p1' },
        );
        expect(state.turn.phase).toEqual({ type: 'turnEnding' });
    });
});
