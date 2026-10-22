import type { ItemId, MonsterId, TreasureId } from '../types';

export type Loot = { type: 'item'; item: ItemId } | { type: 'treasure'; treasure: TreasureId };

export interface MonsterDef {
    id: MonsterId;
    name: string;
    strength: number;
    /** Tokens of this monster in the bag. */
    count: number;
    loot: Loot;
}

/**
 * §2.1. Counts and loot are from the rulebook. ⚠ Strengths other than the Skeleton King's (10)
 * are unverified (Q-02).
 */
export const MONSTERS: Readonly<Record<MonsterId, MonsterDef>> = {
    rat: {
        id: 'rat',
        name: 'Giant Rat',
        strength: 5,
        count: 8,
        loot: { type: 'item', item: 'daggers' },
    },
    spider: {
        id: 'spider',
        name: 'Giant Spider',
        strength: 6,
        count: 4,
        loot: { type: 'item', item: 'healingPortal' },
    },
    turnkey: {
        id: 'turnkey',
        name: 'Skeleton Turnkey',
        strength: 7,
        count: 12,
        loot: { type: 'item', item: 'key' },
    },
    // Phase 3 adds the curse that a Mummy's slayer places (R-CURSE-1).
    mummy: {
        id: 'mummy',
        name: 'Mummy',
        strength: 7,
        count: 8,
        loot: { type: 'item', item: 'magicBolt' },
    },
    skeletonWarrior: {
        id: 'skeletonWarrior',
        name: 'Skeleton Warrior',
        strength: 8,
        count: 5,
        loot: { type: 'item', item: 'sword' },
    },
    skeletonKing: {
        id: 'skeletonKing',
        name: 'Skeleton King',
        strength: 10,
        count: 3,
        loot: { type: 'item', item: 'axe' },
    },
    fallen: {
        id: 'fallen',
        name: 'The Fallen',
        strength: 12,
        count: 2,
        loot: { type: 'treasure', treasure: 'fallen' },
    },
    dragon: {
        id: 'dragon',
        name: 'Dragon',
        strength: 15,
        count: 1,
        loot: { type: 'treasure', treasure: 'ruby' },
    },
};

/** Locked treasure chests in the bag. */
export const CHEST_COUNT = 10;
