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
import {validateTileConnection} from "../game/tileManager.js";
import {showInfoModal} from "./customModals.js";

export function showTilePreview(tile, previewDivId) {
    const preview = elementId(previewDivId);
    const img = elementId(previewDivId + '-image');
    img.src = tile.image;
    preview.style.display = 'block';
}

export function hideTilePreview(tileId) {
    elementId(tileId).style.display = 'none';
}

export function rotatePreview(direction, previewDivImageId) {
    const img = elementId(previewDivImageId);
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
    const currentPos = player.position;
    const newPos = {x: currentPos.x + dx, y: currentPos.y + dy};
    const currentKey = `${currentPos.x},${currentPos.y}`;
    const newKey = `${newPos.x},${newPos.y}`;

    // Check if target tile exists
    if (!GameState.map.has(newKey)) return false;

    // Check movement distance limit
    if (!isWithinDistance(player.startPosition, newPos, 4)) return false;

    // Get both tiles
    const currentTileData = GameState.map.get(currentKey);
    const newTileData = GameState.map.get(newKey);

    // Validate connection between tiles
    if (!validateTileConnection(currentTileData, newTileData, dx, dy)) {
        showInfoModal("Error", "No valid connection between tiles!");
        return false;
    }

    // Update player position
    player.position = newPos;

    // Handle tile events
    if (newTileData.event) {
        const eventRemoved = await newTileData.event.onEnter(player);
        if (eventRemoved) delete newTileData.event;
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