import Phaser from 'phaser';
const FONT = '"Press Start 2P", monospace';
const FADE_MS = 600;
const HOLD_MS = 1400;
const SLIDE_MS = FADE_MS + HOLD_MS + FADE_MS + 200; // total time per slide
const SLIDES = [
    { label: 'PRODUCED BY', name: 'JACK', nameColor: '#ffe066' },
    { label: 'INSPIRED BY', name: 'HIS KIDS', nameColor: '#ff80ab' },
    { label: 'DEVELOPED BY', name: 'CLAUDE', nameColor: '#80d8ff', sub: '( AN ANTHROPIC AI )' },
];
export class IntroScene extends Phaser.Scene {
    skipped = false;
    constructor() { super({ key: 'IntroScene' }); }
    create() {
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.skipped = false;
        // Any input skips straight to the menu
        this.input.once('pointerdown', () => this.skip());
        this.input.keyboard?.once('keydown', () => this.skip());
        this.input.gamepad?.once(Phaser.Input.Gamepad.Events.BUTTON_DOWN, () => this.skip());
        this.runSlideshow();
    }
    skip() {
        if (this.skipped)
            return;
        this.skipped = true;
        this.tweens.killAll();
        this.time.removeAllEvents();
        this.toMenu();
    }
    toMenu() {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    }
    runSlideshow() {
        let t = 300;
        for (const slide of SLIDES) {
            this.scheduleSlide(slide, t);
            t += SLIDE_MS;
        }
        this.time.delayedCall(t + 100, () => { if (!this.skipped)
            this.toMenu(); });
    }
    scheduleSlide(slide, startAt) {
        const { width, height } = this.scale;
        const cx = width / 2, cy = height / 2;
        const label = this.add.text(cx, cy - 50, slide.label, {
            fontSize: '11px', fontFamily: FONT, color: '#556677', letterSpacing: 8,
        }).setOrigin(0.5).setAlpha(0);
        const name = this.add.text(cx, cy + 16, slide.name, {
            fontSize: '46px', fontFamily: FONT, color: slide.nameColor,
            stroke: '#000000', strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0).setScale(0.7);
        const objs = [label, name];
        if (slide.sub) {
            objs.push(this.add.text(cx, cy + 80, slide.sub, {
                fontSize: '9px', fontFamily: FONT, color: '#445566',
            }).setOrigin(0.5).setAlpha(0));
        }
        // Thin separator lines flanking the label
        const lineL = this.add.rectangle(cx - 220, cy - 50, 160, 1, 0x334455, 0).setOrigin(0.5);
        const lineR = this.add.rectangle(cx + 220, cy - 50, 160, 1, 0x334455, 0).setOrigin(0.5);
        this.time.delayedCall(startAt, () => {
            if (this.skipped)
                return;
            this.tweens.add({ targets: objs, alpha: 1, duration: FADE_MS });
            this.tweens.add({ targets: [lineL, lineR], alpha: 0.6, duration: FADE_MS + 200 });
            this.tweens.add({ targets: name, scaleX: 1, scaleY: 1,
                duration: FADE_MS + 80, ease: 'Back.Out' });
            this.time.delayedCall(FADE_MS + HOLD_MS, () => {
                if (this.skipped)
                    return;
                this.tweens.add({ targets: [...objs, lineL, lineR], alpha: 0, duration: FADE_MS });
            });
        });
    }
}
