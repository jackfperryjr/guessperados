import Phaser from 'phaser'
import { NetworkManager } from '../network/NetworkManager'

type LobbyScreen = 'main' | 'joining' | 'waiting'

const FONT   = '"Press Start 2P", monospace'
const YELLOW = '#ffe066'
const WHITE  = '#ffffff'
const DIM    = '#7799aa'
const CYAN   = '#40c4ff'
const RED    = '#ff4444'

// WebSocket server URL — override with VITE_WS_URL env var at build time
const WS_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WS_URL
  ?? `ws://${location.hostname}:3001`

export class LobbyScene extends Phaser.Scene {
  private nm!: NetworkManager
  private groups = new Map<LobbyScreen, Phaser.GameObjects.Container>()

  // Joining screen
  private codeEntry = ''
  private codeDisplay!: Phaser.GameObjects.Text
  private joinError!: Phaser.GameObjects.Text

  // Waiting screen
  private slotTexts: Phaser.GameObjects.Text[] = []
  private waitStatus!: Phaser.GameObjects.Text
  private startBtn!: Phaser.GameObjects.Text

  // Background
  private stars: Phaser.GameObjects.TileSprite[] = []

  constructor() { super({ key: 'LobbyScene' }) }

  create() {
    const { width, height } = this.scale

    this.stars.push(
      this.add.tileSprite(width / 2, height / 2, width, height, 'bg-stars').setScrollFactor(0),
      this.add.tileSprite(width / 2, height / 2, width, height, 'bg-nebula-blue').setScrollFactor(0).setAlpha(0.6),
    )

    this.nm = new NetworkManager(WS_URL)

    this.buildMain()
    this.buildJoining()
    this.buildWaiting()

    this.showScreen('main')
    this.cameras.main.fadeIn(400, 0, 0, 0)
  }

  // ── screens ──────────────────────────────────────────────────────────────────

  private showScreen(s: LobbyScreen) {
    for (const [key, grp] of this.groups) grp.setVisible(key === s)
  }

  // ── main ─────────────────────────────────────────────────────────────────────

  private buildMain() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    items.push(this.add.text(width / 2, height * 0.14, 'ONLINE', {
      fontSize: '36px', fontFamily: FONT, color: YELLOW,
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5))

    items.push(this.add.text(width / 2, height * 0.26, 'Play with friends on\nany device or browser!', {
      fontSize: '10px', fontFamily: FONT, color: DIM, align: 'center',
    }).setOrigin(0.5))

    const btnCreate = this.menuBtn(width / 2, height * 0.44, 'CREATE ROOM')
    const btnJoin   = this.menuBtn(width / 2, height * 0.57, 'JOIN ROOM')
    const btnBack   = this.menuBtn(width / 2, height * 0.74, '< BACK')

    const errText = this.add.text(width / 2, height * 0.66, '', {
      fontSize: '9px', fontFamily: FONT, color: RED,
    }).setOrigin(0.5)

    btnCreate.on('pointerdown', async () => {
      btnCreate.setColor(DIM)
      try {
        await this.nm.connect()
        this.setupNetworkCallbacks()
        this.nm.createRoom()
      } catch {
        btnCreate.setColor(WHITE)
        errText.setText('Could not reach server\nMake sure server is running')
      }
    })

    btnJoin.on('pointerdown', () => {
      this.codeEntry = ''
      this.joinError.setText('')
      this.codeDisplay.setText('______')
      this.showScreen('joining')
    })

    btnBack.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'))
    })

    items.push(btnCreate, btnJoin, btnBack, errText)
    this.groups.set('main', this.add.container(0, 0, items))
  }

  // ── joining ───────────────────────────────────────────────────────────────────

  private buildJoining() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    items.push(this.add.text(width / 2, height * 0.12, 'ENTER ROOM CODE', {
      fontSize: '20px', fontFamily: FONT, color: YELLOW,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5))

    items.push(this.add.text(width / 2, height * 0.28, 'Type the 6-character code:', {
      fontSize: '9px', fontFamily: FONT, color: DIM,
    }).setOrigin(0.5))

    this.codeDisplay = this.add.text(width / 2, height * 0.42, '______', {
      fontSize: '36px', fontFamily: FONT, color: CYAN, letterSpacing: 18,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5)
    items.push(this.codeDisplay)

    this.joinError = this.add.text(width / 2, height * 0.56, '', {
      fontSize: '9px', fontFamily: FONT, color: RED,
    }).setOrigin(0.5)
    items.push(this.joinError)

    const btnJoin = this.menuBtn(width / 2, height * 0.67, 'JOIN')
    const btnBack = this.menuBtn(width / 2, height * 0.80, '< BACK')

    btnJoin.on('pointerdown', () => this.submitJoinCode(btnJoin))
    btnBack.on('pointerdown', () => {
      this.codeEntry = ''
      this.showScreen('main')
    })

    items.push(btnJoin, btnBack)

    // Keyboard capture for typing the room code
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.groups.get('joining')?.visible) return
      const key = event.key.toUpperCase()
      if (key === 'BACKSPACE') {
        this.codeEntry = this.codeEntry.slice(0, -1)
      } else if (key === 'ENTER') {
        this.submitJoinCode(btnJoin)
        return
      } else if (key.length === 1 && /[A-Z0-9]/.test(key) && this.codeEntry.length < 6) {
        this.codeEntry += key
      }
      const shown = this.codeEntry.padEnd(6, '_')
      this.codeDisplay.setText(shown)
    })

    this.groups.set('joining', this.add.container(0, 0, items))
  }

  private async submitJoinCode(btn: Phaser.GameObjects.Text) {
    if (this.codeEntry.length < 6) { this.joinError.setText('Please enter 6 characters'); return }
    btn.setColor(DIM)
    this.joinError.setText('')
    try {
      await this.nm.connect()
      this.setupNetworkCallbacks()
      this.nm.joinRoom(this.codeEntry)
    } catch {
      btn.setColor(WHITE)
      this.joinError.setText('Could not reach server\nMake sure server is running')
    }
  }

  // ── waiting ───────────────────────────────────────────────────────────────────

  private buildWaiting() {
    const { width, height } = this.scale
    const items: Phaser.GameObjects.GameObject[] = []

    items.push(this.add.text(width / 2, height * 0.08, 'WAITING FOR PLAYERS', {
      fontSize: '18px', fontFamily: FONT, color: YELLOW,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5))

    // Room code display
    items.push(this.add.text(width / 2, height * 0.20, 'ROOM CODE', {
      fontSize: '9px', fontFamily: FONT, color: DIM,
    }).setOrigin(0.5))

    const codeLabel = this.add.text(width / 2, height * 0.28, '------', {
      fontSize: '32px', fontFamily: FONT, color: CYAN, letterSpacing: 14,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5)
    // will be updated by setupNetworkCallbacks
    ;(codeLabel as Phaser.GameObjects.Text & { _isCodeLabel: boolean })._isCodeLabel = true
    items.push(codeLabel)

    const copyBtn = this.add.text(width / 2, height * 0.36, '[ COPY CODE ]', {
      fontSize: '9px', fontFamily: FONT, color: CYAN,
      stroke: '#000', strokeThickness: 2,
      backgroundColor: '#00000044', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    copyBtn.on('pointerover', () => copyBtn.setColor('#ffffff'))
    copyBtn.on('pointerout',  () => copyBtn.setColor(CYAN))
    copyBtn.on('pointerdown', () => {
      const code = this.nm.roomCode
      if (!code) return
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.setText('[ COPIED! ]').setColor('#66ff88')
        this.time.delayedCall(1500, () => copyBtn.setText('[ COPY CODE ]').setColor(CYAN))
      }).catch(() => {
        copyBtn.setText('[ COPY FAILED ]').setColor(RED)
        this.time.delayedCall(1500, () => copyBtn.setText('[ COPY CODE ]').setColor(CYAN))
      })
    })
    items.push(copyBtn)

    items.push(this.add.text(width / 2, height * 0.44, 'PLAYERS', {
      fontSize: '9px', fontFamily: FONT, color: DIM,
    }).setOrigin(0.5))

    const PLAYER_COLORS = [WHITE, '#66aaff', '#66ff88', '#ff9933']
    const SLOT_LABELS = ['P1 — HOST', 'P2', 'P3', 'P4']
    this.slotTexts = []

    for (let i = 0; i < 4; i++) {
      const t = this.add.text(width / 2, height * 0.51 + i * 34, SLOT_LABELS[i], {
        fontSize: '11px', fontFamily: FONT, color: PLAYER_COLORS[i],
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0.3)
      this.slotTexts.push(t)
      items.push(t)
    }

    this.waitStatus = this.add.text(width / 2, height * 0.74, 'Waiting for players…', {
      fontSize: '9px', fontFamily: FONT, color: DIM,
    }).setOrigin(0.5)
    items.push(this.waitStatus)

    this.startBtn = this.menuBtn(width / 2, height * 0.84, '▶  START GAME')
    this.startBtn.setAlpha(0.3).disableInteractive()
    this.startBtn.on('pointerdown', () => this.nm.startGame())
    items.push(this.startBtn)

    const btnLeave = this.menuBtn(width / 2, height * 0.93, '< LEAVE')
    btnLeave.on('pointerdown', () => {
      this.nm.disconnect()
      this.showScreen('main')
    })
    items.push(btnLeave)

    this.groups.set('waiting', this.add.container(0, 0, items))
  }

  // ── network callbacks ────────────────────────────────────────────────────────

  private getCodeLabel(): Phaser.GameObjects.Text | undefined {
    const grp = this.groups.get('waiting')
    if (!grp) return undefined
    return grp.list.find(
      obj => (obj as Phaser.GameObjects.Text & { _isCodeLabel?: boolean })._isCodeLabel
    ) as Phaser.GameObjects.Text | undefined
  }

  private setupNetworkCallbacks() {
    this.nm.onRoomCreated = (code) => {
      const label = this.getCodeLabel()
      if (label) label.setText(code)
      this.refreshSlots()
      this.showScreen('waiting')
    }

    this.nm.onRoomJoined = (code, players) => {
      const label = this.getCodeLabel()
      if (label) label.setText(code)
      this.nm.connectedIds = new Set(players)
      this.refreshSlots()
      this.showScreen('waiting')
    }

    this.nm.onPlayerJoined = () => {
      this.refreshSlots()
    }

    this.nm.onPlayerLeft = () => {
      this.refreshSlots()
    }

    this.nm.onGameStart = (playerCount) => {
      const remotes = Array.from(this.nm.connectedIds).filter(id => id !== this.nm.playerId)
      this.registry.set('playerCount',   playerCount)
      this.registry.set('networkManager', this.nm)
      this.registry.set('localPlayerId',  this.nm.playerId)
      this.registry.set('remotePlayers',  remotes)
      this.registry.set('currentLevel',   1)
      this.registry.set('currentRoom',    1)
      this.registry.set('lives',          3)
      this.registry.set('score',          0)
      this.cameras.main.fadeOut(400, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'))
    }

    this.nm.onError = (text) => {
      this.joinError.setText(text)
      this.showScreen('joining')
    }
  }

  private refreshSlots() {
    const count = this.nm.connectedIds.size
    for (let i = 0; i < 4; i++) {
      const filled = this.nm.connectedIds.has(i)
      const isMe   = i === this.nm.playerId
      const label  = ['P1 — HOST', 'P2', 'P3', 'P4'][i]
      this.slotTexts[i].setText(filled ? `${label}${isMe ? ' ◄ YOU' : ' ✓'}` : label)
      this.slotTexts[i].setAlpha(filled ? 1 : 0.3)
    }

    if (this.nm.isHost) {
      if (count >= 2) {
        this.startBtn.setAlpha(1).setInteractive({ useHandCursor: true })
        this.waitStatus.setText('Host: press START when ready!')
      } else {
        this.startBtn.setAlpha(0.3).disableInteractive()
        this.waitStatus.setText('Waiting for at least 1 more player…')
      }
    } else {
      this.waitStatus.setText(`${count}/4 players — waiting for host to start…`)
    }
  }

  // ── shared helpers ────────────────────────────────────────────────────────────

  private menuBtn(x: number, y: number, label: string) {
    const btn = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: FONT, color: WHITE,
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#00000044', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    btn.on('pointerover', () => btn.setColor(YELLOW))
    btn.on('pointerout',  () => btn.setColor(WHITE))
    return btn
  }

  update() {
    this.stars[0].tilePositionX += 0.08
    this.stars[1].tilePositionX += 0.18
  }
}
