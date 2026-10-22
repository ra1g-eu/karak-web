import { isSpell, isWeapon, SLOT_CAPACITY, slotOf } from '../data/items';
import type { ItemId, Player } from '../types';

/** R-INV-1: items only fit their own slot type. */
export function hasRoomFor(player: Player, item: ItemId): boolean {
    switch (slotOf(item)) {
        case 'weapon':
            return player.weapons.length < SLOT_CAPACITY.weapon;
        case 'spell':
            return player.spells.length < SLOT_CAPACITY.spell;
        case 'key':
            return !player.hasKey;
    }
}

export function carries(player: Player, item: ItemId): boolean {
    if (item === 'key') return player.hasKey;
    if (isWeapon(item)) return player.weapons.includes(item);
    if (isSpell(item)) return player.spells.includes(item);
    return false;
}

/** Adds an item; the caller has checked hasRoomFor. */
export function addItem(player: Player, item: ItemId): void {
    if (!hasRoomFor(player, item)) throw new Error(`No room for ${item}`);
    if (item === 'key') player.hasKey = true;
    else if (isWeapon(item)) player.weapons.push(item);
    else if (isSpell(item)) player.spells.push(item);
}

/** Removes one copy of an item; the caller has checked carries. */
export function removeItem(player: Player, item: ItemId): void {
    if (!carries(player, item)) throw new Error(`Not carrying ${item}`);
    if (item === 'key') {
        player.hasKey = false;
    } else if (isWeapon(item)) {
        player.weapons.splice(player.weapons.indexOf(item), 1);
    } else if (isSpell(item)) {
        player.spells.splice(player.spells.indexOf(item), 1);
    }
}
