import { AbilityType, DamageType } from '../types'

export interface Platform    { x: number; y: number; w: number; h: number }
export interface EnemySpawn  { x: number; y: number; ability: AbilityType }
export interface DestructibleSpawn {
  x: number; y: number; w: number; h: number; health: number
  resistances?: Partial<Record<DamageType, number>>; ability: AbilityType
}
export interface CrateSpawn  { x: number; y: number }

export type ItemType = 'heart' | 'life' | 'ability'
export interface ItemSpawn {
  x: number; y: number
  type: ItemType
  ability?: AbilityType   // only used when type === 'ability'
}

export interface LevelConfig {
  id: number
  name: string
  subtitle: string
  worldWidth: number
  tileset: string
  bgFar: string
  bgMid: string
  goalX: number
  platforms: Platform[]
  enemies: EnemySpawn[]
  destructibles: DestructibleSpawn[]
  crates: CrateSpawn[]
  items: ItemSpawn[]
}

// ─── Level 1 — Orbital Station ────────────────────────────────────────────────
const L1_PLATFORMS: Platform[] = [
  // floor + walls + ceiling
  { x: 2000, y: 688, w: 4000, h: 32 },
  { x: 8,    y: 360, w: 16,   h: 720 },
  { x: 3992, y: 360, w: 16,   h: 720 },
  { x: 2000, y: 8,   w: 4000, h: 16  },
  // floating platforms
  { x: 340,  y: 570, w: 200, h: 16 },
  { x: 580,  y: 510, w: 160, h: 16 },
  { x: 790,  y: 450, w: 160, h: 16 },
  { x: 1040, y: 560, w: 180, h: 16 },
  { x: 1270, y: 490, w: 160, h: 16 },
  { x: 1470, y: 420, w: 200, h: 16 },
  { x: 1700, y: 540, w: 180, h: 16 },
  { x: 1930, y: 470, w: 160, h: 16 },
  { x: 2140, y: 390, w: 200, h: 16 },
  { x: 2380, y: 510, w: 180, h: 16 },
  { x: 2610, y: 450, w: 160, h: 16 },
  { x: 2830, y: 390, w: 200, h: 16 },
  { x: 3060, y: 530, w: 180, h: 16 },
  { x: 3290, y: 460, w: 160, h: 16 },
  { x: 3510, y: 390, w: 220, h: 16 },
  { x: 3760, y: 540, w: 260, h: 16 },
]

const L1_ENEMIES: EnemySpawn[] = [
  { x: 460,  y: 650, ability: AbilityType.Fire     },
  { x: 700,  y: 650, ability: AbilityType.Electric },
  { x: 900,  y: 436, ability: AbilityType.Fire     },
  { x: 1160, y: 650, ability: AbilityType.Bomb     },
  { x: 1500, y: 406, ability: AbilityType.Electric },
  { x: 1950, y: 650, ability: AbilityType.Fire     },
  { x: 2450, y: 650, ability: AbilityType.Bomb     },
  { x: 2900, y: 650, ability: AbilityType.Electric },
]

const L1_DESTRUCTIBLES: DestructibleSpawn[] = [
  { x: 1180, y: 648, w: 48, h: 48, health: 80, ability: AbilityType.None },
  { x: 2080, y: 648, w: 48, h: 48, health: 60, ability: AbilityType.Fire,
    resistances: { [DamageType.Fire]: -0.5 } },
  { x: 2620, y: 648, w: 48, h: 48, health: 80, ability: AbilityType.Bomb },
  { x: 3200, y: 648, w: 48, h: 48, health: 60, ability: AbilityType.None },
]

const L1_CRATES: CrateSpawn[] = [
  { x: 790, y: 650 }, { x: 1610, y: 650 },
  { x: 2330, y: 650 }, { x: 3100, y: 650 },
]

// Hidden items — floating 120px above elevated platforms, require a jump to reach
const L1_ITEMS: ItemSpawn[] = [
  { x: 1470, y: 300, type: 'heart' },                               // above high platform @ y=420
  { x: 2830, y: 270, type: 'ability', ability: AbilityType.Ice },   // above right-mid platform @ y=390
  { x: 3510, y: 270, type: 'life' },                                // above final high platform @ y=390
]

// ─── Level 2 — Asteroid Belt ──────────────────────────────────────────────────
const L2_PLATFORMS: Platform[] = [
  // floor with gaps
  { x: 450,  y: 688, w: 900,  h: 32 },
  { x: 1575, y: 688, w: 1050, h: 32 },
  { x: 2800, y: 688, w: 1000, h: 32 },
  { x: 4025, y: 688, w: 950,  h: 32 },
  { x: 4850, y: 688, w: 300,  h: 32 },
  // walls + ceiling
  { x: 8,    y: 360, w: 16,   h: 720 },
  { x: 4992, y: 360, w: 16,   h: 720 },
  { x: 2500, y: 8,   w: 5000, h: 16  },
  // platforms bridging gaps + general
  { x: 970,  y: 540, w: 200, h: 16 },
  { x: 1200, y: 460, w: 160, h: 16 },
  { x: 2220, y: 510, w: 180, h: 16 },
  { x: 2430, y: 430, w: 160, h: 16 },
  { x: 3400, y: 540, w: 200, h: 16 },
  { x: 3650, y: 460, w: 160, h: 16 },
  { x: 4600, y: 540, w: 200, h: 16 },
  { x: 4780, y: 460, w: 160, h: 16 },
  // extra floaters
  { x: 550,  y: 520, w: 180, h: 16 },
  { x: 1400, y: 540, w: 200, h: 16 },
  { x: 1850, y: 470, w: 160, h: 16 },
  { x: 2100, y: 400, w: 200, h: 16 },
  { x: 2650, y: 510, w: 180, h: 16 },
  { x: 3150, y: 470, w: 160, h: 16 },
  { x: 3450, y: 380, w: 200, h: 16 },
  { x: 3900, y: 430, w: 160, h: 16 },
  { x: 4400, y: 490, w: 200, h: 16 },
]

const L2_ENEMIES: EnemySpawn[] = [
  { x: 350,  y: 650, ability: AbilityType.Fire     },
  { x: 620,  y: 506, ability: AbilityType.Electric },
  { x: 850,  y: 650, ability: AbilityType.Bomb     },
  { x: 1250, y: 446, ability: AbilityType.Fire     },
  { x: 1650, y: 650, ability: AbilityType.Electric },
  { x: 1900, y: 456, ability: AbilityType.Ice      },
  { x: 2200, y: 650, ability: AbilityType.Bomb     },
  { x: 2500, y: 416, ability: AbilityType.Fire     },
  { x: 2900, y: 650, ability: AbilityType.Electric },
  { x: 3200, y: 456, ability: AbilityType.Bomb     },
  { x: 3500, y: 366, ability: AbilityType.Ice      },
  { x: 3700, y: 650, ability: AbilityType.Fire     },
]

const L2_DESTRUCTIBLES: DestructibleSpawn[] = [
  { x: 700,  y: 648, w: 48, h: 48, health: 80, ability: AbilityType.None },
  { x: 2300, y: 648, w: 48, h: 48, health: 60, ability: AbilityType.Ice  },
  { x: 3000, y: 648, w: 48, h: 48, health: 80, ability: AbilityType.Bomb },
  { x: 3800, y: 648, w: 48, h: 48, health: 60, ability: AbilityType.None },
  { x: 4200, y: 648, w: 64, h: 64, health: 100, ability: AbilityType.Fire,
    resistances: { [DamageType.Fire]: -1 } },
]

const L2_CRATES: CrateSpawn[] = [
  { x: 450, y: 650 }, { x: 1200, y: 650 },
  { x: 2750, y: 650 }, { x: 3600, y: 650 }, { x: 4500, y: 650 },
]

const L2_ITEMS: ItemSpawn[] = [
  { x: 1200, y: 340, type: 'heart' },                               // above bridge platform @ y=460
  { x: 3450, y: 260, type: 'ability', ability: AbilityType.Bomb },  // above high platform @ y=380
  { x: 4780, y: 340, type: 'life' },                                // above elevated end platform @ y=460
]

// ─── Level 3 — Planet Core ────────────────────────────────────────────────────
const L3_PLATFORMS: Platform[] = [
  // segmented floor with larger gaps
  { x: 550,  y: 688, w: 1100, h: 32 },
  { x: 1950, y: 688, w: 900,  h: 32 },
  { x: 3250, y: 688, w: 1100, h: 32 },
  { x: 4700, y: 688, w: 1000, h: 32 },
  { x: 5800, y: 688, w: 400,  h: 32 },
  // walls + ceiling
  { x: 8,    y: 360, w: 16,   h: 720 },
  { x: 5992, y: 360, w: 16,   h: 720 },
  { x: 3000, y: 8,   w: 6000, h: 16  },
  // gap-bridging platforms
  { x: 1180, y: 510, w: 200, h: 16 },
  { x: 1400, y: 430, w: 160, h: 16 },
  { x: 2500, y: 520, w: 180, h: 16 },
  { x: 2720, y: 440, w: 160, h: 16 },
  { x: 3850, y: 500, w: 200, h: 16 },
  { x: 4080, y: 420, w: 160, h: 16 },
  { x: 5250, y: 510, w: 200, h: 16 },
  { x: 5450, y: 430, w: 160, h: 16 },
  // extra elevated platforms
  { x: 400,  y: 480, w: 180, h: 16 },
  { x: 700,  y: 420, w: 160, h: 16 },
  { x: 950,  y: 360, w: 200, h: 16 },
  { x: 1250, y: 460, w: 180, h: 16 },
  { x: 1600, y: 390, w: 160, h: 16 },
  { x: 1820, y: 460, w: 200, h: 16 },
  { x: 2150, y: 400, w: 180, h: 16 },
  { x: 2400, y: 340, w: 200, h: 16 },
  { x: 2700, y: 400, w: 160, h: 16 },
  { x: 3000, y: 460, w: 180, h: 16 },
  { x: 3300, y: 380, w: 200, h: 16 },
  { x: 3600, y: 440, w: 160, h: 16 },
  { x: 4000, y: 360, w: 200, h: 16 },
  { x: 4300, y: 430, w: 180, h: 16 },
  { x: 4600, y: 500, w: 160, h: 16 },
  { x: 4950, y: 430, w: 200, h: 16 },
  { x: 5200, y: 360, w: 180, h: 16 },
  { x: 5550, y: 400, w: 200, h: 16 },
]

const L3_ENEMIES: EnemySpawn[] = [
  { x: 300,  y: 650, ability: AbilityType.Fire     },
  { x: 550,  y: 466, ability: AbilityType.Bomb     },
  { x: 800,  y: 406, ability: AbilityType.Electric },
  { x: 1050, y: 346, ability: AbilityType.Ice      },
  { x: 1300, y: 650, ability: AbilityType.Fire     },
  { x: 1550, y: 376, ability: AbilityType.Bomb     },
  { x: 1800, y: 446, ability: AbilityType.Electric },
  { x: 2100, y: 386, ability: AbilityType.Fire     },
  { x: 2350, y: 326, ability: AbilityType.Ice      },
  { x: 2650, y: 650, ability: AbilityType.Bomb     },
  { x: 2900, y: 446, ability: AbilityType.Electric },
  { x: 3250, y: 366, ability: AbilityType.Fire     },
  { x: 3500, y: 426, ability: AbilityType.Bomb     },
  { x: 3900, y: 346, ability: AbilityType.Ice      },
  { x: 4200, y: 650, ability: AbilityType.Electric },
  { x: 4500, y: 416, ability: AbilityType.Fire     },
  { x: 4800, y: 650, ability: AbilityType.Bomb     },
  { x: 5100, y: 346, ability: AbilityType.Electric },
  { x: 5400, y: 386, ability: AbilityType.Ice      },
  { x: 5650, y: 650, ability: AbilityType.Fire     },
]

const L3_DESTRUCTIBLES: DestructibleSpawn[] = [
  { x: 650,  y: 648, w: 48, h: 48, health: 80, ability: AbilityType.None },
  { x: 1750, y: 648, w: 48, h: 48, health: 100, ability: AbilityType.Fire  },
  { x: 2800, y: 648, w: 48, h: 48, health: 80, ability: AbilityType.Bomb  },
  { x: 3600, y: 648, w: 64, h: 64, health: 120, ability: AbilityType.Ice,
    resistances: { [DamageType.Explosion]: 0.5 } },
  { x: 4350, y: 648, w: 48, h: 48, health: 80, ability: AbilityType.Electric },
  { x: 5000, y: 648, w: 64, h: 64, health: 120, ability: AbilityType.None  },
]

const L3_CRATES: CrateSpawn[] = [
  { x: 400, y: 650 }, { x: 1100, y: 650 }, { x: 2200, y: 650 },
  { x: 3100, y: 650 }, { x: 4000, y: 650 }, { x: 5300, y: 650 },
]

const L3_ITEMS: ItemSpawn[] = [
  { x: 950,  y: 240, type: 'heart' },                                    // above high platform @ y=360
  { x: 2400, y: 220, type: 'ability', ability: AbilityType.Electric },   // above highest platform @ y=340
  { x: 5200, y: 240, type: 'life' },                                     // above late-game platform @ y=360
]

// ─── Export ───────────────────────────────────────────────────────────────────
export const LEVELS: LevelConfig[] = [
  {
    id: 1, name: 'Orbital Station', subtitle: 'World 1',
    worldWidth: 4000, tileset: 'tile-metal',
    bgFar: 'bg-station-interior', bgMid: 'bg-station-glow',
    goalX: 3900,
    platforms: L1_PLATFORMS, enemies: L1_ENEMIES,
    destructibles: L1_DESTRUCTIBLES, crates: L1_CRATES, items: L1_ITEMS,
  },
  {
    id: 2, name: 'Asteroid Belt', subtitle: 'World 2',
    worldWidth: 5000, tileset: 'tile-rock',
    bgFar: 'bg-cave-rock', bgMid: 'bg-cave-glow',
    goalX: 4900,
    platforms: L2_PLATFORMS, enemies: L2_ENEMIES,
    destructibles: L2_DESTRUCTIBLES, crates: L2_CRATES, items: L2_ITEMS,
  },
  {
    id: 3, name: 'Planet Core', subtitle: 'World 3',
    worldWidth: 6000, tileset: 'tile-core',
    bgFar: 'bg-magma-wall', bgMid: 'bg-magma-heat',
    goalX: 5900,
    platforms: L3_PLATFORMS, enemies: L3_ENEMIES,
    destructibles: L3_DESTRUCTIBLES, crates: L3_CRATES, items: L3_ITEMS,
  },
]
