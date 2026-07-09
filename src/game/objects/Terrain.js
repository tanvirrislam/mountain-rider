import Phaser from 'phaser';
import { DEPTH, COLORS } from '../utils/constants';

/**
 * Procedurally generated terrain with layered grass, dirt,
 * decorative details, and a proper finish zone.
 */
export default class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.terrainWidth = 3800;   // Slightly longer for finish zone
    this.segmentLength = 40;

    this.points = [];
    this.bodies = [];

    this.generateTerrain();
    this.drawTerrain();
    this.addObstacles();
    this.addFinishZone();
  }

  /* ── Generate height-map points ── */
  generateTerrain() {
    const startY = 500;
    const finishZoneStart = this.terrainWidth - 500; // Last 500px is flat finish

    for (let x = 0; x <= this.terrainWidth; x += this.segmentLength) {
      // Calculate hills value
      const hillY = startY
        + Math.sin(x / 350) * 60
        + Math.sin(x / 180) * 30
        + Math.cos(x / 90)  * 10
        + (Math.random() - 0.5) * 4;

      let y;

      if (x < 400) {
        // Flat starting zone
        y = startY;
      } else if (x < 800) {
        // Smooth blend into hills
        const t = (x - 400) / 400;
        const ease = t * t * (3 - 2 * t);
        y = startY + (hillY - startY) * ease;
      } else if (x >= finishZoneStart) {
        // Smooth blend back to flat for finish zone
        const lastHillY = this.points.length > 0 ? this.points[this.points.length - 1].y : startY;
        if (x === finishZoneStart) {
          this._finishBlendStart = lastHillY;
        }
        const blendStart = this._finishBlendStart || startY;
        const t = (x - finishZoneStart) / 200; // Blend over 200px
        const ease = Math.min(1, t * t * (3 - 2 * t));
        y = blendStart + (startY - blendStart) * ease;
      } else {
        y = hillY;
      }

      y = Phaser.Math.Clamp(y, 300, 620);
      this.points.push({ x, y });
    }
  }

  /* ── Draw terrain with layered fill ── */
  drawTerrain() {
    const pts = this.points;
    const bottom = 1200;

    // ── Dirt fill ──
    const dirt = this.scene.add.graphics();
    dirt.fillStyle(COLORS.DIRT_BOTTOM, 1);
    dirt.beginPath();
    dirt.moveTo(pts[0].x, pts[0].y + 30);
    for (const p of pts) dirt.lineTo(p.x, p.y + 30);
    dirt.lineTo(this.terrainWidth, bottom);
    dirt.lineTo(0, bottom);
    dirt.closePath();
    dirt.fillPath();
    dirt.setDepth(DEPTH.TERRAIN_BG);

    // Lighter dirt top layer
    const dirtTop = this.scene.add.graphics();
    dirtTop.fillStyle(COLORS.DIRT_TOP, 1);
    dirtTop.beginPath();
    dirtTop.moveTo(pts[0].x, pts[0].y + 10);
    for (const p of pts) dirtTop.lineTo(p.x, p.y + 10);
    dirtTop.lineTo(this.terrainWidth, pts[pts.length - 1].y + 80);
    dirtTop.lineTo(0, pts[0].y + 80);
    dirtTop.closePath();
    dirtTop.fillPath();
    dirtTop.setDepth(DEPTH.TERRAIN_BG + 1);

    // ── Green grass body ──
    const grass = this.scene.add.graphics();
    grass.fillStyle(COLORS.GRASS_MID, 1);
    grass.beginPath();
    grass.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) grass.lineTo(p.x, p.y);
    grass.lineTo(this.terrainWidth, pts[pts.length - 1].y + 30);
    grass.lineTo(0, pts[0].y + 30);
    grass.closePath();
    grass.fillPath();
    grass.setDepth(DEPTH.TERRAIN_FG);

    // ── Bright grass top strip ──
    const grassTop = this.scene.add.graphics();
    grassTop.lineStyle(12, COLORS.GRASS_TOP, 1);
    grassTop.beginPath();
    grassTop.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      grassTop.lineTo(pts[i].x, pts[i].y);
    }
    grassTop.strokePath();
    grassTop.setDepth(DEPTH.TERRAIN_FG + 1);

    // ── Tiny grass blades ──
    const blades = this.scene.add.graphics();
    blades.setDepth(DEPTH.TERRAIN_FG + 2);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const p = pts[i];
      blades.lineStyle(2, 0x81c784, 0.7);
      blades.lineBetween(p.x, p.y, p.x - 3, p.y - 8);
      blades.lineBetween(p.x + 10, p.y, p.x + 12, p.y - 6);
    }

    // ── Physics segments ──
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const seg = this.scene.matter.add.rectangle(cx, cy + 20, len + 2, 40, {
        isStatic: true,
        angle,
        friction: 0.9,
        restitution: 0.05,
        label: 'terrain'
      });
      this.bodies.push(seg);
    }
  }

  /* ── Obstacles ── */
  addObstacles() {
    const rockPositions = [1200, 2000, 2600];
    rockPositions.forEach(rx => {
      const y = this.getHeightAtX(rx);
      this.drawRock(rx, y - 8, 12);
    });
  }

  drawRock(x, y, r) {
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(x, y + r * 0.6, r * 2.2, r * 0.6);
    g.fillStyle(COLORS.ROCK_DARK, 1);
    g.fillCircle(x, y, r);
    g.fillStyle(COLORS.ROCK, 1);
    g.fillCircle(x - r * 0.15, y - r * 0.15, r * 0.8);
    g.fillStyle(0xffffff, 0.15);
    g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.3);
    g.setDepth(DEPTH.OBSTACLES);

    this.scene.matter.add.circle(x, y, r, {
      isStatic: true,
      friction: 0.6,
      restitution: 0.2,
      label: 'obstacle'
    });
  }

  /* ── Finish Zone — proper ending with platform, flag, and walls ── */
  addFinishZone() {
    const lastPt = this.points[this.points.length - 1];
    const fy = lastPt.y;       // Ground level at finish
    const fxStart = this.terrainWidth - 350;  // Start of finish zone visuals
    const fxEnd = this.terrainWidth;
    const flagX = this.terrainWidth - 180;    // Flag in the center of the zone

    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OBSTACLES + 1);

    // ── Finish platform (darker asphalt strip) ──
    g.fillStyle(0x455a64, 1);
    g.fillRect(fxStart, fy - 4, fxEnd - fxStart, 12);

    // Checkered ground strip
    const stripeW = 25;
    for (let sx = fxStart; sx < fxEnd; sx += stripeW) {
      const idx = Math.floor((sx - fxStart) / stripeW);
      g.fillStyle(idx % 2 === 0 ? 0xeeeeee : 0x333333, 1);
      g.fillRect(sx, fy - 6, stripeW, 6);
    }

    // ── End wall (so buggy doesn't drive off into nothing) ──
    g.fillStyle(0x78909c, 1);
    g.fillRect(fxEnd - 20, fy - 100, 20, 100);
    // Wall highlight
    g.fillStyle(0x90a4ae, 1);
    g.fillRect(fxEnd - 18, fy - 98, 6, 96);
    // Warning stripes on wall
    for (let sy = fy - 100; sy < fy; sy += 20) {
      const sIdx = Math.floor((sy - (fy - 100)) / 20);
      g.fillStyle(sIdx % 2 === 0 ? 0xffd54f : 0x333333, 1);
      g.fillRect(fxEnd - 20, sy, 20, 10);
    }

    // End wall physics
    this.scene.matter.add.rectangle(fxEnd - 10, fy - 50, 20, 100, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.3,
      label: 'wall'
    });

    // ── Flag pole ──
    g.fillStyle(0xbdbdbd, 1);
    g.fillRect(flagX - 3, fy - 140, 6, 140);

    // Pole top ball
    g.fillStyle(0xffd600, 1);
    g.fillCircle(flagX, fy - 142, 6);

    // Pole base
    g.fillStyle(0x757575, 1);
    g.fillRoundedRect(flagX - 18, fy - 8, 36, 10, 4);

    // ── Checkered flag ──
    const flagW = 55;
    const flagH = 36;
    const rows = 4;
    const cols = 5;
    const cellW = flagW / cols;
    const cellH = flagH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWhite = (r + c) % 2 === 0;
        g.fillStyle(isWhite ? 0xffffff : 0xd32f2f, 1);
        g.fillRect(flagX + 4 + c * cellW, fy - 138 + r * cellH, cellW, cellH);
      }
    }
    g.lineStyle(2, 0x333333, 1);
    g.strokeRect(flagX + 4, fy - 138, flagW, flagH);

    // ── Decorative banners on either side ──
    this.drawBanner(g, fxStart + 30, fy, 0xff5252);
    this.drawBanner(g, fxStart + 80, fy, 0xffd740);
    this.drawBanner(g, fxEnd - 60, fy, 0x69f0ae);
    this.drawBanner(g, fxEnd - 110, fy, 0x40c4ff);

    // ── "FINISH" text on the platform ──
    const finishText = this.scene.add.text(flagX, fy - 160, '🏁 FINISH', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#333333',
      strokeThickness: 3,
    });
    finishText.setOrigin(0.5, 1);
    finishText.setDepth(DEPTH.OBSTACLES + 2);

    // ── Victory sensor ──
    this.finishSensor = this.scene.matter.add.rectangle(flagX, fy - 60, 80, 180, {
      isStatic: true,
      isSensor: true,
      label: 'finish'
    });
  }

  drawBanner(g, x, groundY, color) {
    // Pole
    g.fillStyle(0x9e9e9e, 1);
    g.fillRect(x - 2, groundY - 80, 4, 80);
    // Triangular pennant
    g.fillStyle(color, 0.85);
    g.fillTriangle(x + 2, groundY - 78, x + 2, groundY - 55, x + 22, groundY - 66);
    // Pole top
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(x, groundY - 82, 3);
  }

  /* ── Helpers ── */
  getHeightAtX(x) {
    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.points[i].x <= x && this.points[i + 1].x > x) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + t * (p2.y - p1.y);
      }
    }
    return 500;
  }
}
