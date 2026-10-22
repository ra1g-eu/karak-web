import { describe, expect, it } from 'vitest';
import type { Command, TileAction } from '../../src/engine';
import {
    eventTypes,
    expectRejected,
    newGame,
    pid,
    player,
    putTiles,
    resetTurn,
    rigDice,
    run,
} from './helpers';

const endTurn = (playerId: string, action?: TileAction): Command =>
    action ? { type: 'endTurn', playerId, action } : { type: 'endTurn', playerId };

/** p1 standing on a corridor tile north of the start, with `items` and/or a chest there. */
function standingOn(extra: {
    items?: ('sword' | 'daggers' | 'key' | 'magicBolt')[];
    chest?: boolean;
}) {
    const state = newGame();
    putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', ...extra });
    player(state).position = { x: 0, y: -1 };
    resetTurn(state, 0);
    return state;
}

describe('healing (R-HEAL-*)', () => {
    it('R-HEAL-2: ending the turn on a fountain heals to full and lifts the curse', () => {
        const state = newGame();
        Object.assign(player(state), { hp: 2, cursed: true });
        const { state: after, events } = run(state, endTurn(pid(state), { type: 'heal' }));
        expect(player(after, 0)).toMatchObject({ hp: 5, cursed: false });
        expect(events[0]).toEqual({ type: 'heroHealed', playerId: 'p1', hp: 5, curseLifted: true });
        expect(after.currentPlayerIndex).toBe(1);
    });

    it('R-HEAL-1: healing needs a fountain', () => {
        const state = standingOn({});
        expectRejected(state, endTurn(pid(state), { type: 'heal' }), 'no-fountain');
    });

    it('C-13: healing is optional; a plain end of turn leaves wounds alone', () => {
        const state = newGame();
        player(state).hp = 2;
        const { state: after } = run(state, endTurn(pid(state)));
        expect(player(after, 0).hp).toBe(2);
    });

    it('R-HEAL-3 / C-13: losing next to the start retreats onto its fountain, where the hero may heal', () => {
        const state = newGame();
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', monster: 'rat' });
        const id = pid(state);
        const { state: inCombat } = run(state, { type: 'move', playerId: id, dir: 'N' });
        rigDice(inCombat, 1, 1);
        const { state: lost } = run(
            inCombat,
            { type: 'rollDice', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(player(lost).hp).toBe(4);
        const { state: after } = run(lost, endTurn(id, { type: 'heal' }));
        expect(player(after, 0).hp).toBe(5);
    });

    it('healing at a fountain also wakes an unconscious hero', () => {
        const state = newGame();
        Object.assign(player(state), { hp: 0, unconscious: true });
        state.turn.phase = { type: 'turnEnding' };
        const { state: after } = run(state, endTurn(pid(state), { type: 'heal' }));
        expect(player(after, 0)).toMatchObject({ hp: 5, unconscious: false });
    });
});

describe('chests (R-KEY-*)', () => {
    it('R-KEY-2: a key opens a chest on the tile; the key is discarded and the turn ends', () => {
        const state = standingOn({ chest: true });
        player(state).hasKey = true;
        const { state: after, events } = run(state, endTurn(pid(state), { type: 'openChest' }));
        expect(player(after, 0)).toMatchObject({ hasKey: false, treasures: ['chest'] });
        expect(after.board['0,-1']?.chest).toBe(false);
        expect(eventTypes(events)).toEqual([
            'chestOpened',
            'treasureTaken',
            'turnEnded',
            'turnStarted',
        ]);
    });

    it('R-KEY-2: no key, no chest', () => {
        const state = standingOn({ chest: true });
        expectRejected(state, endTurn(pid(state), { type: 'openChest' }), 'no-key');
        const empty = standingOn({});
        player(empty).hasKey = true;
        expectRejected(empty, endTurn(pid(empty), { type: 'openChest' }), 'no-chest');
    });

    it('C-03: treasures take no slots, so there is always room for more', () => {
        const state = standingOn({ chest: true });
        Object.assign(player(state), { hasKey: true, treasures: Array(12).fill('chest') });
        const { state: after } = run(state, endTurn(pid(state), { type: 'openChest' }));
        expect(player(after, 0).treasures).toHaveLength(13);
    });

    it('R-END-2: the hero can stop early on a chest to open it', () => {
        const state = newGame();
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', chest: true });
        player(state).hasKey = true;
        const id = pid(state);
        const { state: after } = run(
            state,
            { type: 'move', playerId: id, dir: 'N' },
            endTurn(id, { type: 'openChest' }),
        );
        expect(player(after, 0).treasures).toEqual(['chest']);
    });
});

describe('picking up equipment (R-INV-*)', () => {
    it('R-INV-3: picking up an item ends the turn', () => {
        const state = standingOn({ items: ['sword'] });
        const { state: after, events } = run(
            state,
            endTurn(pid(state), { type: 'pickUp', item: 'sword' }),
        );
        expect(player(after, 0).weapons).toEqual(['sword']);
        expect(after.board['0,-1']?.items).toEqual([]);
        expect(after.currentPlayerIndex).toBe(1);
        expect(eventTypes(events)[0]).toBe('itemPickedUp');
    });

    it('R-INV-2: a full slot needs an item of the same slot left behind', () => {
        const state = standingOn({ items: ['sword'] });
        player(state).weapons = ['daggers', 'daggers'];
        player(state).spells = ['magicBolt'];
        const id = pid(state);
        expectRejected(state, endTurn(id, { type: 'pickUp', item: 'sword' }), 'slot-full');
        expectRejected(
            state,
            endTurn(id, { type: 'pickUp', item: 'sword', drop: 'magicBolt' }),
            'bad-drop',
        );
        const { state: after } = run(
            state,
            endTurn(id, { type: 'pickUp', item: 'sword', drop: 'daggers' }),
        );
        expect(player(after, 0).weapons).toEqual(['daggers', 'sword']);
        expect(after.board['0,-1']?.items).toEqual(['daggers']);
    });

    it('R-INV-2: nothing is dropped when there is room', () => {
        const state = standingOn({ items: ['sword'] });
        player(state).weapons = ['daggers'];
        expectRejected(
            state,
            endTurn(pid(state), { type: 'pickUp', item: 'sword', drop: 'daggers' }),
            'bad-drop',
        );
    });

    it('R-INV-1: keys go in the single key slot', () => {
        const state = standingOn({ items: ['key'] });
        player(state).hasKey = true;
        expectRejected(state, endTurn(pid(state), { type: 'pickUp', item: 'key' }), 'slot-full');
    });

    it('only items lying on the tile can be picked up', () => {
        const state = standingOn({ items: ['sword'] });
        expectRejected(state, endTurn(pid(state), { type: 'pickUp', item: 'daggers' }), 'no-item');
    });

    it('C-09: several items can lie on one tile; picking one leaves the rest', () => {
        const state = standingOn({ items: ['sword', 'daggers', 'magicBolt'] });
        const { state: after } = run(
            state,
            endTurn(pid(state), { type: 'pickUp', item: 'daggers' }),
        );
        expect(after.board['0,-1']?.items).toEqual(['sword', 'magicBolt']);
    });
});
