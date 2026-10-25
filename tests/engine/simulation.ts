import {
    applyCommand,
    combatTotal,
    type Command,
    createGame,
    currentPlayer,
    type GameState,
    getTileType,
    HERO_IDS,
    type ItemId,
    legalCommands,
    MONSTERS,
} from '../../src/engine';
import { randomInt, type RngHolder } from '../../src/engine/rng';

const ITEM_VALUE: Record<ItemId, number> = {
    daggers: 1,
    sword: 2,
    axe: 3,
    magicBolt: 2,
    healingPortal: 1,
    key: 1,
};

/**
 * A simple bot: explores at random, always fights, spends bolts only when they could change
 * the result, heals when hurt, opens chests and picks up upgrades. Only ever sends commands
 * from legalCommands, so it doubles as a fuzzer for the rules.
 */
export function chooseCommand(state: GameState, legal: Command[], bot: RngHolder): Command {
    const pick = (cs: Command[]) => cs[randomInt(bot, cs.length)] as Command;
    const find = (pred: (c: Command) => boolean) => legal.find(pred);
    const phase = state.turn.phase;
    const me = currentPlayer(state);

    switch (phase.type) {
        case 'combat': {
            const strength = MONSTERS[phase.monster].strength;
            const evade = find((c) => c.type === 'evade');
            if (evade && strength >= 10 && randomInt(bot, 2) === 0) return evade;
            const roll = find((c) => c.type === 'rollDice');
            if (roll) return roll;
            const total = combatTotal(state) ?? 0;
            if (total <= strength) {
                const boost =
                    find((c) => c.type === 'reroll' && total < strength) ??
                    find((c) => c.type === 'useBolt') ??
                    find((c) => c.type === 'sacrifice' && me.hp > 1);
                if (boost) return boost;
            }
            return find((c) => c.type === 'resolveCombat') ?? pick(legal);
        }
        case 'choosingToken': {
            // Fateweaver: prefer a chest, else the weakest monster.
            const score = (c: Command) =>
                c.type !== 'chooseToken'
                    ? 99
                    : c.token === 'chest'
                      ? 0
                      : MONSTERS[c.token].strength;
            return [...legal].sort((a, b) => score(a) - score(b))[0] ?? pick(legal);
        }
        case 'choosingLootDrop': {
            const drops = legal.filter((c) => c.type === 'chooseLootDrop');
            drops.sort((a, b) =>
                a.type === 'chooseLootDrop' && b.type === 'chooseLootDrop'
                    ? ITEM_VALUE[a.drop] - ITEM_VALUE[b.drop]
                    : 0,
            );
            return drops[0] ?? pick(legal);
        }
        case 'turnEnding':
        case 'awaitingAction': {
            const action = (t: string) => find((c) => c.type === 'endTurn' && c.action?.type === t);
            const chest = action('openChest');
            if (chest) return chest;
            const heal = action('heal');
            if (heal && me.hp < me.maxHp && (me.hp <= 2 || phase.type === 'turnEnding'))
                return heal;
            const selfPortal = find((c) => c.type === 'castPortal' && c.targetId === me.id);
            if (selfPortal && me.hp <= 2) return selfPortal;
            const swap = find((c) => c.type === 'magicSwap');
            if (swap && randomInt(bot, 20) === 0) return swap;
            const plainPickUp = find(
                (c) => c.type === 'endTurn' && c.action?.type === 'pickUp' && !c.action.drop,
            );
            if (plainPickUp) return plainPickUp;
            const moves = legal.filter((c) => c.type === 'move' || c.type === 'teleport');
            if (moves.length > 0 && randomInt(bot, 10) > 0) return pick(moves);
            return find((c) => c.type === 'endTurn' && !c.action) ?? pick(legal);
        }
        default:
            return pick(legal);
    }
}

export interface SimulationResult {
    finished: boolean;
    steps: number;
    rounds: number;
    state: GameState;
}

/** Plays one game with the bot; calls `check` after every accepted command. */
export function simulate(
    seed: number,
    playerCount: number,
    maxSteps: number,
    check: (state: GameState) => void,
): SimulationResult {
    let { state } = createGame({
        seed,
        // Rotate the hero line-up with the seed so every hero gets played.
        players: Array.from({ length: playerCount }, (_, i) => ({
            name: `Bot ${i + 1}`,
            heroId: HERO_IDS[(seed + i) % HERO_IDS.length] as (typeof HERO_IDS)[number],
        })),
    });
    const bot: RngHolder = { rng: seed * 7919 };
    check(state);
    let steps = 0;
    while (!state.result && steps < maxSteps) {
        const legal = legalCommands(state);
        if (legal.length === 0) throw new Error(`No legal command at step ${steps} (seed ${seed})`);
        const command = chooseCommand(state, legal, bot);
        const result = applyCommand(state, command);
        if (!result.ok) throw new Error(`Legal command rejected: ${result.code} (seed ${seed})`);
        state = result.state;
        steps++;
        check(state);
    }
    return { finished: !!state.result, steps, rounds: state.round, state };
}

/** Rule invariants that must hold after every command. */
export function checkInvariants(state: GameState): void {
    const fail = (msg: string) => {
        throw new Error(`Invariant broken: ${msg}`);
    };
    const tiles = Object.values(state.board);
    if (tiles.length + state.tilePile.length + pendingTile(state) !== 80) fail('tile count');
    let monstersOnBoard = 0;
    for (const t of tiles) {
        getTileType(t.typeId);
        if (t.monster) monstersOnBoard++;
        if (t.monster && getTileType(t.typeId).kind !== 'room') fail('monster outside a room');
    }
    const monstersInBag = state.bag.filter((b) => b !== 'chest').length;
    if (monstersOnBoard + monstersInBag > 43) fail('too many monsters');
    for (const p of state.players) {
        if (p.hp < 0 || p.hp > p.maxHp) fail(`hp ${p.hp}`);
        if (p.weapons.length > 2) fail('weapons > 2');
        if (p.spells.length > 3) fail('spells > 3');
        if (!state.board[`${p.position.x},${p.position.y}`]) fail('hero off the board');
        if (p.unconscious && p.hp !== 0) fail('unconscious with HP');
    }
    // §2: there is one curse token.
    if (state.players.filter((p) => p.cursed).length > 1) fail('more than one cursed hero');
    if (state.turn.movesLeft < 0 || state.turn.movesLeft > 4) fail('moves out of range');
    if (state.result && state.turn.phase.type !== 'gameOver') fail('result without gameOver');
}

function pendingTile(state: GameState): number {
    return state.turn.phase.type === 'placingTile' ? 1 : 0;
}
