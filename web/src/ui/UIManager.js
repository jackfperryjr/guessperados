import { AbilityType } from '../types';
export const ABILITY_COLORS = {
    [AbilityType.None]: 0x444444,
    [AbilityType.Fire]: 0xff6600,
    [AbilityType.Bomb]: 0x333333,
    [AbilityType.Electric]: 0xffdd00,
    [AbilityType.Ice]: 0x66ccff,
};
const ABILITY_ICON_KEYS = {
    [AbilityType.Fire]: 'icon-fire',
    [AbilityType.Bomb]: 'icon-bomb',
    [AbilityType.Electric]: 'icon-electric',
    [AbilityType.Ice]: 'icon-ice',
};
const FONT = '"Press Start 2P", monospace';
export class UIManager {
    scene;
    heartIcons = [];
    abilityBoxes = [];
    abilityIcons = [];
    ammoPips = [];
    abilityBoxXs = [];
    bossBarFill = null;
    constructor(scene, playerCount, worldName = '', isBossRoom = false, bossMaxHp = 0) {
        this.scene = scene;
        const { width } = scene.scale;
        if (worldName) {
            scene.add.text(width / 2, 14, worldName, {
                fontSize: '10px', fontFamily: FONT, color: '#aaaaaa',
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
        }
        if (isBossRoom && bossMaxHp > 0) {
            const bx = width / 2;
            const by = 44;
            scene.add.text(bx, by - 14, 'BOSS', {
                fontSize: '8px', fontFamily: FONT, color: '#ff4444',
            }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(20);
            scene.add.rectangle(bx, by, 202, 14, 0x330000)
                .setScrollFactor(0).setDepth(20);
            this.bossBarFill = scene.add.rectangle(bx - 100, by, 200, 12, 0xff2200)
                .setOrigin(0, 0.5)
                .setScrollFactor(0).setDepth(21);
        }
        for (let i = 0; i < playerCount; i++) {
            const baseX = i === 0 ? 16 : width - 16;
            const anchorRight = i !== 0;
            const hearts = [];
            for (let h = 0; h < 3; h++) {
                const hx = anchorRight ? baseX - h * 22 - 8 : baseX + h * 22 + 8;
                const icon = scene.add.image(hx, 46, 'item-heart')
                    .setScale(0.48).setScrollFactor(0).setDepth(20);
                hearts.push(icon);
            }
            this.heartIcons.push(hearts);
            const abx = anchorRight ? baseX - 84 : baseX + 84;
            this.abilityBoxXs.push(abx);
            const box = scene.add.rectangle(abx, 46, 28, 28, 0x222222)
                .setScrollFactor(0).setDepth(20);
            const abilityIcon = scene.add.image(abx, 46, 'icon-fire')
                .setVisible(false)
                .setScrollFactor(0).setDepth(21);
            this.abilityBoxes.push(box);
            this.abilityIcons.push(abilityIcon);
            this.ammoPips.push([]);
        }
    }
    initAbilityPips(playerIdx, maxAmmo) {
        this.ammoPips[playerIdx]?.forEach(p => p.destroy());
        this.ammoPips[playerIdx] = [];
        if (maxAmmo <= 0)
            return;
        const abx = this.abilityBoxXs[playerIdx];
        const pipW = Math.min(8, Math.floor(100 / maxAmmo) - 1);
        const gap = 1;
        const totalW = maxAmmo * pipW + (maxAmmo - 1) * gap;
        const startX = abx - totalW / 2;
        for (let i = 0; i < maxAmmo; i++) {
            const px = startX + i * (pipW + gap) + pipW / 2;
            const pip = this.scene.add.rectangle(px, 66, pipW, 5, 0xffffff)
                .setScrollFactor(0).setDepth(20);
            this.ammoPips[playerIdx].push(pip);
        }
    }
    updateAmmo(playerIdx, current) {
        const pips = this.ammoPips[playerIdx];
        if (!pips)
            return;
        pips.forEach((pip, i) => pip.setFillStyle(i < current ? 0xffffff : 0x333333));
    }
    update(players) {
        players.forEach((p, i) => {
            this.heartIcons[i]?.forEach((icon, h) => icon.setAlpha(h < p.hearts ? 1 : 0.2));
            const ability = p.currentAbility;
            this.abilityBoxes[i]?.setFillStyle(ABILITY_COLORS[ability]);
            const icon = this.abilityIcons[i];
            if (icon) {
                const key = ABILITY_ICON_KEYS[ability];
                if (key) {
                    icon.setTexture(key).setVisible(true);
                }
                else {
                    icon.setVisible(false);
                }
            }
        });
    }
    updateBossBar(current, max) {
        if (!this.bossBarFill)
            return;
        const pct = max > 0 ? Math.max(0, current / max) : 0;
        this.bossBarFill.width = Math.round(200 * pct);
    }
}
