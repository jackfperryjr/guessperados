import Phaser from 'phaser'
import { AbilityType } from '../types'

const WALK_SPEED = 80

const ENEMY_SHEET: Record<AbilityType, string> = {
  [AbilityType.None]:     'sheet-enemy-pinklady',
  [AbilityType.Fire]:     'sheet-enemy-dragon',
  [AbilityType.Bomb]:     'sheet-enemy-sqoomba',
  [AbilityType.Electric]: 'sheet-enemy-duckbot',
  [AbilityType.Ice]:      'sheet-enemy-troomba',
}

// Physics body size per enemy type (w, h) — kept narrow like the player's 26×30
const ENEMY_BODY: Record<AbilityType, [number, number]> = {
  [AbilityType.None]:     [26, 30],
  [AbilityType.Fire]:     [30, 34],
  [AbilityType.Bomb]:     [30, 30],
  [AbilityType.Electric]: [26, 32],
  [AbilityType.Ice]:      [28, 32],
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly abilityType: AbilityType
  private walkDir = 1
  private beingPulled = false
  private readonly animKey: string

  constructor(scene: Phaser.Scene, x: number, y: number, ability: AbilityType) {
    const sheetKey = ENEMY_SHEET[ability]
    super(scene, x, y, sheetKey)
    this.abilityType = ability
    this.animKey = sheetKey

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // pinklady sheet is 128×128 — scale it down to match other enemies
    if (ability === AbilityType.None) this.setScale(84 / 128)

    const [bw, bh] = ENEMY_BODY[ability]
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setSize(bw, bh)

    this.play(`${this.animKey}-walk`)
  }

  update() {
    if (this.beingPulled) return
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body.blocked.left)  this.walkDir =  1
    if (body.blocked.right) this.walkDir = -1
    body.setVelocityX(WALK_SPEED * this.walkDir)
    this.setFlipX(this.walkDir > 0)
  }

  pullToward(tx: number, ty: number, speed: number) {
    this.beingPulled = true
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty)
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    )
  }

  stopPull() {
    this.beingPulled = false
  }

  swallow() {
    ;(this.body as Phaser.Physics.Arcade.Body).setEnable(false)
    this.scene.tweens.add({
      targets: this,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 150,
      onComplete: () => this.destroy(),
    })
  }

  stun(_ms: number) {
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }

  die() {
    ;(this.body as Phaser.Physics.Arcade.Body).setEnable(false)
    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 1.8, scaleY: 1.8,
      duration: 280,
      onComplete: () => this.destroy(),
    })
  }
}
