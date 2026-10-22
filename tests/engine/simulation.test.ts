import { describe, expect, it } from 'vitest';
import { legalCommands } from '../../src/engine';
import { checkInvariants, simulate } from './simulation';

describe('headless simulation', () => {
    // Seeds picked because they finish quickly; together they cover 2–5 players.
    it.each([
        [1, 3],
        [4, 2],
        [8, 2],
        [10, 4],
        [3, 5],
    ])(
        'seed %i with %i bots plays to the dragon without breaking a rule',
        (seed, players) => {
            const { finished, state } = simulate(seed, players, 6000, checkInvariants);
            expect(finished).toBe(true);
            expect(state.result?.winnerIds.length).toBeGreaterThan(0);
            // R-WIN-1: whoever is active when the game ends killed the dragon and holds the ruby.
            const slayer = state.players[state.currentPlayerIndex];
            expect(slayer?.treasures).toContain('ruby');
            expect(legalCommands(state)).toEqual([]);
        },
        30_000,
    );

    it('fuzzes many more seeds for a few hundred commands each', () => {
        for (let seed = 100; seed < 140; seed++) {
            simulate(seed, 2 + (seed % 4), 300, checkInvariants);
        }
    }, 30_000);

    it('replays identically from the same seed', () => {
        const a = simulate(4, 2, 6000, () => {});
        const b = simulate(4, 2, 6000, () => {});
        expect(a.state).toEqual(b.state);
        expect(a.steps).toBe(b.steps);
    }, 30_000);
});
