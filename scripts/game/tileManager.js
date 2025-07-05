import { getOppositeDirection, rotateDirection } from '../utils/helpers.js';

export const tileTypes = {
    oneWayCorridor: {
        id: 'oneWayCorridor',
        name: 'Corridor',
        image: 'images/tiles/one_way_corridor.png',
        connections: ['west', 'east'],
        effects: []
    },
    fourWayCorridor: {
        id: 'fourWayCorridor',
        name: '+ shaped corridor',
        image: 'images/tiles/four_way_corridor.png',
        connections: ['north', 'south', 'east', 'west'],
        effects: []
    },
    oneWayRoom: {
        id: 'oneWayRoom',
        name: 'Room',
        image: 'images/tiles/one_way_room.png',
        connections: ['north', 'south'],
        effects: ['containsEvent']
    },
    fourWayRoom: {
        id: 'fourWayRoom',
        name: '+ shaped room',
        image: 'images/tiles/four_way_room.png',
        connections: ['north', 'east', 'south', 'west'],
        effects: ['containsEvent']
    }
};

export class TileDeck {
    constructor(tiles) {
        this.tiles = [];
        this.initializeDeck(tiles);
    }

    initializeDeck(tiles) {
        const tileCount = Math.floor(Math.random() * 96 + 5);
        this.tiles = [...tiles];

        for (let i = 0; i < tileCount - tiles.length; i++) {
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

export function validateConnections(tile, position, rotation, map) {
    const effectiveConnections = getEffectiveConnections(tile, rotation);
    const { x, y } = position;

    const directions = [
        { dx: 0, dy: -1, dir: 'north' },
        { dx: 0, dy: 1, dir: 'south' },
        { dx: -1, dy: 0, dir: 'west' },
        { dx: 1, dy: 0, dir: 'east' }
    ];

    for (const { dx, dy, dir } of directions) {
        const adjacentKey = `${x + dx},${y + dy}`;
        if (map.has(adjacentKey)) {
            const adjacentTile = map.get(adjacentKey);
            const adjConnections = getEffectiveConnections(adjacentTile.tile, adjacentTile.rotation);
            const oppositeDir = getOppositeDirection(dir);

            if (!adjConnections.includes(oppositeDir)) return false;
            if (!effectiveConnections.includes(dir)) return false;
        }
    }
    return true;
}

export function createTileDeck() {
    return new TileDeck(Object.values(tileTypes));
}