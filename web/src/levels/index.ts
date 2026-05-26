import { AbilityType, DamageType } from '../types'

export type ExitDir = 'left' | 'right' | 'top' | 'bottom'

export interface Platform    { x: number; y: number; w: number; h: number }
export interface SlopeConfig { x1: number; y1: number; x2: number; y2: number }
export interface EnemySpawn  { x: number; y: number; ability: AbilityType }
export interface DestructibleSpawn {
  x: number; y: number; w: number; h: number; health: number
  resistances?: Partial<Record<DamageType, number>>; ability: AbilityType
}
export interface CrateSpawn  { x: number; y: number }

export type ItemType = 'heart' | 'life' | 'ability' | 'mystery'
export interface ItemSpawn {
  x: number; y: number
  type: ItemType
  ability?: AbilityType
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
  bossSpawnX?: number
  bossSpawnY?: number
  bossPortal?: { x: number; y: number }
  roomImage?: string
  worldHeight?: number
  worldMap?: { key: string; tileKey: string; tilesetName: string; section?: { col: number; row: number; cols: number; rows: number } }
  platforms: Platform[]
  slopes?: SlopeConfig[]
  enemies: EnemySpawn[]
  destructibles: DestructibleSpawn[]
  crates: CrateSpawn[]
  items: ItemSpawn[]
}

const HALL    = { tileset: 'tile-castle', bgFar: 'bg-great-hall', bgMid: 'bg-hall-glow'    }
const SANCTUM = { tileset: 'tile-castle', bgFar: 'bg-sanctum',     bgMid: 'bg-sanctum-glow' }
const MAP = { key: 'world-map', tileKey: 'tileset', tilesetName: 'spritefusion' } as const
const BOSS_MAP = { key: 'boss-map', tileKey: 'boss-tileset', tilesetName: 'spritefusion' } as const

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
  exits: ['left'],
  exitPositions: { left: 1280 },  // player entry y — above the main floor at y=1312
  isBossRoom: true,
  bossHp: 15,
  bossSpawnX: 800,
  bossSpawnY: 900,   // flying boss, starts mid-room
  platforms: [
    { x: 800,  y: 1584, w: 1600, h: 32 },  // bottom seal
    { x: 1584, y: 800,  w: 32,  h: 1600 }, // right-wall seal
  ],
  enemies: [],
  destructibles: [],
  crates: [],
  items: [
    { x: 400,  y: 1260, type: 'heart' },
    { x: 1300, y: 1260, type: 'heart' },
  ],
}

export const RUN_LENGTH = 2

export function generateRun(): RoomConfig[] {
  return [WORLD_ROOM, BOSS_TILEMAP_ROOM]
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
