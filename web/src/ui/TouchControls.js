import Phaser from 'phaser';
const STICK_RADIUS = 55;
const DEAD_ZONE = 0.25;
export class TouchControls {
    scene;
    axisX = 0;
    base;
    thumb;
    stickPointerId = null;
    stickOrigin = new Phaser.Math.Vector2();
    jumpHeld = false;
    inhaleHeld = false;
    abilityJust = false;
    rapierJust = false;
    constructor(scene) {
        this.scene = scene;
        this.base = scene.add.circle(0, 0, STICK_RADIUS, 0xffffff, 0.12)
            .setScrollFactor(0).setDepth(50).setVisible(false);
        this.thumb = scene.add.circle(0, 0, 26, 0xffffff, 0.3)
            .setScrollFactor(0).setDepth(51).setVisible(false);
        this.buildButtons();
        this.bindJoystick();
    }
    buildButtons() {
        const { width, height } = this.scene.scale;
        const bx = width - 55;
        const by = height - 65;
        this.btn(bx, by, '▲', 0x4fc3f7, () => { this.jumpHeld = true; }, () => { this.jumpHeld = false; });
        this.btn(bx - 70, by, '⚔', 0xff8a65, () => { this.rapierJust = true; });
        this.btn(bx, by - 70, 'X', 0xa5d6a7, () => { this.abilityJust = true; });
        this.btn(bx - 70, by - 70, 'Z', 0xce93d8, () => { this.inhaleHeld = true; }, () => { this.inhaleHeld = false; });
    }
    btn(x, y, label, color, onDown, onUp) {
        const circle = this.scene.add.circle(x, y, 28, color, 0.7)
            .setScrollFactor(0).setDepth(50).setInteractive();
        this.scene.add.text(x, y, label, { fontSize: '16px', color: '#000', fontStyle: 'bold' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(51);
        circle.on('pointerdown', onDown);
        if (onUp) {
            circle.on('pointerup', onUp);
            circle.on('pointerout', onUp);
        }
    }
    bindJoystick() {
        const leftEdge = this.scene.scale.width * 0.5;
        this.scene.input.on('pointerdown', (p) => {
            if (p.x < leftEdge && this.stickPointerId === null) {
                this.stickPointerId = p.id;
                this.stickOrigin.set(p.x, p.y);
                this.base.setPosition(p.x, p.y).setVisible(true);
                this.thumb.setPosition(p.x, p.y).setVisible(true);
            }
        });
        this.scene.input.on('pointermove', (p) => {
            if (p.id !== this.stickPointerId)
                return;
            const dx = p.x - this.stickOrigin.x;
            const dy = p.y - this.stickOrigin.y;
            const len = Math.hypot(dx, dy);
            const clamped = Math.min(len, STICK_RADIUS);
            const angle = Math.atan2(dy, dx);
            this.thumb.setPosition(this.stickOrigin.x + Math.cos(angle) * clamped, this.stickOrigin.y + Math.sin(angle) * clamped);
            this.axisX = len < 4 ? 0 : (clamped / STICK_RADIUS) * Math.cos(angle);
        });
        this.scene.input.on('pointerup', (p) => {
            if (p.id !== this.stickPointerId)
                return;
            this.stickPointerId = null;
            this.axisX = 0;
            this.base.setVisible(false);
            this.thumb.setVisible(false);
        });
    }
    apply(player) {
        if (!player.isAlive || player.isInhaled)
            return;
        if (this.axisX < -DEAD_ZONE)
            player.moveLeft();
        else if (this.axisX > DEAD_ZONE)
            player.moveRight();
        else
            player.stopHorizontal();
        if (this.jumpHeld)
            player.jump();
        else
            player.jumpReleased();
        player.setInhaling(this.inhaleHeld);
        if (this.abilityJust) {
            player.useAbility();
            this.abilityJust = false;
        }
        if (this.rapierJust) {
            player.useRapier();
            this.rapierJust = false;
        }
    }
    destroy() {
        this.base.destroy();
        this.thumb.destroy();
    }
}
