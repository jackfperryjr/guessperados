import Phaser from 'phaser'

type Screen = 'main' | 'controls'

const FONT = '"Press Start 2P", monospace'
const CLR_TITLE  = '#ffe066'
const CLR_SELECT = '#ffffff'
const CLR_DIM    = '#7799aa'
const CLR_BODY   = '#aaccdd'

export class MenuScene extends Phaser.Scene {
  private mainGroup!: Phaser.GameObjects.Container
  private controlsGroup!: Phaser.GameObjects.Container

  constructor() { super({ key: 'MenuScene' }) }

  create() {
    const { width, height } = this.scale

    // Full-screen background
    this.add.image(width / 2, height / 2, 'logo').setDisplaySize(width, height)

    this.buildMain()
    this.buildControls()
    this.showScreen('main')
  }

  private buildMain() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    // Dark panel behind buttons so text stays readable over the art
    const panelH = 260
    const panelY = height * 0.57
    const panel = this.add.rectangle(width / 2, panelY, 360, panelH, 0x000000, 0.52)

    const btn1P  = this.menuButton(width / 2, height * 0.44, '1  PLAYER')
    const btn24P = this.menuButton(width / 2, height * 0.57, '2-4  PLAYERS')
    const btnCt  = this.menuButton(width / 2, height * 0.70, 'CONTROLS')

    btn1P.on('pointerdown', () => this.startGame(1))
    btn24P.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LobbyScene'))
    })
    btnCt.on('pointerdown', () => this.showScreen('controls'))

    const tip = this.add.text(width / 2, height - 28, '♦  Bluetooth controllers supported  ♦', {
      fontSize: '9px', fontFamily: FONT, color: CLR_DIM,
    }).setOrigin(0.5)

    items.push(panel, btn1P, btn24P, btnCt, tip)
    this.mainGroup = this.add.container(0, 0, items)
  }

  private buildControls() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    const header = this.add.text(width / 2, height * 0.1, 'CONTROLS', {
      fontSize: '20px', fontFamily: FONT, color: CLR_TITLE,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5)

    const col1 = width / 2 - 200
    const col2 = width / 2 + 30
    let y = height * 0.22

    const head = (lbl: string, x: number) =>
      this.add.text(x, y, lbl, { fontSize: '10px', fontFamily: FONT, color: CLR_SELECT }).setOrigin(0, 0)

    const row = (label: string, kb: string, gp: string) => {
      const r = [
        this.add.text(col1 - 110, y, label, { fontSize: '9px', fontFamily: FONT, color: CLR_DIM }).setOrigin(0, 0),
        this.add.text(col1,        y, kb,    { fontSize: '9px', fontFamily: FONT, color: CLR_BODY }).setOrigin(0, 0),
        this.add.text(col2,        y, gp,    { fontSize: '9px', fontFamily: FONT, color: CLR_BODY }).setOrigin(0, 0),
      ]
      y += 28
      return r
    }

    const h1 = head('KEYBOARD', col1)
    const h2 = head('GAMEPAD',  col2)
    y += 24

    const rows = [
      ...row('MOVE',     'A / D',       'Left Stick'),
      ...row('JUMP',     'W',           'A  /  Cross'),
      ...row('FLOAT',    'Hold W',      'Hold A'),
      ...row('INHALE',   'Z',           'X  /  Square'),
      ...row('ABILITY',  'X',           'B  /  Circle'),
    ]
    y += 10

    const note = this.add.text(width / 2, y + 20,
      '2 players share keyboard  OR  plug in\n2 Bluetooth controllers!', {
        fontSize: '9px', fontFamily: FONT, color: CLR_DIM,
        align: 'center',
      }).setOrigin(0.5, 0)

    const back = this.menuButton(width / 2, height - 80, '< BACK')
    back.on('pointerdown', () => this.showScreen('main'))

    items.push(header, h1, h2, ...rows, note, back)
    this.controlsGroup = this.add.container(0, 0, items)
  }

  private showScreen(s: Screen) {
    this.mainGroup.setVisible(s === 'main')
    this.controlsGroup.setVisible(s === 'controls')
  }

  private menuButton(x: number, y: number, label: string) {
    const btn = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: FONT, color: CLR_SELECT,
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000044', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#ffe066'))
    btn.on('pointerout',  () => btn.setColor(CLR_SELECT))
    return btn
  }

  private startGame(playerCount: number) {
    this.registry.set('playerCount',   playerCount)
    this.registry.set('currentLevel',  1)
    this.registry.set('currentRoom',   1)
    this.registry.set('lives',         3)
    this.registry.set('score',         0)
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene')
    })
  }
}
