import type { HeroId, ItemId, MonsterId, TreasureId } from '../engine';

const IMG = `${import.meta.env.BASE_URL}images/`;

/**
 * Tile art and how far the art is already turned relative to the engine's unrotated shape
 * (SHAPE_OPENINGS): the corner art opens S+W (engine N+E turned twice), the T art opens N+S+W
 * (engine E+S+W turned once). Kind/shape combos without art are drawn as SVG (see tileSvg).
 */
const TILE_ART: Record<string, { file: string; offset: number }> = {
    start: { file: 'c_four_way_corridor_hp_restore', offset: 0 },
    'tunnel-straight': { file: 'c_one_way_corridor', offset: 0 },
    'tunnel-corner': { file: 'c_l_corridor', offset: 2 },
    'tunnel-tee': { file: 'c_t_corridor', offset: 1 },
    'tunnel-cross': { file: 'c_four_way_corridor', offset: 0 },
    'room-straight': { file: 'c_one_way_room', offset: 0 },
    'room-corner': { file: 'c_l_room', offset: 2 },
    'room-tee': { file: 'c_t_room', offset: 1 },
    'room-cross': { file: 'c_four_way_room', offset: 0 },
    'gate-straight': { file: 'c_one_way_corridor_teleport', offset: 0 },
    'gate-corner': { file: 'c_l_corridor_portal', offset: 2 },
    'fountain-corner': { file: 'c_l_corridor_hp_restore', offset: 2 },
    'fountain-cross': { file: 'c_four_way_corridor_hp_restore', offset: 0 },
};

export function tileArt(typeId: string): { src: string; offset: number } | null {
    const art = TILE_ART[typeId];
    return art ? { src: `${IMG}tiles/${art.file}.png`, offset: art.offset } : null;
}

/** Placeholder art (OVERVIEW §8); the card's printed number is covered by the real strength. */
const MONSTER_ART: Record<MonsterId, string> = {
    rat: 'monster_squirrel_with_knife',
    spider: 'monster_scorpio',
    turnkey: 'monster_wolf_with_key',
    mummy: 'monster_cursed_wolf',
    skeletonWarrior: 'monster_shield_skeleton',
    skeletonKing: 'monster_yeti_with_sledgehammer',
    fallen: 'monster_archer_ghag',
    dragon: 'monster_blue_bird',
};

export const monsterArt = (id: MonsterId) => `${IMG}monsters/${MONSTER_ART[id]}.png`;

const HERO_ART: Record<HeroId, string> = {
    warrior: 'class_knight',
    thief: 'class_ninja',
    wizard: 'class_elf_mage',
    warlock: 'class_mage',
    swordsman: 'class_arab',
    oracle: 'class_fox_police',
};

export const heroArt = (id: HeroId) => `${IMG}classes/${HERO_ART[id]}.png`;

const ITEM_ART: Record<ItemId, string> = {
    daggers: 'item_daggers',
    sword: 'item_sword',
    axe: 'item_axe',
    magicBolt: 'item_spell_magic_shot',
    healingPortal: 'item_spell_healing_portal',
    key: 'item_treasure_key',
};

export const itemArt = (id: ItemId) => `${IMG}items/${ITEM_ART[id]}.png`;

const TREASURE_ART: Record<TreasureId, string> = {
    chest: 'item_treasure_chest_open',
    fallen: 'item_golden_scarab',
    ruby: 'item_gem_chest_open',
};

export const treasureArt = (id: TreasureId) => `${IMG}items/${TREASURE_ART[id]}.png`;
export const chestArt = `${IMG}items/item_treasure_chest_closed.png`;
export const boardBackground = `${IMG}background/grass-2.png`;

/** Seat colours, so heroes are easy to tell apart on the board. */
export const SEAT_COLOURS = ['#f59e0b', '#38bdf8', '#a3e635', '#f472b6', '#c084fc'];
