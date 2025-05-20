# Eldoraeya: Spellbound

A web-based, text-driven adventure with turn-based card combat set in a fantasy world with sci-fi elements.

## Game Overview

Eldoraeya: Spellbound is an interactive browser game mixing roguelike runs, choose-your-own-adventure storytelling, and deck-building mechanics. Players step into the robes of a novice mage wielding a chrono-compass, an artifact that links them to an amnesiac Chronomancer (your DM). In a realm where magic fades under the Eclipse Enclave's shadow, led by Archmage Darius Darkweave, you'll master elemental schools, forge alliances, and journey toward Skyreach Castle—a floating hub every path crosses—across 12 chapters and multiple runs.

### Key Features
- **Roguelike Runs**: Every playthrough is fresh with procedural elements and permadeath stakes
- **Modular Story**: Branching paths shaped by player choices, blending fixed milestones with random threads
- **Deck-Building**: Collect spells from seven magic schools to craft your combat style
- **Persistent Progression**: Unlock new spells, story beats, and a dystopian twist after multiple runs

## Game Mechanics

### Narrative System
- **Story Pieces**: Each story segment is up to 600 words in `data.js`, divisible into sub-pieces (e.g., 1A: 200 words, 1B: 250 words, 1C: 150 words) for pacing. Up to 3 segments (1800 words total) can chain for complex scenes
- **Player Choices**: 4 options per sub-piece or full piece, steering story, combat, or events
- **Dynamic Narration**: API-driven by the Chronomancer (Grok) via the chrono-compass, adapting to choices and state
- **Cities**: Unique themes, NPCs, and quests per location, chosen post-chapter, with Skyreach Castle as a mandatory mid-to-late-game hub

### Combat System
- Turn-based card battles with a focus on strategy and resource juggling
- **Deck Mechanics**:
  - Starting Deck: 10 cards (e.g., 5 "Fireball", 1 "Flame Strike", 4 "Staff Guard")
  - Draw: 5 cards per turn; shuffle discard pile if deck runs dry (exiled cards excluded)
  - Play: Spend mana to unleash Attacks, Defends, Utilities, or Healing (some with exile mechanics)
- **Enemies**: Diverse foes with unique intents (e.g., Attack 5, Defend +6), growing tougher as you progress
- **Loot**: Post-battle rewards like gold, cards, or key items, pulled from enemy drop tables

### Resources
- **Health (❤️)**: Starts at 20, persists within chapters, resets at chapter end. Hits 0? Choose to restart the fight, rewind, or abandon the run
- **Mana (🌀)**: Begins at 3 per turn, refreshes each turn (unspent mana is lost), grows +1 per chapter (max 14)
- **Gold (🟡)**: Starts at 10, spent on vendors or bribes
- **Deck**: Grows through story rewards, vendor buys, and loot—mix and match elemental schools freely

### Progression
- **Chapters**: 12 total, each tied to one city, with 10-15 pieces (Story, Combat, Encounter, Event). Players must visit Skyreach Castle as their chosen city for Chapter 7, regardless of prior path
- **Travel**: Pick the next city post-chapter, unlocking spells and lore, converging at Skyreach Castle
- **Runs**: Finish 12 chapters, and the Chronomancer rewinds time for a new run. After five runs, a dystopian future twist shakes things up

## Story and Lore

### World of Eldoraeya
Eldoraeya is a land of magic and diversity—mystical forests, volcanic peaks, sprawling deserts, and port cities bustling with humans, elves, dwarves, and beyond. Magic once surged through all, but the Eclipse Enclave's chrono-tech experiments, led by Archmage Darius Darkweave, are sapping it dry. With a chrono-compass—an ancient artifact humming with temporal energy—you, a novice mage, aim to master magic, halt the Enclave, and reach Skyreach Castle, a floating nexus tying all paths together.

### Cities
Each city has a distinct vibe, elemental school, and companion:

- **Emberpeak**: Volcanic forge city of fire mages. School: Elemental Fire. Companion: [TBD]. Lava channels light the streets; statues of fire elementals dance with flames.
- **Mysthaven**: Plains hub of arcane study (Illusion) and divine magic (Healing/Protection at the Grand Temple of Light). Companion: Esseris Rainsworth. Home to the Grand Library, Enchanted Markets, and Grand Temple of Light.
- **Sylvan Glade**: Elven forest of nature magic. School: Nature. Companion: Elara Starfall. Living wood spires rise amid a non-interventionist High Elf Council led by Thalorian Starfall.
- **Tidegarde**: Coastal port of water mages and sailors. School: Elemental Water. Companion: [TBD]. Cliffside homes and underwater caves hide treasures guarded by sea serpents.
- **Dunespire**: Desert oasis of earth mages. School: Elemental Earth. Companion: [TBD]. Sand mage academies and luminescent dunes glow under the stars.
- **Riverbloom**: Meadow village of enchantment and fairies. School: Enchantment. Companion: Lyria Lightsong. Cobblestone paths wind past healing river waters.
- **Skyreach Castle**: Floating fortress above Riverbloom. School: Wind Magic. Companion: [TBD]. Opalescent towers and light bridges offer sky-high views.

### Characters
- **Player**: A young mage in a robe, wielding an Eldertree staff and a chrono-compass, a glowing relic that channels the Chronomancer's voice
- **Chronomancer (DM)**: Therondar Kaelthorne, once Darius Darkweave's master, now a sardonic voice in the chrono-compass after a betrayal-fueled chrono-tech disaster erased his memories. He narrates with wit and melancholy, his past unfolding across runs
- **Companions**: City-specific allies like Esseris (Mysthaven), Elara (Sylvan Glade), and Lyria (Riverbloom). Other cities may offer temporary allies or quest-givers:
  - **Esseris Rainsworth**: Human mage from Mysthaven. Water/ice specialist, sharp-witted and aloof yet loyal. Met at the Grand Library or defending travelers
  - **Elara Starfall** (alias Moonrise): Elven druid from Sylvan Glade. Noble, serene, and nature-bound, she defies her council to fight the Enclave. Met at Mysthaven markets or mid-ambush
  - **Lyria Lightsong**: Half-elf cleric from Riverbloom. Kind, mature healer with light magic, seeking dark magic's source. Met at the Grand Temple or a roadside shrine

### Plot Arcs
- **Main Quest**: Master magic schools, disrupt the Eclipse Enclave, and face Darius Darkweave in the Shadow Spire
- **Side Quests**: City-specific trials (e.g., forge duels in Emberpeak, illusion puzzles in Mysthaven)
- **Dystopian Twist**: After 5 runs, a neon-lit, tech-ruled future emerges under Darius's reign, shifting the stakes

## Combat System

### Deck Mechanics
- **Starting Deck**: 10 cards (5 "Fireball" - 1 MP, 6 damage; 1 "Flame Strike" - 2 MP, 8 damage all; 4 "Staff Guard" - 1 MP, 5 block)
- **Card Types**:
  - **Attack**: Deal damage (e.g., "Fireball" - 1 MP, 6 damage)
  - **Defend**: Gain block (e.g., "Staff Guard" - 1 MP, 5 block)
  - **Utility**: Special effects (e.g., "Illusion" - 1 MP, enemy misses next turn)
  - **Healing**: Restore HP, exiled after use (e.g., "Tidal Heal" - 2 MP, +5 HP)
- **Draw**: 5 cards per turn
- **Mana**: 3 per turn (increases with chapters), refreshes each turn, lost if unspent

### Combat Flow
- **Pre-Fight Narration**: Up to 600 words to set the stage
- **Battle**: Turn-based card play vs. enemy intents (e.g., "Thug: Attack 5")
- **Post-Fight Narration**: Up to 600 words with loot (e.g., 5 🟡, Rune Shard) and next steps
- **Defeat**: Restart the fight, rewind to prior piece, or abandon run

### Magic Schools
Players master schools via study and practice (3-5 actions):

- **Elemental**: Fire (Emberpeak), Water (Tidegarde), Earth (Dunespire), Wind (Skyreach)
- **Arcane**: Enchantment (Riverbloom), Illusion (Mysthaven)
- **Nature**: Druidic (Sylvan Glade), Shamanistic (remote tribes)
- **Dark**: Necromancy, Curse (Enclave, covert)
- **Divine/Light**: Healing/Protection (Mysthaven), Offensive Light (Sanctum of Radiance)
- **Mystical**: Divination (Mysthaven Markets), Transmutation (academies)
- **Temporal**: Time/space manipulation (Temporal Nexus, late-game)

## Technical Implementation

The game is built using:
- **HTML/CSS**: Interface and styling
- **JavaScript**: Game logic in `main.js`, data in `data.js`
- **External API**: xAI's Grok for dynamic narration (est. $0.10 per chapter's narration)

### Files Structure
- `index.html`: Main game interface
- `css/style.css`: Styling (maybe swap in Tailwind CSS via CDN for speed)
- `js/data.js`: Cards, enemies, story pieces, and rules
- `js/main.js`: Logic, state management, API integration

## Development Roadmap

- [x] Basic combat system
- [x] Story progression framework
- [ ] Complete Chapter 1 content
- [ ] Expand card database
- [ ] Implement save/load system
- [ ] Add remaining cities and chapters
- [ ] Polish UI with Tailwind CSS

## Additional Notes

- **Game State**: Managed in `main.js`, saved via LocalStorage
- **API Calls**: Grok narration pulls from `gameData` and `gameState`
- **Story Pieces**: Modular types (Story, Combat, Encounter, Event) in `data.js`
- **Combat**: Turn-based, with card play and enemy intents
- **Lore**: Cities, elemental schools, and chrono-tech weave the narrative
- **Chronomancer Backstory**: Chronomancer (DM): Meet Therondar Kaelthorne, your not-so-humble guide. Once the master who taught Darius Darkweave the ropes of Temporal Magic, he was blindsided when his star pupil turned traitor. A chrono-tech experiment—Darius's bright idea—went spectacularly awry, shredding Therondar's memories and leaving him a sardonic whisper in the chrono-compass. He'd warned against meddling with forbidden time-trickery, but pride's a stubborn beast. Now, he narrates your tale with dry wit and a touch of gloom, tossing out quips like, "Oh, splendid choice—let's see if it kills us slower this time." His lost past unravels across runs, peaking in the dystopian twist when he finally recalls who he was—and what Darius cost him.
- **Bosses**: Crimson Warlock (Dunespire), Lady Mirella (Emberpeak), Thornfang (Sylvan Glade), Captain Blackmaw (Tidegarde), Zephyros (Skyreach), Darius (Shadow Spire)
- **Endgame**: Post-Darius, decide the fate of chrono-tech artifacts—restore magic or bury the past 