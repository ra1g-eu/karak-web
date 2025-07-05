import {GameState} from '../game/gameState.js';
import {eventTiles} from '../game/eventManager.js';
import {
    canPlaceTile,
    getAccessibleTiles,
    isWithinDistance
} from '../game/gameLogic.js';
import {updatePlayerInfo} from './renderer.js';
import {elementId, logEvent} from '../utils/helpers.js';
import {tileDeck} from '../game/gameLogic.js';

export function showTilePreview(tile) {
    const preview = elementId('place-tile-div');
    const img = elementId('preview-image');
    img.src = tile.image;
    preview.style.display = 'block';
}

export function hideTilePreview() {
    elementId('place-tile-div').style.display = 'none';
}

export function rotatePreview(direction) {
    const img = elementId('preview-image');
    const currentRotation = parseInt(img.style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
    const newRotation = direction === 'left' ? currentRotation - 90 : currentRotation + 90;
    img.style.transform = `rotate(${newRotation}deg)`;
}

export function startTilePlacement() {
    const tile = tileDeck.drawTile();
    if (!tile) return null;

    return tile;
}

export function placeTileOnBoard(tile, x, y, rotation) {
    const key = `${x},${y}`;
    const player = GameState.getCurrentPlayer();

    if (canPlaceTile(player.position, {x, y}, tile, rotation)) {
        GameState.map.set(key, {tile, rotation});
        logEvent(`${player.name} placed a ${tile.name} at (${x}, ${y})`);
        return true;
    }
    return false;
}

export function placeEventTile() {
    const player = GameState.getCurrentPlayer();
    const accessibleTiles = getAccessibleTiles(player);

    if (accessibleTiles.length === 0) return null;

    const randomEventTileIndex = Math.floor(Math.random() * eventTiles.length);
    const event = eventTiles[randomEventTileIndex];
    return {event, accessibleTiles};
}

export async function handlePlayerMovement(dx, dy) {
    const player = GameState.getCurrentPlayer();
    const newPos = {
        x: player.position.x + dx,
        y: player.position.y + dy
    };
    const key = `${newPos.x},${newPos.y}`;

    if (!GameState.map.has(key)) return false;
    if (!isWithinDistance(player.startPosition, newPos, 4)) return false;

    player.position = newPos;

    // Handle tile events
    const tile = GameState.map.get(key);
    if (tile.event) {
        const eventRemoved = await tile.event.onEnter(player);
        if (eventRemoved) delete tile.event;
    }

    return true;
}

export function endPlayerTurn() {
    const prevPlayer = GameState.getCurrentPlayer();
    const currentPlayer = GameState.nextTurn();

    // Reset movement starting point
    currentPlayer.startPosition = {...currentPlayer.position};

    logEvent(`Round ${GameState.round} - ${currentPlayer.name}'s turn`);
    updatePlayerInfo(currentPlayer);

    return currentPlayer;
}