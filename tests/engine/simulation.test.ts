import { describe, expect, it } from 'vitest';
import { legalCommands } from '../../src/engine';
import { checkInvariants, simulate } from './simulation';

describe('headless simulation', () => {
    // Seeds picked because they finish quickly. Hero line-ups rotate with the seed; together
    // these cover all six heroes and 2–5 players.
    it.each([
        [5, 3], // oracle, warrior, thief
        [13, 3], // thief, wizard, warlock
        [19, 5], // thief, wizard, warlock, swordsman, oracle
        [20, 2], // wizard, warlock
        [22, 4], // swordsman, oracle, warrior, thief
        [28, 2], // swordsman, oracle
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

    it('fuzzes many more seeds for a couple of hundred commands each', () => {
        for (let seed = 100; seed < 130; seed++) {
            simulate(seed, 2 + (seed % 4), 200, checkInvariants);
        }
    }, 60_000);

    it('replays identically from the same seed', () => {
        const a = simulate(20, 2, 6000, () => {});
        const b = simulate(20, 2, 6000, () => {});
        expect(a.state).toEqual(b.state);
        expect(a.steps).toBe(b.steps);
    }, 30_000);
});
