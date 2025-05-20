// js/data.js
console.log("Loading game data...");

const gameData = {
    rules: {
        health: "Starts at 20, no replenish until chapter end. At 0, player chooses to restart battle, rewind, or abandon run.",
        mana: "Starts at 3, refreshes per turn, grows +1 per chapter.",
        gold: "Starts at 10, earned from combat/quests.",
        deck: "10 cards, expands via story/vendors/loot.",
        chapters: "One city/location per chapter, travel at chapter end."
    },
    cities: {
        Emberpeak: { description: "A volcanic city of fire mages and smiths.", school: "Elemental Fire" },
        Mysthaven: { description: "A plains city of arcane study and illusion.", school: "Mystical" },
        SylvanGlade: { description: "An elven forest of wind and nature magic.", school: "Nature" },
        Tidegarde: { description: "A coastal port of water mages and sailors.", school: "Elemental Water" },
        Dunespire: { description: "A desert oasis of earth mages and traders.", school: "Elemental Earth" },
        Riverbloom: { description: "A lush river town of growth and trade.", school: "Nature" },
        "Skyreach Castle": { description: "A lofty fortress of air mages.", school: "Elemental Air" }
    },
    chapters: [
        {
            id: 1,
            possibleLocations: ["Emberpeak", "Mysthaven", "SylvanGlade", "Tidegarde", "Dunespire"],
            storyBeats: [
                { 
                    id: "start", 
                    text: "You arrive in [city], sent by your order to seek fading magic. The air hums with a strange tension, and the weight of your task settles upon you. What is your first instinct?", 
                    nextOptions: ["explore_city", "seek_information", "find_lodging", "observe_locals"] // Made options more descriptive
                },
                { 
                    id: "explore_city", 
                    text: "You decide to wander the streets of [city]. The architecture is [unique_city_feature], and the sounds of daily life fill the air. You soon find yourself in a bustling market square.", 
                    nextOptions: ["browse_stalls", "listen_for_rumors", "find_tavern", "leave_market"] 
                },
                { 
                    id: "thug_ambush", // Changed ID for clarity
                    text: "As you turn down a quieter alley, a shadowy figure steps out, blocking your path. 'Your coin or your life, mage!' a gruff voice demands.", 
                    next: "combat", // Indicates a combat encounter follows
                    enemyKey: "thug" // References the "thug" in gameData.enemies
                }
                // We can add more story beats for the other options later
            ]
        }
        // Add more chapters later
    ],
    cardDatabase: {
        // Starting Deck Cards
        Fireball: { name: "Fireball", type: "Attack", cost: 1, effect: { damage: 6 }, description: "Hurl a small bolt of fire. Deals 6 damage." },
        "Flame Strike": { name: "Flame Strike", type: "Attack", cost: 2, effect: { damage: 8, target: "all" }, description: "Engulf all enemies in fire. Deals 8 damage to all." }, // Added target: "all"
        "Staff Guard": { name: "Staff Guard", type: "Defend", cost: 1, effect: { block: 5 }, description: "Raise your staff to defend. Gain 5 Block." },
        
        // Example of other card types from README
        "Illusion": { name: "Illusion", type: "Utility", cost: 1, effect: { status: "miss_next" }, description: "Create an illusion. Enemy misses its next attack." },
        "Tidal Heal": { name: "Tidal Heal", type: "Healing", cost: 2, effect: { heal: 5, exile: true }, description: "Channel soothing waters. Heal 5 HP. Exile." } // Exile means removed from combat after use
    },
    enemies: {
        thug: { // Added the "Thug" enemy referenced in Chapter 1
            name: "Street Thug",
            health: 15, // Current health, will be set to maxHealth at start of combat
            maxHealth: 15,
            moves: [
                { name: "Pummel", type: "attack", value: 5, description: "A crude but forceful strike." }
                // Could add more moves later, like "Defend" or "Intimidate"
            ],
            loot: [
                { itemKey: "gold", value: 3, chance: 0.8 }, // 80% chance to drop 3 gold
                { itemKey: "minorHealingPotion", chance: 0.1 } // 10% chance to drop a potion
            ]
        },
        banditBruiser: {
            name: "Bandit Bruiser",
            health: 25, // Increased health slightly
            maxHealth: 25,
            moves: [
                { name: "Smash", type: "attack", value: 7, description: "A powerful overhead strike." },
                { name: "Guard Up", type: "defend", value: 5, description: "Braces for impact, gaining 5 Block." }
            ],
            loot: [
                { itemKey: "gold", value: 10, chance: 1.0 },
                { itemKey: "minorHealingPotion", chance: 0.25 }
            ]
        },
        banditSlicer: {
            name: "Bandit Slicer",
            health: 18,
            maxHealth: 18,
            moves: [
                { name: "Quick Stab", type: "attack", value: 4, description: "A swift piercing attack." },
                { name: "Double Slash", type: "attack", value: 2, hits: 2, description: "Two quick slashes, 2 damage each." } // Example of multi-hit
            ],
            loot: [
                { itemKey: "gold", value: 7, chance: 1.0 },
                { itemKey: "card_Fireball", chance: 0.1 } // Example: chance to drop a specific card
            ]
        },
        banditCurser: { // Renamed for clarity
            name: "Enclave Scout", // Fits better with lore potentially
            health: 16,
            maxHealth: 16,
            moves: [
                { name: "Shadow Bolt", type: "attack", value: 3, description: "A weak bolt of dark energy." },
                { name: "Weakening Curse", type: "utility", effect: "vulnerable", duration: 2, description: "Applies Vulnerable (take 50% more damage) for 2 turns." } // Example utility move
            ],
            loot: [
                { itemKey: "gold", value: 5, chance: 1.0 },
                { itemKey: "runeShard", chance: 0.05 } // Example: rare lore item
            ]
        }
        // Add bosses from README later: Crimson Warlock, Lady Mirella etc.
    },
    items: {
        gold: { // "gold" is a special case, handled directly, but good to have a placeholder
            name: "Gold Coins",
            type: "currency",
            description: "The common currency of Eldoraeya.",
            icon: "🟡"
        },
        minorHealingPotion: {
            name: "Minor Healing Potion",
            type: "consumable",
            effect: "heal", // Tells game logic how to use it
            value: 10,      // Amount of healing
            description: "A common salve that restores 10 Health.",
            icon: "🧪"
        },
        runeShard: {
            name: "Rune Shard",
            type: "keyItem", // Or "craftingMaterial"
            description: "A fragment of an ancient rune, humming with faint power.",
            icon: "✨"
        },
        // Example of how a card drop might be represented if it's an item first
        card_Fireball: {
            name: "Scroll of Fireball",
            type: "cardScroll", // Special type indicating it grants a card
            cardKey: "Fireball", // The card it grants from cardDatabase
            description: "A scroll containing the incantation for Fireball. Adds Fireball to your deck.",
            icon: "📜"
        }
        // Add more items as needed
    },
    initialInventory: [
        // Example: Start with a potion
        // { itemKey: "minorHealingPotion", quantity: 1 } // If we want to use item keys directly
        // For now, main.js adds items based on gameState, so this can be empty or structured if main.js reads it.
        // The current main.js initializes an empty inventory array: gameState.inventory = initialInventory.slice()
        // So, if you want items here, they should be full item objects, or main.js needs to resolve keys.
        // Let's stick to the current approach in main.js where it's an empty array, and items are added programmatically or via loot.
    ]
};

// Make these available for import (less critical in browser-only, but good practice)
// window.gameData is the primary way these are accessed in the current setup.
const enemies = gameData.enemies;
const items = gameData.items;
const initialInventory = gameData.initialInventory; // This is currently an empty array

// Export for both module and non-module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { gameData, enemies, items, initialInventory };
} else {
    window.gameData = gameData;
    // These specific window assignments might be redundant if main.js uses gameData.enemies etc.
    // but let's keep them for now to ensure compatibility with existing main.js parts that might use them directly.
    window.enemies = gameData.enemies; // main.js uses gameData.enemies
    window.items = gameData.items;     // main.js uses gameData.items
    window.initialInventory = gameData.initialInventory;
}

// Add at the end of data.js to ensure it's loaded correctly
console.log("Game data loaded successfully (v2 - refactored enemies & items)");

// Make sure the data is available globally and not interfering with layout
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function() {
    console.log("DOM ready in data.js (v2)");
  });
}