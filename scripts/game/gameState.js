import {emptySlot, sword, treasureKey} from './items.js';

export const GameState = {
    players: [
        {
            id: 'ab42-5c2',
            name: 'ra1g',
            position: {x: 0, y: 0},
            startPosition: {x: 0, y: 0},
            class: null,
            abilities: {},
            hp: 5,
            maxHp: 5,
            image: null,
            inventory: {
                weapons: [sword, emptySlot],
                spells: [emptySlot, emptySlot, emptySlot],
                key: treasureKey,
                treasures: []
            }
        },
        {
            id: 'c32b-11v',
            name: 'pravdeez',
            position: {x: 0, y: 0},
            startPosition: {x: 0, y: 0},
            class: null,
            abilities: {},
            hp: 5,
            maxHp: 5,
            image: null,
            inventory: {
                weapons: [emptySlot, emptySlot],
                spells: [emptySlot, emptySlot, emptySlot],
                key: emptySlot,
                treasures: []
            }
        }
    ],
    currentPlayerIndex: 0,
    round: 1,
    map: new Map(),
    isGameOver: false,

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    },

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        if (this.currentPlayerIndex === 0) this.round++;
        return this.getCurrentPlayer();
    },

    updateCurrentPlayer(player) {
        this.players[this.currentPlayerIndex] = player;
        return this.getCurrentPlayer();
    },
    synchronizeState() {
        //TODO: make api call to save gamestate in backend and send an event to update gamestate for all players (using pub/sub with redis)
    }
};