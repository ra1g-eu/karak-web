import {elementId, logEvent} from '../utils/helpers.js';
import {addItemToInventory} from "./inventoryManager.js";
import {reducePlayerHealth} from "./gameLogic.js";
import {updatePlayerInfo} from "../ui/renderer.js";
import {awaitPlayerDecision, awaitPlayerDecisionDropdown} from "../ui/customModals.js";

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
                reducePlayerHealth(player, 1);
                updatePlayerInfo(player);
                return false;
            }
        }
    },
    {
        id: 'treasureChest',
        image: 'images/chest.png',
        name: 'Treasure Chest',
        async onEnter(player) {
            logEvent(`${player.name} found a treasure chest!`);
            const collected = Math.random() > 0.2;

            if (collected) {
                let {wasItemAdded, randomItem} = addItemToInventory('key', player);
                if (!wasItemAdded) {
                    //let the player remove an item from inventory if they wish, by showing a dialog window with all inventory items and a button to remove them
                    //await decision and then attempt to addItemToInventory('key', player, randomItem);
                    //if fails, continue and drop item
                    const confirmed = await awaitPlayerDecisionDropdown(
                        elementId(player.id),
                        'Inventory full',
                        'Remove an item from your inventory to make room for the key.',
                    );

                    if (confirmed) {
                        let {wasItemAdded2, randomItem2} = addItemToInventory('key', player, randomItem);
                        if (wasItemAdded2) {
                            logEvent(`${player.name} collected the treasure!`);
                        } else {
                            logEvent(`${player.name} couldn't open the chest. It remains.`);
                            return false;
                        }
                    } else {
                        logEvent(`${player.name} couldn't open the chest. It remains.`);
                        return false;
                    }
                }
                updatePlayerInfo(player);
                return true;
            } else {
                logEvent(`${player.name} couldn't open the chest. It remains.`);
                return false;
            }
        }
    }
];