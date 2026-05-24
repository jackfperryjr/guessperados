import Phaser from 'phaser';
import { Player } from '../game/Player';
import { Enemy } from '../game/Enemy';
import { Boss } from '../game/Boss';
import { Destructible } from '../game/Destructible';
import { GameManager } from '../game/GameManager';
import { UIManager } from '../ui/UIManager';
import { TouchControls } from '../ui/TouchControls';
import { generateRun } from '../levels';
import { AbilityType, DamageType } from '../types';
import { ABILITY_COLORS } from '../ui/UIManager';
import { ABILITY_AMMO } from '../game/Player';
import { SoundManager } from '../audio/SoundManager';
const FONT = '"Press Start 2P", monospace';
const INHALE_PULL_SPEED = 400;
const SCORE_ENEMY = 200;
const SCORE_DESTRUCT = 100;
const KEYBOARD_CONFIGS = [
    { left: 'A', right: 'D', jump: 'W', inhale: 'C', ability: 'X', rapier: 'Z' },
    { left: 'LEFT', right: 'RIGHT', jump: 'UP', inhale: 'COMMA', ability: 'L', rapier: 'K' },
];
const OPPOSITE = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const DOOR_H = 130; // pixel height of a left/right door opening
const DOOR_W = 120; // pixel width of a top/bottom door opening
function getEntryPos(dir, cfg) {
    const W = cfg.worldWidth;
    const ep = cfg.exitPositions ?? {};
    switch (dir) {
        case 'left': return { x: 70, y: ep.left ?? 640 };
        case 'right': return { x: W - 70, y: ep.right ?? 640 };
        case 'top': return { x: ep.top ?? W / 2, y: 80 };
        case 'bottom': return { x: ep.bottom ?? W / 2, y: 640 };
    }
}
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
    throneLabel = null;
    throneX = 0;
    roomTransitioning = false;
    bossDefeated = false;
    bossRoomLeftWall = null;
    pauseItems = [];
    pauseFocusIdx = 0;
    pauseCursor = null;
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
        this.throneLabel = null;
        this.throneX = 0;
        this.roomTransitioning = false;
        this.bossDefeated = false;
        this.bossRoomLeftWall = null;
        this.pauseItems = [];
        this.pauseFocusIdx = 0;
        this.pauseCursor = null;
    }
    create() {
        // ── Load or generate this run's room sequence ──────────────────────────────
        let runRooms = this.registry.get('runRooms');
        if (!runRooms || runRooms.length === 0) {
            runRooms = generateRun();
            this.registry.set('runRooms', runRooms);
            this.registry.set('runIndex', 0);
            this.registry.set('entryDir', null);
        }
        const runIndex = this.registry.get('runIndex') ?? 0;
        this.cfg = runRooms[runIndex];
        // If we entered via a direction, guarantee the return exit exists so the
        // player can always backtrack the way they came.
        const entryDir0 = this.registry.get('entryDir') ?? null;
        if (entryDir0 && !this.cfg.exits.includes(entryDir0)) {
            this.cfg = { ...this.cfg, exits: [...this.cfg.exits, entryDir0] };
        }
        this.score = this.registry.get('score') ?? 0;
        this.gm = new GameManager();
        this.nm = this.registry.get('networkManager') ?? null;
        this.localPlayerId = this.registry.get('localPlayerId') ?? 0;
        if (this.nm) {
            this.nm.onRemoteInput = (id, input) => this.remoteInputs.set(id, input);
            this.nm.onPlayerLeft = (id) => this.removeRemotePlayer(id);
        }
        const W = this.cfg.worldWidth;
        this.physics.world.setBounds(-100, -100, W + 200, 920);
        this.cameras.main.setBounds(0, 0, W, 720);
        this.cameras.main.setRoundPixels(true);
        this.buildBackground();
        this.buildScenery();
        this.buildLevel();
        this.setupCollectibles();
        this.spawnPlayers();
        this.setupCollision();
        this.setupGamepadEvents();
        this.setupCamera();
        this.ui = new UIManager(this, this.registry.get('playerCount') ?? 1, this.cfg.name, this.cfg.isBossRoom ?? false, this.cfg.bossHp ?? 0);
        if (this.boss) {
            this.boss.on('hpChanged', (hp, max) => this.ui.updateBossBar(hp, max));
            this.boss.on('bossAttack', (ability) => this.fireBossSpecial(ability));
            this.ui.updateBossBar(this.cfg.bossHp, this.cfg.bossHp);
        }
        this.wirePlayerUIEvents();
        this.buildPauseMenu();
        this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
        this.cameras.main.fadeIn(400, 0, 0, 0);
        SoundManager.startBgMusic();
        this.events.once('shutdown', () => SoundManager.stopBgMusic());
    }
    // ── background ──────────────────────────────────────────────────────────────
    doorGlow(x, y, w, h) {
        const g = this.add.graphics().setDepth(6);
        g.fillStyle(0x00e5ff, 0.10);
        g.fillRect(x, y, w, h);
        g.lineStyle(3, 0x00e5ff, 0.85);
        g.strokeRect(x, y, w, h);
        g.lineStyle(4, 0x00e5ff, 1);
        if (w < h) {
            g.beginPath();
            g.moveTo(x - 6, y);
            g.lineTo(x + w + 6, y);
            g.strokePath();
            g.beginPath();
            g.moveTo(x - 6, y + h);
            g.lineTo(x + w + 6, y + h);
            g.strokePath();
        }
        else {
            g.beginPath();
            g.moveTo(x, y - 6);
            g.lineTo(x, y + h + 6);
            g.strokePath();
            g.beginPath();
            g.moveTo(x + w, y - 6);
            g.lineTo(x + w, y + h + 6);
            g.strokePath();
        }
        this.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1200, yoyo: true, repeat: -1 });
    }
    buildBackground() {
        const { width, height } = this.scale;
        const cx = width / 2, cy = height / 2;
        this.bgLayers.push(this.add.tileSprite(cx, cy, width, height, this.cfg.bgFar).setScrollFactor(0), this.add.tileSprite(cx, cy, width, height, this.cfg.bgMid)
            .setScrollFactor(0).setAlpha(0.75));
        if (this.cfg.isBossRoom) {
            const overlay = this.add.rectangle(cx, cy, width, height, 0x00001a, 0.40).setScrollFactor(0).setDepth(1);
            this.tweens.add({ targets: overlay, alpha: 0.55, duration: 2000, yoyo: true, repeat: -1 });
        }
        else if (this.cfg.isThrone) {
            this.add.rectangle(cx, cy, width, height, 0x0a0a2a, 0.45).setScrollFactor(0).setDepth(1);
        }
    }
    // ── scenery ──────────────────────────────────────────────────────────────────
    buildScenery() {
        const w = this.cfg.worldWidth;
        if (this.cfg.isBossRoom) {
            this.buildSceneryArmory(w);
            return;
        }
        if (this.cfg.isThrone) {
            this.buildSceneryCommand(w);
            return;
        }
        if (this.cfg.isTutorial) {
            this.buildSceneryCommand(w);
            return;
        }
        const hash = this.cfg.name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        switch (hash % 5) {
            case 0:
                this.buildSceneryCommand(w);
                break;
            case 1:
                this.buildSceneryEngineering(w);
                break;
            case 2:
                this.buildSceneryCargo(w);
                break;
            case 3:
                this.buildSceneryLab(w);
                break;
            default:
                this.buildSceneryArmory(w);
                break;
        }
    }
    // ── Command Deck — blue, viewscreens, console desks, cable drops ─────────────
    buildSceneryCommand(w) {
        // Ambient tint
        this.add.rectangle(w / 2, 360, w, 720, 0x00050f, 0.28).setDepth(2);
        // Ceiling: LED strip lights
        const strips = Math.ceil(w / 210);
        for (let i = 0; i < strips; i++) {
            const sx = 105 + i * 210;
            const strip = this.add.rectangle(sx, 10, 170, 7, 0x99ccff, 0.85).setDepth(3);
            this.add.rectangle(sx, 18, 150, 16, 0x3366aa, 0.12).setDepth(2);
            this.tweens.add({ targets: strip, alpha: 0.55, duration: 1600 + (sx % 800), yoyo: true, repeat: -1 });
        }
        // Wall: galaxy viewscreens as focal points
        const screenXs = w > 1400
            ? [w * 0.2, w * 0.5, w * 0.8]
            : [w * 0.28, w * 0.72];
        const screenYs = [260, 320, 270];
        screenXs.forEach((sx, i) => {
            this.add.image(sx, screenYs[i % screenYs.length], 'scn-viewscreen').setAlpha(0.82).setDepth(3);
            this.add.rectangle(sx, screenYs[i % screenYs.length], 260, 150, 0x001433, 0.18).setDepth(2);
        });
        // Wall: porthole viewports at lower positions
        const vpCount = Math.max(2, Math.floor(w / 520));
        for (let i = 0; i < vpCount; i++) {
            const vx = 230 + i * (w / vpCount);
            const vy = 500;
            const vp = this.add.image(vx, vy, 'scn-viewport').setAlpha(0.75).setDepth(3);
            this.tweens.add({ targets: vp, alpha: 0.5, duration: 2500 + (vx % 900), yoyo: true, repeat: -1 });
        }
        // Ceiling: hanging cable bundles
        const cables = Math.ceil(w / 170);
        for (let i = 0; i < cables; i++) {
            const cx = 55 + i * (w / cables) + (i % 3 - 1) * 18;
            const h = 70 + (i % 4) * 22;
            this.add.rectangle(cx, h / 2, 3, h, 0x223344, 0.65).setDepth(3);
            this.add.rectangle(cx + 7, h / 2 + 12, 2, h - 24, 0x1a2a38, 0.45).setDepth(3);
        }
        // Floor: console desks
        const desks = Math.ceil(w / 380);
        for (let i = 0; i < desks; i++) {
            const dx = 140 + i * (w / desks) + (i % 2) * 60 - 30;
            this.add.image(dx, 636, 'scn-console-unit').setAlpha(0.88).setDepth(4);
        }
        // Vertical status columns with blinking LEDs
        const cols = Math.max(2, Math.floor(w / 600));
        for (let i = 0; i < cols; i++) {
            const cx = 280 + i * (w / cols);
            this.add.rectangle(cx, 410, 10, 90, 0x182840, 0.9).setDepth(3);
            const ledColors = [0x00ff55, 0xffcc00, 0x00aaff, 0xff5500, 0x00ff55, 0xffcc00];
            ledColors.forEach((col, j) => {
                const led = this.add.rectangle(cx, 370 + j * 14, 6, 6, col, 0.9).setDepth(4);
                this.tweens.add({ targets: led, alpha: 0.15, duration: 280 + j * 120 + (cx % 300), yoyo: true, repeat: -1 });
            });
        }
    }
    // ── Engineering Bay — amber, pipes, fuel tanks, gauges ───────────────────────
    buildSceneryEngineering(w) {
        this.add.rectangle(w / 2, 360, w, 720, 0x0d0700, 0.32).setDepth(2);
        // Ceiling: horizontal pipe bundles running full width in segments
        const segs = Math.ceil(w / 200);
        for (let i = 0; i < segs; i++) {
            this.add.image(100 + i * 200, 28, 'scn-pipe-bundle').setAlpha(0.9).setDepth(3);
        }
        // Pipe junction bolts
        for (let i = 0; i < segs; i++) {
            const jx = i * 200;
            this.add.rectangle(jx, 28, 14, 28, 0x3d5060, 0.95).setDepth(4);
            this.add.rectangle(jx, 18, 12, 6, 0x4a6070, 0.9).setDepth(4);
        }
        // Vertical feed pipes down from ceiling to mid wall
        const vpipes = Math.max(3, Math.floor(w / 350));
        for (let i = 0; i < vpipes; i++) {
            const px = 180 + i * (w / vpipes);
            const ph = 120 + (i % 3) * 40;
            this.add.rectangle(px, ph / 2 + 40, 12, ph, 0x455a64, 0.85).setDepth(3);
            this.add.rectangle(px, 40, 18, 10, 0x546e7a, 0.9).setDepth(4);
            // Valve wheel
            this.add.rectangle(px, ph / 2 + 40 - 20, 22, 6, 0x607d8b, 0.8).setDepth(4);
            this.add.rectangle(px, ph / 2 + 40 - 20, 6, 18, 0x607d8b, 0.8).setDepth(4);
        }
        // Floor: fuel cylinders
        const tanks = Math.max(3, Math.floor(w / 280));
        for (let i = 0; i < tanks; i++) {
            const tx = 140 + i * (w / tanks) + (i % 3 - 1) * 30;
            this.add.image(tx, 640, 'scn-fuel-cylinder').setAlpha(0.9).setDepth(4);
            // Heat glow at base
            const glow = this.add.rectangle(tx, 678, 36, 10, 0xff6600, 0.18).setDepth(3);
            this.tweens.add({ targets: glow, alpha: 0.06, duration: 700 + (tx % 500), yoyo: true, repeat: -1 });
        }
        // Warning stripes along floor edges
        const warns = Math.max(4, Math.floor(w / 240));
        for (let i = 0; i < warns; i++) {
            this.add.image(110 + i * (w / warns), 683, 'scn-warning').setAlpha(0.65).setDepth(3);
        }
        // Pressure gauges on mid-wall (drawn as circles)
        const gauges = Math.max(3, Math.floor(w / 320));
        for (let i = 0; i < gauges; i++) {
            const gx = 200 + i * (w / gauges);
            const gy = 380 + (i % 3) * 40;
            this.add.circle(gx, gy, 18, 0x37474f, 0.9).setDepth(3);
            this.add.circle(gx, gy, 13, 0x1a2a36, 0.95).setDepth(3);
            this.add.circle(gx, gy, 3, 0xff6600, 0.9).setDepth(4);
            // Needle (rectangle rotated)
            this.add.rectangle(gx + 5, gy - 4, 12, 2, 0xff3300, 0.9).setDepth(4)
                .setRotation(-0.6 + (i % 3) * 0.4);
        }
        // Ambient orange floor glow strips
        const floorGlows = Math.max(2, Math.floor(w / 400));
        for (let i = 0; i < floorGlows; i++) {
            const fgx = 200 + i * (w / floorGlows);
            const fg = this.add.rectangle(fgx, 686, 200, 4, 0xff8800, 0.3).setDepth(2);
            this.tweens.add({ targets: fg, alpha: 0.1, duration: 900 + (fgx % 600), yoyo: true, repeat: -1 });
        }
    }
    // ── Cargo Hold — grey-yellow, pods stacked, crane rail, floor markings ───────
    buildSceneryCargo(w) {
        this.add.rectangle(w / 2, 360, w, 720, 0x050504, 0.25).setDepth(2);
        // Ceiling: overhead crane rail (full width)
        this.add.rectangle(w / 2, 22, w - 40, 16, 0x37474f, 0.9).setDepth(3);
        this.add.rectangle(w / 2, 16, w - 40, 4, 0x546e7a, 0.85).setDepth(3);
        // Rail wheels / trolleys
        const trolleys = Math.max(3, Math.floor(w / 300));
        for (let i = 0; i < trolleys; i++) {
            const tx = 160 + i * (w / trolleys);
            this.add.rectangle(tx, 22, 28, 10, 0x455a64, 0.9).setDepth(4);
            this.add.circle(tx - 8, 22, 5, 0x263238, 0.9).setDepth(4);
            this.add.circle(tx + 8, 22, 5, 0x263238, 0.9).setDepth(4);
            // Hanging chain
            const chainH = 60 + (i % 3) * 30;
            this.add.rectangle(tx, 22 + chainH / 2, 4, chainH, 0x3d5060, 0.7).setDepth(3);
            this.add.rectangle(tx, 22 + chainH, 14, 8, 0x455a64, 0.85).setDepth(3);
        }
        // Wall: stacked storage pods (as tall columns)
        const podCols = Math.max(3, Math.floor(w / 360));
        for (let i = 0; i < podCols; i++) {
            const px = 180 + i * (w / podCols);
            const stack = 2 + (i % 2);
            for (let s = 0; s < stack; s++) {
                this.add.image(px, 650 - s * 72, 'scn-storage-pod').setAlpha(0.85).setDepth(3 + (s === 0 ? 1 : 0));
            }
        }
        // Floor: painted directional arrows and lines
        const arrows = Math.max(3, Math.floor(w / 300));
        for (let i = 0; i < arrows; i++) {
            const ax = 130 + i * (w / arrows);
            // Arrow line
            this.add.rectangle(ax, 680, 80, 3, 0xffd600, 0.45).setDepth(3);
            // Arrow head
            this.add.triangle(ax + 44, 680, ax + 32, 672, ax + 32, 688, ax + 44, 680, 0xffd600, 0.45).setDepth(3);
        }
        // Floor: painted zone stripes
        const zones = Math.max(2, Math.floor(w / 500));
        for (let i = 0; i < zones; i++) {
            const zx = 250 + i * (w / zones);
            this.add.rectangle(zx, 684, 120, 2, 0xffffff, 0.2).setDepth(2);
        }
        // Wall: equipment shelving (girder as shelf bracket)
        const shelves = Math.max(2, Math.floor(w / 450));
        for (let i = 0; i < shelves; i++) {
            const shx = 300 + i * (w / shelves);
            this.add.image(shx, 200, 'scn-girder').setAlpha(0.6).setDepth(2).setScale(0.8, 1);
            this.add.image(shx, 350, 'scn-girder').setAlpha(0.5).setDepth(2).setScale(0.6, 1);
        }
        // Hanging cargo lights (orange cone glow under trolleys)
        for (let i = 0; i < trolleys; i++) {
            const lx = 160 + i * (w / trolleys);
            const ly = 22 + 60 + (i % 3) * 30 + 20;
            const glow = this.add.circle(lx, ly + 30, 40, 0xff8800, 0.08).setDepth(2);
            this.tweens.add({ targets: glow, alpha: 0.03, duration: 1000 + (lx % 600), yoyo: true, repeat: -1 });
        }
    }
    // ── Research Lab — cyan, specimen tanks, data terminals, grid lights ──────────
    buildSceneryLab(w) {
        this.add.rectangle(w / 2, 360, w, 720, 0x000d10, 0.32).setDepth(2);
        // Ceiling: grid of sensor lights
        const gridCols = Math.ceil(w / 160);
        for (let i = 0; i < gridCols; i++) {
            const gx = 80 + i * 160;
            // Light housing
            this.add.rectangle(gx, 14, 60, 10, 0x1a2a30, 0.9).setDepth(3);
            const lamp = this.add.rectangle(gx, 14, 52, 5, 0x88ffee, 0.7).setDepth(4);
            this.add.rectangle(gx, 22, 48, 20, 0x004433, 0.12).setDepth(2);
            this.tweens.add({ targets: lamp, alpha: 0.45, duration: 2000 + (gx % 1000), yoyo: true, repeat: -1 });
        }
        // Wall: specimen tank clusters
        const tankGroups = Math.max(2, Math.floor(w / 420));
        for (let i = 0; i < tankGroups; i++) {
            const gx = 200 + i * (w / tankGroups);
            // 2-3 tanks per cluster
            const count = 2 + (i % 2);
            for (let t = 0; t < count; t++) {
                const tx = gx + (t - Math.floor(count / 2)) * 44;
                const ty = 580 - (t % 2) * 30;
                this.add.image(tx, ty, 'scn-specimen-tank').setAlpha(0.85).setDepth(3);
                // Tank glow
                const tglow = this.add.rectangle(tx, ty, 30, 100, 0x00aacc, 0.08).setDepth(2);
                this.tweens.add({ targets: tglow, alpha: 0.03, duration: 1200 + t * 400 + (gx % 500), yoyo: true, repeat: -1 });
            }
        }
        // Floor: data terminals
        const terminals = Math.max(2, Math.floor(w / 400));
        for (let i = 0; i < terminals; i++) {
            const tx = 160 + i * (w / terminals) + (i % 2) * 40 - 20;
            this.add.image(tx, 636, 'scn-console-unit').setAlpha(0.85).setDepth(4);
        }
        // Holographic display panels (floating blue rectangles)
        const holos = Math.max(2, Math.floor(w / 480));
        for (let i = 0; i < holos; i++) {
            const hx = 260 + i * (w / holos);
            const hy = 320 + (i % 3) * 50;
            const holo = this.add.rectangle(hx, hy, 100, 64, 0x004466, 0.55).setDepth(3);
            this.add.rectangle(hx, hy, 96, 60, 0x006688, 0.25).setDepth(3);
            // Scan line on holo
            const scan = this.add.rectangle(hx, hy - 28, 90, 3, 0x00ddff, 0.7).setDepth(4);
            this.tweens.add({ targets: scan, y: hy + 28, duration: 1400 + (hx % 600), repeat: -1 });
            this.tweens.add({ targets: holo, alpha: 0.35, duration: 1800 + (hx % 700), yoyo: true, repeat: -1 });
        }
        // Data stream lines on walls (thin horizontal green lines)
        const streams = Math.max(4, Math.floor(w / 250));
        for (let i = 0; i < streams; i++) {
            const sx = 100 + i * (w / streams);
            const sy = 200 + (i % 5) * 60;
            const streamW = 60 + (i % 4) * 30;
            this.add.rectangle(sx, sy, streamW, 2, 0x00cc88, 0.4).setDepth(2);
        }
        // Wall panels with readout screens
        const panels = Math.max(2, Math.floor(w / 550));
        for (let i = 0; i < panels; i++) {
            const px = 350 + i * (w / panels);
            this.add.image(px, 430, 'scn-panel').setAlpha(0.7).setDepth(3);
            const blink = this.add.rectangle(px + 18, 420, 6, 6, 0x00e5ff).setAlpha(0.9).setDepth(4);
            this.tweens.add({ targets: blink, alpha: 0.1, duration: 400 + (px % 500), yoyo: true, repeat: -1 });
        }
    }
    // ── Armory / Security — red, weapon lockers, cameras, blast doors ─────────────
    buildSceneryArmory(w) {
        this.add.rectangle(w / 2, 360, w, 720, 0x0d0000, 0.32).setDepth(2);
        // Ceiling: security cameras evenly spaced
        const cams = Math.max(3, Math.floor(w / 280));
        for (let i = 0; i < cams; i++) {
            const cx = 120 + i * (w / cams);
            this.add.image(cx, 24, 'scn-sec-camera').setAlpha(0.85).setDepth(4);
            // Red indicator beam cone
            const beam = this.add.triangle(cx - 30, 60, cx + 30, 60, cx, 30, 0xff0000, 0.07).setDepth(2);
            this.tweens.add({ targets: beam, alpha: 0.02, duration: 900 + (cx % 600), yoyo: true, repeat: -1 });
        }
        // Wall: weapon lockers in rows
        const lockers = Math.max(3, Math.floor(w / 320));
        for (let i = 0; i < lockers; i++) {
            const lx = 160 + i * (w / lockers);
            const ly = 420 + (i % 2) * 60;
            this.add.image(lx, ly, 'scn-weapon-locker').setAlpha(0.85).setDepth(3);
        }
        // Blast door segments on back wall (large dark rectangles)
        const doors = Math.max(2, Math.floor(w / 500));
        for (let i = 0; i < doors; i++) {
            const dx = 250 + i * (w / doors);
            this.add.rectangle(dx, 300, 120, 200, 0x1a2226, 0.8).setDepth(2);
            this.add.rectangle(dx, 300, 116, 196, 0x0d1418, 0.7).setDepth(2);
            // Blast door panel lines
            this.add.rectangle(dx, 250, 116, 4, 0x37474f, 0.7).setDepth(3);
            this.add.rectangle(dx, 350, 116, 4, 0x37474f, 0.7).setDepth(3);
            // Warning markings
            this.add.rectangle(dx - 46, 300, 24, 80, 0xff1744, 0.18).setDepth(3);
            this.add.rectangle(dx + 46, 300, 24, 80, 0xff1744, 0.18).setDepth(3);
            // Lock indicator
            const lockLed = this.add.rectangle(dx, 300, 10, 10, 0xff1744, 0.9).setDepth(4);
            this.tweens.add({ targets: lockLed, alpha: 0.2, duration: 600 + (dx % 400), yoyo: true, repeat: -1 });
        }
        // Floor: red emergency light strips
        const strips = Math.max(3, Math.floor(w / 280));
        for (let i = 0; i < strips; i++) {
            const sx = 120 + i * (w / strips);
            const strip = this.add.rectangle(sx, 683, 120, 4, 0xff2200, 0.6).setDepth(3);
            this.tweens.add({ targets: strip, alpha: 0.15, duration: 500 + (sx % 400), yoyo: true, repeat: -1 });
        }
        // Girders as structural reinforcement on walls
        const girds = Math.max(3, Math.floor(w / 420));
        for (let i = 0; i < girds; i++) {
            const gx = 220 + i * (w / girds);
            this.add.image(gx, 160, 'scn-girder').setAlpha(0.55).setDepth(2);
        }
        // Vertical support struts
        const struts = Math.max(2, Math.floor(w / 500));
        for (let i = 0; i < struts; i++) {
            const sx = 300 + i * (w / struts);
            this.add.image(sx, 130, 'scn-strut-v').setAlpha(0.5).setDepth(2);
        }
    }
    // ── collectibles ──────────────────────────────────────────────────────────────
    setupCollectibles() {
        for (const item of this.cfg.items) {
            const tex = item.type === 'heart' ? 'item-heart'
                : item.type === 'life' ? 'item-life'
                    : item.type === 'mystery' ? 'item-mystery'
                        : 'item-orb';
            const img = this.add.image(item.x, item.y, tex).setDepth(8)
                .setScale(item.type === 'mystery' ? 2.2 : 1.2);
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
            player.hearts = Math.min(5, player.hearts + 1);
            this.showPopup(item.x, item.y, '+HEART', '#ff4d6a');
            SoundManager.collectHeart();
        }
        else if (item.type === 'life') {
            const lives = (this.registry.get('lives') ?? 1) + 1;
            this.registry.set('lives', lives);
            this.showPopup(item.x, item.y, '1-UP!', '#ffe066');
            SoundManager.collectLife();
        }
        else if (item.type === 'ability') {
            const ab = item.ability ?? AbilityType.None;
            player.currentAbility = ab;
            player.abilityAmmo = ABILITY_AMMO[ab];
            player.emit('abilityChanged', ab);
            this.showPopup(item.x, item.y, AbilityType[ab].toUpperCase() + '!', '#aaffaa');
            SoundManager.collectAbility();
        }
        else if (item.type === 'mystery') {
            this.triggerMysteryEffect(player);
            SoundManager.collectMystery();
        }
        this.addScore(500);
    }
    triggerMysteryEffect(player) {
        const isGood = Math.random() < 0.5;
        if (isGood) {
            const r = Math.floor(Math.random() * 3);
            if (r === 0) {
                player.hearts = Math.min(5, player.hearts + 1);
                this.showPopup(player.x, player.y - 32, '+ HEART!', '#ff4d6a');
            }
            else if (r === 1) {
                const abilities = [AbilityType.Fire, AbilityType.Electric, AbilityType.Ice];
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
        const abilities = [AbilityType.Fire, AbilityType.Electric, AbilityType.Ice];
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
        const W = this.cfg.worldWidth;
        const exits = this.cfg.exits;
        const ep = this.cfg.exitPositions ?? {};
        const addTile = (x, y, w, h) => {
            const tile = this.add.tileSprite(x, y, w, h, this.cfg.tileset);
            this.physics.add.existing(tile, true);
            this.platforms.add(tile);
        };
        // Left wall — with or without a door gap
        // Boss room seals its left wall on entry; it opens only after boss dies.
        const leftDoorY = ep.left ?? 640;
        if (!exits.includes('left') || this.cfg.isBossRoom) {
            const tile = this.add.tileSprite(8, 360, 16, 720, this.cfg.tileset);
            this.physics.add.existing(tile, true);
            this.platforms.add(tile);
            if (this.cfg.isBossRoom)
                this.bossRoomLeftWall = tile;
        }
        else {
            const topH = leftDoorY - DOOR_H / 2;
            const botY = leftDoorY + DOOR_H / 2;
            if (topH > 0)
                addTile(8, topH / 2, 16, topH);
            if (botY < 720)
                addTile(8, botY + (720 - botY) / 2, 16, 720 - botY);
            this.doorGlow(0, leftDoorY - DOOR_H / 2, 16, DOOR_H);
        }
        // Right wall
        const rightDoorY = ep.right ?? 640;
        if (!exits.includes('right')) {
            addTile(W - 8, 360, 16, 720);
        }
        else {
            const topH = rightDoorY - DOOR_H / 2;
            const botY = rightDoorY + DOOR_H / 2;
            if (topH > 0)
                addTile(W - 8, topH / 2, 16, topH);
            if (botY < 720)
                addTile(W - 8, botY + (720 - botY) / 2, 16, 720 - botY);
            this.doorGlow(W - 16, rightDoorY - DOOR_H / 2, 16, DOOR_H);
        }
        // Ceiling
        const topDoorX = ep.top ?? W / 2;
        if (!exits.includes('top')) {
            addTile(W / 2, 8, W, 16);
        }
        else {
            const leftW = topDoorX - DOOR_W / 2;
            const rightX = topDoorX + DOOR_W / 2;
            if (leftW > 0)
                addTile(leftW / 2, 8, leftW, 16);
            if (rightX < W)
                addTile(rightX + (W - rightX) / 2, 8, W - rightX, 16);
            this.doorGlow(topDoorX - DOOR_W / 2, 0, DOOR_W, 16);
        }
        // Floor
        const botDoorX = ep.bottom ?? W / 2;
        if (!exits.includes('bottom')) {
            addTile(W / 2, 688, W, 32);
        }
        else {
            const leftW = botDoorX - DOOR_W / 2;
            const rightX = botDoorX + DOOR_W / 2;
            if (leftW > 0)
                addTile(leftW / 2, 688, leftW, 32);
            if (rightX < W)
                addTile(rightX + (W - rightX) / 2, 688, W - rightX, 32);
            this.doorGlow(botDoorX - DOOR_W / 2, 672, DOOR_W, 32);
        }
        // Interior platforms
        for (const p of this.cfg.platforms) {
            addTile(p.x, p.y, p.w, p.h);
        }
        // Diagonal slopes: approximate with tight stepped tiles
        for (const sl of this.cfg.slopes ?? []) {
            const dx = sl.x2 - sl.x1;
            const dy = sl.y2 - sl.y1;
            const steps = Math.max(6, Math.round(Math.abs(dx) / 40));
            const sw = dx / steps;
            const sh = dy / steps;
            for (let i = 0; i < steps; i++) {
                addTile(sl.x1 + sw * (i + 0.5), sl.y1 + sh * i + 8, Math.abs(sw) + 2, 16);
            }
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
            crate.body.setCollideWorldBounds(false);
            crate.setDisplaySize(32, 32);
            this.crates.push(crate);
        }
        for (const e of this.cfg.enemies) {
            const enemy = new Enemy(this, e.x, e.y, e.ability);
            this.enemies.push(enemy);
            this.enemyGroup.add(enemy);
        }
        if (this.cfg.isBossRoom && this.cfg.bossSpawnX && this.cfg.bossHp) {
            this.boss = new Boss(this, this.cfg.bossSpawnX, 620, this.cfg.bossHp, 3000);
            this.boss.on('bossDead', () => {
                this.bossDefeated = true;
                SoundManager.bossDeath();
                this.cameras.main.shake(300, 0.010);
                this.showPopup(W / 2, 400, 'BOSS DEFEATED!', '#ffe066');
                this.addScore(2000);
                // Auto-transition to victory screen after celebration
                this.time.delayedCall(3200, () => {
                    if (!this.roomTransitioning) {
                        this.roomTransitioning = true;
                        this.cameras.main.fadeOut(900, 0, 0, 0);
                        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'));
                    }
                });
                // Unseal the left exit — fade out the wall and show the door frame
                if (this.bossRoomLeftWall) {
                    const wall = this.bossRoomLeftWall;
                    wall.body.enable = false;
                    this.tweens.add({
                        targets: wall, alpha: 0, duration: 700,
                        onComplete: () => {
                            wall.destroy();
                            this.bossRoomLeftWall = null;
                            this.doorGlow(0, 640 - DOOR_H / 2, 16, DOOR_H);
                        },
                    });
                }
            });
        }
        // Throne room door — rendered behind player (depth 1-2)
        if (this.cfg.isThrone) {
            this.throneX = W / 2;
            const door = this.add.rectangle(W / 2, 620, 80, 120, 0x334466).setDepth(1);
            this.add.rectangle(W / 2, 620, 74, 114, 0x223355).setDepth(1);
            this.add.rectangle(W / 2, 620, 10, 40, 0xcb9b00).setDepth(1); // handle
            this.tweens.add({ targets: door, fillColor: 0x445577, duration: 1400, yoyo: true, repeat: -1 });
            this.throneLabel = this.add.text(W / 2, 548, '↑ PRESS UP', {
                fontSize: '9px', fontFamily: FONT, color: '#aaccff',
            }).setOrigin(0.5).setDepth(11).setVisible(false);
        }
    }
    // ── players ─────────────────────────────────────────────────────────────────
    spawnPlayers() {
        const count = this.registry.get('playerCount') ?? 1;
        const remoteIds = this.registry.get('remotePlayers') ?? [];
        const entryDir = this.registry.get('entryDir') ?? null;
        const pos = entryDir ? getEntryPos(entryDir, this.cfg) : { x: 100, y: 620 };
        for (let i = 0; i < count; i++) {
            const p = new Player(this, pos.x + i * 60, pos.y, i);
            p.setDepth(3); // above background door (depth 1) so player stands in front
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
        const persistedHearts = this.registry.get('persistedHearts');
        if (persistedHearts) {
            this.players.forEach((p, i) => {
                if (typeof persistedHearts[i] === 'number') {
                    p.hearts = persistedHearts[i];
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
            SoundManager.bossHit();
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
                        SoundManager.bossHit();
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
    electricBurst(src) {
        const dir = src.flipX ? -1 : 1;
        const boltLen = 900;
        const boltCx = src.x + dir * boltLen / 2;
        const bolt = this.add.rectangle(boltCx, src.y - 4, boltLen, 10, 0xffee00, 0.95).setDepth(15);
        const glow = this.add.rectangle(boltCx, src.y - 4, boltLen, 28, 0xffee00, 0.25).setDepth(14);
        this.cameras.main.flash(100, 255, 240, 80, false);
        this.tweens.add({ targets: [bolt, glow], alpha: 0, scaleY: 2, duration: 280,
            onComplete: () => { bolt.destroy(); glow.destroy(); } });
        // 3× wider arc and heavier damage vs fire/ice
        this.enemies.forEach(e => {
            if (dir * (e.x - src.x) > 0 && Math.abs(e.y - src.y) < 80) {
                e.die();
                this.addScore(SCORE_ENEMY);
            }
        });
        if (this.boss?.active && dir * (this.boss.x - src.x) > 0 && Math.abs(this.boss.y - src.y) < 90) {
            SoundManager.bossHit();
            this.boss.hit();
            // Two follow-up hits spaced past the boss's invincibility window
            this.time.delayedCall(700, () => { if (this.boss?.active) {
                SoundManager.bossHit();
                this.boss.hit();
            } });
            this.time.delayedCall(1400, () => { if (this.boss?.active) {
                SoundManager.bossHit();
                this.boss.hit();
            } });
        }
        this.destructibles.forEach(d => {
            if (dir * (d.x - src.x) > 0 && Math.abs(d.y - src.y) < 80) {
                d.takeDamage(150, DamageType.Electric); // 3× fire's 50
            }
        });
    }
    iceBlast(src) {
        const dir = src.flipX ? -1 : 1;
        const proj = this.physics.add.image(src.x + dir * 20, src.y, 'fireball');
        this.projectiles.add(proj);
        proj.body.setVelocityX(dir * 600).setGravityY(-800);
        proj.setTint(0x66ccff).setScale(1.15);
        this.enemies.forEach(e => {
            this.physics.add.overlap(proj, e, () => { e.die(); this.addScore(SCORE_ENEMY); proj.destroy(); });
        });
        this.destructibles.forEach(d => {
            this.physics.add.overlap(proj, d, () => { d.takeDamage(50, DamageType.Physical); proj.destroy(); });
        });
        if (this.boss?.active) {
            this.physics.add.overlap(proj, this.boss, () => { this.boss.hit(); proj.destroy(); });
        }
        this.time.delayedCall(2200, () => { if (proj.active)
            proj.destroy(); });
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
        let gy = -800;
        if (enemy.abilityType === AbilityType.Ice)
            gy = 0;
        if (enemy.abilityType === AbilityType.Electric)
            gy = -200;
        const proj = this.physics.add.image(enemy.x + dir * 20, enemy.y, 'fireball');
        this.enemyProjectiles.add(proj);
        const body = proj.body;
        body.setVelocityX(dir * speed).setGravityY(gy);
        if (enemy.abilityType === AbilityType.Ice)
            proj.setTint(0x66ccff);
        if (enemy.abilityType === AbilityType.Electric)
            proj.setTint(0xffdd00).setScale(1.4);
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
        this.registry.set('persistedHearts', null);
        this.registry.set('runRooms', null);
        this.registry.set('runIndex', 0);
        this.registry.set('entryDir', null);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }
    exitRoom(dir) {
        if (this.roomTransitioning)
            return;
        if (!this.gm.isPlaying())
            return;
        // Boss room: sealed until boss is defeated
        if (this.cfg.isBossRoom && !this.bossDefeated)
            return;
        this.roomTransitioning = true;
        this.gm.pause();
        this.physics.world.isPaused = true;
        this.registry.set('score', this.score);
        this.registry.set('persistedAbilities', this.players.map(p => ({ ability: p.currentAbility, ammo: p.abilityAmmo })));
        this.registry.set('persistedHearts', this.players.map(p => p.hearts));
        const runRooms = this.registry.get('runRooms') ?? [];
        const runIndex = this.registry.get('runIndex') ?? 0;
        const goBack = (dir === 'left' || dir === 'bottom') && runIndex > 0;
        const nextIndex = goBack ? runIndex - 1 : runIndex + 1;
        // Past the last room = true win → go to victory screen
        if (nextIndex >= runRooms.length) {
            this.cameras.main.fadeOut(800, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'));
            return;
        }
        this.registry.set('runIndex', nextIndex);
        this.registry.set('entryDir', OPPOSITE[dir]);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    }
    winGame() {
        // Throne door → go to boss room (next index in run)
        this.exitRoom('right');
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
        p.setInhaling(pad.buttons[3]?.pressed ?? false);
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
            // Start button (9) always toggles pause regardless of player state
            if (button.index === 9) {
                this.togglePause();
                return;
            }
            // D-pad navigates pause menu when paused
            if (!this.gm.isPlaying()) {
                if (button.index === 12) {
                    this.movePauseFocus(-1);
                    return;
                }
                if (button.index === 13) {
                    this.movePauseFocus(1);
                    return;
                }
                if (button.index === 0) {
                    this.pauseItems[this.pauseFocusIdx]?.action();
                    return;
                }
            }
            const player = this.players.find((_, i) => this.input.gamepad?.getPad(i) === pad);
            if (!player || !player.isAlive || player.isInhaled)
                return;
            if (button.index === 1)
                player.useAbility();
            if (button.index === 2)
                player.useRapier();
            // D-pad up (12) near throne door — same as pressing Up on keyboard
            if (button.index === 12 && this.cfg.isThrone) {
                const nearDoor = Math.abs(player.x - this.throneX) < 70;
                if (nearDoor)
                    this.winGame();
            }
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
        const escHint = this.add.text(width / 2, height * 0.77, 'ESC / Start to toggle', {
            fontSize: '9px', fontFamily: FONT, color: '#556677',
        }).setOrigin(0.5).setScrollFactor(0);
        const resumeAction = () => this.togglePause();
        const menuAction = () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
        };
        resume.on('pointerdown', resumeAction);
        toMenu.on('pointerdown', menuAction);
        this.pauseContainer = this.add.container(0, 0, [overlay, title, resume, toMenu, escHint])
            .setDepth(100).setVisible(false);
        this.pauseItems = [
            { text: resume, action: resumeAction },
            { text: toMenu, action: menuAction },
        ];
        // Cursor lives outside the container so it can move freely
        this.pauseCursor = this.add.text(0, 0, '►', {
            fontSize: '16px', fontFamily: FONT, color: '#ffe066',
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(200).setVisible(false);
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
        // Reset cursor when closing pause
        if (!nowPaused && this.pauseCursor)
            this.pauseCursor.setVisible(false);
    }
    movePauseFocus(dir) {
        const len = this.pauseItems.length;
        if (!len || !this.pauseCursor)
            return;
        this.pauseFocusIdx = (this.pauseFocusIdx + dir + len) % len;
        const b = this.pauseItems[this.pauseFocusIdx].text.getBounds();
        this.pauseCursor.setPosition(b.left - 12, b.centerY).setVisible(true);
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
                        inhale: !!(pad2?.connected ? (pad2.buttons[3]?.pressed) : keys?.['inhale']?.isDown),
                        ability: !!(pad2?.connected ? pad2.buttons[1]?.pressed : keys?.['ability']?.isDown),
                        rapier: !!(pad2?.connected ? pad2.buttons[2]?.pressed : keys?.['rapier']?.isDown),
                    });
                }
            }
            if (p.inhaling)
                this.checkInhale(p);
            else
                this.enemies.forEach(e => e.stopPull());
            // Exit boundary detection
            const remoteIds2 = this.registry.get('remotePlayers') ?? [];
            const isLocalPlayer = !remoteIds2.includes(p.playerId);
            if (isLocalPlayer && !this.roomTransitioning && p.isAlive) {
                const W = this.cfg.worldWidth;
                const exits = this.cfg.exits;
                const ep2 = this.cfg.exitPositions ?? {};
                if (p.x < 0 && exits.includes('left') && Math.abs(p.y - (ep2.left ?? 640)) < DOOR_H / 2) {
                    this.exitRoom('left');
                    return;
                }
                if (p.x > W && exits.includes('right') && Math.abs(p.y - (ep2.right ?? 640)) < DOOR_H / 2) {
                    this.exitRoom('right');
                    return;
                }
                if (p.y < 0 && exits.includes('top') && Math.abs(p.x - (ep2.top ?? W / 2)) < DOOR_W / 2) {
                    this.exitRoom('top');
                    return;
                }
                if (p.y > 740 && exits.includes('bottom') && Math.abs(p.x - (ep2.bottom ?? W / 2)) < DOOR_W / 2) {
                    this.exitRoom('bottom');
                    return;
                }
            }
            // Throne room: press Up near the door (keyboard or gamepad)
            if (this.cfg.isThrone && isLocalPlayer && p.isAlive) {
                const jumpKey = this.playerKeysets.get(p.playerId)?.['jump'];
                const nearDoor = Math.abs(p.x - this.throneX) < 70;
                this.throneLabel?.setVisible(nearDoor);
                if (nearDoor && jumpKey && Phaser.Input.Keyboard.JustDown(jumpKey))
                    this.winGame();
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
