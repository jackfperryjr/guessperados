import { AbilityType, DamageType } from '../types'

export interface Platform    { x: number; y: number; w: number; h: number }
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

export interface LevelConfig {
  levelNum: number
  roomNum: number    // 1-indexed position within the run (set at generation time)
  name: string
  subtitle: string
  isBossRoom: boolean
  bossHp?: number
  bossSpawnX?: number
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

export const ROOMS_PER_RUN = 5   // 4 random normal rooms + 1 boss

export const WORLD_NAMES = [
  'ORBITAL STATION',
  'ASTEROID BELT',
  'MOLTEN CORE',
]

// ─── World 1: Orbital Station ─────────────────────────────────────────────────

const L1 = { tileset: 'tile-metal', bgFar: 'bg-station-interior', bgMid: 'bg-station-glow' }

const L1_NORMAL: Omit<LevelConfig, 'roomNum'>[] = [
  // Room A — Entry Airlock
  {
    levelNum: 1, name: 'Entry Airlock', subtitle: '', isBossRoom: false,
    worldWidth: 2200, goalX: 2100, ...L1,
    platforms: [
      { x:1100, y:688, w:2200, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2192, y:360, w:16, h:720 },
      { x:1100, y:8,   w:2200, h:16  },
      { x:280,  y:560, w:180, h:16 }, { x:530,  y:490, w:160, h:16 },
      { x:780,  y:420, w:200, h:16 }, { x:1040, y:540, w:180, h:16 },
      { x:1280, y:460, w:160, h:16 }, { x:1520, y:390, w:200, h:16 },
      { x:1780, y:510, w:180, h:16 }, { x:2000, y:440, w:160, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Fire     },
      { x:700,  y:650, ability: AbilityType.Electric },
      { x:950,  y:406, ability: AbilityType.Bomb     },
      { x:1400, y:650, ability: AbilityType.Fire     },
    ],
    destructibles: [{ x:1100, y:648, w:48, h:48, health:80, ability: AbilityType.None }],
    crates: [{ x:620, y:650 }, { x:1680, y:650 }],
    items: [{ x:1520, y:270, type: 'heart' }],
  },
  // Room B — Reactor Corridor
  {
    levelNum: 1, name: 'Reactor Corridor', subtitle: '', isBossRoom: false,
    worldWidth: 2800, goalX: 2700, ...L1,
    platforms: [
      { x:1400, y:688, w:2800, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2792, y:360, w:16, h:720 },
      { x:1400, y:8,   w:2800, h:16  },
      { x:260,  y:570, w:160, h:16 }, { x:490,  y:500, w:180, h:16 },
      { x:740,  y:430, w:160, h:16 }, { x:990,  y:530, w:180, h:16 },
      { x:1230, y:460, w:160, h:16 }, { x:1490, y:390, w:200, h:16 },
      { x:1760, y:510, w:180, h:16 }, { x:2010, y:440, w:160, h:16 },
      { x:2260, y:370, w:200, h:16 }, { x:2540, y:500, w:180, h:16 },
    ],
    enemies: [
      { x:350,  y:650, ability: AbilityType.Fire     },
      { x:600,  y:650, ability: AbilityType.Bomb     },
      { x:860,  y:416, ability: AbilityType.Electric },
      { x:1150, y:650, ability: AbilityType.Ice      },
      { x:1600, y:376, ability: AbilityType.Fire     },
      { x:1900, y:650, ability: AbilityType.Bomb     },
      { x:2200, y:356, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:1300, y:648, w:48, h:48, health:80, ability: AbilityType.Fire,
        resistances: { [DamageType.Fire]: -0.5 } },
      { x:2100, y:648, w:48, h:48, health:80, ability: AbilityType.Bomb },
    ],
    crates: [{ x:800, y:650 }, { x:1700, y:650 }, { x:2500, y:650 }],
    items: [{ x:1490, y:260, type: 'mystery' }, { x:2260, y:240, type: 'heart' }],
  },
  // Room C — Cargo Bay (wide-open with elevated catwalks)
  {
    levelNum: 1, name: 'Cargo Bay', subtitle: '', isBossRoom: false,
    worldWidth: 2400, goalX: 2300, ...L1,
    platforms: [
      { x:1200, y:688, w:2400, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2392, y:360, w:16, h:720 },
      { x:1200, y:8,   w:2400, h:16  },
      { x:350,  y:580, w:300, h:16 }, { x:750,  y:500, w:200, h:16 },
      { x:1050, y:420, w:340, h:16 }, { x:1500, y:500, w:200, h:16 },
      { x:1800, y:420, w:300, h:16 }, { x:2150, y:560, w:200, h:16 },
    ],
    enemies: [
      { x:450,  y:650, ability: AbilityType.Ice      },
      { x:900,  y:650, ability: AbilityType.Fire     },
      { x:1200, y:406, ability: AbilityType.Electric },
      { x:1600, y:650, ability: AbilityType.Bomb     },
      { x:2000, y:406, ability: AbilityType.Ice      },
    ],
    destructibles: [
      { x:700,  y:648, w:48, h:48, health:60, ability: AbilityType.Ice },
      { x:1900, y:648, w:48, h:48, health:80, ability: AbilityType.Fire },
    ],
    crates: [{ x:550, y:650 }, { x:1300, y:650 }, { x:2000, y:650 }],
    items: [{ x:1050, y:300, type: 'mystery' }, { x:1800, y:300, type: 'ability', ability: AbilityType.Fire }],
  },
  // Room D — Maintenance Shaft (tall with vertical drops)
  {
    levelNum: 1, name: 'Maintenance Shaft', subtitle: '', isBossRoom: false,
    worldWidth: 2000, goalX: 1900, ...L1,
    platforms: [
      { x:1000, y:688, w:2000, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:1992, y:360, w:16, h:720 },
      { x:1000, y:8,   w:2000, h:16  },
      { x:200,  y:600, w:160, h:16 }, { x:420,  y:510, w:140, h:16 },
      { x:640,  y:430, w:160, h:16 }, { x:860,  y:360, w:140, h:16 },
      { x:1100, y:430, w:160, h:16 }, { x:1330, y:520, w:140, h:16 },
      { x:1560, y:440, w:160, h:16 }, { x:1780, y:370, w:140, h:16 },
    ],
    enemies: [
      { x:300,  y:650, ability: AbilityType.Fire     },
      { x:560,  y:496, ability: AbilityType.Electric },
      { x:800,  y:346, ability: AbilityType.Bomb     },
      { x:1200, y:650, ability: AbilityType.Ice      },
      { x:1450, y:506, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:900,  y:648, w:64, h:32, health:60, ability: AbilityType.Electric },
    ],
    crates: [{ x:460, y:650 }, { x:1100, y:650 }, { x:1700, y:650 }],
    items: [{ x:860, y:240, type: 'heart' }, { x:1560, y:320, type: 'mystery' }],
  },
  // Room E — Engine Room (lots of obstacles)
  {
    levelNum: 1, name: 'Engine Room', subtitle: '', isBossRoom: false,
    worldWidth: 2600, goalX: 2500, ...L1,
    platforms: [
      { x:1300, y:688, w:2600, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2592, y:360, w:16, h:720 },
      { x:1300, y:8,   w:2600, h:16  },
      { x:300,  y:540, w:180, h:16 }, { x:560,  y:460, w:200, h:16 },
      { x:820,  y:390, w:180, h:16 }, { x:1100, y:500, w:200, h:16 },
      { x:1380, y:420, w:180, h:16 }, { x:1660, y:360, w:200, h:16 },
      { x:1950, y:450, w:180, h:16 }, { x:2230, y:380, w:200, h:16 },
      // Mid-room platform bridge
      { x:700,  y:310, w:140, h:16 }, { x:1500, y:310, w:140, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Bomb     },
      { x:660,  y:446, ability: AbilityType.Fire     },
      { x:920,  y:376, ability: AbilityType.Electric },
      { x:1200, y:650, ability: AbilityType.Bomb     },
      { x:1480, y:406, ability: AbilityType.Ice      },
      { x:1760, y:346, ability: AbilityType.Fire     },
      { x:2050, y:650, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:1000, y:648, w:48, h:48, health:80, ability: AbilityType.None },
      { x:1900, y:648, w:48, h:48, health:80, ability: AbilityType.Bomb },
    ],
    crates: [{ x:700, y:296 }, { x:1500, y:296 }, { x:2300, y:650 }],
    items: [{ x:820, y:270, type: 'mystery' }, { x:2230, y:260, type: 'life' }],
  },
  // Room F — Docking Bay (sparse with big gaps)
  {
    levelNum: 1, name: 'Docking Bay', subtitle: '', isBossRoom: false,
    worldWidth: 3000, goalX: 2900, ...L1,
    platforms: [
      { x:500,  y:688, w:1000, h:32 }, { x:1650, y:688, w:600, h:32 },
      { x:2500, y:688, w:700, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2992, y:360, w:16, h:720 },
      { x:1500, y:8,   w:3000, h:16  },
      { x:350,  y:560, w:160, h:16 }, { x:620,  y:480, w:180, h:16 },
      { x:900,  y:400, w:160, h:16 }, { x:1120, y:470, w:180, h:16 },
      { x:1380, y:390, w:160, h:16 }, { x:1640, y:470, w:180, h:16 },
      { x:1900, y:400, w:160, h:16 }, { x:2160, y:480, w:180, h:16 },
      { x:2420, y:400, w:160, h:16 }, { x:2680, y:470, w:180, h:16 },
    ],
    enemies: [
      { x:450,  y:650, ability: AbilityType.Electric },
      { x:720,  y:466, ability: AbilityType.Ice      },
      { x:1000, y:386, ability: AbilityType.Fire     },
      { x:1700, y:650, ability: AbilityType.Bomb     },
      { x:2000, y:386, ability: AbilityType.Electric },
      { x:2500, y:650, ability: AbilityType.Ice      },
    ],
    destructibles: [
      { x:1200, y:648, w:48, h:48, health:80, ability: AbilityType.Electric },
      { x:2300, y:648, w:48, h:48, health:80, ability: AbilityType.None     },
    ],
    crates: [{ x:800, y:650 }, { x:2000, y:650 }, { x:2750, y:650 }],
    items: [{ x:1380, y:270, type: 'heart' }, { x:2420, y:280, type: 'mystery' }],
  },
  // Room G — Communications Array (high platforms)
  {
    levelNum: 1, name: 'Communications Array', subtitle: '', isBossRoom: false,
    worldWidth: 2500, goalX: 2400, ...L1,
    platforms: [
      { x:1250, y:688, w:2500, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2492, y:360, w:16, h:720 },
      { x:1250, y:8,   w:2500, h:16  },
      { x:300,  y:580, w:140, h:16 }, { x:520,  y:480, w:160, h:16 },
      { x:760,  y:380, w:140, h:16 }, { x:980,  y:300, w:160, h:16 },
      { x:1220, y:380, w:140, h:16 }, { x:1460, y:480, w:160, h:16 },
      { x:1700, y:380, w:140, h:16 }, { x:1940, y:300, w:160, h:16 },
      { x:2180, y:380, w:140, h:16 }, { x:2380, y:480, w:140, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Fire     },
      { x:620,  y:466, ability: AbilityType.Ice      },
      { x:860,  y:366, ability: AbilityType.Electric },
      { x:1080, y:286, ability: AbilityType.Bomb     },
      { x:1320, y:366, ability: AbilityType.Fire     },
      { x:1560, y:466, ability: AbilityType.Ice      },
      { x:1800, y:366, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:700,  y:648, w:48, h:48, health:60, ability: AbilityType.Bomb },
      { x:1700, y:648, w:48, h:48, health:80, ability: AbilityType.Fire },
    ],
    crates: [{ x:980, y:286 }, { x:1940, y:286 }],
    items: [{ x:980, y:180, type: 'mystery' }, { x:1940, y:180, type: 'ability', ability: AbilityType.Ice }],
  },
  // Room H — Security Lockdown (dense enemies)
  {
    levelNum: 1, name: 'Security Lockdown', subtitle: '', isBossRoom: false,
    worldWidth: 2200, goalX: 2100, ...L1,
    platforms: [
      { x:1100, y:688, w:2200, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2192, y:360, w:16, h:720 },
      { x:1100, y:8,   w:2200, h:16  },
      { x:340,  y:550, w:200, h:16 }, { x:600,  y:470, w:160, h:16 },
      { x:860,  y:540, w:200, h:16 }, { x:1100, y:460, w:160, h:16 },
      { x:1360, y:540, w:200, h:16 }, { x:1620, y:460, w:160, h:16 },
      { x:1880, y:540, w:200, h:16 },
    ],
    enemies: [
      { x:340,  y:650, ability: AbilityType.Fire     },
      { x:600,  y:456, ability: AbilityType.Bomb     },
      { x:860,  y:650, ability: AbilityType.Electric },
      { x:1100, y:446, ability: AbilityType.Ice      },
      { x:1360, y:650, ability: AbilityType.Fire     },
      { x:1620, y:446, ability: AbilityType.Bomb     },
      { x:1880, y:650, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:500,  y:648, w:48, h:48, health:60, ability: AbilityType.Bomb     },
      { x:1200, y:648, w:48, h:48, health:60, ability: AbilityType.Fire     },
      { x:1900, y:648, w:48, h:48, health:60, ability: AbilityType.Electric },
    ],
    crates: [{ x:700, y:650 }, { x:1500, y:650 }],
    items: [{ x:600, y:350, type: 'mystery' }, { x:1620, y:350, type: 'mystery' }],
  },
]

const L1_BOSS: Omit<LevelConfig, 'roomNum'> = {
  levelNum: 1, name: 'Command Bridge', subtitle: '', isBossRoom: true, bossHp: 8, bossSpawnX: 1900,
  worldWidth: 2600, goalX: 2500, ...L1,
  platforms: [
    { x:1300, y:688, w:2600, h:32 },
    { x:8,    y:360, w:16,   h:720 }, { x:2592, y:360, w:16, h:720 },
    { x:1300, y:8,   w:2600, h:16  },
    { x:380,  y:560, w:200, h:16 }, { x:680,  y:490, w:180, h:16 },
    { x:980,  y:420, w:200, h:16 }, { x:1350, y:490, w:200, h:16 },
    { x:1680, y:560, w:180, h:16 }, { x:1980, y:490, w:200, h:16 },
  ],
  enemies: [
    { x:600,  y:650, ability: AbilityType.Fire     },
    { x:1200, y:650, ability: AbilityType.Electric },
  ],
  destructibles: [],
  crates: [{ x:900, y:650 }],
  items: [],
}

// ─── World 2: Asteroid Belt ────────────────────────────────────────────────────

const L2 = { tileset: 'tile-rock', bgFar: 'bg-cave-rock', bgMid: 'bg-cave-glow' }

const L2_NORMAL: Omit<LevelConfig, 'roomNum'>[] = [
  // Room A — Mine Shaft
  {
    levelNum: 2, name: 'Mine Shaft', subtitle: '', isBossRoom: false,
    worldWidth: 2800, goalX: 2700, ...L2,
    platforms: [
      { x:600,  y:688, w:1200, h:32 }, { x:1850, y:688, w:700, h:32 },
      { x:2550, y:688, w:600, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2792, y:360, w:16, h:720 },
      { x:1400, y:8,   w:2800, h:16  },
      { x:900,  y:540, w:180, h:16 }, { x:1150, y:460, w:160, h:16 },
      { x:1380, y:520, w:180, h:16 }, { x:1620, y:440, w:160, h:16 },
      { x:1820, y:380, w:200, h:16 }, { x:2060, y:500, w:180, h:16 },
      { x:2290, y:420, w:160, h:16 }, { x:2510, y:490, w:180, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Fire     },
      { x:750,  y:650, ability: AbilityType.Bomb     },
      { x:1100, y:446, ability: AbilityType.Electric },
      { x:1450, y:650, ability: AbilityType.Ice      },
      { x:1900, y:650, ability: AbilityType.Fire     },
      { x:2200, y:406, ability: AbilityType.Bomb     },
    ],
    destructibles: [
      { x:1200, y:648, w:48, h:48, health:80, ability: AbilityType.None },
      { x:2000, y:648, w:48, h:48, health:60, ability: AbilityType.Ice  },
    ],
    crates: [{ x:700, y:650 }, { x:1600, y:650 }, { x:2400, y:650 }],
    items: [{ x:1820, y:260, type: 'mystery' }],
  },
  // Room B — Crystal Chamber
  {
    levelNum: 2, name: 'Crystal Chamber', subtitle: '', isBossRoom: false,
    worldWidth: 3200, goalX: 3100, ...L2,
    platforms: [
      { x:700,  y:688, w:1400, h:32 }, { x:2050, y:688, w:800, h:32 },
      { x:2950, y:688, w:700, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:3192, y:360, w:16, h:720 },
      { x:1600, y:8,   w:3200, h:16  },
      { x:480,  y:530, w:180, h:16 }, { x:760,  y:460, w:160, h:16 },
      { x:1040, y:510, w:180, h:16 }, { x:1350, y:430, w:200, h:16 },
      { x:1600, y:500, w:160, h:16 }, { x:1850, y:420, w:180, h:16 },
      { x:2140, y:490, w:200, h:16 }, { x:2400, y:400, w:180, h:16 },
      { x:2650, y:470, w:160, h:16 }, { x:2900, y:390, w:200, h:16 },
    ],
    enemies: [
      { x:360,  y:650, ability: AbilityType.Fire     },
      { x:640,  y:650, ability: AbilityType.Electric },
      { x:900,  y:446, ability: AbilityType.Bomb     },
      { x:1200, y:650, ability: AbilityType.Ice      },
      { x:1500, y:486, ability: AbilityType.Fire     },
      { x:1800, y:650, ability: AbilityType.Electric },
      { x:2100, y:476, ability: AbilityType.Bomb     },
      { x:2400, y:386, ability: AbilityType.Ice      },
    ],
    destructibles: [
      { x:1000, y:648, w:48, h:48, health:80, ability: AbilityType.Bomb     },
      { x:1850, y:648, w:48, h:48, health:60, ability: AbilityType.Electric },
      { x:2700, y:648, w:48, h:48, health:80, ability: AbilityType.None     },
    ],
    crates: [{ x:600, y:650 }, { x:1400, y:650 }, { x:2300, y:650 }, { x:3000, y:650 }],
    items: [{ x:1350, y:310, type: 'mystery' }, { x:2900, y:270, type: 'mystery' }],
  },
  // Room C — Hollow Drift (floating island layout)
  {
    levelNum: 2, name: 'Hollow Drift', subtitle: '', isBossRoom: false,
    worldWidth: 2600, goalX: 2500, ...L2,
    platforms: [
      { x:400,  y:688, w:800,  h:32 }, { x:1500, y:688, w:800, h:32 },
      { x:2400, y:688, w:400, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2592, y:360, w:16, h:720 },
      { x:1300, y:8,   w:2600, h:16  },
      { x:300,  y:540, w:160, h:16 }, { x:550,  y:460, w:200, h:16 },
      { x:800,  y:380, w:160, h:16 }, { x:1060, y:460, w:200, h:16 },
      { x:1320, y:380, w:160, h:16 }, { x:1580, y:460, w:200, h:16 },
      { x:1840, y:380, w:160, h:16 }, { x:2100, y:460, w:200, h:16 },
      { x:2360, y:380, w:160, h:16 },
      // Upper tier
      { x:680,  y:290, w:200, h:16 }, { x:1200, y:290, w:200, h:16 },
      { x:1820, y:290, w:200, h:16 },
    ],
    enemies: [
      { x:350,  y:650, ability: AbilityType.Ice      },
      { x:650,  y:446, ability: AbilityType.Fire     },
      { x:900,  y:366, ability: AbilityType.Bomb     },
      { x:1200, y:650, ability: AbilityType.Electric },
      { x:1460, y:366, ability: AbilityType.Ice      },
      { x:1700, y:650, ability: AbilityType.Fire     },
      { x:1960, y:366, ability: AbilityType.Bomb     },
    ],
    destructibles: [
      { x:800,  y:648, w:48, h:48, health:80, ability: AbilityType.Ice  },
      { x:1900, y:648, w:48, h:48, health:80, ability: AbilityType.Bomb },
    ],
    crates: [{ x:680, y:276 }, { x:1200, y:276 }, { x:2400, y:650 }],
    items: [{ x:680, y:170, type: 'heart' }, { x:1820, y:170, type: 'mystery' }],
  },
  // Room D — Ore Processing
  {
    levelNum: 2, name: 'Ore Processing', subtitle: '', isBossRoom: false,
    worldWidth: 2400, goalX: 2300, ...L2,
    platforms: [
      { x:1200, y:688, w:2400, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2392, y:360, w:16, h:720 },
      { x:1200, y:8,   w:2400, h:16  },
      { x:240,  y:580, w:200, h:16 }, { x:520,  y:510, w:160, h:16 },
      { x:800,  y:440, w:200, h:16 }, { x:1080, y:370, w:160, h:16 },
      { x:1320, y:440, w:200, h:16 }, { x:1600, y:510, w:160, h:16 },
      { x:1880, y:440, w:200, h:16 }, { x:2160, y:370, w:160, h:16 },
    ],
    enemies: [
      { x:340,  y:650, ability: AbilityType.Bomb     },
      { x:600,  y:496, ability: AbilityType.Ice      },
      { x:880,  y:426, ability: AbilityType.Fire     },
      { x:1160, y:356, ability: AbilityType.Electric },
      { x:1400, y:650, ability: AbilityType.Bomb     },
      { x:1680, y:496, ability: AbilityType.Ice      },
      { x:1960, y:426, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:680,  y:648, w:64, h:32, health:100, ability: AbilityType.Fire  },
      { x:1500, y:648, w:64, h:32, health:100, ability: AbilityType.Bomb  },
      { x:2200, y:648, w:64, h:32, health:80,  ability: AbilityType.None  },
    ],
    crates: [{ x:400, y:650 }, { x:1200, y:650 }, { x:2000, y:650 }],
    items: [{ x:1080, y:250, type: 'mystery' }, { x:2160, y:250, type: 'heart' }],
  },
  // Room E — Spire Fields (many narrow platforms)
  {
    levelNum: 2, name: 'Spire Fields', subtitle: '', isBossRoom: false,
    worldWidth: 3000, goalX: 2900, ...L2,
    platforms: [
      { x:500,  y:688, w:1000, h:32 }, { x:2000, y:688, w:1200, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2992, y:360, w:16, h:720 },
      { x:1500, y:8,   w:3000, h:16  },
      { x:280,  y:560, w:120, h:16 }, { x:480,  y:480, w:120, h:16 },
      { x:700,  y:400, w:120, h:16 }, { x:920,  y:480, w:120, h:16 },
      { x:1140, y:400, w:120, h:16 }, { x:1360, y:480, w:120, h:16 },
      { x:1580, y:400, w:120, h:16 }, { x:1800, y:480, w:120, h:16 },
      { x:2020, y:400, w:120, h:16 }, { x:2240, y:480, w:120, h:16 },
      { x:2460, y:400, w:120, h:16 }, { x:2680, y:480, w:120, h:16 },
    ],
    enemies: [
      { x:380,  y:650, ability: AbilityType.Electric },
      { x:580,  y:466, ability: AbilityType.Fire     },
      { x:800,  y:386, ability: AbilityType.Ice      },
      { x:1020, y:466, ability: AbilityType.Bomb     },
      { x:1240, y:386, ability: AbilityType.Electric },
      { x:1700, y:650, ability: AbilityType.Fire     },
      { x:1920, y:386, ability: AbilityType.Ice      },
      { x:2340, y:466, ability: AbilityType.Bomb     },
    ],
    destructibles: [
      { x:1000, y:648, w:48, h:48, health:80, ability: AbilityType.Ice      },
      { x:2100, y:648, w:48, h:48, health:80, ability: AbilityType.Electric },
    ],
    crates: [{ x:700, y:386 }, { x:1580, y:386 }, { x:2700, y:650 }],
    items: [{ x:700, y:286, type: 'mystery' }, { x:2460, y:280, type: 'life' }],
  },
  // Room F — Crater Run
  {
    levelNum: 2, name: 'Crater Run', subtitle: '', isBossRoom: false,
    worldWidth: 3400, goalX: 3300, ...L2,
    platforms: [
      { x:700,  y:688, w:1400, h:32 }, { x:2200, y:688, w:900, h:32 },
      { x:3100, y:688, w:700, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:3392, y:360, w:16, h:720 },
      { x:1700, y:8,   w:3400, h:16  },
      { x:300,  y:500, w:180, h:16 }, { x:560,  y:430, w:160, h:16 },
      { x:820,  y:490, w:180, h:16 }, { x:1090, y:410, w:200, h:16 },
      { x:1360, y:480, w:160, h:16 }, { x:1620, y:400, w:180, h:16 },
      { x:1880, y:480, w:200, h:16 }, { x:2160, y:400, w:180, h:16 },
      { x:2430, y:470, w:160, h:16 }, { x:2690, y:390, w:200, h:16 },
      { x:2960, y:460, w:180, h:16 }, { x:3200, y:390, w:200, h:16 },
    ],
    enemies: [
      { x:350,  y:650, ability: AbilityType.Fire     },
      { x:620,  y:650, ability: AbilityType.Bomb     },
      { x:880,  y:476, ability: AbilityType.Electric },
      { x:1150, y:396, ability: AbilityType.Ice      },
      { x:1450, y:650, ability: AbilityType.Fire     },
      { x:1750, y:386, ability: AbilityType.Bomb     },
      { x:2050, y:466, ability: AbilityType.Electric },
      { x:2350, y:386, ability: AbilityType.Ice      },
      { x:2650, y:650, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:800,  y:648, w:48, h:48, health:80,  ability: AbilityType.None     },
      { x:1600, y:648, w:48, h:48, health:100, ability: AbilityType.Bomb,
        resistances: { [DamageType.Explosion]: 0.5 } },
      { x:2500, y:648, w:64, h:64, health:120, ability: AbilityType.Electric },
    ],
    crates: [{ x:450, y:650 }, { x:1200, y:650 }, { x:2100, y:650 }, { x:3000, y:650 }],
    items: [
      { x:1090, y:290, type: 'mystery' }, { x:2690, y:270, type: 'mystery' },
      { x:3200, y:270, type: 'life'    },
    ],
  },
  // Room G — Meteor Storm (staggered drops, many gaps)
  {
    levelNum: 2, name: 'Meteor Storm', subtitle: '', isBossRoom: false,
    worldWidth: 2600, goalX: 2500, ...L2,
    platforms: [
      { x:350,  y:688, w:700, h:32 }, { x:1300, y:688, w:600, h:32 },
      { x:2200, y:688, w:600, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2592, y:360, w:16, h:720 },
      { x:1300, y:8,   w:2600, h:16  },
      { x:240,  y:560, w:160, h:16 }, { x:460,  y:470, w:160, h:16 },
      { x:700,  y:390, w:160, h:16 }, { x:950,  y:470, w:160, h:16 },
      { x:1190, y:390, w:160, h:16 }, { x:1440, y:470, w:160, h:16 },
      { x:1680, y:390, w:160, h:16 }, { x:1930, y:470, w:160, h:16 },
      { x:2180, y:390, w:160, h:16 }, { x:2420, y:470, w:160, h:16 },
    ],
    enemies: [
      { x:340,  y:650, ability: AbilityType.Ice      },
      { x:560,  y:456, ability: AbilityType.Bomb     },
      { x:800,  y:376, ability: AbilityType.Fire     },
      { x:1050, y:456, ability: AbilityType.Electric },
      { x:1290, y:376, ability: AbilityType.Ice      },
      { x:1540, y:456, ability: AbilityType.Bomb     },
      { x:1780, y:376, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:950,  y:648, w:48, h:48, health:60, ability: AbilityType.Fire },
      { x:2000, y:648, w:48, h:48, health:80, ability: AbilityType.Ice  },
    ],
    crates: [{ x:600, y:650 }, { x:1400, y:650 }, { x:2300, y:650 }],
    items: [{ x:700, y:270, type: 'heart' }, { x:1680, y:270, type: 'mystery' }],
  },
  // Room H — Dust Cavern
  {
    levelNum: 2, name: 'Dust Cavern', subtitle: '', isBossRoom: false,
    worldWidth: 2200, goalX: 2100, ...L2,
    platforms: [
      { x:1100, y:688, w:2200, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2192, y:360, w:16, h:720 },
      { x:1100, y:8,   w:2200, h:16  },
      { x:300,  y:540, w:220, h:16 }, { x:580,  y:460, w:180, h:16 },
      { x:860,  y:540, w:220, h:16 }, { x:1140, y:460, w:180, h:16 },
      { x:1420, y:540, w:220, h:16 }, { x:1700, y:460, w:180, h:16 },
      { x:1980, y:540, w:180, h:16 },
      // High platforms
      { x:740,  y:360, w:140, h:16 }, { x:1280, y:360, w:140, h:16 }, { x:1840, y:360, w:140, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Bomb     },
      { x:680,  y:446, ability: AbilityType.Electric },
      { x:960,  y:650, ability: AbilityType.Ice      },
      { x:1240, y:446, ability: AbilityType.Fire     },
      { x:1520, y:650, ability: AbilityType.Bomb     },
      { x:1800, y:446, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:740,  y:346, w:48, h:32, health:60, ability: AbilityType.Electric },
      { x:1280, y:346, w:48, h:32, health:60, ability: AbilityType.Bomb     },
    ],
    crates: [{ x:580, y:650 }, { x:1140, y:650 }, { x:1840, y:346 }],
    items: [{ x:1840, y:346, type: 'mystery' }, { x:580, y:340, type: 'heart' }],
  },
]

const L2_BOSS: Omit<LevelConfig, 'roomNum'> = {
  levelNum: 2, name: 'Magma Forge', subtitle: '', isBossRoom: true, bossHp: 12, bossSpawnX: 2000,
  worldWidth: 2800, goalX: 2700, ...L2,
  platforms: [
    { x:1400, y:688, w:2800, h:32 },
    { x:8,    y:360, w:16,   h:720 }, { x:2792, y:360, w:16, h:720 },
    { x:1400, y:8,   w:2800, h:16  },
    { x:350,  y:550, w:200, h:16 }, { x:650,  y:470, w:180, h:16 },
    { x:950,  y:400, w:200, h:16 }, { x:1300, y:470, w:180, h:16 },
    { x:1650, y:540, w:200, h:16 }, { x:1950, y:460, w:180, h:16 },
    { x:2250, y:390, w:200, h:16 },
  ],
  enemies: [
    { x:500,  y:650, ability: AbilityType.Bomb     },
    { x:900,  y:650, ability: AbilityType.Electric },
    { x:1500, y:650, ability: AbilityType.Fire     },
  ],
  destructibles: [],
  crates: [{ x:800, y:650 }, { x:1700, y:650 }],
  items: [],
}

// ─── World 3: Planet Core ──────────────────────────────────────────────────────

const L3 = { tileset: 'tile-core', bgFar: 'bg-magma-wall', bgMid: 'bg-magma-heat' }

const L3_NORMAL: Omit<LevelConfig, 'roomNum'>[] = [
  // Room A — Outer Core
  {
    levelNum: 3, name: 'Outer Core', subtitle: '', isBossRoom: false,
    worldWidth: 3000, goalX: 2900, ...L3,
    platforms: [
      { x:650,  y:688, w:1300, h:32 }, { x:2200, y:688, w:900, h:32 },
      { x:2750, y:688, w:500, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2992, y:360, w:16, h:720 },
      { x:1500, y:8,   w:3000, h:16  },
      { x:340,  y:490, w:180, h:16 }, { x:600,  y:420, w:160, h:16 },
      { x:880,  y:500, w:180, h:16 }, { x:1140, y:420, w:200, h:16 },
      { x:1380, y:510, w:160, h:16 }, { x:1620, y:440, w:180, h:16 },
      { x:1880, y:370, w:200, h:16 }, { x:2150, y:480, w:180, h:16 },
      { x:2410, y:410, w:160, h:16 }, { x:2660, y:490, w:180, h:16 },
    ],
    enemies: [
      { x:380,  y:650, ability: AbilityType.Fire     },
      { x:650,  y:650, ability: AbilityType.Bomb     },
      { x:920,  y:486, ability: AbilityType.Electric },
      { x:1200, y:406, ability: AbilityType.Ice      },
      { x:1500, y:650, ability: AbilityType.Fire     },
      { x:1800, y:356, ability: AbilityType.Bomb     },
      { x:2100, y:650, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:750,  y:648, w:48, h:48, health:80,  ability: AbilityType.None },
      { x:1700, y:648, w:48, h:48, health:100, ability: AbilityType.Fire },
    ],
    crates: [{ x:500, y:650 }, { x:1300, y:650 }, { x:2200, y:650 }],
    items: [{ x:1880, y:250, type: 'mystery' }],
  },
  // Room B — Inner Sanctum
  {
    levelNum: 3, name: 'Inner Sanctum', subtitle: '', isBossRoom: false,
    worldWidth: 3400, goalX: 3300, ...L3,
    platforms: [
      { x:700,  y:688, w:1400, h:32 }, { x:2200, y:688, w:900, h:32 },
      { x:3100, y:688, w:700, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:3392, y:360, w:16, h:720 },
      { x:1700, y:8,   w:3400, h:16  },
      { x:300,  y:500, w:180, h:16 }, { x:560,  y:430, w:160, h:16 },
      { x:820,  y:490, w:180, h:16 }, { x:1090, y:410, w:200, h:16 },
      { x:1360, y:480, w:160, h:16 }, { x:1620, y:400, w:180, h:16 },
      { x:1880, y:480, w:200, h:16 }, { x:2160, y:400, w:180, h:16 },
      { x:2430, y:470, w:160, h:16 }, { x:2690, y:390, w:200, h:16 },
      { x:2960, y:460, w:180, h:16 }, { x:3200, y:390, w:200, h:16 },
    ],
    enemies: [
      { x:350,  y:650, ability: AbilityType.Fire     },
      { x:620,  y:650, ability: AbilityType.Bomb     },
      { x:880,  y:476, ability: AbilityType.Electric },
      { x:1150, y:396, ability: AbilityType.Ice      },
      { x:1450, y:650, ability: AbilityType.Fire     },
      { x:1750, y:386, ability: AbilityType.Bomb     },
      { x:2050, y:466, ability: AbilityType.Electric },
      { x:2350, y:386, ability: AbilityType.Ice      },
      { x:2650, y:650, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:800,  y:648, w:48, h:48, health:80,  ability: AbilityType.None     },
      { x:1600, y:648, w:48, h:48, health:100, ability: AbilityType.Bomb,
        resistances: { [DamageType.Explosion]: 0.5 } },
      { x:2500, y:648, w:64, h:64, health:120, ability: AbilityType.Electric },
    ],
    crates: [{ x:450, y:650 }, { x:1200, y:650 }, { x:2100, y:650 }, { x:3000, y:650 }],
    items: [
      { x:1090, y:290, type: 'mystery' }, { x:2690, y:270, type: 'mystery' },
      { x:3200, y:270, type: 'life'    },
    ],
  },
  // Room C — Magma Current (lava-themed gaps)
  {
    levelNum: 3, name: 'Magma Current', subtitle: '', isBossRoom: false,
    worldWidth: 2800, goalX: 2700, ...L3,
    platforms: [
      { x:450,  y:688, w:900, h:32 }, { x:1550, y:688, w:700, h:32 },
      { x:2500, y:688, w:600, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2792, y:360, w:16, h:720 },
      { x:1400, y:8,   w:2800, h:16  },
      { x:280,  y:540, w:160, h:16 }, { x:520,  y:460, w:180, h:16 },
      { x:780,  y:380, w:160, h:16 }, { x:1040, y:460, w:180, h:16 },
      { x:1300, y:380, w:160, h:16 }, { x:1560, y:460, w:180, h:16 },
      { x:1820, y:380, w:160, h:16 }, { x:2080, y:460, w:180, h:16 },
      { x:2340, y:380, w:160, h:16 }, { x:2600, y:460, w:180, h:16 },
    ],
    enemies: [
      { x:380,  y:650, ability: AbilityType.Fire     },
      { x:620,  y:446, ability: AbilityType.Electric },
      { x:880,  y:366, ability: AbilityType.Bomb     },
      { x:1140, y:446, ability: AbilityType.Ice      },
      { x:1400, y:366, ability: AbilityType.Fire     },
      { x:1660, y:446, ability: AbilityType.Electric },
      { x:1920, y:366, ability: AbilityType.Bomb     },
      { x:2180, y:446, ability: AbilityType.Ice      },
    ],
    destructibles: [
      { x:700,  y:648, w:48, h:48, health:100, ability: AbilityType.Fire     },
      { x:1500, y:648, w:48, h:48, health:100, ability: AbilityType.Electric },
      { x:2300, y:648, w:48, h:48, health:100, ability: AbilityType.None     },
    ],
    crates: [{ x:540, y:650 }, { x:1340, y:650 }, { x:2140, y:650 }],
    items: [{ x:780, y:260, type: 'mystery' }, { x:1820, y:260, type: 'heart' }],
  },
  // Room D — Pressure Chamber
  {
    levelNum: 3, name: 'Pressure Chamber', subtitle: '', isBossRoom: false,
    worldWidth: 2400, goalX: 2300, ...L3,
    platforms: [
      { x:1200, y:688, w:2400, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2392, y:360, w:16, h:720 },
      { x:1200, y:8,   w:2400, h:16  },
      { x:300,  y:590, w:180, h:16 }, { x:560,  y:510, w:160, h:16 },
      { x:820,  y:430, w:180, h:16 }, { x:1080, y:350, w:160, h:16 },
      { x:1320, y:430, w:180, h:16 }, { x:1580, y:510, w:160, h:16 },
      { x:1840, y:430, w:180, h:16 }, { x:2100, y:350, w:160, h:16 },
    ],
    enemies: [
      { x:400,  y:650, ability: AbilityType.Electric },
      { x:660,  y:496, ability: AbilityType.Fire     },
      { x:920,  y:416, ability: AbilityType.Ice      },
      { x:1180, y:336, ability: AbilityType.Bomb     },
      { x:1420, y:650, ability: AbilityType.Electric },
      { x:1680, y:496, ability: AbilityType.Fire     },
      { x:1940, y:416, ability: AbilityType.Ice      },
      { x:2200, y:336, ability: AbilityType.Bomb     },
    ],
    destructibles: [
      { x:820,  y:648, w:64, h:32, health:120, ability: AbilityType.None     },
      { x:1580, y:648, w:64, h:32, health:120, ability: AbilityType.Electric },
      { x:2100, y:336, w:48, h:32, health:80,  ability: AbilityType.Bomb     },
    ],
    crates: [{ x:500, y:650 }, { x:1300, y:650 }, { x:2100, y:336 }],
    items: [{ x:1080, y:230, type: 'mystery' }, { x:2100, y:230, type: 'ability', ability: AbilityType.Electric }],
  },
  // Room E — Crystal Volcano
  {
    levelNum: 3, name: 'Crystal Volcano', subtitle: '', isBossRoom: false,
    worldWidth: 3000, goalX: 2900, ...L3,
    platforms: [
      { x:600,  y:688, w:1200, h:32 }, { x:2000, y:688, w:800, h:32 },
      { x:2800, y:688, w:400, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2992, y:360, w:16, h:720 },
      { x:1500, y:8,   w:3000, h:16  },
      { x:260,  y:530, w:160, h:16 }, { x:500,  y:450, w:200, h:16 },
      { x:760,  y:370, w:160, h:16 }, { x:1020, y:450, w:200, h:16 },
      { x:1280, y:370, w:160, h:16 }, { x:1540, y:450, w:200, h:16 },
      { x:1800, y:370, w:160, h:16 }, { x:2060, y:450, w:200, h:16 },
      { x:2320, y:370, w:160, h:16 }, { x:2580, y:450, w:200, h:16 },
      // Top tier
      { x:640,  y:270, w:200, h:16 }, { x:1400, y:270, w:200, h:16 }, { x:2160, y:270, w:200, h:16 },
    ],
    enemies: [
      { x:360,  y:650, ability: AbilityType.Fire     },
      { x:600,  y:436, ability: AbilityType.Bomb     },
      { x:860,  y:356, ability: AbilityType.Ice      },
      { x:1120, y:436, ability: AbilityType.Electric },
      { x:1380, y:356, ability: AbilityType.Fire     },
      { x:1640, y:436, ability: AbilityType.Bomb     },
      { x:1900, y:356, ability: AbilityType.Ice      },
      { x:2160, y:436, ability: AbilityType.Electric },
      { x:2420, y:356, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:900,  y:648, w:48, h:48, health:100, ability: AbilityType.Fire },
      { x:1800, y:648, w:48, h:48, health:100, ability: AbilityType.Ice  },
      { x:2600, y:648, w:48, h:48, health:100, ability: AbilityType.Bomb },
    ],
    crates: [{ x:640, y:256 }, { x:1400, y:256 }, { x:2160, y:256 }],
    items: [
      { x:640,  y:156, type: 'mystery' }, { x:1400, y:156, type: 'heart'   },
      { x:2160, y:156, type: 'mystery' },
    ],
  },
  // Room F — Tectonic Fault
  {
    levelNum: 3, name: 'Tectonic Fault', subtitle: '', isBossRoom: false,
    worldWidth: 2600, goalX: 2500, ...L3,
    platforms: [
      { x:350,  y:688, w:700, h:32 }, { x:1300, y:688, w:600, h:32 },
      { x:2200, y:688, w:600, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2592, y:360, w:16, h:720 },
      { x:1300, y:8,   w:2600, h:16  },
      { x:220,  y:570, w:140, h:16 }, { x:420,  y:490, w:140, h:16 },
      { x:640,  y:410, w:140, h:16 }, { x:860,  y:490, w:140, h:16 },
      { x:1080, y:410, w:140, h:16 }, { x:1300, y:490, w:140, h:16 },
      { x:1520, y:410, w:140, h:16 }, { x:1740, y:490, w:140, h:16 },
      { x:1960, y:410, w:140, h:16 }, { x:2180, y:490, w:140, h:16 },
      { x:2400, y:410, w:140, h:16 },
    ],
    enemies: [
      { x:320,  y:650, ability: AbilityType.Bomb     },
      { x:520,  y:476, ability: AbilityType.Fire     },
      { x:740,  y:396, ability: AbilityType.Electric },
      { x:960,  y:476, ability: AbilityType.Ice      },
      { x:1180, y:396, ability: AbilityType.Bomb     },
      { x:1400, y:476, ability: AbilityType.Fire     },
      { x:1620, y:396, ability: AbilityType.Electric },
      { x:1840, y:476, ability: AbilityType.Ice      },
    ],
    destructibles: [
      { x:640,  y:396, w:48, h:32, health:80,  ability: AbilityType.Fire },
      { x:1520, y:396, w:48, h:32, health:80,  ability: AbilityType.Bomb },
      { x:2400, y:396, w:48, h:32, health:100, ability: AbilityType.None },
    ],
    crates: [{ x:450, y:650 }, { x:1150, y:650 }, { x:2100, y:650 }],
    items: [{ x:1080, y:290, type: 'mystery' }, { x:1960, y:290, type: 'life' }],
  },
  // Room G — Inferno Vault
  {
    levelNum: 3, name: 'Inferno Vault', subtitle: '', isBossRoom: false,
    worldWidth: 3200, goalX: 3100, ...L3,
    platforms: [
      { x:800,  y:688, w:1600, h:32 }, { x:2600, y:688, w:900, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:3192, y:360, w:16, h:720 },
      { x:1600, y:8,   w:3200, h:16  },
      { x:280,  y:560, w:180, h:16 }, { x:540,  y:480, w:160, h:16 },
      { x:800,  y:400, w:180, h:16 }, { x:1060, y:480, w:160, h:16 },
      { x:1320, y:400, w:180, h:16 }, { x:1580, y:480, w:160, h:16 },
      { x:1840, y:400, w:180, h:16 }, { x:2100, y:480, w:160, h:16 },
      { x:2360, y:400, w:180, h:16 }, { x:2620, y:480, w:160, h:16 },
      { x:2880, y:400, w:180, h:16 },
    ],
    enemies: [
      { x:380,  y:650, ability: AbilityType.Electric },
      { x:640,  y:466, ability: AbilityType.Fire     },
      { x:900,  y:386, ability: AbilityType.Bomb     },
      { x:1160, y:466, ability: AbilityType.Ice      },
      { x:1420, y:386, ability: AbilityType.Electric },
      { x:1680, y:466, ability: AbilityType.Fire     },
      { x:1940, y:386, ability: AbilityType.Bomb     },
      { x:2200, y:466, ability: AbilityType.Ice      },
      { x:2460, y:386, ability: AbilityType.Electric },
    ],
    destructibles: [
      { x:700,  y:648, w:48, h:48, health:100, ability: AbilityType.Fire     },
      { x:1500, y:648, w:48, h:48, health:120, ability: AbilityType.Electric },
      { x:2300, y:648, w:64, h:64, health:140, ability: AbilityType.Bomb     },
    ],
    crates: [{ x:600, y:650 }, { x:1300, y:650 }, { x:2000, y:650 }, { x:2900, y:650 }],
    items: [
      { x:800,  y:280, type: 'mystery' }, { x:1840, y:280, type: 'mystery' },
      { x:2880, y:280, type: 'life'    },
    ],
  },
  // Room H — Gravity Well (stepped descent)
  {
    levelNum: 3, name: 'Gravity Well', subtitle: '', isBossRoom: false,
    worldWidth: 2200, goalX: 2100, ...L3,
    platforms: [
      { x:1100, y:688, w:2200, h:32 },
      { x:8,    y:360, w:16,   h:720 }, { x:2192, y:360, w:16, h:720 },
      { x:1100, y:8,   w:2200, h:16  },
      { x:220,  y:620, w:280, h:16 }, { x:580,  y:540, w:220, h:16 },
      { x:900,  y:460, w:220, h:16 }, { x:1220, y:380, w:220, h:16 },
      { x:1540, y:460, w:220, h:16 }, { x:1860, y:540, w:220, h:16 },
      // Return path upper
      { x:720,  y:340, w:180, h:16 }, { x:1400, y:300, w:180, h:16 },
    ],
    enemies: [
      { x:320,  y:650, ability: AbilityType.Ice      },
      { x:680,  y:526, ability: AbilityType.Fire     },
      { x:1000, y:446, ability: AbilityType.Electric },
      { x:1320, y:366, ability: AbilityType.Bomb     },
      { x:1640, y:446, ability: AbilityType.Ice      },
      { x:1960, y:526, ability: AbilityType.Fire     },
    ],
    destructibles: [
      { x:500,  y:648, w:48, h:48, health:80,  ability: AbilityType.None },
      { x:1200, y:366, w:48, h:32, health:100, ability: AbilityType.Ice  },
    ],
    crates: [{ x:720, y:326 }, { x:1400, y:286 }],
    items: [{ x:1220, y:260, type: 'mystery' }, { x:1860, y:420, type: 'heart' }],
  },
]

const L3_BOSS: Omit<LevelConfig, 'roomNum'> = {
  levelNum: 3, name: 'Core Chamber', subtitle: '', isBossRoom: true, bossHp: 16, bossSpawnX: 2200,
  worldWidth: 3000, goalX: 2900, ...L3,
  platforms: [
    { x:1500, y:688, w:3000, h:32 },
    { x:8,    y:360, w:16,   h:720 }, { x:2992, y:360, w:16, h:720 },
    { x:1500, y:8,   w:3000, h:16  },
    { x:350,  y:550, w:200, h:16 }, { x:700,  y:470, w:180, h:16 },
    { x:1050, y:400, w:200, h:16 }, { x:1400, y:470, w:180, h:16 },
    { x:1750, y:540, w:200, h:16 }, { x:2100, y:460, w:180, h:16 },
    { x:2450, y:390, w:200, h:16 }, { x:2750, y:460, w:180, h:16 },
  ],
  enemies: [
    { x:500,  y:650, ability: AbilityType.Fire     },
    { x:900,  y:650, ability: AbilityType.Electric },
    { x:1400, y:650, ability: AbilityType.Bomb     },
    { x:1700, y:650, ability: AbilityType.Ice      },
  ],
  destructibles: [],
  crates: [{ x:700, y:650 }, { x:1200, y:650 }, { x:2600, y:650 }],
  items: [],
}

// ─── Pool & Sequence ───────────────────────────────────────────────────────────

export const LEVEL_POOLS: Omit<LevelConfig, 'roomNum'>[][] = [
  [...L1_NORMAL, L1_BOSS],
  [...L2_NORMAL, L2_BOSS],
  [...L3_NORMAL, L3_BOSS],
]

const BOSS_IDX = 8   // index 8 in each pool is always the boss room

export function generateRoomSequence(levelNum: number): number[] {
  const pool = LEVEL_POOLS[levelNum - 1]
  if (!pool) return [0, 1, 2, 3, BOSS_IDX]

  // Fisher-Yates shuffle of normal room indices 0..7
  const normal = [0, 1, 2, 3, 4, 5, 6, 7]
  for (let i = normal.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[normal[i], normal[j]] = [normal[j], normal[i]]
  }
  // Take 4 random normal rooms, then boss
  return [...normal.slice(0, 4), BOSS_IDX]
}

// Legacy flat array kept for backward-compat (unused after randomisation)
export const ROOMS: LevelConfig[] = []
