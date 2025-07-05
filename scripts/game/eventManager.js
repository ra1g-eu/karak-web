import { logEvent } from '../utils/helpers.js';

export const eventTiles = [
    {
        id: 'monsterBattle',
        image: 'images/skeleton.png',
        name: 'Wild Skeleton',
        hp: 8,
        onEnter(player) {
            logEvent(`${player.name} encounters a wild skeleton!`);
            const success = Math.random() > 0.5;

            if (success) {
                logEvent(`${player.name} defeated the monster!`);
                return true;
            } else {
                logEvent(`${player.name} was defeated. The monster remains.`);
                return false;
            }
        }
    },
    {
        id: 'treasureChest',
        image: 'images/chest.png',
        name: 'Treasure Chest',
        onEnter(player) {
            logEvent(`${player.name} found a treasure chest!`);
            const collected = Math.random() > 0.2;

            if (collected) {
                logEvent(`${player.name} collected the treasure!`);
                return true;
            } else {
                logEvent(`${player.name} couldn't open the chest. It remains.`);
                return false;
            }
        }
    }
];