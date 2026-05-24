import Phaser from 'phaser'

const FONT = '"Press Start 2P", monospace'

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelCompleteScene' }) }

  create() {
    const { width, height } = this.scale
    const levelId: number = this.registry.get('currentLevel') ?? 1
    const score: number   = this.registry.get('score') ?? 0

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)

    // Portal icon (reuses the in-game texture, slowly spinning)
    const icon = this.add.image(width / 2, height * 0.18, 'goal-portal').setScale(1.8)
    this.tweens.add({ targets: icon, rotation: Math.PI * 2, duration: 3000, repeat: -1, ease: 'Linear' })

    const levelNames = ['Orbital Station', 'Asteroid Belt', 'Planet Core']
    this.add.text(width / 2, height * 0.36, 'LEVEL CLEAR!', {
      fontSize: '28px', fontFamily: FONT, color: '#ffe066',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.48, levelNames[levelId - 1] ?? '', {
      fontSize: '14px', fontFamily: FONT, color: '#aaccdd',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.59, `SCORE  ${score.toString().padStart(6, '0')}`, {
      fontSize: '16px', fontFamily: FONT, color: '#ffffff',
    }).setOrigin(0.5)

    const isLast = levelId >= 3

    const btn = this.add.text(width / 2, height * 0.76, isLast ? 'YOU WIN!' : 'NEXT LEVEL', {
      fontSize: '16px', fontFamily: FONT, color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000055', padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#ffe066'))
    btn.on('pointerout',  () => btn.setColor('#ffffff'))

    const advance = () => {
      if (isLast) {
        this.registry.set('currentLevel', 1)
        this.scene.start('MenuScene')
      } else {
        this.registry.set('currentLevel', levelId + 1)
        this.cameras.main.fadeOut(400, 0, 0, 0)
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
      }
    }

    btn.on('pointerdown', advance)

    // Keyboard: Space or Enter
    this.input.keyboard?.once('keydown-SPACE', advance)
    this.input.keyboard?.once('keydown-ENTER', advance)

    // Gamepad: any button (X/Cross on PS5 = index 0)
    this.input.gamepad?.once(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === 0) advance()
      }
    )
  }
}
