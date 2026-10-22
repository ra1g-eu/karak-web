# Karak — Rules Reference

This is the rules reference for the browser version of Karak. It restates the official rulebook
(`Karak_rules_EN_print.pdf`, by Petr Miksa & Roman Hladík) as a spec the game engine can follow.
Lore and flavour text are left out.

**How to use this file**

- Every rule has a stable ID (for example `R-COMBAT-3`). Engine code and tests cite these IDs in
  comments and test names, so it's always clear which rule a piece of logic implements.
- Rules marked **(rulebook)** come straight from the official rules.
- Rules marked **(clarification)** fill gaps the rulebook doesn't cover. They live in
  [§13 Clarifications](#13-clarifications--house-rules) and can be changed by agreement.
- **UBG** marks a point settled by a secondary source:
  [UltraBoardGames' rules page](https://www.ultraboardgames.com/karak/game-rules.php). It
  restates the rules from a later edition. The rulebook wins wherever the two disagree.
- Values marked **⚠ unverified** don't appear in the rulebook (they're printed on the physical
  tokens). They need checking against a physical copy.

---

## 1. Overview

- `R-GOAL-1` Players are heroes exploring the dungeon beneath Karak Castle. They fight monsters,
  gather equipment, and collect treasure.
- `R-GOAL-2` The game ends **immediately** when any hero defeats **the dragon** (§11).
- `R-GOAL-3` The winner is the player with the most **victory points (VP)** at that moment. The
  hero who killed the dragon doesn't automatically win.

## 2. Components

| Component | Count | Notes |
|---|---|---|
| Dungeon tiles | 80 | Includes 1 starting tile (light-coloured back) |
| Heroes | 6 | One hero card and one figure each |
| Inventory sheets | 5 | So the physical game supports **2–5 players** |
| HP tokens | 25 | 5 per player, heart side = healthy, skull side = wound |
| Monster tokens | 43 | Go in the bag. The back of each token shows its loot |
| Locked treasure chests | 10 | Go in the bag too |
| Dice | 2 | Six-sided (2d6) |
| Curse token | 1 | |

### 2.1 Bag contents (53 tokens)

The bag holds every monster **and** every chest. Drawing from it is the only way monsters and
chests enter the dungeon.

| Monster | Count | Strength ⚠ | Loot (back of token) | Loot type |
|---|---:|---:|---|---|
| Giant Rat | 8 | 5 ⚠ | Daggers (+1) | Weapon |
| Giant Spider | 4 | 6 ⚠ | Portal of Healing | Spell |
| Skeleton Turnkey | 12 | 7 ⚠ | Key | Key |
| Mummy | 8 | 7 ⚠ | Magic Bolt, and the slayer places the curse (§10) | Spell |
| Skeleton Warrior | 5 | 8 ⚠ | Sword (+2) | Weapon |
| Skeleton King | 3 | **10** (rulebook example) | Axe (+3) | Weapon |
| The Fallen | 2 | 12 ⚠ | Treasure (1 VP) | Treasure |
| Dragon | 1 | 15 ⚠ | Dragon ruby (1.5 VP), and the game ends | Treasure |
| **Locked chest** | 10 | — | Treasure (1 VP), needs a key | Treasure |

Monster counts and loot come from the rulebook. Only the Skeleton King's strength (10) appears in
the rulebook. The other strengths are commonly cited values and still need verifying.

### 2.2 Tile composition

The rulebook says 80 tiles but doesn't break them down. Tiles combine a **shape** with a
**kind**:

- **Shapes**, defined by their open sides: dead end (1 opening), straight (2, opposite), corner/L
  (2, adjacent), T (3), cross (4).
- **Kinds:** tunnel/corridor (empty), room (draws from the bag), teleportation gate (TG), and
  healing fountain (HF).

⚠ The exact count of each shape and kind still needs counting from a physical copy. Until then the
engine uses a placeholder distribution in `src/engine/data/tiles.ts`: 55 rooms, 16 tunnels, 4
gates and 4 fountains. That's more rooms than bag tokens, so every token can come out.

- `R-TILE-START` The **starting tile** is a 4-way tile with a **healing fountain**. The rulebook
  implies this: a hero who loses next to the start returns there and heals.

## 3. Setup

- `R-SETUP-1` Place the starting tile in the middle of the table.
- `R-SETUP-2` Shuffle the other 79 tiles face down into a draw pile.
- `R-SETUP-3` Every player takes an inventory sheet and 5 HP tokens (5 HP max).
- `R-SETUP-4` Every player picks a hero, either by choice or at random as the players agree. Each
  hero can be taken by only one player.
- `R-SETUP-5` All heroes start on the starting tile.
- `R-SETUP-6` Every player rolls the dice, and the highest roll starts (UBG). Play then goes
  **clockwise**, which here means in seat order.
- `R-SETUP-7` Monsters and chests go into the bag, unseen and shuffled.

## 4. Turn structure

- `R-TURN-1` On their turn the active player has **4 moves**. Each move takes the hero onto an
  adjacent tile (or uses a move for a special action such as teleporting).
- `R-TURN-2` A hero may use fewer than 4 moves.
- `R-TURN-3` Each move does one of these:
  - **A.** Enter an undiscovered zone (§5)
  - **B.** Fight a monster (§7)
  - **C.** Move over discovered tiles (§6)

### 4.1 End of turn

- `R-END-1` The turn ends **immediately** when any of these happens:
  1. The hero has used all 4 moves.
  2. A fight with a monster ends, **whatever the result**. Exception: Swordsman's *Unstoppable*.
  3. The hero unlocks a chest and takes its treasure.
  4. The hero picks up equipment lying on a tile.
  5. The hero heals at a healing fountain.
- `R-END-2` Taking equipment, unlocking a chest, or healing at an HF all require **ending the turn
  on that tile**. A hero can stop early (fewer than 4 moves) to do so.

## 5. Entering an undiscovered zone (exploration)

- `R-EXPLORE-1` When a hero moves through an opening on their tile into an empty space, the player
  draws the top dungeon tile and places it there. The hero moves onto it, which costs 1 move.
- `R-EXPLORE-2` The new tile **must connect to the tile the hero came from**, so it needs an opening
  facing back toward that tile. The player picks a rotation that satisfies this.
- `R-EXPLORE-3` The new tile does **not** have to match any other neighbours. Other sides may form
  dead ends.
- `R-EXPLORE-4` What happens next depends on the tile kind:
  - **Tunnel:** nothing. The hero may keep moving if moves remain.
  - **Room:** draw **one token from the bag** (Oracle: see *Fateweaver*).
    - `R-ROOM-a` A **chest** is placed on the new tile. The hero may keep moving.
    - `R-ROOM-b` A **chest** while the hero **holds a key:** the hero may unlock it at once, take
      the treasure, and discard the key out of the game. Doing so **ends the turn**.
    - `R-ROOM-c` A **monster** is placed on the tile and **combat starts immediately** (§7).
  - **Teleportation gate:** see `R-TG-*`.
  - **Healing fountain:** the hero may heal by ending the turn there (`R-HEAL-2`), or keep moving.
- `R-ROOM-ONCE` Rooms draw from the bag **only when first discovered**. Walking into a known room
  never draws again.

### 5.1 Teleportation gates

- `R-TG-1` While only **one** TG has been discovered, it's inactive.
- `R-TG-2` With **two or more** TGs discovered, a hero on a TG can spend **1 move** to teleport to
  any other discovered TG.

## 6. Moving over discovered tiles

- `R-MOVE-1` Heroes move only between tiles whose facing sides are **both open**. A wall on either
  side blocks the move. (Wizard's *Astral Walking* ignores walls on discovered tiles.)
- `R-MOVE-2` Moving over discovered tiles still counts against the 4-move limit.
- `R-MOVE-3` A hero can't pass through a room that holds a monster. Entering that room means
  fighting (Thief's *Stealth* may skip the fight).
- `R-MOVE-4` Several heroes may share a tile. Heroes never fight each other (clarification `C-07`).

## 7. Combat

- `R-COMBAT-1` Fighting a monster works like this:
  1. Roll **2d6**.
  2. Add the bonus of **every weapon** the hero carries (daggers +1, sword +2, axe +3). Weapons are
     always added and never used up.
  3. The player may then use any number of **Magic Bolt** spells, each giving **+1**, after seeing
     the roll. Used bolts are discarded from the game (Wizard: see *Magical Affinity*).
  4. Apply any hero skill.
  5. Compare the **total** with the monster's **strength**.
- `R-COMBAT-LOSS` **Total < strength: loss.**
  - The hero takes 1 wound (flips one HP token to the skull side).
  - The hero **retreats** (`R-RETREAT`).
  - The monster stays on its tile, face up.
- `R-COMBAT-TIE` **Total = strength: tie.**
  - Nobody is hurt.
  - The hero retreats (`R-RETREAT`).
  - The monster stays (Thief: see *Backstab*).
- `R-RETREAT` A retreating hero walks back along the path they took this turn to the **first tile
  without a monster**. Usually that's the tile they just came from. The rulebook says "the tile
  they came from"; UBG adds the monster-free condition. A retreat costs no moves.
- `R-COMBAT-WIN` **Total > strength: victory.**
  - The monster token is flipped and its **loot** is taken (§9).
  - If the hero has no room for the loot, the player picks one item, the new one or one they
    already carry, and **drops it on the tile** for anyone to pick up later.
  - The hero stays on the monster's tile.
- `R-COMBAT-END` After any combat **the turn ends**, whatever the result (Swordsman: see
  *Unstoppable*).

**Rulebook examples.** (1) A Warrior fights a Skeleton King (10) while holding a sword (+2),
daggers (+1) and one Magic Bolt. He rolls 5, giving 8, and rerolls with *Double Attack*: 7 + 2 + 1
= 10. He spends the bolt for 11 and wins. The loot is an axe, so he keeps the sword and axe and
drops the daggers. (2) If the reroll had been 3, the total is 6 and he loses: he steps back, takes
a wound, and the King stays.

## 8. Hit points, unconsciousness, healing

- `R-HP-1` Every hero has **5 HP**. Each loss costs 1 HP.
- `R-HP-2` At 0 HP the hero **falls unconscious**. They **skip their next turn**, heal **1 HP**
  during it, and play normally after that. (Warrior: see *Reincarnation*.)
- `R-HEAL-1` Healing happens at a **healing fountain (HF)**.
- `R-HEAL-2` A hero who **ends their turn on an HF tile** may heal to **full HP**. This also
  **lifts the curse**. Healing ends the turn (`R-END-1`).
- `R-HEAL-3` The starting tile has an HF, so a hero who loses a fight next to the start goes back
  there and can heal.

## 9. Equipment and inventory

Each hero's inventory sheet has:

| Slot | Capacity |
|---|---|
| Weapons | 2 |
| Spells | 3 |
| Key | 1 |
| Treasures | Unlimited (clarification `C-03`) |

- `R-INV-1` Items go only into slots of their type. A spell can't sit in a weapon slot.
- `R-INV-2` To take a new item when its slots are full, the hero drops an item of their choice
  onto the tile they're standing on. Any hero can pick it up later.
- `R-INV-3` Picking up equipment lying on a tile requires ending the turn there (`R-END-1`).

### 9.1 Weapons

- `R-WEAPON-1` There are three weapons: **Daggers +1** (from the Giant Rat), **Sword +2** (Skeleton
  Warrior) and **Axe +3** (Skeleton King). Weapons can also be picked up from tiles.
- `R-WEAPON-2` The bonus of every carried weapon is **always** added to the combat total.

### 9.2 Spells

- `R-SPELL-1` A used spell is discarded from the game. It doesn't go back into the bag.
- `R-BOLT-1` **Magic Bolt** (from the Mummy) gives +1 to a combat total. It may be used after the
  roll, and several may be used in one fight.
- `R-PORTAL-1` **Portal of Healing** (from the Giant Spider) targets the caster **or any other
  hero**. The target moves to **any revealed HF** of the caster's choice, heals **all** wounds,
  and loses any curse.
- `R-PORTAL-2` Casting it costs no move and doesn't end the turn. It can be cast at any time during
  the caster's own turn.

### 9.3 Keys and treasure

- `R-KEY-1` A **key** comes from the Skeleton Turnkey. A hero holds at most 1 key.
- `R-KEY-2` A key opens any chest. To unlock one, the hero **ends their turn on the chest's tile**,
  takes the treasure, and the key is discarded from the game.
- `R-TREASURE-1` Treasure values: chest **1 VP**, The Fallen's treasure **1 VP**, dragon ruby
  **1.5 VP**.

## 10. The curse of Karak

- `R-CURSE-1` Whoever defeats a **Mummy** chooses **another** player and gives them the curse
  token. If the curse is already in play, they may move it to a different player or leave it
  where it is.
- `R-CURSE-2` A cursed hero **can't use their hero skills**. For example, the Warrior gets one roll
  and falls unconscious like everyone else, and a Wizard's bolts are consumed.
- `R-CURSE-3` A hero sheds the curse by healing at an HF (`R-HEAL-2`) or by being targeted with a
  Portal of Healing (`R-PORTAL-1`).

## 11. End of game and scoring

- `R-WIN-1` The game ends **immediately** when a hero defeats the dragon. That hero takes the ruby
  (1.5 VP).
- `R-WIN-2` Every player adds up the VP of their treasures, and **the most VP wins**. The dragon
  slayer may not be the winner.
- `R-WIN-3` Ties: the rulebook doesn't say how to break them (open question `Q-01`).

## 12. Heroes

Each hero has two skills. **Cursed heroes lose both** (`R-CURSE-2`).

| ID | Hero | Skill 1 | Skill 2 |
|---|---|---|---|
| `warrior` | **Horan, the Warrior** | **Double Attack:** may reroll both dice once per combat if he doesn't like the first roll. A loss on the first roll costs no HP. The second roll stands. | **Reincarnation:** at 0 HP he doesn't fall unconscious. He teleports to any HF and heals to full, but the turn still ends. |
| `thief` | **Aderyn, the Thief** | **Backstab:** wins every combat that would be a tie. | **Stealth:** on entering a tile with a monster she may skip the fight and keep moving. |
| `wizard` | **Argentus, the Wizard** | **Magical Affinity:** his Magic Bolts aren't used up (Portal of Healing still is). Cursed, he uses them up like everyone else. | **Astral Walking:** moves through walls, but only between **already discovered** tiles. Exploring still follows `R-EXPLORE-2`. |
| `warlock` | **Lord Xanros, the Warlock** | **Sacrifice:** after the roll he may spend 1 HP for +1, at most once per combat. Spending his last HP is allowed, but he falls unconscious next turn. | **Magic Swap:** swaps tiles with any other hero for **all 4 moves**, so only at the start of his turn. He may still use his new tile's feature (unlock a chest, heal, and so on). |
| `swordsman` | **Victorius, the Swordsman** | **Combat Training:** any die showing **1** may be rerolled until it isn't 1. | **Unstoppable:** if any die shows **6** in combat, he may **keep his turn going** with his remaining moves. He may even fight the same monster again after a tie or loss, if he has a move left (UBG). |
| `oracle` | **Taia, the Oracle** | **Farseeing:** +1 to the combat total if the fight happens on her **first move** of the turn. | **Fateweaver:** when drawing from the bag she draws **two** tokens, places one, and puts the other back. |

## 13. Clarifications & house rules

Where the rulebook is silent, the engine follows these until changed. Status values:

- **supported (UBG):** the secondary source states it outright.
- **implied (UBG):** the secondary source's wording or examples point this way.
- **proposed:** our own ruling, until we confirm it together.

| ID | Topic | Ruling | Status |
|---|---|---|---|
| `C-01` | Exploring direction | A hero can explore only through an **opening** on their own tile. | implied (UBG): the new tile "must have a route that connects to the previous tile" |
| `C-02` | Rotation choice | The UI offers only rotations that satisfy `R-EXPLORE-2`. If no rotation fits (impossible for standard shapes), the tile is discarded and another drawn. | proposed |
| `C-03` | Treasure capacity | Treasures don't use slots, so a hero can carry any number. | supported (UBG) |
| `C-04` | Unconscious hero's gear | The hero **keeps all equipment** and stays on the tile they retreated to. Neither source mentions losing gear. **The current prototype wipes the inventory, which is wrong.** | proposed |
| `C-05` | Retreat path | The engine records each hero's path this turn, including teleports. `R-RETREAT` walks that path backwards. The tile where the turn started never holds a monster, so a retreat always ends somewhere. | supported (UBG), path tracking is ours |
| `C-06` | Empty bag / empty tile pile | Empty bag: newly found rooms stay empty. Empty tile pile: no more exploring. | proposed |
| `C-07` | Heroes sharing tiles | Heroes may move onto **and through** tiles with other heroes. There's no interaction and no PvP. | supported (UBG) |
| `C-08` | Chest left on a tile | A chest that can't be opened stays on its tile. Any hero with a key who **ends their turn there** may open it. | supported (UBG) |
| `C-09` | Dropped items | Picking up a key, weapon or spell from a tile ends the turn. Several items may lie on one tile (our ruling). | supported (UBG), except several items per tile |
| `C-10` | Monster revisits | A monster that survived stays face up. Any hero entering its tile must fight it (Thief may skip). | supported (UBG) |
| `C-11` | Moves on loss or tie | The move into the monster's tile is still spent. | implied (UBG): Swordsman can fight again "provided this wasn't his fourth action" |
| `C-12` | Warrior reroll | Rerolling is optional and offered after **every** first roll, including winning ones ("if the first roll is not to his liking"). Bolts can still be added after the final roll. | supported (UBG), replaces the old "only when not winning" ruling |
| `C-13` | Healing is optional | Ending a turn on an HF lets the player **choose** whether to heal. This includes retreating onto an HF after a fight: the turn ends because of the fight, and the hero may still heal. | supported (UBG) |
| `C-14` | Tile actions after combat | After a fight the only tile action allowed before the turn ends is healing (`C-13`). Opening a chest or picking up an item needs a turn that didn't end in combat. | proposed |
| `C-15` | Placing a drawn tile | A drawn tile must be placed; it can't be put back, and nothing else can happen until it is. No move is spent until it's placed. | proposed |

### 13.1 Open questions

| ID | Question |
|---|---|
| `Q-01` | How should VP ties be broken? Options: the dragon slayer wins, or a shared victory. Not covered by UBG either. |
| `Q-02` | Confirm the monster strengths marked ⚠ against the physical tokens. UBG only confirms the Skeleton King (10). |
| `Q-03` | Count the 80 tiles by shape and kind (tunnel, room, TG, HF). |
| `Q-04` | Is the dragon in the bag from the start, or added later? The rulebook implies from the start. |
| `Q-05` | Edition: UBG lists **7 heroes and 30 HP tokens**, adding the Warrior Princess (*Dual Attack*, *Aggressive Movement*), so its edition supports 6 players. This spec keeps the 6 original heroes and 2–5 players. The Warrior Princess goes with the Phase 9 custom content unless we decide otherwise. |
| `Q-06` | What if the dungeon closes off (no open edge left to explore) while the dragon is still in the bag? The game could never end. It hasn't happened in simulations with the placeholder tiles, but the real tile mix may differ. |

---

## Quick summary (cheat sheet)

- **Turn:** up to 4 moves. Stepping into a new space explores a tile, and rooms draw from the bag.
- **Turn ends on:** combat (any result), opening a chest, picking up gear, healing at an HF, or
  the 4th move.
- **Combat:** 2d6 + all weapons + any Magic Bolts (+1 each, chosen after rolling) + skills, compared
  with the monster's strength. Higher wins, equal ties, lower loses (1 wound and a retreat to the nearest monster-free tile).
- **0 HP:** skip one turn and come back with 1 HP. An HF heals fully and removes the curse.
- **Inventory:** 2 weapons, 3 spells, 1 key, unlimited treasure. Overflow is dropped on the tile.
- **Curse:** placed by a Mummy's slayer. The cursed hero loses their skills until healed.
- **End:** the dragon dies, then most VP wins. Chest and Fallen treasure are 1 VP each, the ruby is
  1.5 VP.
