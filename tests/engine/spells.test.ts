import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/engine';
import {
    enterFight,
    expectRejected,
    gameAs,
    newGame,
    pid,
    player,
    putTiles,
    resetTurn,
    run,
} from './helpers';

const portal = (playerId: string, targetId: string, x = 0, y = 0): Command => ({
    type: 'castPortal',
    playerId,
    targetId,
    to: { x, y },
});

/** p1 two tiles from the start fountain, carrying a Portal of Healing. */
function caster(hero: Parameters<typeof gameAs>[0] = 'warlock') {
    const state = gameAs(hero);
    putTiles(
        state,
        { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' },
        { at: { x: 0, y: -2 }, typeId: 'tunnel-straight' },
    );
    player(state).position = { x: 0, y: -2 };
    player(state).spells = ['healingPortal'];
    resetTurn(state, 0);
    return state;
}

describe('Portal of Healing (R-PORTAL-*)', () => {
    it('R-PORTAL-1: the caster can send themself to a fountain, fully healed and uncursed', () => {
        const state = caster();
        Object.assign(player(state), { hp: 2, cursed: true });
        const { state: after, events } = run(state, portal(pid(state), pid(state)));
        expect(player(after)).toMatchObject({
            position: { x: 0, y: 0 },
            hp: 5,
            cursed: false,
            spells: [],
        });
        expect(events).toEqual([
            {
                type: 'portalCast',
                playerId: 'p1',
                targetId: 'p1',
                from: { x: 0, y: -2 },
                to: { x: 0, y: 0 },
                hp: 5,
                curseLifted: true,
            },
        ]);
    });

    it('R-PORTAL-2: costs no move and doesn’t end the turn', () => {
        const state = caster();
        const { state: after } = run(state, portal(pid(state), pid(state)));
        expect(after.turn.movesLeft).toBe(4);
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(after.currentPlayerIndex).toBe(0);
    });

    it('R-PORTAL-1: can target any other hero', () => {
        const state = caster();
        Object.assign(player(state, 1), { position: { x: 0, y: -1 }, hp: 1, cursed: true });
        const { state: after } = run(state, portal(pid(state), 'p2'));
        expect(player(after, 1)).toMatchObject({ position: { x: 0, y: 0 }, hp: 5, cursed: false });
        expect(player(after, 0).position).toEqual({ x: 0, y: -2 });
    });

    it('heals an unconscious hero awake', () => {
        const state = caster();
        Object.assign(player(state, 1), { hp: 0, unconscious: true });
        const { state: after } = run(state, portal(pid(state), 'p2'));
        expect(player(after, 1)).toMatchObject({ hp: 5, unconscious: false });
    });

    it('R-PORTAL-1: the destination must be a revealed fountain', () => {
        const state = caster();
        expectRejected(state, portal(pid(state), pid(state), 0, -1), 'no-fountain');
        expectRejected(state, portal(pid(state), pid(state), 9, 9), 'no-fountain');
    });

    it('needs a Portal of Healing, which is then gone (R-SPELL-1)', () => {
        const state = newGame();
        expectRejected(state, portal(pid(state), pid(state)), 'no-portal');
    });

    it('Magical Affinity doesn’t cover the portal: the Wizard loses it too', () => {
        const state = caster('wizard');
        const { state: after } = run(state, portal(pid(state), pid(state)));
        expect(player(after).spells).toEqual([]);
    });

    it('C-16: can be cast after a fight, before the turn ends', () => {
        const start = newGame();
        player(start).spells = ['healingPortal'];
        const state = enterFight(start, 'skeletonKing', 1, 1);
        const id = pid(state);
        const { state: lost } = run(
            state,
            { type: 'rollDice', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(lost.turn.phase).toEqual({ type: 'turnEnding' });
        expect(player(lost).hp).toBe(4);
        const { state: after } = run(lost, portal(id, id));
        expect(player(after).hp).toBe(5);
        expect(after.turn.phase).toEqual({ type: 'turnEnding' });
    });

    it('C-16: can’t be cast mid-fight', () => {
        const state = newGame();
        player(state).spells = ['healingPortal'];
        const inCombat = enterFight(state, 'rat');
        expectRejected(inCombat, portal(pid(inCombat), pid(inCombat)), 'wrong-phase');
    });
});
