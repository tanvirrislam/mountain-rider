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

    // Distant 3D-lit alpine peaks with glacier snowcaps
    drawRealisticMountainRange(this, {
      totalW: w + 400,
      baseY: h - 220,
      amplitude: 195,
      scrollFactor: 0,
      depth: DEPTH.MOUNTAINS_FAR,
      layerType: 'far',
      seedOffset: 120,
      mistAlpha: 0.28,
    });

    // Mid-ground 3D-lit granite & sub-alpine ridge
    drawRealisticMountainRange(this, {
      totalW: w + 400,
      baseY: h - 140,
      amplitude: 135,
      scrollFactor: 0,
      depth: DEPTH.MOUNTAINS_MID,
      layerType: 'mid',
      seedOffset: 480,
      mistAlpha: 0.20,
    });

    // Near wooded foothills & botanical pine/birch forest
    drawRealisticForest(this, w + 200, h - 75, {
      scrollBack: 0,
      scrollMid: 0,
      scrollFront: 0,
      seed: 19,
      includeRoadside: false,
    });

    // Volumetric raymarched cumulus clouds
    const cloudConfigs = [
      { x: 180, y: 115, scale: 0.95, seed: 11 },
      { x: 480, y: 82, scale: 1.25, seed: 23 },
      { x: 820, y: 140, scale: 0.85, seed: 37 },
      { x: 1090, y: 98, scale: 1.10, seed: 53 },
      { x: 640, y: 195, scale: 0.72, seed: 71 },
    ];
    for (const cfg of cloudConfigs) {
      createRealisticCloud(this, cfg.x, cfg.y, {
        scale: cfg.scale,
        alpha: 0.92,
        scrollFactor: 0,
        depth: DEPTH.CLOUDS,
        seed: cfg.seed,
      });
    }
  }
}
