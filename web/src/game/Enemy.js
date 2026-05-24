import Phaser from 'phaser';
import { AbilityType } from '../types';
const WALK_SPEED = 80;
const ATTACK_INTERVAL = {
    [AbilityType.None]: 0, // pinklady boss — handled separately
    [AbilityType.Fire]: 2800,
    [AbilityType.Bomb]: 4200,
    [AbilityType.Electric]: 3400,
    [AbilityType.Ice]: 3000,
};
const ENEMY_SHEET = {
    [AbilityType.None]: 'sheet-enemy-pinklady',
    [AbilityType.Fire]: 'sheet-enemy-dragon',
    [AbilityType.Bomb]: 'sheet-enemy-sqoomba',
    [AbilityType.Electric]: 'sheet-enemy-duckbot',
    [AbilityType.Ice]: 'sheet-enemy-troomba',
};
// Physics body size per enemy type (w, h) — kept narrow like the player's 26×30
const ENEMY_BODY = {
    [AbilityType.None]: [26, 30],
    [AbilityType.Fire]: [30, 34],
    [AbilityType.Bomb]: [30, 30],
    [AbilityType.Electric]: [26, 32],
    [AbilityType.Ice]: [28, 32],
};
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    abilityType;
    flying;
    walkDir = 1;
    beingPulled = false;
    animKey;
    attackTimer;
    constructor(scene, x, y, ability) {
        const isFlying = ability === AbilityType.Fire;
        const sheetKey = ENEMY_SHEET[ability];
        const spawnY = isFlying ? Math.min(y, 340) : y;
        super(scene, x, spawnY, sheetKey);
        this.abilityType = ability;
        this.flying = isFlying;
        this.animKey = sheetKey;
        this.attackTimer = ATTACK_INTERVAL[ability] * (0.4 + Math.random() * 0.6);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        if (ability === AbilityType.None)
            this.setScale(84 / 128);
        const [bw, bh] = ENEMY_BODY[ability];
        const body = this.body;
        body.setCollideWorldBounds(true);
        body.setSize(bw, bh);
        if (isFlying)
            body.setAllowGravity(false);
        this.play(`${this.animKey}-walk`);
    }
    update() {
        if (this.beingPulled)
            return;
        const body = this.body;
        if (this.flying) {
            if (body.blocked.left)
                this.walkDir = 1;
            if (body.blocked.right)
                this.walkDir = -1;
            body.setVelocityX(WALK_SPEED * this.walkDir);
            body.setVelocityY(Math.sin(this.scene.time.now / 600) * 40);
            this.setFlipX(this.walkDir > 0);
            return;
        }
        if (body.blocked.left)
            this.walkDir = 1;
        if (body.blocked.right)
            this.walkDir = -1;
        body.setVelocityX(WALK_SPEED * this.walkDir);
        this.setFlipX(this.walkDir > 0);
    }
    /** Returns true once per attack cycle; GameScene handles the actual projectile. */
    tryAttack(dt) {
        const interval = ATTACK_INTERVAL[this.abilityType];
        if (interval === 0)
            return false;
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attackTimer = interval * (0.7 + Math.random() * 0.6);
            return true;
        }
        return false;
    }
    pullToward(tx, ty, speed) {
        this.beingPulled = true;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
        this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
    stopPull() {
        this.beingPulled = false;
    }
    swallow() {
        ;
        this.body.setEnable(false);
        this.scene.tweens.add({
            targets: this,
            scaleX: 0, scaleY: 0, alpha: 0,
            duration: 150,
            onComplete: () => this.destroy(),
        });
    }
    stun(_ms) {
        ;
        this.body.setVelocity(0, 0);
    }
    die() {
        ;
        this.body.setEnable(false);
        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 1.8, scaleY: 1.8,
            duration: 280,
            onComplete: () => this.destroy(),
        });
    }
}
