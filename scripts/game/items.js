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
     * @param {string} image
     * @param {number|null} damage
     * @param {number|null} manaCost
     */
    constructor(id = '', name = '', type = '', description = '', image = '', damage = null, manaCost = null) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.description = description;
        this.image = image;
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
    'sword_01',
    'Iron Sword',
    'weapon',
    'A sturdy iron sword.',
    'images/items/item_sword.png',
    10,
);

export const rainfall = new InventoryItem(
    'rainfall_01',
    'Rainfall spell',
    'spell',
    'Ice-cold projectiles that freeze enemies.',
    'images/items/item_spell_rainfall.png',
    25,
    5
);

export const treasureKey = new InventoryItem(
    'treasure_key_01',
    'Treasure Key',
    'key',
    'Opens the treasure chest in the dungeon.',
    'images/items/item_treasure_key.png',
);

export const treasureChest = new InventoryItem(
    'treasure_chest_01',
    'Treasure Chest',
    'treasure',
    'A chest filled with treasure.',
    'images/items/item_treasure_chest_closed.png',
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
        rainfall
    ],
    keys: [
        treasureKey
    ],
    treasures: [
        treasureChest
    ]
};