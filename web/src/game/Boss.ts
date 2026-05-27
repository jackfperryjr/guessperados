import Phaser from 'phaser'
import { AbilityType } from '../types'
import { Enemy } from './Enemy'
import { Player } from './Player'

type BossState = 'patrol' | 'stagger'

const PATROL_SPEED = 80

export class Boss extends Enemy {
  readonly maxHp: number
  private bossState: BossState = 'patrol'
  private staggerTimer = 0
  private bossWalkDir = 1
  private invincible = false
  private bossAttackTimer: number
  private bossFlying = false
  private spawnY = 0
  players: Player[] = []

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hp: number,
    _attackInterval = 3000,
    textureKey = 'sheet-dragon',
    flying = true,
  ) {
    super(scene, x, y, AbilityType.None)
    this.hp = hp
    this.maxHp = hp
    this.bossAttackTimer = 2000 + Math.random() * 1500
    this.spawnY = y

    const body = this.body as Phaser.Physics.Arcade.Body

    if (scene.textures.exists(textureKey)) {
      this.setTexture(textureKey, 0)
      this.setScale(3.45)
      if (flying) {
        body.setAllowGravity(false)
        this.bossFlying = true
      }
      body.setSize(110, 80)
      body.setOffset((this.displayWidth - 110) / 2, flying ? 20 : Math.round(this.displayHeight * 0.25))
      const walkAnim = `${textureKey}-walk`
      if (scene.anims.exists(walkAnim)) this.play(walkAnim)
    } else {
      this.setScale(1.3)
      body.setSize(46, 50)
    }
  }

  update() {
    const body = this.body as Phaser.Physics.Arcade.Body
    const dt = this.scene.game.loop.delta

    if (this.bossState === 'stagger') {
      this.staggerTimer -= dt
      if (this.staggerTimer <= 0) {
        this.bossState = 'patrol'
        this.clearTint()
      }
      body.setVelocity(0, 0)
      return
    }

    // Hover patrol — reverse at walls
    if (body.blocked.left)  this.bossWalkDir = 1
    if (body.blocked.right) this.bossWalkDir = -1
    body.setVelocityX(PATROL_SPEED * this.bossWalkDir)
    if (this.bossFlying) {
      // Spring keeps boss near spawnY so it can't drift to the floor
      body.setVelocityY(Math.sin(this.scene.time.now / 800) * 55 - (this.y - this.spawnY) * 2)
    }
    this.setFlipX(this.bossWalkDir > 0)

    // Attack timer
    this.bossAttackTimer -= dt
    if (this.bossAttackTimer <= 0) {
      this.bossAttackTimer = 3000 + Math.random() * 2000
      const abilities = [AbilityType.Fire, AbilityType.Lightning, AbilityType.Ice]
      this.emit('bossAttack', abilities[Math.floor(Math.random() * abilities.length)])
    }
  }

  hit() {
    if (this.invincible || !this.active) return
    this.hp = Math.max(0, this.hp - 1)
    this.emit('hpChanged', this.hp, this.maxHp)
    if (this.hp <= 0) {
      this.bossDie()
      return
    }
    this.invincible = true
    this.enterStagger(600)
    this.scene.cameras.main.shake(160, 0.007)
    this.scene.time.delayedCall(600, () => { if (this.active) this.invincible = false })
  }

  die() { this.hit() }

  bossDie() {
    ;(this.body as Phaser.Physics.Arcade.Body).setEnable(false)
    this.emit('bossDead')
    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 700,
      onComplete: () => { if (this.active) this.destroy() },
    })
  }

  pullToward(_tx: number, _ty: number, _speed: number) {}
  stopPull() {}

  private enterStagger(ms: number) {
    this.bossState = 'stagger'
    this.staggerTimer = ms
    this.setTint(0xffffff)
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }
}
