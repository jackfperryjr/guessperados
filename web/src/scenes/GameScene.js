import Phaser from 'phaser';
import { Player } from '../game/Player';
import { Enemy } from '../game/Enemy';
import { Boss } from '../game/Boss';
import { Destructible } from '../game/Destructible';
import { GameManager } from '../game/GameManager';
import { UIManager } from '../ui/UIManager';
import { TouchControls } from '../ui/TouchControls';
import { LEVEL_POOLS, generateRoomSequence, ROOMS_PER_RUN, WORLD_NAMES } from '../levels';
import { AbilityType, DamageType } from '../types';
import { ABILITY_COLORS } from '../ui/UIManager';
import { ABILITY_AMMO } from '../game/Player';
const FONT = '"Press Start 2P", monospace';
const INHALE_PULL_SPEED = 400;
const SCORE_ENEMY = 200;
const SCORE_DESTRUCT = 100;
const KEYBOARD_CONFIGS = [
    { left: 'A', right: 'D', jump: 'W', inhale: 'Z', ability: 'X', rapier: 'C' },
    { left: 'LEFT', right: 'RIGHT', jump: 'UP', inhale: 'K', ability: 'L', rapier: 'COMMA' },
];
export class GameScene extends Phaser.Scene {
    cfg;
    gm;
    ui;
    players = [];
    enemies = [];
    boss = null;
    enemyGroup;
    destructibles = [];
    crates = [];
    projectiles;
    enemyProjectiles;
    platforms;
    cameraTarget;
    bgLayers = [];
    goalSprite;
    portalLocked = false;
    portalLabel = null;
    collectibleSprites = [];
    inhaleGraphics = [];
    playerKeysets = new Map();
    touchControls = null;
    pauseContainer;
    score = 0;
    nm = null;
    localPlayerId = 0;
    remoteInputs = new Map();
    constructor() { super({ key: 'GameScene' }); }
    init() {
        this.players = [];
        this.enemies = [];
        this.destructibles = [];
        this.crates = [];
        this.bgLayers = [];
        this.collectibleSprites = [];
        this.inhaleGraphics = [];
        this.playerKeysets.clear();
        this.touchControls = null;
        this.remoteInputs.clear();
        this.nm = null;
        this.score = 0;
        this.boss = null;
        this.portalLocked = false;
        this.portalLabel = null;
    }
    create() {
        const levelNum = this.registry.get('currentLevel') ?? 1;
        const roomNum = this.registry.get('currentRoom') ?? 1;
        // Generate (or reuse) the room sequence for this level
        if (roomNum === 1) {
            const seq = generateRoomSequence(levelNum);
            this.registry.set('roomSequence', seq);
        }
        const seq = this.registry.get('roomSequence') ?? generateRoomSequence(levelNum);
        const poolIdx = seq[roomNum - 1] ?? 0;
        const pool = LEVEL_POOLS[levelNum - 1] ?? LEVEL_POOLS[0];
        const rawCfg = pool[poolIdx] ?? pool[0];
        this.cfg = { ...rawCfg, roomNum };
        this.score = this.registry.get('score') ?? 0;
        this.gm = new GameManager();
        this.nm = this.registry.get('networkManager') ?? null;
        this.localPlayerId = this.registry.get('localPlayerId') ?? 0;
        if (this.nm) {
            this.nm.onRemoteInput = (id, input) => this.remoteInputs.set(id, input);
            this.nm.onPlayerLeft = (id) => this.removeRemotePlayer(id);
        }
        this.physics.world.setBounds(0, 0, this.cfg.worldWidth, 720);
        this.cameras.main.setBounds(0, 0, this.cfg.worldWidth, 720);
        this.cameras.main.setRoundPixels(true);
        this.buildBackground();
        this.buildScenery();
        this.buildLevel();
        this.setupCollectibles();
        this.spawnPlayers();
        this.setupCollision();
        this.setupGamepadEvents();
        this.setupCamera();
        const worldName = WORLD_NAMES[levelNum - 1] ?? '';
        this.ui = new UIManager(this, this.registry.get('playerCount') ?? 1, worldName, this.cfg.isBossRoom, this.cfg.bossHp ?? 0);
        if (this.boss) {
            this.boss.on('hpChanged', (hp, max) => this.ui.updateBossBar(hp, max));
            this.boss.on('bossAttack', (ability) => this.fireBossSpecial(ability));
            this.ui.updateBossBar(this.cfg.bossHp, this.cfg.bossHp);
        }
        this.wirePlayerUIEvents();
        this.buildPauseMenu();
        this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
    // ── background ──────────────────────────────────────────────────────────────
    buildBackground() {
        const { width, height } = this.scale;
        const cx = width / 2, cy = height / 2;
        const ln = this.cfg.levelNum, rn = this.cfg.roomNum;
        this.bgLayers.push(this.add.tileSprite(cx, cy, width, height, this.cfg.bgFar).setScrollFactor(0), this.add.tileSprite(cx, cy, width, height, this.cfg.bgMid)
            .setScrollFactor(0).setAlpha(0.75));
        // Atmospheric overlay — mid rooms cooler, boss room deeper
        if (!this.cfg.isBossRoom && rn >= 2 && rn < ROOMS_PER_RUN) {
            const color = ln === 3 ? 0x1a0000 : ln === 2 ? 0x0a0a1a : 0x000a1a;
            this.add.rectangle(cx, cy, width, height, color, 0.25).setScrollFactor(0).setDepth(1);
        }
        else if (this.cfg.isBossRoom) {
            const color = ln === 3 ? 0x2a0000 : ln === 2 ? 0x0a0014 : 0x00001a;
            const overlay = this.add.rectangle(cx, cy, width, height, color, 0.40).setScrollFactor(0).setDepth(1);
            this.tweens.add({ targets: overlay, alpha: 0.55, duration: 2000, yoyo: true, repeat: -1 });
        }
        // Level 3: lava glow rising from pit floor
        if (ln === 3) {
            const glow = this.add.rectangle(this.cfg.worldWidth / 2, 730, this.cfg.worldWidth, 80, 0xff3300, 0.18).setScrollFactor(1);
            this.tweens.add({ targets: glow, alpha: 0.32, duration: 1200, yoyo: true, repeat: -1 });
        }
    }
    // ── scenery ──────────────────────────────────────────────────────────────────
    buildScenery() {
        if (this.cfg.levelNum === 1)
            this.buildSceneryStation();
        else if (this.cfg.levelNum === 2)
            this.buildSceneryAsteroid();
        else
            this.buildSceneryCore();
    }
    buildSceneryStation() {
        const w = this.cfg.worldWidth;
        const girderYs = [180, 240, 160, 210, 190, 170, 200, 220];
        for (let i = 0; i < 8; i++) {
            const x = 200 + i * (w / 8);
            this.add.image(x, girderYs[i % girderYs.length], 'scn-girder').setAlpha(0.55).setDepth(2);
        }
        const strutCount = Math.max(4, Math.floor(w / 400));
        for (let i = 0; i < strutCount; i++) {
            const sx = 120 + i * (w / strutCount);
            this.add.image(sx, 110, 'scn-strut-v').setAlpha(0.5).setDepth(2);
        }
        const vpCount = Math.max(3, Math.floor(w / 450));
        for (let i = 0; i < vpCount; i++) {
            const x = 300 + i * (w / vpCount);
            const y = 180 + (i % 3) * 30;
            const vp = this.add.image(x, y, 'scn-viewport').setAlpha(0.8).setDepth(3);
            this.tweens.add({ targets: vp, alpha: 0.55, duration: 2200 + (x % 900),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        const panelCount = Math.max(3, Math.floor(w / 400));
        for (let i = 0; i < panelCount; i++) {
            const x = 520 + i * (w / panelCount);
            const y = 260 + (i % 3) * 20;
            this.add.image(x, y, 'scn-panel').setAlpha(0.7).setDepth(3);
            const blink = this.add.rectangle(x + 18, y - 10, 6, 6, 0x00e676).setAlpha(0.9).setDepth(4);
            this.tweens.add({ targets: blink, alpha: 0.1, duration: 400 + (x % 600), yoyo: true, repeat: -1 });
        }
        const warnCount = Math.max(3, Math.floor(w / 500));
        for (let i = 0; i < warnCount; i++) {
            this.add.image(500 + i * (w / warnCount), 682, 'scn-warning').setAlpha(0.6).setDepth(2);
        }
    }
    buildSceneryAsteroid() {
        const w = this.cfg.worldWidth;
        const lgCount = Math.max(4, Math.floor(w / 350));
        for (let i = 0; i < lgCount; i++) {
            const x = 350 + i * (w / lgCount);
            const y = 120 + (i % 4) * 20;
            const ast = this.add.image(x, y, 'scn-asteroid-lg')
                .setScale(0.9 + (i % 3) * 0.2).setAlpha(0.45).setDepth(2);
            this.tweens.add({ targets: ast, rotation: Math.PI * 2,
                duration: 18000 + (x % 8000), repeat: -1, ease: 'Linear' });
        }
        const smCount = Math.max(8, Math.floor(w / 160));
        for (let i = 0; i < smCount; i++) {
            const x = 150 + i * (w / smCount);
            const y = 80 + (i % 5) * 60;
            const ast = this.add.image(x, y, 'scn-asteroid-sm')
                .setAlpha(0.65).setScale(0.7 + (i % 4) * 0.15).setDepth(3);
            this.tweens.add({ targets: ast, rotation: Math.PI * 2,
                duration: 10000 + (i * 1500), repeat: -1, ease: 'Linear' });
        }
        const spireCount = Math.max(4, Math.floor(w / 320));
        for (let i = 0; i < spireCount; i++) {
            this.add.image(200 + i * (w / spireCount), 648, 'scn-rock-spire')
                .setOrigin(0.5, 1).setAlpha(0.6).setDepth(2);
        }
    }
    buildSceneryCore() {
        const w = this.cfg.worldWidth;
        const clusterCount = Math.max(4, Math.floor(w / 340));
        for (let i = 0; i < clusterCount; i++) {
            const cx = 250 + i * (w / clusterCount);
            this.add.image(cx, 680, 'scn-crystal-cluster').setOrigin(0.5, 1).setAlpha(0.7).setDepth(3);
            const glow = this.add.rectangle(cx, 650, 80, 40, 0x1565c0, 0.15).setDepth(2);
            this.tweens.add({ targets: glow, alpha: 0.04, duration: 1600 + cx % 800, yoyo: true, repeat: -1 });
        }
        const tallCount = Math.max(5, Math.floor(w / 340));
        for (let i = 0; i < tallCount; i++) {
            const x = 450 + i * (w / tallCount);
            const y = 460 + (i % 3) * 20;
            const tint = [0x1565c0, 0x4527a0, 0x6a1b9a][Math.floor(x / 1200) % 3];
            this.add.image(x, y, 'scn-crystal-lg').setOrigin(0.5, 1).setTint(tint).setAlpha(0.65).setDepth(3);
        }
        const stalCount = Math.max(6, Math.floor(w / 450));
        for (let i = 0; i < stalCount; i++) {
            const x = 300 + i * (w / stalCount);
            const h = 40 + (x % 60);
            this.add.image(x, 0, 'scn-stalactite').setOrigin(0.5, 0).setDisplaySize(24, h).setAlpha(0.7).setDepth(3);
        }
        const lavaCount = Math.max(4, Math.floor(w / 380));
        for (let i = 0; i < lavaCount; i++) {
            const lx = 550 + i * (w / lavaCount);
            const pool = this.add.image(lx, 686, 'scn-lava-pool').setAlpha(0.85).setDepth(3);
            this.tweens.add({ targets: pool, alpha: 0.6, duration: 800 + lx % 600, yoyo: true, repeat: -1 });
        }
    }
    // ── collectibles ──────────────────────────────────────────────────────────────
    setupCollectibles() {
        for (const item of this.cfg.items) {
            const tex = item.type === 'heart' ? 'item-heart'
                : item.type === 'life' ? 'item-life'
                    : item.type === 'mystery' ? 'item-mystery'
                        : 'item-orb';
            const img = this.add.image(item.x, item.y, tex).setDepth(8).setScale(1.2);
            img.setData('item', item);
            if (item.type === 'ability') {
                img.setTint(ABILITY_COLORS[item.ability ?? AbilityType.None]);
            }
            this.tweens.add({
                targets: img, y: item.y - 12,
                duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            this.tweens.add({
                targets: img, rotation: Math.PI * 2,
                duration: item.type === 'mystery' ? 1800 : 3200, repeat: -1, ease: 'Linear',
            });
            this.collectibleSprites.push(img);
        }
    }
    collectItem(player, item) {
        if (item.type === 'heart') {
            player.hearts = Math.min(3, player.hearts + 1);
            this.showPopup(item.x, item.y, '+HEART', '#ff4d6a');
        }
        else if (item.type === 'life') {
            const lives = (this.registry.get('lives') ?? 1) + 1;
            this.registry.set('lives', lives);
            this.showPopup(item.x, item.y, '1-UP!', '#ffe066');
        }
        else if (item.type === 'ability') {
            const ab = item.ability ?? AbilityType.None;
            player.currentAbility = ab;
            player.abilityAmmo = ABILITY_AMMO[ab];
            player.emit('abilityChanged', ab);
            this.showPopup(item.x, item.y, AbilityType[ab].toUpperCase() + '!', '#aaffaa');
        }
        else if (item.type === 'mystery') {
            this.triggerMysteryEffect(player);
        }
        this.addScore(500);
    }
    triggerMysteryEffect(player) {
        const isGood = Math.random() < 0.5;
        if (isGood) {
            const r = Math.floor(Math.random() * 3);
            if (r === 0) {
                player.hearts = Math.min(3, player.hearts + 1);
                this.showPopup(player.x, player.y - 32, '+ HEART!', '#ff4d6a');
            }
            else if (r === 1) {
                const abilities = [AbilityType.Fire, AbilityType.Bomb, AbilityType.Electric, AbilityType.Ice];
                const ability = abilities[Math.floor(Math.random() * abilities.length)];
                player.currentAbility = ability;
                player.abilityAmmo = ABILITY_AMMO[ability];
                player.emit('abilityChanged', ability);
                this.showPopup(player.x, player.y - 32, AbilityType[ability] + '!', '#aaffaa');
            }
            else {
                player.applyTempEffect('fast', 5000);
                this.showPopup(player.x, player.y - 32, 'SPEED UP!', '#ffe066');
            }
        }
        else {
            const r = Math.floor(Math.random() * 3);
            if (r === 0) {
                player.hitByEnemy();
                this.showPopup(player.x, player.y - 32, '- HEART', '#ff4444');
            }
            else if (r === 1) {
                this.spawnMysteryEnemies(player, 2);
                this.showPopup(player.x, player.y - 32, 'AMBUSH!', '#ff6600');
            }
            else {
                player.applyTempEffect('reverse', 4000);
                this.showPopup(player.x, player.y - 32, 'REVERSED!', '#cc00ff');
            }
        }
    }
    spawnMysteryEnemies(near, count) {
        const abilities = [AbilityType.Bomb, AbilityType.Electric, AbilityType.Ice];
        for (let i = 0; i < count; i++) {
            const ability = abilities[Math.floor(Math.random() * abilities.length)];
            const ex = near.x + (i === 0 ? -120 : 120);
            const enemy = new Enemy(this, ex, near.y - 10, ability);
            this.enemies.push(enemy);
            this.enemyGroup.add(enemy);
            this.physics.add.collider(enemy, this.platforms);
        }
    }
    showPopup(x, y, text, color) {
        const popup = this.add.text(x, y - 16, text, {
            fontSize: '11px', fontFamily: FONT, color,
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
            targets: popup, y: y - 70, alpha: 0,
            duration: 1400, ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }
    // ── level ───────────────────────────────────────────────────────────────────
    buildLevel() {
        this.platforms = this.physics.add.staticGroup();
        this.projectiles = this.physics.add.group();
        this.enemyGroup = this.physics.add.group();
        this.enemyProjectiles = this.physics.add.group();
        for (const p of this.cfg.platforms) {
            const tile = this.add.tileSprite(p.x, p.y, p.w, p.h, this.cfg.tileset);
            this.physics.add.existing(tile, true);
            this.platforms.add(tile);
        }
        for (const d of this.cfg.destructibles) {
            const dest = new Destructible(this, d.x, d.y, d.health, d.ability, d.resistances ?? {});
            dest.setDisplaySize(d.w, d.h);
            this.destructibles.push(dest);
            dest.on('destroyed', (obj) => {
                this.destructibles = this.destructibles.filter(x => x !== obj);
                this.addScore(SCORE_DESTRUCT);
                if (obj.abilityDrop !== AbilityType.None)
                    this.spawnAbilityDrop(obj.x, obj.y, obj.abilityDrop);
            });
        }
        for (const c of this.cfg.crates) {
            const crate = this.physics.add.image(c.x, c.y, 'crate');
            crate.body.setCollideWorldBounds(true);
            crate.setDisplaySize(32, 32);
            this.crates.push(crate);
        }
        for (const e of this.cfg.enemies) {
            const enemy = new Enemy(this, e.x, e.y, e.ability);
            this.enemies.push(enemy);
            this.enemyGroup.add(enemy);
        }
        // Boss (boss rooms only)
        if (this.cfg.isBossRoom && this.cfg.bossSpawnX && this.cfg.bossHp) {
            this.boss = new Boss(this, this.cfg.bossSpawnX, 620, this.cfg.bossHp, 3000);
            this.boss.on('bossDead', () => this.unlockPortal());
        }
        // Goal portal
        this.goalSprite = this.physics.add.staticImage(this.cfg.goalX, 644, 'goal-portal');
        this.tweens.add({ targets: this.goalSprite, rotation: Math.PI * 2, duration: 2800, repeat: -1, ease: 'Linear' });
        this.tweens.add({ targets: this.goalSprite, scale: 1.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (this.cfg.isBossRoom) {
            this.portalLocked = true;
            this.goalSprite.setTint(0x444444);
            this.portalLabel = this.add.text(this.cfg.goalX, 608, '⚔ DEFEAT BOSS', {
                fontSize: '8px', fontFamily: FONT, color: '#ff4444',
            }).setOrigin(0.5).setDepth(10);
        }
        else {
            this.add.text(this.cfg.goalX, 608, '↓ PORTAL', {
                fontSize: '8px', fontFamily: FONT, color: '#40c4ff',
            }).setOrigin(0.5);
        }
    }
    unlockPortal() {
        this.portalLocked = false;
        this.portalLabel?.setText('↓ ENTER');
        this.portalLabel?.setStyle({ color: '#40c4ff' });
        this.goalSprite.clearTint();
        this.cameras.main.shake(300, 0.010);
        this.showPopup(this.cfg.goalX, 580, 'BOSS DEFEATED!', '#ffe066');
        // Award boss score
        this.addScore(2000);
    }
    // ── players ─────────────────────────────────────────────────────────────────
    spawnPlayers() {
        const count = this.registry.get('playerCount') ?? 1;
        const remoteIds = this.registry.get('remotePlayers') ?? [];
        for (let i = 0; i < count; i++) {
            const p = new Player(this, 100 + i * 70, 620, i);
            this.players.push(p);
            const isLocalPlayer = !remoteIds.includes(i);
            if (isLocalPlayer) {
                const kbSlot = remoteIds.length > 0 ? 0 : i;
                const kc = KEYBOARD_CONFIGS[kbSlot];
                if (kc && this.input.keyboard) {
                    this.playerKeysets.set(i, Object.fromEntries(Object.entries(kc).map(([act, key]) => [act, this.input.keyboard.addKey(key)])));
                }
                if (i === this.localPlayerId && !this.touchControls && this.sys.game.device.input.touch) {
                    this.touchControls = new TouchControls(this);
                }
            }
            const coneGfx = this.add.graphics().setDepth(7);
            this.inhaleGraphics.push(coneGfx);
            p.on('died', () => this.onPlayerDied(p));
            p.on('useAbility', (ability, src) => this.fireAbility(ability, src));
            p.on('heartLost', () => { });
        }
    }
    wirePlayerUIEvents() {
        this.players.forEach((p, i) => {
            p.on('abilityChanged', (ability) => {
                const max = ABILITY_AMMO[ability];
                this.ui.initAbilityPips(i, max);
                this.ui.updateAmmo(i, max);
            });
            p.on('abilityAmmoChanged', (ammo) => this.ui.updateAmmo(i, ammo));
            p.on('rapierSwing', (player) => this.handleRapierSwing(player));
        });
        const persisted = this.registry.get('persistedAbilities');
        if (persisted) {
            this.players.forEach((p, i) => {
                const pa = persisted[i];
                if (pa && pa.ability !== AbilityType.None && pa.ammo > 0) {
                    p.currentAbility = pa.ability;
                    p.abilityAmmo = pa.ammo;
                    p.emit('abilityChanged', pa.ability);
                    p.emit('abilityAmmoChanged', pa.ammo);
                }
            });
        }
    }
    handleRapierSwing(player) {
        const dir = player.flipX ? -1 : 1;
        const range = 80;
        const slash = this.add.rectangle(player.x + dir * 30, player.y - 4, 48, 10, 0xfff4cc, 0.9).setRotation(dir * 0.35).setDepth(15);
        this.tweens.add({ targets: slash, alpha: 0, scaleX: 1.3, duration: 150,
            onComplete: () => slash.destroy() });
        this.enemies.forEach(e => {
            if (dir * (e.x - player.x) > 0 &&
                Math.abs(e.x - player.x) < range &&
                Math.abs(e.y - player.y) < 48) {
                e.die();
                this.addScore(SCORE_ENEMY);
            }
        });
        if (this.boss?.active &&
            dir * (this.boss.x - player.x) > 0 &&
            Math.abs(this.boss.x - player.x) < range + 20 &&
            Math.abs(this.boss.y - player.y) < 60) {
            this.boss.hit();
        }
    }
    removeRemotePlayer(id) {
        const idx = this.players.findIndex(p => p.playerId === id);
        if (idx === -1)
            return;
        const p = this.players[idx];
        p.destroy();
        const coneGfx = this.inhaleGraphics[idx];
        if (coneGfx) {
            coneGfx.destroy();
            this.inhaleGraphics.splice(idx, 1);
        }
        this.players.splice(idx, 1);
        this.playerKeysets.delete(id);
        this.remoteInputs.delete(id);
        this.registry.set('playerCount', this.players.length);
        if (this.players.length === 0)
            this.time.delayedCall(500, () => this.gameOver());
    }
    // ── collision ───────────────────────────────────────────────────────────────
    setupCollision() {
        this.players.forEach(p => this.physics.add.collider(p, this.platforms));
        this.crates.forEach(c => this.physics.add.collider(c, this.platforms));
        for (let i = 0; i < this.crates.length; i++)
            for (let j = i + 1; j < this.crates.length; j++)
                this.physics.add.collider(this.crates[i], this.crates[j]);
        for (let i = 0; i < this.players.length; i++)
            for (let j = i + 1; j < this.players.length; j++)
                this.physics.add.collider(this.players[i], this.players[j]);
        // Per-enemy platform colliders — flying enemies are excluded
        this.enemies.forEach(e => {
            if (!e.flying)
                this.physics.add.collider(e, this.platforms);
        });
        // Player ↔ enemy group: swallow on contact while inhaling, damage otherwise
        this.players.forEach(p => {
            this.physics.add.collider(p, this.enemyGroup, (_p, _e) => {
                const player = _p;
                const enemy = _e;
                if (player.inhaling && !player.hasInhaled) {
                    player.swallowEnemy(enemy.abilityType);
                    enemy.swallow();
                    this.enemies = this.enemies.filter(x => x !== enemy);
                    this.addScore(SCORE_ENEMY);
                }
                else {
                    player.hitByEnemy();
                }
            });
        });
        // Boss colliders (separate from enemy group)
        if (this.boss) {
            this.physics.add.collider(this.boss, this.platforms);
            this.players.forEach(p => {
                this.physics.add.collider(p, this.boss, (_p, _b) => {
                    const player = _p;
                    const boss = _b;
                    if (player.inhaling && !player.hasInhaled) {
                        boss.hit();
                    }
                    else {
                        player.hitByEnemy();
                    }
                });
            });
        }
        this.physics.add.overlap(this.projectiles, this.platforms, (proj) => {
            ;
            proj.destroy();
        });
        // Enemy projectiles hit players
        this.players.forEach(p => {
            this.physics.add.overlap(p, this.enemyProjectiles, (_p, proj) => {
                ;
                proj.destroy();
                _p.hitByEnemy();
            });
        });
        this.physics.add.overlap(this.enemyProjectiles, this.platforms, (proj) => {
            ;
            proj.destroy();
        });
    }
    // ── abilities ───────────────────────────────────────────────────────────────
    fireAbility(ability, src) {
        switch (ability) {
            case AbilityType.Fire:
                this.spawnFireball(src);
                break;
            case AbilityType.Bomb:
                this.placeBomb(src);
                break;
            case AbilityType.Electric:
                this.electricBurst(src);
                break;
            case AbilityType.Ice:
                this.iceBlast(src);
                break;
        }
    }
    spawnFireball(src) {
        const dir = src.flipX ? -1 : 1;
        const fb = this.physics.add.image(src.x + dir * 20, src.y, 'fireball');
        this.projectiles.add(fb);
        fb.body.setVelocityX(dir * 650).setGravityY(-800);
        this.enemies.forEach(e => {
            this.physics.add.overlap(fb, e, () => { e.die(); this.addScore(SCORE_ENEMY); fb.destroy(); });
        });
        this.destructibles.forEach(d => {
            this.physics.add.overlap(fb, d, () => { d.takeDamage(50, DamageType.Fire); fb.destroy(); });
        });
        if (this.boss?.active) {
            this.physics.add.overlap(fb, this.boss, () => { this.boss.hit(); fb.destroy(); });
        }
        this.time.delayedCall(2200, () => { if (fb.active)
            fb.destroy(); });
    }
    placeBomb(src) {
        const bomb = this.add.image(src.x, src.y, 'bomb');
        this.time.delayedCall(2500, () => {
            this.cameras.main.shake(280, 0.009);
            this.explodeAt(src.x, src.y, 130);
            bomb.destroy();
        });
    }
    explodeAt(x, y, r) {
        this.enemies.forEach(e => {
            if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= r) {
                e.die();
                this.addScore(SCORE_ENEMY);
            }
        });
        this.destructibles.forEach(d => {
            if (Phaser.Math.Distance.Between(x, y, d.x, d.y) <= r)
                d.takeDamage(80, DamageType.Explosion);
        });
        this.players.forEach(p => {
            if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= r)
                p.stun(1000);
        });
        if (this.boss?.active && Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y) <= r) {
            this.boss.hit();
        }
    }
    electricBurst(src) {
        const r = 170;
        this.enemies.forEach(e => {
            if (Phaser.Math.Distance.Between(src.x, src.y, e.x, e.y) <= r) {
                e.stun(2000);
                e.body.setVelocity(0, 0);
                e.setTint(0xffff00);
                this.time.delayedCall(2000, () => { if (e.active)
                    e.clearTint(); });
            }
        });
        if (this.boss?.active && Phaser.Math.Distance.Between(src.x, src.y, this.boss.x, this.boss.y) <= r) {
            this.boss.hit();
        }
    }
    iceBlast(src) {
        const dir = src.flipX ? -1 : 1;
        const blast = this.add.rectangle(src.x + dir * 60, src.y, 120, 40, 0x66ccff, 0.7);
        this.time.delayedCall(400, () => blast.destroy());
        this.enemies.forEach(e => {
            if (Math.abs(e.x - src.x) < 150 && Math.abs(e.y - src.y) < 40) {
                e.setTint(0xaaddff);
                e.body.setVelocityX(dir * -200);
                this.time.delayedCall(1800, () => { if (e.active)
                    e.clearTint(); });
            }
        });
        if (this.boss?.active && Math.abs(this.boss.x - src.x) < 150 && Math.abs(this.boss.y - src.y) < 60) {
            this.boss.hit();
        }
    }
    fireBossSpecial(ability) {
        if (!this.boss?.active)
            return;
        this.cameras.main.flash(120, 255, 80, 0, false);
        const dirs = [-1, 0, 1];
        dirs.forEach(d => {
            const vx = d === 0 ? 0 : d * 480;
            const vy = d === 0 ? -500 : -240;
            const proj = this.physics.add.image(this.boss.x, this.boss.y - 20, 'fireball');
            this.enemyProjectiles.add(proj);
            const body = proj.body;
            body.setVelocity(vx, vy).setGravityY(-400);
            switch (ability) {
                case AbilityType.Fire:
                    proj.setTint(0xff4400).setScale(1.5);
                    break;
                case AbilityType.Ice:
                    proj.setTint(0x66ccff).setScale(1.3);
                    break;
                case AbilityType.Electric:
                    proj.setTint(0xffee00).setScale(1.6);
                    break;
                case AbilityType.Bomb:
                    proj.setTexture('bomb').setScale(1.2);
                    this.time.delayedCall(1200, () => {
                        if (proj.active) {
                            this.explodeAt(proj.x, proj.y, 140);
                            proj.destroy();
                        }
                    });
                    break;
            }
            this.time.delayedCall(2800, () => { if (proj.active)
                proj.destroy(); });
        });
    }
    spawnEnemyProjectile(enemy) {
        const alive = this.players.filter(p => p.isAlive);
        if (alive.length === 0)
            return;
        const target = alive.reduce((a, b) => Math.abs(a.x - enemy.x) < Math.abs(b.x - enemy.x) ? a : b);
        const dir = target.x > enemy.x ? 1 : -1;
        const speed = 320;
        let texKey = 'fireball';
        let gy = -800;
        if (enemy.abilityType === AbilityType.Ice) {
            texKey = 'fireball';
            gy = 0;
        }
        if (enemy.abilityType === AbilityType.Electric) {
            texKey = 'fireball';
            gy = -200;
        }
        if (enemy.abilityType === AbilityType.Bomb) {
            texKey = 'bomb';
            gy = 0;
        }
        const proj = this.physics.add.image(enemy.x + dir * 20, enemy.y, texKey);
        this.enemyProjectiles.add(proj);
        const body = proj.body;
        body.setVelocityX(dir * speed).setGravityY(gy);
        // Colorize by type
        if (enemy.abilityType === AbilityType.Ice)
            proj.setTint(0x66ccff);
        if (enemy.abilityType === AbilityType.Electric)
            proj.setTint(0xffdd00).setScale(1.4);
        if (enemy.abilityType === AbilityType.Bomb)
            proj.setScale(0.8);
        this.time.delayedCall(2400, () => { if (proj.active)
            proj.destroy(); });
    }
    spawnAbilityDrop(x, y, _ability) {
        const orb = this.physics.add.image(x, y - 10, 'warp-star').setScale(0.35);
        orb.body.setVelocityY(-200);
        this.tweens.add({ targets: orb, alpha: 0, duration: 2000,
            onComplete: () => { if (orb.active)
                orb.destroy(); } });
    }
    // ── inhale ───────────────────────────────────────────────────────────────────
    checkInhale(p) {
        if (p.hasInhaled)
            return;
        for (const e of this.enemies) {
            const dist = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
            if (dist <= p.inhaleRange()) {
                e.pullToward(p.x, p.y, Phaser.Math.Linear(200, INHALE_PULL_SPEED, 1 - dist / p.inhaleRange()));
            }
            else {
                e.stopPull();
            }
        }
        for (const c of this.crates) {
            if (Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 50) {
                p.captureSpriteObject(c);
                this.crates = this.crates.filter(x => x !== c);
                return;
            }
        }
        for (const other of this.players) {
            if (other === p)
                continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, other.x, other.y) <= p.inhaleRange()) {
                p.capturePlayer(other);
                return;
            }
        }
    }
    // ── camera ──────────────────────────────────────────────────────────────────
    setupCamera() {
        this.cameraTarget = this.add.rectangle(0, 0, 1, 1).setVisible(false);
        this.cameras.main.startFollow(this.cameraTarget, true, 0.08, 0.08);
    }
    // ── score / lives ────────────────────────────────────────────────────────────
    addScore(pts) {
        this.score += pts;
        this.registry.set('score', this.score);
    }
    onPlayerDied(p) {
        let lives = this.registry.get('lives') ?? 1;
        lives--;
        this.registry.set('lives', lives);
        if (lives <= 0) {
            this.time.delayedCall(800, () => this.gameOver());
            return;
        }
        this.time.delayedCall(1500, () => {
            if (!p.active)
                return;
            p.hearts = 3;
            p.isAlive = true;
            p.setAlpha(1);
            p.clearTint();
            p.setPosition(this.cameras.main.scrollX + 200, 620);
            p.body.setEnable(true);
        });
    }
    gameOver() {
        this.registry.set('persistedAbilities', null);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.registry.set('currentLevel', 1);
            this.registry.set('currentRoom', 1);
            this.scene.start('MenuScene');
        });
    }
    completeLevel() {
        if (!this.gm.isPlaying())
            return;
        this.gm.pause();
        this.registry.set('score', this.score);
        this.registry.set('persistedAbilities', this.players.map(p => ({ ability: p.currentAbility, ammo: p.abilityAmmo })));
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LevelCompleteScene');
        });
    }
    // ── input ─────────────────────────────────────────────────────────────────
    handleKeyboard(p, keys) {
        if (!p.isAlive || p.isInhaled)
            return;
        if (keys['left']?.isDown)
            p.moveLeft();
        else if (keys['right']?.isDown)
            p.moveRight();
        else
            p.stopHorizontal();
        if (keys['jump']?.isDown)
            p.jump();
        else
            p.jumpReleased();
        p.setInhaling(!!keys['inhale']?.isDown);
        if (Phaser.Input.Keyboard.JustDown(keys['ability']))
            p.useAbility();
        if (Phaser.Input.Keyboard.JustDown(keys['rapier']))
            p.useRapier();
    }
    handleGamepad(p, pad) {
        if (!p.isAlive || p.isInhaled)
            return;
        const lx = pad.leftStick.x;
        if (lx < -0.25 || pad.left)
            p.moveLeft();
        else if (lx > 0.25 || pad.right)
            p.moveRight();
        else
            p.stopHorizontal();
        if (pad.A)
            p.jump();
        else
            p.jumpReleased();
        p.setInhaling(pad.buttons[2]?.pressed ?? false);
    }
    handleRemoteInput(p, ri) {
        if (!p.isAlive || p.isInhaled)
            return;
        if (ri.left)
            p.moveLeft();
        else if (ri.right)
            p.moveRight();
        else
            p.stopHorizontal();
        if (ri.jump)
            p.jump();
        else
            p.jumpReleased();
        p.setInhaling(ri.inhale);
        if (ri.ability)
            p.useAbility();
        if (ri.rapier)
            p.useRapier();
    }
    setupGamepadEvents() {
        this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, (pad, button) => {
            const player = this.players.find((_, i) => this.input.gamepad?.getPad(i) === pad);
            if (!player || !player.isAlive || player.isInhaled)
                return;
            if (button.index === 1)
                player.useAbility();
            if (button.index === 3)
                player.useRapier();
        });
    }
    // ── pause menu ────────────────────────────────────────────────────────────
    buildPauseMenu() {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
            .setScrollFactor(0);
        const title = this.add.text(width / 2, height * 0.32, 'PAUSED', {
            fontSize: '32px', fontFamily: FONT, color: '#ffe066',
            stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0);
        const resume = this.pauseBtn(width / 2, height * 0.50, '▶  RESUME');
        const toMenu = this.pauseBtn(width / 2, height * 0.63, '⌂  MAIN MENU');
        const escHint = this.add.text(width / 2, height * 0.77, 'ESC to toggle', {
            fontSize: '9px', fontFamily: FONT, color: '#556677',
        }).setOrigin(0.5).setScrollFactor(0);
        resume.on('pointerdown', () => this.togglePause());
        toMenu.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
        });
        this.pauseContainer = this.add.container(0, 0, [overlay, title, resume, toMenu, escHint])
            .setDepth(100).setVisible(false);
    }
    pauseBtn(x, y, label) {
        const btn = this.add.text(x, y, label, {
            fontSize: '16px', fontFamily: FONT, color: '#ffffff',
            stroke: '#000', strokeThickness: 3,
            backgroundColor: '#00000055', padding: { x: 22, y: 12 },
        }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#ffe066'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        return btn;
    }
    togglePause() {
        const nowPaused = this.gm.isPlaying();
        if (nowPaused)
            this.gm.pause();
        else
            this.gm.resume();
        this.pauseContainer.setVisible(nowPaused);
        this.physics.world.isPaused = nowPaused;
    }
    // ── inhale cone ───────────────────────────────────────────────────────────
    drawInhaleCone(g, p) {
        const t = this.time.now;
        const dir = p.flipX ? -1 : 1;
        const ox = p.x;
        const oy = p.y;
        const len = p.inhaleRange();
        const a1 = 0.13 + 0.07 * Math.sin(t / 110);
        g.fillStyle(0x55ddff, a1);
        g.fillTriangle(ox, oy, ox + dir * len, oy - 72, ox + dir * len, oy + 72);
        const a2 = 0.28 + 0.12 * Math.sin(t / 80 + Math.PI);
        g.fillStyle(0xaaf0ff, a2);
        g.fillTriangle(ox, oy, ox + dir * len, oy - 36, ox + dir * len, oy + 36);
        for (let i = 0; i < 4; i++) {
            const phase = ((t / 380) + i * 0.25) % 1;
            const dist = len * (1 - phase);
            const spread = 50 * (1 - phase * 0.65);
            const alpha = 0.65 * Math.sin(phase * Math.PI);
            const sx = ox + dir * dist;
            g.lineStyle(2, 0xffffff, alpha);
            g.lineBetween(sx, oy - spread, sx, oy + spread);
        }
    }
    // ── update ────────────────────────────────────────────────────────────────
    update(_t, _dt) {
        if (!this.gm.isPlaying())
            return;
        const sx = this.cameras.main.scrollX;
        this.bgLayers[0].tilePositionX = sx * 0.05;
        this.bgLayers[1].tilePositionX = sx * 0.18;
        if (this.players.length > 0) {
            const alive = this.players.filter(p => p.isAlive);
            if (alive.length > 0) {
                const ax = alive.reduce((s, p) => s + p.x, 0) / alive.length;
                const ay = alive.reduce((s, p) => s + p.y, 0) / alive.length;
                this.cameraTarget.setPosition(ax, ay);
            }
        }
        this.players.forEach((p, i) => {
            p.update();
            const coneGfx = this.inhaleGraphics[i];
            if (coneGfx) {
                coneGfx.clear();
                if (p.isAlive && p.inhaling && !p.hasInhaled && !p.isInhaled) {
                    this.drawInhaleCone(coneGfx, p);
                }
            }
            const remoteIds = this.registry.get('remotePlayers') ?? [];
            const isRemote = remoteIds.includes(p.playerId);
            if (isRemote) {
                const ri = this.remoteInputs.get(p.playerId);
                if (ri)
                    this.handleRemoteInput(p, ri);
            }
            else {
                const pad = this.input.gamepad?.getPad(this.nm ? 0 : p.playerId);
                if (pad?.connected)
                    this.handleGamepad(p, pad);
                else {
                    const keys = this.playerKeysets.get(p.playerId);
                    if (keys)
                        this.handleKeyboard(p, keys);
                }
                if (this.touchControls)
                    this.touchControls.apply(p);
                if (this.nm) {
                    const pad2 = this.input.gamepad?.getPad(0);
                    const keys = this.playerKeysets.get(p.playerId);
                    this.nm.sendInput({
                        left: !!(pad2?.connected ? (pad2.leftStick.x < -0.25 || pad2.left) : keys?.['left']?.isDown),
                        right: !!(pad2?.connected ? (pad2.leftStick.x > 0.25 || pad2.right) : keys?.['right']?.isDown),
                        jump: !!(pad2?.connected ? pad2.A : keys?.['jump']?.isDown),
                        inhale: !!(pad2?.connected ? (pad2.buttons[2]?.pressed) : keys?.['inhale']?.isDown),
                        ability: !!(pad2?.connected ? pad2.buttons[1]?.pressed : keys?.['ability']?.isDown),
                        rapier: !!(pad2?.connected ? pad2.buttons[3]?.pressed : keys?.['rapier']?.isDown),
                    });
                }
            }
            if (p.inhaling)
                this.checkInhale(p);
            else
                this.enemies.forEach(e => e.stopPull());
            // Goal collision (locked in boss rooms until boss dies)
            if (!this.portalLocked && p.isAlive &&
                Phaser.Math.Distance.Between(p.x, p.y, this.goalSprite.x, this.goalSprite.y) < 40) {
                this.completeLevel();
            }
        });
        // Collectibles
        this.collectibleSprites = this.collectibleSprites.filter(img => {
            if (!img.active)
                return false;
            for (const p of this.players) {
                if (p.isAlive && Phaser.Math.Distance.Between(p.x, p.y, img.x, img.y) < 32) {
                    this.collectItem(p, img.getData('item'));
                    img.destroy();
                    return false;
                }
            }
            return true;
        });
        // Enemies
        this.enemies = this.enemies.filter(e => e.active);
        this.enemies.forEach(e => {
            e.update();
            if (e.tryAttack(_dt))
                this.spawnEnemyProjectile(e);
        });
        // Boss
        if (this.boss?.active) {
            this.boss.players = this.players;
            this.boss.update();
        }
        this.ui.update(this.players);
    }
}
