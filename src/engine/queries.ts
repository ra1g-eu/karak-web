import { DIRS, parseKey } from './board';
import type { Command } from './commands';
import { currentPlayer } from './context';
import { getTileType } from './data/tiles';
import { applyCommand } from './reducer';
import type { GameState, ItemId, Player } from './types';

export { combatTotal } from './rules/combat';
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

function candidates(state: GameState): Command[] {
    const player = currentPlayer(state);
    const playerId = player.id;
    const phase = state.turn.phase;

    switch (phase.type) {
        case 'awaitingAction': {
            const tile = state.board[`${player.position.x},${player.position.y}`];
            const gates = Object.entries(state.board)
                .filter(([, t]) => getTileType(t.typeId).kind === 'gate')
                .map(([key]) => parseKey(key));
            const pickUps = [...new Set(tile?.items ?? [])].flatMap((item) => [
                { type: 'pickUp' as const, item },
                ...carried(player).map((drop) => ({ type: 'pickUp' as const, item, drop })),
            ]);
            return [
                ...DIRS.map((dir): Command => ({ type: 'move', playerId, dir })),
                ...gates.map((to): Command => ({ type: 'teleport', playerId, to })),
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
                { type: 'useBolt', playerId },
                { type: 'resolveCombat', playerId },
            ];
        case 'choosingLootDrop':
            return [phase.loot, ...carried(player)].map((drop) => ({
                type: 'chooseLootDrop',
                playerId,
                drop,
            }));
        case 'turnEnding':
            return [
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
