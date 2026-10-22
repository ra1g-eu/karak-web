import { describe, expect, it } from 'vitest';
import { combatTotal, type GameState, type MonsterId } from '../../src/engine';
import {
    eventTypes,
    expectRejected,
    newGame,
    pid,
    player,
    putTiles,
    rigDice,
    run,
} from './helpers';

/** p1 on the start tile, a room with `monster` to the north, dice rigged to `dice`. */
function facing(monster: MonsterId, dice: [number, number], setup?: (s: GameState) => void) {
    const state = newGame();
    putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', monster });
    setup?.(state);
    const id = pid(state);
    const { state: inCombat } = run(state, { type: 'move', playerId: id, dir: 'N' });
    rigDice(inCombat, ...dice);
    return { state: inCombat, id };
}

function fight(monster: MonsterId, dice: [number, number], setup?: (s: GameState) => void) {
    const { state, id } = facing(monster, dice, setup);
    return run(state, { type: 'rollDice', playerId: id }, { type: 'resolveCombat', playerId: id });
}

describe('combat (§7)', () => {
    it('R-MOVE-3: entering a room with a monster starts combat', () => {
        const { state } = facing('rat', [1, 1]);
        expect(state.turn.phase).toMatchObject({
            type: 'combat',
            monster: 'rat',
            at: { x: 0, y: -1 },
        });
        expect(player(state).position).toEqual({ x: 0, y: -1 });
    });

    it('R-COMBAT-1: total is 2d6 plus every carried weapon', () => {
        const { state, id } = facing('skeletonKing', [3, 2], (s) => {
            player(s).weapons = ['sword', 'daggers'];
        });
        const { state: rolled, events } = run(state, { type: 'rollDice', playerId: id });
        expect(events).toEqual([{ type: 'diceRolled', playerId: id, dice: [3, 2] }]);
        expect(combatTotal(rolled)).toBe(8);
        // Weapons are never used up (R-WEAPON-2).
        const { state: after } = run(rolled, { type: 'resolveCombat', playerId: id });
        expect(player(after, 0).weapons).toEqual(['sword', 'daggers']);
    });

    it('R-COMBAT-1: the dice must be rolled once before resolving', () => {
        const { state, id } = facing('rat', [1, 1]);
        expectRejected(state, { type: 'resolveCombat', playerId: id }, 'not-rolled');
        const { state: rolled } = run(state, { type: 'rollDice', playerId: id });
        expectRejected(rolled, { type: 'rollDice', playerId: id }, 'already-rolled');
    });

    it('R-COMBAT-1: no moving or ending the turn mid-fight', () => {
        const { state, id } = facing('rat', [1, 1]);
        expectRejected(state, { type: 'move', playerId: id, dir: 'S' }, 'wrong-phase');
        expectRejected(state, { type: 'endTurn', playerId: id }, 'wrong-phase');
    });

    it('R-BOLT-1: bolts add +1 each after the roll and are discarded', () => {
        const { state, id } = facing('skeletonKing', [5, 2], (s) => {
            player(s).weapons = ['sword', 'daggers'];
            player(s).spells = ['magicBolt', 'healingPortal', 'magicBolt'];
        });
        expectRejected(state, { type: 'useBolt', playerId: id }, 'not-rolled');
        const { state: after, events } = run(
            state,
            { type: 'rollDice', playerId: id },
            { type: 'useBolt', playerId: id },
            { type: 'useBolt', playerId: id },
        );
        expect(combatTotal(after)).toBe(7 + 3 + 2);
        expect(player(after).spells).toEqual(['healingPortal']);
        expect(eventTypes(events)).toEqual(['diceRolled', 'boltUsed', 'boltUsed']);
        expectRejected(after, { type: 'useBolt', playerId: id }, 'no-bolt');
    });

    it('rulebook example 1: rolls 7 with sword, daggers and a bolt to beat the Skeleton King', () => {
        const { state, id } = facing('skeletonKing', [4, 3], (s) => {
            player(s).weapons = ['sword', 'daggers'];
            player(s).spells = ['magicBolt'];
        });
        const { state: after, events } = run(
            state,
            { type: 'rollDice', playerId: id },
            { type: 'useBolt', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(events).toContainEqual(
            expect.objectContaining({
                type: 'combatResolved',
                total: 11,
                strength: 10,
                result: 'win',
            }),
        );
        // Full weapon slots: the axe needs a choice (example drops the daggers).
        expect(after.turn.phase).toMatchObject({ type: 'choosingLootDrop', loot: 'axe' });
        const { state: done } = run(after, {
            type: 'chooseLootDrop',
            playerId: id,
            drop: 'daggers',
        });
        expect(player(done).weapons).toEqual(['sword', 'axe']);
        expect(done.board['0,-1']?.items).toEqual(['daggers']);
    });

    describe('R-COMBAT-WIN', () => {
        it('removes the monster, takes its loot, and the hero stays', () => {
            const { state, events } = fight('rat', [3, 3]);
            expect(state.board['0,-1']?.monster).toBeNull();
            expect(player(state).weapons).toEqual(['daggers']);
            expect(player(state).position).toEqual({ x: 0, y: -1 });
            expect(state.turn.phase).toEqual({ type: 'turnEnding' });
            expect(eventTypes(events)).toEqual(['diceRolled', 'combatResolved', 'lootTaken']);
        });

        it.each([
            ['rat', 'daggers'],
            ['spider', 'healingPortal'],
            ['turnkey', 'key'],
            ['mummy', 'magicBolt'],
            ['skeletonWarrior', 'sword'],
            ['skeletonKing', 'axe'],
        ] as const)('%s drops %s', (monster, item) => {
            const { state } = fight(monster, [6, 6]);
            const p = player(state);
            const carried = [...p.weapons, ...p.spells, ...(p.hasKey ? ['key'] : [])];
            expect(carried).toEqual([item]);
        });

        it('The Fallen gives a treasure worth 1 VP', () => {
            const { state } = fight('fallen', [6, 6], (s) => {
                player(s).weapons = ['axe'];
            });
            expect(player(state).treasures).toEqual(['fallen']);
        });

        it('full slot: dropping the new loot leaves it on the tile', () => {
            const { state, id } = facing('rat', [6, 6], (s) => {
                player(s).weapons = ['sword', 'axe'];
            });
            const { state: choosing } = run(
                state,
                { type: 'rollDice', playerId: id },
                { type: 'resolveCombat', playerId: id },
            );
            expect(choosing.turn.phase).toMatchObject({
                type: 'choosingLootDrop',
                loot: 'daggers',
            });
            expectRejected(choosing, { type: 'endTurn', playerId: id }, 'wrong-phase');
            expectRejected(
                choosing,
                { type: 'chooseLootDrop', playerId: id, drop: 'magicBolt' },
                'bad-drop',
            );
            const { state: done } = run(choosing, {
                type: 'chooseLootDrop',
                playerId: id,
                drop: 'daggers',
            });
            expect(player(done).weapons).toEqual(['sword', 'axe']);
            expect(done.board['0,-1']?.items).toEqual(['daggers']);
            expect(done.turn.phase).toEqual({ type: 'turnEnding' });
        });

        it('full key slot: the extra key can be left behind', () => {
            const { state, id } = facing('turnkey', [6, 6], (s) => {
                player(s).hasKey = true;
            });
            const { state: done } = run(
                state,
                { type: 'rollDice', playerId: id },
                { type: 'resolveCombat', playerId: id },
                { type: 'chooseLootDrop', playerId: id, drop: 'key' },
            );
            expect(player(done).hasKey).toBe(true);
            expect(done.board['0,-1']?.items).toEqual(['key']);
        });

        it('full spell slots: a carried spell can be swapped out', () => {
            const { state, id } = facing('spider', [6, 6], (s) => {
                player(s).spells = ['magicBolt', 'magicBolt', 'magicBolt'];
            });
            const { state: done } = run(
                state,
                { type: 'rollDice', playerId: id },
                { type: 'resolveCombat', playerId: id },
                { type: 'chooseLootDrop', playerId: id, drop: 'magicBolt' },
            );
            expect(player(done).spells).toEqual(['magicBolt', 'magicBolt', 'healingPortal']);
            expect(done.board['0,-1']?.items).toEqual(['magicBolt']);
        });
    });

    it('R-COMBAT-TIE: nobody is hurt, the hero retreats, the monster stays', () => {
        const { state, events } = fight('rat', [2, 3]);
        expect(player(state).hp).toBe(5);
        expect(player(state).position).toEqual({ x: 0, y: 0 });
        expect(state.board['0,-1']?.monster).toBe('rat');
        expect(eventTypes(events)).toEqual(['diceRolled', 'combatResolved', 'heroRetreated']);
    });

    it('R-COMBAT-LOSS: one wound, the hero retreats, the monster stays', () => {
        const { state, events } = fight('rat', [1, 1]);
        expect(player(state).hp).toBe(4);
        expect(player(state).position).toEqual({ x: 0, y: 0 });
        expect(state.board['0,-1']?.monster).toBe('rat');
        expect(eventTypes(events)).toEqual([
            'diceRolled',
            'combatResolved',
            'heroWounded',
            'heroRetreated',
        ]);
    });

    it('R-COMBAT-LOSS: the move into the monster stays spent (C-11)', () => {
        const { state } = fight('rat', [1, 1]);
        expect(state.turn.movesLeft).toBe(3);
    });

    it('R-RETREAT: skips tiles with monsters on the way back', () => {
        // The hero stands on a monster's tile (as a Thief using Stealth would).
        const state = newGame();
        putTiles(
            state,
            { at: { x: 0, y: -1 }, typeId: 'room-cross', monster: 'rat' },
            { at: { x: 0, y: -2 }, typeId: 'room-cross', monster: 'skeletonKing' },
        );
        player(state).position = { x: 0, y: -1 };
        state.turn.path = [
            { x: 0, y: 0 },
            { x: 0, y: -1 },
        ];
        const id = pid(state);
        const { state: inCombat } = run(state, { type: 'move', playerId: id, dir: 'N' });
        rigDice(inCombat, 1, 1);
        const { state: after, events } = run(
            inCombat,
            { type: 'rollDice', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(player(after).position).toEqual({ x: 0, y: 0 });
        expect(events.at(-1)).toMatchObject({ type: 'heroRetreated', to: { x: 0, y: 0 } });
    });

    it('R-RETREAT: after a teleport, retreats to the gate the hero arrived through', () => {
        const state = newGame();
        putTiles(
            state,
            { at: { x: 0, y: -1 }, typeId: 'gate-straight' },
            { at: { x: 5, y: 5 }, typeId: 'gate-straight' },
            { at: { x: 5, y: 4 }, typeId: 'room-cross', monster: 'skeletonKing' },
        );
        const id = pid(state);
        const { state: inCombat } = run(
            state,
            { type: 'move', playerId: id, dir: 'N' },
            { type: 'teleport', playerId: id, to: { x: 5, y: 5 } },
            { type: 'move', playerId: id, dir: 'N' },
        );
        rigDice(inCombat, 1, 1);
        const { state: after } = run(
            inCombat,
            { type: 'rollDice', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(player(after).position).toEqual({ x: 5, y: 5 });
    });

    it('R-COMBAT-END / C-14: after combat only ending the turn (optionally healing) is allowed', () => {
        const { state } = fight('rat', [3, 3]);
        const id = pid(state);
        expectRejected(state, { type: 'move', playerId: id, dir: 'S' }, 'wrong-phase');
        expectRejected(
            state,
            { type: 'endTurn', playerId: id, action: { type: 'pickUp', item: 'sword' } },
            'after-combat',
        );
        const { state: next } = run(state, { type: 'endTurn', playerId: id });
        expect(next.currentPlayerIndex).toBe(1);
    });
});

describe('hit points (§8)', () => {
    it('R-HP-2: at 0 HP the hero falls unconscious, skips the next turn and wakes with 1 HP', () => {
        const { state } = fight('rat', [1, 1], (s) => {
            player(s).hp = 1;
        });
        expect(player(state, 0)).toMatchObject({ hp: 0, unconscious: true });

        const p1 = player(state, 0).id;
        const p2 = player(state, 1).id;
        const { state: p2Turn } = run(state, { type: 'endTurn', playerId: p1 });
        expect(p2Turn.currentPlayerIndex).toBe(1);

        // p2 ends their turn; p1's turn is skipped, so it comes straight back to p2.
        const { state: after, events } = run(p2Turn, { type: 'endTurn', playerId: p2 });
        expect(after.currentPlayerIndex).toBe(1);
        expect(player(after, 0)).toMatchObject({ hp: 1, unconscious: false });
        expect(eventTypes(events)).toEqual([
            'turnEnded',
            'turnSkipped',
            'heroRecovered',
            'turnStarted',
        ]);
        // p1's skipped turn opened round 2; p2 is now playing in it.
        expect(after.round).toBe(2);
    });

    it('C-04: an unconscious hero keeps their equipment', () => {
        const { state } = fight('rat', [1, 1], (s) => {
            player(s).hp = 1;
            player(s).weapons = ['sword'];
            player(s).hasKey = true;
            player(s).treasures = ['chest'];
        });
        expect(player(state, 0)).toMatchObject({
            weapons: ['sword'],
            hasKey: true,
            treasures: ['chest'],
        });
    });
});

describe('end of game (§11)', () => {
    const strong = (s: GameState) => {
        player(s).weapons = ['axe', 'sword'];
    };

    it('R-WIN-1: defeating the dragon ends the game at once and gives the ruby', () => {
        const { state, events } = fight('dragon', [6, 6], strong);
        expect(player(state, 0).treasures).toEqual(['ruby']);
        expect(state.turn.phase).toEqual({ type: 'gameOver' });
        expect(state.result).not.toBeNull();
        expect(events.at(-1)).toMatchObject({ type: 'gameEnded' });
        expectRejected(state, { type: 'endTurn', playerId: pid(state) }, 'game-over');
    });

    it('R-WIN-2: most VP wins, even if someone else killed the dragon', () => {
        const { state } = fight('dragon', [6, 6], (s) => {
            strong(s);
            player(s, 1).treasures = ['chest', 'chest'];
        });
        expect(state.result?.scores).toEqual([
            { playerId: 'p1', vp: 1.5 },
            { playerId: 'p2', vp: 2 },
        ]);
        expect(state.result?.winnerIds).toEqual(['p2']);
    });

    it('R-TREASURE-1: chest and Fallen treasure are 1 VP, the ruby 1.5', () => {
        const { state } = fight('dragon', [6, 6], (s) => {
            strong(s);
            player(s).treasures = ['chest', 'fallen'];
        });
        expect(state.result?.scores[0]).toEqual({ playerId: 'p1', vp: 3.5 });
    });

    it('Q-01 (open): players tied on the top score are all listed as winners for now', () => {
        // The ruby's half point means the slayer can't tie, but two other players can.
        const state = newGame(['warrior', 'thief', 'wizard']);
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'room-cross', monster: 'dragon' });
        strong(state);
        player(state, 1).treasures = ['chest', 'chest'];
        player(state, 2).treasures = ['fallen', 'chest'];
        const id = pid(state);
        const { state: inCombat } = run(state, { type: 'move', playerId: id, dir: 'N' });
        rigDice(inCombat, 6, 6);
        const { state: after } = run(
            inCombat,
            { type: 'rollDice', playerId: id },
            { type: 'resolveCombat', playerId: id },
        );
        expect(after.result?.winnerIds).toEqual(['p2', 'p3']);
    });
});
