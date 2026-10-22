import {updatePlayerInfo} from "../ui/renderer.js";
import {showInfoModal} from "../ui/customModals.js";
import {itemDB, emptySlot} from "./items.js";

/**
 * Item types
 * @type {{weapon: {icon: string, bgClass: string, name: string}, spell: {icon: string, bgClass: string, name: string}, key: {icon: string, bgClass: string, name: string}, treasure: {icon: string, bgClass: string, name: string}, empty: {icon: string, bgClass: string, name: string}}}
 */
export const itemTypes = {
    weapon: {
        icon: 'fa-khanda',
        bgClass: 'weapon-bg',
        name: 'Weapon'
    },
    spell: {
        icon: 'fa-wand-magic-sparkles',
        bgClass: 'spell-bg',
        name: 'Spell'
    },
    key: {
        icon: 'fa-key',
        bgClass: 'key-bg',
        name: 'Key'
    },
    treasure: {
        icon: 'fa-gem',
        bgClass: 'treasure-bg',
        name: 'Treasure'
    },
    empty: {
        icon: 'fa-box-open',
        bgClass: 'empty-slot',
        name: 'Empty'
    }
};

/**
 * @param {string} type
 * @param {Object} player
 * @param {InventoryItem|null} forceItem
 * @returns {{wasItemAdded: boolean, randomItem: {Object}}}
 */
export function addItemToInventory(type, player, forceItem = null) {
    const items = itemDB[type + 's'];
    const randomItem = forceItem ?? items[Math.floor(Math.random() * items.length)];

    let wasItemAdded = false;

    switch (type) {
        case 'weapon':
            // Find first empty weapon slot
            const weaponIndex = player.inventory.weapons.findIndex(w => w.id === 'empty');
            if (weaponIndex !== -1) {
                player.inventory.weapons[weaponIndex] = randomItem;
                wasItemAdded = true;
            } else {
                showInfoModal('Inventory Full', 'No empty weapon slots available!');
            }
            break;

        case 'spell':
            // Find first empty spell slot
            const spellIndex = player.inventory.spells.findIndex(s => s.id === 'empty');
            if (spellIndex !== -1) {
                player.inventory.spells[spellIndex] = randomItem;
                wasItemAdded = true;
            } else {
                showInfoModal('Inventory Full', 'No empty spell slots available!');
            }
            break;

        case 'key':
            if (player.inventory.key.id === 'empty') {
                player.inventory.key = randomItem;
                wasItemAdded = true;
            } else {
                showInfoModal('Inventory Full', 'Key slot is already occupied!');
            }
            break;

        case 'treasure':
            player.inventory.treasures.push(randomItem);
            wasItemAdded = true;
            break;
    }

    return {wasItemAdded, randomItem};
}

export function resetInventory(player) {
    player.inventory = {
        weapons: [emptySlot, emptySlot],
        spells: [emptySlot, emptySlot, emptySlot],
        key: emptySlot,
        treasures: []
    };
}

export function hasSpaceInInventoryForItem(player, itemType) {
    switch (itemType) {
        case 'weapon':
            return player.inventory.weapons.findIndex(w => w.id === 'empty') !== -1;
        case 'spell':
            return player.inventory.spells.findIndex(s => s.id === 'empty') !== -1;
        case 'key':
            return player.inventory.key.id === 'empty';
        case 'treasure':
            return true;
    }
}

export function hasItemInInventory(player, itemType, itemId) {
    switch (itemType) {
        case 'weapon':
            return player.inventory.weapons.some(w => w && w.id === itemId);
        case 'spell':
            return player.inventory.spells.some(s => s && s.id === itemId);
        case 'key':
            return player.inventory.key && player.inventory.key.id === itemId;
        case 'treasure':
            return player.inventory.treasures.some(t => t && t.id === itemId);
    }
}

export function removeItemFromInventory(player, itemType, itemId) {
    switch (itemType) {
        case 'weapon':
            for (let i = 0; i < player.inventory.weapons.length; i++) {
                if (player.inventory.weapons[i] && player.inventory.weapons[i].id === itemId) {
                    player.inventory.weapons[i] = emptySlot;
                }
            }
            break;

        case 'spell':
            for (let i = 0; i < player.inventory.spells.length; i++) {
                if (player.inventory.spells[i] && player.inventory.spells[i].id === itemId) {
                    player.inventory.spells[i] = emptySlot;
                }
            }
            break;

        case 'key':
            if (player.inventory.key.id === itemId) {
                player.inventory.key = emptySlot;
            }
            break;

        case 'treasure':
            for (let i = 0; i < player.inventory.treasures.length; i++) {
                if (player.inventory.treasures[i] && player.inventory.treasures[i].id === itemId) {
                    player.inventory.treasures.splice(i, 1);
                }
            }
            break;
    }
    updatePlayerInfo(player);
}