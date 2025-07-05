export const emptySlot = {
    id: 'empty',
    name: 'Empty Slot',
    type: 'empty',
    description: 'An empty inventory slot.'
};

export const sword = {
    id: 'sword001',
    name: 'Iron Sword',
    type: 'weapon',
    damage: 10,
    description: 'A sturdy iron sword.'
};

export const fireball = {
    id: 'spell001',
    name: 'Fireball',
    type: 'spell',
    damage: 25,
    manaCost: 5,
    description: 'A fiery projectile that burns enemies.'
};

export const goldenKey = {
    id: 'key001',
    name: 'Golden Key',
    type: 'key',
    description: 'Opens the treasure chest in the dungeon.'
};

export const rubyGem = {
    id: 'treasure001',
    name: 'Ruby Gem',
    type: 'treasure',
    value: 100,
    description: 'A precious red gemstone.'
};

export function addItemToInventory(player, item) {
    switch (item.type) {
        case 'weapon':
            return addToSlot(player.inventory.weapons, item);
        case 'spell':
            return addToSlot(player.inventory.spells, item);
        case 'key':
            return setKey(player, item);
        case 'treasure':
            player.inventory.treasures.push(item);
            return true;
        default:
            console.log('Unknown item type');
            return false;
    }
}

function addToSlot(slots, item) {
    const emptyIndex = slots.findIndex(slot => slot.id === 'empty');
    if (emptyIndex !== -1) {
        slots[emptyIndex] = item;
        return true;
    }
    return false;
}

function setKey(player, item) {
    if (player.inventory.key.id === 'empty') {
        player.inventory.key = item;
        return true;
    }
    return false;
}