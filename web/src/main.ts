import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { IntroScene } from './scenes/IntroScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { VictoryScene } from './scenes/VictoryScene'
import { LevelCompleteScene } from './scenes/LevelCompleteScene'
import { LobbyScene } from './scenes/LobbyScene'

const config: Phaser.Types.Core.GameConfig = {
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
}

// iOS/Safari gates the Gamepad API behind a user gesture. Calling
// getGamepads() from inside a touch handler unlocks it for the session.
document.addEventListener('touchstart', () => {
  try { navigator.getGamepads() } catch (_) { /* ignore */ }
}, { once: true, passive: true })

new Phaser.Game(config)
