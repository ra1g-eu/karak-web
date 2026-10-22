import {treasureChest, treasureKey} from "./items.js";
import {elementId, logEvent} from '../utils/helpers.js';
import {reducePlayerHealth} from "./gameLogic.js";
import {updatePlayerInfo} from "../ui/renderer.js";
import {awaitPlayerDecisionDropdown} from "../ui/customModals.js";
import {
    addItemToInventory,
    hasItemInInventory,
    hasSpaceInInventoryForItem,
    removeItemFromInventory
} from "./inventoryManager.js";
import {handleEndTurn} from "../ui/uiEvents.js";

export const eventTiles = [
    {
        id: 'monsterBattle',
        image: '../public/images/monsters/monster_skeleton.png',
        image_open: null,
        name: 'Wild Skeleton',
        hp: 8,
        async onEnter(player) {
            logEvent(`${player.name} encounters a wild skeleton!`);
            const success = Math.random() > 0.5;

            if (success) {
                logEvent(`${player.name} defeated the monster!`);
                return [true, true];
            } else {
                logEvent(`${player.name} was defeated. The monster remains.`);
                reducePlayerHealth(player, 1);
                updatePlayerInfo(player);
                return [true, false];
            }
        }
    },
    {
        id: 'treasureChest',
        image: '../public/images/items/item_treasure_chest_closed.png',
        image_open: '../public/images/items/item_treasure_chest_open.png',
        name: 'Treasure Chest',
        drops: treasureChest,
        async onEnter(player) {
            logEvent(`${player.name} found a treasure chest!`);

            const hasKey = hasItemInInventory(player, 'key', treasureKey.id);
            if (!hasKey) {
                logEvent(`${player.name} couldn't pick up the treasure. It remains.`);
                return [false, false];
            }

            // Prompt for inventory management
            const confirmed = await awaitPlayerDecisionDropdown(
                elementId(player.id),
                'Pick up the treasure?',
                'Make sure to have space in your inventory, then decide. This will use up your key.',
            );

            if (!confirmed) {
                logEvent(`${player.name} didn't pick up the treasure. It remains.`);
                return [false, false];
            }

            const hasSpace = hasSpaceInInventoryForItem(player, treasureKey.type);

            if (!hasSpace) {
                logEvent(`${player.name} didn't pick up the treasure. It remains.`);
                return [false, false];
            }

            let {wasItemAdded, randomItem} = addItemToInventory(treasureChest.type, player, treasureChest);
            if (wasItemAdded) {
                removeItemFromInventory(player, 'key', treasureKey.id);
                updatePlayerInfo(player);
                logEvent(`${player.name} collected the treasure!`);
                await handleEndTurn();
                return [true, true];
            }

            logEvent(`${player.name} couldn't pick up the treasure. It remains.`);
            return [false, false];
        }
    }
];