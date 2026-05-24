import Phaser from 'phaser'
import { AbilityType, DamageType } from '../types'
import { BootScene } from '../scenes/BootScene'

const MOVE_SPEED        = 220
const JUMP_VELOCITY     = -520
const FLOAT_GRAVITY     = -700   // cancels most world gravity while floating
const INHALE_RANGE      = 190
const KILL_RANGE        = 60     // unused without impostor; kept for future
const PLAYER_CARRY_MS   = 1000   // how long until auto-spit
const SPIT_VX           = 540
const SPIT_VY           = -320

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerId: number

  hearts        = 3
  currentAbility: AbilityType = AbilityType.None
  isAlive       = true
  isInhaled     = false

  private isFloating    = false
  private isInhaling    = false
  private invincible    = false
  private inhaledObject: Phaser.Physics.Arcade.Sprite | null = null
  private animPrefix: string | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, id: number) {
    const sheetKey = BootScene.getSheetKey(id)
    const useSheet = sheetKey !== null && scene.textures.exists(sheetKey)
    const textureKey = useSheet ? sheetKey! : BootScene.getFallbackTexture(id)
    super(scene, x, y, textureKey)
    this.playerId = id
    this.animPrefix = useSheet ? BootScene.getAnimPrefix(id) : null

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setSize(26, 30)
  }

  // ── movement ────────────────────────────────────────────────────────────────

  moveLeft()       { ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(-MOVE_SPEED); this.setFlipX(true)  }
  moveRight()      { ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX( MOVE_SPEED); this.setFlipX(false) }
  stopHorizontal() { ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(0) }

  jump() {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (body.blocked.down) {
      body.setVelocityY(JUMP_VELOCITY)
      this.isFloating = false
    } else if (!this.isFloating) {
      this.isFloating = true
    }
  }

  jumpReleased() { this.isFloating = false }

  update() {
    if (!this.isAlive || this.isInhaled) return
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setGravityY(this.isFloating ? FLOAT_GRAVITY : 0)
    if (body.blocked.down) this.isFloating = false

    if (this.inhaledObject) {
      this.inhaledObject.setPosition(this.x, this.y)
    }

    this.updateAnimation()
  }

  private updateAnimation() {
    if (!this.animPrefix) return
    const body = this.body as Phaser.Physics.Arcade.Body
    const vx = Math.abs(body.velocity.x)

    let anim: string
    if (this.hasInhaled)         anim = 'puffed'
    else if (this.isInhaling)    anim = 'inhale'
    else if (this.isFloating)    anim = 'float'
    else if (!body.blocked.down && body.velocity.y > 80) anim = 'fall'
    else if (!body.blocked.down) anim = 'jump'
    else if (vx > 10)            anim = 'walk'
    else                         anim = 'idle'

    const key = `${this.animPrefix}-${anim}`
    if (this.anims.currentAnim?.key !== key) this.play(key, true)
  }

  // ── inhale / spit ───────────────────────────────────────────────────────────

  setInhaling(active: boolean) { this.isInhaling = active }

  get inhaling()        { return this.isInhaling }
  get hasInhaled()      { return this.inhaledObject !== null }
  inhaleRange()         { return INHALE_RANGE }
  killRange()           { return KILL_RANGE }

  swallowEnemy(ability: AbilityType) {
    this.currentAbility = ability
    this.isInhaling = false
    this.emit('abilityChanged', ability)
  }

  captureSpriteObject(obj: Phaser.Physics.Arcade.Sprite) {
    if (this.inhaledObject) return
    this.inhaledObject = obj
    ;(obj.body as Phaser.Physics.Arcade.Body).setEnable(false)
    obj.setVisible(false)
    this.setScale(1.3, 1.0)
    this.scene.time.delayedCall(PLAYER_CARRY_MS, () => this.spitObject())
  }

  capturePlayer(other: Player) {
    if (this.inhaledObject || other.isInhaled || !other.isAlive) return
    other.isInhaled = true
    ;(other.body as Phaser.Physics.Arcade.Body).setEnable(false)
    other.setVisible(false)
    this.inhaledObject = other as unknown as Phaser.Physics.Arcade.Sprite
    this.isInhaling = false
    this.setScale(1.3, 1.0)
    this.scene.time.delayedCall(PLAYER_CARRY_MS, () => this.spitObject())
  }

  spitObject() {
    if (!this.inhaledObject) return
    const obj = this.inhaledObject
    this.inhaledObject = null
    this.setScale(1)

    if ((obj as unknown as Player).isInhaled !== undefined) {
      // It's another player
      const other = obj as unknown as Player
      other.isInhaled = false
      other.setVisible(true)
      other.setPosition(this.x + (this.flipX ? -50 : 50), this.y)
      ;(other.body as Phaser.Physics.Arcade.Body).setEnable(true)
      ;(other.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.flipX ? -SPIT_VX : SPIT_VX, SPIT_VY
      )
    } else {
      // It's an object/crate — launch as projectile
      obj.setVisible(true)
      obj.setPosition(this.x + (this.flipX ? -50 : 50), this.y)
      ;(obj.body as Phaser.Physics.Arcade.Body).setEnable(true)
      ;(obj.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.flipX ? -SPIT_VX : SPIT_VX, SPIT_VY
      )
      this.emit('objectSpit', obj)
    }

    this.isInhaling = false
  }

  // ── abilities ───────────────────────────────────────────────────────────────

  useAbility() {
    if (this.currentAbility === AbilityType.None) return
    this.emit('useAbility', this.currentAbility, this)
    this.currentAbility = AbilityType.None
    this.emit('abilityChanged', AbilityType.None)
  }

  // ── damage ──────────────────────────────────────────────────────────────────

  hitByEnemy() {
    if (this.invincible || !this.isAlive) return
    this.hearts--
    this.emit('heartLost', this.hearts)

    this.invincible = true
    this.scene.tweens.add({
      targets: this, alpha: 0.2,
      duration: 120, yoyo: true, repeat: 5,
      onComplete: () => { this.setAlpha(1); this.invincible = false },
    })

    const dx = (this.body as Phaser.Physics.Arcade.Body).velocity.x > 0 ? -1 : 1
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(dx * 250)

    if (this.hearts <= 0) this.die()
  }

  takeDamage(_amount: number, _type: DamageType) {
    this.hitByEnemy()
  }

  stun(ms: number) {
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.setTint(0xffff00)
    this.scene.time.delayedCall(ms, () => this.clearTint())
  }

  die() {
    if (this.inhaledObject) this.spitObject()
    this.isAlive = false
    this.setAlpha(0.3)
    this.setTint(0x888888)
    ;(this.body as Phaser.Physics.Arcade.Body).setEnable(false)
    this.emit('died', this)
  }
}
