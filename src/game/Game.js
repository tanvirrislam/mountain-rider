import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import PreloadScene from './scenes/PreloadScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './utils/constants';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: PHYSICS.GRAVITY_Y },
      debug: false // Set to true to see physics bodies
    }
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene]
};

let game = null;

export default function initGame(parent, reactHooks) {
  if (game) {
    game.destroy(true);
  }
  
  const customConfig = { ...config, parent };
  game = new Phaser.Game(customConfig);
  
  // Pass React hooks into the game registry so scenes can access them
  game.registry.set('setGameState', reactHooks.setGameState);
  game.registry.set('setStats', reactHooks.setStats);
  
  return game;
}
