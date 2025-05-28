console.log("main.js loaded (v2 - refactored)");

const SAVE_KEY = 'eldoraeya_save';

// --- DOM Element Cache ---
const DOMElements = {
    // Stats
    health: document.getElementById('health'),
    maxHealth: document.getElementById('maxHealth'),
    mana: document.getElementById('mana'),
    maxMana: document.getElementById('maxMana'),
    gold: document.getElementById('gold'),
    // Inventory
    inventoryList: document.getElementById('inventory-list'),
    globalTooltip: document.getElementById('global-tooltip'),
    // Narrative
    narrativeScreen: document.getElementById('narrative'),
    narrativeText: document.getElementById('narrative-text'),
    optionsContainer: document.getElementById('options'),
    beginAdventureButton: document.getElementById('begin-adventure'),
    genderSelectionDiv: document.getElementById('gender-selection'),
    citySelectionDiv: document.getElementById('city-selection'),
    // Combat
    combatScreen: document.getElementById('combat'),
    enemyInfo: document.getElementById('enemy-info'),
    enemyName: document.getElementById('enemy-name'),
    enemyHealth: document.getElementById('enemy-health'),
    enemyIntent: document.getElementById('enemy-intent'),
    playerHand: document.getElementById('hand'),
    endTurnButton: document.getElementById('end-turn'),
    // Buttons
    startTestCombatButton: document.getElementById('start-test-combat'),
    saveGameButton: document.getElementById('save-game'),
    // Debug (from index.html)
    addTestItemButton: document.getElementById('add-test-item')
};

// --- Initial Game State ---
const defaultGameState = {
    run: 1,
    chapter: 1,
    currentStoryPieceId: "start", // Tracks the current story piece
    playerGender: null,
    startingCity: null,
    currentCity: "Emberpeak", // Default starting city for now if not chosen
    // Player Stats
    health: 20,
    maxHealth: 20,
    mana: 3,
    maxMana: 3,
    block: 0,
    gold: 10,
    // Deck & Combat
    deck: ['Fireball', 'Fireball', 'Fireball', 'Fireball', 'Fireball', 'Flame Strike', 'Staff Guard', 'Staff Guard', 'Staff Guard', 'Staff Guard'],
    hand: [],
    discardPile: [],
    exiledPile: [], // For cards with exile mechanic
    // Narrative State
    lastNarrativeText: null, // For saving game
    lastOptionsTexts: null,  // For saving game
    completedStoryBeats: [], // Tracks beats completed in current run for narrative context
    // Combat State
    currentEnemies: [], // Array of active enemy objects in combat
    currentPieceType: 'Story', // Story, Combat, Event etc.
    // Inventory
    inventory: [], // Will store item objects
    lastSaved: null
};

let gameState = { ...defaultGameState };

// --- Utility Functions ---
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    if (window.debug && window.debug.log) {
        window.debug.log(`ERROR in ${context}: ${error.message}`);
    }
}

// --- Grok API Call (updated for secure backend proxy) ---
// IMPORTANT: The API key is no longer stored in the frontend. This function calls your Vercel backend proxy (e.g., /api/proxy),
// which securely adds the real API key and talks to the Grok API. No secrets are exposed to the browser.
//
// Usage: await callGrokAPI(prompt);
// Returns: Grok's narrative and options as a string.
//
async function callGrokAPI(prompt) {
    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: `You are Grok, the witty and slightly melancholic Chronomancer DM for Eldoraeya: Spellbound. Narrate events concisely but evocatively. Limit responses to narrative and options. Provide exactly 4 numbered options like "Options:\\n1. Option One\\n2. Option Two\\n3. Option Three\\n4. Option Four". Current city: ${gameState.currentCity}. Player health: ${gameState.health}/${gameState.maxHealth}. Gold: ${gameState.gold}.`
                    },
                    { role: "user", content: prompt }
                ],
                model: 'grok-3-mini', // Use the Grok 3 Mini model
                max_tokens: 500,
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Proxy API request failed: ${response.status} - ${errorBody}`);
        }
        const data = await response.json();
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error("Invalid proxy API response structure.");
        }
    } catch (error) {
        handleError(error, 'callGrokAPI');
        updateNarrativeDisplay("The Chronomancer's connection is unstable, and the path ahead is momentarily obscured. Please check your connection or try again after a brief pause.", []);
        return "The Chronomancer's voice falters—something’s amiss in the weave of time. (API Error)";
    }
}

// --- Game State Management ---
function saveGame() {
    try {
        gameState.lastNarrativeText = DOMElements.narrativeText.innerText;
        const optionsButtons = DOMElements.optionsContainer.querySelectorAll('button');
        gameState.lastOptionsTexts = optionsButtons.length > 0 ? Array.from(optionsButtons).map(btn => btn.innerText) : null;
        gameState.lastSaved = Date.now();
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        console.log("Game state saved:", gameState);
        if (window.debug && window.debug.log) window.debug.log("Game saved at " + new Date(gameState.lastSaved).toLocaleTimeString());
        return true;
    } catch (error) {
        handleError(error, 'saveGame');
        return false;
    }
}

function loadGame() {
    try {
        const savedStateJSON = localStorage.getItem(SAVE_KEY);
        if (savedStateJSON) {
            const loadedState = JSON.parse(savedStateJSON);
            // Merge carefully to ensure new default properties are included if save is old
            gameState = { ...defaultGameState, ...loadedState }; 
            
            // Ensure complex objects like inventory and deck are properly restored
            gameState.inventory = loadedState.inventory || [];
            gameState.deck = loadedState.deck || [...defaultGameState.deck];
            gameState.currentEnemies = loadedState.currentEnemies || [];


            console.log("Game state loaded:", gameState);
            updateUI(); // Update all static UI elements

            if (gameState.currentPieceType === 'Combat' && gameState.currentEnemies.length > 0) {
                switchToCombatView();
                // updateEnemyInfoUI must be called after enemies are fully loaded.
                // startCombat would typically handle this, but on load we directly set state.
                updateEnemyInfoUI(); // Display current enemy info
                updateEnemyIntent();
                displayHandUI(); // Display current hand
            } else {
                switchToNarrativeView();
                updateNarrativeDisplay(gameState.lastNarrativeText || "The tale continues...", gameState.lastOptionsTexts || []);
            }
            if (window.debug && window.debug.log) window.debug.log("Game loaded. Last saved: " + new Date(gameState.lastSaved).toLocaleTimeString());
            return true;
        }
        if (window.debug && window.debug.log) window.debug.log("No saved game found.");
        return false;
    } catch (error) {
        handleError(error, 'loadGame');
        DOMElements.narrativeText.innerText = "The weave of fate has unraveled. A new journey must begin.";
        return false;
    }
}

function resetGame() {
    console.log("Resetting game...");
    localStorage.removeItem(SAVE_KEY);
    gameState = { ...defaultGameState, inventory: [], deck: [...defaultGameState.deck] }; // Ensure fresh arrays
    // Instead of location.reload(), reset UI and state directly for smoother transition
    DOMElements.beginAdventureButton.style.display = 'block';
    DOMElements.genderSelectionDiv.style.display = 'none';
    DOMElements.citySelectionDiv.style.display = 'none';
    DOMElements.narrativeText.style.display = 'none';
    DOMElements.optionsContainer.style.display = 'none';
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.narrativeScreen.style.display = 'block'; // Show narrative screen for begin button
    updateUI();
    saveGame(); // Save the fresh state
    if (window.debug && window.debug.log) window.debug.log("Game reset to default state.");
}

// --- UI Update Functions ---
function updateUI() { // Updates static stats, inventory
    try {
        if (DOMElements.health) DOMElements.health.innerText = gameState.health;
        if (DOMElements.maxHealth) DOMElements.maxHealth.innerText = gameState.maxHealth;
        if (DOMElements.mana) DOMElements.mana.innerText = gameState.mana;
        if (DOMElements.maxMana) DOMElements.maxMana.innerText = gameState.maxMana;
        if (DOMElements.gold) DOMElements.gold.innerText = gameState.gold;
        updateInventoryUI();
    } catch (error) {
        handleError(error, 'updateUI');
    }
}

function updateNarrativeDisplay(text, options = []) {
    if (!text || text.trim() === "") {
        console.warn('updateNarrativeDisplay: Received empty narrative text. Displaying fallback.');
        text = "The story is currently unfolding... Please wait.";
    }

    if (DOMElements.narrativeText) {
        DOMElements.narrativeText.classList.remove('hidden');
        DOMElements.narrativeText.innerText = text;
        DOMElements.narrativeText.style.display = 'block'; 
    } else {
        console.warn('updateNarrativeDisplay: DOMElements.narrativeText is null. Cannot display narrative.');
    }

    if (DOMElements.optionsContainer) {
        DOMElements.optionsContainer.innerHTML = ''; // Clear old options
        if (options && options.length > 0) {
            DOMElements.optionsContainer.classList.remove('hidden');
            options.forEach((optText, index) => {
                const button = document.createElement('button');
                button.innerText = optText;
                // The click handler will be set by the function that calls updateNarrativeDisplay,
                // as it knows the context (e.g., handleStoryChoice, handleDefeatChoice)
                DOMElements.optionsContainer.appendChild(button);
            });
            DOMElements.optionsContainer.style.display = 'flex'; // Or 'block'
        } else {
            DOMElements.optionsContainer.style.display = 'none';
        }
    } else {
        console.warn('updateNarrativeDisplay: DOMElements.optionsContainer is null. Cannot display options.');
    }
}

function switchToNarrativeView() {
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.narrativeScreen.style.display = 'block';
    gameState.currentPieceType = 'Story';
}

function switchToCombatView() {
    DOMElements.narrativeScreen.style.display = 'none';
    DOMElements.combatScreen.style.display = 'block';
    gameState.currentPieceType = 'Combat';
}

// --- Inventory Management ---
function addToInventory(itemKey, quantity = 1) {
    const itemData = gameData.items[itemKey];
    if (!itemData) {
        console.warn(`Item key "${itemKey}" not found in gameData.items.`);
        return false;
    }

    // For stackable items, find existing and increment quantity
    // For now, let's assume items are unique instances or don't stack beyond simple display
    for (let i = 0; i < quantity; i++) {
        const newItemInstance = { ...itemData, instanceId: `${itemKey}-${Date.now()}-${Math.random()}` }; // Add unique ID
        gameState.inventory.push(newItemInstance);
    }
    
    if (window.debug && window.debug.log) window.debug.log(`Added ${quantity}x ${itemData.name} to inventory.`);
    updateInventoryUI();
    // saveGame(); // Decide if saving on every item add is too frequent
    return true;
}

function useItem(itemInstanceId) {
    const itemIndex = gameState.inventory.findIndex(item => item.instanceId === itemInstanceId);
    if (itemIndex === -1) {
        console.warn(`Item with instanceId "${itemInstanceId}" not found in inventory.`);
        return false;
    }

    const item = gameState.inventory[itemIndex];

    let used = false;
    if (item.type === "consumable" && item.effect === "heal") {
        const oldHealth = gameState.health;
        gameState.health = Math.min(gameState.health + item.value, gameState.maxHealth);
        if (window.debug && window.debug.log) window.debug.log(`Used ${item.name}, healed ${gameState.health - oldHealth} HP. Current HP: ${gameState.health}`);
        used = true;
    } else {
        if (window.debug && window.debug.log) window.debug.log(`Item ${item.name} is not a healing consumable or has no defined effect.`);
    }

    if (used) {
        gameState.inventory.splice(itemIndex, 1); // Remove item from inventory
        updateUI(); // Updates health display and re-renders inventory
        if (DOMElements.globalTooltip) DOMElements.globalTooltip.style.display = 'none'; // Hide tooltip
        saveGame();
        return true;
    }
    return false;
}

function updateInventoryUI() {
    if (!DOMElements.inventoryList) return;
    DOMElements.inventoryList.innerHTML = '';

    if (!Array.isArray(gameState.inventory) || gameState.inventory.length === 0) {
        DOMElements.inventoryList.innerHTML = '<div style="color: #9ca3af; font-style: italic;">Inventory is empty</div>';
        return;
    }

    gameState.inventory.forEach(item => { // No index needed if using item.instanceId
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `<span class="item-icon">${item.icon || '📦'}</span><span class="item-name">${item.name}</span>`;
        
        if (item.description) {
            itemElement.setAttribute('data-description', item.description);
            itemElement.addEventListener('mouseenter', (e) => showTooltip(item.description, e));
            itemElement.addEventListener('mousemove', (e) => positionTooltip(e));
            itemElement.addEventListener('mouseleave', hideTooltip);
        }

        if (item.type === 'consumable') {
            const useButton = document.createElement('button');
            useButton.textContent = 'Use';
            useButton.className = 'use-button';
            useButton.onclick = (event) => {
                event.stopPropagation();
                useItem(item.instanceId);
            };
            itemElement.appendChild(useButton);
        }
        DOMElements.inventoryList.appendChild(itemElement);
    });
}

// --- Tooltip Functions (from inventory.js, simplified) ---
function showTooltip(description, event) {
    if (DOMElements.globalTooltip) {
        DOMElements.globalTooltip.textContent = description;
        DOMElements.globalTooltip.style.display = 'block';
        positionTooltip(event);
    }
}

function hideTooltip() {
    if (DOMElements.globalTooltip) {
        DOMElements.globalTooltip.style.display = 'none';
    }
}

function positionTooltip(event) {
    if (DOMElements.globalTooltip && DOMElements.globalTooltip.style.display === 'block') {
        // Position relative to mouse cursor
        let x = event.clientX + 15;
        let y = event.clientY + 15;

        // Prevent tooltip from going off-screen
        const tooltipRect = DOMElements.globalTooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + tooltipRect.width > viewportWidth) {
            x = event.clientX - tooltipRect.width - 15;
        }
        if (y + tooltipRect.height > viewportHeight) {
            y = event.clientY - tooltipRect.height - 15;
        }
        
        DOMElements.globalTooltip.style.left = `${x}px`;
        DOMElements.globalTooltip.style.top = `${y}px`;
    }
}


// --- Narrative Flow & Player Choices ---
async function loadStoryPiece(pieceId) {
    gameState.currentStoryPieceId = pieceId;
    const chapterData = gameData.chapters.find(ch => ch.id === gameState.chapter);
    if (!chapterData) {
        handleError(new Error(`Chapter ${gameState.chapter} not found.`), 'loadStoryPiece');
        updateNarrativeDisplay("The Chronomancer seems to have lost his place in the annals of time...", []);
        return;
    }

    const piece = chapterData.storyBeats.find(b => b.id === pieceId);
    if (!piece) {
        handleError(new Error(`Story piece "${pieceId}" not found in Chapter ${gameState.chapter}.`), 'loadStoryPiece');
        updateNarrativeDisplay("A page of the story seems to be missing...", []);
        return;
    }

    gameState.currentPieceType = piece.next === 'combat' ? 'PreCombat' : 'Story';
    gameState.completedStoryBeats.push(pieceId);

    // Construct prompt for Grok
    let prompt = `Narrate the story piece: "${piece.text.replace("[city]", gameState.currentCity)}". `;
    if (piece.nextOptions) {
        prompt += `The player can choose from these conceptual actions: ${piece.nextOptions.join(", ")}. Generate 4 distinct, numbered in-character choices based on these concepts.`;
    } else if (piece.next === 'combat') {
        prompt += `This leads directly to combat with ${gameData.enemies[piece.enemyKey]?.name || 'an unknown foe'}. Describe the tense moments before the fight. Then offer 4 flavorful options that all lead to starting combat (e.g., "Steel your nerves and attack", "Attempt a preemptive spell", etc.).`;
    } else {
        prompt += `This part of the story concludes for now. What happens next is unclear. Generate 4 placeholder options like "Continue cautiously", "Look around", "Consult the Chrono-Compass", "Prepare for anything".`;
    }
    
    if (window.debug && window.debug.log) window.debug.log(`Loading piece: ${pieceId}. Grok prompt: ${prompt}`);

    const fullNarration = await callGrokAPI(prompt);
    const [narrativePart, optionsPart] = parseGrokResponse(fullNarration);
    
    updateNarrativeDisplay(narrativePart, optionsPart);

    // Setup click handlers for the newly created option buttons
    const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
    optionButtons.forEach((button, index) => {
        button.onclick = () => handleStoryChoice(piece, index, optionsPart[index]); // Pass chosen text for context
    });
    
    saveGame();
}

function parseGrokResponse(fullNarration) {
    console.log('Raw Grok response received:', fullNarration); // Requirement 1: Log raw response
    let narrativePart = fullNarration;
    let optionsArray = [];
    const optionsMarker = "Options:";
    const optionsIndex = fullNarration.indexOf(optionsMarker);

    if (optionsIndex !== -1) {
        narrativePart = fullNarration.substring(0, optionsIndex).trim();
        const optionsStr = fullNarration.substring(optionsIndex + optionsMarker.length).trim();
        optionsArray = optionsStr.split('\n')
            .map(opt => opt.replace(/^\d+[\.\)]\s*/, '').trim()) // Requirement 2: Flexible numbering
            .filter(opt => opt.length > 0); // Remove empty lines

        // Requirement 3: Fallback for empty options after marker
        if (optionsArray.length === 0) {
            console.warn("Grok response contained 'Options:' marker, but no valid options were extracted. Using fallback options.");
            optionsArray = ["Continue...", "Investigate further...", "Check surroundings...", "Prepare..."];
        }
    } else {
        // If Grok doesn't provide options in the expected format, create fallbacks
        narrativePart = fullNarration; // Use the whole response as narrative
        optionsArray = ["Continue...", "Investigate further...", "Check surroundings...", "Prepare..."];
        if (window.debug && window.debug.log) window.debug.log("Grok response did not contain 'Options:' marker. Using fallback options.");
    }
    console.log('Parsed narrative:', narrativePart, 'Parsed options:', optionsArray);
    return [narrativePart, optionsArray];
}

function handleStoryChoice(currentPiece, optionIndex, chosenOptionText) {
    if (window.debug && window.debug.log) window.debug.log(`Chose option ${optionIndex}: "${chosenOptionText}" for piece "${currentPiece.id}"`);

    if (currentPiece.next === 'combat') {
        startCombat(currentPiece.enemyKey);
    } else if (currentPiece.nextOptions) {
        const nextPieceId = currentPiece.nextOptions[optionIndex % currentPiece.nextOptions.length]; // Simple mapping
        if (nextPieceId) {
            loadStoryPiece(nextPieceId);
        } else {
            handleError(new Error(`No valid next piece ID for option index ${optionIndex}`), 'handleStoryChoice');
            updateNarrativeDisplay("The path ahead is shrouded in temporal mist...", []);
        }
    } else {
        // End of a branch, or piece without defined next steps
        // For now, could loop back to a hub or offer generic explore
        updateNarrativeDisplay("The Chronomancer ponders your choice... and the path forward seems to shift. (End of current segment)", ["Explore further", "Rest a while", "Consult map", "Check inventory"]);
        // This needs more robust handling based on game design (e.g., chapter end, new event)
    }
}

function displayCitySelection() {
    DOMElements.genderSelectionDiv.style.display = 'none';
    DOMElements.citySelectionDiv.innerHTML = '<h2>Select your starting city:</h2>';
    Object.keys(gameData.cities).forEach(cityKey => {
        const city = gameData.cities[cityKey];
        const button = document.createElement('button');
        button.innerText = `${cityKey} (${city.description})`;
        button.onclick = () => {
            gameState.startingCity = cityKey;
            gameState.currentCity = cityKey;
            DOMElements.citySelectionDiv.classList.add('hidden');
            loadStoryPiece("start"); // Start the game narrative
        };
        DOMElements.citySelectionDiv.appendChild(button);
    });
    DOMElements.citySelectionDiv.classList.remove('hidden');
}

// --- Combat System ---
async function startCombat(enemyKey) {
    const enemyDataTemplate = gameData.enemies[enemyKey];
    if (!enemyDataTemplate) {
        handleError(new Error(`Enemy key "${enemyKey}" not found.`), 'startCombat');
        updateNarrativeDisplay("A menacing presence is felt, but its form is lost to the Chronomancer's memory. The moment passes.", ["Continue cautiously"]);
        // TODO: Add click handler for the "Continue cautiously" button
        return;
    }

    // Clone enemy data for this combat instance
    const enemyInstance = JSON.parse(JSON.stringify(enemyDataTemplate)); // Deep clone
    enemyInstance.health = enemyInstance.maxHealth; // Ensure current health is max health
    enemyInstance.currentMoveIndex = 0; // Start with the first move
    enemyInstance.block = 0; // Enemies can also have block

    gameState.currentEnemies = [enemyInstance]; // For now, one enemy
    
    // Reset player combat stats
    gameState.block = 0;
    gameState.mana = gameState.maxMana; // Replenish mana at start of combat

    // Draw initial hand
    gameState.hand = [];
    gameState.discardPile = [...gameState.deck]; // Temporarily move all cards to discard
    gameState.deck = [];                         // Empty the deck
    drawCards(5); // This will shuffle discard into deck and draw 5

    gameState.currentPieceType = 'Combat';

    // Pre-fight narration using Grok
    const prompt = `The player (${gameState.playerGender || 'mage'}) encounters ${enemyInstance.name} in ${gameState.currentCity}. Describe the scene and the enemy's menacing posture. Player health: ${gameState.health}, Enemy health: ${enemyInstance.health}.`;
    const preFightNarration = await callGrokAPI(prompt);
    const [narrativePart, ] = parseGrokResponse(preFightNarration); // We don't need options here

    // Display pre-fight narration briefly, then switch to combat UI
    updateNarrativeDisplay(narrativePart, []); // No options, just text
    switchToNarrativeView(); // Show narrative screen for pre-fight text

    setTimeout(() => {
        switchToCombatView();
        updateEnemyInfoUI();
        updateEnemyIntent();
        displayHandUI();
        updateUI(); // Update player stats display (mana, block)
        saveGame();
        if (window.debug && window.debug.log) window.debug.log(`Combat started with ${enemyInstance.name}`);
    }, 3000); // 3 second delay for pre-fight text, consider a "continue" button
}

function updateEnemyInfoUI() {
    if (gameState.currentEnemies.length > 0) {
        const enemy = gameState.currentEnemies[0];
        DOMElements.enemyName.innerText = enemy.name;
        DOMElements.enemyHealth.innerText = `${enemy.health}/${enemy.maxHealth}`;
         // Add block display for enemy if it has block
        if (enemy.block > 0) {
            DOMElements.enemyHealth.innerText += ` (Block: ${enemy.block})`;
        }
    } else {
        DOMElements.enemyName.innerText = 'None';
        DOMElements.enemyHealth.innerText = 'N/A';
    }
}

function updateEnemyIntent() {
    if (gameState.currentEnemies.length > 0) {
        const enemy = gameState.currentEnemies[0];
        if (enemy.moves && enemy.moves.length > 0) {
            const move = enemy.moves[enemy.currentMoveIndex % enemy.moves.length];
            let intentText = `${move.name}`;
            if (move.type === 'attack') intentText += ` (Attack: ${move.value})`;
            if (move.type === 'defend') intentText += ` (Defend: ${move.value})`;
            if (move.description) intentText += ` - ${move.description}`;
            DOMElements.enemyIntent.innerText = intentText;
        } else {
            DOMElements.enemyIntent.innerText = "No moves defined!";
        }
    } else {
        DOMElements.enemyIntent.innerText = 'N/A';
    }
}

function drawCards(numToDraw) {
    for (let i = 0; i < numToDraw; i++) {
        if (gameState.deck.length === 0) {
            if (gameState.discardPile.length === 0) {
                if (window.debug && window.debug.log) window.debug.log("Deck and discard pile are empty. No cards to draw.");
                break; 
            }
            // Shuffle discard pile into deck
            gameState.deck = [...gameState.discardPile];
            gameState.discardPile = [];
            // Fisher-Yates shuffle
            for (let j = gameState.deck.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [gameState.deck[j], gameState.deck[k]] = [gameState.deck[k], gameState.deck[j]];
            }
            if (window.debug && window.debug.log) window.debug.log("Reshuffled discard pile into deck.");
        }
        
        if (gameState.deck.length > 0) {
           // For simplicity, take from top after shuffle. Random splice is also fine.
           gameState.hand.push(gameState.deck.pop());
        }
    }
    displayHandUI();
}

function displayHandUI() {
    if (!DOMElements.playerHand) return;
    DOMElements.playerHand.innerHTML = '';
    gameState.hand.forEach((cardName, index) => {
        const cardData = gameData.cardDatabase[cardName];
        if (!cardData) {
            console.warn(`Card "${cardName}" not found in database.`);
            return;
        }
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card'; // Add a class for styling
        // Basic card display, can be enhanced with CSS
        cardDiv.innerHTML = `
            <div class="card-name">${cardData.name} (${cardData.cost}🌀)</div>
            <div class="card-type">${cardData.type}</div>
            <div class="card-description">${cardData.description || ''}</div>
        `;
        if (gameState.mana >= cardData.cost) {
            cardDiv.classList.add('playable');
            cardDiv.onclick = () => playCard(index);
        } else {
            cardDiv.classList.add('unplayable');
        }
        DOMElements.playerHand.appendChild(cardDiv);
    });
}

function playCard(cardIndexInHand) {
    const cardName = gameState.hand[cardIndexInHand];
    const cardData = gameData.cardDatabase[cardName];

    if (!cardData || gameState.mana < cardData.cost) {
        if (window.debug && window.debug.log) window.debug.log(`Cannot play card ${cardName}. Cost: ${cardData?.cost}, Mana: ${gameState.mana}`);
        return; // Not enough mana or card not found
    }

    gameState.mana -= cardData.cost;

    // Apply card effects
    if (cardData.type === "Attack") {
        if (gameState.currentEnemies.length > 0) {
            const baseDamage = cardData.effect.damage;
            if (cardData.effect.target === "all") {
                if (window.debug && window.debug.log) window.debug.log(`Player uses AOE attack ${cardName} for ${baseDamage} base damage.`);
                gameState.currentEnemies.forEach(targetEnemy => {
                    let damageDealt = baseDamage;
                    // Apply damage considering enemy block
                    if (targetEnemy.block > 0) {
                        if (damageDealt <= targetEnemy.block) {
                            targetEnemy.block -= damageDealt;
                            damageDealt = 0;
                        } else {
                            damageDealt -= targetEnemy.block;
                            targetEnemy.block = 0;
                        }
                    }
                    targetEnemy.health -= damageDealt;
                    targetEnemy.health = Math.max(0, targetEnemy.health); // Prevent negative health
                    if (window.debug && window.debug.log) window.debug.log(`  AOE hits ${targetEnemy.name}, deals ${damageDealt} damage. ${targetEnemy.name} health: ${targetEnemy.health}`);
                });
            } else {
                // Single target attack
                const targetEnemy = gameState.currentEnemies[0]; // Default to first enemy
                let damageDealt = baseDamage;
                // Apply damage considering enemy block
                if (targetEnemy.block > 0) {
                    if (damageDealt <= targetEnemy.block) {
                        targetEnemy.block -= damageDealt;
                        damageDealt = 0;
                    } else {
                        damageDealt -= targetEnemy.block;
                        targetEnemy.block = 0;
                    }
                }
                targetEnemy.health -= damageDealt;
                targetEnemy.health = Math.max(0, targetEnemy.health); // Prevent negative health
                if (window.debug && window.debug.log) window.debug.log(`Player attacks ${targetEnemy.name} with ${cardName} for ${baseDamage} (dealt ${damageDealt}). Enemy health: ${targetEnemy.health}`);
            }
        }
    } else if (cardData.type === "Defend") {
        gameState.block += cardData.effect.block;
        if (window.debug && window.debug.log) window.debug.log(`Player uses ${cardName}, gains ${cardData.effect.block} Block. Total block: ${gameState.block}`);
    } else if (cardData.type === "Healing") {
        gameState.health = Math.min(gameState.maxHealth, gameState.health + cardData.effect.heal);
        if (window.debug && window.debug.log) window.debug.log(`Player uses ${cardName}, heals ${cardData.effect.heal} HP. Total HP: ${gameState.health}`);
    }
    // Add more effects for Utility, etc.

    // Move card from hand
    gameState.hand.splice(cardIndexInHand, 1);
    if (cardData.effect && cardData.effect.exile) {
        gameState.exiledPile.push(cardName);
        if (window.debug && window.debug.log) window.debug.log(`${cardName} is exiled.`);
    } else {
        gameState.discardPile.push(cardName);
    }

    updateUI(); // Update mana, health, block display
    updateEnemyInfoUI(); // Update enemy health display
    displayHandUI(); // Re-render hand (card removed, playability of others might change)
    
    // Check for combat end immediately after card play
    checkCombatEnd();
}

async function handleEndTurn() {
    if (gameState.currentPieceType !== 'Combat') return;
    if (window.debug && window.debug.log) window.debug.log("Player ends turn.");

    // Enemy turn
    if (gameState.currentEnemies.length > 0) {
        const enemy = gameState.currentEnemies[0]; // Assuming one enemy
        const move = enemy.moves[enemy.currentMoveIndex % enemy.moves.length];
        
        if (window.debug && window.debug.log) window.debug.log(`${enemy.name} uses ${move.name} (Type: ${move.type}, Value: ${move.value})`);

        if (move.type === 'attack') {
            let damageTaken = move.value;
            if (gameState.block > 0) {
                if (damageTaken <= gameState.block) {
                    gameState.block -= damageTaken;
                    damageTaken = 0;
                } else {
                    damageTaken -= gameState.block;
                    gameState.block = 0;
                }
            }
            gameState.health -= damageTaken;
            gameState.health = Math.max(0, gameState.health); // Prevent negative health
             if (window.debug && window.debug.log) window.debug.log(`Player takes ${move.value} (reduced to ${damageTaken}) damage. Player health: ${gameState.health}`);
        } else if (move.type === 'defend') {
            enemy.block = (enemy.block || 0) + move.value;
            if (window.debug && window.debug.log) window.debug.log(`${enemy.name} gains ${move.value} Block. Total block: ${enemy.block}`);
        }
        // Add other move types (utility, buff, debuff) here

        enemy.currentMoveIndex++; // Prepare for next move
        updateEnemyIntent(); // Show next intent
        updateEnemyInfoUI(); // Update enemy block display
    }
    
    // Player's block resets at the start of their turn, or end of enemy's turn. Let's do it here.
    // gameState.block = 0; // Decided to reset player block at start of player turn for clarity.

    await checkCombatEnd(); // Check if player or enemy died

    // If combat is still ongoing, start player's next turn
    if (gameState.currentPieceType === 'Combat') {
        gameState.mana = gameState.maxMana; // Replenish mana
        gameState.block = 0; // Player's block resets at start of their turn
        
        // Discard hand
        gameState.discardPile.push(...gameState.hand);
        gameState.hand = [];
        
        drawCards(5); // Draw new hand
        updateUI(); // Update player stats
        displayHandUI(); // Update hand display
        saveGame();
         if (window.debug && window.debug.log) window.debug.log("Player's new turn started.");
    }
}

async function checkCombatEnd() {
    let combatOver = false;
    let outcomeNarrative = "";
    let outcomeOptions = [];

    // Check for enemy defeat
    if (gameState.currentEnemies.length > 0 && gameState.currentEnemies[0].health <= 0) {
        const defeatedEnemy = gameState.currentEnemies[0];
        if (window.debug && window.debug.log) window.debug.log(`${defeatedEnemy.name} defeated!`);
        
        handleLoot(gameData.enemies[defeatedEnemy.name.toLowerCase().replace(/\s+/g, '')] || defeatedEnemy); // Try to find original enemy data for loot table

        const prompt = `The player has defeated ${defeatedEnemy.name} in ${gameState.currentCity}. Describe the victory and any immediate aftermath. Player health: ${gameState.health}. Gold: ${gameState.gold}.`;
        outcomeNarrative = await callGrokAPI(prompt);
        // Grok should provide 4 options for post-victory.
        combatOver = true;
        gameState.currentEnemies = []; // Clear enemies
    } 
    // Check for player defeat
    else if (gameState.health <= 0) {
        if (window.debug && window.debug.log) window.debug.log(`Player defeated!`);
        const enemy = gameState.currentEnemies.length > 0 ? gameState.currentEnemies[0] : { name: "their foe" };
        const prompt = `The player has been defeated by ${enemy.name} in ${gameState.currentCity}. Describe their fall.`;
        const defeatText = await callGrokAPI(prompt); // Grok provides defeat text
        
        // We define defeat options, not Grok
        updateNarrativeDisplay(parseGrokResponse(defeatText)[0], ["Restart Battle", "Rewind Path (Load Last Save)", "Abandon Run (Reset Game)"]);
        const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
        optionButtons.forEach((button, index) => {
            button.onclick = () => handleDefeatChoice(index, enemy.name.toLowerCase().replace(/\s+/g, '')); // Pass original enemy key if possible
        });
        
        switchToNarrativeView();
        gameState.currentPieceType = 'Defeat'; // Special state
        saveGame(); // Save the defeat state
        return; // Early exit, special handling for defeat options
    }

    if (combatOver) {
        switchToNarrativeView();
        const [narrativePart, optionsPart] = parseGrokResponse(outcomeNarrative);
        updateNarrativeDisplay(narrativePart, optionsPart);
        
        const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
        optionButtons.forEach((button, index) => {
            // This needs a generic "continue story" handler or map to next story beats
            button.onclick = () => {
                // For now, just load the starting piece of the chapter as a placeholder
                // This should ideally link to a specific "post_combat_victory" piece
                if (window.debug && window.debug.log) window.debug.log(`Victory option chosen. Placeholder: loading 'start' piece.`);
                loadStoryPiece(gameState.currentStoryPieceId + "_victory" || "start"); // Placeholder
            };
        });
        saveGame();
    }
}

function handleLoot(enemyDataForLoot) {
    if (!enemyDataForLoot || !Array.isArray(enemyDataForLoot.loot)) {
        if (window.debug && window.debug.log) window.debug.log("No loot table for this enemy or enemyData undefined.");
        return;
    }

    let lootGainedText = "Loot gained: ";
    let itemsGained = 0;

    enemyDataForLoot.loot.forEach(lootEntry => {
        if (Math.random() < lootEntry.chance) {
            if (lootEntry.itemKey === "gold") {
                const goldAmount = lootEntry.value || 1; // Default to 1 gold if value not specified
                gameState.gold += goldAmount;
                lootGainedText += `${goldAmount} Gold. `;
                itemsGained++;
                if (window.debug && window.debug.log) window.debug.log(`Gained ${goldAmount} gold.`);
            } else if (gameData.items[lootEntry.itemKey]) {
                addToInventory(lootEntry.itemKey); // addToInventory logs the item name
                lootGainedText += `${gameData.items[lootEntry.itemKey].name}. `;
                itemsGained++;
            } else if (gameData.cardDatabase[lootEntry.itemKey]) { // Check if loot is a card
                 gameState.deck.push(lootEntry.itemKey); // Add card directly to deck
                 lootGainedText += `Card: ${gameData.cardDatabase[lootEntry.itemKey].name}. `;
                 itemsGained++;
                 if (window.debug && window.debug.log) window.debug.log(`Gained card: ${lootEntry.itemKey}. Added to deck.`);
            }
             else {
                console.warn(`Loot itemKey "${lootEntry.itemKey}" not found in items or cards.`);
            }
        }
    });

    if (itemsGained === 0) {
        lootGainedText = "No loot found this time.";
    }
    if (window.debug && window.debug.log) window.debug.log(lootGainedText);
    // We can display lootGainedText to the player later in the post-combat narrative.
    updateUI(); // Update gold display
}


function handleDefeatChoice(optionIndex, enemyKey) { // enemyKey of the foe that defeated player
    if (optionIndex === 0) { // Restart Battle
        // Reset player health fully for the retry, or to a certain amount? Full for now.
        gameState.health = gameState.maxHealth; 
        startCombat(enemyKey); // Restart combat with the same enemy
    } else if (optionIndex === 1) { // Rewind Path (Load Last Save)
        if (!loadGame()) { // If load fails (e.g. no save)
            resetGame(); // Start fresh
            DOMElements.narrativeText.innerText = "No past to rewind to... A new journey begins.";
        }
    } else if (optionIndex === 2) { // Abandon Run (Reset Game)
        resetGame();
    }
}


// --- Game Initialization ---
function initGame() {
    console.log("Initializing game...");
    if (!loadGame()) { // If no save game, start fresh
        console.log("No saved game found or load failed. Starting new game.");
        resetGame(); // This sets up UI for new game start (begin adventure button)
    }
    updateUI(); // Ensure UI is consistent with loaded/new state
}

// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Setting up event listeners.");

    DOMElements.beginAdventureButton?.addEventListener('click', () => {
        DOMElements.beginAdventureButton.classList.add('hidden');
        DOMElements.genderSelectionDiv.classList.remove('hidden');
    });

    document.getElementById('male')?.addEventListener('click', () => {
        gameState.playerGender = 'male';
        displayCitySelection();
    });
    document.getElementById('female')?.addEventListener('click', () => {
        gameState.playerGender = 'female';
        displayCitySelection();
    });

    DOMElements.startTestCombatButton?.addEventListener('click', () => {
        if (window.debug && window.debug.log) window.debug.log("Start Test Combat button clicked.");
        // Ensure player is in a state where combat can start (e.g., not already in combat)
        if (gameState.currentPieceType !== 'Combat') {
             // Example: fight a banditBruiser. Make sure "banditbruiser" key exists in gameData.enemies
            startCombat("banditBruiser"); // Use the key for the enemy
        } else {
            if (window.debug && window.debug.log) window.debug.log("Already in combat. Test combat not started.");
        }
    });

    DOMElements.saveGameButton?.addEventListener('click', () => {
        saveGame();
        // alert("Game Saved!"); // Optional: user feedback
    });

    DOMElements.addTestItemButton?.addEventListener('click', () => { // Debug panel button
        // Add a valid item key from gameData.items
        if (gameData.items.minorHealingPotion) {
            addToInventory("minorHealingPotion");
        } else {
            console.warn("Test item 'minorHealingPotion' not found in gameData.items for debug button.");
        }
    });

    DOMElements.endTurnButton?.addEventListener('click', handleEndTurn);

    // Initialize game (loads save or starts new)
    initGame();

    // Debug: Log initial state
    if (window.debug && window.debug.log) {
        window.debug.log("Initial game state after init: " + JSON.stringify(gameState, null, 2));
    }
});

// Global functions for console access (optional, for debugging)
window.EldoraeyaDebug = {
    save: saveGame,
    load: loadGame,
    reset: resetGame,
    getState: () => gameState,
    addItem: addToInventory,
    startCombatTest: (enemyKey = "thug") => startCombat(enemyKey),
    callGrok: callGrokAPI,
    updateNarrative: updateNarrativeDisplay
};
