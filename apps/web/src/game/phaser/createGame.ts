import Phaser from 'phaser'
import { BattleScene } from './BattleScene'
import { PreloadScene } from './PreloadScene'

export function createGame(parent: HTMLElement) {
  // Phaser owns the fixed-size tactical canvas. CSS scales the container,
  // while simulation coordinates stay stable at 1280x720.
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#101417',
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PreloadScene, BattleScene]
  })
}
