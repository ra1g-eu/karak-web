import type { HeroId } from '../types';

export interface HeroDef {
    id: HeroId;
    name: string;
    title: string;
}

/** §12. Skills arrive in Phase 3. */
export const HEROES: Readonly<Record<HeroId, HeroDef>> = {
    warrior: { id: 'warrior', name: 'Horan', title: 'the Warrior' },
    thief: { id: 'thief', name: 'Aderyn', title: 'the Thief' },
    wizard: { id: 'wizard', name: 'Argentus', title: 'the Wizard' },
    warlock: { id: 'warlock', name: 'Lord Xanros', title: 'the Warlock' },
    swordsman: { id: 'swordsman', name: 'Victorius', title: 'the Swordsman' },
    oracle: { id: 'oracle', name: 'Taia', title: 'the Oracle' },
};

export const HERO_IDS = Object.keys(HEROES) as HeroId[];
