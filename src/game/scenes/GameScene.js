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

    // Terrain (created before background so roadside trees can anchor to road height)
    this.terrain = new Terrain(this);

    // Photorealistic Background & Roadside Forest
    this.createBackground();

    // Player
    this.buggy = new Buggy(this, 250, 350);

    // Camera
    this.cameras.main.setBounds(0, 0, this.terrain.terrainWidth + 200, 1500);
    this.cameras.main.startFollow(this.buggy.chassisSprite, true, 0.06, 0.06, -80, 40);

    // Collisions
    this.matter.world.on('collisionstart', this.handleCollisions, this);

    // Volumetric Clouds
    this.clouds = [];
    this.spawnClouds();

    // Dust emitter array
    this.dustParticles = [];
  }

  createBackground() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 1. Atmospheric Rayleigh/Mie sky with solar bloom & crepuscular god rays
    drawRealisticSky(this, w, h, 'sky-grad');

    // 2. Far 3D-lit alpine range with glacier snowcaps & valley mist
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 340,
      amplitude: 205,
      scrollFactor: 0.06,
      depth: DEPTH.MOUNTAINS_FAR,
      layerType: 'far',
      seedOffset: 80,
      mistAlpha: 0.30,
    });

    // 3. Mid-ground 3D-lit granite & sub-alpine ridge
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 390,
      amplitude: 155,
      scrollFactor: 0.11,
      depth: DEPTH.MOUNTAINS_MID,
      layerType: 'mid',
      seedOffset: 520,
      mistAlpha: 0.22,
    });

    // 4. Near forested foothills & rocky outcrops
    drawRealisticMountainRange(this, {
      totalW: 6000,
      baseY: 430,
      amplitude: 105,
      scrollFactor: 0.15,
      depth: DEPTH.MOUNTAINS_NEAR,
      layerType: 'near',
      seedOffset: 940,
      mistAlpha: 0.15,
    });

    // 5. Multi-layered botanical spruce & birch forest + full-scale roadside trees
    drawRealisticForest(this, 6000, 448, {
      scrollBack: 0.16,
      scrollMid: 0.20,
      scrollFront: 0.25,
      seed: 42,
      includeRoadside: true,
      terrain: this.terrain,
    });
  }

  spawnClouds() {
    for (let i = 0; i < 8; i++) {
      const scale = Phaser.Math.FloatBetween(0.65, 1.35);
      const cloud = createRealisticCloud(
        this,
        Phaser.Math.Between(-200, 1400),
        Phaser.Math.Between(48, 185),
        {
          scale,
          alpha: Phaser.Math.FloatBetween(0.82, 0.96),
          scrollFactor: 0,
          depth: DEPTH.CLOUDS,
          seed: 100 + i * 17,
        }
      );
      cloud.speedX = Phaser.Math.FloatBetween(0.10, 0.30) * scale;
      this.clouds.push(cloud);
    }
  }

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
        Phaser.Math.FloatBetween(0.30, 0.55)
      );
      p.setDepth(DEPTH.PARTICLES);
      p.life = 0;
      p.driftX = Phaser.Math.FloatBetween(-1.1, -0.25);
      p.floatY = Phaser.Math.FloatBetween(0.25, 0.75);
      this.dustParticles.push(p);
    }

    // Occasional kicked-up gravel speck
    if (Math.random() > 0.52) {
      const speck = this.add.circle(
        x + Phaser.Math.Between(-8, 6),
        y + 2,
        Phaser.Math.FloatBetween(1.2, 2.2),
        COLORS.PEBBLE,
        0.8
      );
      speck.setDepth(DEPTH.PARTICLES);
      speck.life = 220;
      speck.driftX = Phaser.Math.FloatBetween(-2.2, -0.8);
      speck.floatY = Phaser.Math.FloatBetween(0.8, 1.8);
      this.dustParticles.push(speck);
    }
  }

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

  update(time, delta) {
    if (this.isGameOver || this.isVictory) return;

    const stats = this.buggy.update(delta);

    if (stats.crashed) {
      this.triggerGameOver();
      return;
    }

    // Move clouds smoothly without on-screen pop-in
    for (const c of this.clouds) {
      c.x += c.speedX;
      if (c.x > 1560) c.x = -270;
    }

    // Dust
    if (stats.isAccelerating) {
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
      const scale = 1 + p.life / 1200;
      p.setScale(scale);
      p.setAlpha(Math.max(0, 0.62 - p.life / 700));
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
