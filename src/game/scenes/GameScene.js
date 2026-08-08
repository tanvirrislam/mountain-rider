import Phaser from 'phaser';
import Buggy from '../objects/Buggy';
import Terrain from '../objects/Terrain';
import { DEPTH, COLORS } from '../utils/constants';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.isGameOver = false;
    this.isVictory = false;
    this.startTime = this.time.now;

    this.setGameState = this.registry.get('setGameState');
    this.setStats = this.registry.get('setStats');

    // Background
    this.createBackground();

    // Terrain
    this.terrain = new Terrain(this);

    // Player
    this.buggy = new Buggy(this, 250, 350);

    // Camera
    this.cameras.main.setBounds(0, 0, this.terrain.terrainWidth + 200, 1500);
    this.cameras.main.startFollow(this.buggy.chassisSprite, true, 0.06, 0.06, -80, 40);

    // Collisions
    this.matter.world.on('collisionstart', this.handleCollisions, this);

    // Clouds array
    this.clouds = [];
    this.spawnClouds();

    // Dust emitter placeholder
    this.dustParticles = [];
  }

  // background

  createBackground() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Sky gradient
    const skyKey = 'sky-grad-' + Date.now();
    const skyTex = this.textures.createCanvas(skyKey, w, h);
    if (skyTex) {
      const ctx = skyTex.getContext();
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, COLORS.SKY_TOP);
      grd.addColorStop(1, COLORS.SKY_BOTTOM);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      skyTex.refresh();
      const sky = this.add.image(w / 2, h / 2, skyKey);
      sky.setScrollFactor(0);
      sky.setDepth(DEPTH.SKY);
    }

    //  Mountain back layer
    this.drawMountainLayer(COLORS.MOUNTAIN_FAR, 0.08, DEPTH.MOUNTAINS_FAR, 1, 100, 280);

    // Mountain front layer
    this.drawMountainLayer(COLORS.MOUNTAIN_NEAR, 0.15, DEPTH.MOUNTAINS_NEAR, 2, 120, 320);

    // ── Forest silhouette ──
    this.drawForestLayer(w, h);
  }

  drawMountainLayer(color, scrollFactor, depth, alpha, amplitude, baseY) {
    const totalW = 6000;
    const g = this.add.graphics();
    g.setScrollFactor(scrollFactor);
    g.setDepth(depth);

    // Generate mountain points
    const mtnPoints = [];
    for (let x = -200; x <= totalW; x += 15) {
      const y = baseY + Math.sin(x / 250) * amplitude * 0.7
        + Math.sin(x / 100) * amplitude * 0.25
        + Math.cos(x / 400) * amplitude * 0.5;
      mtnPoints.push({ x, y });
    }

    // Base mountain fill
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(-200, baseY + amplitude + 200);
    for (const p of mtnPoints) g.lineTo(p.x, p.y);
    g.lineTo(totalW, baseY + amplitude + 200);
    g.lineTo(-200, baseY + amplitude + 200);
    g.closePath();
    g.fillPath();

    // Shadow face on right side of peaks
    const shadowColor = (color === COLORS.MOUNTAIN_FAR) ? 0x4caf50 : 0x2e7d32;
    g.fillStyle(shadowColor, 0.4);
    for (let i = 1; i < mtnPoints.length - 1; i++) {
      const prev = mtnPoints[i - 1];
      const curr = mtnPoints[i];
      const next = mtnPoints[i + 1];
      if (curr.y < prev.y && curr.y < next.y) {
        const shadowEnd = Math.min(i + 6, mtnPoints.length - 1);
        g.beginPath();
        g.moveTo(curr.x, curr.y);
        for (let j = i; j <= shadowEnd; j++) {
          g.lineTo(mtnPoints[j].x, mtnPoints[j].y);
        }
        g.lineTo(mtnPoints[shadowEnd].x, curr.y + amplitude * 0.6);
        g.lineTo(curr.x, curr.y + amplitude * 0.6);
        g.closePath();
        g.fillPath();
      }
    }
  }

  drawForestLayer(w, h) {
    const totalW = 6000;
    const baseY = 420;

    //  Back row of trees
    const gBack = this.add.graphics();
    gBack.setDepth(DEPTH.FOREST - 1);
    gBack.setScrollFactor(0.17);

    for (let x = 0; x < totalW; x += 55) {
      const treeH = 30 + Math.random() * 40;
      const treeW = 28 + Math.random() * 12;
      const cx = x + Math.random() * 20;

      // Lighter green canopy
      gBack.fillStyle(0x66bb6a, 1);
      // Layered triangles for a pine shape
      gBack.fillTriangle(cx - treeW * 0.5, baseY, cx, baseY - treeH, cx + treeW * 0.5, baseY);
      gBack.fillTriangle(cx - treeW * 0.35, baseY - treeH * 0.3, cx, baseY - treeH * 1.15, cx + treeW * 0.35, baseY - treeH * 0.3);
    }

    // Main forest layer
    const g = this.add.graphics();
    g.setDepth(DEPTH.FOREST);
    g.setScrollFactor(0.2);

    for (let x = 0; x < totalW; x += 38) {
      const treeH = 40 + Math.random() * 55;
      const treeW = 30 + Math.random() * 16;
      const cx = x + Math.random() * 15;

      // Trunk
      g.fillStyle(0x5d4037, 1);
      g.fillRect(cx - 3, baseY - 8, 6, 12);

      // Main canopy — dark green, 3 layered triangles for pine look
      g.fillStyle(0x2e7d32, 1);
      g.fillTriangle(cx - treeW * 0.55, baseY - 4, cx, baseY - treeH * 0.55, cx + treeW * 0.55, baseY - 4);
      g.fillStyle(0x388e3c, 1);
      g.fillTriangle(cx - treeW * 0.42, baseY - treeH * 0.3, cx, baseY - treeH * 0.82, cx + treeW * 0.42, baseY - treeH * 0.3);
      g.fillStyle(0x1b5e20, 1);
      g.fillTriangle(cx - treeW * 0.28, baseY - treeH * 0.55, cx, baseY - treeH * 1.05, cx + treeW * 0.28, baseY - treeH * 0.55);

      // Light highlight on the left side of top tier
      g.fillStyle(0x81c784, 0.5);
      g.fillTriangle(cx - treeW * 0.22, baseY - treeH * 0.58, cx - 2, baseY - treeH * 1.02, cx + treeW * 0.05, baseY - treeH * 0.58);
    }

    // Scattered small bushes between trees
    g.fillStyle(0x388e3c, 1);
    for (let x = 0; x < totalW; x += 70) {
      const bx = x + Math.random() * 50;
      const r = 6 + Math.random() * 8;
      g.fillCircle(bx, baseY + 2, r);
      g.fillCircle(bx + r * 0.7, baseY + 1, r * 0.75);
    }

    // Layered ground fill
    // Dark undergrowth
    g.fillStyle(0x1b5e20, 1);
    g.fillRect(0, baseY, totalW, 100);
    // Lighter grass strip on top
    g.fillStyle(0x4caf50, 0.6);
    g.fillRect(0, baseY, totalW, 6);

    // Small grass tufts
    g.fillStyle(0x43a047, 1);
    for (let x = 0; x < totalW; x += 25) {
      const tx = x + Math.random() * 15;
      const th = 4 + Math.random() * 6;
      g.fillTriangle(tx, baseY, tx + 2, baseY - th, tx + 4, baseY);
      g.fillTriangle(tx + 5, baseY, tx + 7, baseY - th * 0.7, tx + 9, baseY);
    }
  }


  // clouds
  spawnClouds() {
    for (let i = 0; i < 8; i++) {
      const cloud = this.createCloudGraphic(
        Phaser.Math.Between(-200, 1400),
        Phaser.Math.Between(40, 180)
      );
      cloud.speedX = Phaser.Math.FloatBetween(0.15, 0.4);
      this.clouds.push(cloud);
    }
  }

  createCloudGraphic(x, y) {
    const g = this.add.graphics();
    g.setScrollFactor(0); // Fixed to screen
    g.setDepth(DEPTH.CLOUDS);
    g.setAlpha(Phaser.Math.FloatBetween(0.7, 0.95));

    const s = Phaser.Math.FloatBetween(0.5, 1.2);

    // Cloud shadow
    g.fillStyle(0xcbe0ff, 0.9);
    g.fillRoundedRect(-40 * s, -5 * s, 80 * s, 24 * s, 12 * s);
    g.fillCircle(-20 * s, -5 * s, 16 * s);
    g.fillCircle(0 * s, -15 * s, 24 * s);
    g.fillCircle(20 * s, -8 * s, 18 * s);

    // Cloud body
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-42 * s, -8 * s, 80 * s, 24 * s, 12 * s);
    g.fillCircle(-22 * s, -8 * s, 16 * s);
    g.fillCircle(-2 * s, -18 * s, 24 * s);
    g.fillCircle(18 * s, -11 * s, 18 * s);

    g.setPosition(x, y);
    return g;
  }


  // dust
  emitDust(x, y) {
    const dustColors = [COLORS.DUST_LIGHT, COLORS.DUST_MID, COLORS.DUST_DARK];
    for (let i = 0; i < 4; i++) {
      const color = dustColors[Phaser.Math.Between(0, 2)];
      const size = Phaser.Math.FloatBetween(1.5, 6);
      const p = this.add.circle(
        x + Phaser.Math.Between(-12, 12),
        y + Phaser.Math.Between(-6, 4),
        size,
        color,
        Phaser.Math.FloatBetween(0.4, 0.7)
      );
      p.setDepth(DEPTH.PARTICLES);
      p.life = 0;
      p.driftX = Phaser.Math.FloatBetween(-0.8, -0.2);
      p.floatY = Phaser.Math.FloatBetween(0.3, 0.8);
      this.dustParticles.push(p);
    }
  }

  // collision

  handleCollisions(event) {
    if (this.isGameOver || this.isVictory) return;

    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      if (
        (bodyA.label === 'chassis' && bodyB.label === 'finish') ||
        (bodyB.label === 'chassis' && bodyA.label === 'finish')
      ) {
        this.triggerVictory();
      }
    }
  }

  triggerVictory() {
    this.isVictory = true;
    if (this.setGameState) this.setGameState('victory');
    this.scene.pause();
  }

  triggerGameOver() {
    this.isGameOver = true;
    if (this.setGameState) this.setGameState('gameover');
    this.scene.pause();
  }

  // update

  update(time, delta) {
    if (this.isGameOver || this.isVictory) return;

    const stats = this.buggy.update(delta);

    if (stats.crashed) {
      this.triggerGameOver();
      return;
    }

    // Move clouds
    for (const c of this.clouds) {
      c.x += c.speedX;
      if (c.x > 1400) c.x = -200;
    }

    // Dust
    if (stats.isAccelerating) {
      // Emit from rear wheel position
      this.emitDust(
        this.buggy.wheelA.position.x,
        this.buggy.wheelA.position.y + 15
      );
    }

    // Update dust particles
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.life += delta;
      p.x += (p.driftX || -0.5);
      p.y -= (p.floatY || 0.5);
      // Grow slightly as they float
      const scale = 1 + p.life / 1200;
      p.setScale(scale);
      p.setAlpha(Math.max(0, 0.65 - p.life / 700));
      if (p.life > 700) {
        p.destroy();
        this.dustParticles.splice(i, 1);
      }
    }

    // HUD stats
    if (this.setStats) {
      const dist = Math.max(0, (stats.distance - 250) / 100);
      const elapsed = (time - this.startTime) / 1000;
      const speed = Math.abs(stats.speed) * 3.6;

      this.setStats({ distance: dist, time: elapsed, speed });
    }
  }
}
