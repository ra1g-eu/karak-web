import { describe, expect, it } from 'vitest';
import { combatBreakdown, type Command, type GameState } from '../../src/engine';
import {
    enterFight,
    eventTypes,
    expectRejected,
    gameAs,
    newGame,
    player,
    putTiles,
    resetTurn,
    run,
    stackBag,
    stackPile,
} from './helpers';

const c = (
    type: 'rollDice' | 'resolveCombat' | 'reroll' | 'sacrifice' | 'evade' | 'useBolt',
    playerId = 'p1',
): Command => ({
    type,
    playerId,
});
const cursed = (s: GameState) => {
    player(s).cursed = true;
    return s;
};

describe('Horan, the Warrior', () => {
    it('Double Attack: may reroll both dice once; a losing first roll costs nothing', () => {
        const state = enterFight(gameAs('warrior'), 'skeletonKing', 2, 2, 6, 6);
        const { state: after, events } = run(state, c('rollDice'), c('reroll'), c('resolveCombat'));
        expect(events).toContainEqual({
            type: 'diceRerolled',
            playerId: 'p1',
            dice: [6, 6],
            reason: 'doubleAttack',
        });
        expect(events).toContainEqual(
            expect.objectContaining({ type: 'combatResolved', result: 'win' }),
        );
        expect(player(after).hp).toBe(5);
        expect(player(after).weapons).toEqual(['axe']);
    });

    it('Double Attack: the second roll stands', () => {
        const state = enterFight(gameAs('warrior'), 'skeletonKing', 6, 6, 1, 1);
        const { state: after } = run(state, c('rollDice'), c('reroll'), c('resolveCombat'));
        expect(player(after).hp).toBe(4);
    });

    it('C-12: Double Attack only once, only after rolling, even after a winning roll', () => {
        const state = enterFight(gameAs('warrior'), 'rat', 6, 6, 2, 2);
        expectRejected(state, c('reroll'), 'not-rolled');
        const { state: rolled } = run(state, c('rollDice'));
        const { state: rerolled } = run(rolled, c('reroll'));
        expectRejected(rerolled, c('reroll'), 'already-rerolled');
    });

    it('Double Attack belongs to the Warrior, and the curse takes it away', () => {
        const { state: other } = run(enterFight(newGame(), 'rat', 2, 2), c('rollDice'));
        expectRejected(other, c('reroll'), 'no-skill');
        const { state: cursedWarrior } = run(
            enterFight(cursed(gameAs('warrior')), 'rat', 2, 2),
            c('rollDice'),
        );
        expectRejected(cursedWarrior, c('reroll'), 'no-skill');
    });

    it('Reincarnation (C-20): at 0 HP he wakes at a fountain of his choice, fully healed', () => {
        const start = gameAs('warrior');
        player(start).hp = 1;
        putTiles(start, { at: { x: 4, y: 4 }, typeId: 'fountain-cross' });
        const state = enterFight(start, 'skeletonKing', 1, 1);
        const { state: dying, events } = run(state, c('rollDice'), c('resolveCombat'));
        expect(dying.turn.phase).toEqual({ type: 'choosingFountain' });
        expect(eventTypes(events)).not.toContain('heroRetreated');
        expect(eventTypes(events)).not.toContain('heroFellUnconscious');

        expectRejected(
            dying,
            { type: 'chooseFountain', playerId: 'p1', to: { x: 0, y: -1 } },
            'no-fountain',
        );
        const { state: after } = run(dying, {
            type: 'chooseFountain',
            playerId: 'p1',
            to: { x: 4, y: 4 },
        });
        expect(player(after)).toMatchObject({
            position: { x: 4, y: 4 },
            hp: 5,
            unconscious: false,
        });
        // His turn still ends.
        expect(after.turn.phase).toEqual({ type: 'turnEnding' });
    });

    it('Reincarnation is lost to the curse: he falls unconscious like the others', () => {
        const start = cursed(gameAs('warrior'));
        player(start).hp = 1;
        const { state } = run(
            enterFight(start, 'skeletonKing', 1, 1),
            c('rollDice'),
            c('resolveCombat'),
        );
        expect(player(state)).toMatchObject({ hp: 0, unconscious: true, position: { x: 0, y: 0 } });
    });
});

describe('Aderyn, the Thief', () => {
    it('Backstab: she wins ties', () => {
        const { state, events } = run(
            enterFight(gameAs('thief'), 'rat', 2, 3),
            c('rollDice'),
            c('resolveCombat'),
        );
        expect(events).toContainEqual(
            expect.objectContaining({
                type: 'combatResolved',
                total: 5,
                strength: 5,
                result: 'win',
            }),
        );
        expect(player(state).weapons).toEqual(['daggers']);
    });

    it('Backstab is lost to the curse', () => {
        const { state } = run(
            enterFight(cursed(gameAs('thief')), 'rat', 2, 3),
            c('rollDice'),
            c('resolveCombat'),
        );
        expect(player(state).position).toEqual({ x: 0, y: 0 });
    });

    it('Stealth (C-17): she can skip the fight before rolling and keep moving', () => {
        const state = enterFight(gameAs('thief'), 'skeletonKing');
        const { state: after, events } = run(state, c('evade'));
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(player(after).position).toEqual({ x: 0, y: -1 });
        expect(after.board['0,-1']?.monster).toBe('skeletonKing');
        expect(after.turn.movesLeft).toBe(3);
        expect(events).toEqual([
            { type: 'monsterEvaded', playerId: 'p1', monster: 'skeletonKing', at: { x: 0, y: -1 } },
        ]);
        // Moving off the monster's tile is a normal move.
        const { state: moved } = run(after, { type: 'move', playerId: 'p1', dir: 'S' });
        expect(player(moved).position).toEqual({ x: 0, y: 0 });
    });

    it('Stealth (C-17): ending a turn on a monster’s tile doesn’t start a fight next turn', () => {
        const { state } = run(enterFight(gameAs('thief'), 'skeletonKing'), c('evade'), {
            type: 'endTurn',
            playerId: 'p1',
        });
        const { state: back } = run(state, { type: 'endTurn', playerId: 'p2' });
        expect(back.currentPlayerIndex).toBe(0);
        expect(back.turn.phase).toEqual({ type: 'awaitingAction' });
    });

    it('Stealth must come before the roll, and the curse takes it away', () => {
        const { state: rolled } = run(enterFight(gameAs('thief'), 'rat', 1, 1), c('rollDice'));
        expectRejected(rolled, c('evade'), 'already-rolled');
        expectRejected(enterFight(cursed(gameAs('thief')), 'rat'), c('evade'), 'no-skill');
        expectRejected(enterFight(newGame(), 'rat'), c('evade'), 'no-skill');
    });
});

describe('Argentus, the Wizard', () => {
    it('Magical Affinity (C-18): his bolts stay, but each counts once per fight', () => {
        const start = gameAs('wizard');
        player(start).spells = ['magicBolt', 'magicBolt'];
        const state = enterFight(start, 'skeletonKing', 4, 3);
        const { state: boosted } = run(state, c('rollDice'), c('useBolt'), c('useBolt'));
        expect(combatBreakdown(boosted)?.total).toBe(9);
        expectRejected(boosted, c('useBolt'), 'no-bolt');
        const { state: after } = run(boosted, c('resolveCombat'));
        expect(player(after).spells).toEqual(['magicBolt', 'magicBolt']);
    });

    it('Magical Affinity is lost to the curse: bolts are discarded', () => {
        const start = cursed(gameAs('wizard'));
        player(start).spells = ['magicBolt'];
        const { state } = run(enterFight(start, 'rat', 1, 1), c('rollDice'), c('useBolt'));
        expect(player(state).spells).toEqual([]);
    });

    it('Astral Walking: walks through walls between discovered tiles', () => {
        const state = gameAs('wizard');
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight', rotation: 1 }); // E–W
        const { state: after } = run(state, { type: 'move', playerId: 'p1', dir: 'N' });
        expect(player(after).position).toEqual({ x: 0, y: -1 });
        expect(after.turn.movesLeft).toBe(3);
    });

    it('Astral Walking doesn’t help exploring (C-01)', () => {
        const state = gameAs('wizard');
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight', rotation: 1 });
        player(state).position = { x: 0, y: -1 };
        resetTurn(state, 0);
        expectRejected(state, { type: 'move', playerId: 'p1', dir: 'N' }, 'wall');
    });

    it('Astral Walking is lost to the curse', () => {
        const state = cursed(gameAs('wizard'));
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight', rotation: 1 });
        expectRejected(state, { type: 'move', playerId: 'p1', dir: 'N' }, 'wall');
    });
});

describe('Lord Xanros, the Warlock', () => {
    it('Sacrifice (C-21): 1 HP for +1 after the roll, once per fight', () => {
        const state = enterFight(gameAs('warlock'), 'spider', 3, 3);
        expectRejected(state, c('sacrifice'), 'not-rolled');
        const { state: paid, events } = run(state, c('rollDice'), c('sacrifice'));
        expect(player(paid).hp).toBe(4);
        expect(combatBreakdown(paid)).toMatchObject({ sacrifice: 1, total: 7 });
        expect(events.at(-1)).toEqual({ type: 'hpSacrificed', playerId: 'p1', hp: 4 });
        expectRejected(paid, c('sacrifice'), 'already-sacrificed');
        const { state: after } = run(paid, c('resolveCombat'));
        expect(player(after).spells).toEqual(['healingPortal']);
    });

    it('Sacrifice: giving his last HP knocks him out next turn, but the fight still counts', () => {
        const start = gameAs('warlock');
        player(start).hp = 1;
        const { state, events } = run(
            enterFight(start, 'spider', 3, 3),
            c('rollDice'),
            c('sacrifice'),
            c('resolveCombat'),
        );
        expect(player(state)).toMatchObject({
            hp: 0,
            unconscious: true,
            spells: ['healingPortal'],
        });
        expect(eventTypes(events)).toContain('heroFellUnconscious');
    });

    it('Sacrifice is lost to the curse', () => {
        const { state } = run(enterFight(cursed(gameAs('warlock')), 'spider', 3, 3), c('rollDice'));
        expectRejected(state, c('sacrifice'), 'no-skill');
    });

    it('Magic Swap (C-21): trades places for all 4 moves; he may still use his new tile', () => {
        const state = gameAs('warlock');
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' });
        Object.assign(player(state), { position: { x: 0, y: -1 }, hp: 2 });
        resetTurn(state, 0);
        const { state: swapped, events } = run(state, {
            type: 'magicSwap',
            playerId: 'p1',
            targetId: 'p2',
        });
        expect(player(swapped, 0).position).toEqual({ x: 0, y: 0 });
        expect(player(swapped, 1).position).toEqual({ x: 0, y: -1 });
        expect(swapped.turn.movesLeft).toBe(0);
        expect(events[0]).toMatchObject({ type: 'heroesSwapped', targetId: 'p2' });
        expectRejected(swapped, { type: 'move', playerId: 'p1', dir: 'N' }, 'no-moves');
        // Now on the start fountain, he can heal as his turn ends.
        const { state: healed } = run(swapped, {
            type: 'endTurn',
            playerId: 'p1',
            action: { type: 'heal' },
        });
        expect(player(healed, 0).hp).toBe(5);
    });

    it('Magic Swap only at the start of his turn, with another hero, while uncursed', () => {
        const state = gameAs('warlock');
        putTiles(state, { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' });
        const { state: moved } = run(state, { type: 'move', playerId: 'p1', dir: 'N' });
        expectRejected(
            moved,
            { type: 'magicSwap', playerId: 'p1', targetId: 'p2' },
            'swap-start-only',
        );
        expectRejected(state, { type: 'magicSwap', playerId: 'p1', targetId: 'p1' }, 'bad-target');
        expectRejected(
            cursed(gameAs('warlock')),
            { type: 'magicSwap', playerId: 'p1', targetId: 'p2' },
            'no-skill',
        );
        expectRejected(
            gameAs('thief'),
            { type: 'magicSwap', playerId: 'p1', targetId: 'p2' },
            'no-skill',
        );
    });
});

describe('Victorius, the Swordsman', () => {
    it('Combat Training (C-19): any 1 is rerolled until it isn’t', () => {
        const state = enterFight(gameAs('swordsman'), 'rat', 1, 4, 1, 3);
        const { state: rolled, events } = run(state, c('rollDice'));
        expect(events).toEqual([
            { type: 'diceRolled', playerId: 'p1', dice: [1, 4] },
            { type: 'diceRerolled', playerId: 'p1', dice: [3, 4], reason: 'combatTraining' },
        ]);
        expect(combatBreakdown(rolled)?.dice).toEqual([3, 4]);
    });

    it('Combat Training is lost to the curse', () => {
        const { state } = run(enterFight(cursed(gameAs('swordsman')), 'rat', 1, 4), c('rollDice'));
        expect(combatBreakdown(state)?.dice).toEqual([1, 4]);
    });

    it('Unstoppable (C-19): a 6 lets him carry on after winning', () => {
        const { state, events } = run(
            enterFight(gameAs('swordsman'), 'rat', 6, 2),
            c('rollDice'),
            c('resolveCombat'),
        );
        expect(state.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(state.turn.movesLeft).toBe(3);
        expect(events.at(-1)).toEqual({
            type: 'turnContinues',
            playerId: 'p1',
            reason: 'unstoppable',
        });
    });

    it('Unstoppable: after a loss he can even fight the same monster again', () => {
        const state = enterFight(gameAs('swordsman'), 'skeletonKing', 6, 2);
        const { state: lost } = run(state, c('rollDice'), c('resolveCombat'));
        expect(player(lost)).toMatchObject({ hp: 4, position: { x: 0, y: 0 } });
        expect(lost.turn.phase).toEqual({ type: 'awaitingAction' });
        const { state: again } = run(lost, { type: 'move', playerId: 'p1', dir: 'N' });
        expect(again.turn.phase).toMatchObject({ type: 'combat', monster: 'skeletonKing' });
        expect(again.turn.movesLeft).toBe(2);
    });

    it('without a 6, or when knocked out, or cursed, the turn ends as usual', () => {
        const noSix = run(
            enterFight(gameAs('swordsman'), 'rat', 3, 3),
            c('rollDice'),
            c('resolveCombat'),
        ).state;
        expect(noSix.turn.phase).toEqual({ type: 'turnEnding' });

        const weak = gameAs('swordsman');
        player(weak).hp = 1;
        const out = run(
            enterFight(weak, 'skeletonKing', 6, 2),
            c('rollDice'),
            c('resolveCombat'),
        ).state;
        expect(player(out).unconscious).toBe(true);
        expect(out.turn.phase).toEqual({ type: 'turnEnding' });

        const hexed = run(
            enterFight(cursed(gameAs('swordsman')), 'rat', 6, 2),
            c('rollDice'),
            c('resolveCombat'),
        ).state;
        expect(hexed.turn.phase).toEqual({ type: 'turnEnding' });
    });

    it('Unstoppable after slaying a Mummy: the curse is placed, then the turn goes on', () => {
        const { state } = run(
            enterFight(gameAs('swordsman'), 'mummy', 6, 2),
            c('rollDice'),
            c('resolveCombat'),
        );
        expect(state.turn.phase).toEqual({ type: 'choosingCurseTarget', after: 'continueTurn' });
        const { state: after } = run(state, { type: 'placeCurse', playerId: 'p1', targetId: 'p2' });
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
    });
});

describe('Taia, the Oracle', () => {
    it('Farseeing (C-24): +1 when the fight is on her first move', () => {
        const { state } = run(enterFight(gameAs('oracle'), 'rat', 2, 2), c('rollDice'));
        expect(combatBreakdown(state)).toMatchObject({ farseeing: 1, total: 5 });
    });

    it('Farseeing: no bonus on a later move, or when cursed', () => {
        const state = gameAs('oracle');
        putTiles(
            state,
            { at: { x: 0, y: -1 }, typeId: 'tunnel-straight' },
            { at: { x: 0, y: -2 }, typeId: 'room-cross', monster: 'rat' },
        );
        const { state: inCombat } = run(
            state,
            { type: 'move', playerId: 'p1', dir: 'N' },
            { type: 'move', playerId: 'p1', dir: 'N' },
            c('rollDice'),
        );
        expect(combatBreakdown(inCombat)?.farseeing).toBe(0);

        const hexed = run(enterFight(cursed(gameAs('oracle')), 'rat', 2, 2), c('rollDice')).state;
        expect(combatBreakdown(hexed)?.farseeing).toBe(0);
    });

    function exploreRoom(state: GameState) {
        stackPile(state, 'room-cross');
        return run(
            state,
            { type: 'move', playerId: 'p1', dir: 'N' },
            { type: 'placeTile', playerId: 'p1', rotation: 0 },
        );
    }

    it('Fateweaver (C-22): draws two tokens, places one, returns the other', () => {
        const start = gameAs('oracle');
        stackBag(start, 'skeletonKing', 'chest');
        const bagSize = start.bag.length;
        const { state, events } = exploreRoom(start);
        expect(state.turn.phase).toEqual({
            type: 'choosingToken',
            at: { x: 0, y: -1 },
            options: ['skeletonKing', 'chest'],
        });
        expect(state.bag).toHaveLength(bagSize - 2);
        expect(events.at(-1)).toMatchObject({
            type: 'tokensDrawn',
            options: ['skeletonKing', 'chest'],
        });

        expectRejected(
            state,
            { type: 'chooseToken', playerId: 'p1', token: 'dragon' },
            'bad-token',
        );
        const { state: after, events: chosen } = run(state, {
            type: 'chooseToken',
            playerId: 'p1',
            token: 'chest',
        });
        expect(after.board['0,-1']).toMatchObject({ chest: true, monster: null });
        expect(after.bag).toHaveLength(bagSize - 1);
        expect(after.turn.phase).toEqual({ type: 'awaitingAction' });
        expect(eventTypes(chosen)).toEqual(['tokenReturned', 'tokenDrawn']);
    });

    it('Fateweaver: choosing the monster starts the fight, with Farseeing on a first move', () => {
        const start = gameAs('oracle');
        stackBag(start, 'rat', 'chest');
        const { state } = exploreRoom(start);
        const { state: fight } = run(state, { type: 'chooseToken', playerId: 'p1', token: 'rat' });
        expect(fight.turn.phase).toMatchObject({ type: 'combat', monster: 'rat', firstMove: true });
    });

    it('Fateweaver: a single token left, or a curse, means a normal draw', () => {
        const lastOne = gameAs('oracle');
        lastOne.bag = ['chest'];
        expect(exploreRoom(lastOne).state.board['0,-1']?.chest).toBe(true);

        const hexed = cursed(gameAs('oracle'));
        stackBag(hexed, 'chest', 'rat');
        expect(exploreRoom(hexed).state.board['0,-1']?.chest).toBe(true);
    });
});
