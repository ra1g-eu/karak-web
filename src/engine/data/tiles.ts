import type { Dir, TileKind, TileShape } from '../types';

export interface TileType {
    id: string;
    shape: TileShape;
    kind: TileKind;
}

/** Open sides of each shape before rotation. */
export const SHAPE_OPENINGS: Record<TileShape, readonly Dir[]> = {
    deadEnd: ['N'],
    straight: ['N', 'S'],
    corner: ['N', 'E'],
    tee: ['E', 'S', 'W'],
    cross: ['N', 'E', 'S', 'W'],
};

function tile(kind: TileKind, shape: TileShape): TileType {
    return { id: `${kind}-${shape}`, kind, shape };
}

/** R-TILE-START: 4-way tile with a healing fountain. */
export const START_TILE: TileType = { id: 'start', kind: 'fountain', shape: 'cross' };

/**
 * ⚠ PLACEHOLDER (Q-03): the rulebook says 80 tiles (79 + start) but not how they split by shape
 * and kind. These counts are invented. Rooms outnumber bag tokens (53) so the dragon is always
 * reachable in principle. Replace with the real counts once someone counts a physical copy.
 */
export const TILE_PILE_COUNTS: readonly (readonly [TileType, number])[] = [
    [tile('room', 'cross'), 10],
    [tile('room', 'tee'), 15],
    [tile('room', 'corner'), 14],
    [tile('room', 'straight'), 8],
    [tile('room', 'deadEnd'), 8],
    [tile('tunnel', 'cross'), 4],
    [tile('tunnel', 'tee'), 4],
    [tile('tunnel', 'corner'), 4],
    [tile('tunnel', 'straight'), 4],
    [tile('gate', 'tee'), 2],
    [tile('gate', 'corner'), 1],
    [tile('gate', 'straight'), 1],
    [tile('fountain', 'cross'), 1],
    [tile('fountain', 'tee'), 1],
    [tile('fountain', 'corner'), 1],
    [tile('fountain', 'straight'), 1],
];

export const TILE_TYPES: Readonly<Record<string, TileType>> = Object.fromEntries(
    [START_TILE, ...TILE_PILE_COUNTS.map(([t]) => t)].map((t) => [t.id, t]),
);

export function getTileType(id: string): TileType {
    const type = TILE_TYPES[id];
    if (!type) throw new Error(`Unknown tile type "${id}"`);
    return type;
}
