import {GameState} from './gameState.js';
import {createTileDeck, validateConnections} from './tileManager.js';
import {characterClasses} from './characterManager.js';
import {logEvent} from '../utils/helpers.js';

export const tileDeck = createTileDeck();
const BOARD_WIDTH = 1024;
const BOARD_HEIGHT = 590;
export const TILE_SIZE = 64;
let offsetX = (BOARD_WIDTH / 2) - (TILE_SIZE / 2);
let offsetY = (BOARD_HEIGHT / 2) - (TILE_SIZE / 2);

export function initGame() {
    GameState.map.clear();
    GameState.players.forEach(player => {
        player.position = {x: 0, y: 0};
        player.hp = player.maxHp;
    });

    const initialTile = tileDeck.drawTile();
    if (initialTile) {
        GameState.map.set('0,0', {tile: initialTile, rotation: 0});
    }
}

export function getAccessibleTiles(player) {
    const accessible = [];
    const {x: startX, y: startY} = player.position;

    for (let dx = -4; dx <= 4; dx++) {
        for (let dy = -4; dy <= 4; dy++) {
            const distance = Math.abs(dx) + Math.abs(dy);
            if (distance > 4) continue;

            const x = startX + dx;
            const y = startY + dy;
            const key = `${x},${y}`;

            if (GameState.map.has(key)) accessible.push({x, y});
        }
    }
    return accessible;
}

export function hasAdjacentTile(x, y) {
    return [
        {dx: 0, dy: -1},
        {dx: 0, dy: 1},
        {dx: -1, dy: 0},
        {dx: 1, dy: 0}
    ].some(({dx, dy}) => GameState.map.has(`${x + dx},${y + dy}`));
}

export function isWithinDistance(pos1, pos2, maxDistance) {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) <= maxDistance;
}

export function canPlaceTile(playerPos, targetPos, tile, rotation) {
    const key = `${targetPos.x},${targetPos.y}`;
    return !GameState.map.has(key) &&
        isWithinDistance(playerPos, targetPos, 4) &&
        hasAdjacentTile(targetPos.x, targetPos.y) &&
        validateConnections(tile, targetPos, rotation, GameState.map);
}

export function selectClass(playerId, classKey) {
    const player = GameState.players.find(p => p.id === playerId);
    if (!player || !characterClasses[classKey]) return;

    const cls = characterClasses[classKey];
    player.class = cls.name;
    player.abilities = {...cls.abilities};
    player.image = cls.image;

    logEvent(`${player.name} chose the ${cls.name} class`);
}