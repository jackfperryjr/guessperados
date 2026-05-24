import Phaser from 'phaser'
import { Player } from '../game/Player'
import { AbilityType } from '../types'

export const ABILITY_COLORS: Record<AbilityType, number> = {
  [AbilityType.None]:     0x444444,
  [AbilityType.Fire]:     0xff6600,
  [AbilityType.Bomb]:     0x333333,
  [AbilityType.Electric]: 0xffdd00,
  [AbilityType.Ice]:      0x66ccff,
}

const ABILITY_LABELS: Record<AbilityType, string> = {
  [AbilityType.None]:     '',
  [AbilityType.Fire]:     'F',
  [AbilityType.Bomb]:     'B',
  [AbilityType.Electric]: 'E',
  [AbilityType.Ice]:      'I',
}

const HEART_FULL  = 0xe83131
const HEART_EMPTY = 0x553333

export class UIManager {
  private heartIcons: Phaser.GameObjects.Arc[][] = []
  private abilityBoxes: Phaser.GameObjects.Rectangle[] = []
  private abilityLabels: Phaser.GameObjects.Text[] = []
  private scoreText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, playerCount: number) {
    const { width } = scene.scale

    // Score (top center)
    this.scoreText = scene.add.text(width / 2, 14, 'SCORE  0', {
      fontSize: '12px', fontFamily: '"Press Start 2P", monospace', color: '#ffffff',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20)

    // Level name (top-left)
    const levelId = scene.registry.get('currentLevel') ?? 1
    const levelNames = ['Orbital Station', 'Asteroid Belt', 'Planet Core']
    scene.add.text(16, 14, levelNames[levelId - 1] ?? '', {
      fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#aaaaaa',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(20)

    // Per-player HUD
    for (let i = 0; i < playerCount; i++) {
      const baseX = i === 0 ? 16 : width - 16
      const anchorRight = i !== 0

      // Hearts (3)
      const hearts: Phaser.GameObjects.Arc[] = []
      for (let h = 0; h < 3; h++) {
        const hx = anchorRight ? baseX - h * 20 - 10 : baseX + h * 20 + 10
        const icon = scene.add.circle(hx, 48, 7, HEART_FULL)
          .setScrollFactor(0).setDepth(20)
        hearts.push(icon)
      }
      this.heartIcons.push(hearts)

      // Ability box
      const abx = anchorRight ? baseX - 80 : baseX + 80
      const box = scene.add.rectangle(abx, 48, 28, 28, 0x222222)
        .setScrollFactor(0).setDepth(20)
      const lbl = scene.add.text(abx, 48, '', {
        fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(21)

      this.abilityBoxes.push(box)
      this.abilityLabels.push(lbl)
    }
  }

  update(players: Player[]) {
    players.forEach((p, i) => {
      // Hearts
      this.heartIcons[i]?.forEach((icon, h) =>
        icon.setFillStyle(h < p.hearts ? HEART_FULL : HEART_EMPTY)
      )
      // Ability
      const ability = p.currentAbility
      this.abilityBoxes[i]?.setFillStyle(ABILITY_COLORS[ability])
      this.abilityLabels[i]?.setText(ABILITY_LABELS[ability])
    })
  }

  setScore(score: number) {
    this.scoreText.setText(`SCORE  ${score.toString().padStart(6, '0')}`)
  }
}
