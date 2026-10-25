import { type Command, openingsOf, type Phase, type Player, type Rotation } from '../engine';

/** Valid rotations of the drawn tile, minus ones that look identical (a crossroads has one). */
export function distinctRotations(phase: Extract<Phase, { type: 'placingTile' }>): Rotation[] {
    const seen = new Set<string>();
    return phase.validRotations.filter((r) => {
        const key = openingsOf(phase.typeId, r).sort().join('');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function previewRotation(
    phase: Extract<Phase, { type: 'placingTile' }>,
    index: number,
): Rotation {
    const options = distinctRotations(phase);
    return options[index % options.length] as Rotation;
}

/** Healing is legal at full health but does nothing, so the UI doesn't offer it then. */
export function isPointlessHeal(command: Command, player: Player): boolean {
    return (
        command.type === 'endTurn' &&
        command.action?.type === 'heal' &&
        player.hp === player.maxHp &&
        !player.cursed &&
        !player.unconscious
    );
}
