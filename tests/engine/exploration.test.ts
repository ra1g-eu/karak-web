import { describe, expect, it } from 'vitest';
import { applyCommand, type Command, openingsOf } from '../../src/engine';
import {
    eventTypes,
    expectRejected,
    newGame,
    pid,
    player,
    putTiles,
    resetTurn,
    run,
    stackBag,
    stackPile,
} from './helpers';

const move = (playerId: string, dir: 'N' | 'E' | 'S' | 'W'): Command => ({
    type: 'move',
    playerId,
    dir,
});

describe('exploring (§5)', () => {
    it('R-EXPLORE-1: stepping into empty space draws the top tile', () => {
        const state = newGame();
        stackPile(state, 'tunnel-corner');
        const { state: after, events } = run(state, move(pid(state), 'N'));
        expect(after.turn.phase).toMatchObject({
            type: 'placingTile',
            typeId: 'tunnel-corner',
            at: { x: 0, y: -1 },
        });
        expect(after.tilePile).toHaveLength(state.tilePile.length - 1);
        expect(eventTypes(events)).toEqual(['tileDrawn']);
        // The hero hasn't moved yet and no move is spent until the tile is placed.
        expect(player(after).position).toEqual({ x: 0, y: 0 });
        expect(after.turn.movesLeft).toBe(4);
    });

    it('R-EXPLORE-2: only rotations opening back towards the hero are offered and accepted', () => {
        const state = newGame();
        stackPile(state, 'tunnel-corner'); // opens N,E unrotated
        const { state: drawn } = run(state, move(pid(state), 'N'));
        const phase = drawn.turn.phase;
        if (phase.type !== 'placingTile') throw new Error('expected placingTile');
        // Must open S (back to the start tile).
        expect(phase.validRotations).toEqual([1, 2]);
        for (const r of phase.validRotations) expect(openingsOf('tunnel-corner', r)).toContain('S');
        expectRejected(
            drawn,
            { type: 'placeTile', playerId: pid(state), rotation: 0 },
            'bad-rotation',
        );
    });

    it('R-EXPLORE-1: placing the tile moves the hero onto it for one move', () => {
        const state = newGame();
        stackPile(state, 'tunnel-straight');
        const id = pid(state);
        const { state: after, events } = run(state, move(id, 'N'), {
            type: 'placeTile',
            playerId: id,
            rotation: 0,
        });
        expect(after.board['0,-1']).toMatchObject({ typeId: 'tunnel-straight', rotation: 0 });
        expect(player(after).position).toEqual({ x: 0, y: -1 });
        expect(after.turn.movesLeft).toBe(3);
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(eventTypes(events)).toEqual(['tileDrawn', 'tilePlaced', 'heroMoved']);
    });

    it('R-EXPLORE-3: the new tile need not match its other neighbours', () => {
        const state = newGame();
        // A wall-facing neighbour to the east of the new spot.
        putTiles(state, { at: { x: 1, y: -1 }, typeId: 'tunnel-straight' }); // N–S, closed W
        stackPile(state, 'tunnel-cross');
        const id = pid(state);
        const { state: after } = run(state, move(id, 'N'), {
            type: 'placeTile',
            playerId: id,
            rotation: 0,
        });
        expect(after.board['0,-1']?.typeId).toBe('tunnel-cross');
    });

    it('C-01: cannot explore through a wall of the hero’s own tile', () => {
        const state = newGame();
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' });
        player(state).position = { x: 0, y: -1 };
        resetTurn(state, 0);
        expectRejected(state, move(pid(state), 'E'), 'wall');
    });

    it('C-06: no exploring once the tile pile is empty', () => {
        const state = newGame();
        state.tilePile = [];
        expectRejected(state, move(pid(state), 'N'), 'pile-empty');
    });

    it('cannot do anything else while a drawn tile waits to be placed', () => {
        const state = newGame();
        stackPile(state, 'tunnel-straight');
        const { state: drawn } = run(state, move(pid(state), 'N'));
        expectRejected(drawn, { type: 'endTurn', playerId: pid(state) }, 'wrong-phase');
        expectRejected(drawn, move(pid(state), 'S'), 'wrong-phase');
    });

    it('the fourth move may still explore', () => {
        const state = newGame();
        state.turn.movesLeft = 1;
        stackPile(state, 'tunnel-straight');
        const id = pid(state);
        const { state: after } = run(state, move(id, 'N'), {
            type: 'placeTile',
            playerId: id,
            rotation: 0,
        });
        expect(after.turn.movesLeft).toBe(0);
    });
});

describe('rooms (§5 R-ROOM-*)', () => {
    function exploreRoom(token: Parameters<typeof stackBag>[1]) {
        const state = newGame();
        stackPile(state, 'room-cross');
        stackBag(state, token);
        const id = pid(state);
        return run(state, move(id, 'N'), { type: 'placeTile', playerId: id, rotation: 0 });
    }

    it('R-ROOM-a: a chest is placed on the room and the hero may keep moving', () => {
        const { state, events } = exploreRoom('chest');
        expect(state.board['0,-1']?.chest).toBe(true);
        expect(state.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(state.turn.movesLeft).toBe(3);
        expect(events.at(-1)).toMatchObject({ type: 'tokenDrawn', token: 'chest' });
    });

    it('R-ROOM-b: with a key the hero may open the chest at once, ending the turn', () => {
        const start = newGame();
        player(start).hasKey = true;
        stackPile(start, 'room-cross');
        stackBag(start, 'chest');
        const id = pid(start);
        const { state } = run(
            start,
            move(id, 'N'),
            { type: 'placeTile', playerId: id, rotation: 0 },
            { type: 'endTurn', playerId: id, action: { type: 'openChest' } },
        );
        expect(player(state, 0).treasures).toEqual(['chest']);
        expect(player(state, 0).hasKey).toBe(false);
        expect(state.board['0,-1']?.chest).toBe(false);
        expect(state.currentPlayerIndex).toBe(1);
    });

    it('R-ROOM-c: a monster is placed and combat starts at once', () => {
        const { state, events } = exploreRoom('rat');
        expect(state.board['0,-1']?.monster).toBe('rat');
        expect(state.turn.phase).toMatchObject({ type: 'combat', monster: 'rat', dice: null });
        expect(eventTypes(events).slice(-2)).toEqual(['tokenDrawn', 'combatStarted']);
    });

    it('R-ROOM-ONCE: walking back into a known room draws nothing', () => {
        const { state } = exploreRoom('chest');
        const id = pid(state);
        const bagSize = state.bag.length;
        const { state: after, events } = run(state, move(id, 'S'), move(id, 'N'));
        expect(after.bag).toHaveLength(bagSize);
        expect(eventTypes(events)).toEqual(['heroMoved', 'heroMoved']);
    });

    it('tunnels, gates and fountains never draw from the bag', () => {
        for (const typeId of ['tunnel-cross', 'gate-straight', 'fountain-cross']) {
            const state = newGame();
            stackPile(state, typeId);
            const id = pid(state);
            const { state: after } = run(state, move(id, 'N'), {
                type: 'placeTile',
                playerId: id,
                rotation: 0,
            });
            expect(after.bag).toHaveLength(state.bag.length);
        }
    });

    it('C-06: an empty bag leaves new rooms empty', () => {
        const state = newGame();
        state.bag = [];
        stackPile(state, 'room-cross');
        const id = pid(state);
        const { state: after, events } = run(state, move(id, 'N'), {
            type: 'placeTile',
            playerId: id,
            rotation: 0,
        });
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(events.at(-1)).toMatchObject({ type: 'bagEmpty' });
    });
});

describe('teleportation gates (§5.1)', () => {
    function twoGates() {
        const state = newGame();
        putTiles(
            state,
            { at: { x: 0, y: -1 }, typeId: 'gate-straight' },
            { at: { x: 5, y: 5 }, typeId: 'gate-straight' },
        );
        return state;
    }

    it('R-TG-2: a hero on a gate jumps to another gate for one move', () => {
        const state = twoGates();
        const id = pid(state);
        const { state: after, events } = run(state, move(id, 'N'), {
            type: 'teleport',
            playerId: id,
            to: { x: 5, y: 5 },
        });
        expect(player(after).position).toEqual({ x: 5, y: 5 });
        expect(after.turn.movesLeft).toBe(2);
        expect(events.at(-1)).toMatchObject({ type: 'teleported' });
    });

    it('R-TG-1: a single discovered gate is inactive', () => {
        const state = newGame();
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'gate-straight' });
        const id = pid(state);
        const { state: onGate } = run(state, move(id, 'N'));
        expectRejected(onGate, { type: 'teleport', playerId: id, to: { x: 0, y: -1 } }, 'bad-gate');
    });

    it('R-TG-2: teleporting needs a move left and a gate underfoot', () => {
        const state = twoGates();
        const id = pid(state);
        expectRejected(
            state,
            { type: 'teleport', playerId: id, to: { x: 5, y: 5 } },
            'not-on-gate',
        );
        const { state: onGate } = run(state, move(id, 'N'));
        onGate.turn.movesLeft = 0;
        expectRejected(onGate, { type: 'teleport', playerId: id, to: { x: 5, y: 5 } }, 'no-moves');
    });

    it('cannot teleport onto a non-gate tile', () => {
        const state = twoGates();
        const id = pid(state);
        const { state: onGate } = run(state, move(id, 'N'));
        const result = applyCommand(onGate, { type: 'teleport', playerId: id, to: { x: 0, y: 0 } });
        expect(result).toMatchObject({ ok: false, code: 'bad-gate' });
    });
});
