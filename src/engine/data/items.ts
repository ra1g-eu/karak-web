import type { ItemId, SpellId, TreasureId, WeaponId } from '../types';

export type Slot = 'weapon' | 'spell' | 'key';

/** R-WEAPON-1 */
export const WEAPON_BONUS: Readonly<Record<WeaponId, number>> = {
    daggers: 1,
    sword: 2,
    axe: 3,
};

/** §9 inventory sheet. Treasures have no limit (C-03). */
export const SLOT_CAPACITY: Readonly<Record<Slot, number>> = {
    weapon: 2,
    spell: 3,
    key: 1,
};

/** R-TREASURE-1 */
export const TREASURE_VP: Readonly<Record<TreasureId, number>> = {
    chest: 1,
    fallen: 1,
    ruby: 1.5,
};

export const ITEM_NAMES: Readonly<Record<ItemId, string>> = {
    daggers: 'Daggers',
    sword: 'Sword',
    axe: 'Axe',
    magicBolt: 'Magic Bolt',
    healingPortal: 'Portal of Healing',
    key: 'Key',
};

export function slotOf(item: ItemId): Slot {
    if (item === 'key') return 'key';
    if (item === 'magicBolt' || item === 'healingPortal') return 'spell';
    return 'weapon';
}

export function isWeapon(item: ItemId): item is WeaponId {
    return slotOf(item) === 'weapon';
}

export function isSpell(item: ItemId): item is SpellId {
    return slotOf(item) === 'spell';
}
