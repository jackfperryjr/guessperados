import Phaser from 'phaser'
import { AbilityType, DamageType } from '../types'
import { BootScene } from '../scenes/BootScene'
import { SoundManager } from '../audio/SoundManager'

const MOVE_SPEED        = 220
const JUMP_VELOCITY     = -520
const FLOAT_GRAVITY     = -700
const INHALE_RANGE      = 190
const KILL_RANGE        = 60
const PLAYER_CARRY_MS   = 1000
const SPIT_VX           = 540
const SPIT_VY           = -320

export const ABILITY_AMMO: Record<AbilityType, number> = {
  [AbilityType.None]:     0,
  [AbilityType.Fire]:     10,
  [AbilityType.Electric]: 3,
  [AbilityType.Ice]:      10,
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly playerId: number

  hearts        = 5
  currentAbility: AbilityType = AbilityType.None
  abilityAmmo   = 0
  isAlive       = true
  isInhaled     = false
  speedMultiplier  = 1.0
  controlsReversed = false

  private isFloating    = false
  private isInhaling    = false
  private invincible    = false
  private isMeleeing    = false
  private inhaledObject: Phaser.Physics.Arcade.Sprite | null = null
  private animPrefix: string | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, id: number) {
    const selectedChars: string[] | undefined = scene.registry.get('selectedChars')
    const charKey = selectedChars?.[id]
    let resolvedSheet: string | null = null
    let resolvedPrefix: string | null = null
    if (charKey && scene.textures.exists(`sheet-${charKey}`)) {
      resolvedSheet = `sheet-${charKey}`
      resolvedPrefix = `char-${charKey}`
    } else {
      const defaultSheet = BootScene.getSheetKey(id)
      if (defaultSheet && scene.textures.exists(defaultSheet)) {
        resolvedSheet  = defaultSheet
        resolvedPrefix = BootScene.getAnimPrefix(id)
      }
    }
    const textureKey = resolvedSheet ?? BootScene.getFallbackTexture(id)
    super(scene, x, y, textureKey)
    this.playerId = id
    this.animPrefix = resolvedPrefix

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(1.15)  // 64px frame → ~74px display

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(false)
    body.setSize(28, 40, false)
    body.setOffset(18, 20)

  }

  // ── movement ────────────────────────────────────────────────────────────────

  moveLeft() {
    const dir = this.controlsReversed ? 1 : -1
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * MOVE_SPEED * this.speedMultiplier)
    this.setFlipX(this.controlsReversed ? false : true)
  }
  moveRight() {
    const dir = this.controlsReversed ? -1 : 1
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * MOVE_SPEED * this.speedMultiplier)
    this.setFlipX(this.controlsReversed ? true : false)
  }
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

  applyTempEffect(type: 'fast' | 'reverse', ms: number) {
    if (type === 'fast') {
      this.speedMultiplier = 1.7
      this.scene.time.delayedCall(ms, () => { if (this.active) this.speedMultiplier = 1.0 })
    } else {
      this.controlsReversed = true
      this.setTint(0xcc00ff)
      this.scene.time.delayedCall(ms, () => {
        if (this.active) { this.controlsReversed = false; this.clearTint() }
      })
    }
  }

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
    if (this.isMeleeing)         anim = 'melee'
    else if (this.hasInhaled)    anim = 'puffed'
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

  get inhaling()   { return this.isInhaling }
  get hasInhaled() { return this.inhaledObject !== null }
  inhaleRange()    { return INHALE_RANGE }
  killRange()      { return KILL_RANGE }

  swallowEnemy(ability: AbilityType) {
    this.currentAbility = ability
    this.abilityAmmo = ABILITY_AMMO[ability]
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
      const other = obj as unknown as Player
      other.isInhaled = false
      other.setVisible(true)
      other.setPosition(this.x + (this.flipX ? -50 : 50), this.y)
      ;(other.body as Phaser.Physics.Arcade.Body).setEnable(true)
      ;(other.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.flipX ? -SPIT_VX : SPIT_VX, SPIT_VY,
      )
    } else {
      obj.setVisible(true)
      obj.setPosition(this.x + (this.flipX ? -50 : 50), this.y)
      ;(obj.body as Phaser.Physics.Arcade.Body).setEnable(true)
      ;(obj.body as Phaser.Physics.Arcade.Body).setVelocity(
        this.flipX ? -SPIT_VX : SPIT_VX, SPIT_VY,
      )
      this.emit('objectSpit', obj)
    }

    this.isInhaling = false
  }

  // ── abilities ───────────────────────────────────────────────────────────────

  useAbility() {
    if (this.currentAbility === AbilityType.None) return
    const ability = this.currentAbility
    this.emit('useAbility', ability, this)
    this.abilityAmmo--
    if (this.abilityAmmo <= 0) {
      this.currentAbility = AbilityType.None
      this.abilityAmmo = 0
      this.emit('abilityChanged', AbilityType.None)
    } else {
      this.emit('abilityAmmoChanged', this.abilityAmmo)
    }
  }

  swingMelee() {
    if (this.isMeleeing || !this.isAlive || this.isInhaled) return
    this.isMeleeing = true
    this.emit('useMelee', this)
    this.scene.time.delayedCall(350, () => { if (this.active) this.isMeleeing = false })
  }

  // ── damage ──────────────────────────────────────────────────────────────────

  hitByEnemy() {
    if (this.invincible || !this.isAlive) return
    SoundManager.playerHit()
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

  takeDamage(_amount: number, _type: DamageType) { this.hitByEnemy() }

  destroy(fromScene?: boolean) {
    super.destroy(fromScene)
  }

  stun(ms: number) {
    ;(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.setTint(0xffff00)
    this.scene.time.delayedCall(ms, () => this.clearTint())
  }

  die() {
    if (this.inhaledObject) this.spitObject()
    SoundManager.playerDeath()
    this.isAlive = false
    this.setAlpha(0.3)
    this.setTint(0x888888)
    ;(this.body as Phaser.Physics.Arcade.Body).setEnable(false)
    this.emit('died', this)
  }
}
