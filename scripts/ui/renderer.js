import {GameState} from '../game/gameState.js';
import {TILE_SIZE} from '../game/gameLogic.js';
import {itemTypes, removeItemFromInventory} from "../game/inventoryManager.js";
import {elementId, elementsByClass} from "../utils/helpers.js";
import {showInventoryItemDetail} from "./customModals.js";

const BOARD_WIDTH = elementId('board-container').offsetWidth;
const BOARD_HEIGHT = 590;
export let offsetX = (BOARD_WIDTH / 2) - (TILE_SIZE / 2);
export let offsetY = (BOARD_HEIGHT / 2) - (TILE_SIZE / 2);
const boardEl = elementId('board');

export function clearBoard() {
    boardEl.innerHTML = '';
}

export function drawTileElement(x, y, tile, rotation) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.id = `${x},${y}`;
    el.style.left = `${(x * TILE_SIZE) + offsetX}px`;
    el.style.top = `${(y * TILE_SIZE) + offsetY}px`;
    el.style.backgroundImage = `url(${tile.image})`;
    el.style.transform = `rotate(${rotation}deg)`;
    boardEl.appendChild(el);
}

export function drawEventElement(x, y, event) {
    const el = document.createElement('div');
    el.className = 'event';
    el.style.left = `${(x * TILE_SIZE) + offsetX + 9}px`;
    el.style.top = `${(y * TILE_SIZE) + offsetY + 6}px`;
    el.style.backgroundImage = `url(${event.image})`;
    el.style.zIndex = "2";
    boardEl.appendChild(el);
}

export function drawPlayerElement(player) {
    if (elementId(player.id)) {
        elementId(player.id).remove();
    }
    const el = document.createElement('div');
    el.id = player.id;
    el.className = 'player';
    el.style.left = `${(player.position.x * TILE_SIZE) + offsetX}px`;
    el.style.top = `${(player.position.y * TILE_SIZE) + offsetY}px`;
    if (player.image) el.style.backgroundImage = `url(${player.image})`;
    el.style.zIndex = "3";
    boardEl.appendChild(el);
}

export function renderBoard() {
    clearBoard();

    for (const [key, value] of GameState.map.entries()) {
        const [x, y] = key.split(',').map(Number);
        drawTileElement(x, y, value.tile, value.rotation);

        if (value.event) {
            drawEventElement(x, y, value.event);
        }
    }

    GameState.players.forEach(drawPlayerElement);
}

export function updatePlayerInfo(player) {
    drawPlayerElement(player);
    player = GameState.updateCurrentPlayer(player);
    const statsPanel = elementId('player-stats');
    const infoPanel = elementId('player-info');

    const inventoryDiv = elementId('inventory-container');
    inventoryDiv.innerHTML = '';

    player.inventory.weapons.forEach((weapon, index) => {
        /**
         * Render weapon slots
         * @param InventoryItem weapon
         */
        inventoryDiv.append(createInventoryItem(player, weapon, 'weapon', index));
    });
    // Render key slot
    inventoryDiv.append(createInventoryItem(player, player.inventory.key, 'key'));

    // Render spell slots
    player.inventory.spells.forEach((spell, index) => {
        inventoryDiv.append(createInventoryItem(player, spell, 'spell', index));
    });

    // Render treasure slots (if any)
    if (player.inventory.treasures.length > 0) {
        player.inventory.treasures.forEach((treasure, index) => {
            inventoryDiv.append(createInventoryItem(player, treasure, 'treasure', index));
        });
    }
    statsPanel.innerHTML = `<div class="flex items-center mb-4">
                            <div class="avatar">
                                <div class="w-16 rounded-full">
                                    <img src="${player.image ? player.image : 'images/monsters/monster_skeleton.png'}" alt="${player.class}">
                                </div>
                            </div>
                            <div class="ml-4">
                                <h3 class="text-lg font-bold">${player.name}</h3>
                                <p class="text-yellow-500">${player.class}</p>
                            </div>
                        </div>
                        <div class="mb-4">
                            <h4 class="font-bold mb-2">Abilities</h4>
                            <ul class="list-disc pl-5">
                                <li>${Object.keys(player.abilities).join(', ')}</li>
                            </ul>
                        </div>`;

    elementId('player-health').textContent = `${player.hp}/${player.maxHp}`;
    elementId('player-max-health').textContent = player.maxHp;
    elementId('player-actions').textContent = player.actions;

    infoPanel.append(inventoryDiv);

    return player;
}

export function highlightTiles(tiles) {
    tiles.forEach(tile => {
        const key = `${tile.x},${tile.y}`;
        const tileEl = document.querySelector(`.tile[id="${key}"]`);
        if (tileEl) {
            tileEl.classList.add('highlight');
        }
    });
}

export function clearHighlights() {
    elementsByClass('.tile.highlight').forEach(tileEl => {
        tileEl.classList.remove('highlight');
    });
}

/**
 * @param {Object} player
 * @param {InventoryItem} item
 * @param {string|number} type
 * @param {number|null} index
 */
function createInventoryItem(player, item, type, index = null) {
    const itemType = itemTypes[item.type];
    const slotType = itemTypes[type];

    const div = document.createElement('div');
    div.className = `inventory-item bg-base-100 p-2 rounded-lg ${item.id === 'empty' ? 'empty-slot' : slotType.bgClass}`;

    const icon = document.createElement('div');
    icon.className = `item-icon text-center ${item.id === 'empty' ? 'text-gray-500' : 'text-yellow-500'}`;
    icon.innerHTML = `<i class="fas ${item.id === 'empty' ? itemType.icon : slotType.icon}"></i>`;

    const name = document.createElement('p');
    name.className = 'font-bold text-center';
    name.textContent = item.name;

    const typeText = document.createElement('p');
    typeText.className = 'text-xs text-gray-400 text-center';
    typeText.textContent = item.id === 'empty' ? itemType.name : slotType.name;

    div.appendChild(icon);
    div.appendChild(name);
    div.appendChild(typeText);

    // Add click handler for non-empty items
    if (item.id !== 'empty') {
        div.classList.add('cursor-pointer');
        div.addEventListener('click', () => {
            showInventoryItemDetail(item.name, `
<p>Item type: ${itemType.name}</p>
${item.damage ? `<p>Damage: <span class="font-bold text-yellow-500">${item.damage}</span></p>` : ''}
${item.manaCost ? `<p>Mana cost: <span class="font-bold text-yellow-500">${item.manaCost}</span></p>` : ''}
<p>${item.description}</p>
<p><img class="game_item_image" src="${item.image}" alt="${item.name}"></p>
`, () => {
                removeItemFromInventory(player, type, item.id);
            });
        });
    }

    return div;
}