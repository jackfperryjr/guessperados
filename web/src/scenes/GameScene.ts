import Phaser from 'phaser'
import { Player } from '../game/Player'
import { Enemy } from '../game/Enemy'
import { Boss } from '../game/Boss'
import { Destructible } from '../game/Destructible'
import { GameManager } from '../game/GameManager'
import { UIManager } from '../ui/UIManager'
import { TouchControls } from '../ui/TouchControls'
import { RoomConfig, ExitDir, generateRun } from '../levels'
import { AbilityType, DamageType } from '../types'
import { ItemSpawn } from '../levels'
import { ABILITY_AMMO } from '../game/Player'
import { NetworkManager, RemoteInput } from '../network/NetworkManager'
import { SoundManager } from '../audio/SoundManager'

const FONT = '"Press Start 2P", monospace'
const INHALE_PULL_SPEED = 400
const SCORE_ENEMY = 200
const SCORE_DESTRUCT = 100

const KEYBOARD_CONFIGS: Record<string, string>[] = [
  { left: 'A',    right: 'D',     jump: 'W',  inhale: 'C',     ability: 'X' },
  { left: 'LEFT', right: 'RIGHT', jump: 'UP', inhale: 'COMMA', ability: 'L' },
]

const OPPOSITE: Record<ExitDir, ExitDir> = { left:'right', right:'left', top:'bottom', bottom:'top' }
const DOOR_H = 130   // pixel height of a left/right door opening
const DOOR_W = 120   // pixel width of a top/bottom door opening

function getEntryPos(dir: ExitDir, cfg: RoomConfig): { x: number; y: number } {
  const W = cfg.worldWidth
  const ep = cfg.exitPositions ?? {}
  switch (dir) {
    case 'left':   return { x: 70,     y: ep.left   ?? 640 }
    case 'right':  return { x: W - 70, y: ep.right  ?? 640 }
    case 'top':    return { x: ep.top    ?? W / 2, y: 80  }
    case 'bottom': return { x: ep.bottom ?? W / 2, y: 640 }
  }
}

export class GameScene extends Phaser.Scene {
  private cfg!: RoomConfig
  private gm!: GameManager
  private ui!: UIManager

  private players: Player[] = []
  private enemies: Enemy[] = []
  private boss: Boss | null = null
  private enemyGroup!: Phaser.Physics.Arcade.Group
  private destructibles: Destructible[] = []
  private crates: Phaser.Physics.Arcade.Image[] = []
  private projectiles!: Phaser.Physics.Arcade.Group
  private enemyProjectiles!: Phaser.Physics.Arcade.Group

  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private cameraTarget!: Phaser.GameObjects.Rectangle
  private bgLayers: Phaser.GameObjects.TileSprite[] = []
  private throneLabel: Phaser.GameObjects.Text | null = null
  private throneX = 0
  private bossPortalPos: { x: number; y: number } | null = null
  private portalLabel: Phaser.GameObjects.Text | null = null
  private roomTransitioning = false
  private bossDefeated = false
  private bossRoomLeftWall: Phaser.GameObjects.TileSprite | null = null
  private pauseItems: { text: Phaser.GameObjects.Text; action: () => void }[] = []
  private pauseFocusIdx = 0
  private pauseCursor: Phaser.GameObjects.Text | null = null

  private collectibleSprites: Phaser.GameObjects.Image[] = []
  private inhaleGraphics: Phaser.GameObjects.Graphics[] = []
  private tilemapLayers: Phaser.Tilemaps.TilemapLayer[] = []

  private playerKeysets = new Map<number, Record<string, Phaser.Input.Keyboard.Key>>()
  private touchControls: TouchControls | null = null
  private pauseContainer!: Phaser.GameObjects.Container
  private score = 0
  private _lastPadConnected = false
  private _debugLogTimer = 0

  private nm: NetworkManager | null = null
  private localPlayerId = 0
  private remoteInputs = new Map<number, RemoteInput>()

  constructor() { super({ key: 'GameScene' }) }

  init() {
    this.players = []; this.enemies = []; this.destructibles = []
    this.crates = []; this.bgLayers = []; this.collectibleSprites = []; this.inhaleGraphics = []
    this.tilemapLayers = []
    this.playerKeysets.clear(); this.touchControls = null
    this.remoteInputs.clear()
    this.nm = null
    this.score = 0
    this.boss = null
    this.throneLabel = null
    this.throneX = 0
    this.bossPortalPos = null
    this.portalLabel = null
    this.roomTransitioning = false
    this.bossDefeated = false
    this.bossRoomLeftWall = null
    this.pauseItems = []
    this.pauseFocusIdx = 0
    this.pauseCursor = null
    this._lastPadConnected = false
    this._debugLogTimer = 0
  }

  create() {
    // ── Load or generate this run's room sequence ──────────────────────────────
    let runRooms: RoomConfig[] = this.registry.get('runRooms')
    if (!runRooms || runRooms.length === 0) {
      runRooms = generateRun()
      this.registry.set('runRooms', runRooms)
      this.registry.set('runIndex', 0)
      this.registry.set('entryDir', null)
    }
    const runIndex: number = this.registry.get('runIndex') ?? 0
    this.cfg = runRooms[runIndex]

    // If we entered via a direction, guarantee the return exit exists so the
    // player can always backtrack the way they came.
    const entryDir0: ExitDir | null = this.registry.get('entryDir') ?? null
    if (entryDir0 && !this.cfg.exits.includes(entryDir0)) {
      this.cfg = { ...this.cfg, exits: [...this.cfg.exits, entryDir0] }
    }

    this.score = this.registry.get('score') ?? 0
    this.gm = new GameManager()

    this.nm = this.registry.get('networkManager') ?? null
    this.localPlayerId = this.registry.get('localPlayerId') ?? 0
    if (this.nm) {
      this.nm.onRemoteInput = (id, input) => this.remoteInputs.set(id, input)
      this.nm.onPlayerLeft  = (id) => this.removeRemotePlayer(id)
    }

    const W = this.cfg.worldWidth
    const H = this.cfg.worldHeight ?? 720
    this.physics.world.setBounds(-100, -100, W + 200, H + 200)
    this.cameras.main.setBounds(0, 0, W, H)
    this.cameras.main.setRoundPixels(true)

    this.buildBackground()
    this.buildScenery()
    this.buildLevel()
    this.setupCollectibles()
    this.spawnPlayers()
    this.setupCollision()
    this.setupGamepadEvents()
    this.setupCamera()

    this.ui = new UIManager(
      this,
      this.registry.get('playerCount') ?? 1,
      this.cfg.name,
      this.cfg.isBossRoom ?? false,
      this.cfg.bossHp ?? 0,
    )

    if (this.boss) {
      this.boss.on('hpChanged', (hp: number, max: number) => this.ui.updateBossBar(hp, max))
      this.boss.on('bossAttack', (ability: AbilityType) => this.fireBossSpecial(ability))
      this.ui.updateBossBar(this.cfg.bossHp!, this.cfg.bossHp!)
    }

    this.wirePlayerUIEvents()
    this.buildPauseMenu()
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause())
    this.cameras.main.fadeIn(400, 0, 0, 0)

    SoundManager.startBgMusic()
    this.events.once('shutdown', () => SoundManager.stopBgMusic())
  }

  // ── background ──────────────────────────────────────────────────────────────

  private doorGlow(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x00e5ff, 0.10)
    g.fillRect(x, y, w, h)
    g.lineStyle(3, 0x00e5ff, 0.85)
    g.strokeRect(x, y, w, h)
    g.lineStyle(4, 0x00e5ff, 1)
    if (w < h) {
      g.beginPath(); g.moveTo(x - 6, y);     g.lineTo(x + w + 6, y);     g.strokePath()
      g.beginPath(); g.moveTo(x - 6, y + h); g.lineTo(x + w + 6, y + h); g.strokePath()
    } else {
      g.beginPath(); g.moveTo(x,     y - 6); g.lineTo(x,     y + h + 6); g.strokePath()
      g.beginPath(); g.moveTo(x + w, y - 6); g.lineTo(x + w, y + h + 6); g.strokePath()
    }
    this.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1200, yoyo: true, repeat: -1 })
  }

  private buildBackground() {
    const { width, height } = this.scale
    const cx = width / 2, cy = height / 2
    const W = this.cfg.worldWidth

    if (this.cfg.worldMap) return  // tilemap layers serve as background

    if (this.cfg.roomImage) {
      this.add.image(W / 2, 360, this.cfg.roomImage)
        .setDisplaySize(W, 720).setDepth(-2)
      this.bgLayers.push(
        this.add.tileSprite(cx, cy, width, height, this.cfg.bgMid)
          .setScrollFactor(0).setAlpha(0.20),
      )
      return
    }

    this.bgLayers.push(
      this.add.tileSprite(cx, cy, width, height, this.cfg.bgFar).setScrollFactor(0),
      this.add.tileSprite(cx, cy, width, height, this.cfg.bgMid)
        .setScrollFactor(0).setAlpha(0.75),
    )

    if (this.cfg.isBossRoom) {
      const overlay = this.add.rectangle(cx, cy, width, height, 0x00001a, 0.40).setScrollFactor(0).setDepth(1)
      this.tweens.add({ targets: overlay, alpha: 0.55, duration: 2000, yoyo: true, repeat: -1 })
    } else if (this.cfg.isThrone) {
      this.add.rectangle(cx, cy, width, height, 0x0a0a2a, 0.45).setScrollFactor(0).setDepth(1)
    }
  }

  // ── scenery ──────────────────────────────────────────────────────────────────

  private buildScenery() {
    const w = this.cfg.worldWidth
    if (this.cfg.worldMap)  { return }
    if (this.cfg.roomImage) { return }
    if (this.cfg.isBossRoom) { this.buildSceneryThrone(w); return }
    if (this.cfg.isThrone)   { this.buildSceneryThrone(w); return }
    if (this.cfg.isTutorial) { this.buildSceneryHall(w);   return }
    const hash = this.cfg.name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    switch (hash % 5) {
      case 0: this.buildSceneryHall(w);    break
      case 1: this.buildSceneryDungeon(w); break
      case 2: this.buildSceneryCrypt(w);   break
      case 3: this.buildSceneryChapel(w);  break
      default: this.buildSceneryArmory(w); break
    }
  }

  // ── Great Hall — warm stone, pillars, torches, hanging banners ────────────────
  private buildSceneryHall(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x0f0800, 0.30).setDepth(2)

    // Stone pillars
    const pillars = Math.max(3, Math.floor(w / 280))
    for (let i = 0; i < pillars; i++) {
      const px = 160 + i * (w / pillars)
      this.add.rectangle(px, 360, 28, 720, 0x1a1208, 0.85).setDepth(3)
      this.add.rectangle(px, 360, 22, 720, 0x221a0e, 0.6).setDepth(3)
      this.add.rectangle(px, 14,  44, 14, 0x2a2010, 0.9).setDepth(4)
      this.add.rectangle(px, 686, 44, 14, 0x2a2010, 0.9).setDepth(4)
    }

    // Wall torches
    const torches = Math.max(2, Math.floor(w / 360))
    for (let i = 0; i < torches; i++) {
      const tx = 200 + i * (w / torches)
      this.add.rectangle(tx, 200, 8, 30, 0x4a3820, 0.9).setDepth(4)
      this.add.rectangle(tx, 185, 12, 8, 0x5a4828, 0.9).setDepth(4)
      const flame = this.add.rectangle(tx, 176, 16, 20, 0xff8800, 0.85).setDepth(5)
      const glow  = this.add.rectangle(tx, 176, 48, 80, 0xff6600, 0.10).setDepth(4)
      this.tweens.add({ targets: flame, scaleY: 0.7, scaleX: 0.8, alpha: 0.6, duration: 150 + (tx % 120), yoyo: true, repeat: -1 })
      this.tweens.add({ targets: glow, alpha: 0.04, duration: 200 + (tx % 150), yoyo: true, repeat: -1 })
    }

    // Hanging banners
    const banners = Math.max(2, Math.floor(w / 400))
    for (let i = 0; i < banners; i++) {
      const bx = 220 + i * (w / banners)
      this.add.rectangle(bx, 120, 36, 180, 0x4a0808, 0.85).setDepth(3)
      this.add.rectangle(bx, 120, 12, 180, 0x660a0a, 0.6).setDepth(3)
      this.add.rectangle(bx,  90, 36, 10, 0xcc8800, 0.7).setDepth(4)
      this.add.rectangle(bx, 210, 36, 10, 0xcc8800, 0.7).setDepth(4)
    }

    // Floor flagstones
    const tiles = Math.ceil(w / 80)
    for (let i = 0; i < tiles; i++) {
      if (i % 2 === 0) this.add.rectangle(40 + i * 80, 686, 78, 28, 0x1a1208, 0.4).setDepth(2)
    }

    // Ceiling arches between pillars
    for (let i = 0; i < pillars - 1; i++) {
      const ax = 160 + i * (w / pillars) + (w / pillars) / 2
      this.add.rectangle(ax, 12, w / pillars - 30, 18, 0x221a0e, 0.7).setDepth(3)
    }
  }

  // ── Dungeon — chains, iron bars, dripping water, skull motifs ────────────────
  private buildSceneryDungeon(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x040408, 0.38).setDepth(2)

    // Ceiling chains
    const chains = Math.ceil(w / 220)
    for (let i = 0; i < chains; i++) {
      const cx = 110 + i * 220 + (i % 3 - 1) * 20
      const ch = 60 + (i % 4) * 28
      for (let j = 0; j < Math.floor(ch / 8); j++) {
        this.add.rectangle(cx + (j % 2 === 0 ? 0 : 2), 8 + j * 8, j % 2 === 0 ? 5 : 7, 7, 0x3a3a3a, 0.9).setDepth(3)
      }
      this.add.rectangle(cx, 10 + ch, 12, 8, 0x4a4a4a, 0.9).setDepth(4)
    }

    // Iron bar sections
    const barGroups = Math.max(2, Math.floor(w / 480))
    for (let i = 0; i < barGroups; i++) {
      const bgx = 240 + i * (w / barGroups)
      const bgy = 420
      this.add.rectangle(bgx, bgy, 120, 160, 0x1a1a1a, 0.7).setDepth(2)
      for (let b = 0; b < 5; b++) {
        this.add.rectangle(bgx - 48 + b * 24, bgy, 6, 154, 0x333333, 0.9).setDepth(3)
      }
      this.add.rectangle(bgx, bgy, 120, 6, 0x3d3d3d, 0.9).setDepth(4)
    }

    // Skull carvings
    const skulls = Math.max(2, Math.floor(w / 420))
    for (let i = 0; i < skulls; i++) {
      const sx = 180 + i * (w / skulls)
      const sy = 270 + (i % 2) * 60
      this.add.circle(sx, sy, 14, 0x221a0a, 0.9).setDepth(3)
      this.add.rectangle(sx - 5, sy - 2, 5, 5, 0x0a0a0a, 0.95).setDepth(4)
      this.add.rectangle(sx + 5, sy - 2, 5, 5, 0x0a0a0a, 0.95).setDepth(4)
    }

    // Floor puddles
    const puddles = Math.max(2, Math.floor(w / 380))
    for (let i = 0; i < puddles; i++) {
      const px = 160 + i * (w / puddles) + (i % 3 - 1) * 30
      const pool = this.add.rectangle(px, 686, 60 + (i % 3) * 20, 4, 0x334455, 0.35).setDepth(2)
      this.tweens.add({ targets: pool, alpha: 0.15, duration: 1400 + (px % 600), yoyo: true, repeat: -1 })
    }

    // Dim torches
    const dTorches = Math.max(2, Math.floor(w / 480))
    for (let i = 0; i < dTorches; i++) {
      const tx = 240 + i * (w / dTorches)
      this.add.rectangle(tx, 240, 7, 24, 0x3a2810, 0.9).setDepth(4)
      const flame = this.add.rectangle(tx, 228, 12, 16, 0xff6600, 0.65).setDepth(5)
      const glow  = this.add.rectangle(tx, 228, 40, 60, 0xff4400, 0.06).setDepth(4)
      this.tweens.add({ targets: flame, scaleY: 0.6, alpha: 0.45, duration: 180 + (tx % 100), yoyo: true, repeat: -1 })
      this.tweens.add({ targets: glow, alpha: 0.02, duration: 220 + (tx % 120), yoyo: true, repeat: -1 })
    }
  }

  // ── Crypt — stone arches, coffin alcoves, candles, rune carvings ──────────────
  private buildSceneryCrypt(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x060408, 0.35).setDepth(2)

    // Ceiling arch ribs
    const arches = Math.max(3, Math.floor(w / 300))
    for (let i = 0; i < arches; i++) {
      const ax = 150 + i * (w / arches)
      this.add.rectangle(ax, 8, 16, 28, 0x1a1218, 0.9).setDepth(3)
      this.add.rectangle(ax - 60, 28, 8, 14, 0x1a1218, 0.7).setDepth(3)
      this.add.rectangle(ax + 60, 28, 8, 14, 0x1a1218, 0.7).setDepth(3)
    }

    // Coffin alcoves
    const alcoves = Math.max(2, Math.floor(w / 400))
    for (let i = 0; i < alcoves; i++) {
      const alx = 200 + i * (w / alcoves)
      const aly = 380
      this.add.rectangle(alx, aly, 72, 130, 0x0d0a10, 0.9).setDepth(2)
      this.add.rectangle(alx, aly - 64, 72, 4, 0x1a1520, 0.7).setDepth(3)
      this.add.rectangle(alx - 34, aly, 4, 124, 0x221a28, 0.7).setDepth(3)
      this.add.rectangle(alx + 34, aly, 4, 124, 0x221a28, 0.7).setDepth(3)
      this.add.rectangle(alx, aly + 30, 40, 8, 0x2a2230, 0.8).setDepth(3)
    }

    // Candles on floor
    const candles = Math.max(3, Math.floor(w / 260))
    for (let i = 0; i < candles; i++) {
      const cx = 130 + i * (w / candles) + (i % 3 - 1) * 15
      this.add.rectangle(cx, 670, 6, 24, 0xe8e0d0, 0.9).setDepth(4)
      const flame = this.add.rectangle(cx, 654, 6, 12, 0xffdd88, 0.9).setDepth(5)
      const glow  = this.add.rectangle(cx, 654, 24, 40, 0xffaa44, 0.10).setDepth(4)
      this.tweens.add({ targets: flame, scaleX: 0.6, scaleY: 0.8, alpha: 0.65, duration: 100 + (cx % 80), yoyo: true, repeat: -1 })
      this.tweens.add({ targets: glow, alpha: 0.04, duration: 130 + (cx % 100), yoyo: true, repeat: -1 })
    }

    // Rune strips on walls
    const runes = Math.max(3, Math.floor(w / 300))
    for (let i = 0; i < runes; i++) {
      const rx = 120 + i * (w / runes)
      const ry = 160 + (i % 4) * 50
      this.add.rectangle(rx, ry, 80, 2, 0x4a3858, 0.45).setDepth(2)
      this.add.rectangle(rx + 30, ry + 6, 20, 2, 0x3a2848, 0.35).setDepth(2)
    }
  }

  // ── Chapel — stained glass, pews, altar, gothic arches ───────────────────────
  private buildSceneryChapel(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x020408, 0.32).setDepth(2)

    // Stained glass windows
    const windows = Math.max(2, Math.floor(w / 380))
    const glassColors = [0x880033, 0x005588, 0x446600, 0x882200]
    for (let i = 0; i < windows; i++) {
      const wx = 190 + i * (w / windows)
      this.add.rectangle(wx, 220, 64, 140, 0x0d1020, 0.9).setDepth(2)
      this.add.rectangle(wx, 220, 58, 134, 0x101420, 0.8).setDepth(2)
      for (let p = 0; p < 4; p++) {
        const py = 220 - 42 + p * 28
        const pane = this.add.rectangle(wx, py, 52, 26, glassColors[p], 0.45).setDepth(3)
        this.tweens.add({ targets: pane, alpha: 0.25, duration: 2000 + p * 400 + (wx % 600), yoyo: true, repeat: -1 })
      }
      this.add.rectangle(wx, 220, 58, 4, 0x1a1e28, 0.9).setDepth(4)
      this.add.rectangle(wx, 220, 4, 134, 0x1a1e28, 0.9).setDepth(4)
      const pool = this.add.rectangle(wx, 680, 80, 6, glassColors[1], 0.15).setDepth(2)
      this.tweens.add({ targets: pool, alpha: 0.05, duration: 1800 + (wx % 600), yoyo: true, repeat: -1 })
    }

    // Pew silhouettes
    const pews = Math.max(3, Math.floor(w / 280))
    for (let i = 0; i < pews; i++) {
      const pewx = 140 + i * (w / pews) + (i % 2) * 30 - 15
      this.add.rectangle(pewx, 665, 160, 12, 0x180e06, 0.9).setDepth(3)
      this.add.rectangle(pewx, 655, 160, 4, 0x201408, 0.8).setDepth(3)
      this.add.rectangle(pewx - 72, 660, 8, 16, 0x180e06, 0.9).setDepth(3)
      this.add.rectangle(pewx + 72, 660, 8, 16, 0x180e06, 0.9).setDepth(3)
    }

    // Altar (small rooms only)
    if (w <= 1300) {
      const ax = w / 2
      this.add.rectangle(ax, 650, 120, 50, 0x1c1408, 0.9).setDepth(4)
      this.add.rectangle(ax, 625, 100, 6, 0x2a1e0e, 0.9).setDepth(4)
      ;[-30, 0, 30].forEach(ox => {
        this.add.rectangle(ax + ox, 616, 6, 18, 0xe8e0d0, 0.9).setDepth(5)
        const f = this.add.rectangle(ax + ox, 607, 5, 10, 0xffdd88, 0.85).setDepth(6)
        this.tweens.add({ targets: f, scaleX: 0.5, scaleY: 0.75, duration: 90 + Math.abs(ox), yoyo: true, repeat: -1 })
      })
    }

    // Gothic ceiling ribs
    const ribs = Math.max(3, Math.ceil(w / 200))
    for (let i = 0; i < ribs; i++) {
      this.add.rectangle(100 + i * (w / ribs), 10, 12, 24, 0x141018, 0.85).setDepth(3)
    }
  }

  // ── Armory — weapon racks, shields, flagstones, braziers ─────────────────────
  private buildSceneryArmory(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x0a0400, 0.32).setDepth(2)

    // Weapon racks
    const racks = Math.max(2, Math.floor(w / 380))
    for (let i = 0; i < racks; i++) {
      const rx = 180 + i * (w / racks)
      this.add.rectangle(rx, 360, 120, 8, 0x2a1a0a, 0.9).setDepth(3)
      for (let s = 0; s < 3; s++) {
        const sx = rx - 40 + s * 40
        this.add.rectangle(sx, 390, 5, 60, 0x505050, 0.85).setDepth(4)
        this.add.rectangle(sx, 368, 18, 5, 0x604030, 0.9).setDepth(4)
        this.add.rectangle(sx, 354, 5, 14, 0x7a5a3a, 0.9).setDepth(4)
      }
    }

    // Shield emblems
    const shields = Math.max(2, Math.floor(w / 460))
    for (let i = 0; i < shields; i++) {
      const shx = 200 + i * (w / shields)
      const shy = 240 + (i % 2) * 60
      this.add.rectangle(shx, shy, 48, 58, 0x1a0e06, 0.9).setDepth(2)
      this.add.rectangle(shx, shy + 8, 44, 44, 0x8b0000, 0.6).setDepth(3)
      this.add.rectangle(shx, shy + 8, 44, 6, 0xcc8800, 0.7).setDepth(4)
      this.add.rectangle(shx, shy + 8, 6, 44, 0xcc8800, 0.7).setDepth(4)
    }

    // Flagstone floor
    const stones = Math.ceil(w / 100)
    for (let i = 0; i < stones; i++) {
      this.add.rectangle(50 + i * 100, 686, 98, 28, i % 2 === 0 ? 0x141006 : 0x0e0c04, 0.5).setDepth(2)
    }

    // Ceiling braziers
    const braziers = Math.max(2, Math.floor(w / 340))
    for (let i = 0; i < braziers; i++) {
      const bx = 170 + i * (w / braziers)
      this.add.rectangle(bx, 20, 4, 30, 0x3a2810, 0.9).setDepth(3)
      this.add.rectangle(bx, 38, 20, 8, 0x4a3018, 0.9).setDepth(4)
      const flame = this.add.rectangle(bx, 26, 18, 20, 0xff8800, 0.8).setDepth(5)
      const glow  = this.add.rectangle(bx, 26, 50, 70, 0xff6600, 0.08).setDepth(4)
      this.tweens.add({ targets: flame, scaleY: 0.65, scaleX: 0.75, alpha: 0.55, duration: 140 + (bx % 120), yoyo: true, repeat: -1 })
      this.tweens.add({ targets: glow, alpha: 0.03, duration: 200 + (bx % 150), yoyo: true, repeat: -1 })
    }

    // Trophy mounts
    const trophies = Math.max(2, Math.floor(w / 500))
    for (let i = 0; i < trophies; i++) {
      const tx = 250 + i * (w / trophies)
      this.add.circle(tx, 300, 22, 0x1a0e06, 0.85).setDepth(3)
      this.add.circle(tx, 290, 16, 0x221408, 0.8).setDepth(3)
      this.add.rectangle(tx - 20, 272, 4, 22, 0x1a0e06, 0.8).setDepth(3).setRotation(-0.3)
      this.add.rectangle(tx + 20, 272, 4, 22, 0x1a0e06, 0.8).setDepth(3).setRotation(0.3)
    }
  }

  // ── Throne Hall — grand pillars, royal banners, ornate floor, throne ──────────
  private buildSceneryThrone(w: number) {
    this.buildWallFeatures(w)
    this.add.rectangle(w / 2, 360, w, 720, 0x0a0408, 0.38).setDepth(2)

    // Grand pillars
    const pillars = Math.max(4, Math.floor(w / 220))
    for (let i = 0; i < pillars; i++) {
      const px = 110 + i * (w / pillars)
      this.add.rectangle(px, 360, 32, 720, 0x15100c, 0.9).setDepth(3)
      this.add.rectangle(px, 360, 24, 720, 0x1e1810, 0.6).setDepth(3)
      this.add.rectangle(px, 12,  52, 18, 0x2a2016, 0.9).setDepth(4)
      this.add.rectangle(px, 682, 52, 18, 0x2a2016, 0.9).setDepth(4)
      this.add.rectangle(px, 40,  34, 4, 0xcc8800, 0.65).setDepth(4)
      this.add.rectangle(px, 672, 34, 4, 0xcc8800, 0.65).setDepth(4)
    }

    // Royal banners — purple/gold
    const banners = Math.max(3, Math.floor(w / 320))
    for (let i = 0; i < banners; i++) {
      const bx = 180 + i * (w / banners)
      this.add.rectangle(bx, 140, 48, 220, 0x380848, 0.9).setDepth(3)
      this.add.rectangle(bx, 140, 36, 220, 0x440a58, 0.5).setDepth(3)
      this.add.rectangle(bx,  30, 48, 8, 0xcc8800, 0.8).setDepth(4)
      this.add.rectangle(bx, 250, 48, 8, 0xcc8800, 0.8).setDepth(4)
      this.add.rectangle(bx, 140, 16, 16, 0xcc8800, 0.6).setDepth(4).setRotation(Math.PI / 4)
    }

    // Ornate floor tiles
    const tiles = Math.ceil(w / 64)
    for (let i = 0; i < tiles; i++) {
      this.add.rectangle(32 + i * 64, 686, 62, 28, i % 2 === 0 ? 0x1a1408 : 0x120e06, 0.6).setDepth(2)
      if (i % 4 === 0) this.add.rectangle(32 + i * 64, 686, 2, 28, 0xcc8800, 0.2).setDepth(3)
    }

    // Throne dais
    const tx = w / 2
    this.add.rectangle(tx, 654, 100, 48, 0x1a1008, 0.95).setDepth(4)
    this.add.rectangle(tx, 590, 90, 140, 0x1e1408, 0.95).setDepth(4)
    this.add.rectangle(tx, 590, 80, 130, 0x280c08, 0.7).setDepth(4)
    this.add.rectangle(tx - 44, 630, 14, 50, 0x1a1008, 0.9).setDepth(4)
    this.add.rectangle(tx + 44, 630, 14, 50, 0x1a1008, 0.9).setDepth(4)
    this.add.rectangle(tx, 518, 90, 8, 0xcc8800, 0.7).setDepth(5)
    for (let pt = 0; pt < 5; pt++) {
      this.add.rectangle(tx - 36 + pt * 18, 510, 8, 16, 0xcc8800, 0.65).setDepth(5)
    }

    // Grand torches
    const tTorches = Math.max(3, Math.floor(w / 280))
    for (let i = 0; i < tTorches; i++) {
      const torchX = 140 + i * (w / tTorches)
      this.add.rectangle(torchX, 180, 10, 40, 0x4a3820, 0.9).setDepth(4)
      this.add.rectangle(torchX, 162, 16, 10, 0x604828, 0.9).setDepth(4)
      const flame = this.add.rectangle(torchX, 150, 22, 28, 0xff9900, 0.9).setDepth(5)
      const glow  = this.add.rectangle(torchX, 150, 70, 120, 0xff7700, 0.10).setDepth(4)
      this.tweens.add({ targets: flame, scaleY: 0.65, scaleX: 0.7, alpha: 0.65, duration: 120 + (torchX % 110), yoyo: true, repeat: -1 })
      this.tweens.add({ targets: glow, alpha: 0.04, duration: 180 + (torchX % 140), yoyo: true, repeat: -1 })
    }
  }

  // ── shared wall features — thick castle columns at room edges ────────────────
  private buildWallFeatures(w: number) {
    // Left wall column — purple-grey stone with cosmic edge glow
    this.add.rectangle(44, 360, 88, 720, 0x2a2248).setDepth(2)
    this.add.rectangle(22, 360, 44, 720, 0x1e1836).setDepth(2)
    this.add.rectangle(63, 360, 3, 720, 0x9966ee, 0.25).setDepth(3)
    // Brick mortar lines on left wall
    for (let by = 0; by < 720; by += 48) {
      this.add.rectangle(32, by + 24, 64, 2, 0x150e28, 0.85).setDepth(2)
    }
    // Right wall column
    this.add.rectangle(w - 44, 360, 88, 720, 0x2a2248).setDepth(2)
    this.add.rectangle(w - 22, 360, 44, 720, 0x1e1836).setDepth(2)
    this.add.rectangle(w - 63, 360, 3, 720, 0x9966ee, 0.25).setDepth(3)
    for (let by = 0; by < 720; by += 48) {
      this.add.rectangle(w - 32, by + 24, 64, 2, 0x150e28, 0.85).setDepth(2)
    }
  }

  // ── collectibles ──────────────────────────────────────────────────────────────

  private setupCollectibles() {
    const isInsideWall = (x: number, y: number): boolean =>
      this.tilemapLayers.some(layer => {
        const tile = layer.getTileAtWorldXY(x, y)
        return tile !== null && tile.index >= 0
      })

    for (const item of this.cfg.items) {
      if (isInsideWall(item.x, item.y)) continue
      const abilityTex: Partial<Record<AbilityType, string>> = {
        [AbilityType.Fire]:     'fire_ability',
        [AbilityType.Electric]: 'lightning_ability',
        [AbilityType.Ice]:      'ice_ability',
      }
      const tex = item.type === 'heart'   ? 'item-heart'
                : item.type === 'life'    ? 'item-life'
                : item.type === 'mystery' ? 'item-mystery'
                : item.type === 'ability' ? (abilityTex[item.ability ?? AbilityType.None] ?? 'item-orb')
                : 'item-orb'
      const ABILITY_RING: Partial<Record<AbilityType, number>> = {
        [AbilityType.Fire]: 0xff6600, [AbilityType.Electric]: 0xffdd00, [AbilityType.Ice]: 0x66ccff,
      }
      const ringColor = item.type === 'ability'
        ? (ABILITY_RING[item.ability ?? AbilityType.None] ?? 0xffffff)
        : item.type === 'heart' ? 0xff4d6a : 0xffffff
      const ring = this.add.circle(item.x, item.y, 20, 0x000000, 0)
        .setStrokeStyle(2, ringColor)
        .setDepth(7)

      const img = this.add.image(item.x, item.y, tex).setDepth(8)
        .setScale(item.type === 'mystery' ? 2.2 : item.type === 'ability' ? 0.12 : 1.2)
      img.setData('item', item)
      img.setData('ring', ring)

      this.tweens.add({
        targets: [img, ring], y: item.y - 12,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      this.collectibleSprites.push(img)
    }
  }

  private collectItem(player: Player, item: ItemSpawn) {
    if (item.type === 'heart') {
      player.hearts = Math.min(5, player.hearts + 1)
      this.showPopup(item.x, item.y, '+HEART', '#ff4d6a')
      SoundManager.collectHeart()
    } else if (item.type === 'life') {
      const lives: number = (this.registry.get('lives') ?? 1) + 1
      this.registry.set('lives', lives)
      this.showPopup(item.x, item.y, '1-UP!', '#ffe066')
      SoundManager.collectLife()
    } else if (item.type === 'ability') {
      const ab = item.ability ?? AbilityType.None
      player.currentAbility = ab
      player.abilityAmmo = ABILITY_AMMO[ab]
      player.emit('abilityChanged', ab)
      this.showPopup(item.x, item.y, AbilityType[ab].toUpperCase() + '!', '#aaffaa')
      SoundManager.collectAbility()
    } else if (item.type === 'mystery') {
      this.triggerMysteryEffect(player)
      SoundManager.collectMystery()
    }
    this.addScore(500)
  }

  private triggerMysteryEffect(player: Player) {
    const isGood = Math.random() < 0.5
    if (isGood) {
      const r = Math.floor(Math.random() * 3)
      if (r === 0) {
        player.hearts = Math.min(5, player.hearts + 1)
        this.showPopup(player.x, player.y - 32, '+ HEART!', '#ff4d6a')
      } else if (r === 1) {
        const abilities = [AbilityType.Fire, AbilityType.Electric, AbilityType.Ice]
        const ability = abilities[Math.floor(Math.random() * abilities.length)]
        player.currentAbility = ability
        player.abilityAmmo = ABILITY_AMMO[ability]
        player.emit('abilityChanged', ability)
        this.showPopup(player.x, player.y - 32, AbilityType[ability] + '!', '#aaffaa')
      } else {
        player.applyTempEffect('fast', 5000)
        this.showPopup(player.x, player.y - 32, 'SPEED UP!', '#ffe066')
      }
    } else {
      const r = Math.floor(Math.random() * 3)
      if (r === 0) {
        player.hitByEnemy()
        this.showPopup(player.x, player.y - 32, '- HEART', '#ff4444')
      } else if (r === 1) {
        this.spawnMysteryEnemies(player, 2)
        this.showPopup(player.x, player.y - 32, 'AMBUSH!', '#ff6600')
      } else {
        player.applyTempEffect('reverse', 4000)
        this.showPopup(player.x, player.y - 32, 'REVERSED!', '#cc00ff')
      }
    }
  }

  private spawnMysteryEnemies(near: Player, count: number) {
    const abilities = [AbilityType.Fire, AbilityType.Electric, AbilityType.Ice]
    for (let i = 0; i < count; i++) {
      const ability = abilities[Math.floor(Math.random() * abilities.length)]
      const ex = near.x + (i === 0 ? -120 : 120)
      const enemy = new Enemy(this, ex, near.y - 10, ability)
      this.enemies.push(enemy)
      this.enemyGroup.add(enemy)
      this.physics.add.collider(enemy, this.platforms)
    }
  }

  private showPopup(x: number, y: number, text: string, color: string) {
    const popup = this.add.text(x, y - 16, text, {
      fontSize: '11px', fontFamily: FONT, color,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: popup, y: y - 70, alpha: 0,
      duration: 1400, ease: 'Power2',
      onComplete: () => popup.destroy(),
    })
  }

  // ── level ───────────────────────────────────────────────────────────────────

  private buildLevel() {
    this.platforms = this.physics.add.staticGroup()
    this.projectiles = this.physics.add.group()
    this.enemyGroup  = this.physics.add.group()
    this.enemyProjectiles = this.physics.add.group()

    if (this.cfg.worldMap) {
      // ── Tilemap world: create Phaser tile layers, mark collision tiles ──────
      const { key, tileKey, tilesetName, section } = this.cfg.worldMap
      const map = this.make.tilemap({ key })
      const tileset = map.addTilesetImage(tilesetName, tileKey)!
      const SCALE = section ? 720 / (section.rows * 32) : 1
      const ox = section ? -(section.col * 32 * SCALE) : 0
      const oy = section ? -(section.row * 32 * SCALE) : 0

      const mkLayer = (name: string, depth: number, collide = false) => {
        const layer = map.createLayer(name, tileset, ox, oy)
        if (!layer) return null
        if (SCALE !== 1) layer.setScale(SCALE)
        layer.setDepth(depth)
        if (collide) layer.setCollisionByExclusion([-1])
        return layer
      }

      mkLayer('Background walls', -2)
      const wallsLayer = mkLayer('Walls',           1, true)
      const platLarge  = mkLayer('Platforms large', 1, true)
      const platSmall  = mkLayer('Platform small',  1, true)
      mkLayer('Banner', 5)
      mkLayer('Windows', 3)

      this.tilemapLayers = ([wallsLayer, platLarge, platSmall] as (Phaser.Tilemaps.TilemapLayer | null)[])
        .filter((l): l is Phaser.Tilemaps.TilemapLayer => l !== null)

      // Build explicit static bodies from tile data — guarantees collision even
      // when Phaser's built-in tilemap physics is unreliable at certain scales.
      this.tilemapLayers.forEach(l => this.addTileLayerBodies(l, SCALE, ox, oy))

      for (const e of this.cfg.enemies) {
        const enemy = new Enemy(this, e.x, e.y, e.ability)
        this.enemies.push(enemy); this.enemyGroup.add(enemy)
      }
      for (const c of this.cfg.crates) {
        const crate = this.physics.add.image(c.x, c.y, 'crate')
        ;(crate.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false)
        crate.setDisplaySize(32, 32); this.crates.push(crate)
      }
      if (this.cfg.isBossRoom && this.cfg.bossSpawnX && this.cfg.bossHp) {
        const bossY = this.cfg.bossSpawnY ?? 620
        this.boss = new Boss(this, this.cfg.bossSpawnX, bossY, this.cfg.bossHp, 3000)
        const W = this.cfg.worldWidth
        this.boss.on('bossDead', () => {
          this.bossDefeated = true
          SoundManager.bossDeath()
          this.cameras.main.shake(300, 0.010)
          this.showPopup(W / 2, 400, 'BOSS DEFEATED!', '#ffe066')
          this.addScore(2000)
          this.time.delayedCall(3200, () => {
            if (!this.roomTransitioning) {
              this.roomTransitioning = true
              this.cameras.main.fadeOut(900, 0, 0, 0)
              this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'))
            }
          })
        })
      }

      if (this.cfg.bossPortal) {
        const { x, y } = this.cfg.bossPortal
        const cy = y - 91  // center of 256px door, bottom ~37px below platform surface
        this.add.rectangle(x, cy, 144, 256, 0x5c3317).setDepth(2)   // brown outer frame
        this.add.rectangle(x, cy, 132, 244, 0x3d1f0a).setDepth(2)   // dark brown inner
        this.add.rectangle(x, cy + 10, 12, 60, 0xcb9b00).setDepth(2) // gold handle
        const glow = this.add.rectangle(x, cy, 164, 276, 0xff8800, 0.10).setDepth(1)
        this.tweens.add({ targets: glow, alpha: 0.28, duration: 1300, yoyo: true, repeat: -1 })
        this.portalLabel = this.add.text(x, cy - 140, '↑ ENTER SANCTUM', {
          fontSize: '9px', fontFamily: FONT, color: '#ffcc88',
        }).setOrigin(0.5).setDepth(11).setVisible(false)
        this.bossPortalPos = this.cfg.bossPortal
      }

      // Extra static barriers from config (e.g. boss room exit seals)
      for (const p of this.cfg.platforms) {
        const zone = this.add.zone(p.x, p.y, p.w, p.h)
        this.physics.add.existing(zone, true)
        this.platforms.add(zone as unknown as Phaser.Physics.Arcade.Image)
      }
      return
    }

    const W = this.cfg.worldWidth
    const exits = this.cfg.exits
    const ep = this.cfg.exitPositions ?? {}

    const addTile = (x: number, y: number, w: number, h: number) => {
      const tile = this.add.tileSprite(x, y, w, h, this.cfg.tileset)
      this.physics.add.existing(tile, true)
      this.platforms.add(tile)
    }

    // Left wall — with or without a door gap
    // Boss room seals its left wall on entry; it opens only after boss dies.
    const leftDoorY  = ep.left   ?? 640
    if (!exits.includes('left') || this.cfg.isBossRoom) {
      const tile = this.add.tileSprite(8, 360, 16, 720, this.cfg.tileset)
      this.physics.add.existing(tile, true)
      this.platforms.add(tile)
      if (this.cfg.isBossRoom) this.bossRoomLeftWall = tile
    } else {
      const topH = leftDoorY - DOOR_H / 2
      const botY = leftDoorY + DOOR_H / 2
      if (topH > 0)       addTile(8, topH / 2,          16, topH)
      if (botY < 720)     addTile(8, botY + (720 - botY) / 2, 16, 720 - botY)
      this.doorGlow(0, leftDoorY - DOOR_H / 2, 16, DOOR_H)
    }

    // Right wall
    const rightDoorY = ep.right  ?? 640
    if (!exits.includes('right')) {
      addTile(W - 8, 360, 16, 720)
    } else {
      const topH = rightDoorY - DOOR_H / 2
      const botY = rightDoorY + DOOR_H / 2
      if (topH > 0)   addTile(W - 8, topH / 2,               16, topH)
      if (botY < 720) addTile(W - 8, botY + (720 - botY) / 2, 16, 720 - botY)
      this.doorGlow(W - 16, rightDoorY - DOOR_H / 2, 16, DOOR_H)
    }

    // Ceiling
    const topDoorX   = ep.top    ?? W / 2
    if (!exits.includes('top')) {
      addTile(W / 2, 8, W, 16)
    } else {
      const leftW  = topDoorX - DOOR_W / 2
      const rightX = topDoorX + DOOR_W / 2
      if (leftW > 0)  addTile(leftW / 2,              8, leftW,     16)
      if (rightX < W) addTile(rightX + (W - rightX) / 2, 8, W - rightX, 16)
      this.doorGlow(topDoorX - DOOR_W / 2, 0, DOOR_W, 16)
    }

    // Floor
    const botDoorX   = ep.bottom ?? W / 2
    if (!exits.includes('bottom')) {
      addTile(W / 2, 688, W, 32)
    } else {
      const leftW  = botDoorX - DOOR_W / 2
      const rightX = botDoorX + DOOR_W / 2
      if (leftW > 0)  addTile(leftW / 2,                 688, leftW,     32)
      if (rightX < W) addTile(rightX + (W - rightX) / 2, 688, W - rightX, 32)
      this.doorGlow(botDoorX - DOOR_W / 2, 672, DOOR_W, 32)
    }

    // Interior platforms
    for (const p of this.cfg.platforms) {
      addTile(p.x, p.y, p.w, p.h)
    }

    // Diagonal slopes: approximate with tight stepped tiles
    for (const sl of this.cfg.slopes ?? []) {
      const dx = sl.x2 - sl.x1
      const dy = sl.y2 - sl.y1
      const steps = Math.max(6, Math.round(Math.abs(dx) / 40))
      const sw = dx / steps
      const sh = dy / steps
      for (let i = 0; i < steps; i++) {
        addTile(sl.x1 + sw * (i + 0.5), sl.y1 + sh * i + 8, Math.abs(sw) + 2, 16)
      }
    }

    for (const d of this.cfg.destructibles) {
      const dest = new Destructible(this, d.x, d.y, d.health, d.ability, d.resistances ?? {})
      dest.setDisplaySize(d.w, d.h)
      this.destructibles.push(dest)
      dest.on('destroyed', (obj: Destructible) => {
        this.destructibles = this.destructibles.filter(x => x !== obj)
        this.addScore(SCORE_DESTRUCT)
        if (obj.abilityDrop !== AbilityType.None) this.spawnAbilityDrop(obj.x, obj.y, obj.abilityDrop)
      })
    }

    this.spawnRandomBreakables()

    for (const c of this.cfg.crates) {
      const crate = this.physics.add.image(c.x, c.y, 'crate')
      ;(crate.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false)
      crate.setDisplaySize(32, 32)
      this.crates.push(crate)
    }

    for (const e of this.cfg.enemies) {
      const enemy = new Enemy(this, e.x, e.y, e.ability)
      this.enemies.push(enemy)
      this.enemyGroup.add(enemy)
    }

    if (this.cfg.isBossRoom && this.cfg.bossSpawnX && this.cfg.bossHp) {
      this.boss = new Boss(this, this.cfg.bossSpawnX, this.cfg.bossSpawnY ?? 620, this.cfg.bossHp, 3000)
      this.boss.on('bossDead', () => {
        this.bossDefeated = true
        SoundManager.bossDeath()
        this.cameras.main.shake(300, 0.010)
        this.showPopup(W / 2, 400, 'BOSS DEFEATED!', '#ffe066')
        this.addScore(2000)
        // Auto-transition to victory screen after celebration
        this.time.delayedCall(3200, () => {
          if (!this.roomTransitioning) {
            this.roomTransitioning = true
            this.cameras.main.fadeOut(900, 0, 0, 0)
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'))
          }
        })
        // Unseal the left exit — fade out the wall and show the door frame
        if (this.bossRoomLeftWall) {
          const wall = this.bossRoomLeftWall
          ;(wall.body as Phaser.Physics.Arcade.StaticBody).enable = false
          this.tweens.add({
            targets: wall, alpha: 0, duration: 700,
            onComplete: () => {
              wall.destroy()
              this.bossRoomLeftWall = null
              this.doorGlow(0, 640 - DOOR_H / 2, 16, DOOR_H)
            },
          })
        }
      })
    }

    // Throne room door — rendered behind player (depth 1-2)
    if (this.cfg.isThrone) {

      this.throneX = W / 2
      const door = this.add.rectangle(W / 2, 620, 80, 120, 0x334466).setDepth(1)
      this.add.rectangle(W / 2, 620, 74, 114, 0x223355).setDepth(1)
      this.add.rectangle(W / 2, 620, 10, 40,  0xcb9b00).setDepth(1)  // handle
      this.tweens.add({ targets: door, fillColor: 0x445577, duration: 1400, yoyo: true, repeat: -1 })
      this.throneLabel = this.add.text(W / 2, 548, '↑ PRESS UP', {
        fontSize: '9px', fontFamily: FONT, color: '#aaccff',
      }).setOrigin(0.5).setDepth(11).setVisible(false)
    }
  }

  private spawnRandomBreakables() {
    if (this.cfg.worldMap) return
    const W = this.cfg.worldWidth
    const FLOOR_Y  = 672   // top surface of floor tile
    const BLOCK    = 32
    const abilityPool = [
      AbilityType.None, AbilityType.None, AbilityType.None, AbilityType.None,
      AbilityType.Fire, AbilityType.Electric, AbilityType.Ice,
    ]

    const addBlock = (x: number, y: number, ability: AbilityType) => {
      const dest = new Destructible(this, x, y, 1, ability)
      this.destructibles.push(dest)
      dest.on('destroyed', (obj: Destructible) => {
        this.destructibles = this.destructibles.filter(z => z !== obj)
        this.addScore(SCORE_DESTRUCT)
        if (obj.abilityDrop !== AbilityType.None) this.spawnAbilityDrop(obj.x, obj.y, obj.abilityDrop)
      })
    }

    // Floor stacks — one group per 220px span, 150px margins at each wall
    const section = 220
    const numGroups = Math.floor((W - 300) / section)
    for (let i = 0; i < numGroups; i++) {
      const cx = 150 + i * section + Phaser.Math.Between(-30, 30)
      const stackH = Phaser.Math.Between(1, 3)
      const baseAbility = Phaser.Math.RND.pick(abilityPool) as AbilityType
      for (let s = 0; s < stackH; s++) {
        const y = FLOOR_Y - BLOCK / 2 - s * BLOCK
        addBlock(cx, y, s === 0 ? baseAbility : AbilityType.None)
      }
    }

    // Platform tops — 1-2 blocks per platform
    for (const plat of this.cfg.platforms) {
      if (Phaser.Math.Between(0, 1) === 0) continue
      const platTop = plat.y - plat.h / 2
      const xOff = Phaser.Math.Between(-Math.floor(plat.w / 4), Math.floor(plat.w / 4))
      const ability = Phaser.Math.RND.pick(abilityPool) as AbilityType
      addBlock(plat.x + xOff, platTop - BLOCK / 2, ability)
      if (plat.w >= 128 && Phaser.Math.Between(0, 1) === 1) {
        addBlock(plat.x + xOff + Phaser.Math.Between(40, 70), platTop - BLOCK / 2, AbilityType.None)
      }
    }
  }

  // ── players ─────────────────────────────────────────────────────────────────

  private spawnPlayers() {
    const count: number  = this.registry.get('playerCount') ?? 1
    const remoteIds: number[] = this.registry.get('remotePlayers') ?? []
    const entryDir: ExitDir | null = this.registry.get('entryDir') ?? null
    const pos = entryDir ? getEntryPos(entryDir, this.cfg) : { x: 400, y: 620 }

    for (let i = 0; i < count; i++) {
      const p = new Player(this, pos.x + i * 60, pos.y, i)
      p.setDepth(3)  // above background door (depth 1) so player stands in front
      this.players.push(p)

      const isLocalPlayer = !remoteIds.includes(i)
      if (isLocalPlayer) {
        const kbSlot = remoteIds.length > 0 ? 0 : i
        const kc = KEYBOARD_CONFIGS[kbSlot]
        if (kc && this.input.keyboard) {
          this.playerKeysets.set(i,
            Object.fromEntries(
              Object.entries(kc).map(([act, key]) => [act, this.input.keyboard!.addKey(key)]),
            ),
          )
        }
        if (i === this.localPlayerId && !this.touchControls && this.sys.game.device.input.touch) {
          this.touchControls = new TouchControls(this)
        }
      }

      const coneGfx = this.add.graphics().setDepth(7)
      this.inhaleGraphics.push(coneGfx)

      p.on('died', () => this.onPlayerDied(p))
      p.on('useAbility', (ability: AbilityType, src: Player) => this.fireAbility(ability, src))
      p.on('useMelee', (src: Player) => this.doMeleeSwing(src))
      p.on('heartLost', () => {})
    }
  }

  private wirePlayerUIEvents() {
    this.players.forEach((p, i) => {
      p.on('abilityChanged', (ability: AbilityType) => {
        const max = ABILITY_AMMO[ability]
        this.ui.initAbilityPips(i, max)
        this.ui.updateAmmo(i, max)
      })
      p.on('abilityAmmoChanged', (ammo: number) => this.ui.updateAmmo(i, ammo))
    })

    const persisted: { ability: AbilityType; ammo: number }[] | null = this.registry.get('persistedAbilities')
    if (persisted) {
      this.players.forEach((p, i) => {
        const pa = persisted[i]
        if (pa && pa.ability !== AbilityType.None && pa.ammo > 0) {
          p.currentAbility = pa.ability
          p.abilityAmmo = pa.ammo
          p.emit('abilityChanged', pa.ability)
          p.emit('abilityAmmoChanged', pa.ammo)
        }
      })
    }

    const persistedHearts: number[] | null = this.registry.get('persistedHearts')
    if (persistedHearts) {
      this.players.forEach((p, i) => {
        if (typeof persistedHearts[i] === 'number') {
          p.hearts = persistedHearts[i]
        }
      })
    }
  }

  private removeRemotePlayer(id: number) {
    const idx = this.players.findIndex(p => p.playerId === id)
    if (idx === -1) return
    const p = this.players[idx]
    p.destroy()
    const coneGfx = this.inhaleGraphics[idx]
    if (coneGfx) { coneGfx.destroy(); this.inhaleGraphics.splice(idx, 1) }
    this.players.splice(idx, 1)
    this.playerKeysets.delete(id)
    this.remoteInputs.delete(id)
    this.registry.set('playerCount', this.players.length)
    if (this.players.length === 0) this.time.delayedCall(500, () => this.gameOver())
  }

  // ── tilemap static bodies ───────────────────────────────────────────────────

  // Scans a tile layer and adds one Arcade static body per horizontal run of
  // solid tiles. This reliably stops players/enemies regardless of whether
  // Phaser's internal tilemap physics fires correctly.
  private addTileLayerBodies(
    layer: Phaser.Tilemaps.TilemapLayer,
    scale: number,
    ox: number,
    oy: number,
  ) {
    const tw = Math.round(layer.tilemap.tileWidth  * scale)
    const th = Math.round(layer.tilemap.tileHeight * scale)
    const cols = layer.layer.width
    const rows = layer.layer.height

    for (let r = 0; r < rows; r++) {
      let runStart = -1

      for (let c = 0; c <= cols; c++) {
        const tile   = c < cols ? layer.getTileAt(c, r) : null
        const solid  = tile !== null && tile.index >= 0

        if (solid && runStart === -1) {
          runStart = c
        } else if (!solid && runStart !== -1) {
          const runLen = c - runStart
          const wx = ox + runStart * tw + (runLen * tw) / 2
          const wy = oy + r * th + th / 2
          const zone = this.add.zone(wx, wy, runLen * tw, th)
          this.physics.add.existing(zone, true)
          this.platforms.add(zone as unknown as Phaser.Physics.Arcade.Image)
          runStart = -1
        }
      }
    }
  }

  // ── collision ───────────────────────────────────────────────────────────────

  private setupCollision() {
    this.players.forEach(p => this.physics.add.collider(p, this.platforms))

    // Breakable blocks — players and non-flying enemies stand on them
    this.players.forEach(p => this.destructibles.forEach(d => this.physics.add.collider(p, d)))
    this.enemies.forEach(e => { if (!e.flying) this.destructibles.forEach(d => this.physics.add.collider(e, d)) })

    this.crates.forEach(c => this.physics.add.collider(c, this.platforms))
    for (let i = 0; i < this.crates.length; i++)
      for (let j = i + 1; j < this.crates.length; j++)
        this.physics.add.collider(this.crates[i], this.crates[j])

    for (let i = 0; i < this.players.length; i++)
      for (let j = i + 1; j < this.players.length; j++)
        this.physics.add.collider(this.players[i], this.players[j])

    // Tilemap layer colliders (worldMap mode)
    this.tilemapLayers.forEach(layer => {
      this.players.forEach(p => this.physics.add.collider(p, layer))
      this.enemies.forEach(e => { if (!e.flying) this.physics.add.collider(e, layer) })
      this.crates.forEach(c => this.physics.add.collider(c, layer))
      if (this.boss) this.physics.add.collider(this.boss, layer)
    })

    // Per-enemy platform colliders — flying enemies are excluded
    this.enemies.forEach(e => {
      if (!e.flying) this.physics.add.collider(e, this.platforms)
    })
    if (this.boss) this.physics.add.collider(this.boss, this.platforms)

    // Player ↔ enemy group: swallow on contact while inhaling, damage otherwise
    this.players.forEach(p => {
      this.physics.add.collider(p, this.enemyGroup, (_p, _e) => {
        const player = _p as Player
        const enemy  = _e as Enemy
        if (player.inhaling && !player.hasInhaled) {
          player.swallowEnemy(enemy.abilityType)
          enemy.swallow()
          this.enemies = this.enemies.filter(x => x !== enemy)
          this.addScore(SCORE_ENEMY)
        } else {
          player.hitByEnemy()
        }
      })
    })

    // Boss colliders (separate from enemy group)
    if (this.boss) {
      this.physics.add.collider(this.boss, this.platforms)
      this.players.forEach(p => {
        this.physics.add.collider(p, this.boss!, (_p, _b) => {
          const player = _p as Player
          const boss   = _b as unknown as Boss
          if (player.inhaling && !player.hasInhaled) {
            SoundManager.bossHit()
            boss.hit()
          } else {
            player.hitByEnemy()
          }
        })
      })
    }

    this.physics.add.overlap(this.projectiles, this.platforms, (proj) => {
      ;(proj as Phaser.Physics.Arcade.Image).destroy()
    })

    // Enemy projectiles hit players
    this.players.forEach(p => {
      this.physics.add.overlap(p, this.enemyProjectiles, (_p, proj) => {
        ;(proj as Phaser.Physics.Arcade.Image).destroy()
        ;(_p as Player).hitByEnemy()
      })
    })
    this.physics.add.overlap(this.enemyProjectiles, this.platforms, (proj) => {
      ;(proj as Phaser.Physics.Arcade.Image).destroy()
    })
  }

  // ── abilities ───────────────────────────────────────────────────────────────

  private doMeleeSwing(src: Player) {
    SoundManager.meleeSwing()
    const dir = src.flipX ? -1 : 1
    const RANGE = 90, HEIGHT = 70
    const gfx = this.add.graphics().setDepth(12)
    gfx.lineStyle(4, 0xffffff, 0.85)
    gfx.strokeEllipse(src.x + dir * RANGE / 2, src.y, RANGE, HEIGHT)
    this.tweens.add({ targets: gfx, alpha: 0, duration: 220, onComplete: () => gfx.destroy() })

    this.enemies.forEach(e => {
      if (!e.active) return
      const dx = e.x - src.x, dy = Math.abs(e.y - src.y)
      if (dir * dx > 0 && dir * dx <= RANGE && dy <= HEIGHT) { e.hit(); this.addScore(SCORE_ENEMY) }
    })
    if (this.boss?.active) {
      const dx = this.boss.x - src.x, dy = Math.abs(this.boss.y - src.y)
      if (dir * dx > 0 && dir * dx <= RANGE && dy <= HEIGHT) this.boss.hit()
    }
    this.destructibles.forEach(d => {
      if (!d.active) return
      const dx = d.x - src.x, dy = Math.abs(d.y - src.y)
      if (dir * dx > 0 && dir * dx <= RANGE && dy <= HEIGHT) d.takeDamage(30, DamageType.Physical)
    })
  }

  private fireAbility(ability: AbilityType, src: Player) {
    switch (ability) {
      case AbilityType.Fire:     this.spawnFireball(src);   break
      case AbilityType.Electric: this.electricBurst(src);   break
      case AbilityType.Ice:      this.iceBlast(src);        break
    }
  }

  private spawnFireball(src: Player) {
    const dir = src.flipX ? -1 : 1
    const texKey = this.textures.exists('proj-fire') ? 'proj-fire' : 'fireball'
    const fb = this.physics.add.image(src.x + dir * 20, src.y, texKey)
    this.projectiles.add(fb)
    ;(fb.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * 650).setGravityY(-800)
    fb.setFlipX(dir < 0)
    this.tweens.add({ targets: fb, angle: fb.angle + 360, duration: 450, repeat: -1 })

    this.enemies.forEach(e => {
      this.physics.add.overlap(fb, e, () => { e.hit(); this.addScore(SCORE_ENEMY); fb.destroy() })
    })
    this.destructibles.forEach(d => {
      this.physics.add.overlap(fb, d, () => { d.takeDamage(50, DamageType.Fire); fb.destroy() })
    })
    if (this.boss?.active) {
      this.physics.add.overlap(fb, this.boss, () => { this.boss!.hit(); fb.destroy() })
    }
    this.time.delayedCall(2200, () => { if (fb.active) fb.destroy() })
  }


  private electricBurst(src: Player) {
    const dir = src.flipX ? -1 : 1
    const boltLen = 900
    const boltCx  = src.x + dir * boltLen / 2

    const bolt = this.add.rectangle(boltCx, src.y - 4, boltLen, 10, 0xffee00, 0.95).setDepth(15)
    const glow = this.add.rectangle(boltCx, src.y - 4, boltLen, 28, 0xffee00, 0.25).setDepth(14)
    this.cameras.main.flash(100, 255, 240, 80, false)
    this.tweens.add({ targets: [bolt, glow], alpha: 0, scaleY: 2, duration: 280,
      onComplete: () => { bolt.destroy(); glow.destroy() } })

    // Lightning instant-kills all enemies in the arc
    this.enemies.forEach(e => {
      if (!e.active) return
      if (dir * (e.x - src.x) > 0 && Math.abs(e.y - src.y) < 80) {
        e.die(); this.addScore(SCORE_ENEMY)
      }
    })
    if (this.boss?.active && dir * (this.boss.x - src.x) > 0 && Math.abs(this.boss.y - src.y) < 90) {
      SoundManager.bossHit()
      this.boss.hit()
      // Two follow-up hits spaced past the boss's invincibility window
      this.time.delayedCall(700,  () => { if (this.boss?.active) { SoundManager.bossHit(); this.boss!.hit() } })
      this.time.delayedCall(1400, () => { if (this.boss?.active) { SoundManager.bossHit(); this.boss!.hit() } })
    }
    this.destructibles.forEach(d => {
      if (dir * (d.x - src.x) > 0 && Math.abs(d.y - src.y) < 80) {
        d.takeDamage(150, DamageType.Electric)   // 3× fire's 50
      }
    })
  }

  private iceBlast(src: Player) {
    const dir = src.flipX ? -1 : 1
    const texKey = this.textures.exists('proj-ice') ? 'proj-ice' : 'fireball'
    const proj = this.physics.add.image(src.x + dir * 20, src.y, texKey)
    this.projectiles.add(proj)
    ;(proj.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * 600).setGravityY(-800)
    if (texKey === 'fireball') proj.setTint(0x66ccff).setScale(1.15)
    proj.setFlipX(dir < 0)
    this.tweens.add({ targets: proj, angle: proj.angle + 360, duration: 600, repeat: -1 })

    this.enemies.forEach(e => {
      this.physics.add.overlap(proj, e, () => { e.hit(); this.addScore(SCORE_ENEMY); proj.destroy() })
    })
    this.destructibles.forEach(d => {
      this.physics.add.overlap(proj, d, () => { d.takeDamage(50, DamageType.Physical); proj.destroy() })
    })
    if (this.boss?.active) {
      this.physics.add.overlap(proj, this.boss, () => { this.boss!.hit(); proj.destroy() })
    }
    this.time.delayedCall(2200, () => { if (proj.active) proj.destroy() })
  }

  private fireBossSpecial(ability: AbilityType) {
    if (!this.boss?.active) return
    const bx = this.boss.x
    const by = this.boss.y

    const alive = this.players.filter(p => p.isAlive)
    if (alive.length === 0) return
    const target = alive.reduce((a, b) =>
      Math.abs(a.x - bx) < Math.abs(b.x - bx) ? a : b)

    switch (ability) {

      case AbilityType.Fire: {
        // Fan of 5 fireballs aimed at the nearest player
        this.cameras.main.flash(80, 255, 80, 0, false)
        const baseAngle = Phaser.Math.Angle.Between(bx, by, target.x, target.y)
        const speed = 380
        const fireTexKey = this.textures.exists('proj-fire') ? 'proj-fire' : 'fireball'
        const offsets = [-0.5, -0.25, 0, 0.25, 0.5]
        offsets.forEach(offset => {
          const a = baseAngle + offset
          const proj = this.physics.add.image(bx, by + 20, fireTexKey)
          this.enemyProjectiles.add(proj)
          ;(proj.body as Phaser.Physics.Arcade.Body)
            .setVelocity(Math.cos(a) * speed, Math.sin(a) * speed)
            .setGravityY(-800)
          if (fireTexKey === 'fireball') proj.setTint(0xff4400).setScale(1.5)
          proj.setAngle(Phaser.Math.RadToDeg(a))
          this.tweens.add({ targets: proj, angle: proj.angle + 360, duration: 450, repeat: -1 })
          this.time.delayedCall(2600, () => { if (proj.active) proj.destroy() })
        })
        break
      }

      case AbilityType.Ice: {
        // 5 icicles falling straight down at positions spread around the player
        this.cameras.main.flash(80, 80, 160, 255, false)
        const iceTexKey = this.textures.exists('proj-ice') ? 'proj-ice' : 'fireball'
        for (let i = 0; i < 5; i++) {
          const spreadX = target.x + (i - 2) * 130
          const proj = this.physics.add.image(spreadX, by, iceTexKey)
          this.enemyProjectiles.add(proj)
          ;(proj.body as Phaser.Physics.Arcade.Body)
            .setVelocity(0, 440)
            .setGravityY(-800)
          if (iceTexKey === 'fireball') proj.setTint(0x66ccff).setScale(1.2)
          proj.setAngle(90)
          this.tweens.add({ targets: proj, angle: proj.angle + 360, duration: 600, repeat: -1 })
          this.time.delayedCall(3000, () => { if (proj.active) proj.destroy() })
        }
        break
      }

      case AbilityType.Electric: {
        // Horizontal lightning bolt at the player's height — damages but doesn't instant-kill
        const dir = target.x > bx ? 1 : -1
        const boltLen = 900
        const boltCx  = bx + dir * boltLen / 2
        const boltY   = target.y

        this.cameras.main.flash(100, 255, 240, 80, false)
        const bolt = this.add.rectangle(boltCx, boltY, boltLen, 10, 0xffee00, 0.95).setDepth(15)
        const glow = this.add.rectangle(boltCx, boltY, boltLen, 30, 0xffee00, 0.25).setDepth(14)
        this.tweens.add({
          targets: [bolt, glow], alpha: 0, scaleY: 2, duration: 350,
          onComplete: () => { bolt.destroy(); glow.destroy() },
        })

        this.players.forEach(p => {
          if (!p.isAlive) return
          if (dir * (p.x - bx) > 0 && Math.abs(p.y - boltY) < 48) p.hitByEnemy()
        })
        break
      }
    }
  }

  private spawnEnemyProjectile(enemy: Enemy) {
    const alive = this.players.filter(p => p.isAlive)
    if (alive.length === 0) return
    const target = alive.reduce((a, b) =>
      Math.abs(a.x - enemy.x) < Math.abs(b.x - enemy.x) ? a : b)
    const dir = target.x > enemy.x ? 1 : -1
    const speed = 320

    let gy = -800
    if (enemy.abilityType === AbilityType.Ice)      gy = 0
    if (enemy.abilityType === AbilityType.Electric) gy = -200

    const isIce  = enemy.abilityType === AbilityType.Ice
    const isFire = enemy.abilityType === AbilityType.Fire
    const texKey = isFire && this.textures.exists('proj-fire') ? 'proj-fire'
                 : isIce  && this.textures.exists('proj-ice')  ? 'proj-ice'
                 : 'fireball'

    const proj = this.physics.add.image(enemy.x + dir * 20, enemy.y, texKey)
    this.enemyProjectiles.add(proj)
    const body = proj.body as Phaser.Physics.Arcade.Body
    body.setVelocityX(dir * speed).setGravityY(gy)

    if (texKey === 'fireball') {
      if (isIce)  proj.setTint(0x66ccff)
      if (enemy.abilityType === AbilityType.Electric) proj.setTint(0xffdd00).setScale(1.4)
    }
    if (isFire || isIce) {
      proj.setFlipX(dir < 0)
      this.tweens.add({ targets: proj, angle: proj.angle + 360, duration: isFire ? 450 : 600, repeat: -1 })
    }

    this.time.delayedCall(2400, () => { if (proj.active) proj.destroy() })
  }

  private spawnAbilityDrop(x: number, y: number, _ability: AbilityType) {
    const orb = this.physics.add.image(x, y - 10, 'warp-star').setScale(0.35)
    ;(orb.body as Phaser.Physics.Arcade.Body).setVelocityY(-200)
    this.tweens.add({ targets: orb, alpha: 0, duration: 2000,
      onComplete: () => { if (orb.active) orb.destroy() } })
  }

  // ── inhale ───────────────────────────────────────────────────────────────────

  private checkInhale(p: Player) {
    if (p.hasInhaled) return

    // Block (destroy) enemy projectiles inside the inhale cone
    const inhaleDir = p.flipX ? -1 : 1
    ;(this.enemyProjectiles.getChildren() as Phaser.Physics.Arcade.Image[]).forEach(proj => {
      if (!proj.active) return
      const dx = proj.x - p.x
      const dy = Math.abs(proj.y - p.y)
      if (inhaleDir * dx > 0 && inhaleDir * dx <= p.inhaleRange() && dy < 55) proj.destroy()
    })

    for (const e of this.enemies) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y)
      if (dist <= p.inhaleRange()) {
        e.pullToward(p.x, p.y, Phaser.Math.Linear(200, INHALE_PULL_SPEED, 1 - dist / p.inhaleRange()))
      } else {
        e.stopPull()
      }
    }

    for (const other of this.players) {
      if (other === p) continue
      if (Phaser.Math.Distance.Between(p.x, p.y, other.x, other.y) <= p.inhaleRange()) {
        p.capturePlayer(other)
        return
      }
    }
  }

  // ── camera ──────────────────────────────────────────────────────────────────

  private setupCamera() {
    this.cameraTarget = this.add.rectangle(0, 0, 1, 1).setVisible(false)
    this.cameras.main.startFollow(this.cameraTarget, true, 0.08, 0.08)
  }

  // ── score / lives ────────────────────────────────────────────────────────────

  private addScore(pts: number) {
    this.score += pts
    this.registry.set('score', this.score)
  }

  private onPlayerDied(p: Player) {
    let lives: number = this.registry.get('lives') ?? 1
    lives--
    this.registry.set('lives', lives)

    if (lives <= 0) {
      this.time.delayedCall(800, () => this.gameOver())
      return
    }

    this.time.delayedCall(1500, () => {
      if (!p.active) return
      p.hearts = 3
      p.isAlive = true
      p.setAlpha(1)
      p.clearTint()
      p.setPosition(this.cameras.main.scrollX + 200, 620)
      ;(p.body as Phaser.Physics.Arcade.Body).setEnable(true)
    })
  }

  private gameOver() {
    this.registry.set('persistedAbilities', null)
    this.registry.set('persistedHearts', null)
    this.registry.set('runRooms', null)
    this.registry.set('runIndex', 0)
    this.registry.set('entryDir', null)
    this.cameras.main.fadeOut(800, 80, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene')
    })
  }

  private exitRoom(dir: ExitDir) {
    if (this.roomTransitioning) return
    if (!this.gm.isPlaying()) return
    // Boss room: sealed until boss is defeated
    if (this.cfg.isBossRoom && !this.bossDefeated) return

    this.roomTransitioning = true
    this.gm.pause()
    this.physics.world.isPaused = true
    this.registry.set('score', this.score)
    this.registry.set('persistedAbilities',
      this.players.map(p => ({ ability: p.currentAbility, ammo: p.abilityAmmo })))
    this.registry.set('persistedHearts',
      this.players.map(p => p.hearts))

    const runRooms: RoomConfig[] = this.registry.get('runRooms') ?? []
    const runIndex: number = this.registry.get('runIndex') ?? 0

    const goBack = (dir === 'left' || dir === 'bottom') && runIndex > 0
    const nextIndex = goBack ? runIndex - 1 : runIndex + 1

    // Past the last room = true win → go to victory screen
    if (nextIndex >= runRooms.length) {
      this.cameras.main.fadeOut(800, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'))
      return
    }

    this.registry.set('runIndex', nextIndex)
    this.registry.set('entryDir', OPPOSITE[dir])

    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }

  private winGame() {
    // Throne door → go to boss room (next index in run)
    this.exitRoom('right')
  }

  // ── input ─────────────────────────────────────────────────────────────────

  private handleKeyboard(p: Player, keys: Record<string, Phaser.Input.Keyboard.Key>) {
    if (!p.isAlive || p.isInhaled) return
    if (keys['left']?.isDown) p.moveLeft()
    else if (keys['right']?.isDown) p.moveRight()
    else p.stopHorizontal()

    if (keys['jump']?.isDown) p.jump()
    else p.jumpReleased()

    p.setInhaling(!!keys['inhale']?.isDown)
    if (Phaser.Input.Keyboard.JustDown(keys['ability'])) p.swingMelee()
  }

  private handleGamepad(p: Player, pad: Phaser.Input.Gamepad.Gamepad) {
    if (!p.isAlive || p.isInhaled) return
    const lx = pad.leftStick.x
    if (lx < -0.25 || pad.left) p.moveLeft()
    else if (lx > 0.25 || pad.right) p.moveRight()
    else p.stopHorizontal()

    if (pad.A) p.jump()
    else p.jumpReleased()

    p.setInhaling(pad.buttons[3]?.pressed ?? false)
  }

  private handleRemoteInput(p: Player, ri: RemoteInput) {
    if (!p.isAlive || p.isInhaled) return
    if (ri.left)        p.moveLeft()
    else if (ri.right)  p.moveRight()
    else                p.stopHorizontal()

    if (ri.jump) p.jump()
    else         p.jumpReleased()

    p.setInhaling(ri.inhale)
    if (ri.ability) p.swingMelee()
  }

  private setupGamepadEvents() {
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        // Start button (9) always toggles pause regardless of player state
        if (button.index === 9) { this.togglePause(); return }

        // D-pad navigates pause menu when paused
        if (!this.gm.isPlaying()) {
          if (button.index === 12) { this.movePauseFocus(-1); return }
          if (button.index === 13) { this.movePauseFocus(1);  return }
          if (button.index === 0)  { this.pauseItems[this.pauseFocusIdx]?.action(); return }
        }

        const player = this.players.find((_, i) => this.input.gamepad?.getPad(i) === pad)
        if (!player || !player.isAlive || player.isInhaled) return
        if (button.index === 1) player.useAbility()
        if (button.index === 2) player.swingMelee()
        // D-pad up (12) near throne door — same as pressing Up on keyboard
        if (button.index === 12 && this.cfg.isThrone) {
          const nearDoor = Math.abs(player.x - this.throneX) < 70
          if (nearDoor) this.winGame()
        }
        if (button.index === 12 && this.bossPortalPos) {
          const nearPortal = Phaser.Math.Distance.Between(player.x, player.y, this.bossPortalPos.x, this.bossPortalPos.y) < 90
          if (nearPortal) this.winGame()
        }
      },
    )
  }

  // ── pause menu ────────────────────────────────────────────────────────────

  private buildPauseMenu() {
    const { width, height } = this.scale

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setScrollFactor(0)

    const title = this.add.text(width / 2, height * 0.32, 'PAUSED', {
      fontSize: '32px', fontFamily: FONT, color: '#ffe066',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0)

    const resume  = this.pauseBtn(width / 2, height * 0.50, '▶  RESUME')
    const toMenu  = this.pauseBtn(width / 2, height * 0.63, '⌂  MAIN MENU')
    const escHint = this.add.text(width / 2, height * 0.77, 'ESC / Start to toggle', {
      fontSize: '9px', fontFamily: FONT, color: '#556677',
    }).setOrigin(0.5).setScrollFactor(0)

    const resumeAction = () => this.togglePause()
    const menuAction   = () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'))
    }
    resume.on('pointerdown', resumeAction)
    toMenu.on('pointerdown', menuAction)

    this.pauseContainer = this.add.container(0, 0, [overlay, title, resume, toMenu, escHint])
      .setDepth(100).setVisible(false)

    this.pauseItems = [
      { text: resume, action: resumeAction },
      { text: toMenu, action: menuAction   },
    ]

    // Cursor lives outside the container so it can move freely
    this.pauseCursor = this.add.text(0, 0, '►', {
      fontSize: '16px', fontFamily: FONT, color: '#ffe066',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(200).setVisible(false)
  }

  private pauseBtn(x: number, y: number, label: string): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: '16px', fontFamily: FONT, color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000055', padding: { x: 22, y: 12 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setColor('#ffe066'))
    btn.on('pointerout',  () => btn.setColor('#ffffff'))
    return btn
  }

  private togglePause() {
    const nowPaused = this.gm.isPlaying()
    if (nowPaused) this.gm.pause()
    else this.gm.resume()
    this.pauseContainer.setVisible(nowPaused)
    this.physics.world.isPaused = nowPaused
    // Reset cursor when closing pause
    if (!nowPaused && this.pauseCursor) this.pauseCursor.setVisible(false)
  }

  private movePauseFocus(dir: number) {
    const len = this.pauseItems.length
    if (!len || !this.pauseCursor) return
    this.pauseFocusIdx = (this.pauseFocusIdx + dir + len) % len
    const b = this.pauseItems[this.pauseFocusIdx].text.getBounds()
    this.pauseCursor.setPosition(b.left - 12, b.centerY).setVisible(true)
  }

  // ── inhale cone ───────────────────────────────────────────────────────────

  private drawInhaleCone(g: Phaser.GameObjects.Graphics, p: Player) {
    const t    = this.time.now
    const dir  = p.flipX ? -1 : 1
    const ox   = p.x
    const oy   = p.y
    const len  = p.inhaleRange()

    const a1 = 0.13 + 0.07 * Math.sin(t / 110)
    g.fillStyle(0x55ddff, a1)
    g.fillTriangle(ox, oy, ox + dir * len, oy - 72, ox + dir * len, oy + 72)

    const a2 = 0.28 + 0.12 * Math.sin(t / 80 + Math.PI)
    g.fillStyle(0xaaf0ff, a2)
    g.fillTriangle(ox, oy, ox + dir * len, oy - 36, ox + dir * len, oy + 36)

    for (let i = 0; i < 4; i++) {
      const phase  = ((t / 380) + i * 0.25) % 1
      const dist   = len * (1 - phase)
      const spread = 50 * (1 - phase * 0.65)
      const alpha  = 0.65 * Math.sin(phase * Math.PI)
      const sx     = ox + dir * dist
      g.lineStyle(2, 0xffffff, alpha)
      g.lineBetween(sx, oy - spread, sx, oy + spread)
    }
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(_t: number, _dt: number) {
    if (!this.gm.isPlaying()) return

    const sx = this.cameras.main.scrollX
    if (this.bgLayers[0]) this.bgLayers[0].tilePositionX = sx * 0.05
    if (this.bgLayers[1]) this.bgLayers[1].tilePositionX = sx * 0.18

    if (this.players.length > 0) {
      const alive = this.players.filter(p => p.isAlive)
      if (alive.length > 0) {
        const ax = alive.reduce((s, p) => s + p.x, 0) / alive.length
        const ay = alive.reduce((s, p) => s + p.y, 0) / alive.length
        this.cameraTarget.setPosition(ax, ay)
      }
    }

    this.players.forEach((p, i) => {
      p.update()

      const coneGfx = this.inhaleGraphics[i]
      if (coneGfx) {
        coneGfx.clear()
        if (p.isAlive && p.inhaling && !p.hasInhaled && !p.isInhaled) {
          this.drawInhaleCone(coneGfx, p)
        }
      }

      const remoteIds: number[] = this.registry.get('remotePlayers') ?? []
      const isRemote = remoteIds.includes(p.playerId)

      if (isRemote) {
        const ri = this.remoteInputs.get(p.playerId)
        if (ri) this.handleRemoteInput(p, ri)
      } else {
        const pad = this.input.gamepad?.getPad(this.nm ? 0 : p.playerId)
        if (pad?.connected) {
          this.handleGamepad(p, pad)
        } else {
          const keys = this.playerKeysets.get(p.playerId)
          if (keys) this.handleKeyboard(p, keys)
          if (this.touchControls) this.touchControls.apply(p)
        }

        if (this.nm) {
          const pad2 = this.input.gamepad?.getPad(0)
          const keys = this.playerKeysets.get(p.playerId)
          this.nm.sendInput({
            left:    !!(pad2?.connected ? (pad2.leftStick.x < -0.25 || pad2.left) : keys?.['left']?.isDown),
            right:   !!(pad2?.connected ? (pad2.leftStick.x >  0.25 || pad2.right) : keys?.['right']?.isDown),
            jump:    !!(pad2?.connected ? pad2.A : keys?.['jump']?.isDown),
            inhale:  !!(pad2?.connected ? (pad2.buttons[3]?.pressed) : keys?.['inhale']?.isDown),
            ability: !!(pad2?.connected ? pad2.buttons[1]?.pressed : keys?.['ability']?.isDown),
          })
        }
      }

      if (p.inhaling) this.checkInhale(p)
      else this.enemies.forEach(e => e.stopPull())

      // Exit boundary detection (all modes except continuous worldMap)
      const remoteIds2: number[] = this.registry.get('remotePlayers') ?? []
      const isLocalPlayer = !remoteIds2.includes(p.playerId)
      const isContinuousWorld = !!this.cfg.worldMap && !this.cfg.worldMap.section
      if (isLocalPlayer && !this.roomTransitioning && p.isAlive && !isContinuousWorld) {
        const W = this.cfg.worldWidth
        const exits = this.cfg.exits
        const ep2 = this.cfg.exitPositions ?? {}
        if (p.x < 0   && exits.includes('left')   && Math.abs(p.y - (ep2.left   ?? 640))   < DOOR_H / 2) { this.exitRoom('left');   return }
        if (p.x > W   && exits.includes('right')  && Math.abs(p.y - (ep2.right  ?? 640))   < DOOR_H / 2) { this.exitRoom('right');  return }
        if (p.y < 0   && exits.includes('top')    && Math.abs(p.x - (ep2.top    ?? W / 2)) < DOOR_W / 2) { this.exitRoom('top');    return }
        if (p.y > 740 && exits.includes('bottom') && Math.abs(p.x - (ep2.bottom ?? W / 2)) < DOOR_W / 2) { this.exitRoom('bottom'); return }
      }

      // Throne room: press Up near the door (keyboard or gamepad)
      if (this.cfg.isThrone && isLocalPlayer && p.isAlive) {
        const jumpKey = this.playerKeysets.get(p.playerId)?.['jump']
        const nearDoor = Math.abs(p.x - this.throneX) < 70
        this.throneLabel?.setVisible(nearDoor)
        if (nearDoor && jumpKey && Phaser.Input.Keyboard.JustDown(jumpKey)) this.winGame()
      }

      if (this.bossPortalPos && isLocalPlayer && p.isAlive && !this.roomTransitioning) {
        const nearPortal = Phaser.Math.Distance.Between(p.x, p.y, this.bossPortalPos.x, this.bossPortalPos.y) < 90
        this.portalLabel?.setVisible(nearPortal)
        const jumpKey = this.playerKeysets.get(p.playerId)?.['jump']
        if (nearPortal && jumpKey && Phaser.Input.Keyboard.JustDown(jumpKey)) this.winGame()
      }
    })

    // Collectibles
    this.collectibleSprites = this.collectibleSprites.filter(img => {
      if (!img.active) return false
      for (const p of this.players) {
        if (p.isAlive && Phaser.Math.Distance.Between(p.x, p.y, img.x, img.y) < 32) {
          this.collectItem(p, img.getData('item') as ItemSpawn)
          ;(img.getData('ring') as Phaser.GameObjects.Arc | undefined)?.destroy()
          img.destroy()
          return false
        }
      }
      return true
    })

    // Enemies
    this.enemies = this.enemies.filter(e => e.active)
    this.enemies.forEach(e => {
      e.update()
      if (e.tryAttack(_dt)) this.spawnEnemyProjectile(e)
    })

    // Boss
    if (this.boss?.active) {
      this.boss.players = this.players
      this.boss.update()
    }

    this.ui.update(this.players)

    // Debug: log first player position every 2 seconds
    this._debugLogTimer += _dt
    if (this._debugLogTimer >= 2000) {
      this._debugLogTimer = 0
      const p0 = this.players[0]
      if (p0?.isAlive) console.log(`[pos] x=${Math.round(p0.x)} y=${Math.round(p0.y)}`)
    }

    // Hide/show touch controls when a gamepad is connected or disconnected
    if (this.touchControls) {
      const padConnected = this.input.gamepad?.gamepads.some(p => p?.connected) ?? false
      if (padConnected !== this._lastPadConnected) {
        this._lastPadConnected = padConnected
        this.touchControls.setEnabled(!padConnected)
      }
    }
  }
}
