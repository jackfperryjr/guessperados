import Phaser from 'phaser'
import { Player } from '../game/Player'
import { Enemy } from '../game/Enemy'
import { Destructible } from '../game/Destructible'
import { GameManager } from '../game/GameManager'
import { UIManager } from '../ui/UIManager'
import { TouchControls } from '../ui/TouchControls'
import { LEVELS, LevelConfig } from '../levels'
import { AbilityType, DamageType } from '../types'
import { ItemSpawn } from '../levels'
import { ABILITY_COLORS } from '../ui/UIManager'
import { NetworkManager, RemoteInput } from '../network/NetworkManager'

const FONT = '"Press Start 2P", monospace'
const INHALE_PULL_SPEED = 400
const SCORE_ENEMY = 200
const SCORE_DESTRUCT = 100

// Keyboard slots — only first two slots used; P2/P3 require gamepads or network
const KEYBOARD_CONFIGS: Record<string, string>[] = [
  { left: 'A',    right: 'D',     jump: 'W',  inhale: 'Z', ability: 'X' },
  { left: 'LEFT', right: 'RIGHT', jump: 'UP', inhale: 'K', ability: 'L' },
]

export class GameScene extends Phaser.Scene {
  private cfg!: LevelConfig
  private gm!: GameManager
  private ui!: UIManager

  private players: Player[] = []
  private enemies: Enemy[] = []
  private destructibles: Destructible[] = []
  private crates: Phaser.Physics.Arcade.Image[] = []
  private projectiles!: Phaser.Physics.Arcade.Group

  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private cameraTarget!: Phaser.GameObjects.Rectangle
  private bgLayers: Phaser.GameObjects.TileSprite[] = []
  private goalSprite!: Phaser.Physics.Arcade.Image

  private collectibleSprites: Phaser.GameObjects.Image[] = []
  private inhaleGraphics: Phaser.GameObjects.Graphics[] = []

  private playerKeysets = new Map<number, Record<string, Phaser.Input.Keyboard.Key>>()
  private touchControls: TouchControls | null = null
  private pauseContainer!: Phaser.GameObjects.Container
  private score = 0

  private nm: NetworkManager | null = null
  private localPlayerId = 0
  private remoteInputs = new Map<number, RemoteInput>()

  constructor() { super({ key: 'GameScene' }) }

  init() {
    this.players = []; this.enemies = []; this.destructibles = []
    this.crates = []; this.bgLayers = []; this.collectibleSprites = []; this.inhaleGraphics = []
    this.playerKeysets.clear(); this.touchControls = null
    this.remoteInputs.clear()
    this.nm = null
    this.score = 0
  }

  create() {
    const levelId: number = this.registry.get('currentLevel') ?? 1
    this.cfg = LEVELS[levelId - 1]
    this.score = this.registry.get('score') ?? 0

    this.gm = new GameManager()

    // Network — may be null for local-only play
    this.nm = this.registry.get('networkManager') ?? null
    this.localPlayerId = this.registry.get('localPlayerId') ?? 0
    if (this.nm) {
      this.nm.onRemoteInput = (id, input) => this.remoteInputs.set(id, input)
      this.nm.onPlayerLeft  = (id) => this.removeRemotePlayer(id)
    }

    // World bounds
    this.physics.world.setBounds(0, 0, this.cfg.worldWidth, 720)
    this.cameras.main.setBounds(0, 0, this.cfg.worldWidth, 720)
    this.cameras.main.setRoundPixels(true)

    this.buildBackground()
    this.buildScenery()
    this.buildLevel()
    this.setupCollectibles()
    this.spawnPlayers()
    this.setupCollision()
    this.setupGamepadEvents()
    this.setupCamera()

    this.ui = new UIManager(this, this.registry.get('playerCount') ?? 1)
    this.buildPauseMenu()

    // ESC toggles pause
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause())

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0)
  }

  // ── background ──────────────────────────────────────────────────────────────

  private buildBackground() {
    const { width, height } = this.scale
    const cx = width / 2, cy = height / 2

    // Two parallax layers (both scroll slower than camera, giving depth)
    this.bgLayers.push(
      this.add.tileSprite(cx, cy, width, height, this.cfg.bgFar).setScrollFactor(0),
      this.add.tileSprite(cx, cy, width, height, this.cfg.bgMid)
        .setScrollFactor(0).setAlpha(0.75)
    )

    // Level 3: lava glow rising from pit floor
    if (this.cfg.id === 3) {
      const glow = this.add.rectangle(
        this.cfg.worldWidth / 2, 730, this.cfg.worldWidth, 80, 0xff3300, 0.18
      ).setScrollFactor(1)
      this.tweens.add({ targets: glow, alpha: 0.32, duration: 1200, yoyo: true, repeat: -1 })
    }
  }

  // ── scenery ──────────────────────────────────────────────────────────────────

  private buildScenery() {
    if (this.cfg.id === 1) this.buildSceneryStation()
    else if (this.cfg.id === 2) this.buildSceneryAsteroid()
    else this.buildSceneryCore()
  }

  private buildSceneryStation() {
    const w = this.cfg.worldWidth

    // Horizontal girders strung across the level at varying heights
    const girderYs = [180, 240, 160, 210, 190, 170, 200, 220]
    for (let i = 0; i < 8; i++) {
      const x = 200 + i * (w / 8)
      this.add.image(x, girderYs[i], 'scn-girder').setAlpha(0.55).setDepth(2)
    }

    // Vertical struts between girders and ceiling
    const strutXs = [120, 460, 880, 1320, 1750, 2200, 2650, 3100, 3550, 3900]
    for (const sx of strutXs) {
      this.add.image(sx, 110, 'scn-strut-v').setAlpha(0.5).setDepth(2)
    }

    // Porthole viewports — show deep space through the station walls
    const viewportData = [
      {x:300,y:220},{x:750,y:180},{x:1100,y:230},{x:1600,y:200},
      {x:2050,y:210},{x:2500,y:185},{x:2950,y:220},{x:3400,y:195},{x:3800,y:215},
    ]
    for (const {x, y} of viewportData) {
      const vp = this.add.image(x, y, 'scn-viewport').setAlpha(0.8).setDepth(3)
      // Slow pulse on the glass glow
      this.tweens.add({ targets: vp, alpha: 0.55, duration: 2200 + x % 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    // Equipment panels — mounted on walls
    const panelData = [
      {x:520,y:290},{x:1050,y:260},{x:1780,y:280},{x:2350,y:270},
      {x:2850,y:265},{x:3300,y:280},{x:3750,y:270},
    ]
    for (const {x, y} of panelData) {
      this.add.image(x, y, 'scn-panel').setAlpha(0.7).setDepth(3)
      // Blink the panel lights
      const blink = this.add.rectangle(x + 18, y - 10, 6, 6, 0x00e676)
        .setAlpha(0.9).setDepth(4)
      this.tweens.add({ targets: blink, alpha: 0.1, duration: 400 + (x % 600),
        yoyo: true, repeat: -1 })
    }

    // Satellite dishes on upper platforms
    const antennaData = [{x:820,y:290},{x:1680,y:310},{x:2700,y:300},{x:3600,y:290}]
    for (const {x, y} of antennaData) {
      this.add.image(x, y, 'scn-antenna').setAlpha(0.65).setDepth(3)
    }

    // Warning stripes along the floor near hazards
    const warnXs = [500, 1150, 1900, 2500, 3050, 3700]
    for (const wx of warnXs) {
      this.add.image(wx, 682, 'scn-warning').setAlpha(0.6).setDepth(2)
    }
  }

  private buildSceneryAsteroid() {
    const w = this.cfg.worldWidth

    // Large drifting asteroids in far background
    const lgData = [
      {x:350,y:160,s:1.2,a:0.5},{x:900,y:120,s:0.9,a:0.45},{x:1500,y:180,s:1.4,a:0.4},
      {x:2100,y:140,s:1.0,a:0.5},{x:2700,y:110,s:1.3,a:0.45},{x:3300,y:160,s:0.8,a:0.4},
      {x:3900,y:130,s:1.1,a:0.5},{x:4500,y:155,s:1.2,a:0.4},
    ]
    for (const {x, y, s, a} of lgData) {
      const ast = this.add.image(x, y, 'scn-asteroid-lg').setScale(s).setAlpha(a).setDepth(2)
      // Slow rotation tween
      this.tweens.add({ targets: ast, rotation: Math.PI * 2,
        duration: 18000 + (x % 8000), repeat: -1, ease: 'Linear' })
    }

    // Small asteroids — closer, more visible
    const smCount = 18
    for (let i = 0; i < smCount; i++) {
      const x = 150 + i * (w / smCount)
      const y = 80 + (i % 5) * 60
      const ast = this.add.image(x, y, 'scn-asteroid-sm')
        .setAlpha(0.65).setScale(0.7 + (i % 4) * 0.15).setDepth(3)
      this.tweens.add({ targets: ast, rotation: Math.PI * 2,
        duration: 10000 + (i * 1500), repeat: -1, ease: 'Linear' })
    }

    // Rocky spires rising from floor (decorative, behind platforms)
    const spireXs = [200, 600, 1100, 1800, 2400, 3000, 3600, 4200, 4700]
    for (const sx of spireXs) {
      this.add.image(sx, 648, 'scn-rock-spire').setOrigin(0.5, 1).setAlpha(0.6).setDepth(2)
    }

    // Floating debris chunks drifting across the level
    const debrisData = [
      {x:400,y:320},{x:850,y:260},{x:1400,y:300},{x:1900,y:240},
      {x:2500,y:280},{x:3100,y:250},{x:3700,y:300},{x:4300,y:270},
    ]
    for (const {x, y} of debrisData) {
      const db = this.add.image(x, y, 'scn-debris').setAlpha(0.7).setDepth(3)
      this.tweens.add({ targets: db, rotation: Math.PI * 2,
        duration: 6000 + (x % 4000), repeat: -1, ease: 'Linear' })
    }
  }

  private buildSceneryCore() {
    const w = this.cfg.worldWidth

    // Crystal clusters rising from floor
    const clusterXs = [250, 700, 1300, 1900, 2600, 3200, 3900, 4600, 5300]
    for (const cx of clusterXs) {
      this.add.image(cx, 680, 'scn-crystal-cluster').setOrigin(0.5, 1).setAlpha(0.7).setDepth(3)
      // Glow pulse
      const glow = this.add.rectangle(cx, 650, 80, 40, 0x1565c0, 0.15).setDepth(2)
      this.tweens.add({ targets: glow, alpha: 0.04, duration: 1600 + cx % 800,
        yoyo: true, repeat: -1 })
    }

    // Tall single crystals — above ground level
    const tallData = [
      {x:450,y:490},{x:1050,y:440},{x:1650,y:450},{x:2250,y:420},
      {x:2900,y:480},{x:3500,y:430},{x:4100,y:460},{x:4800,y:440},{x:5500,y:470},
    ]
    for (const {x, y} of tallData) {
      const tint = [0x1565c0, 0x4527a0, 0x6a1b9a][Math.floor(x / 2000) % 3]
      this.add.image(x, y, 'scn-crystal-lg').setOrigin(0.5, 1).setTint(tint)
        .setAlpha(0.65).setDepth(3)
    }

    // Short crystals scattered around
    const shortCount = 20
    for (let i = 0; i < shortCount; i++) {
      const x = 120 + i * (w / shortCount)
      const y = 540 + (i % 4) * 30
      const tint = [0x311b92, 0x1a237e, 0x4a148c][i % 3]
      this.add.image(x, y, 'scn-crystal-sm').setOrigin(0.5, 1).setTint(tint)
        .setAlpha(0.55).setDepth(2)
    }

    // Stalactites hanging from ceiling
    const stalData = [
      {x:300,y:0},{x:650,y:0},{x:1000,y:0},{x:1400,y:0},{x:1800,y:0},
      {x:2200,y:0},{x:2600,y:0},{x:3000,y:0},{x:3500,y:0},{x:4000,y:0},
      {x:4500,y:0},{x:5000,y:0},{x:5500,y:0},
    ]
    for (const {x} of stalData) {
      const h = 40 + (x % 60)
      this.add.image(x, 0, 'scn-stalactite').setOrigin(0.5, 0)
        .setDisplaySize(24, h).setAlpha(0.7).setDepth(3)
    }

    // Lava pools on the floor between sections
    const lavaXs = [550, 1200, 1850, 2500, 3150, 3800, 4450, 5100]
    for (const lx of lavaXs) {
      const pool = this.add.image(lx, 686, 'scn-lava-pool').setAlpha(0.85).setDepth(3)
      this.tweens.add({ targets: pool, alpha: 0.6, duration: 800 + lx % 600,
        yoyo: true, repeat: -1 })
    }

    // Heat vents along floor
    const ventXs = [400, 900, 1550, 2100, 2800, 3400, 4050, 4700, 5350]
    for (const vx of ventXs) {
      this.add.image(vx, 672, 'scn-vent').setAlpha(0.8).setDepth(3)
    }
  }

  // ── collectibles ──────────────────────────────────────────────────────────────

  private setupCollectibles() {
    for (const item of this.cfg.items) {
      const tex = item.type === 'heart' ? 'item-heart'
                : item.type === 'life'  ? 'item-life'
                : 'item-orb'
      const img = this.add.image(item.x, item.y, tex).setDepth(8).setScale(1.2)
      img.setData('item', item)

      if (item.type === 'ability') {
        img.setTint(ABILITY_COLORS[item.ability ?? AbilityType.None])
      }

      // Bob up and down
      this.tweens.add({
        targets: img, y: item.y - 12,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      })
      // Slow spin
      this.tweens.add({
        targets: img, rotation: Math.PI * 2,
        duration: 3200, repeat: -1, ease: 'Linear',
      })
      this.collectibleSprites.push(img)
    }
  }

  private collectItem(player: Player, item: ItemSpawn) {
    if (item.type === 'heart') {
      player.hearts = Math.min(3, player.hearts + 1)
      this.showPopup(item.x, item.y, '+HEART', '#ff4d6a')
    } else if (item.type === 'life') {
      const lives: number = (this.registry.get('lives') ?? 1) + 1
      this.registry.set('lives', lives)
      this.showPopup(item.x, item.y, '1-UP!', '#ffe066')
    } else if (item.type === 'ability') {
      const ab = item.ability ?? AbilityType.None
      player.currentAbility = ab
      player.emit('abilityChanged', ab)
      this.showPopup(item.x, item.y, AbilityType[ab].toUpperCase() + '!', '#aaffaa')
    }
    this.addScore(500)
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

    // Platforms
    for (const p of this.cfg.platforms) {
      const tile = this.add.tileSprite(p.x, p.y, p.w, p.h, this.cfg.tileset)
      this.physics.add.existing(tile, true)
      this.platforms.add(tile)
    }

    // Destructibles
    for (const d of this.cfg.destructibles) {
      const dest = new Destructible(this, d.x, d.y, d.health, d.ability, d.resistances ?? {})
      dest.setDisplaySize(d.w, d.h)
      this.destructibles.push(dest)
      dest.on('destroyed', (obj: Destructible) => {
        this.destructibles = this.destructibles.filter(x => x !== obj)
        this.addScore(SCORE_DESTRUCT)
        // Drop ability orb if it has one
        if (obj.abilityDrop !== AbilityType.None) this.spawnAbilityDrop(obj.x, obj.y, obj.abilityDrop)
      })
    }

    // Crates (dynamic physics)
    for (const c of this.cfg.crates) {
      const crate = this.physics.add.image(c.x, c.y, 'crate')
      ;(crate.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true)
      crate.setDisplaySize(32, 32)
      this.crates.push(crate)
    }

    // Enemies
    for (const e of this.cfg.enemies) {
      const enemy = new Enemy(this, e.x, e.y, e.ability)
      this.enemies.push(enemy)
    }

    // Goal — space portal
    this.goalSprite = this.physics.add.staticImage(this.cfg.goalX, 644, 'goal-portal')
    this.tweens.add({ targets: this.goalSprite, rotation: Math.PI * 2, duration: 2800, repeat: -1, ease: 'Linear' })
    this.tweens.add({ targets: this.goalSprite, scale: 1.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // Goal label
    this.add.text(this.cfg.goalX, 608, '↓ PORTAL', {
      fontSize: '8px', fontFamily: FONT, color: '#40c4ff',
    }).setOrigin(0.5)
  }

  // ── players ─────────────────────────────────────────────────────────────────

  private spawnPlayers() {
    const count: number = this.registry.get('playerCount') ?? 1
    const remoteIds: number[] = this.registry.get('remotePlayers') ?? []

    for (let i = 0; i < count; i++) {
      const p = new Player(this, 100 + i * 70, 620, i)
      this.players.push(p)

      const isLocalPlayer = !remoteIds.includes(i)
      if (isLocalPlayer) {
        // In online mode the local player may not be slot 0, so keyboard slot is always the
        // first available keyboard config regardless of player ID.
        const kbSlot = remoteIds.length > 0 ? 0 : i
        const kc = KEYBOARD_CONFIGS[kbSlot]
        if (kc && this.input.keyboard) {
          this.playerKeysets.set(i,
            Object.fromEntries(
              Object.entries(kc).map(([act, key]) => [act, this.input.keyboard!.addKey(key)])
            )
          )
        }
        if (i === this.localPlayerId && !this.touchControls && this.input.pointer1.active) {
          this.touchControls = new TouchControls(this)
        }
      }

      const coneGfx = this.add.graphics().setDepth(7)
      this.inhaleGraphics.push(coneGfx)

      p.on('died', () => this.onPlayerDied(p))
      p.on('useAbility', (ability: AbilityType, src: Player) => this.fireAbility(ability, src))
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

  // ── collision ───────────────────────────────────────────────────────────────

  private setupCollision() {
    // Players on platforms
    this.players.forEach(p => this.physics.add.collider(p, this.platforms))

    // Crates on platforms + with each other
    this.crates.forEach(c => this.physics.add.collider(c, this.platforms))
    for (let i = 0; i < this.crates.length; i++)
      for (let j = i + 1; j < this.crates.length; j++)
        this.physics.add.collider(this.crates[i], this.crates[j])

    // Players collide with each other
    for (let i = 0; i < this.players.length; i++)
      for (let j = i + 1; j < this.players.length; j++)
        this.physics.add.collider(this.players[i], this.players[j])

    // Enemies on platforms
    this.enemies.forEach(e => this.physics.add.collider(e, this.platforms))

    // Player ↔ enemy: swallow on contact while inhaling, damage otherwise.
    this.players.forEach(p => {
      this.enemies.forEach(e => {
        this.physics.add.collider(p, e, (_p, _e) => {
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
    })

    // Projectiles hit destructibles, enemies, crates
    this.physics.add.overlap(this.projectiles, this.platforms, (proj) => {
      ;(proj as Phaser.Physics.Arcade.Image).destroy()
    })
  }

  // ── abilities ───────────────────────────────────────────────────────────────

  private fireAbility(ability: AbilityType, src: Player) {
    switch (ability) {
      case AbilityType.Fire:     this.spawnFireball(src);   break
      case AbilityType.Bomb:     this.placeBomb(src);       break
      case AbilityType.Electric: this.electricBurst(src);   break
      case AbilityType.Ice:      this.iceBlast(src);        break
    }
  }

  private spawnFireball(src: Player) {
    const dir = src.flipX ? -1 : 1
    const fb = this.physics.add.image(src.x + dir * 20, src.y, 'fireball')
    this.projectiles.add(fb)
    ;(fb.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * 650).setGravityY(-800)

    this.enemies.forEach(e => {
      this.physics.add.overlap(fb, e, () => { e.die(); this.addScore(SCORE_ENEMY); fb.destroy() })
    })
    this.destructibles.forEach(d => {
      this.physics.add.overlap(fb, d, () => { d.takeDamage(50, DamageType.Fire); fb.destroy() })
    })
    this.time.delayedCall(2200, () => { if (fb.active) fb.destroy() })
  }

  private placeBomb(src: Player) {
    const bomb = this.add.image(src.x, src.y, 'bomb')
    this.time.delayedCall(2500, () => {
      this.cameras.main.shake(280, 0.009)
      this.explodeAt(src.x, src.y, 130)
      bomb.destroy()
    })
  }

  private explodeAt(x: number, y: number, r: number) {
    this.enemies.forEach(e => {
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r) {
        e.die(); this.addScore(SCORE_ENEMY)
      }
    })
    this.destructibles.forEach(d => {
      if (Phaser.Math.Distance.Between(x, y, d.x, d.y) <= r)
        d.takeDamage(80, DamageType.Explosion)
    })
    this.players.forEach(p => {
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= r) p.stun(1000)
    })
  }

  private electricBurst(src: Player) {
    const r = 170
    this.enemies.forEach(e => {
      if (Phaser.Math.Distance.Between(src.x, src.y, e.x, e.y) <= r) {
        e.stun(2000)
        ;(e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
        e.setTint(0xffff00)
        this.time.delayedCall(2000, () => { if (e.active) e.clearTint() })
      }
    })
  }

  private iceBlast(src: Player) {
    const dir = src.flipX ? -1 : 1
    const blast = this.add.rectangle(src.x + dir * 60, src.y, 120, 40, 0x66ccff, 0.7)
    this.time.delayedCall(400, () => blast.destroy())
    this.enemies.forEach(e => {
      if (Math.abs(e.x - src.x) < 150 && Math.abs(e.y - src.y) < 40) {
        e.setTint(0xaaddff)
        ;(e.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * -200)
        this.time.delayedCall(1800, () => { if (e.active) e.clearTint() })
      }
    })
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

    // Pull enemies toward player — swallow fires in the physics collider callback on contact
    for (const e of this.enemies) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y)
      if (dist <= p.inhaleRange()) {
        e.pullToward(p.x, p.y, Phaser.Math.Linear(200, INHALE_PULL_SPEED, 1 - dist / p.inhaleRange()))
      } else {
        e.stopPull()
      }
    }

    // Check crates
    for (const c of this.crates) {
      if (Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 50) {
        p.captureSpriteObject(c as unknown as Phaser.Physics.Arcade.Sprite)
        this.crates = this.crates.filter(x => x !== c)
        return
      }
    }

    // Check other players
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
    this.ui.setScore(this.score)
  }

  private onPlayerDied(p: Player) {
    let lives: number = this.registry.get('lives') ?? 1
    lives--
    this.registry.set('lives', lives)

    if (lives <= 0) {
      this.time.delayedCall(800, () => this.gameOver())
      return
    }

    // Respawn after 1.5 s
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
    this.cameras.main.fadeOut(600, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.registry.set('currentLevel', 1)
      this.scene.start('MenuScene')
    })
  }

  private completeLevel() {
    if (!this.gm.isPlaying()) return
    this.gm.pause()
    this.registry.set('score', this.score)
    this.cameras.main.fadeOut(600, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('LevelCompleteScene')
    })
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
    if (Phaser.Input.Keyboard.JustDown(keys['ability'])) p.useAbility()
  }

  private handleGamepad(p: Player, pad: Phaser.Input.Gamepad.Gamepad) {
    if (!p.isAlive || p.isInhaled) return
    const lx = pad.leftStick.x
    if (lx < -0.25 || pad.left) p.moveLeft()
    else if (lx > 0.25 || pad.right) p.moveRight()
    else p.stopHorizontal()

    if (pad.A) p.jump()
    else p.jumpReleased()

    p.setInhaling(pad.buttons[2]?.pressed ?? false)   // X / Square — hold to inhale
  }

  private handleRemoteInput(p: Player, ri: RemoteInput) {
    if (!p.isAlive || p.isInhaled) return
    if (ri.left)        p.moveLeft()
    else if (ri.right)  p.moveRight()
    else                p.stopHorizontal()

    if (ri.jump) p.jump()
    else         p.jumpReleased()

    p.setInhaling(ri.inhale)
    if (ri.ability) p.useAbility()
  }

  private setupGamepadEvents() {
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        const player = this.players.find((_, i) => this.input.gamepad?.getPad(i) === pad)
        if (!player || !player.isAlive || player.isInhaled) return
        if (button.index === 1) player.useAbility()     // B/Circle
      }
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
    const escHint = this.add.text(width / 2, height * 0.77, 'ESC to toggle', {
      fontSize: '9px', fontFamily: FONT, color: '#556677',
    }).setOrigin(0.5).setScrollFactor(0)

    resume.on('pointerdown', () => this.togglePause())
    toMenu.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'))
    })

    this.pauseContainer = this.add.container(0, 0, [overlay, title, resume, toMenu, escHint])
      .setDepth(100).setVisible(false)
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
    const nowPaused = this.gm.isPlaying()   // if playing → we're about to pause
    if (nowPaused) this.gm.pause()
    else this.gm.resume()
    this.pauseContainer.setVisible(nowPaused)
    // Stop/restart physics simulation with the pause state
    this.physics.world.isPaused = nowPaused
  }

  // ── inhale cone ───────────────────────────────────────────────────────────

  private drawInhaleCone(g: Phaser.GameObjects.Graphics, p: Player) {
    const t    = this.time.now
    const dir  = p.flipX ? -1 : 1
    const ox   = p.x
    const oy   = p.y
    const len  = p.inhaleRange()                          // 190 px

    // Outer wide cone — very faint, pulsing
    const a1 = 0.13 + 0.07 * Math.sin(t / 110)
    g.fillStyle(0x55ddff, a1)
    g.fillTriangle(ox, oy, ox + dir * len, oy - 72, ox + dir * len, oy + 72)

    // Inner narrow cone — more opaque, counter-phase pulse
    const a2 = 0.28 + 0.12 * Math.sin(t / 80 + Math.PI)
    g.fillStyle(0xaaf0ff, a2)
    g.fillTriangle(ox, oy, ox + dir * len, oy - 36, ox + dir * len, oy + 36)

    // Suction streaks — 4 lines drifting from far end toward the player
    for (let i = 0; i < 4; i++) {
      const phase  = ((t / 380) + i * 0.25) % 1          // 0→1 cycling
      const dist   = len * (1 - phase)                    // starts at len, moves to 0
      const spread = 50 * (1 - phase * 0.65)              // narrows as it approaches
      const alpha  = 0.65 * Math.sin(phase * Math.PI)     // fade in, then out
      const sx     = ox + dir * dist
      g.lineStyle(2, 0xffffff, alpha)
      g.lineBetween(sx, oy - spread, sx, oy + spread)
    }
  }

  // ── update ────────────────────────────────────────────────────────────────

  update(_t: number, _dt: number) {
    if (!this.gm.isPlaying()) return

    // Parallax scroll
    const sx = this.cameras.main.scrollX
    this.bgLayers[0].tilePositionX = sx * 0.05
    this.bgLayers[1].tilePositionX = sx * 0.18

    // Camera target = average player position
    if (this.players.length > 0) {
      const alive = this.players.filter(p => p.isAlive)
      if (alive.length > 0) {
        const ax = alive.reduce((s, p) => s + p.x, 0) / alive.length
        const ay = alive.reduce((s, p) => s + p.y, 0) / alive.length
        this.cameraTarget.setPosition(ax, ay)
      }
    }

    // Players
    this.players.forEach((p, i) => {
      p.update()

      // Inhale cone
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
        // Apply buffered network input for this remote player
        const ri = this.remoteInputs.get(p.playerId)
        if (ri) this.handleRemoteInput(p, ri)
      } else {
        // Local player — read gamepad/keyboard/touch
        const pad = this.input.gamepad?.getPad(this.nm ? 0 : p.playerId)
        if (pad?.connected) this.handleGamepad(p, pad)
        else {
          const keys = this.playerKeysets.get(p.playerId)
          if (keys) this.handleKeyboard(p, keys)
        }
        if (this.touchControls) this.touchControls.apply(p, () => {})

        // Send input to server
        if (this.nm) {
          const pad2 = this.input.gamepad?.getPad(0)
          const keys = this.playerKeysets.get(p.playerId)
          this.nm.sendInput({
            left:    !!(pad2?.connected ? (pad2.leftStick.x < -0.25 || pad2.left) : keys?.['left']?.isDown),
            right:   !!(pad2?.connected ? (pad2.leftStick.x >  0.25 || pad2.right) : keys?.['right']?.isDown),
            jump:    !!(pad2?.connected ? pad2.A : keys?.['jump']?.isDown),
            inhale:  !!(pad2?.connected ? (pad2.buttons[2]?.pressed) : keys?.['inhale']?.isDown),
            ability: !!(pad2?.connected ? pad2.buttons[1]?.pressed : keys?.['ability']?.isDown),
          })
        }
      }

      if (p.inhaling) this.checkInhale(p)
      else this.enemies.forEach(e => e.stopPull())

      // Goal collision
      if (p.isAlive &&
          Phaser.Math.Distance.Between(p.x, p.y, this.goalSprite.x, this.goalSprite.y) < 40) {
        this.completeLevel()
      }
    })

    // Collectibles — check if any alive player is touching one
    this.collectibleSprites = this.collectibleSprites.filter(img => {
      if (!img.active) return false
      for (const p of this.players) {
        if (p.isAlive && Phaser.Math.Distance.Between(p.x, p.y, img.x, img.y) < 32) {
          this.collectItem(p, img.getData('item') as ItemSpawn)
          img.destroy()
          return false
        }
      }
      return true
    })

    // Enemies — prune destroyed sprites then tick survivors
    this.enemies = this.enemies.filter(e => e.active)
    this.enemies.forEach(e => e.update())

    // UI
    this.ui.update(this.players)
  }
}
