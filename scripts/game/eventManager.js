import {treasureKey} from "./items.js";
import {elementId, logEvent} from '../utils/helpers.js';
import {reducePlayerHealth} from "./gameLogic.js";
import {updatePlayerInfo} from "../ui/renderer.js";
import {awaitPlayerDecisionDropdown} from "../ui/customModals.js";
import {addItemToInventory, hasItemInInventory, hasSpaceInInventoryForItem} from "./inventoryManager.js";

export const eventTiles = [
    {
        id: 'monsterBattle',
        image: 'images/monsters/monster_skeleton.png',
        image_open: null,
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
                reducePlayerHealth(player, 1);
                updatePlayerInfo(player);
                return false;
            }
        }
    },
    {
        id: 'treasureChest',
        image: 'images/items/item_treasure_chest_closed.png',
        image_open: 'images/items/item_treasure_chest_open.png',
        name: 'Treasure Chest',
        drops: treasureKey,
        async onEnter(player) {
            logEvent(`${player.name} found a treasure chest!`);

            const hasKeyInInventory = hasItemInInventory(player, treasureKey.type, treasureKey.id);
            if (Math.random() <= 0.2) {
                logEvent(`${player.name} couldn't open the chest. It remains.`);
                return false;
            }

            // Prompt for inventory management
            const confirmed = await awaitPlayerDecisionDropdown(
                elementId(player.id),
                'Pick up the key?',
                'Make sure to have space in your inventory, then decide.',
            );

            if (!confirmed) {
                console.log('Inventory full');
                logEvent(`${player.name} didn't open the chest. It remains.`);
                return false;
            }

            const hasSpace = hasSpaceInInventoryForItem(player, treasureKey.type);

            if (!hasSpace) {
                console.log('Inventory full');
                logEvent(`${player.name} didn't open the chest. It remains.`);
                return false;
            }

            let {wasItemAdded, randomItem} = addItemToInventory(treasureKey.type, player, treasureKey);
            if (wasItemAdded) {
                updatePlayerInfo(player);
                logEvent(`${player.name} collected the treasure!`);
                return true;
            }

            logEvent(`${player.name} couldn't open the chest. It remains.`);
            return false;
        }
    }
];