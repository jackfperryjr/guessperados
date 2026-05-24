import { AbilityType } from '../types';
const T1 = { tileset: 'tile-metal', bgFar: 'bg-station-interior', bgMid: 'bg-station-glow' };
const W = { small: 1200, medium: 1600, large: 2000 };
// ─── Tutorial Room ────────────────────────────────────────────────────────────
export const TUTORIAL_ROOM = {
    name: 'Docking Bay', ...T1, worldWidth: W.medium,
    exits: ['right'],
    isTutorial: true,
    platforms: [
        { x: 320, y: 560, w: 200, h: 16 },
        { x: 640, y: 480, w: 200, h: 16 },
        { x: 960, y: 560, w: 200, h: 16 },
        { x: 1280, y: 480, w: 200, h: 16 },
    ],
    enemies: [],
    destructibles: [],
    crates: [{ x: 480, y: 650 }, { x: 1120, y: 650 }],
    items: [
        { x: 500, y: 440, type: 'ability', ability: AbilityType.Fire },
        { x: 1100, y: 440, type: 'ability', ability: AbilityType.Electric },
    ],
};
// ─── Throne Room ──────────────────────────────────────────────────────────────
export const THRONE_ROOM = {
    name: 'The Throne', ...T1, worldWidth: W.medium,
    exits: ['left'],
    isThrone: true,
    platforms: [
        { x: 350, y: 560, w: 240, h: 16 },
        { x: 1250, y: 560, w: 240, h: 16 },
        { x: 800, y: 420, w: 160, h: 16 },
    ],
    enemies: [],
    destructibles: [],
    crates: [],
    items: [
        { x: 360, y: 440, type: 'ability', ability: AbilityType.Electric },
        { x: 1240, y: 440, type: 'ability', ability: AbilityType.Ice },
    ],
};
// ─── Room Pool (13 will be drawn for each run) ────────────────────────────────
const POOL = [
    // A — wide corridor, left+right exits
    {
        name: 'Reactor Corridor', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        platforms: [
            { x: 280, y: 560, w: 180, h: 16 }, { x: 540, y: 480, w: 160, h: 16 },
            { x: 800, y: 560, w: 180, h: 16 }, { x: 1060, y: 480, w: 160, h: 16 },
            { x: 1320, y: 560, w: 180, h: 16 },
        ],
        enemies: [
            { x: 400, y: 650, ability: AbilityType.Fire },
            { x: 800, y: 650, ability: AbilityType.Electric },
            { x: 1200, y: 650, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 680, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 960, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
        ],
        crates: [{ x: 560, y: 650 }, { x: 1050, y: 650 }],
        items: [{ x: 800, y: 440, type: 'heart' }],
    },
    // B — staircase up-right, exits right+top
    {
        name: 'Cargo Stairs', ...T1, worldWidth: W.medium,
        exits: ['left', 'right', 'top'],
        platforms: [
            { x: 240, y: 600, w: 200, h: 16 }, { x: 500, y: 520, w: 200, h: 16 },
            { x: 760, y: 440, w: 200, h: 16 }, { x: 1020, y: 360, w: 200, h: 16 },
            { x: 1280, y: 280, w: 200, h: 16 },
        ],
        enemies: [
            { x: 350, y: 650, ability: AbilityType.Ice },
            { x: 680, y: 500, ability: AbilityType.Fire },
            { x: 950, y: 420, ability: AbilityType.Electric },
        ],
        destructibles: [
            { x: 500, y: 500, w: 40, h: 40, health: 60, ability: AbilityType.None },
            { x: 1100, y: 340, w: 40, h: 40, health: 80, ability: AbilityType.Ice },
        ],
        crates: [{ x: 270, y: 650 }, { x: 800, y: 420 }],
        items: [{ x: 1020, y: 240, type: 'mystery' }],
    },
    // C — bottom drop, exits left+bottom
    {
        name: 'Maintenance Shaft', ...T1, worldWidth: W.small,
        exits: ['right', 'bottom'],
        platforms: [
            { x: 200, y: 560, w: 160, h: 16 }, { x: 450, y: 460, w: 160, h: 16 },
            { x: 700, y: 360, w: 160, h: 16 }, { x: 950, y: 460, w: 160, h: 16 },
        ],
        enemies: [
            { x: 250, y: 650, ability: AbilityType.Ice },
            { x: 700, y: 340, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 450, y: 440, w: 44, h: 44, health: 60, ability: AbilityType.Ice },
            { x: 550, y: 648, w: 44, h: 44, health: 80, ability: AbilityType.None },
        ],
        crates: [{ x: 350, y: 650 }, { x: 800, y: 650 }],
        items: [{ x: 700, y: 240, type: 'ability', ability: AbilityType.Electric }],
    },
    // D — crossroads, all 4 exits
    {
        name: 'Junction Chamber', ...T1, worldWidth: W.medium,
        exits: ['left', 'right', 'top', 'bottom'],
        platforms: [
            { x: 400, y: 500, w: 160, h: 16 }, { x: 800, y: 380, w: 160, h: 16 },
            { x: 1200, y: 500, w: 160, h: 16 }, { x: 600, y: 600, w: 120, h: 16 },
            { x: 1000, y: 600, w: 120, h: 16 },
        ],
        enemies: [
            { x: 300, y: 650, ability: AbilityType.Electric },
            { x: 700, y: 650, ability: AbilityType.Ice },
            { x: 1100, y: 650, ability: AbilityType.Fire },
            { x: 1400, y: 650, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 800, y: 360, w: 44, h: 44, health: 80, ability: AbilityType.Electric },
        ],
        crates: [{ x: 500, y: 650 }, { x: 900, y: 650 }, { x: 1300, y: 650 }],
        items: [{ x: 800, y: 260, type: 'heart' }, { x: 1200, y: 380, type: 'mystery' }],
    },
    // E — breakable room, no enemies
    {
        name: 'Storage Bay', ...T1, worldWidth: W.small,
        exits: ['left', 'right'],
        platforms: [
            { x: 300, y: 560, w: 200, h: 16 }, { x: 600, y: 460, w: 200, h: 16 },
            { x: 900, y: 560, w: 200, h: 16 },
        ],
        enemies: [],
        destructibles: [
            { x: 200, y: 648, w: 44, h: 44, health: 50, ability: AbilityType.Fire },
            { x: 350, y: 540, w: 44, h: 44, health: 50, ability: AbilityType.Ice },
            { x: 500, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.Ice },
            { x: 650, y: 440, w: 44, h: 44, health: 60, ability: AbilityType.Electric },
            { x: 800, y: 648, w: 44, h: 44, health: 50, ability: AbilityType.Fire },
            { x: 950, y: 540, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 1050, y: 648, w: 44, h: 44, health: 50, ability: AbilityType.Ice },
        ],
        crates: [{ x: 430, y: 650 }, { x: 730, y: 650 }, { x: 1000, y: 440 }],
        items: [{ x: 600, y: 340, type: 'heart' }, { x: 900, y: 440, type: 'mystery' }],
    },
    // F — vertical climb, top+right
    {
        name: 'Coolant Tower', ...T1, worldWidth: W.small,
        exits: ['right', 'top'],
        platforms: [
            { x: 200, y: 580, w: 180, h: 16 }, { x: 500, y: 490, w: 160, h: 16 },
            { x: 800, y: 400, w: 160, h: 16 }, { x: 500, y: 310, w: 160, h: 16 },
            { x: 800, y: 220, w: 160, h: 16 }, { x: 400, y: 140, w: 200, h: 16 },
        ],
        enemies: [
            { x: 250, y: 650, ability: AbilityType.Ice },
            { x: 600, y: 470, ability: AbilityType.Fire },
            { x: 900, y: 380, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 650, y: 290, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 350, y: 120, w: 44, h: 44, health: 80, ability: AbilityType.Ice },
        ],
        crates: [{ x: 400, y: 650 }, { x: 700, y: 380 }],
        items: [{ x: 500, y: 190, type: 'ability', ability: AbilityType.Fire }],
    },
    // G — wide room, drop platforms, left+right+bottom
    {
        name: 'Hangar Deck', ...T1, worldWidth: W.large,
        exits: ['left', 'right', 'bottom'],
        platforms: [
            { x: 350, y: 500, w: 200, h: 16 }, { x: 700, y: 580, w: 200, h: 16 },
            { x: 1000, y: 460, w: 240, h: 16 }, { x: 1350, y: 560, w: 200, h: 16 },
            { x: 1650, y: 460, w: 200, h: 16 }, { x: 1900, y: 560, w: 200, h: 16 },
        ],
        enemies: [
            { x: 400, y: 650, ability: AbilityType.Fire },
            { x: 750, y: 650, ability: AbilityType.Electric },
            { x: 1100, y: 440, ability: AbilityType.Ice },
            { x: 1400, y: 650, ability: AbilityType.Ice },
            { x: 1700, y: 440, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 600, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 1250, y: 440, w: 44, h: 44, health: 80, ability: AbilityType.Ice },
            { x: 1800, y: 440, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
        ],
        crates: [{ x: 900, y: 650 }, { x: 1600, y: 650 }],
        items: [{ x: 1000, y: 340, type: 'heart' }, { x: 1650, y: 340, type: 'mystery' }],
    },
    // H — no enemies, loot room
    {
        name: 'Supply Cache', ...T1, worldWidth: W.small,
        exits: ['left', 'right'],
        platforms: [
            { x: 300, y: 540, w: 200, h: 16 }, { x: 600, y: 440, w: 200, h: 16 },
            { x: 900, y: 540, w: 200, h: 16 },
        ],
        enemies: [],
        destructibles: [
            { x: 300, y: 520, w: 44, h: 44, health: 60, ability: AbilityType.Electric },
            { x: 500, y: 648, w: 44, h: 44, health: 50, ability: AbilityType.Ice },
            { x: 700, y: 648, w: 44, h: 44, health: 50, ability: AbilityType.Ice },
            { x: 900, y: 520, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
        ],
        crates: [{ x: 450, y: 650 }, { x: 750, y: 420 }],
        items: [
            { x: 300, y: 420, type: 'heart' },
            { x: 600, y: 320, type: 'ability', ability: AbilityType.Electric },
            { x: 900, y: 420, type: 'heart' },
        ],
    },
    // I — gauntlet, heavy enemies
    {
        name: 'Security Wing', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        platforms: [
            { x: 300, y: 560, w: 160, h: 16 }, { x: 540, y: 480, w: 140, h: 16 },
            { x: 760, y: 560, w: 140, h: 16 }, { x: 980, y: 480, w: 140, h: 16 },
            { x: 1200, y: 560, w: 140, h: 16 }, { x: 1400, y: 480, w: 140, h: 16 },
        ],
        enemies: [
            { x: 300, y: 650, ability: AbilityType.Electric },
            { x: 550, y: 460, ability: AbilityType.Ice },
            { x: 800, y: 650, ability: AbilityType.Fire },
            { x: 1050, y: 460, ability: AbilityType.Ice },
            { x: 1250, y: 650, ability: AbilityType.Electric },
            { x: 1450, y: 460, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 680, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 1100, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
        ],
        crates: [{ x: 450, y: 650 }, { x: 1300, y: 650 }],
        items: [{ x: 800, y: 440, type: 'heart' }],
    },
    // J — mixed combat, left+right
    {
        name: 'Engine Room', ...T1, worldWidth: W.large,
        exits: ['left', 'right'],
        platforms: [
            { x: 400, y: 540, w: 200, h: 16 }, { x: 800, y: 460, w: 200, h: 16 },
            { x: 1200, y: 540, w: 200, h: 16 }, { x: 1600, y: 460, w: 200, h: 16 },
            { x: 600, y: 360, w: 160, h: 16 }, { x: 1400, y: 360, w: 160, h: 16 },
        ],
        enemies: [
            { x: 450, y: 650, ability: AbilityType.Fire },
            { x: 850, y: 440, ability: AbilityType.Electric },
            { x: 1050, y: 650, ability: AbilityType.Ice },
            { x: 1250, y: 650, ability: AbilityType.Ice },
            { x: 1650, y: 440, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 700, y: 340, w: 44, h: 44, health: 80, ability: AbilityType.Ice },
            { x: 1500, y: 340, w: 44, h: 44, health: 80, ability: AbilityType.Ice },
            { x: 950, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.None },
        ],
        crates: [{ x: 650, y: 650 }, { x: 1400, y: 650 }, { x: 1750, y: 650 }],
        items: [{ x: 1200, y: 420, type: 'mystery' }, { x: 600, y: 240, type: 'heart' }],
    },
    // K — top+right, platform gaps
    {
        name: 'Observation Deck', ...T1, worldWidth: W.medium,
        exits: ['right', 'top'],
        platforms: [
            { x: 240, y: 580, w: 180, h: 16 }, { x: 520, y: 500, w: 160, h: 16 },
            { x: 780, y: 420, w: 160, h: 16 }, { x: 1040, y: 340, w: 160, h: 16 },
            { x: 1300, y: 260, w: 200, h: 16 }, { x: 600, y: 200, w: 160, h: 16 },
        ],
        enemies: [
            { x: 300, y: 650, ability: AbilityType.Ice },
            { x: 600, y: 480, ability: AbilityType.Fire },
            { x: 900, y: 400, ability: AbilityType.Electric },
        ],
        destructibles: [
            { x: 520, y: 480, w: 44, h: 44, health: 60, ability: AbilityType.None },
            { x: 1040, y: 320, w: 44, h: 44, health: 80, ability: AbilityType.Electric },
        ],
        crates: [{ x: 400, y: 650 }, { x: 850, y: 400 }],
        items: [{ x: 1300, y: 140, type: 'ability', ability: AbilityType.Ice }],
    },
    // L — complex, left+right+top
    {
        name: 'Command Level', ...T1, worldWidth: W.medium,
        exits: ['left', 'right', 'top'],
        platforms: [
            { x: 280, y: 580, w: 180, h: 16 }, { x: 560, y: 500, w: 160, h: 16 },
            { x: 800, y: 420, w: 200, h: 16 }, { x: 1080, y: 340, w: 160, h: 16 },
            { x: 1340, y: 500, w: 160, h: 16 }, { x: 700, y: 240, w: 200, h: 16 },
        ],
        enemies: [
            { x: 350, y: 650, ability: AbilityType.Ice },
            { x: 640, y: 480, ability: AbilityType.Ice },
            { x: 950, y: 400, ability: AbilityType.Electric },
            { x: 1200, y: 320, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 460, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
            { x: 800, y: 400, w: 44, h: 44, health: 70, ability: AbilityType.Ice },
        ],
        crates: [{ x: 700, y: 650 }, { x: 1150, y: 650 }],
        items: [{ x: 700, y: 120, type: 'heart' }, { x: 1080, y: 220, type: 'mystery' }],
    },
    // M — ice+bomb heavy, left+right
    {
        name: 'Cryo Bay', ...T1, worldWidth: W.small,
        exits: ['left', 'right'],
        platforms: [
            { x: 250, y: 560, w: 160, h: 16 }, { x: 500, y: 460, w: 160, h: 16 },
            { x: 750, y: 560, w: 160, h: 16 }, { x: 1000, y: 460, w: 160, h: 16 },
        ],
        enemies: [
            { x: 300, y: 650, ability: AbilityType.Ice },
            { x: 550, y: 440, ability: AbilityType.Ice },
            { x: 800, y: 650, ability: AbilityType.Ice },
            { x: 1050, y: 440, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 420, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.Ice },
            { x: 680, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.Ice },
            { x: 900, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.None },
        ],
        crates: [{ x: 600, y: 650 }],
        items: [{ x: 600, y: 340, type: 'ability', ability: AbilityType.Ice }],
    },
    // O — fire gauntlet, left+top
    {
        name: 'Furnace Block', ...T1, worldWidth: W.small,
        exits: ['left', 'top'],
        platforms: [
            { x: 200, y: 560, w: 160, h: 16 }, { x: 450, y: 460, w: 160, h: 16 },
            { x: 700, y: 360, w: 160, h: 16 }, { x: 950, y: 260, w: 160, h: 16 },
        ],
        enemies: [
            { x: 250, y: 650, ability: AbilityType.Fire },
            { x: 500, y: 440, ability: AbilityType.Fire },
            { x: 750, y: 340, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 350, y: 540, w: 44, h: 44, health: 60, ability: AbilityType.None },
            { x: 600, y: 340, w: 44, h: 44, health: 70, ability: AbilityType.Fire },
        ],
        crates: [{ x: 850, y: 650 }],
        items: [{ x: 950, y: 140, type: 'ability', ability: AbilityType.Fire }],
    },
    // Q — catwalk: narrow elevated passage, exits near top of walls
    {
        name: 'Catwalk', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        exitPositions: { left: 360, right: 360 },
        platforms: [
            // Main walkway
            { x: 800, y: 380, w: 1100, h: 16 },
            // Nothing else — open void below, ceiling above
        ],
        enemies: [
            { x: 400, y: 340, ability: AbilityType.Fire }, // flying, patrols walkway
            { x: 700, y: 340, ability: AbilityType.Fire },
            { x: 1000, y: 340, ability: AbilityType.Fire },
            { x: 400, y: 650, ability: AbilityType.Electric }, // on floor below, hard to reach
            { x: 1000, y: 650, ability: AbilityType.Ice },
        ],
        destructibles: [
            { x: 550, y: 360, w: 40, h: 40, health: 60, ability: AbilityType.Electric },
            { x: 950, y: 360, w: 40, h: 40, health: 60, ability: AbilityType.Fire },
        ],
        crates: [{ x: 700, y: 360 }, { x: 1100, y: 360 }],
        items: [
            { x: 800, y: 260, type: 'ability', ability: AbilityType.Ice },
            { x: 600, y: 640, type: 'heart' },
        ],
    },
    // R — sloped hall: diagonal floor from low-left to high-right
    {
        name: 'Sloped Hall', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        exitPositions: { left: 660, right: 200 },
        platforms: [],
        slopes: [
            { x1: 60, y1: 680, x2: 1540, y2: 140 }, // main diagonal floor
        ],
        enemies: [
            { x: 250, y: 650, ability: AbilityType.Ice },
            { x: 550, y: 490, ability: AbilityType.Electric },
            { x: 850, y: 360, ability: AbilityType.Ice },
            { x: 1150, y: 230, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 430, y: 500, w: 40, h: 40, health: 60, ability: AbilityType.None },
            { x: 730, y: 370, w: 40, h: 40, health: 70, ability: AbilityType.Ice },
        ],
        crates: [{ x: 340, y: 650 }, { x: 980, y: 370 }],
        items: [
            { x: 550, y: 400, type: 'mystery' },
            { x: 1400, y: 100, type: 'ability', ability: AbilityType.Fire },
        ],
    },
    // T — barrier gauntlet: narrow barriers force jumps across the room
    {
        name: 'Barrier Run', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        platforms: [
            // Low barriers — jump over them
            { x: 340, y: 620, w: 16, h: 140 },
            { x: 660, y: 600, w: 16, h: 120 },
            { x: 980, y: 580, w: 16, h: 100 },
            { x: 1300, y: 560, w: 16, h: 80 },
            // Mid-height ledges above each gap — drop down or jump up to them
            { x: 220, y: 480, w: 180, h: 16 },
            { x: 540, y: 440, w: 180, h: 16 },
            { x: 820, y: 400, w: 180, h: 16 },
            { x: 1120, y: 360, w: 180, h: 16 },
        ],
        enemies: [
            { x: 230, y: 650, ability: AbilityType.Ice },
            { x: 480, y: 650, ability: AbilityType.Electric },
            { x: 800, y: 650, ability: AbilityType.Fire },
            { x: 1100, y: 650, ability: AbilityType.Ice },
            { x: 1400, y: 650, ability: AbilityType.Electric },
        ],
        destructibles: [
            { x: 220, y: 460, w: 40, h: 40, health: 60, ability: AbilityType.Electric },
            { x: 820, y: 380, w: 40, h: 40, health: 60, ability: AbilityType.Ice },
        ],
        crates: [{ x: 540, y: 420 }, { x: 1120, y: 340 }],
        items: [{ x: 980, y: 260, type: 'heart' }, { x: 1400, y: 540, type: 'mystery' }],
    },
    // U — diagonal ceiling: slope descends from left-high to right-low, forcing crouch/jump
    {
        name: 'Wedge Corridor', ...T1, worldWidth: W.medium,
        exits: ['left', 'right'],
        platforms: [
            // Wide ledge on right side — platform above the sloped ceiling level
            { x: 1350, y: 320, w: 200, h: 16 },
        ],
        slopes: [
            { x1: 60, y1: 120, x2: 1100, y2: 560 }, // descending ceiling obstacle
        ],
        enemies: [
            { x: 350, y: 650, ability: AbilityType.Ice },
            { x: 650, y: 650, ability: AbilityType.Electric },
            { x: 900, y: 650, ability: AbilityType.Fire },
            { x: 1350, y: 300, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 500, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.None },
            { x: 800, y: 648, w: 44, h: 44, health: 70, ability: AbilityType.Ice },
        ],
        crates: [{ x: 300, y: 650 }, { x: 1200, y: 650 }],
        items: [
            { x: 1350, y: 200, type: 'ability', ability: AbilityType.Electric },
            { x: 650, y: 540, type: 'heart' },
        ],
    },
    // S — offset shaft: top and bottom exits both on left side
    {
        name: 'Drop Shaft', ...T1, worldWidth: W.medium,
        exits: ['top', 'bottom'],
        exitPositions: { top: 240, bottom: 240 },
        platforms: [
            // Left shaft platforms
            { x: 160, y: 560, w: 180, h: 16 },
            { x: 260, y: 440, w: 160, h: 16 },
            { x: 160, y: 320, w: 160, h: 16 },
            { x: 260, y: 200, w: 160, h: 16 },
            // Right arena platforms
            { x: 750, y: 520, w: 200, h: 16 },
            { x: 1050, y: 420, w: 200, h: 16 },
            { x: 850, y: 300, w: 200, h: 16 },
            { x: 1200, y: 560, w: 180, h: 16 },
        ],
        enemies: [
            { x: 750, y: 500, ability: AbilityType.Electric },
            { x: 1050, y: 400, ability: AbilityType.Ice },
            { x: 850, y: 280, ability: AbilityType.Electric },
            { x: 1200, y: 540, ability: AbilityType.Fire },
        ],
        destructibles: [
            { x: 200, y: 300, w: 40, h: 40, health: 60, ability: AbilityType.None },
            { x: 950, y: 400, w: 40, h: 40, health: 70, ability: AbilityType.Ice },
        ],
        crates: [{ x: 160, y: 540 }, { x: 1100, y: 540 }],
        items: [
            { x: 260, y: 100, type: 'heart' },
            { x: 850, y: 180, type: 'ability', ability: AbilityType.Electric },
        ],
    },
    // P — wide open combat
    {
        name: 'Parade Deck', ...T1, worldWidth: W.large,
        exits: ['left', 'right'],
        platforms: [
            { x: 500, y: 500, w: 240, h: 16 }, { x: 1000, y: 420, w: 240, h: 16 },
            { x: 1500, y: 500, w: 240, h: 16 }, { x: 750, y: 320, w: 200, h: 16 },
            { x: 1250, y: 320, w: 200, h: 16 },
        ],
        enemies: [
            { x: 350, y: 650, ability: AbilityType.Ice },
            { x: 700, y: 650, ability: AbilityType.Electric },
            { x: 1000, y: 400, ability: AbilityType.Fire },
            { x: 1300, y: 650, ability: AbilityType.Ice },
            { x: 1600, y: 400, ability: AbilityType.Ice },
            { x: 1800, y: 650, ability: AbilityType.Electric },
        ],
        destructibles: [
            { x: 850, y: 300, w: 44, h: 44, health: 80, ability: AbilityType.Ice },
            { x: 1350, y: 300, w: 44, h: 44, health: 80, ability: AbilityType.Fire },
        ],
        crates: [{ x: 600, y: 480 }, { x: 1100, y: 400 }, { x: 1750, y: 480 }],
        items: [{ x: 1000, y: 300, type: 'heart' }, { x: 500, y: 380, type: 'mystery' }],
    },
];
// ─── Boss Room (only reachable through Throne Room door) ─────────────────────
export const BOSS_ROOM = {
    name: 'The Bridge', ...T1, worldWidth: W.medium,
    exits: ['left'],
    isBossRoom: true,
    bossHp: 10,
    bossSpawnX: 900,
    platforms: [
        { x: 300, y: 560, w: 200, h: 16 }, { x: 700, y: 460, w: 200, h: 16 },
        { x: 1100, y: 560, w: 200, h: 16 }, { x: 1400, y: 460, w: 200, h: 16 },
    ],
    enemies: [],
    destructibles: [
        { x: 500, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.None },
        { x: 1200, y: 648, w: 44, h: 44, health: 60, ability: AbilityType.None },
    ],
    crates: [],
    items: [{ x: 400, y: 540, type: 'heart' }, { x: 1200, y: 540, type: 'heart' }],
};
export const RUN_LENGTH = 15; // tutorial + 12 random + throne + boss
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
export function generateRun() {
    // Only place rooms that have at least one forward exit (right or top) so the
    // run is never blocked by a dead-end room in the middle.
    const forwardPool = POOL.filter(r => r.exits.includes('right') || r.exits.includes('top'));
    const normal = shuffle(forwardPool).slice(0, 12);
    return [TUTORIAL_ROOM, ...normal, THRONE_ROOM, BOSS_ROOM];
}
// Legacy aliases kept so nothing else breaks until fully migrated
export const WORLD_NAMES = ['ORBITAL STATION', 'ASTEROID BELT', 'MOLTEN CORE'];
export const ROOMS_PER_RUN = 5;
export const LEVEL_POOLS = [[...POOL]];
export function generateRoomSequence(_level) { return [0]; }
