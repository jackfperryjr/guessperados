import { AbilityType, DamageType } from '../types'

export type ExitDir = 'left' | 'right' | 'top' | 'bottom'

export interface Platform    { x: number; y: number; w: number; h: number }
export interface SlopeConfig { x1: number; y1: number; x2: number; y2: number }
export interface EnemySpawn  { x: number; y: number; ability: AbilityType }
export interface DestructibleSpawn {
  x: number; y: number; w: number; h: number; health: number
  resistances?: Partial<Record<DamageType, number>>; ability: AbilityType
  furnitureType?: 'bookcase' | 'table' | 'chest'
}
export interface CrateSpawn  { x: number; y: number }

export type ItemType = 'heart' | 'life' | 'ability' | 'mystery' | 'speed' | 'attack-boost' | 'pizza' | 'worm' | 'roly-poly'
export interface ItemSpawn {
  x: number; y: number
  type: ItemType
  ability?: AbilityType
}

export interface FurnitureSpawn {
  type: 'bookcase' | 'table' | 'chest'
  x: number
  y?: number          // explicit world Y for the furniture center; overrides floor scan
  ability?: AbilityType
  scanFromY?: number  // world Y to start scanning downward; only used when y is absent
}

export interface SpikeFloorSpawn {
  x: number; y: number
  xEnd?: number       // fill spikes from x to xEnd
  variant?: 1 | 2    // spike_floor1 or spike_floor2 (defaults to 1)
  scale?: number      // display scale multiplier (step = scale * 32, defaults to 1)
}

export interface RoomConfig {
  name: string
  worldWidth: number
  tileset: string
  bgFar: string
  bgMid: string
  exits: ExitDir[]
  exitPositions?: Partial<Record<ExitDir, number>>
  barrierExit?: { x: number; y: number }
  barrierVisual?: { x: number; y: number; w: number; h: number }
  isTutorial?: boolean
  isThrone?: boolean
  isBossRoom?: boolean
  bossHp?: number
  bossName?: string
  bossKey?: string
  bossFlying?: boolean
  bossSpawnX?: number
  bossSpawnY?: number
  bossPortal?: { x: number; y: number }
  bossDefeatedKey?: string   // registry key set to true when this boss room's boss dies
  leftExitForward?: boolean   // left exit advances runIndex instead of going back
  rightExitBack?: boolean     // right exit goes back (decrements runIndex) instead of forward
  backPortal?: { x: number; y: number }  // non-glowing boss door for returning to previous room
  backPortalKey?: string                  // registry key to check instead of bossDefeatedKey
  backPortalEntryDir?: ExitDir            // which direction to enter the previous room from
  bossRightBarrierX?: number              // override x for the right-exit barrier (default: worldWidth - 150)
  bossRightBarrierY?: number              // override center-y for the right-exit barrier
  entrySpawns?: Partial<Record<ExitDir, { x: number; y: number }>>  // per-direction spawn overrides
  spawnX?: number            // override default left-entry X for continuous world rooms
  starOrbSide?: 'left' | 'right'  // which corner the star-burst orb appears in
  starOrb?: { x: number; y: number }  // explicit star-burst orb position (overrides starOrbSide)
  roomImage?: string
  worldHeight?: number
  worldMap?: { key: string; tileKey: string; tilesetName: string; section?: { col: number; row: number; cols: number; rows: number } }
  platforms: Platform[]
  slopes?: SlopeConfig[]
  enemies: EnemySpawn[]
  destructibles: DestructibleSpawn[]
  furnitureSpawns?: FurnitureSpawn[]
  spikeFloors?: SpikeFloorSpawn[]
  crates: CrateSpawn[]
  items: ItemSpawn[]
}

const HALL    = { tileset: 'tile-castle', bgFar: 'bg-great-hall', bgMid: 'bg-hall-glow'    }
const SANCTUM = { tileset: 'tile-castle', bgFar: 'bg-sanctum',     bgMid: 'bg-sanctum-glow' }
const MAP       = { key: 'world-map',      tileKey: 'tileset',           tilesetName: 'spritefusion' } as const
const BOSS_MAP  = { key: 'boss-map-one',   tileKey: 'boss-tileset-one',  tilesetName: 'spritefusion' } as const
const MAP_TWO   = { key: 'world-map-two',  tileKey: 'tileset-two',       tilesetName: 'spritefusion' } as const
const BOSS_MAP_TWO   = { key: 'boss-map-two',   tileKey: 'boss-tileset-two',   tilesetName: 'spritefusion' } as const
const MAP_THREE      = { key: 'world-map-three', tileKey: 'tileset-three',      tilesetName: 'spritefusion' } as const
const BOSS_MAP_THREE = { key: 'boss-map-three',  tileKey: 'boss-tileset-three', tilesetName: 'spritefusion' } as const

// ─── Main World (full tilemap, camera follows player) ─────────────────────────
// Map: tileset/one/map.json — 174×117 tiles at 32px = 5568×3744 world pixels

const WORLD_ROOM: RoomConfig = {
  name: 'The Castle',
  ...HALL,
  worldWidth:  174 * 32,   // 5568
  worldHeight: 117 * 32,   // 3744
  worldMap: { ...MAP },
  exits: [],
  platforms: [],
  bossPortal: { x: 4746, y: 3104 },
  enemies: [
    // Skeletons
    { x:  367, y: 1280, ability: AbilityType.Lightning },
    { x:  906, y: 1280, ability: AbilityType.Lightning },
    // Bats
    { x: 1863, y:  768, ability: AbilityType.Bat },
    { x: 1716, y:  150, ability: AbilityType.Bat },
    // Zombies
    { x: 2100, y: 1582, ability: AbilityType.Fire },
    { x:  359, y: 1696, ability: AbilityType.Fire },
    { x:  423, y: 1696, ability: AbilityType.Fire },
    // 5 skeletons
    { x: 1036, y: 2368, ability: AbilityType.Lightning },
    { x: 1100, y: 2368, ability: AbilityType.Lightning },
    { x: 1164, y: 2368, ability: AbilityType.Lightning },
    { x: 1228, y: 2368, ability: AbilityType.Lightning },
    { x: 1292, y: 2368, ability: AbilityType.Lightning },
    // 3 skeletons
    { x: 2968, y:  640, ability: AbilityType.Lightning },
    { x: 3032, y:  640, ability: AbilityType.Lightning },
    { x: 3096, y:  640, ability: AbilityType.Lightning },
    // 2 bats
    { x: 4581, y:  224, ability: AbilityType.Bat },
    { x: 4645, y:  224, ability: AbilityType.Bat },
    // 2 zombies
    { x: 4582, y:  672, ability: AbilityType.Fire },
    { x: 4646, y:  672, ability: AbilityType.Fire },
    // 2 bats
    { x: 4544, y:  896, ability: AbilityType.Bat },
    { x: 4608, y:  896, ability: AbilityType.Bat },
    // 2 skeletons
    { x: 2742, y: 1664, ability: AbilityType.Lightning },
    { x: 2806, y: 1664, ability: AbilityType.Lightning },
    // 2 zombies
    { x: 3685, y: 1152, ability: AbilityType.Fire },
    { x: 3749, y: 1152, ability: AbilityType.Fire },
    // Zombie
    { x: 5105, y: 1760, ability: AbilityType.Fire },
    // 2 zombies
    { x: 5065, y: 2209, ability: AbilityType.Fire },
    { x: 5129, y: 2209, ability: AbilityType.Fire },
    // Skeleton
    { x: 3688, y: 1440, ability: AbilityType.Lightning },
    // Zombie
    { x: 3669, y: 1664, ability: AbilityType.Fire },
    // 2 bats
    { x: 2791, y: 2031, ability: AbilityType.Bat },
    { x: 2855, y: 2031, ability: AbilityType.Bat },
  ],
  destructibles: [],
  furnitureSpawns: [
    // tables and chests shifted +5 y to sit on floor; floating table at x=2742 removed
    { type: 'table',    x:  336, y: 1290 },
    { type: 'bookcase', x:  392, y: 1280 },
    { type: 'bookcase', x: 1566, y: 1696 },
    { type: 'bookcase', x: 1720, y: 2364 },
    { type: 'bookcase', x: 1731, y: 1696 },
    { type: 'table',    x:  534, y: 1706 },
    { type: 'table',    x:  919, y: 2378 },
    { type: 'chest',    x: 2019, y: 2474, ability: AbilityType.Fire },
    { type: 'table',    x: 3064, y:  362 },
    { type: 'bookcase', x: 3120, y:  352 },
    { type: 'chest',    x: 2407, y:  650 },
    { type: 'table',    x: 2884, y:  650 },
    { type: 'bookcase', x: 3408, y:  640 },
    { type: 'bookcase', x: 5238, y:  224 },
    { type: 'table',    x: 3885, y:  682 },
    { type: 'bookcase', x: 3941, y:  672 },
    { type: 'table',    x: 3995, y:  682 },
    { type: 'bookcase', x: 4893, y:  896 },
    { type: 'table',    x: 4949, y:  906 },
    { type: 'table',    x: 2658, y:  906 },
    { type: 'bookcase', x: 2842, y: 1152 },
    { type: 'table',    x: 4552, y: 2539 },
    { type: 'bookcase', x: 4608, y: 2524 },
    { type: 'bookcase', x: 3541, y: 1440 },
    { type: 'bookcase', x: 3834, y: 1440 },
    { type: 'bookcase', x: 3540, y: 1664 },
    { type: 'bookcase', x: 3851, y: 1664 },
    { type: 'table',    x: 3724, y: 2538 },
    { type: 'chest',    x: 3376, y: 2538 },
    { type: 'bookcase', x: 2912, y: 3200 },
  ],
  spikeFloors: [
    { x: 2305, y: 3205, xEnd: 2721, scale: 2 },
    { x: 178,  y: 2620, xEnd: 700,  scale: 2 },
  ],
  crates: [
    { x: 1800, y: 580 }, { x: 2500, y: 580 },
    { x: 3300, y: 580 }, { x: 4100, y: 580 },
  ],
  items: [
    { x:  148, y:  502, type: 'speed' },
    { x: 1456, y:  502, type: 'attack-boost' },
    { x:  176, y: 1870, type: 'speed' },
    { x: 1778, y: 2460, type: 'worm' },
    { x:  369, y: 1948, type: 'worm' },
    { x: 3196, y: 1660, type: 'worm' },
  ],
}

// ─── Boss Room (tilemap-based, accessed via portal in main world) ──────────────
// Map: tileset/boss/map.json — 50×50 tiles at 32px = 1600×1600 world pixels
// Floor surface at y=1312 (row 41), mid-platform at y=832

const BOSS_TILEMAP_ROOM: RoomConfig = {
  name: 'The Dark Sanctum',
  ...SANCTUM,
  worldWidth:  50 * 32,   // 1600
  worldHeight: 50 * 32,   // 1600
  worldMap: { ...BOSS_MAP },
  exits: ['left', 'right'],
  exitPositions: { left: 1280, right: 1280 },
  isBossRoom: true,
  bossDefeatedKey: 'dragonDefeated',
  backPortal: { x: 562, y: 1280 },
  bossHp: 15,
  bossName: 'KING SKELETON',
  bossKey: 'sheet-king-skeleton',
  bossFlying: false,
  bossSpawnX: 1331,
  bossSpawnY: 1220,
  bossRightBarrierX: 1497,
  bossRightBarrierY: 1276,
  platforms: [
    { x: 800,  y: 1584, w: 1600, h: 32 },  // bottom seal
  ],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [
    { type: 'bookcase', x: 200, scanFromY: 1280 },
    { type: 'table',    x: 350, scanFromY: 1280 },
    { type: 'chest',    x: 500, scanFromY: 1280, ability: AbilityType.Fire },
  ],
  crates: [],
  items: [
    { x: 400,  y: 1260, type: 'heart' },
    { x: 1300, y: 1260, type: 'heart' },
  ],
}

// ─── Level 2: Main World ──────────────────────────────────────────────────────
// Map: tileset/two/map.json — 174×117 tiles at 32px = 5568×3744 world pixels
// Player enters from the bottom-left (coming through dragon boss room right exit).
// Boss portal is in the top-left area — leads to Dad's Lair.

const LEVEL2_WORLD_ROOM: RoomConfig = {
  name: 'The Forsaken Realm',
  ...HALL,
  worldWidth:  174 * 32,   // 5568
  worldHeight: 117 * 32,   // 3744
  worldMap: { ...MAP_TWO },
  exits: [],
  exitPositions: { left: 3584 },
  spawnX: 314,              // spawn at floor level, clear of the left-edge exit
  bossPortal: { x: 774, y: 736 },
  platforms: [],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [
    // Bottom floor swath x≈300–5300, scanFromY=3050
    { type: 'bookcase', x:  360, scanFromY: 3050 },
    { type: 'bookcase', x:  480, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x:  600, scanFromY: 3050 },
    { type: 'bookcase', x:  720, scanFromY: 3050 },
    { type: 'bookcase', x:  840, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'bookcase', x:  960, scanFromY: 3050 },
    { type: 'bookcase', x: 1080, scanFromY: 3050 },
    { type: 'bookcase', x: 1200, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 1440, scanFromY: 3050 },
    { type: 'bookcase', x: 1680, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 1920, scanFromY: 3050 },
    { type: 'bookcase', x: 2160, scanFromY: 3050 },
    { type: 'bookcase', x: 2400, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'bookcase', x: 2640, scanFromY: 3050 },
    { type: 'bookcase', x: 2880, scanFromY: 3050 },
    { type: 'bookcase', x: 3120, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 3360, scanFromY: 3050 },
    { type: 'bookcase', x: 3600, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 3840, scanFromY: 3050 },
    { type: 'bookcase', x: 4080, scanFromY: 3050 },
    { type: 'bookcase', x: 4320, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'bookcase', x: 4560, scanFromY: 3050 },
    { type: 'bookcase', x: 4800, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 5040, scanFromY: 3050 },
    { type: 'bookcase', x: 5280, scanFromY: 3050 },
    { type: 'table', x:  400, scanFromY: 3050 },
    { type: 'table', x:  640, scanFromY: 3050 },
    { type: 'table', x:  880, scanFromY: 3050 },
    { type: 'table', x: 1120, scanFromY: 3050 },
    { type: 'table', x: 1360, scanFromY: 3050 },
    { type: 'table', x: 1600, scanFromY: 3050 },
    { type: 'table', x: 1840, scanFromY: 3050 },
    { type: 'table', x: 2080, scanFromY: 3050 },
    { type: 'table', x: 2320, scanFromY: 3050 },
    { type: 'table', x: 2560, scanFromY: 3050 },
    { type: 'table', x: 2800, scanFromY: 3050 },
    { type: 'table', x: 3040, scanFromY: 3050 },
    { type: 'table', x: 3280, scanFromY: 3050 },
    { type: 'table', x: 3520, scanFromY: 3050 },
    { type: 'table', x: 3760, scanFromY: 3050 },
    { type: 'table', x: 4000, scanFromY: 3050 },
    { type: 'table', x: 4240, scanFromY: 3050 },
    { type: 'table', x: 4480, scanFromY: 3050 },
    { type: 'table', x: 4720, scanFromY: 3050 },
    { type: 'table', x: 4960, scanFromY: 3050 },
    { type: 'table', x: 5200, scanFromY: 3050 },
    { type: 'chest', x:  440, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x:  680, scanFromY: 3050 },
    { type: 'chest', x:  920, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'chest', x: 1160, scanFromY: 3050 },
    { type: 'chest', x: 1400, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'chest', x: 1760, scanFromY: 3050 },
    { type: 'chest', x: 2000, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x: 2240, scanFromY: 3050 },
    { type: 'chest', x: 2480, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'chest', x: 2720, scanFromY: 3050 },
    { type: 'chest', x: 2960, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'chest', x: 3200, scanFromY: 3050 },
    { type: 'chest', x: 3440, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x: 3680, scanFromY: 3050 },
    { type: 'chest', x: 3920, scanFromY: 3050, ability: AbilityType.Lightning },
    { type: 'chest', x: 4160, scanFromY: 3050 },
    { type: 'chest', x: 4400, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'chest', x: 4640, scanFromY: 3050 },
    { type: 'chest', x: 4880, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x: 5120, scanFromY: 3050 },
    { type: 'chest', x: 5360, scanFromY: 3050 },
  ],
  crates: [
    { x:  700, y: 3080 }, { x: 1500, y: 3080 },
    { x: 2500, y: 3080 }, { x: 3500, y: 3080 },
    { x: 4500, y: 3080 },
  ],
  items: [
    { x:  500, y: 3060, type: 'heart' },
    { x: 1000, y: 3060, type: 'ability', ability: AbilityType.Fire     },
    { x: 2000, y: 3060, type: 'ability', ability: AbilityType.Lightning },
    { x: 3000, y: 3060, type: 'ability', ability: AbilityType.Ice      },
    { x: 4000, y: 3060, type: 'heart' },
  ],
}

// ─── Level 2: Boss Room (Dad's Lair) ─────────────────────────────────────────
// Map: tileset/boss_two/map.json — 99×203 tiles at 32px = 3168×6496 world pixels

const LEVEL2_BOSS_ROOM: RoomConfig = {
  name: "Dad's Lair",
  ...SANCTUM,
  worldWidth:  99 * 32,   // 3168
  worldHeight: 67 * 32,   // 2144 — tile content ends at row 66
  worldMap: { ...BOSS_MAP_TWO },
  exits: ['left', 'right'],
  exitPositions: { left: 1952, right: 1952 },
  isBossRoom: true,
  bossDefeatedKey: 'dadDefeated',
  backPortal: { x: 2700, y: 1956 },
  leftExitForward: true,
  entrySpawns: { left: { x: 2519, y: 1952 }, right: { x: 428, y: 1952 } },
  bossHp: 20,
  bossName: 'KING ZOMBIE',
  bossKey: 'sheet-king-zombie',
  bossFlying: false,
  bossSpawnX: 1187,
  bossSpawnY: 1800,
  starOrb: { x: 226, y: 174 },
  platforms: [],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [],
  crates: [],
  items: [],
}

// ─── Level 3: Main World ──────────────────────────────────────────────────────
// Map: tileset/three/map.json — 174×183 tiles at 32px = 5568×5856 world pixels

const LEVEL3_WORLD_ROOM: RoomConfig = {
  name: 'The Abyss',
  ...HALL,
  worldWidth:  174 * 32,  // 5568
  worldHeight: 183 * 32,  // 5856
  worldMap: { ...MAP_THREE },
  exits: [],
  exitPositions: { left: 2928 },
  entrySpawns: { right: { x: 5300, y: 608 }, left: { x: 597, y: 672 } },
  bossPortal: { x: 517, y: 672 },
  barrierExit: { x: 5350, y: 608 },
  backPortalEntryDir: 'left',
  platforms: [
    { x: 5300, y: 650, w: 400, h: 20 },   // buffer at right-entry spawn to prevent fall
    { x: 5556, y: 2928, w: 24, h: 5856 }, // right-edge wall prevents falling off world boundary
  ],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [],
  crates: [],
  items: [],
}

// ─── Level 3: Boss Room (Mom's Lair) ─────────────────────────────────────────
// Map: tileset/boss_three/map.json — 99×203 tiles at 32px = 3168×6496 world pixels

const BOSS_THREE_ROOM: RoomConfig = {
  name: "Mom's Lair",
  ...SANCTUM,
  worldWidth:  99 * 32,   // 3168
  worldHeight: 67 * 32,   // 2144 — tile content ends at row 66
  worldMap: { ...BOSS_MAP_THREE },
  exits: ['left', 'right'],
  exitPositions: { left: 640, right: 1952 },
  isBossRoom: true,
  bossDefeatedKey: 'momDefeated',
  backPortal: { x: 866, y: 1948 },
  backPortalEntryDir: 'left',
  entrySpawns: { left: { x: 429, y: 1952 } },
  bossHp: 25,
  bossName: 'CELERY MAN',
  bossKey: 'sheet-celery',
  bossFlying: false,
  bossSpawnX: 2519,
  bossSpawnY: 1800,
  starOrb: { x: 1219, y: 512 },
  barrierVisual: { x: 3104, y: 1952, w: 32, h: 260 },
  platforms: [
    { x: 16,   y: 640,  w: 32, h: 130 },   // seal left exit
    { x: 3152, y: 1952, w: 32, h: 130 },   // seal right exit
  ],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [],
  crates: [],
  items: [],
}

export const RUN_LENGTH = 6

export function generateRun(): RoomConfig[] {
  return [
    WORLD_ROOM,
    BOSS_TILEMAP_ROOM,
    LEVEL2_WORLD_ROOM,
    LEVEL2_BOSS_ROOM,
    LEVEL3_WORLD_ROOM,
    BOSS_THREE_ROOM,
  ]
}

// Legacy aliases
export const BOSS_ROOM: RoomConfig = BOSS_TILEMAP_ROOM
export const TUTORIAL_ROOM: RoomConfig = { ...WORLD_ROOM, isTutorial: true }
export const THRONE_ROOM:  RoomConfig  = { ...WORLD_ROOM, isThrone: true  }
export const WORLD_NAMES = ['THE CASTLE', 'THE DARK SANCTUM']
export const ROOMS_PER_RUN = 2
export const LEVEL_POOLS: RoomConfig[][] = [[WORLD_ROOM]]
export type LevelConfig = RoomConfig & { roomNum: number; subtitle: string; levelNum: number; goalX: number }
export function generateRoomSequence(_level: number): number[] { return [0] }
