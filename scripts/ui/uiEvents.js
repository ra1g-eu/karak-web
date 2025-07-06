import {GameState} from '../game/gameState.js';
import {
    startTilePlacement,
    placeTileOnBoard,
    placeEventTile,
    handlePlayerMovement,
    endPlayerTurn,
    rotatePreview,
    showTilePreview, hideTilePreview
} from './uiManager.js';
import {highlightTiles, renderBoard, updatePlayerInfo, clearHighlights} from './renderer.js';
import {getAccessibleTiles, selectClass, TILE_SIZE, tileDeck} from '../game/gameLogic.js';
import {elementId, elementsByClass, logEvent} from '../utils/helpers.js';
import {offsetX, offsetY} from './renderer.js';
import {showConfirmModal, showInfoModal} from "./customModals.js";
import {getTileCountInDeck} from "../game/tileManager.js";

// State management for UI
let currentTile = null;
let placingTile = false;
let placingEvent = false;
let currentRotation = 0;
let currentAccessibleTiles = [];
export const confirmationModal = elementId('confirmationModal');
export const tileModal = elementId('tileModal');
//export const classModal = elementId('classModal');
export const classSelection = elementId('class-selection');

export async function initUI() {
    await setupEventListeners();
    updatePlayerInfo(GameState.getCurrentPlayer());
    renderBoard();
}

async function setupEventListeners() {
    // Rotation controls
    elementId('modalRotateLeft').addEventListener('click', () => {
        rotatePreview('left', 'place-tile-div-image');
        currentRotation = (currentRotation - 90 + 360) % 360;
    });

    elementId('modalRotateRight').addEventListener('click', () => {
        rotatePreview('right', 'place-tile-div-image');
        currentRotation = (currentRotation + 90) % 360;
    });

    updateTileDeckCount();

    // Tile drawing
    elementId('drawTile').addEventListener('click', handleDrawTile);

    // Event tile placement
    elementId('drawEventTile').addEventListener('click', handleDrawEventTile);

    // Turn ending
    elementId('endTurn').addEventListener('click', handleEndTurn);

    // Board interactions
    const boardEl = elementId('board');
    boardEl.addEventListener('click', handleBoardClick);
    boardEl.addEventListener('contextmenu', handleBoardRightClick);

    // Keyboard movement
    document.addEventListener('keydown', await handleKeyPress);

    // Class selection
    elementsByClass('.class-options').forEach(btn => {
        btn.addEventListener('click', () => {
            classModal.close();
            selectClass(GameState.getCurrentPlayer().id, btn.dataset.class);
            updatePlayerInfo(GameState.getCurrentPlayer());
        });
    });

    setTimeout(() => {
        classModal.showModal();
    }, 500);
}

function updateRoundInfo() {
    elementId('roundInfo').textContent = `${GameState.round}`;
    elementId('turnInfo').textContent = `${GameState.getCurrentPlayer().name}`;
}

function updateTileDeckCount() {
    elementId('tiles-remaining').textContent = getTileCountInDeck(tileDeck);
}

function handleDrawTile() {
    currentTile = startTilePlacement();
    if (!currentTile) {
        alert('No more tiles in the deck!');
    } else {
        placingTile = true;
        highlightTiles(getAccessibleTiles(GameState.getCurrentPlayer()));
        showTilePreview(currentTile, 'place-tile-div');
        updateTileDeckCount();
    }
}

function handleDrawEventTile() {
    const result = placeEventTile();
    if (!result) return;

    const {event, accessibleTiles} = result;
    highlightTiles(accessibleTiles);

    currentAccessibleTiles = accessibleTiles;

    placingEvent = true;
    currentTile = event;

    showTilePreview(event, 'place-event-tile-div');

    logEvent(`Drawing event tile: ${event.name}`);
}

function handleBoardClick(e) {
    const boardEl = elementId('board');
    const rect = boardEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor((clickX - offsetX) / TILE_SIZE);
    const gridY = Math.floor((clickY - offsetY) / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    if (placingTile && currentTile) {
        // Example: Confirming deletion
        showConfirmModal(
            'Place tile',
            'Are you sure you want to place this tile?',
            () => {
                if (placeTileOnBoard(currentTile, gridX, gridY, currentRotation)) {
                    placingTile = false;
                    currentTile = null;
                    hideTilePreview('place-tile-div');
                    renderBoard();
                } else {
                    alert("Cannot place tile here. Check connections.");
                }
            },
            () => {
                console.log('Canceled: Deletion aborted.');
                // Optional cleanup
            }
        );
    } else if (placingEvent && currentTile) {
        // Check if tile is accessible
        const isAccessible = currentAccessibleTiles.some(
            t => t.x === gridX && t.y === gridY
        );

        if (!isAccessible) {
            alert("You can only place event tiles on accessible tiles.");
            return;
        }

        // Check if tile already has an event
        if (GameState.map.has(key)) {
            const tileData = GameState.map.get(key);

            if (tileData.event) {
                alert("This tile already has an event!");
                return;
            }

            if (!tileData.tile?.effects?.includes('containsEvent')) {
                alert("This tile can not contain an event!");
                return;
            }

            // Place the event tile
            tileData.event = currentTile;
            logEvent(`${GameState.getCurrentPlayer().name} placed a ${currentTile.name} event on (${gridX}, ${gridY})`);

            // Clean up
            placingEvent = false;
            currentTile = null;
            currentAccessibleTiles = [];
            hideTilePreview('place-event-tile-div');
            clearHighlights();
            renderBoard();
        } else {
            alert("Cannot place event on empty tile");
        }
    }
    // Additional click handling...
}

function handleEndTurn() {
    if (placingTile || placingEvent) {
        showInfoModal('Error', 'Please finish tile placement before ending turn.');
        return;
    }
    const player = endPlayerTurn();
    if (!player.class) {
        classModal.showModal();
    }
    updateRoundInfo();
}

function handleBoardRightClick(e) {
    e.preventDefault();
    const boardEl = elementId('board');
    const rect = boardEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor((clickX - offsetX) / TILE_SIZE);
    const gridY = Math.floor((clickY - offsetY) / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    if (GameState.map.has(key)) {
        GameState.map.delete(key);
        renderBoard();
    }
}

async function handleKeyPress(e) {
    const keyMap = {
        'ArrowUp': {dx: 0, dy: -1},
        'w': {dx: 0, dy: -1},
        'W': {dx: 0, dy: -1},
        'ArrowDown': {dx: 0, dy: 1},
        's': {dx: 0, dy: 1},
        'S': {dx: 0, dy: 1},
        'ArrowLeft': {dx: -1, dy: 0},
        'a': {dx: -1, dy: 0},
        'A': {dx: -1, dy: 0},
        'ArrowRight': {dx: 1, dy: 0},
        'd': {dx: 1, dy: 0},
        'D': {dx: 1, dy: 0}
    };

    if (keyMap[e.key]) {
        const {dx, dy} = keyMap[e.key];
        if (await handlePlayerMovement(dx, dy)) {
            renderBoard();
            updatePlayerInfo(GameState.getCurrentPlayer());
        }
    }
}