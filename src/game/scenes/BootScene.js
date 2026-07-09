import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load minimal assets needed for the Preload scene (like a logo if we had one)
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
