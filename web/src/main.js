import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { VictoryScene } from './scenes/VictoryScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { LobbyScene } from './scenes/LobbyScene';
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    backgroundColor: '#080818',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 800 }, debug: false },
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
        gamepad: true,
    },
    scene: [BootScene, IntroScene, MenuScene, GameScene, VictoryScene, LevelCompleteScene, LobbyScene],
};
new Phaser.Game(config);
