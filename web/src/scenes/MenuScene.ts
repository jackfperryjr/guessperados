import Phaser from 'phaser'

type Screen = 'main' | 'controls'

const FONT = '"Press Start 2P", monospace'
const CLR_TITLE  = '#ffe066'
const CLR_SELECT = '#ffffff'
const CLR_DIM    = '#7799aa'
const CLR_BODY   = '#aaccdd'

interface MenuItem { text: Phaser.GameObjects.Text; action: () => void }

export class MenuScene extends Phaser.Scene {
  private mainGroup!: Phaser.GameObjects.Container
  private controlsGroup!: Phaser.GameObjects.Container

  private gpCursor!: Phaser.GameObjects.Text
  private padStatus!: Phaser.GameObjects.Text
  private activeItems: MenuItem[] = []
  private focusIdx = 0

  constructor() { super({ key: 'MenuScene' }) }

  create() {
    const { width, height } = this.scale

    this.add.image(width / 2, height / 2, 'logo').setDisplaySize(width, height)

    this.gpCursor = this.add.text(0, 0, '►', {
      fontSize: '14px', fontFamily: FONT, color: CLR_TITLE,
    }).setOrigin(1, 0.5).setDepth(20).setVisible(false)

    this.padStatus = this.add.text(width / 2, height - 10, '', {
      fontSize: '8px', fontFamily: FONT, color: '#44cc88',
    }).setOrigin(0.5, 1).setDepth(20)

    this.buildMain()
    this.buildControls()
    this.showScreen('main')
    this.setupGamepad()
    this.setupControllerStatus()
  }

  private setupControllerStatus() {
    const refresh = () => {
      const pads = this.input.gamepad?.gamepads ?? []
      const connected = pads.some(p => p != null)
      if (connected) {
        this.padStatus.setText('● CONTROLLER CONNECTED').setColor('#44cc88')
      } else if ('ontouchstart' in window) {
        this.padStatus.setText('● PRESS ANY BUTTON ON YOUR CONTROLLER TO CONNECT').setColor('#ffe066')
      } else {
        this.padStatus.setText('')
      }
    }

    refresh()
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.CONNECTED,    refresh)
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.DISCONNECTED, refresh)
    // Re-check every 2 s in case the event fired before this scene was ready
    this.time.addEvent({ delay: 2000, loop: true, callback: refresh })
  }

  private setupGamepad() {
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === 12) this.moveFocus(-1)          // d-pad up
        if (button.index === 13) this.moveFocus(1)           // d-pad down
        if (button.index === 0 || button.index === 9) this.activateFocus()  // A or Start
      },
    )
  }

  private moveFocus(dir: number) {
    const len = this.activeItems.length
    if (!len) return
    this.focusIdx = (this.focusIdx + dir + len) % len
    this.placeCursor()
  }

  private activateFocus() {
    this.activeItems[this.focusIdx]?.action()
  }

  private placeCursor() {
    const item = this.activeItems[this.focusIdx]
    if (!item) return
    const b = item.text.getBounds()
    this.gpCursor.setPosition(b.left - 10, b.centerY).setVisible(true)
  }

  private setActiveItems(items: MenuItem[]) {
    this.activeItems = items
    this.focusIdx = 0
    this.gpCursor.setVisible(false)
  }

  private buildMain() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    const panel = this.add.rectangle(width / 2, height * 0.57, 360, 260, 0x000000, 0.52)

    const btn1P  = this.menuButton(width / 2, height * 0.44, '1  PLAYER')
    const btn24P = this.menuButton(width / 2, height * 0.57, '2-4  PLAYERS')
    const btnCt  = this.menuButton(width / 2, height * 0.70, 'CONTROLS')

    const startGame = () => this.startGame(1)
    const goLobby   = () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LobbyScene'))
    }
    const goControls = () => this.showScreen('controls')

    btn1P.on('pointerdown',  startGame)
    btn24P.on('pointerdown', goLobby)
    btnCt.on('pointerdown',  goControls)

    const tip = this.add.text(width / 2, height - 28, '♦  Bluetooth controllers supported  ♦', {
      fontSize: '9px', fontFamily: FONT, color: CLR_DIM,
    }).setOrigin(0.5)

    items.push(panel, btn1P, btn24P, btnCt, tip)
    this.mainGroup = this.add.container(0, 0, items)

    // Store for gamepad navigation (captured as closures above)
    this.mainGroup.setData('gpItems', [
      { text: btn1P,  action: startGame   },
      { text: btn24P, action: goLobby     },
      { text: btnCt,  action: goControls  },
    ])
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
        this.add.text(col1 - 110, y, label, { fontSize: '9px', fontFamily: FONT, color: CLR_DIM  }).setOrigin(0, 0),
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
      ...row('MOVE',    'A / D',   'Left Stick'),
      ...row('JUMP',    'W',       'A  /  Cross'),
      ...row('FLOAT',   'Hold W',  'Hold A'),
      ...row('INHALE',  'Z',       'Triangle  /  Y'),
      ...row('ABILITY', 'X',       'B  /  Circle'),
      ...row('MELEE',   'C',       'Square  /  X'),
      ...row('PAUSE',   'ESC',     'Start'),
    ]
    y += 10

    const note = this.add.text(width / 2, y + 20,
      '2 players share keyboard  OR  plug in\n2 Bluetooth controllers!', {
        fontSize: '9px', fontFamily: FONT, color: CLR_DIM, align: 'center',
      }).setOrigin(0.5, 0)

    const goBack = () => this.showScreen('main')
    const back = this.menuButton(width / 2, height - 80, '< BACK')
    back.on('pointerdown', goBack)

    items.push(header, h1, h2, ...rows, note, back)
    this.controlsGroup = this.add.container(0, 0, items)
    this.controlsGroup.setData('gpItems', [{ text: back, action: goBack }])
  }

  private showScreen(s: Screen) {
    this.mainGroup.setVisible(s === 'main')
    this.controlsGroup.setVisible(s === 'controls')
    const group = s === 'main' ? this.mainGroup : this.controlsGroup
    this.setActiveItems(group.getData('gpItems') as MenuItem[])
  }

  private menuButton(x: number, y: number, label: string) {
    const btn = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: FONT, color: CLR_SELECT,
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000044', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor(CLR_TITLE))
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
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
  }
}
