import { describe, expect, it } from 'vitest';
import { createGame, getTileType, type HeroId, MONSTERS } from '../../src/engine';

const twoPlayers = [
    { name: 'Ann', heroId: 'warrior' as HeroId },
    { name: 'Bob', heroId: 'thief' as HeroId },
];

describe('setup (§3)', () => {
    it('R-SETUP-1 / R-TILE-START: starting tile is a 4-way healing fountain at 0,0', () => {
        const { state } = createGame({ seed: 1, players: twoPlayers });
        const start = state.board['0,0'];
        expect(start).toBeDefined();
        expect(getTileType(start?.typeId ?? '')).toMatchObject({
            kind: 'fountain',
            shape: 'cross',
        });
        expect(Object.keys(state.board)).toEqual(['0,0']);
    });

    it('R-SETUP-2: the other 79 tiles are shuffled into the pile', () => {
        const { state } = createGame({ seed: 1, players: twoPlayers });
        expect(state.tilePile).toHaveLength(79);
        const other = createGame({ seed: 2, players: twoPlayers }).state;
        expect(other.tilePile).not.toEqual(state.tilePile);
        expect([...other.tilePile].sort()).toEqual([...state.tilePile].sort());
    });

    it('R-SETUP-7 / §2.1: the bag holds 43 monsters and 10 chests', () => {
        const { state } = createGame({ seed: 1, players: twoPlayers });
        expect(state.bag).toHaveLength(53);
        expect(state.bag.filter((t) => t === 'chest')).toHaveLength(10);
        for (const m of Object.values(MONSTERS)) {
            expect(state.bag.filter((t) => t === m.id)).toHaveLength(m.count);
        }
    });

    it('R-SETUP-3 / R-SETUP-5: heroes start on the start tile with 5 HP and empty sheets', () => {
        const { state } = createGame({ seed: 1, players: twoPlayers });
        for (const p of state.players) {
            expect(p).toMatchObject({
                position: { x: 0, y: 0 },
                hp: 5,
                maxHp: 5,
                weapons: [],
                spells: [],
                hasKey: false,
                treasures: [],
                unconscious: false,
                cursed: false,
            });
        }
    });

    it('R-SETUP-4: a hero can be picked only once', () => {
        expect(() =>
            createGame({
                seed: 1,
                players: [
                    { name: 'Ann', heroId: 'wizard' },
                    { name: 'Bob', heroId: 'wizard' },
                ],
            }),
        ).toThrow(/only one player/);
    });

    it('§2: allows 2 to 5 players', () => {
        const heroes: HeroId[] = ['warrior', 'thief', 'wizard', 'warlock', 'swordsman', 'oracle'];
        const make = (n: number) =>
            createGame({
                seed: 1,
                players: heroes.slice(0, n).map((heroId, i) => ({ name: `P${i}`, heroId })),
            });
        expect(() => make(1)).toThrow(/2–5 players/);
        expect(() => make(6)).toThrow(/2–5 players/);
        for (const n of [2, 3, 4, 5]) expect(make(n).state.players).toHaveLength(n);
    });

    it('R-SETUP-6: the highest starting roll goes first, ties roll again', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const { state, events } = createGame({ seed, players: twoPlayers });
            const rolls = events.filter((e) => e.type === 'startingRolls');
            const last = rolls.at(-1);
            if (last?.type !== 'startingRolls') throw new Error('missing rolls');
            const best = Math.max(...last.rolls.map((r) => r.total));
            const leaders = last.rolls.filter((r) => r.total === best);
            expect(leaders).toHaveLength(1);
            expect(state.players[state.startingPlayerIndex]?.id).toBe(leaders[0]?.playerId);
            expect(state.currentPlayerIndex).toBe(state.startingPlayerIndex);
            // Every earlier round was a tie at the top.
            for (const round of rolls.slice(0, -1)) {
                if (round.type !== 'startingRolls') continue;
                const top = Math.max(...round.rolls.map((r) => r.total));
                expect(round.rolls.filter((r) => r.total === top).length).toBeGreaterThan(1);
            }
        }
    });

    it('starts the first turn with 4 moves', () => {
        const { state, events } = createGame({ seed: 1, players: twoPlayers });
        expect(state.turn.movesLeft).toBe(4);
        expect(state.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(events.at(-1)).toMatchObject({ type: 'turnStarted', round: 1 });
    });

    it('is deterministic for a seed and stays plain JSON', () => {
        const a = createGame({ seed: 99, players: twoPlayers });
        const b = createGame({ seed: 99, players: twoPlayers });
        expect(a).toEqual(b);
        expect(JSON.parse(JSON.stringify(a.state))).toEqual(a.state);
    });

    it('rejects empty names', () => {
        expect(() =>
            createGame({
                seed: 1,
                players: [
                    { name: '  ', heroId: 'warrior' },
                    { name: 'Bob', heroId: 'thief' },
                ],
            }),
        ).toThrow(/name/);
    });
});
