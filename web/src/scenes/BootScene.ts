import Phaser from 'phaser'

// ── SPRITE SHEET CONFIG ───────────────────────────────────────────────────────
// Step 1: Drop your PNGs into  web/public/assets/
// Step 2: Fill in FRAME_W, FRAME_H, and the frame ranges below
// Step 3: Flip SPRITES_CONFIGURED to true — animations won't load until you do
//
// Frames count left→right, top→bottom, starting at 0.
// Single-frame animation: { start: N, end: N }

const SPRITES_CONFIGURED = true

const FRAME_W = 84   // 252 px sheet ÷ 3 columns
const FRAME_H = 84   // 252 px sheet ÷ 3 rows

const SHEETS = {
  red:    'characters-red.png',
  blue:   'characters-blue.png',
  green:  'characters-green.png',
  orange: 'characters-orange.png',   // add this file for P3 sprite sheet
}

// Which sheet each player uses (falls back to generated texture if file is missing)
const PLAYER_SHEETS: Record<number, keyof typeof SHEETS> = {
  0: 'red',
  1: 'blue',
  2: 'green',
  3: 'orange',
}

// 3×3 grid layout (frames 0-8):
//  Row 0 (0,1,2)  — front/idle poses
//  Row 1 (3,4,5)  — side standing poses
//  Row 2 (6,7,8)  — side walking cycle
// Adjust start/end here once you confirm which frames show which pose.
const ANIM_FRAMES = {
  idle:   { start: 1, end: 1 },   // row 0: front-facing bob
  walk:   { start: 1, end: 2 },   // row 2: side walk cycle
  jump:   { start: 3, end: 3 },   // row 1, col 0
  float:  { start: 1, end: 1 },   // row 1, col 1
  inhale: { start: 2, end: 2 },   // row 0, col 1 (slight turn)
  puffed: { start: 0, end: 0 },   // row 0, col 0 (front face)
  fall:   { start: 1, end: 1 },   // row 1, col 2
}
// ── Enemy sheet config ────────────────────────────────────────────────────────
const ENEMY_SHEETS = [
  { key: 'sheet-enemy-dragon',   file: 'dragon.png',   fw: 84,  fh: 84,  walkEnd: 8 },
  { key: 'sheet-enemy-duckbot',  file: 'duckbot.png',  fw: 84,  fh: 84,  walkEnd: 8 },
  { key: 'sheet-enemy-sqoomba',  file: 'sqoomba.png',  fw: 84,  fh: 84,  walkEnd: 8 },
  { key: 'sheet-enemy-troomba',  file: 'troomba.png',  fw: 84,  fh: 84,  walkEnd: 8 },
  { key: 'sheet-enemy-pinklady', file: 'pinklady.png', fw: 128, fh: 128, walkEnd: 7 },
]
// ─────────────────────────────────────────────────────────────────────────────

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }) }

  preload() {
    if (SPRITES_CONFIGURED) {
      for (const [key, file] of Object.entries(SHEETS)) {
        this.load.spritesheet(`sheet-${key}`, `assets/${file}`, {
          frameWidth: FRAME_W, frameHeight: FRAME_H,
        })
      }
    }
    for (const { key, file, fw, fh } of ENEMY_SHEETS) {
      this.load.spritesheet(key, `assets/${file}`, { frameWidth: fw, frameHeight: fh })
    }
    this.load.image('logo', 'assets/guessperados.jpg')
  }

  create() {
    this.genCharacters()
    this.genTiles()
    this.genObjects()
    this.genScenery()
    this.genBackgrounds()
    this.genInteriorBackgrounds()
    this.setupAnimations()
    this.setupEnemyAnimations()
    this.scene.start('IntroScene')
  }

  private setupAnimations() {
    for (const [key] of Object.entries(SHEETS)) {
      const textureKey = `sheet-${key}`
      if (!this.textures.exists(textureKey)) continue  // file not found — skip

      const prefix = `char-${key}`
      for (const [name, range] of Object.entries(ANIM_FRAMES)) {
        this.anims.create({
          key:       `${prefix}-${name}`,
          frames:    this.anims.generateFrameNumbers(textureKey, range),
          frameRate: name === 'walk' ? 8 : name === 'inhale' ? 10 : 6,
          repeat:    name === 'jump' || name === 'fall' ? 0 : -1,
        })
      }
    }
  }

  private setupEnemyAnimations() {
    for (const { key } of ENEMY_SHEETS) {
      if (!this.textures.exists(key)) continue
      this.anims.create({
        key: `${key}-walk`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 8, repeat: -1,
      })
      this.anims.create({
        key: `${key}-idle`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 4, repeat: -1,
      })
    }
  }

  // Expose config for Player to read
  static getSheetKey(playerId: number): string | null {
    const slot = PLAYER_SHEETS[playerId as keyof typeof PLAYER_SHEETS]
    return slot ? `sheet-${slot}` : null
  }

  static getAnimPrefix(playerId: number): string | null {
    const slot = PLAYER_SHEETS[playerId as keyof typeof PLAYER_SHEETS]
    return slot ? `char-${slot}` : null
  }

  // Fallback texture when no sprite sheet is available
  static getFallbackTexture(playerId: number): string {
    return ['player', 'player-2', 'player-2', 'player-3'][playerId] ?? 'player'
  }

  // ── characters ──────────────────────────────────────────────────────────────

  private genCharacters() {
    // Player 1 — pink Kirby-ish
    const p1 = this.g()
    p1.fillStyle(0xff9eb5); p1.fillCircle(16, 17, 14)         // body
    p1.fillStyle(0xff6b9d, 0.7); p1.fillCircle(9, 20, 5)      // blush L
    p1.fillStyle(0xff6b9d, 0.7); p1.fillCircle(23, 20, 5)     // blush R
    p1.fillStyle(0x001f54); p1.fillEllipse(10, 14, 7, 9)      // eye L
    p1.fillStyle(0x001f54); p1.fillEllipse(22, 14, 7, 9)      // eye R
    p1.fillStyle(0xffffff); p1.fillCircle(8, 12, 2)           // shine L
    p1.fillStyle(0xffffff); p1.fillCircle(20, 12, 2)           // shine R
    p1.fillStyle(0x8b0000); p1.fillEllipse(16, 22, 8, 5)      // mouth
    p1.fillStyle(0xffa0c0); p1.fillEllipse(16, 6, 10, 6)      // top highlight
    p1.generateTexture('player', 32, 32); p1.destroy()

    // Player 2 — blue variant
    const p2 = this.g()
    p2.fillStyle(0x82b4ff); p2.fillCircle(16, 17, 14)
    p2.fillStyle(0x5090ee, 0.7); p2.fillCircle(9, 20, 5)
    p2.fillStyle(0x5090ee, 0.7); p2.fillCircle(23, 20, 5)
    p2.fillStyle(0x001f54); p2.fillEllipse(10, 14, 7, 9)
    p2.fillStyle(0x001f54); p2.fillEllipse(22, 14, 7, 9)
    p2.fillStyle(0xffffff); p2.fillCircle(8, 12, 2)
    p2.fillStyle(0xffffff); p2.fillCircle(20, 12, 2)
    p2.fillStyle(0x8b0000); p2.fillEllipse(16, 22, 8, 5)
    p2.fillStyle(0xa0c8ff); p2.fillEllipse(16, 6, 10, 6)
    p2.generateTexture('player-2', 32, 32); p2.destroy()

    // Enemy — purple blob (None ability)
    const en = this.g()
    en.fillStyle(0x7b1fa2); en.fillEllipse(14, 16, 26, 24)
    en.fillStyle(0xab47bc); en.fillEllipse(14, 11, 18, 12)
    en.fillStyle(0xffffff); en.fillEllipse(8, 12, 8, 10);  en.fillEllipse(20, 12, 8, 10)
    en.fillStyle(0x1a0033); en.fillCircle(8, 13, 3);       en.fillCircle(20, 13, 3)
    en.fillStyle(0xffffff); en.fillCircle(7, 11, 1.5);     en.fillCircle(19, 11, 1.5)
    en.fillStyle(0xce93d8, 0.5); en.fillEllipse(14, 6, 12, 6)
    en.generateTexture('enemy', 28, 28); en.destroy()

    // Dragon (Fire ability) — 44×44
    const dr = this.g()
    // Wings (behind body)
    dr.fillStyle(0x7f0000, 0.85)
    dr.fillTriangle(0, 16, 10, 28, 0, 40)
    dr.fillTriangle(44, 16, 34, 28, 44, 40)
    dr.lineStyle(1, 0x550000, 0.6)
    dr.lineBetween(0, 16, 10, 28); dr.lineBetween(10, 28, 0, 40)
    dr.lineBetween(44, 16, 34, 28); dr.lineBetween(34, 28, 44, 40)
    // Horns
    dr.fillStyle(0x8d4000)
    dr.fillTriangle(14, 8, 12, 0, 20, 8)
    dr.fillTriangle(30, 8, 32, 0, 24, 8)
    // Head
    dr.fillStyle(0xb71c1c); dr.fillEllipse(22, 14, 24, 18)
    dr.fillStyle(0xd32f2f); dr.fillEllipse(22, 12, 18, 12)
    // Snout
    dr.fillStyle(0xc62828); dr.fillRect(15, 17, 14, 8)
    dr.fillStyle(0x7f0000); dr.fillRect(17, 20, 3, 2); dr.fillRect(24, 20, 3, 2)
    // Eyes (slit pupils)
    dr.fillStyle(0xffee00); dr.fillEllipse(15, 11, 9, 7); dr.fillEllipse(29, 11, 9, 7)
    dr.fillStyle(0x0d0000); dr.fillRect(15, 8, 2, 7); dr.fillRect(29, 8, 2, 7)
    dr.fillStyle(0xffffff, 0.6); dr.fillRect(13, 9, 2, 2); dr.fillRect(27, 9, 2, 2)
    // Teeth
    dr.fillStyle(0xfff3e0)
    dr.fillTriangle(17, 24, 19, 29, 21, 24)
    dr.fillTriangle(21, 24, 23, 29, 25, 24)
    dr.fillTriangle(25, 24, 27, 29, 29, 24)
    // Body with scales
    dr.fillStyle(0xb71c1c); dr.fillEllipse(22, 34, 26, 20)
    dr.fillStyle(0xd32f2f); dr.fillEllipse(22, 30, 18, 14)
    // Scale rows
    dr.fillStyle(0x7f0000, 0.55)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        dr.fillEllipse(12 + col * 8, 28 + row * 6, 7, 4)
      }
    }
    // Claws
    dr.fillStyle(0xf0c080)
    dr.fillTriangle(15, 44, 17, 40, 19, 44)
    dr.fillTriangle(20, 44, 22, 40, 24, 44)
    dr.fillTriangle(25, 44, 27, 40, 29, 44)
    dr.generateTexture('enemy-dragon', 44, 44); dr.destroy()

    // Alien (Bomb ability) — 40×44
    const al = this.g()
    // Huge dome head
    al.fillStyle(0x2d4a1e); al.fillEllipse(20, 14, 36, 30)
    al.fillStyle(0x3d6b2a); al.fillEllipse(20, 10, 28, 22)
    al.fillStyle(0x4a7f35, 0.5); al.fillEllipse(14, 8, 14, 8)  // head sheen
    // Antenna
    al.fillStyle(0x2d4a1e); al.fillRect(19, 0, 3, 10)
    al.fillStyle(0xff5722); al.fillCircle(20, 0, 4)             // glowing tip
    al.fillStyle(0xff8a65); al.fillCircle(20, 0, 2)
    // Three glowing eyes in a row
    al.fillStyle(0xff1744); al.fillCircle(12, 14, 5)
    al.fillStyle(0xff1744); al.fillCircle(20, 14, 5)
    al.fillStyle(0xff1744); al.fillCircle(28, 14, 5)
    al.fillStyle(0xff6d00); al.fillCircle(12, 14, 3); al.fillCircle(20, 14, 3); al.fillCircle(28, 14, 3)
    al.fillStyle(0xffffff, 0.7); al.fillCircle(11, 13, 1.5); al.fillCircle(19, 13, 1.5); al.fillCircle(27, 13, 1.5)
    // Slit mouth
    al.fillStyle(0x1a330d); al.fillRect(14, 22, 12, 3)
    al.fillStyle(0x4a7f35); al.fillRect(15, 23, 2, 2); al.fillRect(19, 23, 2, 2); al.fillRect(23, 23, 2, 2)
    // Thin body / torso
    al.fillStyle(0x2d4a1e); al.fillEllipse(20, 34, 14, 16)
    al.fillStyle(0x3d6b2a); al.fillEllipse(20, 31, 10, 10)
    // Long spindly arms
    al.fillStyle(0x2d4a1e)
    al.fillRect(4, 26, 5, 14); al.fillRect(31, 26, 5, 14)      // upper arms
    al.fillRect(2, 38, 6, 4); al.fillRect(32, 38, 6, 4)        // lower arms
    // 3-fingered hands
    al.fillStyle(0x3d6b2a)
    al.fillTriangle(2, 42, 4, 44, 6, 42); al.fillTriangle(4, 42, 6, 44, 8, 42)
    al.fillTriangle(32, 42, 34, 44, 36, 42); al.fillTriangle(34, 42, 36, 44, 38, 42)
    al.generateTexture('enemy-alien', 40, 44); al.destroy()

    // Cyberbot (Electric ability) — 40×44
    const cb = this.g()
    // Shoulder pauldrons
    cb.fillStyle(0x546e7a); cb.fillRect(2, 18, 12, 8); cb.fillRect(26, 18, 12, 8)
    cb.fillStyle(0x78909c); cb.fillRect(3, 19, 10, 4); cb.fillRect(27, 19, 10, 4)
    // Head / helmet
    cb.fillStyle(0x455a64); cb.fillRect(8, 4, 24, 18)
    cb.fillStyle(0x546e7a); cb.fillRect(9, 5, 22, 14)          // face panel
    cb.fillStyle(0x37474f); cb.fillRect(8, 4, 24, 3)           // top ridge
    // Visor strip (glowing yellow)
    cb.fillStyle(0x1a1a00); cb.fillRect(10, 10, 20, 7)
    cb.fillStyle(0xffea00); cb.fillRect(11, 11, 18, 5)         // visor glow
    cb.fillStyle(0xffffff, 0.5); cb.fillRect(12, 11, 6, 2)    // visor sheen
    // Side lights
    cb.fillStyle(0x00e5ff); cb.fillRect(8, 12, 2, 3); cb.fillRect(30, 12, 2, 3)
    // Antenna
    cb.fillStyle(0x78909c); cb.fillRect(17, 0, 3, 6)
    cb.fillStyle(0x00e5ff); cb.fillCircle(18, 0, 3)
    // Body / chassis
    cb.fillStyle(0x37474f); cb.fillRect(10, 22, 20, 18)
    cb.fillStyle(0x455a64); cb.fillRect(11, 23, 18, 14)
    // Panel lines on body
    cb.lineStyle(1, 0x263238); cb.lineBetween(11, 28, 29, 28)
    cb.lineStyle(1, 0x263238); cb.lineBetween(20, 23, 20, 37)
    // Energy core
    cb.fillStyle(0x00e5ff, 0.9); cb.fillCircle(20, 30, 5)
    cb.fillStyle(0xffffff, 0.7); cb.fillCircle(20, 30, 2)
    // Arms
    cb.fillStyle(0x37474f); cb.fillRect(2, 22, 8, 16); cb.fillRect(30, 22, 8, 16)
    cb.fillStyle(0x455a64); cb.fillRect(3, 23, 6, 12); cb.fillRect(31, 23, 6, 12)
    // Clamp hands
    cb.fillStyle(0x263238); cb.fillRect(0, 36, 10, 6); cb.fillRect(30, 36, 10, 6)
    cb.fillStyle(0x455a64); cb.fillRect(1, 37, 4, 4); cb.fillRect(35, 37, 4, 4)
    // Legs
    cb.fillStyle(0x37474f); cb.fillRect(12, 40, 7, 4); cb.fillRect(21, 40, 7, 4)
    cb.fillStyle(0x455a64); cb.fillRect(11, 42, 9, 3); cb.fillRect(20, 42, 9, 3)
    cb.generateTexture('enemy-bot', 40, 44); cb.destroy()

    // Frost Wraith (Ice ability) — 38×48
    const fw = this.g()
    // Wispy tail / body base (tapered ghost shape)
    fw.fillStyle(0x1a237e, 0.6); fw.fillEllipse(19, 36, 22, 28)
    fw.fillStyle(0x1565c0, 0.7); fw.fillEllipse(19, 28, 26, 32)
    fw.fillStyle(0x42a5f5, 0.55); fw.fillEllipse(19, 22, 28, 28)
    fw.fillStyle(0x90caf9, 0.4); fw.fillEllipse(19, 16, 24, 22)
    // Crystal spikes on body
    fw.fillStyle(0xbbdefb, 0.8)
    fw.fillTriangle(6, 32, 2, 24, 10, 26)                       // left spike
    fw.fillTriangle(32, 32, 38, 24, 30, 26)                     // right spike
    fw.fillTriangle(10, 38, 5, 30, 14, 34)                      // lower-left spike
    fw.fillTriangle(28, 38, 33, 30, 24, 34)                     // lower-right spike
    // Head region
    fw.fillStyle(0x1976d2, 0.8); fw.fillEllipse(19, 12, 28, 24)
    fw.fillStyle(0x64b5f6, 0.5); fw.fillEllipse(16, 9, 14, 10)  // head sheen
    // Hollow eye sockets
    fw.fillStyle(0x000a1a); fw.fillEllipse(13, 10, 10, 10); fw.fillEllipse(25, 10, 10, 10)
    fw.fillStyle(0x82b1ff, 0.9); fw.fillEllipse(13, 10, 6, 6); fw.fillEllipse(25, 10, 6, 6)
    fw.fillStyle(0xe3f2fd); fw.fillEllipse(13, 10, 3, 3); fw.fillEllipse(25, 10, 3, 3)
    // Rictus grin (jagged ice teeth)
    fw.fillStyle(0x000a1a); fw.fillRect(12, 19, 14, 4)
    fw.fillStyle(0xe3f2fd)
    fw.fillTriangle(13, 19, 15, 23, 17, 19)
    fw.fillTriangle(17, 19, 19, 23, 21, 19)
    fw.fillTriangle(21, 19, 23, 23, 25, 19)
    // Crown of ice spikes on head
    fw.fillStyle(0xbbdefb)
    for (let i = 0; i < 5; i++) {
      const sx = 8 + i * 6
      fw.fillTriangle(sx, 4, sx + 3, -2, sx + 6, 4)
    }
    // Faint glow aura
    fw.lineStyle(3, 0x90caf9, 0.25); fw.strokeEllipse(19, 20, 34, 42)
    fw.generateTexture('enemy-wraith', 38, 48); fw.destroy()

    // Player 3 fallback (orange — if no 4th sprite sheet)
    const p3 = this.g()
    p3.fillStyle(0xff8c00); p3.fillCircle(16, 17, 14)
    p3.fillStyle(0xff6d00, 0.7); p3.fillCircle(9, 20, 5); p3.fillCircle(23, 20, 5)
    p3.fillStyle(0x001f54); p3.fillEllipse(10, 14, 7, 9); p3.fillEllipse(22, 14, 7, 9)
    p3.fillStyle(0xffffff); p3.fillCircle(8, 12, 2); p3.fillCircle(20, 12, 2)
    p3.fillStyle(0x8b0000); p3.fillEllipse(16, 22, 8, 5)
    p3.fillStyle(0xffcc80); p3.fillEllipse(16, 6, 10, 6)
    p3.generateTexture('player-3', 32, 32); p3.destroy()
  }

  // ── tiles ───────────────────────────────────────────────────────────────────

  private genTiles() {
    // Metal — space station (level 1)
    const m = this.g()
    m.fillStyle(0x37474f); m.fillRect(0, 0, 32, 32)
    m.fillStyle(0x546e7a); m.fillRect(0, 0, 32, 4)             // top edge highlight
    m.fillStyle(0x263238); m.fillRect(0, 28, 32, 4)            // bottom shadow
    m.fillStyle(0x455a64); m.fillRect(4, 8, 24, 2)             // rivet row 1
    m.fillStyle(0x455a64); m.fillRect(4, 18, 24, 2)            // rivet row 2
    m.fillStyle(0x607d8b); m.fillRect(6, 9, 4, 4)              // rivet bolt
    m.fillStyle(0x607d8b); m.fillRect(22, 9, 4, 4)
    m.fillStyle(0x607d8b); m.fillRect(6, 19, 4, 4)
    m.fillStyle(0x607d8b); m.fillRect(22, 19, 4, 4)
    m.generateTexture('tile-metal', 32, 32); m.destroy()

    // Rock — asteroid (level 2)
    const r = this.g()
    r.fillStyle(0x4e342e); r.fillRect(0, 0, 32, 32)
    r.fillStyle(0x6d4c41); r.fillRect(0, 0, 32, 4)
    r.fillStyle(0x3e2723); r.fillRect(0, 28, 32, 4)
    r.fillStyle(0x5d4037); r.fillRect(3, 6, 8, 8)
    r.fillStyle(0x5d4037); r.fillRect(18, 14, 10, 6)
    r.fillStyle(0x3e2723); r.fillRect(3, 7, 4, 4)
    r.fillStyle(0x3e2723); r.fillRect(20, 15, 5, 3)
    r.generateTexture('tile-rock', 32, 32); r.destroy()

    // Core — planet core / lava (level 3)
    const c = this.g()
    c.fillStyle(0x7f0000); c.fillRect(0, 0, 32, 32)
    c.fillStyle(0xc62828); c.fillRect(0, 0, 32, 4)
    c.fillStyle(0x4a0000); c.fillRect(0, 28, 32, 4)
    c.fillStyle(0xff5722); c.fillRect(4, 8, 6, 3)              // lava crack 1
    c.fillStyle(0xff5722); c.fillRect(16, 16, 10, 3)           // lava crack 2
    c.fillStyle(0xff8a65); c.fillRect(5, 9, 2, 1)              // glow
    c.fillStyle(0xff8a65); c.fillRect(18, 17, 3, 1)
    c.generateTexture('tile-core', 32, 32); c.destroy()

    // Destructible block
    const d = this.g()
    d.fillStyle(0x78909c); d.fillRect(0, 0, 32, 32)
    d.fillStyle(0x90a4ae); d.fillRect(0, 0, 32, 3)
    d.fillStyle(0x546e7a); d.fillRect(0, 29, 32, 3)
    d.lineStyle(2, 0x546e7a); d.strokeRect(2, 2, 28, 28)
    d.fillStyle(0x607d8b); d.fillRect(4, 4, 10, 10)
    d.fillStyle(0x607d8b); d.fillRect(18, 18, 10, 10)
    d.generateTexture('destructible', 32, 32); d.destroy()
  }

  // ── game objects ─────────────────────────────────────────────────────────────

  private genObjects() {
    // Crate
    const cr = this.g()
    cr.fillStyle(0x8d6e63); cr.fillRect(0, 0, 32, 32)
    cr.fillStyle(0x5d4037); cr.fillRect(0, 0, 32, 3)
    cr.fillStyle(0x5d4037); cr.fillRect(0, 29, 32, 3)
    cr.fillStyle(0x5d4037); cr.fillRect(0, 0, 3, 32)
    cr.fillStyle(0x5d4037); cr.fillRect(29, 0, 3, 32)
    cr.fillStyle(0x6d4c41); cr.fillRect(14, 0, 4, 32)          // plank
    cr.fillStyle(0x6d4c41); cr.fillRect(0, 14, 32, 4)          // plank
    cr.fillStyle(0xa1887f); cr.fillRect(4, 4, 8, 8)
    cr.fillStyle(0xa1887f); cr.fillRect(20, 4, 8, 8)
    cr.fillStyle(0xa1887f); cr.fillRect(4, 20, 8, 8)
    cr.fillStyle(0xa1887f); cr.fillRect(20, 20, 8, 8)
    cr.generateTexture('crate', 32, 32); cr.destroy()

    // Warp star (kept for ability-drop orbs)
    const ws = this.g()
    ws.fillStyle(0xffd600)
    ws.fillPoints(this.starPts(24, 24, 22, 9, 5), true)
    ws.fillStyle(0xfff9c4)
    ws.fillPoints(this.starPts(24, 24, 10, 4, 5), true)
    ws.lineStyle(2, 0xffab00)
    ws.strokePoints(this.starPts(24, 24, 22, 9, 5), true)
    ws.generateTexture('warp-star', 48, 48); ws.destroy()

    // Space portal — level exit goal
    const gp = this.g()
    const pcx = 28, pcy = 28
    gp.fillStyle(0x000a1a);  gp.fillCircle(pcx, pcy, 26)          // void interior
    gp.lineStyle(8, 0x004d7a, 0.3);  gp.strokeCircle(pcx, pcy, 26) // outer soft halo
    gp.lineStyle(4, 0x00e5ff, 0.95); gp.strokeCircle(pcx, pcy, 24) // bright outer ring
    gp.lineStyle(3, 0x40c4ff, 0.75); gp.strokeCircle(pcx, pcy, 18) // mid ring
    gp.lineStyle(2, 0x80d8ff, 0.55); gp.strokeCircle(pcx, pcy, 12) // inner ring
    gp.lineStyle(1, 0xe1f5fe, 0.45); gp.strokeCircle(pcx, pcy, 6)  // center ring
    // Radial vortex spokes — rotationally symmetric so spin looks good
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4
      gp.lineStyle(1, 0x40c4ff, 0.35)
      gp.lineBetween(
        pcx + Math.cos(ang) * 8,  pcy + Math.sin(ang) * 8,
        pcx + Math.cos(ang) * 22, pcy + Math.sin(ang) * 22
      )
    }
    gp.fillStyle(0x80d8ff, 0.85); gp.fillCircle(pcx, pcy, 4)  // center energy dot
    gp.fillStyle(0xffffff, 0.7);  gp.fillCircle(pcx, pcy, 2)  // bright core
    gp.generateTexture('goal-portal', 56, 56); gp.destroy()

    // Star projectile (Kirby spit star)
    const sp = this.g()
    sp.fillStyle(0xffeb3b)
    sp.fillPoints(this.starPts(10, 10, 9, 4, 5), true)
    sp.fillStyle(0xffffff)
    sp.fillPoints(this.starPts(10, 10, 4, 2, 5), true)
    sp.generateTexture('star-spit', 20, 20); sp.destroy()

    // Fireball
    const fb = this.g()
    fb.fillStyle(0xff6f00); fb.fillCircle(8, 8, 7)
    fb.fillStyle(0xffcc02); fb.fillCircle(8, 9, 4)
    fb.fillStyle(0xffffff); fb.fillCircle(7, 8, 2)
    fb.generateTexture('fireball', 16, 16); fb.destroy()

    // Fragment / debris
    const fr = this.g()
    fr.fillStyle(0x78909c); fr.fillRect(0, 0, 12, 12)
    fr.fillStyle(0x546e7a); fr.fillRect(0, 0, 12, 3)
    fr.fillStyle(0x90a4ae); fr.fillRect(2, 2, 4, 4)
    fr.generateTexture('fragment', 12, 12); fr.destroy()

    // Small planet / decorations
    this.genPlanet('planet-earth',  48,  0x1a5276, 0x27ae60, 0x85c1e9)
    this.genPlanet('planet-purple', 36,  0x4a148c, 0x7b1fa2, 0xce93d8)
    this.genPlanet('planet-red',    56,  0x7f0000, 0xb71c1c, 0xff5722)

    // Pixel rapier (32×8) — origin used at (0.15, 0.5) so grip is pivot
    const rp = this.g()
    // Pommel
    rp.fillStyle(0x999999); rp.fillRect(0, 2, 3, 4)
    rp.fillStyle(0xcccccc); rp.fillRect(0, 2, 3, 2)
    // Grip (leather)
    rp.fillStyle(0x6d3b0e); rp.fillRect(3, 2, 6, 4)
    rp.fillStyle(0x8b5e2c); rp.fillRect(3, 2, 6, 1)
    rp.fillStyle(0x3d1f00); rp.fillRect(3, 5, 6, 1)
    // Guard (gold crosspiece, full height)
    rp.fillStyle(0xcb9b00); rp.fillRect(9, 0, 3, 8)
    rp.fillStyle(0xffe57f); rp.fillRect(9, 0, 3, 2)
    rp.fillStyle(0x8a6200); rp.fillRect(9, 6, 3, 2)
    // Blade
    rp.fillStyle(0xbdbdbd); rp.fillRect(12, 2, 28, 4)
    rp.fillStyle(0xeeeeee); rp.fillRect(12, 2, 28, 1)   // top sharp edge
    rp.fillStyle(0x888888); rp.fillRect(12, 5, 28, 1)   // bottom shadow
    // Tip (tapered point)
    rp.fillStyle(0xbdbdbd); rp.fillRect(40, 2, 2, 4)
    rp.fillStyle(0xbdbdbd); rp.fillRect(42, 3, 1, 2)
    // Blade sheen
    rp.fillStyle(0xffffff, 0.55); rp.fillRect(14, 2, 12, 1)
    rp.generateTexture('rapier', 43, 8); rp.destroy()
  }

  // ── scenery props ─────────────────────────────────────────────────────────────

  private genScenery() {
    this.genLevel1Scenery()
    this.genLevel2Scenery()
    this.genLevel3Scenery()
    this.genStationRoomProps()
    this.genCollectibles()
  }

  // ── station room props (used by the 5 scenery variants) ──────────────────────

  private genStationRoomProps() {
    // Galaxy viewscreen — wall-mounted monitor (240×130)
    const vs = this.g()
    vs.fillStyle(0x1a2a40); vs.fillRect(0, 0, 240, 130)
    vs.fillStyle(0x263d58); vs.fillRect(0, 0, 240, 6)
    vs.fillStyle(0x0d1a2a); vs.fillRect(6, 6, 228, 118)
    vs.fillStyle(0x000814); vs.fillRect(10, 10, 220, 110)
    vs.fillStyle(0x0a1428, 0.8); vs.fillRect(10, 10, 220, 110)
    // Stars
    for (const [sx, sy] of [[24,22],[68,18],[105,35],[148,15],[180,42],[210,24],[35,75],[90,82],[130,60],[175,90],[220,55],[55,50],[160,70]] as [number,number][]) {
      vs.fillStyle(0xffffff, 0.9); vs.fillRect(sx, sy, 2, 2)
    }
    // Galaxy core spiral
    vs.fillStyle(0x102040, 0.55); vs.fillEllipse(115, 60, 90, 44)
    vs.fillStyle(0x1a3868, 0.5); vs.fillEllipse(115, 60, 54, 26)
    vs.fillStyle(0x2244aa, 0.4); vs.fillEllipse(115, 60, 30, 14)
    vs.fillStyle(0x5577ff, 0.35); vs.fillCircle(115, 60, 8)
    vs.fillStyle(0xffffff, 0.85); vs.fillRect(114, 59, 3, 3)
    // Scan lines
    for (let ly = 12; ly < 116; ly += 4) { vs.fillStyle(0x000000, 0.1); vs.fillRect(10, ly, 220, 2) }
    // Frame LED row
    vs.fillStyle(0x2a3e58); vs.fillRect(0, 124, 240, 6)
    for (let i = 0; i < 7; i++) {
      vs.fillStyle([0x00ee44, 0xffcc00, 0x00aaff, 0x00ee44, 0xff4400, 0x00aaff, 0xffcc00][i])
      vs.fillRect(14 + i * 18, 126, 8, 3)
    }
    vs.generateTexture('scn-viewscreen', 240, 130); vs.destroy()

    // Horizontal pipe bundle — ceiling pipes (200×24)
    const pb = this.g()
    pb.fillStyle(0x1a2438); pb.fillRect(0, 0, 200, 24)
    for (const [py, c1, c2] of [[2, 0x546e7a, 0x78909c], [10, 0x455a64, 0x607d8b], [18, 0x37474f, 0x546e7a]] as [number,number,number][]) {
      pb.fillStyle(c1); pb.fillRect(0, py, 200, 6)
      pb.fillStyle(c2); pb.fillRect(0, py, 200, 2)
      pb.fillStyle(0x1a2a36); pb.fillRect(0, py + 5, 200, 1)
    }
    for (let fx = 18; fx < 200; fx += 48) {
      pb.fillStyle(0x4a607a); pb.fillRect(fx, 0, 12, 24)
      pb.fillStyle(0x5c7490); pb.fillRect(fx + 1, 1, 10, 5)
      pb.fillStyle(0x2a3848); pb.fillRect(fx + 1, 18, 10, 5)
    }
    pb.generateTexture('scn-pipe-bundle', 200, 24); pb.destroy()

    // Fuel cylinder — vertical tank (40×88)
    const fc = this.g()
    fc.fillStyle(0x455a64); fc.fillRect(6, 8, 28, 72)
    fc.fillStyle(0x546e7a); fc.fillRect(6, 8, 28, 5)
    fc.fillStyle(0x263238); fc.fillRect(6, 75, 28, 5)
    fc.fillStyle(0x37474f); fc.fillRect(3, 16, 34, 5)
    fc.fillStyle(0x37474f); fc.fillRect(3, 66, 34, 5)
    fc.fillStyle(0x607d8b); fc.fillRect(7, 10, 4, 70)
    fc.fillStyle(0xffd600, 0.85); fc.fillRect(14, 36, 12, 16)
    fc.fillStyle(0x111111); fc.fillRect(14, 36, 12, 4); fc.fillRect(14, 48, 12, 4)
    fc.fillStyle(0x37474f); fc.fillCircle(32, 34, 6)
    fc.fillStyle(0x1a2a36); fc.fillCircle(32, 34, 4)
    fc.fillStyle(0xff1744); fc.fillRect(33, 31, 2, 5)
    fc.fillStyle(0x263238); fc.fillRect(0, 80, 40, 8)
    fc.fillStyle(0x37474f); fc.fillRect(4, 80, 32, 4)
    fc.generateTexture('scn-fuel-cylinder', 40, 88); fc.destroy()

    // Storage pod — cargo container (60×70)
    const sp = this.g()
    sp.fillStyle(0x37474f); sp.fillRect(0, 0, 60, 70)
    sp.fillStyle(0x546e7a); sp.fillRect(0, 0, 60, 5)
    sp.fillStyle(0x263238); sp.fillRect(0, 65, 60, 5)
    sp.fillStyle(0x455a64); sp.fillRect(0, 0, 5, 70); sp.fillRect(55, 0, 5, 70)
    sp.fillStyle(0x263238); sp.fillRect(0, 34, 60, 2)
    sp.fillStyle(0xffd600, 0.9); sp.fillRect(8, 8, 44, 12)
    sp.fillStyle(0x1a1a1a); sp.fillRect(10, 10, 40, 8)
    sp.fillStyle(0xffd600); sp.fillRect(8, 44, 44, 16)
    sp.fillStyle(0x111111); sp.fillRect(8, 44, 44, 4); sp.fillRect(8, 56, 44, 4)
    sp.fillStyle(0x607d8b); sp.fillRect(24, 50, 12, 6)
    sp.fillStyle(0x37474f); sp.fillRect(26, 52, 8, 2)
    sp.generateTexture('scn-storage-pod', 60, 70); sp.destroy()

    // Specimen tank — tall glowing cylinder (34×100)
    const st2 = this.g()
    st2.fillStyle(0x37474f); st2.fillRect(0, 0, 34, 8)
    st2.fillStyle(0x546e7a); st2.fillRect(0, 0, 34, 3)
    st2.fillStyle(0x1a3040); st2.fillRect(4, 8, 26, 84)
    st2.fillStyle(0x000e18); st2.fillRect(6, 10, 22, 80)
    st2.fillStyle(0x003344, 0.85); st2.fillRect(6, 10, 22, 80)
    st2.fillStyle(0x005566, 0.5); st2.fillRect(7, 12, 18, 72)
    st2.fillStyle(0x00aabb, 0.22); st2.fillRect(8, 14, 8, 68)
    st2.fillStyle(0x003344, 0.6); st2.fillEllipse(17, 56, 14, 20)
    st2.fillStyle(0x37474f); st2.fillRect(0, 92, 34, 8)
    st2.fillStyle(0x263238); st2.fillRect(0, 96, 34, 4)
    st2.fillStyle(0x455a64); st2.fillRect(28, 14, 6, 8); st2.fillRect(28, 76, 6, 8)
    st2.generateTexture('scn-specimen-tank', 34, 100); st2.destroy()

    // Weapon locker — wall rack (64×80)
    const wl = this.g()
    wl.fillStyle(0x263238); wl.fillRect(0, 0, 64, 80)
    wl.fillStyle(0x37474f); wl.fillRect(3, 3, 58, 74)
    wl.fillStyle(0x1a2226); wl.fillRect(8, 8, 20, 64); wl.fillRect(36, 8, 20, 64)
    wl.fillStyle(0x455a64); wl.fillRect(13, 18, 10, 38); wl.fillRect(14, 40, 8, 8)
    wl.fillStyle(0x546e7a); wl.fillRect(14, 42, 6, 4)
    wl.fillStyle(0x455a64); wl.fillRect(41, 18, 10, 38); wl.fillRect(42, 40, 8, 8)
    wl.fillStyle(0x546e7a); wl.fillRect(42, 42, 6, 4)
    wl.fillStyle(0x00ee44); wl.fillRect(8, 4, 4, 3); wl.fillRect(36, 4, 4, 3)
    wl.fillStyle(0xff1744); wl.fillRect(52, 4, 4, 3)
    wl.fillStyle(0x78909c); wl.fillRect(28, 35, 8, 10)
    wl.fillStyle(0x546e7a); wl.fillRect(29, 36, 6, 5)
    wl.fillStyle(0x263238); wl.fillCircle(32, 39, 2)
    wl.generateTexture('scn-weapon-locker', 64, 80); wl.destroy()

    // Console unit — floor terminal (72×52)
    const cu = this.g()
    cu.fillStyle(0x1e2d42); cu.fillRect(0, 0, 72, 52)
    cu.fillStyle(0x37474f); cu.fillRect(0, 0, 72, 4)
    cu.fillStyle(0x152030); cu.fillRect(4, 8, 64, 30)
    cu.fillStyle(0x001833); cu.fillRect(6, 10, 60, 26)
    cu.fillStyle(0x00aa44, 0.65); cu.fillRect(10, 14, 30, 2)
    cu.fillStyle(0x00aa44, 0.5); cu.fillRect(10, 18, 48, 2)
    cu.fillStyle(0x00aa44, 0.45); cu.fillRect(10, 22, 22, 2)
    cu.fillStyle(0x0055cc, 0.7); cu.fillRect(10, 26, 42, 6)
    cu.fillStyle(0x263a52); cu.fillRect(4, 40, 64, 8)
    for (let bi = 0; bi < 8; bi++) {
      cu.fillStyle([0x00cc44, 0x00cc44, 0x00cc44, 0xffcc00, 0xffcc00, 0x4499ff, 0x4499ff, 0xff4400][bi])
      cu.fillRect(6 + bi * 8, 41, 6, 6)
    }
    cu.fillStyle(0x263238); cu.fillRect(8, 48, 16, 4); cu.fillRect(48, 48, 16, 4)
    cu.generateTexture('scn-console-unit', 72, 52); cu.destroy()

    // Security camera — wall mount (32×22)
    const sc = this.g()
    sc.fillStyle(0x263238); sc.fillRect(12, 0, 8, 8)
    sc.fillStyle(0x37474f); sc.fillRect(8, 6, 16, 12)
    sc.fillStyle(0x1a2226); sc.fillRect(10, 8, 12, 8)
    sc.fillStyle(0x000000); sc.fillCircle(16, 12, 4)
    sc.fillStyle(0x002255); sc.fillCircle(16, 12, 3)
    sc.fillStyle(0x3366cc); sc.fillCircle(16, 12, 1)
    sc.fillStyle(0xff1744); sc.fillRect(24, 7, 4, 4)
    sc.fillStyle(0xff6666, 0.6); sc.fillRect(25, 8, 2, 2)
    sc.generateTexture('scn-sec-camera', 32, 22); sc.destroy()
  }

  private genLevel1Scenery() {
    // Horizontal I-beam girder (192×20)
    const gb = this.g()
    gb.fillStyle(0x37474f); gb.fillRect(0, 4, 192, 12)          // web
    gb.fillStyle(0x546e7a); gb.fillRect(0, 0, 192, 4)           // top flange
    gb.fillStyle(0x263238); gb.fillRect(0, 16, 192, 4)          // bottom flange
    gb.fillStyle(0x607d8b); gb.fillRect(0, 1, 192, 2)           // top highlight
    // Rivet bolts
    for (let x = 12; x < 192; x += 32) {
      gb.fillStyle(0x78909c); gb.fillRect(x, 6, 6, 8)
      gb.fillStyle(0x90a4ae); gb.fillRect(x + 1, 7, 2, 2)
    }
    gb.generateTexture('scn-girder', 192, 20); gb.destroy()

    // Porthole viewport (60×60)
    const vp = this.g()
    vp.fillStyle(0x263238); vp.fillCircle(30, 30, 29)           // outer rim
    vp.fillStyle(0x546e7a); vp.fillCircle(30, 30, 27)           // rim bevel
    vp.fillStyle(0x0d1b2a); vp.fillCircle(30, 30, 23)           // glass
    vp.fillStyle(0x001a3a, 0.8); vp.fillCircle(30, 30, 22)      // deep space
    // Stars in glass
    for (const [sx, sy] of [[22,24],[36,18],[18,34],[38,36],[28,38],[32,22],[24,40]]) {
      vp.fillStyle(0xffffff, 0.9); vp.fillRect(sx, sy, 2, 2)
    }
    // Rim bolts
    for (let a = 0; a < 6; a++) {
      const bx = 30 + Math.round(Math.cos(a * Math.PI / 3) * 26)
      const by = 30 + Math.round(Math.sin(a * Math.PI / 3) * 26)
      vp.fillStyle(0x78909c); vp.fillRect(bx - 2, by - 2, 4, 4)
    }
    // Reflection glints
    vp.fillStyle(0xffffff, 0.35); vp.fillEllipse(22, 20, 10, 5)
    vp.generateTexture('scn-viewport', 60, 60); vp.destroy()

    // Equipment panel with lights (104×48)
    const ep = this.g()
    ep.fillStyle(0x37474f); ep.fillRect(0, 0, 104, 48)
    ep.fillStyle(0x546e7a); ep.fillRect(0, 0, 104, 3)           // top edge
    ep.fillStyle(0x263238); ep.fillRect(0, 45, 104, 3)          // bottom edge
    ep.fillStyle(0x1a2a36); ep.fillRect(6, 8, 44, 28)           // dark screen area
    ep.fillStyle(0x002244); ep.fillRect(8, 10, 40, 24)          // screen glow
    // Screen scanlines
    for (let sy = 12; sy < 34; sy += 4) {
      ep.fillStyle(0x003366, 0.5); ep.fillRect(8, sy, 40, 2)
    }
    // LED indicators
    const leds = [0xff1744, 0x00e676, 0xffea00, 0x40c4ff, 0x00e676, 0xff1744]
    for (let i = 0; i < 6; i++) {
      ep.fillStyle(leds[i]); ep.fillRect(58 + i * 7, 10, 5, 5)
      ep.fillStyle(0xffffff, 0.5); ep.fillRect(59 + i * 7, 11, 2, 2)
    }
    // Buttons row
    ep.fillStyle(0x455a64); ep.fillRect(56, 22, 44, 14)
    for (let i = 0; i < 5; i++) {
      ep.fillStyle(0x607d8b); ep.fillRect(58 + i * 8, 25, 6, 8)
      ep.fillStyle(0x78909c); ep.fillRect(59 + i * 8, 26, 2, 2)
    }
    ep.generateTexture('scn-panel', 104, 48); ep.destroy()

    // Vertical support strut (20×96)
    const sv = this.g()
    sv.fillStyle(0x37474f); sv.fillRect(0, 0, 20, 96)
    sv.fillStyle(0x546e7a); sv.fillRect(0, 0, 4, 96)            // left highlight
    sv.fillStyle(0x263238); sv.fillRect(16, 0, 4, 96)           // right shadow
    // Cross-bracing rings every 24px
    for (let ry = 8; ry < 96; ry += 24) {
      sv.fillStyle(0x455a64); sv.fillRect(0, ry, 20, 6)
      sv.fillStyle(0x607d8b); sv.fillRect(2, ry + 1, 16, 2)
    }
    sv.generateTexture('scn-strut-v', 20, 96); sv.destroy()

    // Satellite dish (72×52)
    const sa = this.g()
    sa.fillStyle(0x546e7a); sa.fillRect(34, 30, 4, 22)          // mast
    sa.fillStyle(0x455a64); sa.fillRect(28, 48, 16, 4)          // base
    // Dish bowl (open ellipse = multiple arcs)
    sa.lineStyle(4, 0x78909c); sa.strokeEllipse(36, 24, 64, 36)
    sa.fillStyle(0x37474f, 0.6); sa.fillEllipse(36, 24, 60, 32)
    sa.lineStyle(2, 0x90a4ae); sa.strokeEllipse(36, 24, 64, 36)
    // Feed horn
    sa.fillStyle(0x90a4ae); sa.fillRect(34, 6, 4, 12)
    sa.fillStyle(0xb0bec5); sa.fillRect(32, 4, 8, 4)
    sa.generateTexture('scn-antenna', 72, 52); sa.destroy()

    // Warning stripe tape (88×14)
    const wt = this.g()
    for (let i = 0; i < 12; i++) {
      wt.fillStyle(i % 2 === 0 ? 0xffd600 : 0x111111)
      wt.fillRect(i * 8 - 4, 0, 12, 14)
    }
    wt.fillStyle(0xffd600, 0.3); wt.fillRect(0, 0, 88, 3)      // sheen
    wt.generateTexture('scn-warning', 88, 14); wt.destroy()
  }

  private genLevel2Scenery() {
    // Large asteroid (120×88)
    const al = this.g()
    al.fillStyle(0x3e2723); al.fillEllipse(60, 44, 112, 82)     // body
    al.fillStyle(0x4e342e); al.fillEllipse(52, 36, 80, 60)      // highlight mass
    al.fillStyle(0x5d4037); al.fillEllipse(38, 28, 40, 30)      // lighter face
    al.fillStyle(0x6d4c41); al.fillEllipse(36, 26, 24, 18)      // bright spot
    // Craters
    al.fillStyle(0x2a1a15); al.fillCircle(80, 30, 14)
    al.fillStyle(0x3e2723); al.fillCircle(80, 30, 10)
    al.fillStyle(0x2a1a15); al.fillCircle(42, 62, 10)
    al.fillStyle(0x3e2723); al.fillCircle(42, 62, 7)
    al.fillStyle(0x2a1a15); al.fillCircle(90, 58, 7)
    al.fillStyle(0x3e2723); al.fillCircle(90, 58, 5)
    // Surface detail lines
    al.lineStyle(2, 0x2a1a15, 0.5)
    al.strokeEllipse(60, 44, 108, 78)
    al.generateTexture('scn-asteroid-lg', 120, 88); al.destroy()

    // Small asteroid (56×40)
    const as = this.g()
    as.fillStyle(0x3e2723); as.fillEllipse(28, 20, 52, 36)
    as.fillStyle(0x4e342e); as.fillEllipse(22, 16, 32, 22)
    as.fillStyle(0x5d4037); as.fillEllipse(18, 14, 16, 12)
    as.fillStyle(0x2a1a15); as.fillCircle(38, 12, 7)
    as.fillStyle(0x3e2723); as.fillCircle(38, 12, 5)
    as.fillStyle(0x2a1a15); as.fillCircle(18, 28, 5)
    as.fillStyle(0x3e2723); as.fillCircle(18, 28, 3)
    as.generateTexture('scn-asteroid-sm', 56, 40); as.destroy()

    // Rocky formation / spire (48×72)
    const rf = this.g()
    rf.fillStyle(0x4e342e); rf.fillPoints([
      {x:24,y:0},{x:40,y:20},{x:46,y:40},{x:44,y:72},
      {x:4,y:72},{x:2,y:40},{x:8,y:20}
    ], true)
    rf.fillStyle(0x5d4037); rf.fillPoints([
      {x:24,y:0},{x:32,y:18},{x:36,y:40},{x:24,y:40},{x:12,y:36},{x:16,y:16}
    ], true)
    rf.fillStyle(0x6d4c41, 0.6); rf.fillTriangle(24, 0, 20, 20, 28, 20)
    rf.fillStyle(0x2a1a15); rf.fillRect(6, 50, 36, 22)          // base shadow
    rf.generateTexture('scn-rock-spire', 48, 72); rf.destroy()

    // Floating debris chunk (32×28)
    const dc = this.g()
    dc.fillStyle(0x4e342e); dc.fillPoints([
      {x:8,y:0},{x:28,y:2},{x:32,y:12},{x:26,y:28},{x:6,y:28},{x:0,y:16}
    ], true)
    dc.fillStyle(0x5d4037); dc.fillPoints([
      {x:8,y:0},{x:22,y:2},{x:26,y:12},{x:18,y:20},{x:6,y:16}
    ], true)
    dc.fillStyle(0x6d4c41); dc.fillRect(10, 4, 8, 6)
    dc.generateTexture('scn-debris', 32, 28); dc.destroy()
  }

  private genLevel3Scenery() {
    // Tall crystal (28×80)
    const cl = this.g()
    // Facets
    cl.fillStyle(0x1565c0); cl.fillTriangle(14, 0, 28, 80, 0, 80)    // base shape
    cl.fillStyle(0x1976d2); cl.fillTriangle(14, 0, 22, 80, 6, 80)    // lighter face
    cl.fillStyle(0x42a5f5); cl.fillTriangle(14, 0, 18, 60, 10, 60)   // bright face
    cl.fillStyle(0x90caf9, 0.6); cl.fillTriangle(14, 0, 16, 30, 12, 30) // near tip glow
    cl.lineStyle(2, 0x0d47a1); cl.lineBetween(14, 0, 0, 80)
    cl.lineStyle(2, 0x0d47a1); cl.lineBetween(14, 0, 28, 80)
    // Internal refraction lines
    cl.lineStyle(1, 0x64b5f6, 0.5); cl.lineBetween(14, 0, 8, 80)
    cl.lineStyle(1, 0x64b5f6, 0.5); cl.lineBetween(14, 0, 20, 80)
    cl.generateTexture('scn-crystal-lg', 28, 80); cl.destroy()

    // Short crystal (20×52)
    const cs = this.g()
    cs.fillStyle(0x4527a0); cs.fillTriangle(10, 0, 20, 52, 0, 52)
    cs.fillStyle(0x5e35b1); cs.fillTriangle(10, 0, 16, 52, 4, 52)
    cs.fillStyle(0x9575cd); cs.fillTriangle(10, 0, 13, 34, 7, 34)
    cs.fillStyle(0xd1c4e9, 0.5); cs.fillTriangle(10, 0, 11, 18, 9, 18)
    cs.lineStyle(1, 0x311b92); cs.lineBetween(10, 0, 0, 52)
    cs.lineStyle(1, 0x311b92); cs.lineBetween(10, 0, 20, 52)
    cs.generateTexture('scn-crystal-sm', 20, 52); cs.destroy()

    // Crystal cluster (88×68)
    const cc = this.g()
    // Multiple crystals overlapping
    cc.fillStyle(0x0d47a1); cc.fillTriangle(28, 0,  44, 68, 12, 68)
    cc.fillStyle(0x1565c0); cc.fillTriangle(28, 0,  36, 68, 16, 68)
    cc.fillStyle(0x1976d2); cc.fillTriangle(28, 0,  32, 44, 22, 44)
    cc.fillStyle(0x311b92); cc.fillTriangle(62, 8,  76, 68, 48, 68)
    cc.fillStyle(0x4527a0); cc.fillTriangle(62, 8,  70, 68, 52, 68)
    cc.fillStyle(0x5e35b1); cc.fillTriangle(62, 8,  67, 48, 57, 48)
    cc.fillStyle(0x7b1fa2); cc.fillTriangle(10, 18, 20, 68, 0, 68)
    cc.fillStyle(0x8e24aa); cc.fillTriangle(10, 18, 16, 68, 4, 68)
    cc.fillStyle(0x90caf9, 0.4); cc.fillRect(22, 0, 12, 30)     // glow center
    cc.generateTexture('scn-crystal-cluster', 88, 68); cc.destroy()

    // Stalactite (24×60)
    const st = this.g()
    st.fillStyle(0x4a0000); st.fillTriangle(12, 60, 24, 0, 0, 0) // main body
    st.fillStyle(0x7f0000); st.fillTriangle(12, 60, 18, 0, 6, 0) // lighter face
    st.fillStyle(0xc62828); st.fillTriangle(12, 60, 15, 20, 9, 20) // hot crack face
    st.fillStyle(0xff5722, 0.5); st.fillRect(10, 50, 4, 8)       // tip glow
    st.lineStyle(1, 0x2c0000); st.lineBetween(12, 60, 0, 0)
    st.lineStyle(1, 0x2c0000); st.lineBetween(12, 60, 24, 0)
    st.generateTexture('scn-stalactite', 24, 60); st.destroy()

    // Lava pool surface (128×22)
    const lp = this.g()
    lp.fillStyle(0x4a0000); lp.fillRect(0, 8, 128, 14)           // deep lava
    lp.fillStyle(0xb71c1c); lp.fillRect(0, 4, 128, 8)            // bright lava
    lp.fillStyle(0xff5722); lp.fillRect(0, 2, 128, 4)            // surface
    lp.fillStyle(0xff8a65); lp.fillRect(0, 0, 128, 2)            // hot edge
    // Bubbles
    for (const [bx, by, br] of [[16,6,4],[42,4,5],[78,6,4],[104,4,5],[58,8,3]]) {
      lp.fillStyle(0xff6f00); lp.fillCircle(bx, by, br)
      lp.fillStyle(0xff8a65); lp.fillCircle(bx - 1, by - 1, Math.max(1, br - 2))
    }
    lp.generateTexture('scn-lava-pool', 128, 22); lp.destroy()

    // Heat vent (32×32)
    const hv = this.g()
    hv.fillStyle(0x263238); hv.fillRect(0, 8, 32, 24)            // body
    hv.fillStyle(0x37474f); hv.fillRect(0, 8, 32, 6)             // top rim
    hv.fillStyle(0x1a0000); hv.fillEllipse(16, 14, 24, 14)       // vent opening
    // Heat shimmer rings
    hv.lineStyle(2, 0xff5722, 0.7); hv.strokeEllipse(16, 8, 24, 10)
    hv.lineStyle(2, 0xff8a65, 0.4); hv.strokeEllipse(16, 4, 28, 10)
    hv.lineStyle(2, 0xffab40, 0.2); hv.strokeEllipse(16, 0, 32, 10)
    hv.generateTexture('scn-vent', 32, 32); hv.destroy()
  }

  private genCollectibles() {
    // Heart — Zelda-style pixel heart
    const ht = this.g()
    ht.fillStyle(0xff1744)
    ht.fillRect(1, 2, 8, 1);  ht.fillRect(15, 2, 8, 1)
    ht.fillRect(1, 3, 9, 1);  ht.fillRect(14, 3, 9, 1)
    ht.fillRect(0, 4, 11, 1); ht.fillRect(13, 4, 11, 1)
    ht.fillRect(0, 5, 24, 8)
    ht.fillRect(1, 13, 22, 2)
    ht.fillRect(3, 15, 18, 2)
    ht.fillRect(5, 17, 14, 2)
    ht.fillRect(7, 19, 10, 2)
    ht.fillRect(9, 21, 6, 2)
    ht.fillRect(11, 23, 2, 2)
    ht.fillStyle(0xff8fa3); ht.fillRect(3, 3, 4, 4)
    ht.fillStyle(0xff8fa3); ht.fillRect(17, 3, 4, 4)
    ht.generateTexture('item-heart', 24, 28); ht.destroy()

    // Ability icons (16×16)
    const ifire = this.g()
    ifire.fillStyle(0xff6600)
    ifire.fillRect(7, 0, 2, 2); ifire.fillRect(5, 2, 6, 3); ifire.fillRect(4, 5, 8, 5); ifire.fillRect(3, 10, 10, 4)
    ifire.fillStyle(0xff0000); ifire.fillRect(6, 4, 4, 6)
    ifire.fillStyle(0xffdd00); ifire.fillRect(7, 7, 2, 5)
    ifire.generateTexture('icon-fire', 16, 16); ifire.destroy()


    const ielec = this.g()
    ielec.fillStyle(0xffdd00)
    ielec.fillRect(9, 1, 4, 6); ielec.fillRect(5, 7, 6, 2); ielec.fillRect(3, 9, 4, 6)
    ielec.fillStyle(0xffffff); ielec.fillRect(10, 2, 2, 3)
    ielec.generateTexture('icon-electric', 16, 16); ielec.destroy()

    const iice = this.g()
    iice.fillStyle(0x88ddff)
    iice.fillRect(7, 0, 2, 16); iice.fillRect(0, 7, 16, 2)
    iice.fillRect(3, 3, 2, 2); iice.fillRect(11, 3, 2, 2)
    iice.fillRect(3, 11, 2, 2); iice.fillRect(11, 11, 2, 2)
    iice.fillStyle(0xffffff); iice.fillRect(7, 0, 2, 3)
    iice.generateTexture('icon-ice', 16, 16); iice.destroy()

    // Star — extra life
    const ls = this.g()
    ls.fillStyle(0xffd600)
    ls.fillPoints(this.starPts(14, 14, 13, 5, 5), true)
    ls.fillStyle(0xffe57f)
    ls.fillPoints(this.starPts(14, 14, 6, 2, 5), true)
    ls.fillStyle(0xffffff, 0.7); ls.fillRect(10, 8, 5, 4)        // sheen
    ls.lineStyle(2, 0xf9a825)
    ls.strokePoints(this.starPts(14, 14, 13, 5, 5), true)
    ls.generateTexture('item-life', 28, 28); ls.destroy()

    // Ability orb — generic (tinted at runtime per ability)
    const ob = this.g()
    ob.fillStyle(0xffffff); ob.fillCircle(12, 12, 11)            // white base (tinted)
    ob.fillStyle(0xffffff, 0.6); ob.fillEllipse(8, 8, 10, 6)    // inner glow
    ob.lineStyle(2, 0xcccccc); ob.strokeCircle(12, 12, 11)
    ob.fillStyle(0xffffff, 0.9); ob.fillRect(7, 6, 4, 3)        // specular
    ob.generateTexture('item-orb', 24, 24); ob.destroy()

    // Mystery "?" item — purple diamond with question mark
    const mq = this.g()
    // Diamond shape
    mq.fillStyle(0x6a0080)
    mq.fillTriangle(14, 0,  28, 14, 14, 28)
    mq.fillTriangle(14, 0,  0,  14, 14, 28)
    mq.fillStyle(0xce93d8)
    mq.fillTriangle(14, 3,  25, 14, 14, 25)
    mq.fillTriangle(14, 3,  3,  14, 14, 25)
    mq.fillStyle(0x9c27b0, 0.7)
    mq.fillTriangle(14, 3,  14, 14, 8,  14)
    // "?" mark
    mq.fillStyle(0xffffff)
    mq.fillRect(11, 7, 6, 2)   // top arc of ?
    mq.fillRect(15, 9, 2, 4)   // right side
    mq.fillRect(11, 11, 4, 2)  // curve to center
    mq.fillRect(11, 17, 3, 3)  // dot
    // bright edge sheen
    mq.lineStyle(1, 0xf3e5f5, 0.8)
    mq.lineBetween(14, 0, 28, 14)
    mq.generateTexture('item-mystery', 28, 28); mq.destroy()
  }

  private genPlanet(key: string, r: number, base: number, land: number, atmo: number) {
    const size = r * 2 + 8
    const cx = size / 2, cy = size / 2
    const g = this.g()
    g.fillStyle(base);  g.fillCircle(cx, cy, r)
    g.fillStyle(land, 0.7)
    g.fillEllipse(cx - r * 0.2, cy - r * 0.1, r * 0.9, r * 0.6)
    g.fillEllipse(cx + r * 0.3, cy + r * 0.2, r * 0.7, r * 0.4)
    g.lineStyle(3, atmo, 0.5); g.strokeCircle(cx, cy, r + 1)
    g.generateTexture(key, size, size); g.destroy()
  }

  // ── backgrounds (512×512 tileable) ──────────────────────────────────────────

  private genBackgrounds() {
    // Shared star field — used as far layer across all levels
    const sf = this.g()
    sf.fillStyle(0x080818); sf.fillRect(0, 0, 512, 512)
    // Tiny stars
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * 512)
      const y = Math.floor(Math.random() * 512)
      const v = 180 + Math.floor(Math.random() * 75)
      sf.fillStyle(Phaser.Display.Color.GetColor(v, v, Math.min(255, v + 30)))
      const s = Math.random() < 0.15 ? 2 : 1
      sf.fillRect(x, y, s, s)
    }
    sf.generateTexture('bg-stars', 512, 512); sf.destroy()

    // Level 1 mid — blue/purple nebula
    this.genNebula('bg-nebula-blue', [0x1a0050, 0x002080, 0x0a006a, 0x1b004a])

    // Level 2 mid — deeper purple
    this.genNebula('bg-nebula-purple', [0x2d0050, 0x4a0080, 0x1a0050, 0x300040])

    // Level 3 mid — red/orange (core heat)
    this.genNebula('bg-nebula-red', [0x4a0000, 0x7f0000, 0x3d0000, 0x5a0000])
  }

  private genNebula(key: string, colors: number[]) {
    const g = this.g()
    g.fillStyle(0x080818); g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 12; i++) {
      const x  = Math.random() * 512
      const y  = Math.random() * 512
      const rx = 60 + Math.random() * 100
      const ry = 40 + Math.random() * 80
      const c  = colors[i % colors.length]
      g.fillStyle(c, 0.18 + Math.random() * 0.18)
      g.fillEllipse(x, y, rx, ry)
    }
    // Faint stars on top
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * 512)
      const y = Math.floor(Math.random() * 512)
      g.fillStyle(0xffffff, 0.6)
      g.fillRect(x, y, 1, 1)
    }
    g.generateTexture(key, 512, 512); g.destroy()
  }

  // ── interior level backgrounds ───────────────────────────────────────────────

  private genInteriorBackgrounds() {
    this.genStationInterior()
    this.genCaveRock()
    this.genMagmaWall()
  }

  private genStationInterior() {
    // Far layer — metal hull plating with pipes, panels, and lighting strips
    const g = this.g()
    g.fillStyle(0x0b0f18); g.fillRect(0, 0, 512, 512)

    // 4 horizontal panel rows (128px each)
    for (let row = 0; row < 4; row++) {
      const py = row * 128
      g.fillStyle(row % 2 === 0 ? 0x131b2a : 0x0f1420)
      g.fillRect(0, py + 2, 512, 124)
      g.fillStyle(0x1e2d42); g.fillRect(0, py, 512, 2)          // top seam highlight
      g.fillStyle(0x04070d); g.fillRect(0, py + 126, 512, 2)    // bottom seam shadow

      // 4 vertical columns per panel
      for (let col = 0; col < 4; col++) {
        const px = col * 128
        g.fillStyle(0x04070d); g.fillRect(px, py + 2, 2, 124)       // vertical seam dark
        g.fillStyle(0x1c2a3c); g.fillRect(px + 2, py + 2, 1, 124)   // seam edge bright
        // Rivet bolts
        g.fillStyle(0x263a52); g.fillRect(px + 7,  py + 7,   7, 7)
        g.fillStyle(0x384e68); g.fillRect(px + 8,  py + 8,   3, 2)
        g.fillStyle(0x04070d); g.fillRect(px + 10, py + 10,  3, 3)
        g.fillStyle(0x263a52); g.fillRect(px + 7,  py + 114, 7, 7)
        g.fillStyle(0x384e68); g.fillRect(px + 8,  py + 115, 3, 2)
        g.fillStyle(0x04070d); g.fillRect(px + 10, py + 117, 3, 3)
      }
    }

    // Main pipe conduit between rows 1 and 2
    const pipeY = 248
    g.fillStyle(0x14203a); g.fillRect(0, pipeY, 512, 18)
    g.fillStyle(0x243452); g.fillRect(0, pipeY, 512, 4)
    g.fillStyle(0x050810); g.fillRect(0, pipeY + 14, 512, 4)
    for (let fx = 14; fx < 512; fx += 72) {
      g.fillStyle(0x1a2e48); g.fillRect(fx, pipeY - 6, 12, 30)
      g.fillStyle(0x2a4260); g.fillRect(fx + 1, pipeY - 5, 10, 4)
      g.fillStyle(0x05080f); g.fillRect(fx + 1, pipeY + 24, 10, 4)
    }

    // Thinner cable bundle near top of panel row 1
    g.fillStyle(0x0e1826); g.fillRect(0, 120, 512, 8)
    g.fillStyle(0x1a2c40); g.fillRect(0, 120, 512, 2)
    g.fillStyle(0x030508); g.fillRect(0, 126, 512, 2)
    for (let cx = 24; cx < 512; cx += 56) {
      g.fillStyle(0x1e3050); g.fillRect(cx, 118, 8, 12)
      g.fillStyle(0x283e60); g.fillRect(cx + 1, 119, 6, 3)
    }

    // Equipment panels on wall face (small screen recesses)
    for (const [px, py] of [[64, 200], [192, 80], [320, 330], [448, 200], [128, 440], [384, 60]] as [number,number][]) {
      g.fillStyle(0x0e1828); g.fillRect(px - 14, py - 10, 28, 20)
      g.fillStyle(0x001c2e); g.fillRect(px - 12, py - 8,  24, 16)
      g.fillStyle(0x002840, 0.7); g.fillRect(px - 11, py - 7, 22, 14)
      g.fillStyle(0x003858, 0.4); g.fillRect(px - 10, py - 6, 20, 12)
      g.fillStyle(0x00cc44, 0.85); g.fillRect(px - 10, py + 5, 3, 3)
      g.fillStyle(0xff4400, 0.7);  g.fillRect(px - 5,  py + 5, 3, 3)
    }

    // Vent grille strip at y=380
    g.fillStyle(0x0a1020); g.fillRect(0, 377, 512, 10)
    for (let vx = 4; vx < 512; vx += 12) {
      g.fillStyle(0x0e1828); g.fillRect(vx, 379, 8, 6)
      g.fillStyle(0x06090f); g.fillRect(vx + 1, 380, 4, 4)
    }

    // Ceiling lighting housing
    g.fillStyle(0x0a1520); g.fillRect(0, 0, 512, 8)
    g.fillStyle(0x152030, 0.8); g.fillRect(0, 2, 512, 4)
    g.fillStyle(0x1a2a38, 0.5); g.fillRect(0, 3, 512, 2)

    g.generateTexture('bg-station-interior', 512, 512); g.destroy()

    // Mid layer — ambient blue glow and scan lines (transparent base)
    const gm = this.g()
    // Ceiling light diffuse
    for (let i = 0; i < 8; i++) {
      gm.fillStyle(0x001e34, 0.055 - i * 0.006); gm.fillRect(0, i * 5, 512, 5)
    }
    // Faint horizontal scan lines across whole texture
    for (let y = 0; y < 512; y += 6) {
      gm.fillStyle(0x00101c, 0.035); gm.fillRect(0, y, 512, 2)
    }
    // Screen glow patches around the equipment panels
    for (const [x, y] of [[64, 200], [320, 330], [448, 200], [128, 440], [384, 60]] as [number,number][]) {
      gm.fillStyle(0x001828, 0.22); gm.fillEllipse(x, y, 70, 35)
      gm.fillStyle(0x002840, 0.13); gm.fillEllipse(x, y, 36, 18)
    }
    // Pipe glow halo
    gm.fillStyle(0x001428, 0.1); gm.fillRect(0, pipeY - 8, 512, 34)
    // Warning indicator glows at bottom
    for (const x of [48, 160, 272, 384, 496]) {
      gm.fillStyle(0x441000, 0.2); gm.fillEllipse(x, 508, 28, 10)
      gm.fillStyle(0xaa3300, 0.12); gm.fillEllipse(x, 508, 12, 5)
    }
    gm.generateTexture('bg-station-glow', 512, 512); gm.destroy()
  }

  private genCaveRock() {
    // Far layer — rough asteroid cave walls with mineral dust
    const g = this.g()
    g.fillStyle(0x0a0806); g.fillRect(0, 0, 512, 512)

    // Large rock mass blobs
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const rx = 50 + Math.random() * 120, ry = rx * (0.4 + Math.random() * 0.5)
      const shades = [0x161008, 0x1c1409, 0x201a0a, 0x181209]
      g.fillStyle(shades[Math.floor(Math.random() * 4)], 0.5 + Math.random() * 0.35)
      g.fillEllipse(x, y, rx * 2, ry * 2)
    }
    // Mid-detail blobs
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const rx = 15 + Math.random() * 45, ry = rx * (0.5 + Math.random() * 0.5)
      const shades = [0x241a0c, 0x281e0e, 0x2c200f, 0x1e160a]
      g.fillStyle(shades[Math.floor(Math.random() * 4)], 0.4 + Math.random() * 0.3)
      g.fillEllipse(x, y, rx * 2, ry * 2)
    }
    // Surface cracks
    for (let i = 0; i < 14; i++) {
      const x1 = Math.random() * 512, y1 = Math.random() * 512
      const x2 = x1 + (Math.random() - 0.5) * 90, y2 = y1 + (Math.random() - 0.5) * 70
      g.lineStyle(1, 0x040300, 0.55); g.lineBetween(x1, y1, x2, y2)
    }
    // Mineral dust / particle glints
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const t = Math.floor(Math.random() * 3)
      if (t === 0) {
        g.fillStyle(0x664400, 0.38); g.fillRect(x, y, 2, 2)
        g.fillStyle(0xaa6600, 0.22); g.fillRect(x, y, 1, 1)
      } else if (t === 1) {
        g.fillStyle(0x112244, 0.3); g.fillRect(x, y, 2, 2)
        g.fillStyle(0x224488, 0.18); g.fillRect(x, y, 1, 1)
      } else {
        g.fillStyle(0x2a2420, 0.45); g.fillRect(x, y, 1, 1)
      }
    }
    g.generateTexture('bg-cave-rock', 512, 512); g.destroy()

    // Mid layer — amber mineral glow and crystal scatter (transparent base)
    const gm = this.g()
    for (let i = 0; i < 9; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      gm.fillStyle(0x2a1000, 0.28); gm.fillEllipse(x, y, 110 + Math.random() * 90, 40 + Math.random() * 36)
      gm.fillStyle(0x4a2000, 0.18); gm.fillEllipse(x, y, 55 + Math.random() * 40, 18 + Math.random() * 18)
      gm.fillStyle(0x774400, 0.1);  gm.fillEllipse(x, y, 22, 9)
    }
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      gm.fillStyle(0x001128, 0.22); gm.fillEllipse(x, y, 50, 20)
      gm.fillStyle(0x002244, 0.14); gm.fillEllipse(x, y, 24, 10)
      gm.fillStyle(0x3366aa, 0.07); gm.fillEllipse(x, y, 10, 4)
    }
    gm.generateTexture('bg-cave-glow', 512, 512); gm.destroy()
  }

  private genMagmaWall() {
    // Far layer — dark basalt with glowing magma seams and pooling lava
    const g = this.g()
    g.fillStyle(0x0d0400); g.fillRect(0, 0, 512, 512)

    // Dark basalt rock masses
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const rx = 40 + Math.random() * 100, ry = rx * (0.35 + Math.random() * 0.5)
      const shades = [0x1a0600, 0x200800, 0x180500, 0x240900]
      g.fillStyle(shades[Math.floor(Math.random() * 4)], 0.5 + Math.random() * 0.35)
      g.fillEllipse(x, y, rx * 2, ry * 2)
    }
    // Brighter rock face highlights
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const rx = 20 + Math.random() * 50, ry = rx * (0.4 + Math.random() * 0.4)
      g.fillStyle(0x2e0a00, 0.35 + Math.random() * 0.2)
      g.fillEllipse(x, y, rx * 2, ry * 2)
    }
    // Glowing magma crack veins
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const len = 30 + Math.random() * 90
      const angle = Math.random() * Math.PI * 2
      const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len
      g.lineStyle(5, 0x440a00, 0.28); g.lineBetween(x, y, x2, y2)
      g.lineStyle(3, 0x882000, 0.35); g.lineBetween(x, y, x2, y2)
      g.lineStyle(1, 0xff6600, 0.4);  g.lineBetween(x, y, x2, y2)
    }
    // Magma pool blobs
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      g.fillStyle(0x3d0d00, 0.45); g.fillEllipse(x, y, 80 + Math.random() * 80, 28 + Math.random() * 28)
      g.fillStyle(0x7a2200, 0.3);  g.fillEllipse(x, y, 40 + Math.random() * 40, 14 + Math.random() * 14)
      g.fillStyle(0xcc5500, 0.2);  g.fillEllipse(x, y, 16, 7)
      g.fillStyle(0xff9900, 0.12); g.fillEllipse(x, y, 7, 3)
    }
    g.generateTexture('bg-magma-wall', 512, 512); g.destroy()

    // Mid layer — heat haze and glow (transparent base)
    const gm = this.g()
    // Warm underlit glow rising from bottom
    for (let i = 0; i < 10; i++) {
      gm.fillStyle(0x280800, 0.06 + i * 0.005); gm.fillRect(0, 512 - (i + 1) * 28, 512, 28)
    }
    // Heat shimmer bands
    for (let y = 0; y < 512; y += 42) {
      gm.fillStyle(0x1a0400, 0.04 + Math.random() * 0.03); gm.fillRect(0, y, 512, 21)
    }
    // Intense hot glow pools
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      gm.fillStyle(0x4a0e00, 0.28); gm.fillEllipse(x, y, 150, 58)
      gm.fillStyle(0x882000, 0.2);  gm.fillEllipse(x, y, 70, 26)
      gm.fillStyle(0xdd5500, 0.12); gm.fillEllipse(x, y, 26, 10)
      gm.fillStyle(0xff9900, 0.06); gm.fillEllipse(x, y, 10, 4)
    }
    // Crack glow traces on the mid overlay
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 512, y = Math.random() * 512
      const len = 20 + Math.random() * 60
      const angle = Math.random() * Math.PI * 2
      const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len
      gm.lineStyle(3, 0x882000, 0.22); gm.lineBetween(x, y, x2, y2)
      gm.lineStyle(1, 0xff6600, 0.28); gm.lineBetween(x, y, x2, y2)
    }
    gm.generateTexture('bg-magma-heat', 512, 512); gm.destroy()
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private g() { return this.make.graphics({ x: 0, y: 0 }) }

  private starPts(cx: number, cy: number, outerR: number, innerR: number, n: number) {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (i * Math.PI / n) - Math.PI / 2
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    }
    return pts
  }
}
