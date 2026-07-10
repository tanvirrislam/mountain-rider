import Phaser from 'phaser';
import { COLORS } from '../utils/constants';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Beautiful sky gradient
    const skyKey = 'menu-sky-' + Date.now();
    const skyTex = this.textures.createCanvas(skyKey, w, h);
    if (skyTex) {
      const ctx = skyTex.getContext();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#1565c0');
      grd.addColorStop(0.5, '#42a5f5');
      grd.addColorStop(1, '#e3f2fd');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      skyTex.refresh();
      this.add.image(w / 2, h / 2, skyKey);
    }

    // Draw some gentle mountain silhouettes
    const mountains = this.add.graphics();
    mountains.fillStyle(0x66bb6a, 0.6);
    mountains.beginPath();
    mountains.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      const y = h - 120 + Math.sin(x / 150) * 50 + Math.sin(x / 60) * 20;
      mountains.lineTo(x, y);
    }
    mountains.lineTo(w, h);
    mountains.closePath();
    mountains.fillPath();

    // Nearer mountains
    mountains.fillStyle(0x43a047, 0.7);
    mountains.beginPath();
    mountains.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      const y = h - 60 + Math.sin(x / 100) * 30 + Math.cos(x / 200) * 25;
      mountains.lineTo(x, y);
    }
    mountains.lineTo(w, h);
    mountains.closePath();
    mountains.fillPath();

    // A few floating clouds
    for (let i = 0; i < 5; i++) {
      this.drawMenuCloud(
        Phaser.Math.Between(100, w - 100),
        Phaser.Math.Between(80, 250)
      );
    }
  }

  drawMenuCloud(x, y) {
    const g = this.add.graphics();
    const s = Phaser.Math.FloatBetween(0.5, 1.2);

    // Shadow
    g.fillStyle(0x90caf9, 0.6); // slightly darker/blue for menu sky
    g.fillRoundedRect(x - 40 * s, y - 5 * s, 80 * s, 24 * s, 12 * s);
    g.fillCircle(x - 20 * s, y - 5 * s, 16 * s);
    g.fillCircle(x, y - 15 * s, 24 * s);
    g.fillCircle(x + 20 * s, y - 8 * s, 18 * s);

    // Body
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(x - 42 * s, y - 8 * s, 80 * s, 24 * s, 12 * s);
    g.fillCircle(x - 22 * s, y - 8 * s, 16 * s);
    g.fillCircle(x - 2 * s, y - 18 * s, 24 * s);
    g.fillCircle(x + 18 * s, y - 11 * s, 18 * s);
  }
}
