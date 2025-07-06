import { getOppositeDirection, rotateDirection } from '../utils/helpers.js';

export const tileTypes = {
    oneWayCorridor: {
        id: 'oneWayCorridor',
        name: 'Corridor',
        image: 'images/tiles/c_one_way_corridor.png',
        connections: ['north', 'south'],
        effects: []
    },
    oneWayCorridorTeleport: {
        id: 'oneWayCorridorTeleport',
        name: 'Corridor with a teleport',
        image: 'images/tiles/c_one_way_corridor_teleport.png',
        connections: ['north', 'south'],
        effects: []
    },
    fourWayCorridor: {
        id: 'fourWayCorridor',
        name: '+ shaped corridor',
        image: 'images/tiles/c_four_way_corridor.png',
        connections: ['north', 'south', 'east', 'west'],
        effects: []
    },
    oneWayRoom: {
        id: 'oneWayRoom',
        name: 'Room',
        image: 'images/tiles/c_one_way_room.png',
        connections: ['north', 'south'],
        effects: ['containsEvent']
    },
    fourWayRoom: {
        id: 'fourWayRoom',
        name: '+ shaped room',
        image: 'images/tiles/c_four_way_room.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    },
    dragonEndGame: {
        id: 'dragonEndGame',
        name: 'Dragon battle',
        image: 'images/tiles/c_dragon_end_game.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    },
    fourWayCorridorArena: {
        id: 'fourWayCorridorArena',
        name: '+ shaped corridor with arena',
        image: 'images/tiles/c_four_way_corridor_arena.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    },
    fourWayCorridorHpRestore: {
        id: 'fourWayCorridorHpRestore',
        name: '+ shaped corridor with health restore',
        image: 'images/tiles/c_four_way_corridor_hp_restore.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    },
    fourWayCorridorScorpio: {
        id: 'fourWayCorridorScorpio',
        name: '+ shaped corridor with scorpion',
        image: 'images/tiles/c_four_way_corridor_scorpio.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    },
    lCorridorHpRestore: {
        id: 'lCorridorHpRestore',
        name: 'L shaped corridor with health restore',
        image: 'images/tiles/c_l_corridor_hp_restore.png',
        connections: ['south', 'west'],
        effects: ['containsEvent']
    },
    lCorridor: {
        id: 'lCorridor',
        name: 'L shaped corridor',
        image: 'images/tiles/c_l_corridor_hp_restore.png',
        connections: ['south', 'west'],
        effects: []
    },
    lCorridorPortal: {
        id: 'lCorridorPortal',
        name: 'L shaped corridor with portal',
        image: 'images/tiles/c_l_corridor_portal.png',
        connections: ['south', 'west'],
        effects: ['containsEvent']
    },
    lRoom: {
        id: 'lRoom',
        name: 'L shaped room',
        image: 'images/tiles/c_l_room.png',
        connections: ['south', 'west'],
        effects: ['containsEvent']
    },
    tCorridor: {
        id: 'tCorridor',
        name: 'T shaped corridor',
        image: 'images/tiles/c_t_corridor.png',
        connections: ['south', 'west', 'north'],
        effects: []
    },
    tRoom: {
        id: 'tRoom',
        name: 'T shaped room',
        image: 'images/tiles/c_t_room.png',
        connections: ['south', 'west', 'north'],
        effects: ['containsEvent']
    }
};

export class TileDeck {
    constructor(tiles, tileCount) {
        this.tiles = [];
        this.initializeDeck(tiles, tileCount);
    }

    initializeDeck(tiles, tileCount) {
        this.tiles = [...tiles];

        for (let i = 0; i <= tileCount - tiles.length; i++) {
            const index = Math.floor(Math.random() * tiles.length);
            this.tiles.push(tiles[index]);
        }

        this.shuffle();
    }

    shuffle() {
        for (let i = this.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
        }
    }

    drawTile() {
        return this.tiles.length > 0 ? this.tiles.pop() : null;
    }
}

export function getEffectiveConnections(tile, rotation) {
    const rotations = rotation / 90;
    return tile.connections.map(dir => rotateDirection(dir, rotations));
}

export function validateConnections(tile, position, rotation, map, playerPosition) {
    // Only need one valid connection - to the tile the hero came from
    const {x, y} = position;

    // Determine the direction from the hero's current tile to the new tile
    const direction = getDirectionFromHero(playerPosition, {x, y});

    if (!direction) {
        console.error("New tile must be adjacent to hero's current position");
        return false;
    }

    // Get the opposite direction for connection validation
    const oppositeDir = getOppositeDirection(direction);

    // Check connection from hero's current tile to new tile
    const heroTile = map.get(`${playerPosition.x},${playerPosition.y}`);
    if (!heroTile) {
        console.error("Hero's tile not found");
        return false;
    }

    const heroConnections = getEffectiveConnections(heroTile.tile, heroTile.rotation);
    if (!heroConnections.includes(direction)) {
        console.error(`Hero's tile doesn't have ${direction} connection`);
        return false;
    }

    // Check connection from new tile back to hero's tile
    const effectiveConnections = getEffectiveConnections(tile, rotation);
    if (!effectiveConnections.includes(oppositeDir)) {
        console.error(`New tile doesn't have ${oppositeDir} connection`);
        return false;
    }

    return true;
}

export function validateTileConnection(currentTileData, newTileData, dx, dy) {
    // Determine movement direction
    const direction = getDirectionFromMovement(dx, dy);
    if (!direction) return false;

    // Get opposite direction for connection back
    const oppositeDir = getOppositeDirection(direction);

    // Get effective connections for both tiles
    const currentConnections = getEffectiveConnections(
        currentTileData.tile,
        currentTileData.rotation
    );

    const newConnections = getEffectiveConnections(
        newTileData.tile,
        newTileData.rotation
    );

    // Check if both tiles have the required connections
    return currentConnections.includes(direction) &&
        newConnections.includes(oppositeDir);
}

/**
 * @param heroPos
 * @param {{x, y}} newPos
 * @return {string|null}
 */
export function getDirectionFromHero(heroPos, newPos) {
    const dx = newPos.x - heroPos.x;
    const dy = newPos.y - heroPos.y;

    return getDirectionFromMovement(dx, dy);
}

export function getDirectionFromMovement(dx, dy) {
    if (dx === 1 && dy === 0) return 'east';
    if (dx === -1 && dy === 0) return 'west';
    if (dx === 0 && dy === 1) return 'south';
    if (dx === 0 && dy === -1) return 'north';
    return null;
}

export function createTileDeck(tileCount) {
    return new TileDeck(Object.values(tileTypes), tileCount);
}

export function getTileCountInDeck(tileDeck) {
    return tileDeck.tiles.length;
}