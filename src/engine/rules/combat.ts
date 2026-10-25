import { kindAt, sameCoord, tileAt } from '../board';
import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import type { DiceRerollReason } from '../events';
import { slotOf, WEAPON_BONUS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { rollD6 } from '../rng';
import type { AfterCombat, Coord, GameState, ItemId, MonsterId, Phase } from '../types';
import { findPlayer, hasSkill, requireSkill } from './heroes';
import { addItem, carries, hasRoomFor, removeItem } from './inventory';
import { finishGame } from './scoring';
import { MOVES_PER_TURN } from './turn';

type CombatPhase = Extract<Phase, { type: 'combat' }>;

/** R-ROOM-c, R-MOVE-3: entering a monster's tile starts combat. */
export function startCombat(ctx: Ctx, monster: MonsterId, at: Coord): void {
    ctx.state.turn.phase = {
        type: 'combat',
        monster,
        at: { ...at },
        dice: null,
        boltsUsed: 0,
        rerolled: false,
        sacrificed: false,
        // C-24: the move into this tile was the turn's first.
        firstMove: ctx.state.turn.movesLeft === MOVES_PER_TURN - 1,
    };
    ctx.events.push({
        type: 'combatStarted',
        playerId: currentPlayer(ctx.state).id,
        monster,
        at: { ...at },
    });
}

function rolledPhase(ctx: Ctx, action: string): CombatPhase & { dice: [number, number] } {
    const phase = requirePhase(ctx.state, 'combat');
    if (!phase.dice) fail('not-rolled', `${action} only works after rolling`);
    return phase as CombatPhase & { dice: [number, number] };
}

function pushReroll(ctx: Ctx, dice: [number, number], reason: DiceRerollReason): void {
    ctx.events.push({
        type: 'diceRerolled',
        playerId: currentPlayer(ctx.state).id,
        dice: [...dice],
        reason,
    });
}

/** Swordsman's Combat Training (C-19): any 1 is rerolled until it isn't. */
function applyCombatTraining(ctx: Ctx, dice: [number, number]): void {
    if (!hasSkill(currentPlayer(ctx.state), 'swordsman') || !dice.includes(1)) return;
    for (const i of [0, 1] as const) {
        while (dice[i] === 1) dice[i] = rollD6(ctx.state);
    }
    pushReroll(ctx, dice, 'combatTraining');
}

/** R-COMBAT-1 step 1 */
export function rollDice(ctx: Ctx): void {
    const phase = requirePhase(ctx.state, 'combat');
    if (phase.dice) fail('already-rolled', 'The dice have already been rolled');
    const dice: [number, number] = [rollD6(ctx.state), rollD6(ctx.state)];
    phase.dice = dice;
    ctx.events.push({ type: 'diceRolled', playerId: currentPlayer(ctx.state).id, dice: [...dice] });
    applyCombatTraining(ctx, dice);
}

/** Warrior's Double Attack (C-12): reroll both dice once per combat, after any first roll. */
export function reroll(ctx: Ctx): void {
    const phase = rolledPhase(ctx, 'Double Attack');
    requireSkill(currentPlayer(ctx.state), 'warrior', 'Double Attack');
    if (phase.rerolled) fail('already-rerolled', 'Double Attack can be used once per combat');
    phase.dice = [rollD6(ctx.state), rollD6(ctx.state)];
    phase.rerolled = true;
    pushReroll(ctx, phase.dice, 'doubleAttack');
}

/** Warlock's Sacrifice (C-21): 1 HP for +1, once per combat, after the roll. */
export function sacrifice(ctx: Ctx): void {
    const phase = rolledPhase(ctx, 'Sacrifice');
    const player = currentPlayer(ctx.state);
    requireSkill(player, 'warlock', 'Sacrifice');
    if (phase.sacrificed) fail('already-sacrificed', 'Sacrifice can be used once per combat');
    if (player.hp <= 0) fail('no-hp', 'No HP left to sacrifice');
    player.hp--;
    phase.sacrificed = true;
    ctx.events.push({ type: 'hpSacrificed', playerId: player.id, hp: player.hp });
    if (player.hp === 0) knockOut(ctx);
}

/** Thief's Stealth (C-17): skip the fight before rolling and keep moving. */
export function evade(ctx: Ctx): void {
    const phase = requirePhase(ctx.state, 'combat');
    const player = currentPlayer(ctx.state);
    requireSkill(player, 'thief', 'Stealth');
    if (phase.dice) fail('already-rolled', 'Stealth must be used before rolling');
    ctx.state.turn.phase = { type: 'awaitingAction' };
    ctx.events.push({
        type: 'monsterEvaded',
        playerId: player.id,
        monster: phase.monster,
        at: { ...phase.at },
    });
}

/**
 * R-BOLT-1: +1 per bolt, only after the roll; the spell is discarded (R-SPELL-1).
 * Wizard's Magical Affinity (C-18): bolts aren't discarded, but each one counts once per fight.
 */
export function useBolt(ctx: Ctx): void {
    const phase = rolledPhase(ctx, 'Magic Bolt');
    const player = currentPlayer(ctx.state);
    if (hasSkill(player, 'wizard')) {
        const owned = player.spells.filter((s) => s === 'magicBolt').length;
        if (phase.boltsUsed >= owned) fail('no-bolt', 'Every Magic Bolt has been used this fight');
    } else {
        if (!carries(player, 'magicBolt')) fail('no-bolt', 'No Magic Bolt to use');
        removeItem(player, 'magicBolt');
    }
    phase.boltsUsed++;
    ctx.events.push({ type: 'boltUsed', playerId: player.id });
}

export interface CombatBreakdown {
    dice: [number, number];
    weapons: number;
    bolts: number;
    sacrifice: number;
    farseeing: number;
    total: number;
}

/** R-COMBAT-1: dice + every carried weapon + bolts + skill bonuses. Null before the roll. */
export function combatBreakdown(state: GameState): CombatBreakdown | null {
    const phase = state.turn.phase;
    if (phase.type !== 'combat' || !phase.dice) return null;
    const player = currentPlayer(state);
    const weapons = player.weapons.reduce((sum, w) => sum + WEAPON_BONUS[w], 0);
    const sacrificeBonus = phase.sacrificed ? 1 : 0;
    const farseeing = hasSkill(player, 'oracle') && phase.firstMove ? 1 : 0;
    return {
        dice: [...phase.dice],
        weapons,
        bolts: phase.boltsUsed,
        sacrifice: sacrificeBonus,
        farseeing,
        total:
            phase.dice[0] + phase.dice[1] + weapons + phase.boltsUsed + sacrificeBonus + farseeing,
    };
}

export function combatTotal(state: GameState): number | null {
    return combatBreakdown(state)?.total ?? null;
}

export function resolveCombat(ctx: Ctx): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'combat');
    const breakdown = combatBreakdown(state);
    if (!breakdown) fail('not-rolled', 'Roll the dice first');
    const { total, dice } = breakdown;
    const player = currentPlayer(state);
    const monster = MONSTERS[phase.monster];
    let result: 'win' | 'tie' | 'loss' =
        total > monster.strength ? 'win' : total === monster.strength ? 'tie' : 'loss';
    // Thief's Backstab: ties become wins.
    if (result === 'tie' && hasSkill(player, 'thief')) result = 'win';
    ctx.events.push({
        type: 'combatResolved',
        playerId: player.id,
        monster: monster.id,
        total,
        strength: monster.strength,
        result,
    });
    // Swordsman's Unstoppable (C-19): a 6 on either die lets the turn go on.
    const unstoppable = hasSkill(player, 'swordsman') && dice.includes(6);
    const after = (): AfterCombat =>
        unstoppable && !player.unconscious ? 'continueTurn' : 'endTurn';

    if (result === 'win') {
        // R-COMBAT-WIN: the monster is gone and its token becomes loot.
        const tile = tileAt(state, phase.at);
        if (tile) tile.monster = null;
        const loot = monster.loot;
        if (loot.type === 'treasure') {
            player.treasures.push(loot.treasure);
            ctx.events.push({
                type: 'treasureTaken',
                playerId: player.id,
                treasure: loot.treasure,
            });
            if (monster.id === 'dragon') {
                finishGame(ctx);
                return;
            }
        } else if (hasRoomFor(player, loot.item)) {
            addItem(player, loot.item);
            ctx.events.push({ type: 'lootTaken', playerId: player.id, item: loot.item });
        } else {
            state.turn.phase = {
                type: 'choosingLootDrop',
                loot: loot.item,
                at: { ...phase.at },
                monster: monster.id,
                after: after(),
            };
            return;
        }
        afterLoot(ctx, monster.id, after());
        return;
    }

    if (result === 'loss') {
        // R-COMBAT-LOSS, R-HP-1
        player.hp = Math.max(0, player.hp - 1);
        ctx.events.push({ type: 'heroWounded', playerId: player.id, hp: player.hp });
        if (player.hp === 0) {
            // Warrior's Reincarnation (C-20) replaces both the retreat and unconsciousness.
            if (hasSkill(player, 'warrior')) {
                state.turn.phase = { type: 'choosingFountain' };
                return;
            }
            knockOut(ctx);
        }
    }
    retreat(ctx);
    endCombat(ctx, after());
}

/** R-HP-2 */
function knockOut(ctx: Ctx): void {
    const player = currentPlayer(ctx.state);
    if (player.unconscious) return;
    player.unconscious = true;
    ctx.events.push({ type: 'heroFellUnconscious', playerId: player.id });
}

/** R-COMBAT-END, or Unstoppable's continued turn. */
function endCombat(ctx: Ctx, after: AfterCombat): void {
    if (after === 'continueTurn') {
        ctx.state.turn.phase = { type: 'awaitingAction' };
        ctx.events.push({
            type: 'turnContinues',
            playerId: currentPlayer(ctx.state).id,
            reason: 'unstoppable',
        });
    } else {
        ctx.state.turn.phase = { type: 'turnEnding' };
    }
}

function afterLoot(ctx: Ctx, monster: MonsterId, after: AfterCombat): void {
    // R-CURSE-1
    if (monster === 'mummy') ctx.state.turn.phase = { type: 'choosingCurseTarget', after };
    else endCombat(ctx, after);
}

/**
 * R-RETREAT, C-05: walk back along this turn's path to the first tile without a monster.
 * Falls back to the turn's first tile (which only a Thief can share with a monster, C-17).
 */
function retreat(ctx: Ctx): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    const path = state.turn.path;
    let target = path[0] ?? player.position;
    for (let i = path.length - 2; i >= 0; i--) {
        const c = path[i];
        if (c && !sameCoord(c, player.position) && !tileAt(state, c)?.monster) {
            target = c;
            break;
        }
    }
    const from = { ...player.position };
    player.position = { ...target };
    path.push({ ...target });
    ctx.events.push({ type: 'heroRetreated', playerId: player.id, from, to: { ...target } });
}

/** R-COMBAT-WIN with a full slot: drop the new loot or a carried item of the same slot. */
export function chooseLootDrop(ctx: Ctx, drop: ItemId): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'choosingLootDrop');
    const player = currentPlayer(state);
    const tile = tileAt(state, phase.at);
    if (!tile) throw new Error('Loot tile missing');
    const at = { ...phase.at };

    if (drop === phase.loot) {
        tile.items.push(drop);
        ctx.events.push({ type: 'itemDropped', playerId: player.id, item: drop, at });
    } else {
        if (slotOf(drop) !== slotOf(phase.loot) || !carries(player, drop)) {
            fail('bad-drop', 'Drop the new item or one you carry in the same slot');
        }
        removeItem(player, drop);
        tile.items.push(drop);
        addItem(player, phase.loot);
        ctx.events.push({ type: 'itemDropped', playerId: player.id, item: drop, at });
        ctx.events.push({ type: 'lootTaken', playerId: player.id, item: phase.loot });
    }
    afterLoot(ctx, phase.monster, phase.after);
}

/**
 * R-CURSE-1, C-23: curse another player. Once the curse is in play the slayer may instead
 * leave it where it is (`targetId` null).
 */
export function placeCurse(ctx: Ctx, targetId: string | null): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'choosingCurseTarget');
    const player = currentPlayer(state);
    const holder = state.players.find((p) => p.cursed) ?? null;
    if (targetId === null) {
        if (!holder) fail('curse-required', 'Choose a player to curse');
        ctx.events.push({ type: 'curseKept', playerId: player.id, holderId: holder.id });
    } else {
        const target = findPlayer(ctx, targetId);
        if (target.id === player.id) fail('bad-target', 'The curse must go to another player');
        if (holder) holder.cursed = false;
        target.cursed = true;
        ctx.events.push({
            type: 'cursePlaced',
            playerId: player.id,
            targetId,
            fromId: holder?.id ?? null,
        });
    }
    endCombat(ctx, phase.after);
}

/** Warrior's Reincarnation (C-20): wake at any revealed fountain with full HP; the turn ends. */
export function chooseFountain(ctx: Ctx, to: Coord): void {
    const { state } = ctx;
    requirePhase(state, 'choosingFountain');
    if (kindAt(state, to) !== 'fountain') fail('no-fountain', 'Pick a revealed healing fountain');
    const player = currentPlayer(state);
    const from = { ...player.position };
    player.position = { ...to };
    player.hp = player.maxHp;
    state.turn.path.push({ ...to });
    ctx.events.push({
        type: 'heroReincarnated',
        playerId: player.id,
        from,
        to: { ...to },
        hp: player.hp,
    });
    state.turn.phase = { type: 'turnEnding' };
}
