/**
 * Seeded PRNG (mulberry32). Its whole state is one uint32 stored in GameState.rng, so a game
 * replays identically from the same seed and commands, and a server can keep the seed secret.
 */

export interface RngHolder {
    rng: number;
}

/** Normalises any number into a valid uint32 seed. */
export function seedToRng(seed: number): number {
    return Math.trunc(seed) >>> 0;
}

/** Advances the holder's RNG and returns a uint32. */
export function nextUint32(holder: RngHolder): number {
    let t = (holder.rng = (holder.rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
}

/** Uniform integer in [0, n). */
export function randomInt(holder: RngHolder, n: number): number {
    return Math.floor((nextUint32(holder) / 0x1_0000_0000) * n);
}

export function rollD6(holder: RngHolder): number {
    return randomInt(holder, 6) + 1;
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(holder: RngHolder, items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = randomInt(holder, i + 1);
        [items[i], items[j]] = [items[j] as T, items[i] as T];
    }
    return items;
}
