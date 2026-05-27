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

export type ItemType = 'heart' | 'life' | 'ability' | 'mystery'
export interface ItemSpawn {
  x: number; y: number
  type: ItemType
  ability?: AbilityType
}

export interface FurnitureSpawn {
  type: 'bookcase' | 'table' | 'chest'
  x: number
  ability?: AbilityType
  scanFromY?: number  // world Y to start scanning downward; defaults to 0
}

export interface RoomConfig {
  name: string
  worldWidth: number
  tileset: string
  bgFar: string
  bgMid: string
  exits: ExitDir[]
  exitPositions?: Partial<Record<ExitDir, number>>
  isTutorial?: boolean
  isThrone?: boolean
  isBossRoom?: boolean
  bossHp?: number
  bossKey?: string
  bossFlying?: boolean
  bossSpawnX?: number
  bossSpawnY?: number
  bossPortal?: { x: number; y: number }
  spawnX?: number            // override default left-entry X for continuous world rooms
  starOrbSide?: 'left' | 'right'  // which corner the star-burst orb appears in
  roomImage?: string
  worldHeight?: number
  worldMap?: { key: string; tileKey: string; tilesetName: string; section?: { col: number; row: number; cols: number; rows: number } }
  platforms: Platform[]
  slopes?: SlopeConfig[]
  enemies: EnemySpawn[]
  destructibles: DestructibleSpawn[]
  furnitureSpawns?: FurnitureSpawn[]
  crates: CrateSpawn[]
  items: ItemSpawn[]
}

const HALL    = { tileset: 'tile-castle', bgFar: 'bg-great-hall', bgMid: 'bg-hall-glow'    }
const SANCTUM = { tileset: 'tile-castle', bgFar: 'bg-sanctum',     bgMid: 'bg-sanctum-glow' }
const MAP      = { key: 'world-map',     tileKey: 'tileset',      tilesetName: 'spritefusion' } as const
const BOSS_MAP = { key: 'boss-map',      tileKey: 'boss-tileset', tilesetName: 'spritefusion' } as const
const MAP_TWO  = { key: 'world-map-two', tileKey: 'tileset-two',  tilesetName: 'spritefusion' } as const

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
  // Portal door sits on the wide floating platform in the far bottom-right room (y=2688)
  bossPortal: { x: 4746, y: 3104 },
  enemies: [
    // Zombies (Fire) — ground patrol — no top-left room (x < 1600)
    { x: 1700, y: 620, ability: AbilityType.Fire     },
    { x: 2100, y: 620, ability: AbilityType.Fire     },
    { x: 2500, y: 620, ability: AbilityType.Fire     },
    { x: 2900, y: 620, ability: AbilityType.Fire     },
    { x: 3400, y: 620, ability: AbilityType.Fire     },
    { x: 3900, y: 620, ability: AbilityType.Fire     },
    { x: 4400, y: 620, ability: AbilityType.Fire     },
    { x: 4800, y: 620, ability: AbilityType.Fire     },
    // Skeletons (Electric) — ground patrol
    { x: 1900, y: 620, ability: AbilityType.Electric },
    { x: 2300, y: 620, ability: AbilityType.Electric },
    { x: 2700, y: 620, ability: AbilityType.Electric },
    { x: 3200, y: 620, ability: AbilityType.Electric },
    { x: 3700, y: 620, ability: AbilityType.Electric },
    { x: 4200, y: 620, ability: AbilityType.Electric },
    { x: 4600, y: 620, ability: AbilityType.Electric },
    // Ducks (Ice) — floating
    { x: 1800, y: 420, ability: AbilityType.Ice      },
    { x: 2200, y: 420, ability: AbilityType.Ice      },
    { x: 2600, y: 420, ability: AbilityType.Ice      },
    { x: 3000, y: 420, ability: AbilityType.Ice      },
    { x: 3500, y: 420, ability: AbilityType.Ice      },
    { x: 4000, y: 420, ability: AbilityType.Ice      },
    { x: 4500, y: 420, ability: AbilityType.Ice      },
  ],
  destructibles: [],
  furnitureSpawns: [
    // Dense coverage across x≈1640–5280, one item every ~40 px, scanFromY=580
    // ── Bookcases (every 120 px, ability every ~600 px) ──
    { type: 'bookcase', x: 1640, scanFromY: 580 },
    { type: 'bookcase', x: 1760, scanFromY: 580 },
    { type: 'bookcase', x: 1880, scanFromY: 580 },
    { type: 'bookcase', x: 2000, scanFromY: 580 },
    { type: 'bookcase', x: 2120, scanFromY: 580 },
    { type: 'bookcase', x: 2240, scanFromY: 580, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 2360, scanFromY: 580 },
    { type: 'bookcase', x: 2480, scanFromY: 580 },
    { type: 'bookcase', x: 2600, scanFromY: 580 },
    { type: 'bookcase', x: 2720, scanFromY: 580 },
    { type: 'bookcase', x: 2840, scanFromY: 580, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 2960, scanFromY: 580 },
    { type: 'bookcase', x: 3080, scanFromY: 580 },
    { type: 'bookcase', x: 3200, scanFromY: 580 },
    { type: 'bookcase', x: 3320, scanFromY: 580, ability: AbilityType.Electric },
    { type: 'bookcase', x: 3440, scanFromY: 580 },
    { type: 'bookcase', x: 3560, scanFromY: 580 },
    { type: 'bookcase', x: 3680, scanFromY: 580 },
    { type: 'bookcase', x: 3800, scanFromY: 580, ability: AbilityType.Electric },
    { type: 'bookcase', x: 3920, scanFromY: 580 },
    { type: 'bookcase', x: 4040, scanFromY: 580 },
    { type: 'bookcase', x: 4160, scanFromY: 580 },
    { type: 'bookcase', x: 4280, scanFromY: 580, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 4400, scanFromY: 580 },
    { type: 'bookcase', x: 4520, scanFromY: 580 },
    { type: 'bookcase', x: 4640, scanFromY: 580 },
    { type: 'bookcase', x: 4760, scanFromY: 580, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 4880, scanFromY: 580 },
    { type: 'bookcase', x: 5000, scanFromY: 580 },
    { type: 'bookcase', x: 5120, scanFromY: 580 },
    { type: 'bookcase', x: 5240, scanFromY: 580 },
    // ── Tables (every 120 px, offset +40 from bookcases) ──
    { type: 'table', x: 1680, scanFromY: 580 },
    { type: 'table', x: 1800, scanFromY: 580 },
    { type: 'table', x: 1920, scanFromY: 580 },
    { type: 'table', x: 2040, scanFromY: 580 },
    { type: 'table', x: 2160, scanFromY: 580 },
    { type: 'table', x: 2280, scanFromY: 580 },
    { type: 'table', x: 2400, scanFromY: 580 },
    { type: 'table', x: 2520, scanFromY: 580 },
    { type: 'table', x: 2640, scanFromY: 580 },
    { type: 'table', x: 2760, scanFromY: 580 },
    { type: 'table', x: 2880, scanFromY: 580 },
    { type: 'table', x: 3000, scanFromY: 580 },
    { type: 'table', x: 3120, scanFromY: 580 },
    { type: 'table', x: 3240, scanFromY: 580 },
    { type: 'table', x: 3360, scanFromY: 580 },
    { type: 'table', x: 3480, scanFromY: 580 },
    { type: 'table', x: 3600, scanFromY: 580 },
    { type: 'table', x: 3720, scanFromY: 580 },
    { type: 'table', x: 3840, scanFromY: 580 },
    { type: 'table', x: 3960, scanFromY: 580 },
    { type: 'table', x: 4080, scanFromY: 580 },
    { type: 'table', x: 4200, scanFromY: 580 },
    { type: 'table', x: 4320, scanFromY: 580 },
    { type: 'table', x: 4440, scanFromY: 580 },
    { type: 'table', x: 4560, scanFromY: 580 },
    { type: 'table', x: 4680, scanFromY: 580 },
    { type: 'table', x: 4800, scanFromY: 580 },
    { type: 'table', x: 4920, scanFromY: 580 },
    { type: 'table', x: 5040, scanFromY: 580 },
    { type: 'table', x: 5160, scanFromY: 580 },
    { type: 'table', x: 5280, scanFromY: 580 },
    // ── Chests (every 120 px, offset +80 from bookcases, with scattered abilities) ──
    { type: 'chest', x: 1720, scanFromY: 580 },
    { type: 'chest', x: 1840, scanFromY: 580, ability: AbilityType.Fire     },
    { type: 'chest', x: 1960, scanFromY: 580 },
    { type: 'chest', x: 2080, scanFromY: 580 },
    { type: 'chest', x: 2200, scanFromY: 580, ability: AbilityType.Fire     },
    { type: 'chest', x: 2320, scanFromY: 580 },
    { type: 'chest', x: 2440, scanFromY: 580 },
    { type: 'chest', x: 2560, scanFromY: 580, ability: AbilityType.Electric },
    { type: 'chest', x: 2680, scanFromY: 580 },
    { type: 'chest', x: 2800, scanFromY: 580 },
    { type: 'chest', x: 2920, scanFromY: 580, ability: AbilityType.Electric },
    { type: 'chest', x: 3040, scanFromY: 580 },
    { type: 'chest', x: 3160, scanFromY: 580 },
    { type: 'chest', x: 3280, scanFromY: 580, ability: AbilityType.Electric },
    { type: 'chest', x: 3400, scanFromY: 580 },
    { type: 'chest', x: 3520, scanFromY: 580 },
    { type: 'chest', x: 3640, scanFromY: 580, ability: AbilityType.Ice      },
    { type: 'chest', x: 3760, scanFromY: 580 },
    { type: 'chest', x: 3880, scanFromY: 580 },
    { type: 'chest', x: 4000, scanFromY: 580, ability: AbilityType.Ice      },
    { type: 'chest', x: 4120, scanFromY: 580 },
    { type: 'chest', x: 4240, scanFromY: 580 },
    { type: 'chest', x: 4360, scanFromY: 580, ability: AbilityType.Ice      },
    { type: 'chest', x: 4480, scanFromY: 580 },
    { type: 'chest', x: 4600, scanFromY: 580 },
    { type: 'chest', x: 4720, scanFromY: 580, ability: AbilityType.Fire     },
    { type: 'chest', x: 4840, scanFromY: 580 },
    { type: 'chest', x: 4960, scanFromY: 580 },
    { type: 'chest', x: 5080, scanFromY: 580 },
    { type: 'chest', x: 5200, scanFromY: 580 },
    { type: 'chest', x: 5320, scanFromY: 580 },
  ],
  crates: [
    { x: 1800, y: 580 }, { x: 2500, y: 580 },
    { x: 3300, y: 580 }, { x: 4100, y: 580 },
  ],
  items: [
    { x: 1800, y: 560, type: 'heart' },
    { x: 2400, y: 560, type: 'ability', ability: AbilityType.Fire     },
    { x: 3100, y: 560, type: 'ability', ability: AbilityType.Electric },
    { x: 3800, y: 560, type: 'ability', ability: AbilityType.Ice      },
    { x: 4500, y: 560, type: 'heart' },
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
  bossHp: 15,
  bossSpawnX: 800,
  bossSpawnY: 900,   // flying boss, starts mid-room
  platforms: [
    { x: 800,  y: 1584, w: 1600, h: 32 },  // bottom seal
  ],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [
    // Floor surface at y=1312 (row 41). Scan from y=1280 (open air just above it).
    { type: 'bookcase', x: 200,  scanFromY: 1280 },
    { type: 'bookcase', x: 1400, scanFromY: 1280 },
    { type: 'table',    x: 350,  scanFromY: 1280 },
    { type: 'table',    x: 1250, scanFromY: 1280 },
    { type: 'chest',    x: 500,  scanFromY: 1280, ability: AbilityType.Fire },
    { type: 'chest',    x: 1100, scanFromY: 1280, ability: AbilityType.Ice  },
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
  exitPositions: { left: 3200 },
  spawnX: 170,              // spawn near left edge of map (bottom-left room)
  bossPortal: { x: 774, y: 736 },
  platforms: [],
  enemies: [
    // Bottom-left area — near player spawn
    { x:  400, y: 3100, ability: AbilityType.Fire     },
    { x:  600, y: 3100, ability: AbilityType.Electric },
    { x:  900, y: 3100, ability: AbilityType.Ice      },
    { x: 1200, y: 3100, ability: AbilityType.Fire     },
    { x: 1500, y: 3100, ability: AbilityType.Electric },
    // Mid-left vertical corridor enemies
    { x:  350, y: 2400, ability: AbilityType.Ice      },
    { x:  650, y: 2400, ability: AbilityType.Fire     },
    { x:  400, y: 1800, ability: AbilityType.Electric },
    { x:  700, y: 1800, ability: AbilityType.Ice      },
    { x:  500, y: 1200, ability: AbilityType.Fire     },
    // Mid-map ground floor
    { x: 1800, y: 3100, ability: AbilityType.Fire     },
    { x: 2200, y: 3100, ability: AbilityType.Electric },
    { x: 2600, y: 3100, ability: AbilityType.Ice      },
    { x: 3000, y: 3100, ability: AbilityType.Fire     },
    { x: 3400, y: 3100, ability: AbilityType.Electric },
    { x: 3800, y: 3100, ability: AbilityType.Ice      },
    { x: 4200, y: 3100, ability: AbilityType.Fire     },
    { x: 4600, y: 3100, ability: AbilityType.Electric },
    { x: 5000, y: 3100, ability: AbilityType.Ice      },
    // Flying ducks — scattered heights
    { x:  800, y: 2800, ability: AbilityType.Ice      },
    { x: 1400, y: 2600, ability: AbilityType.Ice      },
    { x: 2000, y: 2800, ability: AbilityType.Ice      },
    { x: 2800, y: 2600, ability: AbilityType.Ice      },
    { x: 3600, y: 2800, ability: AbilityType.Ice      },
    { x: 4400, y: 2600, ability: AbilityType.Ice      },
    // Upper level enemies (near boss portal area)
    { x:  600, y:  900, ability: AbilityType.Electric },
    { x:  900, y:  900, ability: AbilityType.Fire     },
    { x: 1100, y:  900, ability: AbilityType.Electric },
  ],
  destructibles: [],
  furnitureSpawns: [
    // Bottom floor swath x≈300–5300, scanFromY=3050
    { type: 'bookcase', x:  360, scanFromY: 3050 },
    { type: 'bookcase', x:  480, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x:  600, scanFromY: 3050 },
    { type: 'bookcase', x:  720, scanFromY: 3050 },
    { type: 'bookcase', x:  840, scanFromY: 3050, ability: AbilityType.Electric },
    { type: 'bookcase', x:  960, scanFromY: 3050 },
    { type: 'bookcase', x: 1080, scanFromY: 3050 },
    { type: 'bookcase', x: 1200, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 1440, scanFromY: 3050 },
    { type: 'bookcase', x: 1680, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 1920, scanFromY: 3050 },
    { type: 'bookcase', x: 2160, scanFromY: 3050 },
    { type: 'bookcase', x: 2400, scanFromY: 3050, ability: AbilityType.Electric },
    { type: 'bookcase', x: 2640, scanFromY: 3050 },
    { type: 'bookcase', x: 2880, scanFromY: 3050 },
    { type: 'bookcase', x: 3120, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'bookcase', x: 3360, scanFromY: 3050 },
    { type: 'bookcase', x: 3600, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'bookcase', x: 3840, scanFromY: 3050 },
    { type: 'bookcase', x: 4080, scanFromY: 3050 },
    { type: 'bookcase', x: 4320, scanFromY: 3050, ability: AbilityType.Electric },
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
    { type: 'chest', x:  920, scanFromY: 3050, ability: AbilityType.Electric },
    { type: 'chest', x: 1160, scanFromY: 3050 },
    { type: 'chest', x: 1400, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'chest', x: 1760, scanFromY: 3050 },
    { type: 'chest', x: 2000, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x: 2240, scanFromY: 3050 },
    { type: 'chest', x: 2480, scanFromY: 3050, ability: AbilityType.Electric },
    { type: 'chest', x: 2720, scanFromY: 3050 },
    { type: 'chest', x: 2960, scanFromY: 3050, ability: AbilityType.Ice      },
    { type: 'chest', x: 3200, scanFromY: 3050 },
    { type: 'chest', x: 3440, scanFromY: 3050, ability: AbilityType.Fire     },
    { type: 'chest', x: 3680, scanFromY: 3050 },
    { type: 'chest', x: 3920, scanFromY: 3050, ability: AbilityType.Electric },
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
    { x: 2000, y: 3060, type: 'ability', ability: AbilityType.Electric },
    { x: 3000, y: 3060, type: 'ability', ability: AbilityType.Ice      },
    { x: 4000, y: 3060, type: 'heart' },
  ],
}

// ─── Level 2: Boss Room (Dad's Lair) ─────────────────────────────────────────
// Reuses the same boss-room tilemap; dad.png is a placeholder boss.
// Star-burst orb is in the top-LEFT corner (mirrored from level 1).

const LEVEL2_BOSS_ROOM: RoomConfig = {
  name: "Dad's Lair",
  ...SANCTUM,
  worldWidth:  50 * 32,   // 1600
  worldHeight: 50 * 32,   // 1600
  worldMap: { ...BOSS_MAP },
  exits: ['left'],
  exitPositions: { left: 1280 },
  isBossRoom: true,
  bossHp: 20,
  bossKey: 'sheet-dad',
  bossFlying: false,
  bossSpawnX: 800,
  bossSpawnY: 1150,
  starOrbSide: 'left',
  platforms: [
    { x: 800, y: 1584, w: 1600, h: 32 },  // bottom seal
  ],
  enemies: [],
  destructibles: [],
  furnitureSpawns: [
    { type: 'bookcase', x: 200,  scanFromY: 1280 },
    { type: 'bookcase', x: 1400, scanFromY: 1280 },
    { type: 'table',    x: 350,  scanFromY: 1280 },
    { type: 'table',    x: 1250, scanFromY: 1280 },
    { type: 'chest',    x: 500,  scanFromY: 1280, ability: AbilityType.Fire },
    { type: 'chest',    x: 1100, scanFromY: 1280, ability: AbilityType.Ice  },
  ],
  crates: [],
  items: [
    { x: 400,  y: 1260, type: 'heart' },
    { x: 1300, y: 1260, type: 'heart' },
  ],
}

export const RUN_LENGTH = 4

export function generateRun(): RoomConfig[] {
  return [WORLD_ROOM, BOSS_TILEMAP_ROOM, LEVEL2_WORLD_ROOM, LEVEL2_BOSS_ROOM]
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
