import Phaser from 'phaser'
import { BootScene } from './BootScene'

const FONT = '"Press Start 2P", monospace'
const PLAYER_COLORS    = [0xffe066, 0x00ccff, 0x44ff88, 0xff8c00]
const PLAYER_COLOR_STR = ['#ffe066', '#00ccff', '#44ff88', '#ff8c00']

type CharInfo = { key: string; name: string; sheetKey: string; animPrefix: string }

export class CharacterSelectScene extends Phaser.Scene {
  private chars: CharInfo[] = []
  private playerCount = 1
  private selections: number[] = []
  private confirmed: boolean[] = []
  private cursors: Phaser.GameObjects.Rectangle[] = []
  private confirmMarks: Phaser.GameObjects.Text[] = []
  private playerLabels: Phaser.GameObjects.Text[] = []
  private cards: { x: number; y: number }[] = []
  private startText!: Phaser.GameObjects.Text
  private started = false

  constructor() { super({ key: 'CharacterSelectScene' }) }

  create() {
    const { width, height } = this.scale
    this.started     = false
    this.playerCount = this.registry.get('playerCount') ?? 1
    this.chars       = BootScene.getSelectableCharacters()
    this.selections  = Array(this.playerCount).fill(0)
    this.confirmed   = Array(this.playerCount).fill(false)

    this.add.rectangle(width / 2, height / 2, width, height, 0x080818)
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0030, 0.45)

    this.add.text(width / 2, 52, 'CHOOSE YOUR CHARACTER', {
      fontSize: '18px', fontFamily: FONT, color: '#ffe066',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5)

    // Cards — centered row
    const cardW  = 160
    const cardH  = 210
    const gap    = 24
    const totalW = this.chars.length * cardW + (this.chars.length - 1) * gap
    const startX = (width - totalW) / 2 + cardW / 2
    const cardY  = Math.round(height * 0.48)

    this.cards = []
    for (let i = 0; i < this.chars.length; i++) {
      const cx   = Math.round(startX + i * (cardW + gap))
      this.cards.push({ x: cx, y: cardY })

      this.add.rectangle(cx, cardY, cardW, cardH, 0x111128).setStrokeStyle(1, 0x223355)

      const char = this.chars[i]
      if (this.textures.exists(char.sheetKey)) {
        this.add.sprite(cx, cardY - 30, char.sheetKey, 14).setScale(2.5)
      } else {
        this.add.rectangle(cx, cardY - 30, 64, 64, 0x334466)
      }

      this.add.text(cx, cardY + 75, char.name, {
        fontSize: '9px', fontFamily: FONT, color: '#aaccdd',
      }).setOrigin(0.5)
    }

    // Per-player cursors, labels, confirm marks
    this.cursors      = []
    this.confirmMarks = []
    this.playerLabels = []
    for (let p = 0; p < this.playerCount; p++) {
      const cursor = this.add.rectangle(0, 0, cardW + 10, cardH + 10, 0, 0)
        .setStrokeStyle(3, PLAYER_COLORS[p])
        .setDepth(5)
      this.cursors.push(cursor)

      const label = this.add.text(0, 0, `P${p + 1}`, {
        fontSize: '8px', fontFamily: FONT, color: PLAYER_COLOR_STR[p],
        backgroundColor: '#00000099', padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1).setDepth(6)
      this.playerLabels.push(label)

      const mark = this.add.text(0, 0, '✓', {
        fontSize: '14px', fontFamily: FONT, color: PLAYER_COLOR_STR[p],
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(7).setVisible(false)
      this.confirmMarks.push(mark)

      this.updateCursorPos(p)
    }

    // Status text
    this.startText = this.add.text(width / 2, height - 58, '', {
      fontSize: '11px', fontFamily: FONT, color: '#556677',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5)
    this.updateStartText()

    this.add.text(width / 2, height - 26, 'P1: A/D  W=CONFIRM    P2: ←/→  ↑=CONFIRM    GAMEPAD: D-PAD  A=CONFIRM', {
      fontSize: '7px', fontFamily: FONT, color: '#334455',
    }).setOrigin(0.5)

    // Keyboard input
    const kb = this.input.keyboard!
    kb.addKey('A').on('down', () => this.move(0, -1))
    kb.addKey('D').on('down', () => this.move(0,  1))
    kb.addKey('W').on('down', () => this.confirm(0))
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', () => this.tryStart())

    if (this.playerCount > 1) {
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on('down',  () => this.move(1, -1))
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on('down', () => this.move(1,  1))
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down',    () => this.confirm(1))
    }

    // Gamepad input — pad index maps to player index
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        const activePads = this.input.gamepad!.gamepads.filter(Boolean)
        const padIdx = activePads.indexOf(pad)
        if (padIdx < 0) return
        const p = Math.min(padIdx, this.playerCount - 1)
        if (button.index === 14) this.move(p, -1)   // d-pad left
        if (button.index === 15) this.move(p,  1)   // d-pad right
        if (button.index === 0)  this.confirm(p)    // A / Cross
        if (button.index === 9)  this.tryStart()    // Start
      },
    )
  }

  private move(player: number, dir: number) {
    if (this.confirmed[player]) return
    this.selections[player] = (this.selections[player] + dir + this.chars.length) % this.chars.length
    this.updateCursorPos(player)
  }

  private confirm(player: number) {
    if (this.confirmed[player]) {
      // Allow un-confirming to change selection
      this.confirmed[player] = false
      this.confirmMarks[player].setVisible(false)
      this.updateStartText()
      return
    }
    this.confirmed[player] = true
    this.confirmMarks[player].setVisible(true)
    this.updateCursorPos(player)
    this.updateStartText()
    if (this.confirmed.every(Boolean)) this.startScene()
  }

  private updateCursorPos(player: number) {
    const card = this.cards[this.selections[player]]
    if (!card) return
    this.cursors[player].setPosition(card.x, card.y)
    this.playerLabels[player].setPosition(card.x, card.y - 110)
    this.confirmMarks[player].setPosition(card.x + 68, card.y - 97)
  }

  private updateStartText() {
    if (this.confirmed.every(Boolean)) {
      this.startText.setText('ALL READY!  PRESS START OR ENTER').setColor('#ffe066')
    } else if (this.confirmed.some(Boolean)) {
      this.startText.setText('WAITING FOR ALL PLAYERS...').setColor('#aaccdd')
    } else {
      this.startText.setText('CONFIRM YOUR SELECTION  (A / W)').setColor('#556677')
    }
  }

  private tryStart() {
    if (this.started) return
    if (this.playerCount === 1 && !this.confirmed[0]) {
      this.confirmed[0] = true
      this.startScene()
      return
    }
    if (this.confirmed.every(Boolean)) this.startScene()
  }

  private startScene() {
    if (this.started) return
    this.started = true
    const selectedChars = this.selections.map(idx => this.chars[idx].key)
    this.registry.set('selectedChars', selectedChars)
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }
}
