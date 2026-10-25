import {
    type BagToken,
    type GameEvent,
    type GameState,
    getTileType,
    HEROES,
    type HeroId,
    ITEM_NAMES,
    MONSTERS,
    type TileKind,
    type TileShape,
    type TreasureId,
} from '../engine';

/** Short skill summaries for the setup screen and player cards (RULES §12). */
export const HERO_SKILLS: Record<HeroId, [string, string][]> = {
    warrior: [
        ['Double Attack', 'Reroll both dice once per fight.'],
        [
            'Reincarnation',
            'At 0 HP, wake at a fountain fully healed instead of falling unconscious.',
        ],
    ],
    thief: [
        ['Backstab', 'Wins every fight that would be a tie.'],
        ['Stealth', 'May skip a monster’s fight and keep moving.'],
    ],
    wizard: [
        ['Magical Affinity', 'Magic Bolts aren’t used up.'],
        ['Astral Walking', 'Walks through walls between discovered tiles.'],
    ],
    warlock: [
        ['Sacrifice', 'Spend 1 HP for +1 in a fight, once per fight.'],
        ['Magic Swap', 'Trade places with any hero for all 4 moves.'],
    ],
    swordsman: [
        ['Combat Training', 'Dice showing 1 are rerolled.'],
        ['Unstoppable', 'A 6 in a fight lets the turn go on.'],
    ],
    oracle: [
        ['Farseeing', '+1 when the fight is on her first move.'],
        ['Fateweaver', 'Draws two tokens from the bag and keeps one.'],
    ],
};

export function heroLabel(id: HeroId): string {
    const hero = HEROES[id];
    return `${hero.name}, ${hero.title}`;
}

const KIND_NAMES: Record<TileKind, string> = {
    tunnel: 'corridor',
    room: 'room',
    gate: 'teleport gate',
    fountain: 'healing fountain',
};

const SHAPE_NAMES: Record<TileShape, string> = {
    deadEnd: 'dead-end',
    straight: 'straight',
    corner: 'corner',
    tee: 'T-shaped',
    cross: 'crossroads',
};

export function tileName(typeId: string): string {
    const t = getTileType(typeId);
    if (typeId === 'start') return 'starting tile';
    return `${SHAPE_NAMES[t.shape]} ${KIND_NAMES[t.kind]}`;
}

export function tokenName(token: BagToken): string {
    return token === 'chest'
        ? 'a locked chest'
        : `${MONSTERS[token].name} (${MONSTERS[token].strength})`;
}

const TREASURE_NAMES: Record<TreasureId, string> = {
    chest: 'chest treasure',
    fallen: 'The Fallen’s treasure',
    ruby: 'the dragon’s ruby',
};

export const treasureName = (t: TreasureId) => TREASURE_NAMES[t];

/** Turns engine events into log lines. `state` is the state after the events. */
export function describeEvents(events: GameEvent[], state: GameState): string[] {
    const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
    const lines: string[] = [];
    for (const e of events) {
        const line = describe(e, name);
        if (line) lines.push(line.charAt(0).toUpperCase() + line.slice(1));
    }
    return lines;
}

function describe(e: GameEvent, name: (id: string) => string): string | null {
    switch (e.type) {
        case 'startingRolls':
            return `Starting rolls: ${e.rolls.map((r) => `${name(r.playerId)} ${r.total}`).join(', ')}`;
        case 'turnStarted':
            return `Round ${e.round}: ${name(e.playerId)}’s turn`;
        case 'turnSkipped':
            return `${name(e.playerId)} is unconscious and misses the turn`;
        case 'heroRecovered':
            return `${name(e.playerId)} comes round with ${e.hp} HP`;
        case 'tileDrawn':
            return `${name(e.playerId)} explores: a ${tileName(e.typeId)}`;
        case 'tokenDrawn':
            return e.token === 'chest'
                ? `${name(e.playerId)} finds a locked chest`
                : `${tokenName(e.token)} appears!`;
        case 'bagEmpty':
            return 'The bag is empty; the room stays quiet';
        case 'teleported':
            return `${name(e.playerId)} teleports`;
        case 'combatStarted':
            return `${name(e.playerId)} fights the ${MONSTERS[e.monster].name}`;
        case 'diceRolled':
            return `${name(e.playerId)} rolls ${e.dice[0]} + ${e.dice[1]}`;
        case 'diceRerolled':
            return e.reason === 'doubleAttack'
                ? `Double Attack: rerolled ${e.dice[0]} + ${e.dice[1]}`
                : `Combat Training rerolls the 1s: ${e.dice[0]} + ${e.dice[1]}`;
        case 'boltUsed':
            return `${name(e.playerId)} casts a Magic Bolt (+1)`;
        case 'hpSacrificed':
            return `${name(e.playerId)} sacrifices 1 HP (+1)`;
        case 'monsterEvaded':
            return `${name(e.playerId)} slips past the ${MONSTERS[e.monster].name}`;
        case 'combatResolved': {
            const outcome = { win: 'Victory', tie: 'Tie', loss: 'Defeat' }[e.result];
            return `${outcome}: ${e.total} against ${e.strength}`;
        }
        case 'heroRetreated':
            return `${name(e.playerId)} retreats`;
        case 'heroWounded':
            return `${name(e.playerId)} is wounded (${e.hp} HP left)`;
        case 'heroFellUnconscious':
            return `${name(e.playerId)} falls unconscious`;
        case 'heroReincarnated':
            return `${name(e.playerId)} reincarnates at a fountain with ${e.hp} HP`;
        case 'lootTaken':
            return `${name(e.playerId)} takes the ${ITEM_NAMES[e.item]}`;
        case 'treasureTaken':
            return `${name(e.playerId)} takes ${treasureName(e.treasure)}`;
        case 'itemDropped':
            return `${name(e.playerId)} leaves the ${ITEM_NAMES[e.item]} on the tile`;
        case 'itemPickedUp':
            return `${name(e.playerId)} picks up the ${ITEM_NAMES[e.item]}`;
        case 'chestOpened':
            return `${name(e.playerId)} unlocks the chest`;
        case 'heroHealed':
            return `${name(e.playerId)} heals to ${e.hp} HP${e.curseLifted ? ' and lifts the curse' : ''}`;
        case 'cursePlaced':
            return `${name(e.playerId)} curses ${name(e.targetId)}`;
        case 'curseKept':
            return `The curse stays on ${name(e.holderId)}`;
        case 'tokensDrawn':
            return `Fateweaver: ${name(e.playerId)} draws ${e.options.map(tokenName).join(' and ')}`;
        case 'tokenReturned':
            return `${tokenName(e.token)} goes back into the bag`;
        case 'portalCast':
            return `${name(e.playerId)} casts Portal of Healing on ${e.targetId === e.playerId ? 'themself' : name(e.targetId)}`;
        case 'heroesSwapped':
            return `${name(e.playerId)} swaps places with ${name(e.targetId)}`;
        case 'turnContinues':
            return `Unstoppable! ${name(e.playerId)}’s turn goes on`;
        case 'gameEnded': {
            const winners = e.winnerIds.map(name).join(' and ');
            const best = Math.max(...e.scores.map((s) => s.vp));
            return `The dragon is slain! ${winners} ${e.winnerIds.length > 1 ? 'share the win' : 'wins'} with ${best} VP`;
        }
        case 'heroMoved':
        case 'tilePlaced':
        case 'turnEnded':
            return null;
    }
}
