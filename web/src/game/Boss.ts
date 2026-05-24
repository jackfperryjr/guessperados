import Phaser from 'phaser'
import { AbilityType } from '../types'
import { Enemy } from './Enemy'
import { Player } from './Player'

type BossState = 'patrol' | 'charge' | 'stagger'

const PATROL_SPEED = 100
const CHARGE_SPEED = 300

export class Boss extends Enemy {
  private hp: number
  readonly maxHp: number
  private bossState: BossState = 'patrol'
  private bossStateTimer = 0
  private chargeDir = 1
  private bossWalkDir = 1
  private invincible = false
  private attackInterval: number
  private specialTimer = 6000
  players: Player[] = []

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    hp: number,
    attackInterval = 3000,
  ) {
    super(scene, x, y, AbilityType.None)
    this.hp = hp
    this.maxHp = hp
    this.attackInterval = attackInterval
    this.bossStateTimer = attackInterval
    this.setScale(1.3)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(46, 50)
  }

  update() {
    const body = this.body as Phaser.Physics.Arcade.Body
    const dt = this.scene.game.loop.delta

    if (this.bossState === 'stagger') {
      this.bossStateTimer -= dt
      if (this.bossStateTimer <= 0) {
        this.bossState = 'patrol'
        this.bossStateTimer = this.attackInterval * (0.7 + Math.random() * 0.6)
        this.clearTint()
      }
      body.setVelocityX(0)
      return
    }

    if (this.bossState === 'charge') {
      body.setVelocityX(this.chargeDir * CHARGE_SPEED)
      this.setFlipX(this.chargeDir > 0)
      if (body.blocked.left || body.blocked.right) this.enterStagger(500)
      return
    }

    if (body.blocked.left)  this.bossWalkDir = 1
    if (body.blocked.right) this.bossWalkDir = -1
    body.setVelocityX(PATROL_SPEED * this.bossWalkDir)
    this.setFlipX(this.bossWalkDir > 0)

    this.bossStateTimer -= dt
    if (this.bossStateTimer <= 0) {
      const alive = this.players.filter(p => p.isAlive)
      if (alive.length > 0) {
        const nearest = alive.reduce((a, b) =>
          Math.abs(a.x - this.x) < Math.abs(b.x - this.x) ? a : b,
        )
        this.chargeDir = nearest.x > this.x ? 1 : -1
        this.bossState = 'charge'
        this.setTint(0xff4400)
        this.bossStateTimer = this.attackInterval * (0.7 + Math.random() * 0.6)
      }
    }

    // Special attack — fires on a separate timer regardless of patrol/charge
    this.specialTimer -= dt
    if (this.specialTimer <= 0) {
      this.specialTimer = 8000 + Math.random() * 4000
      const abilities = [AbilityType.Fire, AbilityType.Electric, AbilityType.Ice]
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

  // Boss ignores inhale entirely
  pullToward(_tx: number, _ty: number, _speed: number) {}
  stopPull() {}

  private enterStagger(ms: number) {
    this.bossState = 'stagger'
    this.bossStateTimer = ms
    this.setTint(0xffffff)
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }
}
