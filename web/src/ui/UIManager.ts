import Phaser from 'phaser'
import { Player } from '../game/Player'
import { AbilityType } from '../types'

export const ABILITY_COLORS: Record<AbilityType, number> = {
  [AbilityType.None]:      0x222222,
  [AbilityType.Fire]:      0xff6600,
  [AbilityType.Lightning]: 0xffdd00,
  [AbilityType.Ice]:       0x66ccff,
  [AbilityType.Bat]:       0x222222,
}

const ABILITY_ICON_KEYS: Partial<Record<AbilityType, string>> = {
  [AbilityType.Fire]:     'fire_ability_icon',
  [AbilityType.Lightning]: 'lightning_ability_icon',
  [AbilityType.Ice]:      'ice_ability_icon',
}

const FONT = '"Press Start 2P", monospace'

export class UIManager {
  private scene: Phaser.Scene
  private heartIcons: Phaser.GameObjects.Image[][] = []
  private abilityIcons: Phaser.GameObjects.Image[] = []
  private ammoPips: Phaser.GameObjects.Rectangle[][] = []
  private abilityBoxXs: number[] = []
  private rowYs: number[] = []
  private bossBarFill: Phaser.GameObjects.Rectangle | null = null
  private bossHudObjects: Phaser.GameObjects.GameObject[] = []
  private emptyAbilityIcons: Phaser.GameObjects.Image[] = []
  private speedBoostIcons: Phaser.GameObjects.Image[] = []
  private strengthBoostIcons: Phaser.GameObjects.Image[] = []
  private wormCountText: Phaser.GameObjects.Text | null = null
  private rolyPolyCountText: Phaser.GameObjects.Text | null = null

  constructor(
    scene: Phaser.Scene,
    playerCount: number,
    _worldName = '',
    isBossRoom = false,
    bossMaxHp = 0,
    bossName = 'BOSS',
  ) {
    this.scene = scene
    const { width } = scene.scale

    if (isBossRoom && bossMaxHp > 0) {
      const bx = width - 110
      const by = 22
      const bossLabel = scene.add.text(bx, by - 10, bossName, {
        fontSize: '8px', fontFamily: FONT, color: '#ff4444',
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20)

      const bossBg = scene.add.rectangle(bx, by, 152, 12, 0x330000)
        .setScrollFactor(0).setDepth(20)

      this.bossBarFill = scene.add.rectangle(bx - 75, by, 150, 10, 0xff2200)
        .setOrigin(0, 0.5)
        .setScrollFactor(0).setDepth(21)

      this.bossHudObjects = [bossLabel, bossBg, this.bossBarFill]
    }

    // All players stack vertically on the left
    const ROW_H    = 42
    const HEAD_SZ  = 56   // display size of the head portrait
    const HEAD_CX  = 32   // center-x of head portrait
    const SHIFT    = 40   // how far hearts/ability shift right to make room
    const ABX      = 172 + SHIFT   // ability box x (212)
    const FALLBACK_COLORS = [0xffe066, 0x00ccff, 0x44ff88, 0xff8c00]

    const selectedChars: string[] | undefined = scene.registry.get('selectedChars')

    for (let i = 0; i < playerCount; i++) {
      const rowY = 22 + i * ROW_H
      this.rowYs.push(rowY)

      // Black background strip behind this player's HUD row
      scene.add.rectangle(160, rowY, 320, ROW_H, 0x000000, 0.82)
        .setScrollFactor(0).setDepth(19)

      // Character head portrait
      const charKey   = selectedChars?.[i]
      const headKey   = charKey ? `head-${charKey}` : ''
      const hasHead   = headKey !== '' && scene.textures.exists(headKey)
      if (hasHead) {
        scene.add.image(HEAD_CX, rowY, headKey)
          .setDisplaySize(HEAD_SZ, HEAD_SZ)
          .setScrollFactor(0).setDepth(21)
      } else {
        scene.add.rectangle(HEAD_CX, rowY, HEAD_SZ, HEAD_SZ, FALLBACK_COLORS[i] ?? 0x888888, 0.6)
          .setScrollFactor(0).setDepth(21)
      }

      const hearts: Phaser.GameObjects.Image[] = []
      for (let h = 0; h < 5; h++) {
        const icon = scene.add.image(16 + SHIFT + h * 22 + 8, rowY, 'item-heart')
          .setScale(0.48).setScrollFactor(0).setDepth(20)
        hearts.push(icon)
      }
      this.heartIcons.push(hearts)

      this.abilityBoxXs.push(ABX)

      // Elemental ability slot (no background box)
      const emptyAbilityIcon = scene.add.image(ABX, rowY, 'empty_ability_icon')
        .setScale(0.1).setAlpha(0.25).setScrollFactor(0).setDepth(21)
      const abilityIcon = scene.add.image(ABX, rowY, 'fire_ability_icon')
        .setScale(0.1).setAlpha(0).setScrollFactor(0).setDepth(22)

      // Speed boost slot
      const speedIcon = scene.add.image(ABX + 40, rowY, 'speed_boost_icon')
        .setDisplaySize(40, 40).setAlpha(0.25).setScrollFactor(0).setDepth(21)

      // Strength boost slot
      const strengthIcon = scene.add.image(ABX + 80, rowY, 'strength_boost_icon')
        .setDisplaySize(40, 40).setAlpha(0.25).setScrollFactor(0).setDepth(21)

      this.emptyAbilityIcons.push(emptyAbilityIcon)
      this.abilityIcons.push(abilityIcon)
      this.speedBoostIcons.push(speedIcon)
      this.strengthBoostIcons.push(strengthIcon)
      this.ammoPips.push([])
    }

    // Worm + roly-poly counters — horizontally aligned just right of the black HUD strip (ends at x=320)
    const CTR_Y   = 22   // same row as the top player HUD entry
    const WORM_IX = 334  // worm icon center
    const ROLY_IX = 394  // roly-poly icon center (28px icon + 10px gap + label width ≈ 60px apart)
    if (scene.textures.exists('item-worm')) {
      scene.add.image(WORM_IX, CTR_Y, 'item-worm', 4)
        .setDisplaySize(28, 28).setScrollFactor(0).setDepth(20)
    }
    this.wormCountText = scene.add.text(WORM_IX + 17, CTR_Y, '0', {
      fontSize: '10px', fontFamily: FONT, color: '#aaffaa',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20)

    if (scene.textures.exists('item-roly-poly')) {
      scene.add.image(ROLY_IX, CTR_Y, 'item-roly-poly', 4)
        .setDisplaySize(28, 28).setScrollFactor(0).setDepth(20)
    }
    this.rolyPolyCountText = scene.add.text(ROLY_IX + 17, CTR_Y, '0', {
      fontSize: '10px', fontFamily: FONT, color: '#ffddaa',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(20)
  }

  initAbilityPips(playerIdx: number, maxAmmo: number) {
    this.ammoPips[playerIdx]?.forEach(p => p.destroy())
    this.ammoPips[playerIdx] = []
    if (maxAmmo <= 0) return

    const abx  = this.abilityBoxXs[playerIdx]
    const pipY = (this.rowYs[playerIdx] ?? 22) + 18
    const pipW = Math.min(8, Math.floor(100 / maxAmmo) - 1)
    const gap  = 1
    const totalW = maxAmmo * pipW + (maxAmmo - 1) * gap
    const startX = abx - totalW / 2

    for (let i = 0; i < maxAmmo; i++) {
      const px = startX + i * (pipW + gap) + pipW / 2
      const pip = this.scene.add.rectangle(px, pipY, pipW, 5, 0xffffff)
        .setScrollFactor(0).setDepth(20)
      this.ammoPips[playerIdx].push(pip)
    }
  }

  updateAmmo(playerIdx: number, current: number) {
    const pips = this.ammoPips[playerIdx]
    if (!pips) return
    pips.forEach((pip, i) => pip.setFillStyle(i < current ? 0xffffff : 0x333333))
  }

  update(players: Player[]) {
    players.forEach((p, i) => {
      this.heartIcons[i]?.forEach((icon, h) => icon.setAlpha(h < p.hearts ? 1 : 0.2))
      this.speedBoostIcons[i]?.setAlpha(p.speedBoostActive ? 1 : 0.25)
      this.strengthBoostIcons[i]?.setAlpha(p.strengthBoostActive ? 1 : 0.25)
    })
  }

  updateAbilityIcon(playerIdx: number, ability: AbilityType) {
    const icon = this.abilityIcons[playerIdx]
    const emptyIcon = this.emptyAbilityIcons[playerIdx]
    if (!icon) return
    const key = ABILITY_ICON_KEYS[ability]
    if (key) {
      icon.setTexture(key).setScale(0.1).setAlpha(1)
      emptyIcon?.setAlpha(0)
    } else {
      icon.setAlpha(0)
      emptyIcon?.setAlpha(0.25)
    }
  }

  updateBossBar(current: number, max: number) {
    if (!this.bossBarFill) return
    const pct = max > 0 ? Math.max(0, current / max) : 0
    this.bossBarFill.width = Math.round(200 * pct)
  }

  updateWormCount(n: number) { this.wormCountText?.setText(`${n}`) }
  updateRolyPolyCount(n: number) { this.rolyPolyCountText?.setText(`${n}`) }

  hideBossBar() {
    if (!this.bossHudObjects.length) return
    const targets = this.bossHudObjects
    this.bossHudObjects = []
    this.bossBarFill = null
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 600,
      onComplete: () => targets.forEach(o => (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy()),
    })
  }
}
