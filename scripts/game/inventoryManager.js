import {updatePlayerInfo} from "../ui/renderer.js";

/**
 * InventoryItem class
 * Represents an item in the player's inventory
 * @returns {InventoryItem}
 */
class InventoryItem {
    /**
     * InventoryItem constructor
     * @param {string} id
     * @param {string} name
     * @param {string} type
     * @param {string} description
     * @param {number|null} damage
     * @param {number|null} manaCost
     */
    constructor(id = '', name = '', type = '', description = '', damage = null, manaCost = null) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.damage = damage;
        this.manaCost = manaCost;
    }
}

export const emptySlot = new InventoryItem(
    'empty',
    'Empty Slot',
    'empty',
    'An empty inventory slot.'
);

export const sword = new InventoryItem(
    'sword001',
    'Iron Sword',
    'weapon',
    'A sturdy iron sword.',
    10,
);

export const fireball = new InventoryItem(
    'spell001',
    'Fireball',
    'spell',
    'A fiery projectile that burns enemies.',
    25,
    5
);

export const goldenKey = new InventoryItem(
    'key001',
    'Golden Key',
    'key',
    'Opens the treasure chest in the dungeon.'
);

export const rubyGem = new InventoryItem(
    'treasure001',
    'Ruby Gem',
    'treasure',
    'A precious red gemstone.'
);

/**
 * Item database
 * @type {{weapons: InventoryItem[], spells: InventoryItem[], keys: InventoryItem[], treasures: InventoryItem[]}}
 */
export const itemDB = {
    weapons: [
        sword
    ],
    spells: [
        fireball
    ],
    keys: [
        goldenKey
    ],
    treasures: [
        rubyGem
    ]
};

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
 * @param {Object|null} forceItem
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
                alert('No empty weapon slots available!');
            }
            break;

        case 'spell':
            // Find first empty spell slot
            const spellIndex = player.inventory.spells.findIndex(s => s.id === 'empty');
            if (spellIndex !== -1) {
                player.inventory.spells[spellIndex] = randomItem;
                wasItemAdded = true;
            } else {
                alert('No empty spell slots available!');
            }
            break;

        case 'key':
            if (player.inventory.key.id === 'empty') {
                player.inventory.key = randomItem;
                wasItemAdded = true;
            } else {
                alert('Key slot is already occupied!');
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