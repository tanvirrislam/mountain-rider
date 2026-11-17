import Phaser from 'phaser';
import { DEPTH } from '../utils/constants';
import {
  drawRealisticSky,
  drawRealisticMountainRange,
  drawRealisticForest,
  createRealisticCloud,
} from '../utils/scenery';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    drawRealisticSky(this, w, h, 'menu-sky');

    // Distant alpine peaks with snowcaps
    drawRealisticMountainRange(this, {
      totalW: w + 400,
      baseY: h - 220,
      amplitude: 175,
      scrollFactor: 0,
      depth: DEPTH.MOUNTAINS_FAR,
      hasSnow: true,
      snowThreshold: 0.44,
      seedOffset: 120,
      mistAlpha: 0.25,
    });

    // Mid-ground rocky ridge
    drawRealisticMountainRange(this, {
      totalW: w + 400,
      baseY: h - 140,
      amplitude: 120,
      scrollFactor: 0,
      depth: DEPTH.MOUNTAINS_MID,
      bodyColor: 0x445f5c,
      shadowColor: 0x2c4240,
      hasSnow: false,
      seedOffset: 480,
      mistAlpha: 0.18,
    });

    // Near foothills & pine forest
    drawRealisticForest(this, w + 200, h - 70, {
      scrollBack: 0,
      scrollMid: 0,
      scrollFront: 0,
      seed: 19,
    });

    // Volumetric cumulus clouds
    const cloudConfigs = [
      { x: 180, y: 120, scale: 0.9, seed: 11 },
      { x: 470, y: 85, scale: 1.15, seed: 23 },
      { x: 810, y: 145, scale: 0.8, seed: 37 },
      { x: 1080, y: 100, scale: 1.05, seed: 53 },
      { x: 640, y: 200, scale: 0.65, seed: 71 },
    ];
    for (const cfg of cloudConfigs) {
      createRealisticCloud(this, cfg.x, cfg.y, {
        scale: cfg.scale,
        alpha: 0.9,
        scrollFactor: 0,
        depth: DEPTH.CLOUDS,
        seed: cfg.seed,
      });
    }
  }
}
