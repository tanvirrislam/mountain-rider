import Phaser from 'phaser';
import Buggy from '../objects/Buggy';
import Terrain from '../objects/Terrain';
import { DEPTH, COLORS } from '../utils/constants';
import {
  drawRealisticSky,
  drawRealisticMountainRange,
  drawRealisticForest,
  createRealisticCloud,
} from '../utils/scenery';

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

    // Atmospheric sky gradient with solar glow
    drawRealisticSky(this, w, h, 'sky-grad');

    // Far alpine range with snowcaps & valley mist
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 330,
      amplitude: 185,
      scrollFactor: 0.06,
      depth: DEPTH.MOUNTAINS_FAR,
      bodyColor: COLORS.MOUNTAIN_FAR,
      shadowColor: COLORS.MOUNTAIN_FAR_SHADOW,
      hasSnow: true,
      snowThreshold: 0.42,
      seedOffset: 80,
      mistAlpha: 0.28,
    });

    // Mid-ground rocky mountain ridge
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 380,
      amplitude: 145,
      scrollFactor: 0.11,
      depth: DEPTH.MOUNTAINS_MID,
      bodyColor: COLORS.MOUNTAIN_MID,
      shadowColor: COLORS.MOUNTAIN_MID_SHADOW,
      hasSnow: true,
      snowThreshold: 0.72,
      seedOffset: 520,
      mistAlpha: 0.22,
    });

    // Near wooded foothills
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 420,
      amplitude: 95,
      scrollFactor: 0.14,
      depth: DEPTH.MOUNTAINS_NEAR,
      bodyColor: COLORS.MOUNTAIN_NEAR,
      shadowColor: COLORS.MOUNTAIN_NEAR_SHADOW,
      hasSnow: false,
      seedOffset: 940,
      mistAlpha: 0.16,
    });

    // Multi-layered conifer forest & undergrowth
    drawRealisticForest(this, 6000, 445, {
      scrollBack: 0.15,
      scrollMid: 0.18,
      scrollFront: 0.22,
      seed: 42,
    });
  }

  // clouds
  spawnClouds() {
    for (let i = 0; i < 9; i++) {
      const scale = Phaser.Math.FloatBetween(0.55, 1.25);
      const cloud = createRealisticCloud(
        this,
        Phaser.Math.Between(-200, 1400),
        Phaser.Math.Between(45, 195),
        {
          scale,
          alpha: Phaser.Math.FloatBetween(0.75, 0.94),
          scrollFactor: 0,
          depth: DEPTH.CLOUDS,
          seed: 100 + i * 17,
        }
      );
      cloud.speedX = Phaser.Math.FloatBetween(0.12, 0.35) * scale;
      this.clouds.push(cloud);
    }
  }

  // dust
  emitDust(x, y) {
    const dustColors = [COLORS.DUST_LIGHT, COLORS.DUST_MID, COLORS.DUST_DARK];
    for (let i = 0; i < 4; i++) {
      const color = dustColors[Phaser.Math.Between(0, 2)];
      const size = Phaser.Math.FloatBetween(2.5, 7);
      const p = this.add.circle(
        x + Phaser.Math.Between(-14, 10),
        y + Phaser.Math.Between(-5, 5),
        size,
        color,
        Phaser.Math.FloatBetween(0.32, 0.58)
      );
      p.setDepth(DEPTH.PARTICLES);
      p.life = 0;
      p.driftX = Phaser.Math.FloatBetween(-1.1, -0.25);
      p.floatY = Phaser.Math.FloatBetween(0.25, 0.75);
      this.dustParticles.push(p);
    }

    // Occasional kicked-up gravel speck
    if (Math.random() > 0.55) {
      const speck = this.add.circle(
        x + Phaser.Math.Between(-8, 6),
        y + 2,
        Phaser.Math.FloatBetween(1.2, 2.2),
        COLORS.PEBBLE,
        0.75
      );
      speck.setDepth(DEPTH.PARTICLES);
      speck.life = 220;
      speck.driftX = Phaser.Math.FloatBetween(-2.2, -0.8);
      speck.floatY = Phaser.Math.FloatBetween(0.8, 1.8);
      this.dustParticles.push(speck);
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
