import { describe, expect, it } from 'vitest';
import { nextUint32, randomInt, rollD6, shuffle } from '../../src/engine/rng';

describe('seeded RNG', () => {
    it('produces the same sequence from the same seed', () => {
        const a = { rng: 42 };
        const b = { rng: 42 };
        const seqA = Array.from({ length: 10 }, () => nextUint32(a));
        const seqB = Array.from({ length: 10 }, () => nextUint32(b));
        expect(seqA).toEqual(seqB);
    });

    it('keeps its whole state in the holder', () => {
        const a = { rng: 7 };
        nextUint32(a);
        const copy = { ...a };
        expect(nextUint32(a)).toBe(nextUint32(copy));
    });

    it('rolls d6 values from 1 to 6, each one at some point', () => {
        const h = { rng: 3 };
        const seen = new Set(Array.from({ length: 500 }, () => rollD6(h)));
        expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('randomInt stays in range', () => {
        const h = { rng: 9 };
        for (let i = 0; i < 1000; i++) {
            const n = randomInt(h, 7);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThan(7);
        }
    });

    it('shuffle returns a permutation', () => {
        const items = Array.from({ length: 20 }, (_, i) => i);
        const shuffled = shuffle({ rng: 5 }, [...items]);
        expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
        expect(shuffled).not.toEqual(items);
    });
});
