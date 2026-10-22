import { getTileType, SHAPE_OPENINGS } from './data/tiles';
import type { Coord, Dir, GameState, PlacedTile, Rotation } from './types';

export const DIRS: readonly Dir[] = ['N', 'E', 'S', 'W'];
export const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];

const DELTA: Record<Dir, Coord> = {
    N: { x: 0, y: -1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 },
};

export function coordKey(c: Coord): string {
    return `${c.x},${c.y}`;
}

export function parseKey(key: string): Coord {
    const [x, y] = key.split(',').map(Number);
    return { x: x ?? 0, y: y ?? 0 };
}

export function sameCoord(a: Coord, b: Coord): boolean {
    return a.x === b.x && a.y === b.y;
}

export function step(c: Coord, dir: Dir): Coord {
    return { x: c.x + DELTA[dir].x, y: c.y + DELTA[dir].y };
}

export function opposite(dir: Dir): Dir {
    return rotateDir(dir, 2);
}

export function rotateDir(dir: Dir, rotation: number): Dir {
    return DIRS[(DIRS.indexOf(dir) + rotation) % 4] as Dir;
}

/** Direction of an orthogonally adjacent coordinate, or null. */
export function dirBetween(from: Coord, to: Coord): Dir | null {
    return DIRS.find((d) => sameCoord(step(from, d), to)) ?? null;
}

export function openingsOf(typeId: string, rotation: Rotation): Dir[] {
    return SHAPE_OPENINGS[getTileType(typeId).shape].map((d) => rotateDir(d, rotation));
}

export function hasOpening(tile: PlacedTile, dir: Dir): boolean {
    return openingsOf(tile.typeId, tile.rotation).includes(dir);
}

export function tileAt(state: GameState, c: Coord): PlacedTile | undefined {
    return state.board[coordKey(c)];
}

/** R-MOVE-1: both facing sides must be open. */
export function isConnected(state: GameState, from: Coord, dir: Dir): boolean {
    const a = tileAt(state, from);
    const b = tileAt(state, step(from, dir));
    return !!a && !!b && hasOpening(a, dir) && hasOpening(b, opposite(dir));
}

/** R-EXPLORE-2: rotations that give the new tile an opening back towards the hero. */
export function rotationsConnecting(typeId: string, backTowards: Dir): Rotation[] {
    return ROTATIONS.filter((r) => openingsOf(typeId, r).includes(backTowards));
}

export function kindAt(state: GameState, c: Coord) {
    const tile = tileAt(state, c);
    return tile ? getTileType(tile.typeId).kind : undefined;
}
