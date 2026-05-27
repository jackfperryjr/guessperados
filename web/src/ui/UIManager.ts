import Phaser from 'phaser'
import { Player } from '../game/Player'
import { AbilityType } from '../types'

export const ABILITY_COLORS: Record<AbilityType, number> = {
  [AbilityType.None]:     0x222222,
  [AbilityType.Fire]:     0xff6600,
  [AbilityType.Electric]: 0xffdd00,
  [AbilityType.Ice]:      0x66ccff,
}

const ABILITY_ICON_KEYS: Partial<Record<AbilityType, string>> = {
  [AbilityType.Fire]:     'fire_ability_icon',
  [AbilityType.Electric]: 'lightning_ability_icon',
  [AbilityType.Ice]:      'ice_ability_icon',
}

const FONT = '"Press Start 2P", monospace'

export class UIManager {
  private scene: Phaser.Scene
  private heartIcons: Phaser.GameObjects.Image[][] = []
  private abilityBoxes: Phaser.GameObjects.Rectangle[] = []
  private abilityIcons: Phaser.GameObjects.Image[] = []
  private ammoPips: Phaser.GameObjects.Rectangle[][] = []
  private abilityBoxXs: number[] = []
  private rowYs: number[] = []
  private bossBarFill: Phaser.GameObjects.Rectangle | null = null
  private noAbilityMarks: Phaser.GameObjects.Text[] = []

  constructor(
    scene: Phaser.Scene,
    playerCount: number,
    _worldName = '',
    isBossRoom = false,
    bossMaxHp = 0,
  ) {
    this.scene = scene
    const { width } = scene.scale

    if (isBossRoom && bossMaxHp > 0) {
      const bx = width - 110
      const by = 22
      scene.add.text(bx, by - 10, 'BOSS', {
        fontSize: '8px', fontFamily: FONT, color: '#ff4444',
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20)

      scene.add.rectangle(bx, by, 152, 12, 0x330000)
        .setScrollFactor(0).setDepth(20)

      this.bossBarFill = scene.add.rectangle(bx - 75, by, 150, 10, 0xff2200)
        .setOrigin(0, 0.5)
        .setScrollFactor(0).setDepth(21)
    }

    // All players stack vertically on the left
    const ROW_H    = 42
    const HEAD_SZ  = 28   // display size of the head portrait
    const HEAD_CX  = 19   // center-x of head portrait
    const SHIFT    = 40   // how far hearts/ability shift right to make room
    const ABX      = 172 + SHIFT   // ability box x
    const FALLBACK_COLORS = [0xffe066, 0x00ccff, 0x44ff88, 0xff8c00]

    const selectedChars: string[] | undefined = scene.registry.get('selectedChars')

    for (let i = 0; i < playerCount; i++) {
      const rowY = 22 + i * ROW_H
      this.rowYs.push(rowY)

      // Character head portrait (no frame)
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

      const box = scene.add.rectangle(ABX, rowY, 30, 30, 0x000000)
        .setScrollFactor(0).setDepth(20).setAlpha(0.35)
      const abilityIcon = scene.add.image(ABX, rowY, 'fire_ability_icon')
        .setScale(0.1)
        .setVisible(false)
        .setScrollFactor(0).setDepth(21)
      const noAbilityMark = scene.add.text(ABX, rowY, '✦', {
        fontSize: '13px', fontFamily: FONT, color: '#444455',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(21)

      this.abilityBoxes.push(box)
      this.abilityIcons.push(abilityIcon)
      this.noAbilityMarks.push(noAbilityMark)
      this.ammoPips.push([])
    }
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
      const ability = p.currentAbility
      this.abilityBoxes[i]?.setFillStyle(ABILITY_COLORS[ability])
      const icon = this.abilityIcons[i]
      const noMark = this.noAbilityMarks[i]
      if (icon) {
        const key = ABILITY_ICON_KEYS[ability]
        if (key) {
          icon.setTexture(key).setScale(0.1).setVisible(true)
          noMark?.setVisible(false)
        } else {
          icon.setVisible(false)
          noMark?.setVisible(true)
        }
      }
    })
  }

  updateBossBar(current: number, max: number) {
    if (!this.bossBarFill) return
    const pct = max > 0 ? Math.max(0, current / max) : 0
    this.bossBarFill.width = Math.round(200 * pct)
  }
}
