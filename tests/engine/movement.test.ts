import { describe, expect, it } from 'vitest';
import { applyCommand, type Command } from '../../src/engine';
import {
    eventTypes,
    expectRejected,
    newGame,
    pid,
    player,
    putTiles,
    resetTurn,
    run,
} from './helpers';

const north = (playerId: string): Command => ({ type: 'move', playerId, dir: 'N' });

/** Start tile plus a straight N–S corridor running north for `length` tiles. */
function corridorNorth(length: number) {
    const state = newGame();
    for (let i = 1; i <= length; i++) {
        putTiles(state, { at: { x: 0, y: -i }, typeId: 'tunnel-straight' });
    }
    return state;
}

describe('moving over discovered tiles (§6)', () => {
    it('R-MOVE-1: moves between tiles whose facing sides are both open', () => {
        const state = corridorNorth(1);
        const { state: after, events } = run(state, north(pid(state)));
        expect(player(after).position).toEqual({ x: 0, y: -1 });
        expect(eventTypes(events)).toEqual(['heroMoved']);
    });

    it('R-MOVE-1: a wall on the far side blocks the move', () => {
        const state = newGame();
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight', rotation: 1 }); // E–W
        expectRejected(state, north(pid(state)), 'wall');
    });

    it('R-MOVE-1: a wall on the near side blocks the move', () => {
        const state = newGame();
        putTiles(
            state,
            { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' },
            { at: { x: 0, y: -2 }, typeId: 'tunnel-straight' },
        );
        // Turn the hero's own tile into an E–W corridor.
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight', rotation: 1 });
        player(state).position = { x: 0, y: -1 };
        resetTurn(state, 0);
        expectRejected(state, north(pid(state)), 'wall');
    });

    it('R-TURN-1 / R-MOVE-2: four moves per turn, then no more', () => {
        const state = corridorNorth(5);
        const id = pid(state);
        const { state: after } = run(state, north(id), north(id), north(id), north(id));
        expect(after.turn.movesLeft).toBe(0);
        expect(player(after).position).toEqual({ x: 0, y: -4 });
        expectRejected(after, north(id), 'no-moves');
    });

    it('R-TURN-1: moving back and forth still costs a move each time', () => {
        const state = corridorNorth(1);
        const id = pid(state);
        const { state: after } = run(
            state,
            north(id),
            { type: 'move', playerId: id, dir: 'S' },
            north(id),
        );
        expect(after.turn.movesLeft).toBe(1);
        expect(after.turn.path).toEqual([
            { x: 0, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 0 },
            { x: 0, y: -1 },
        ]);
    });

    it('R-TURN-2: a player may end the turn early', () => {
        const state = corridorNorth(1);
        const { state: after, events } = run(state, north(pid(state)), {
            type: 'endTurn',
            playerId: pid(state),
        });
        expect(after.currentPlayerIndex).toBe(1);
        expect(after.turn.movesLeft).toBe(4);
        expect(eventTypes(events)).toEqual(['heroMoved', 'turnEnded', 'turnStarted']);
    });

    it('R-MOVE-4 / C-07: heroes share tiles and move through each other', () => {
        const state = corridorNorth(2);
        player(state, 1).position = { x: 0, y: -1 };
        const id = pid(state);
        const { state: after } = run(state, north(id), north(id));
        expect(player(after).position).toEqual({ x: 0, y: -2 });
    });

    it('only the active player may act', () => {
        const state = corridorNorth(1);
        const result = applyCommand(state, north(player(state, 1).id));
        expect(result).toMatchObject({ ok: false, code: 'not-your-turn' });
    });

    it('never changes the state it was given', () => {
        const state = corridorNorth(1);
        const before = JSON.stringify(state);
        run(state, north(pid(state)));
        expect(JSON.stringify(state)).toBe(before);
    });

    it('rounds advance when play returns to the starting player', () => {
        const state = newGame(['warrior', 'thief', 'wizard']);
        let s = state;
        for (let i = 0; i < 3; i++) s = run(s, { type: 'endTurn', playerId: pid(s) }).state;
        expect(s.currentPlayerIndex).toBe(0);
        expect(s.round).toBe(2);
    });
});
