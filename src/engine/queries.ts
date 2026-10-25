import { DIRS, parseKey } from './board';
import type { Command } from './commands';
import { currentPlayer } from './context';
import { getTileType } from './data/tiles';
import { applyCommand } from './reducer';
import type { Coord, GameState, ItemId, Player, TileKind } from './types';

export { combatBreakdown, combatTotal } from './rules/combat';
export type { CombatBreakdown } from './rules/combat';
export { computeScores } from './rules/scoring';
export { currentPlayer };

/**
 * Every command the active player may send right now. Candidates are generated per phase and
 * kept only if the reducer accepts them, so this can never disagree with the rules.
 */
export function legalCommands(state: GameState): Command[] {
    if (state.result) return [];
    return candidates(state).filter((c) => applyCommand(state, c).ok);
}

/** Coordinates of every discovered tile of a kind. */
export function tilesOfKind(state: GameState, kind: TileKind): Coord[] {
    return Object.entries(state.board)
        .filter(([, t]) => getTileType(t.typeId).kind === kind)
        .map(([key]) => parseKey(key));
}

function candidates(state: GameState): Command[] {
    const player = currentPlayer(state);
    const playerId = player.id;
    const phase = state.turn.phase;
    const others = state.players.filter((p) => p.id !== playerId);
    const fountains = tilesOfKind(state, 'fountain');
    const portals = state.players.flatMap((target) =>
        fountains.map((to): Command => ({ type: 'castPortal', playerId, targetId: target.id, to })),
    );

    switch (phase.type) {
        case 'awaitingAction': {
            const tile = state.board[`${player.position.x},${player.position.y}`];
            const pickUps = [...new Set(tile?.items ?? [])].flatMap((item) => [
                { type: 'pickUp' as const, item },
                ...carried(player).map((drop) => ({ type: 'pickUp' as const, item, drop })),
            ]);
            return [
                ...DIRS.map((dir): Command => ({ type: 'move', playerId, dir })),
                ...tilesOfKind(state, 'gate').map((to): Command => ({
                    type: 'teleport',
                    playerId,
                    to,
                })),
                ...others.map((t): Command => ({ type: 'magicSwap', playerId, targetId: t.id })),
                ...portals,
                { type: 'endTurn', playerId },
                { type: 'endTurn', playerId, action: { type: 'heal' } },
                { type: 'endTurn', playerId, action: { type: 'openChest' } },
                ...pickUps.map((action): Command => ({ type: 'endTurn', playerId, action })),
            ];
        }
        case 'placingTile':
            return phase.validRotations.map((rotation) => ({
                type: 'placeTile',
                playerId,
                rotation,
            }));
        case 'combat':
            return [
                { type: 'rollDice', playerId },
                { type: 'evade', playerId },
                { type: 'reroll', playerId },
                { type: 'useBolt', playerId },
                { type: 'sacrifice', playerId },
                { type: 'resolveCombat', playerId },
            ];
        case 'choosingLootDrop':
            return [phase.loot, ...carried(player)].map((drop) => ({
                type: 'chooseLootDrop',
                playerId,
                drop,
            }));
        case 'choosingCurseTarget':
            return [
                { type: 'placeCurse', playerId, targetId: null },
                ...others.map((t): Command => ({ type: 'placeCurse', playerId, targetId: t.id })),
            ];
        case 'choosingFountain':
            return fountains.map((to) => ({ type: 'chooseFountain', playerId, to }));
        case 'choosingToken':
            return [...new Set(phase.options)].map((token) => ({
                type: 'chooseToken',
                playerId,
                token,
            }));
        case 'turnEnding':
            return [
                ...portals,
                { type: 'endTurn', playerId },
                { type: 'endTurn', playerId, action: { type: 'heal' } },
            ];
        case 'gameOver':
            return [];
    }
}

function carried(player: Player): ItemId[] {
    return [
        ...new Set<ItemId>([
            ...player.weapons,
            ...player.spells,
            ...(player.hasKey ? ['key' as const] : []),
        ]),
    ];
}
