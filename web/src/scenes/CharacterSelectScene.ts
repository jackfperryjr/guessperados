import Phaser from 'phaser'
import { BootScene } from './BootScene'

const FONT = '"Press Start 2P", monospace'
const PLAYER_COLORS    = [0xffe066, 0x00ccff, 0x44ff88, 0xff8c00]
const PLAYER_COLOR_STR = ['#ffe066', '#00ccff', '#44ff88', '#ff8c00']

type CharInfo = { key: string; name: string; sheetKey: string; animPrefix: string; previewFrame: number }

// 7 characters fit in two rows: 4 top, 3 bottom (centered)
const CARD_W  = 148
const CARD_H  = 190
const GAP     = 16

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

    this.add.text(width / 2, 44, 'CHOOSE YOUR CHARACTER', {
      fontSize: '16px', fontFamily: FONT, color: '#ffe066',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5)

    // Layout: row0 = first 4 chars, row1 = remaining chars (centered)
    this.cards = []
    const rowSplit  = 4
    const row0Count = Math.min(this.chars.length, rowSplit)
    const row1Count = Math.max(0, this.chars.length - rowSplit)
    const row0Y = Math.round(height * 0.38)
    const row1Y = Math.round(height * 0.38) + CARD_H + GAP + 10

    const buildRow = (startIdx: number, count: number, rowY: number) => {
      const rowW = count * CARD_W + (count - 1) * GAP
      const rowX = (width - rowW) / 2 + CARD_W / 2
      for (let i = 0; i < count; i++) {
        const ci = startIdx + i
        const cx = Math.round(rowX + i * (CARD_W + GAP))
        this.cards[ci] = { x: cx, y: rowY }
        this.buildCard(cx, rowY, this.chars[ci])

        // Touch / click — tap once to select, tap again to confirm
        const zone = this.add.zone(cx, rowY, CARD_W, CARD_H).setInteractive().setDepth(8)
        zone.on('pointerdown', () => {
          if (this.started) return
          // Route to first unconfirmed player
          const p = this.confirmed.indexOf(false)
          if (p < 0) return
          if (this.selections[p] === ci) {
            this.confirm(p)
          } else {
            this.selections[p] = ci
            this.updateCursorPos(p)
          }
        })
      }
    }

    buildRow(0,         row0Count, row0Y)
    if (row1Count > 0) buildRow(row0Count, row1Count, row1Y)

    // Per-player cursors, labels, confirm marks
    this.cursors      = []
    this.confirmMarks = []
    this.playerLabels = []
    for (let p = 0; p < this.playerCount; p++) {
      const cursor = this.add.rectangle(0, 0, CARD_W + 10, CARD_H + 10, 0, 0)
        .setStrokeStyle(3, PLAYER_COLORS[p])
        .setDepth(5)
      this.cursors.push(cursor)

      const label = this.add.text(0, 0, `P${p + 1}`, {
        fontSize: '8px', fontFamily: FONT, color: PLAYER_COLOR_STR[p],
        backgroundColor: '#00000099', padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1).setDepth(6)
      this.playerLabels.push(label)

      const mark = this.add.text(0, 0, '✓', {
        fontSize: '13px', fontFamily: FONT, color: PLAYER_COLOR_STR[p],
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(7).setVisible(false)
      this.confirmMarks.push(mark)

      this.updateCursorPos(p)
    }

    // Status text
    this.startText = this.add.text(width / 2, height - 72, '', {
      fontSize: '10px', fontFamily: FONT, color: '#556677',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5)
    this.updateStartText()

    // On-screen PLAY button (works for touch, mouse, and keyboard users)
    const playBtn = this.add.text(width / 2, height - 38, '▶  PLAY', {
      fontSize: '11px', fontFamily: FONT,
      color: '#000000', backgroundColor: '#ffe066',
      padding: { x: 28, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
    playBtn.on('pointerdown', () => this.tryStart())
    playBtn.on('pointerover', () => playBtn.setStyle({ backgroundColor: '#ffcc00' }))
    playBtn.on('pointerout',  () => playBtn.setStyle({ backgroundColor: '#ffe066' }))

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

    // Gamepad input
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        const activePads = this.input.gamepad!.gamepads.filter(Boolean)
        const padIdx = activePads.indexOf(pad)
        if (padIdx < 0) return
        const p = Math.min(padIdx, this.playerCount - 1)
        if (button.index === 14) this.move(p, -1)
        if (button.index === 15) this.move(p,  1)
        if (button.index === 0)  this.confirm(p)
        if (button.index === 9)  this.tryStart()
      },
    )
  }

  private buildCard(cx: number, cy: number, char: CharInfo) {
    this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x111128).setStrokeStyle(1, 0x223355)

    if (this.textures.exists(char.sheetKey)) {
      this.add.image(cx, cy - 18, char.sheetKey, char.previewFrame).setScale(2.5).setDepth(2)
    } else {
      this.add.rectangle(cx, cy - 18, 64, 64, 0x334466).setDepth(2)
    }

    this.add.text(cx, cy + 75, char.name, {
      fontSize: '8px', fontFamily: FONT, color: '#aaccdd',
    }).setOrigin(0.5).setDepth(2)
  }

  private move(player: number, dir: number) {
    if (this.confirmed[player]) return
    this.selections[player] = (this.selections[player] + dir + this.chars.length) % this.chars.length
    this.updateCursorPos(player)
  }

  private confirm(player: number) {
    if (this.confirmed[player]) {
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
    this.playerLabels[player].setPosition(card.x, card.y - CARD_H / 2 - 4)
    this.confirmMarks[player].setPosition(card.x + CARD_W / 2 - 8, card.y - CARD_H / 2 + 8)
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
