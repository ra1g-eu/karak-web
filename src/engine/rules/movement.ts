import {
    coordKey,
    hasOpening,
    isConnected,
    kindAt,
    opposite,
    rotationsConnecting,
    sameCoord,
    step,
    tileAt,
} from '../board';
import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import { getTileType } from '../data/tiles';
import type { Coord, Dir, Rotation } from '../types';
import { startCombat } from './combat';

function spendMoveTo(ctx: Ctx, to: Coord): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    player.position = { ...to };
    state.turn.movesLeft--;
    state.turn.path.push({ ...to });
}

function requireMoveLeft(ctx: Ctx): void {
    // R-TURN-1
    if (ctx.state.turn.movesLeft <= 0) fail('no-moves', 'No moves left this turn');
}

/** R-TURN-3: step onto a discovered tile (§6) or explore an undiscovered space (§5). */
export function move(ctx: Ctx, dir: Dir): void {
    const { state } = ctx;
    requirePhase(state, 'awaitingAction');
    requireMoveLeft(ctx);
    const player = currentPlayer(state);
    const from = { ...player.position };
    const to = step(from, dir);
    const target = tileAt(state, to);

    if (target) {
        // R-MOVE-1
        if (!isConnected(state, from, dir)) fail('wall', 'A wall blocks the way');
        spendMoveTo(ctx, to);
        ctx.events.push({ type: 'heroMoved', playerId: player.id, from, to });
        // R-MOVE-3, C-10
        if (target.monster) startCombat(ctx, target.monster, to);
        return;
    }

    // C-01: explore only through an opening of the hero's own tile.
    const here = tileAt(state, from);
    if (!here || !hasOpening(here, dir)) fail('wall', 'A wall blocks the way');
    // C-06
    const typeId = state.tilePile.pop();
    if (!typeId) fail('pile-empty', 'No dungeon tiles left to explore with');
    // R-EXPLORE-2, C-02
    const validRotations = rotationsConnecting(typeId, opposite(dir));
    if (validRotations.length === 0) throw new Error(`Tile ${typeId} has no openings`);
    state.turn.phase = { type: 'placingTile', typeId, at: to, validRotations };
    ctx.events.push({ type: 'tileDrawn', playerId: player.id, typeId, at: { ...to } });
}

/** R-EXPLORE-1/2/4: place the drawn tile, step onto it, then resolve what it holds. */
export function placeTile(ctx: Ctx, rotation: Rotation): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'placingTile');
    if (!phase.validRotations.includes(rotation)) {
        fail('bad-rotation', 'The tile must open back towards the tile you came from');
    }
    const player = currentPlayer(state);
    const at = { ...phase.at };
    state.board[coordKey(at)] = {
        typeId: phase.typeId,
        rotation,
        monster: null,
        chest: false,
        items: [],
    };
    ctx.events.push({
        type: 'tilePlaced',
        playerId: player.id,
        typeId: phase.typeId,
        at,
        rotation,
    });

    const from = { ...player.position };
    spendMoveTo(ctx, at);
    state.turn.phase = { type: 'awaitingAction' };
    ctx.events.push({ type: 'heroMoved', playerId: player.id, from, to: { ...at } });

    // R-ROOM-ONCE: only a freshly placed room draws from the bag.
    if (getTileType(phase.typeId).kind === 'room') drawFromBag(ctx, at);
}

function drawFromBag(ctx: Ctx, at: Coord): void {
    const { state } = ctx;
    const tile = tileAt(state, at);
    if (!tile) throw new Error('Room tile missing');
    const token = state.bag.pop();
    if (!token) {
        // C-06
        ctx.events.push({ type: 'bagEmpty', at: { ...at } });
        return;
    }
    ctx.events.push({
        type: 'tokenDrawn',
        playerId: currentPlayer(state).id,
        token,
        at: { ...at },
    });
    if (token === 'chest') {
        tile.chest = true; // R-ROOM-a/b
    } else {
        tile.monster = token; // R-ROOM-c
        startCombat(ctx, token, at);
    }
}

/** R-TG-1/2: one move to jump from a gate to any other discovered gate. */
export function teleport(ctx: Ctx, to: Coord): void {
    const { state } = ctx;
    requirePhase(state, 'awaitingAction');
    requireMoveLeft(ctx);
    const player = currentPlayer(state);
    const from = { ...player.position };
    if (kindAt(state, from) !== 'gate')
        fail('not-on-gate', 'You must stand on a teleportation gate');
    if (sameCoord(from, to) || kindAt(state, to) !== 'gate') {
        fail('bad-gate', 'Pick another discovered teleportation gate');
    }
    spendMoveTo(ctx, to);
    ctx.events.push({ type: 'teleported', playerId: player.id, from, to: { ...to } });
}
