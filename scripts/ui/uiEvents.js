import {GameState} from '../game/gameState.js';
import {
    startTilePlacement,
    placeTileOnBoard,
    placeEventTile,
    handlePlayerMovement,
    endPlayerTurn,
    rotatePreview,
    hideTilePreview
} from './uiManager.js';
import {highlightTiles, renderBoard, updatePlayerInfo, clearHighlights} from './renderer.js';
import {selectClass, TILE_SIZE} from '../game/gameLogic.js';
import {logEvent} from '../utils/helpers.js';
import {offsetX, offsetY} from './renderer.js';

// State management for UI
let currentTile = null;
let placingTile = false;
let placingEvent = false;
let currentRotation = 0;
let currentAccessibleTiles = [];

export function initUI() {
    setupEventListeners();
    updatePlayerInfo(GameState.getCurrentPlayer());
    renderBoard();
}

function setupEventListeners() {
    // Rotation controls
    document.getElementById('rotateLeft').addEventListener('click', () => {
        rotatePreview('left');
        currentRotation = (currentRotation - 90 + 360) % 360;
    });

    document.getElementById('rotateRight').addEventListener('click', () => {
        rotatePreview('right');
        currentRotation = (currentRotation + 90) % 360;
    });

    // Tile drawing
    document.getElementById('drawTile').addEventListener('click', handleDrawTile);

    // Event tile placement
    document.getElementById('drawEventTile').addEventListener('click', handleDrawEventTile);

    // Turn ending
    document.getElementById('endTurn').addEventListener('click', handleEndTurn);

    // Board interactions
    const boardEl = document.getElementById('board');
    boardEl.addEventListener('click', handleBoardClick);
    boardEl.addEventListener('contextmenu', handleBoardRightClick);

    // Keyboard movement
    document.addEventListener('keydown', handleKeyPress);

    // Class selection
    document.querySelectorAll('.class-options').forEach(btn => {
        btn.addEventListener('click', () => {
            selectClass(GameState.getCurrentPlayer().id, btn.dataset.class);
            document.getElementById('class-selection').style.display = 'none';
            updatePlayerInfo(GameState.getCurrentPlayer());
        });
    });
}

function handleDrawTile() {
    currentTile = startTilePlacement();
    if (!currentTile) {
        alert('No more tiles in the deck!');
    } else {
        placingTile = true;
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

    logEvent(`Drawing event tile: ${event.name}`);
}

function handleBoardClick(e) {
    const boardEl = document.getElementById('board');
    const rect = boardEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridX = Math.floor((clickX - offsetX) / TILE_SIZE);
    const gridY = Math.floor((clickY - offsetY) / TILE_SIZE);
    const key = `${gridX},${gridY}`;

    if (placingTile && currentTile) {
        if (placeTileOnBoard(currentTile, gridX, gridY, currentRotation)) {
            placingTile = false;
            currentTile = null;
            hideTilePreview();
            renderBoard();
        } else {
            alert("Cannot place tile here. Check connections.");
        }
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
            clearHighlights();
            renderBoard();
        } else {
            alert("Cannot place event on empty tile");
        }
    }
    // Additional click handling...
}

function handleEndTurn() {
    const player = endPlayerTurn();
    if (!player.class) {
        document.getElementById('class-selection').style.display = 'block';
    }
}

function handleBoardRightClick(e) {
    e.preventDefault();
    const boardEl = document.getElementById('board');
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

function handleKeyPress(e) {
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
        if (handlePlayerMovement(dx, dy)) {
            renderBoard();
            updatePlayerInfo(GameState.getCurrentPlayer());
        }
    }
}