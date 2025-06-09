console.log("main.js loaded (v2 - refactored)");

const SAVE_KEY_PREFIX = 'eldoraeya_save_slot_';

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
    loadGameButton: document.getElementById('load-game-button'),
    loadMenu: document.getElementById('load-menu'),
    saveSlotsList: document.getElementById('save-slots-list'),
    backToMainMenuButton: document.getElementById('back-to-main-menu-button'),
    genderSelectionDiv: document.getElementById('gender-selection'),
    citySelectionDiv: document.getElementById('city-selection'),
    // Save Slot Menu (New)
    saveSlotMenu: document.getElementById('save-slot-menu'),
    saveSlotsOptionsList: document.getElementById('save-slots-options-list'),
    cancelSaveButton: document.getElementById('cancel-save-button'),
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
    currentStoryPieceId: "start",
    playerGender: null,
    startingCity: null,
    currentCity: "Emberpeak",
    health: 20,
    maxHealth: 20,
    mana: 3,
    maxMana: 3,
    block: 0,
    gold: 10,
    deck: ['Fireball', 'Fireball', 'Fireball', 'Fireball', 'Fireball', 'Flame Strike', 'Staff Guard', 'Staff Guard', 'Staff Guard', 'Staff Guard'],
    hand: [],
    discardPile: [],
    exiledPile: [],
    lastNarrativeText: null,
    lastOptionsTexts: null,
    completedStoryBeats: [],
    currentEnemies: [],
    currentPieceType: 'Story',
    inventory: [],
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

// --- Grok API Call ---
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
                model: 'grok-3-mini',
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

function getAvailableSaves() {
    const saves = [];
    for (let i = 0; i < 10; i++) {
        const key = SAVE_KEY_PREFIX + i;
        const savedDataJSON = localStorage.getItem(key);
        if (savedDataJSON) {
            try {
                const savedData = JSON.parse(savedDataJSON);
                saves.push({
                    slotId: i,
                    timestamp: savedData.timestamp,
                    description: savedData.description
                });
            } catch (e) {
                console.error(`Error parsing save data for slot ${i}:`, e);
                saves.push({ slotId: i, timestamp: 0, description: "Corrupted Save", corrupted: true });
            }
        }
    }
    return saves;
}

function saveGame(slotId) {
    if (typeof slotId !== 'number' || slotId < 0 || slotId >= 10) {
        console.error("Invalid slotId provided to saveGame:", slotId);
        return false;
    }
    try {
        const currentSaveKey = SAVE_KEY_PREFIX + slotId;
        gameState.lastNarrativeText = DOMElements.narrativeText.innerText;
        const optionsButtons = DOMElements.optionsContainer.querySelectorAll('button');
        gameState.lastOptionsTexts = optionsButtons.length > 0 ? Array.from(optionsButtons).map(btn => btn.innerText) : null;

        const dataToSave = {
            gameState: { ...gameState, lastSaved: Date.now() },
            timestamp: Date.now(),
            description: `Ch: ${gameState.chapter} - ${gameState.currentCity} - ${new Date(Date.now()).toLocaleDateString()}`
        };

        localStorage.setItem(currentSaveKey, JSON.stringify(dataToSave));
        console.log(`Game state saved to slot ${slotId}:`, dataToSave);
        if (window.debug && window.debug.log) window.debug.log(`Game saved to slot ${slotId} at ${new Date(dataToSave.timestamp).toLocaleTimeString()}`);
        return true;
    } catch (error) {
        handleError(error, `saveGame slot ${slotId}`);
        return false;
    }
}

function loadGame(slotId) {
    if (typeof slotId !== 'number' || slotId < 0 || slotId >= 10) {
        console.error("Invalid slotId provided to loadGame:", slotId);
        return false;
    }
    try {
        const currentSaveKey = SAVE_KEY_PREFIX + slotId;
        const savedDataJSON = localStorage.getItem(currentSaveKey);

        if (savedDataJSON) {
            const loadedData = JSON.parse(savedDataJSON);
            gameState = { ...defaultGameState, ...loadedData.gameState };
            gameState.inventory = loadedData.gameState.inventory || [];
            gameState.deck = loadedData.gameState.deck || [...defaultGameState.deck];
            gameState.currentEnemies = loadedData.gameState.currentEnemies || [];

            console.log(`Game state loaded from slot ${slotId}:`, gameState);
            updateUI();

            if (gameState.currentPieceType === 'Combat' && gameState.currentEnemies && gameState.currentEnemies.length > 0) {
                switchToCombatView();
                updateEnemyInfoUI();
                updateEnemyIntent();
                displayHandUI();
            } else {
                switchToNarrativeView();
                updateNarrativeDisplay(gameState.lastNarrativeText || "The tale continues...", gameState.lastOptionsTexts || []);
            }
            if (window.debug && window.debug.log) window.debug.log(`Game loaded from slot ${slotId}. Original save time: ${new Date(loadedData.timestamp).toLocaleTimeString()}. Last saved in-game: ${new Date(gameState.lastSaved).toLocaleTimeString()}`);
            return true;
        }
        if (window.debug && window.debug.log) window.debug.log(`No saved game found in slot ${slotId}.`);
        return false;
    } catch (error) {
        handleError(error, `loadGame slot ${slotId}`);
        DOMElements.narrativeText.innerText = "The weave of fate has unraveled for this save. A new journey must begin, or try another memory.";
        return false;
    }
}

function resetGame() {
    console.log("Resetting game to initial menu state...");
    gameState = { ...defaultGameState, inventory: [], deck: [...defaultGameState.deck] };

    DOMElements.beginAdventureButton.style.display = 'block';
    DOMElements.beginAdventureButton.classList.remove('hidden');
    DOMElements.loadGameButton.style.display = 'block';
    DOMElements.loadGameButton.classList.remove('hidden');

    DOMElements.loadMenu.style.display = 'none';
    DOMElements.loadMenu.classList.add('hidden');
    DOMElements.saveSlotMenu.style.display = 'none';
    DOMElements.saveSlotMenu.classList.add('hidden');

    DOMElements.narrativeScreen.style.display = 'block';
    DOMElements.narrativeScreen.classList.remove('hidden');
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.combatScreen.classList.add('hidden');

    DOMElements.genderSelectionDiv.style.display = 'none';
    DOMElements.genderSelectionDiv.classList.add('hidden');
    DOMElements.citySelectionDiv.style.display = 'none';
    DOMElements.citySelectionDiv.classList.add('hidden');
    DOMElements.narrativeText.style.display = 'none';
    DOMElements.optionsContainer.style.display = 'none';

    updateUI();
    if (window.debug && window.debug.log) window.debug.log("Game reset to initial menu. Save slots not affected.");
}

// --- UI Update Functions ---
function updateUI() {
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

function displayLoadMenu() {
    DOMElements.beginAdventureButton.style.display = 'none';
    DOMElements.loadGameButton.style.display = 'none';

    DOMElements.narrativeScreen.style.display = 'none';
    DOMElements.narrativeScreen.classList.add('hidden');
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.combatScreen.classList.add('hidden');
    DOMElements.saveSlotMenu.style.display = 'none'; // Hide save menu if open
    DOMElements.saveSlotMenu.classList.add('hidden');

    DOMElements.loadMenu.classList.remove('hidden');
    DOMElements.loadMenu.style.display = 'block';

    const saves = getAvailableSaves();
    DOMElements.saveSlotsList.innerHTML = '';

    if (saves.length === 0) {
        const noSavesEntry = document.createElement('div');
        noSavesEntry.className = 'save-slot-entry-empty';
        noSavesEntry.textContent = 'No save games found.';
        DOMElements.saveSlotsList.appendChild(noSavesEntry);
    } else {
        for (let i = 0; i < 10; i++) {
            const save = saves.find(s => s.slotId === i);
            const slotEntry = document.createElement('div');
            slotEntry.className = 'save-slot-entry';

            const slotInfo = document.createElement('span');
            if (save) {
                if (save.corrupted) {
                    slotInfo.textContent = `Slot ${i + 1}: Corrupted Save Data`;
                    slotEntry.classList.add('corrupted');
                } else {
                    const dateString = new Date(save.timestamp).toLocaleString();
                    slotInfo.textContent = `Slot ${i + 1}: ${save.description || 'Game Saved'} - ${dateString}`;
                }

                const loadButton = document.createElement('button');
                loadButton.textContent = 'Load';
                loadButton.className = 'load-slot-button';
                if (save.corrupted) {
                    loadButton.disabled = true;
                } else {
                    loadButton.onclick = () => {
                        if (loadGame(save.slotId)) {
                            DOMElements.loadMenu.classList.add('hidden');
                            DOMElements.loadMenu.style.display = 'none';
                        } else {
                            alert(`Failed to load save from slot ${save.slotId + 1}.`);
                        }
                    };
                }
                slotEntry.appendChild(slotInfo);
                slotEntry.appendChild(loadButton);
            } else {
                slotInfo.textContent = `Slot ${i + 1}: Empty`;
                slotEntry.appendChild(slotInfo);
            }
            DOMElements.saveSlotsList.appendChild(slotEntry);
        }
    }
    if (window.debug && window.debug.log) window.debug.log("Displayed load menu.");
}

function displaySaveSlotMenu() {
    DOMElements.narrativeScreen.style.display = 'none';
    DOMElements.narrativeScreen.classList.add('hidden');
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.combatScreen.classList.add('hidden');
    DOMElements.loadMenu.style.display = 'none';
    DOMElements.loadMenu.classList.add('hidden');

    DOMElements.saveSlotMenu.classList.remove('hidden');
    DOMElements.saveSlotMenu.style.display = 'block';

    const saves = getAvailableSaves();
    DOMElements.saveSlotsOptionsList.innerHTML = '';

    for (let i = 0; i < 10; i++) {
        const save = saves.find(s => s.slotId === i);
        const slotEntry = document.createElement('div');
        slotEntry.className = 'save-slot-option-entry';

        const slotInfo = document.createElement('span');
        const saveButtonElement = document.createElement('button');
        saveButtonElement.className = 'save-to-this-slot-button';
        saveButtonElement.dataset.slotId = i;

        if (save) {
            if (save.corrupted) {
                slotInfo.textContent = `Slot ${i + 1}: Corrupted Save Data`;
                slotEntry.classList.add('corrupted');
                saveButtonElement.textContent = 'Unavailable';
                saveButtonElement.disabled = true;
            } else {
                const dateString = new Date(save.timestamp).toLocaleString();
                slotInfo.textContent = `Slot ${i + 1}: ${save.description || 'Game Saved'} - ${dateString}`;
                saveButtonElement.textContent = 'Overwrite';
            }
        } else {
            slotInfo.textContent = `Slot ${i + 1}: Empty`;
            saveButtonElement.textContent = 'Save Here';
        }

        saveButtonElement.onclick = () => {
            const slotIdToSave = parseInt(saveButtonElement.dataset.slotId);
            if (save && !save.corrupted) {
                if (!confirm(`Are you sure you want to overwrite save slot ${slotIdToSave + 1}?`)) {
                    return;
                }
            }
            if (saveGame(slotIdToSave)) {
                if (window.debug && window.debug.log) window.debug.log(`Game saved to slot ${slotIdToSave + 1}.`);
                hideSaveSlotMenuAndRestoreGameView();
            } else {
                alert(`Failed to save game to slot ${slotIdToSave + 1}.`);
            }
        };

        slotEntry.appendChild(slotInfo);
        slotEntry.appendChild(saveButtonElement);
        DOMElements.saveSlotsOptionsList.appendChild(slotEntry);
    }
    if (window.debug && window.debug.log) window.debug.log("Displayed save slot menu.");
}

function hideSaveSlotMenuAndRestoreGameView() {
    DOMElements.saveSlotMenu.style.display = 'none';
    DOMElements.saveSlotMenu.classList.add('hidden');

    if (gameState.currentPieceType === 'Combat') {
        switchToCombatView();
    } else {
        switchToNarrativeView();
    }
     if (window.debug && window.debug.log) window.debug.log("Save slot menu hidden, game view restored.");
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
        console.warn('updateNarrativeDisplay: DOMElements.narrativeText is null.');
    }
    if (DOMElements.optionsContainer) {
        DOMElements.optionsContainer.innerHTML = '';
        if (options && options.length > 0) {
            DOMElements.optionsContainer.classList.remove('hidden');
            options.forEach((optText) => {
                const button = document.createElement('button');
                button.innerText = optText;
                DOMElements.optionsContainer.appendChild(button);
            });
            DOMElements.optionsContainer.style.display = 'flex';
        } else {
            DOMElements.optionsContainer.style.display = 'none';
        }
    } else {
        console.warn('updateNarrativeDisplay: DOMElements.optionsContainer is null.');
    }
}

function switchToNarrativeView() {
    DOMElements.combatScreen.style.display = 'none';
    DOMElements.combatScreen.classList.add('hidden');
    DOMElements.loadMenu.style.display = 'none';
    DOMElements.loadMenu.classList.add('hidden');
    DOMElements.saveSlotMenu.style.display = 'none';
    DOMElements.saveSlotMenu.classList.add('hidden');
    DOMElements.narrativeScreen.style.display = 'block';
    DOMElements.narrativeScreen.classList.remove('hidden');
    gameState.currentPieceType = 'Story';
}

function switchToCombatView() {
    DOMElements.narrativeScreen.style.display = 'none';
    DOMElements.narrativeScreen.classList.add('hidden');
    DOMElements.loadMenu.style.display = 'none';
    DOMElements.loadMenu.classList.add('hidden');
    DOMElements.saveSlotMenu.style.display = 'none';
    DOMElements.saveSlotMenu.classList.add('hidden');
    DOMElements.combatScreen.style.display = 'block';
    DOMElements.combatScreen.classList.remove('hidden');
    gameState.currentPieceType = 'Combat';
}

// --- Inventory Management ---
function addToInventory(itemKey, quantity = 1) {
    const itemData = gameData.items[itemKey];
    if (!itemData) {
        console.warn(`Item key "${itemKey}" not found in gameData.items.`);
        return false;
    }
    for (let i = 0; i < quantity; i++) {
        const newItemInstance = { ...itemData, instanceId: `${itemKey}-${Date.now()}-${Math.random()}` };
        gameState.inventory.push(newItemInstance);
    }
    if (window.debug && window.debug.log) window.debug.log(`Added ${quantity}x ${itemData.name} to inventory.`);
    updateInventoryUI();
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
        gameState.inventory.splice(itemIndex, 1);
        updateUI();
        if (DOMElements.globalTooltip) DOMElements.globalTooltip.style.display = 'none';
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
    gameState.inventory.forEach(item => {
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

// --- Tooltip Functions ---
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
        let x = event.clientX + 15;
        let y = event.clientY + 15;
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
    const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
    optionButtons.forEach((button, index) => {
        button.onclick = () => handleStoryChoice(piece, index, optionsPart[index]);
    });
}

function parseGrokResponse(fullNarration) {
    console.log('Raw Grok response received:', fullNarration);
    let narrativePart = fullNarration;
    let optionsArray = [];
    const optionsMarker = "Options:";
    const optionsIndex = fullNarration.indexOf(optionsMarker);
    if (optionsIndex !== -1) {
        narrativePart = fullNarration.substring(0, optionsIndex).trim();
        const optionsStr = fullNarration.substring(optionsIndex + optionsMarker.length).trim();
        optionsArray = optionsStr.split('\n')
            .map(opt => opt.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(opt => opt.length > 0);
        if (optionsArray.length === 0) {
            console.warn("Grok response contained 'Options:' marker, but no valid options were extracted. Using fallback options.");
            optionsArray = ["Continue...", "Investigate further...", "Check surroundings...", "Prepare..."];
        }
    } else {
        narrativePart = fullNarration;
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
        const nextPieceId = currentPiece.nextOptions[optionIndex % currentPiece.nextOptions.length];
        if (nextPieceId) {
            loadStoryPiece(nextPieceId);
        } else {
            handleError(new Error(`No valid next piece ID for option index ${optionIndex}`), 'handleStoryChoice');
            updateNarrativeDisplay("The path ahead is shrouded in temporal mist...", []);
        }
    } else {
        updateNarrativeDisplay("The Chronomancer ponders your choice... and the path forward seems to shift. (End of current segment)", ["Explore further", "Rest a while", "Consult map", "Check inventory"]);
    }
}

function displayCitySelection() {
    DOMElements.genderSelectionDiv.style.display = 'none';
    DOMElements.genderSelectionDiv.classList.add('hidden');
    DOMElements.citySelectionDiv.innerHTML = '<h2>Select your starting city:</h2>';
    Object.keys(gameData.cities).forEach(cityKey => {
        const city = gameData.cities[cityKey];
        const button = document.createElement('button');
        button.innerText = `${cityKey} (${city.description})`;
        button.onclick = () => {
            gameState.startingCity = cityKey;
            gameState.currentCity = cityKey;
            DOMElements.citySelectionDiv.classList.add('hidden');
            DOMElements.citySelectionDiv.style.display = 'none';
            DOMElements.narrativeText.style.display = 'block';
            DOMElements.optionsContainer.style.display = 'flex';
            loadStoryPiece("start");
        };
        DOMElements.citySelectionDiv.appendChild(button);
    });
    DOMElements.citySelectionDiv.classList.remove('hidden');
    DOMElements.citySelectionDiv.style.display = 'block';
}

// --- Combat System ---
async function startCombat(enemyKey) {
    const enemyDataTemplate = gameData.enemies[enemyKey];
    if (!enemyDataTemplate) {
        handleError(new Error(`Enemy key "${enemyKey}" not found.`), 'startCombat');
        updateNarrativeDisplay("A menacing presence is felt, but its form is lost to the Chronomancer's memory. The moment passes.", ["Continue cautiously"]);
        return;
    }
    const enemyInstance = JSON.parse(JSON.stringify(enemyDataTemplate));
    enemyInstance.health = enemyInstance.maxHealth;
    enemyInstance.currentMoveIndex = 0;
    enemyInstance.block = 0;
    gameState.currentEnemies = [enemyInstance];
    gameState.block = 0;
    gameState.mana = gameState.maxMana;
    gameState.hand = [];
    gameState.discardPile = [...gameState.deck];
    gameState.deck = [];
    drawCards(5);
    gameState.currentPieceType = 'Combat';
    const prompt = `The player (${gameState.playerGender || 'mage'}) encounters ${enemyInstance.name} in ${gameState.currentCity}. Describe the scene and the enemy's menacing posture. Player health: ${gameState.health}, Enemy health: ${enemyInstance.health}.`;
    const preFightNarration = await callGrokAPI(prompt);
    const [narrativePart, ] = parseGrokResponse(preFightNarration);
    updateNarrativeDisplay(narrativePart, []);
    switchToNarrativeView();
    setTimeout(() => {
        switchToCombatView();
        updateEnemyInfoUI();
        updateEnemyIntent();
        displayHandUI();
        updateUI();
        if (window.debug && window.debug.log) window.debug.log(`Combat started with ${enemyInstance.name}`);
    }, 3000);
}

function updateEnemyInfoUI() {
    if (gameState.currentEnemies.length > 0) {
        const enemy = gameState.currentEnemies[0];
        DOMElements.enemyName.innerText = enemy.name;
        DOMElements.enemyHealth.innerText = `${enemy.health}/${enemy.maxHealth}`;
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
            gameState.deck = [...gameState.discardPile];
            gameState.discardPile = [];
            for (let j = gameState.deck.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [gameState.deck[j], gameState.deck[k]] = [gameState.deck[k], gameState.deck[j]];
            }
            if (window.debug && window.debug.log) window.debug.log("Reshuffled discard pile into deck.");
        }
        if (gameState.deck.length > 0) {
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
        cardDiv.className = 'card';
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
        return;
    }
    gameState.mana -= cardData.cost;
    if (cardData.type === "Attack") {
        if (gameState.currentEnemies.length > 0) {
            const baseDamage = cardData.effect.damage;
            if (cardData.effect.target === "all") {
                if (window.debug && window.debug.log) window.debug.log(`Player uses AOE attack ${cardName} for ${baseDamage} base damage.`);
                gameState.currentEnemies.forEach(targetEnemy => {
                    let damageDealt = baseDamage;
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
                    targetEnemy.health = Math.max(0, targetEnemy.health);
                    if (window.debug && window.debug.log) window.debug.log(`  AOE hits ${targetEnemy.name}, deals ${damageDealt} damage. ${targetEnemy.name} health: ${targetEnemy.health}`);
                });
            } else {
                const targetEnemy = gameState.currentEnemies[0];
                let damageDealt = baseDamage;
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
                targetEnemy.health = Math.max(0, targetEnemy.health);
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
    gameState.hand.splice(cardIndexInHand, 1);
    if (cardData.effect && cardData.effect.exile) {
        gameState.exiledPile.push(cardName);
        if (window.debug && window.debug.log) window.debug.log(`${cardName} is exiled.`);
    } else {
        gameState.discardPile.push(cardName);
    }
    updateUI();
    updateEnemyInfoUI();
    displayHandUI();
    checkCombatEnd();
}

async function handleEndTurn() {
    if (gameState.currentPieceType !== 'Combat') return;
    if (window.debug && window.debug.log) window.debug.log("Player ends turn.");
    if (gameState.currentEnemies.length > 0) {
        const enemy = gameState.currentEnemies[0];
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
            gameState.health = Math.max(0, gameState.health);
             if (window.debug && window.debug.log) window.debug.log(`Player takes ${move.value} (reduced to ${damageTaken}) damage. Player health: ${gameState.health}`);
        } else if (move.type === 'defend') {
            enemy.block = (enemy.block || 0) + move.value;
            if (window.debug && window.debug.log) window.debug.log(`${enemy.name} gains ${move.value} Block. Total block: ${enemy.block}`);
        }
        enemy.currentMoveIndex++;
        updateEnemyIntent();
        updateEnemyInfoUI();
    }
    await checkCombatEnd();
    if (gameState.currentPieceType === 'Combat') {
        gameState.mana = gameState.maxMana;
        gameState.block = 0;
        gameState.discardPile.push(...gameState.hand);
        gameState.hand = [];
        drawCards(5);
        updateUI();
        displayHandUI();
         if (window.debug && window.debug.log) window.debug.log("Player's new turn started.");
    }
}

async function checkCombatEnd() {
    let combatOver = false;
    let outcomeNarrative = "";
    if (gameState.currentEnemies.length > 0 && gameState.currentEnemies[0].health <= 0) {
        const defeatedEnemy = gameState.currentEnemies[0];
        if (window.debug && window.debug.log) window.debug.log(`${defeatedEnemy.name} defeated!`);
        handleLoot(gameData.enemies[defeatedEnemy.name.toLowerCase().replace(/\s+/g, '')] || defeatedEnemy);
        const prompt = `The player has defeated ${defeatedEnemy.name} in ${gameState.currentCity}. Describe the victory and any immediate aftermath. Player health: ${gameState.health}. Gold: ${gameState.gold}.`;
        outcomeNarrative = await callGrokAPI(prompt);
        combatOver = true;
        gameState.currentEnemies = [];
    }
    else if (gameState.health <= 0) {
        if (window.debug && window.debug.log) window.debug.log(`Player defeated!`);
        const enemy = gameState.currentEnemies.length > 0 ? gameState.currentEnemies[0] : { name: "their foe" };
        const prompt = `The player has been defeated by ${enemy.name} in ${gameState.currentCity}. Describe their fall.`;
        const defeatText = await callGrokAPI(prompt);
        updateNarrativeDisplay(parseGrokResponse(defeatText)[0], ["Restart Battle", "Rewind Path (Load Last Save)", "Abandon Run (Reset Game)"]);
        const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
        optionButtons.forEach((button, index) => {
            const enemyKeyForRestart = gameData.enemies[enemy.name.toLowerCase().replace(/\s+/g, '')] ? enemy.name.toLowerCase().replace(/\s+/g, '') : null;
            button.onclick = () => handleDefeatChoice(index, enemyKeyForRestart);
        });
        switchToNarrativeView();
        gameState.currentPieceType = 'Defeat';
        return;
    }
    if (combatOver) {
        switchToNarrativeView();
        const [narrativePart, optionsPart] = parseGrokResponse(outcomeNarrative);
        updateNarrativeDisplay(narrativePart, optionsPart);
        const optionButtons = DOMElements.optionsContainer.querySelectorAll('button');
        optionButtons.forEach((button) => {
            button.onclick = () => {
                if (window.debug && window.debug.log) window.debug.log(`Victory option chosen. Placeholder: loading 'start' piece.`);
                loadStoryPiece(gameState.currentStoryPieceId + "_victory" || "start");
            };
        });
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
                const goldAmount = lootEntry.value || 1;
                gameState.gold += goldAmount;
                lootGainedText += `${goldAmount} Gold. `;
                itemsGained++;
                if (window.debug && window.debug.log) window.debug.log(`Gained ${goldAmount} gold.`);
            } else if (gameData.items[lootEntry.itemKey]) {
                addToInventory(lootEntry.itemKey);
                lootGainedText += `${gameData.items[lootEntry.itemKey].name}. `;
                itemsGained++;
            } else if (gameData.cardDatabase[lootEntry.itemKey]) {
                 gameState.deck.push(lootEntry.itemKey);
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
    updateUI();
}

function handleDefeatChoice(optionIndex, enemyKey) {
    if (optionIndex === 0) {
        if (!enemyKey) {
            console.error("Cannot restart battle, enemyKey is missing.");
            resetGame();
            return;
        }
        gameState.health = gameState.maxHealth;
        startCombat(enemyKey);
    } else if (optionIndex === 1) {
        if (!loadGame(0)) {
            resetGame();
            DOMElements.narrativeText.innerText = "No past to rewind to... A new journey begins.";
        }
    } else if (optionIndex === 2) {
        resetGame();
    }
}

function initGame() {
    console.log("Initializing game (multi-save ready)...");
    resetGame();
    updateUI();
}

// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Setting up event listeners.");

    DOMElements.beginAdventureButton?.addEventListener('click', () => {
        DOMElements.beginAdventureButton.style.display = 'none';
        DOMElements.loadGameButton.style.display = 'none';
        DOMElements.genderSelectionDiv.classList.remove('hidden');
        DOMElements.genderSelectionDiv.style.display = 'flex';
    });

    DOMElements.loadGameButton?.addEventListener('click', () => {
        displayLoadMenu();
    });

    DOMElements.backToMainMenuButton?.addEventListener('click', () => {
        DOMElements.loadMenu.classList.add('hidden');
        DOMElements.loadMenu.style.display = 'none';
        DOMElements.saveSlotMenu.classList.add('hidden'); // Ensure save menu is also hidden
        DOMElements.saveSlotMenu.style.display = 'none';

        DOMElements.beginAdventureButton.style.display = 'block';
        DOMElements.loadGameButton.style.display = 'block';

        DOMElements.narrativeScreen.style.display = 'block';
        DOMElements.narrativeScreen.classList.remove('hidden');
        DOMElements.combatScreen.style.display = 'none';
        DOMElements.combatScreen.classList.add('hidden');

        DOMElements.genderSelectionDiv.style.display = 'none';
        DOMElements.genderSelectionDiv.classList.add('hidden');
        DOMElements.citySelectionDiv.style.display = 'none';
        DOMElements.citySelectionDiv.classList.add('hidden');
        DOMElements.narrativeText.style.display = 'none';
        DOMElements.optionsContainer.style.display = 'none';

        if (window.debug && window.debug.log) window.debug.log("Returned to main menu.");
    });

    DOMElements.cancelSaveButton?.addEventListener('click', () => {
        hideSaveSlotMenuAndRestoreGameView();
    });

    DOMElements.saveGameButton?.addEventListener('click', () => {
        displaySaveSlotMenu();
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
        if (gameState.currentPieceType !== 'Combat') {
            startCombat("banditBruiser");
        } else {
            if (window.debug && window.debug.log) window.debug.log("Already in combat. Test combat not started.");
        }
    });

    DOMElements.addTestItemButton?.addEventListener('click', () => {
        if (gameData.items.minorHealingPotion) {
            addToInventory("minorHealingPotion");
        } else {
            console.warn("Test item 'minorHealingPotion' not found in gameData.items for debug button.");
        }
    });
    DOMElements.endTurnButton?.addEventListener('click', handleEndTurn);
    initGame();
    if (window.debug && window.debug.log) {
        window.debug.log("Initial game state after init: " + JSON.stringify(gameState, null, 2));
    }
});

// Global functions for console access (optional, for debugging)
window.EldoraeyaDebug = {
    save: (slotId = 0) => saveGame(slotId),
    load: (slotId = 0) => loadGame(slotId),
    reset: resetGame,
    getState: () => gameState,
    addItem: addToInventory,
    startCombatTest: (enemyKey = "thug") => startCombat(enemyKey),
    callGrok: callGrokAPI,
    updateNarrative: updateNarrativeDisplay,
    getSaves: getAvailableSaves
};
