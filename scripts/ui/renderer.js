import {GameState} from '../game/gameState.js';
import {TILE_SIZE} from '../game/gameLogic.js';

const BOARD_WIDTH = 1024;
const BOARD_HEIGHT = 590;
export let offsetX = (BOARD_WIDTH / 2) - (TILE_SIZE / 2);
export let offsetY = (BOARD_HEIGHT / 2) - (TILE_SIZE / 2);
const boardEl = document.getElementById('board');

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
    el.style.left = `${(x * TILE_SIZE) + offsetX}px`;
    el.style.top = `${(y * TILE_SIZE) + offsetY}px`;
    el.style.backgroundImage = `url(${event.image})`;
    el.style.zIndex = "2";
    boardEl.appendChild(el);
}

export function drawPlayerElement(player) {
    if (document.getElementById(player.id)) {
        document.getElementById(player.id).remove();
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
    const infoPanel = document.getElementById('player-info');
    infoPanel.innerHTML = `
        <h2>${player.name} ${player.class ? `(${player.class})` : ''}</h2>
        <p>HP: ${player.hp}/${player.maxHp}</p>
        <div class="inventory">
            <h3>Inventory</h3>
            <div class="weapons">Weapons: ${player.inventory.weapons.map(i => i.name).join(', ')}</div>
            <div class="spells">Spells: ${player.inventory.spells.map(i => i.name).join(', ')}</div>
            <div class="key">Key: ${player.inventory.key.name}</div>
            <div class="treasures">Treasures: ${player.inventory.treasures.length}</div>
        </div>
    `;
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
    document.querySelectorAll('.tile.highlight').forEach(tileEl => {
        tileEl.classList.remove('highlight');
    });
}