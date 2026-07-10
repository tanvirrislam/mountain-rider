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

    // ── Deep earth fill (darkest layer at the bottom) ──
    const deepEarth = this.scene.add.graphics();
    deepEarth.fillStyle(0x3e2723, 1);
    deepEarth.beginPath();
    deepEarth.moveTo(pts[0].x, pts[0].y + 80);
    for (const p of pts) deepEarth.lineTo(p.x, p.y + 80);
    deepEarth.lineTo(this.terrainWidth, bottom);
    deepEarth.lineTo(0, bottom);
    deepEarth.closePath();
    deepEarth.fillPath();
    deepEarth.setDepth(DEPTH.TERRAIN_BG);

    // ── Mid dirt layer ──
    const midDirt = this.scene.add.graphics();
    midDirt.fillStyle(COLORS.DIRT_BOTTOM, 1);
    midDirt.beginPath();
    midDirt.moveTo(pts[0].x, pts[0].y + 35);
    for (let i = 0; i < pts.length; i++) midDirt.lineTo(pts[i].x, pts[i].y + 35);
    for (let i = pts.length - 1; i >= 0; i--) midDirt.lineTo(pts[i].x, pts[i].y + 85);
    midDirt.closePath();
    midDirt.fillPath();
    midDirt.setDepth(DEPTH.TERRAIN_BG + 0.3);

    // ── Upper dirt layer (lighter brown) ──
    const dirtTop = this.scene.add.graphics();
    dirtTop.fillStyle(COLORS.DIRT_TOP, 1);
    dirtTop.beginPath();
    dirtTop.moveTo(pts[0].x, pts[0].y + 12);
    for (let i = 0; i < pts.length; i++) dirtTop.lineTo(pts[i].x, pts[i].y + 12);
    for (let i = pts.length - 1; i >= 0; i--) dirtTop.lineTo(pts[i].x, pts[i].y + 40);
    dirtTop.closePath();
    dirtTop.fillPath();
    dirtTop.setDepth(DEPTH.TERRAIN_BG + 0.6);

    // ── Soil texture lines (cross-hatch for rough dirt look) ──
    const soilTex = this.scene.add.graphics();
    soilTex.setDepth(DEPTH.TERRAIN_BG + 0.8);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const p = pts[i];
      // Horizontal grain lines
      soilTex.lineStyle(1, 0x4e342e, 0.2);
      const ly1 = p.y + 20 + Math.random() * 15;
      soilTex.lineBetween(p.x, ly1, p.x + this.segmentLength * 1.5, ly1 + (Math.random() - 0.5) * 4);
      const ly2 = p.y + 45 + Math.random() * 20;
      soilTex.lineBetween(p.x, ly2, p.x + this.segmentLength * 2, ly2 + (Math.random() - 0.5) * 3);
      // Small root-like marks near the grass line
      if (Math.random() > 0.6) {
        soilTex.lineStyle(1.5, 0x5d4037, 0.25);
        const rx = p.x + Math.random() * 30;
        const ry = p.y + 14 + Math.random() * 8;
        soilTex.lineBetween(rx, ry, rx + 8 + Math.random() * 12, ry + 3 + Math.random() * 5);
      }
    }

    // ── Scattered pebbles & small stones ──
    const pebbles = this.scene.add.graphics();
    pebbles.setDepth(DEPTH.TERRAIN_BG + 1);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const p = pts[i];
      for (let j = 0; j < 2; j++) {
        const px = p.x + Math.random() * this.segmentLength * 2;
        const py = p.y + 18 + Math.random() * 45;
        const pr = 1.5 + Math.random() * 3;
        // Mix of light and dark pebbles
        const pColor = Math.random() > 0.5 ? 0x795548 : 0x6d4c41;
        pebbles.fillStyle(pColor, 0.45);
        pebbles.fillCircle(px, py, pr);
        // Tiny highlight on each pebble
        pebbles.fillStyle(0x8d6e63, 0.3);
        pebbles.fillCircle(px - pr * 0.3, py - pr * 0.3, pr * 0.5);
      }
    }

    // ── Green grass body ──
    const grass = this.scene.add.graphics();
    grass.fillStyle(COLORS.GRASS_MID, 1);
    grass.beginPath();
    grass.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length; i++) grass.lineTo(pts[i].x, pts[i].y);
    for (let i = pts.length - 1; i >= 0; i--) grass.lineTo(pts[i].x, pts[i].y + 30);
    grass.closePath();
    grass.fillPath();
    grass.setDepth(DEPTH.TERRAIN_FG);

    // ── Grass-to-dirt transition band (soft edge) ──
    const transition = this.scene.add.graphics();
    transition.setDepth(DEPTH.TERRAIN_FG - 0.5);
    // Dark green band just below grass
    transition.fillStyle(0x33691e, 0.7);
    transition.beginPath();
    transition.moveTo(pts[0].x, pts[0].y + 28);
    for (let i = 0; i < pts.length; i++) transition.lineTo(pts[i].x, pts[i].y + 28);
    for (let i = pts.length - 1; i >= 0; i--) transition.lineTo(pts[i].x, pts[i].y + 40);
    transition.closePath();
    transition.fillPath();

    // ── Bright grass top strip (thicker, two-tone) ──
    const grassTop = this.scene.add.graphics();
    grassTop.setDepth(DEPTH.TERRAIN_FG + 1);
    // Darker bottom edge
    grassTop.lineStyle(14, 0x388e3c, 1);
    grassTop.beginPath();
    grassTop.moveTo(pts[0].x, pts[0].y + 2);
    for (let i = 1; i < pts.length; i++) {
      grassTop.lineTo(pts[i].x, pts[i].y + 2);
    }
    grassTop.strokePath();
    // Bright top edge
    grassTop.lineStyle(8, COLORS.GRASS_TOP, 1);
    grassTop.beginPath();
    grassTop.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      grassTop.lineTo(pts[i].x, pts[i].y);
    }
    grassTop.strokePath();

    // ── Dense grass blades ──
    const blades = this.scene.add.graphics();
    blades.setDepth(DEPTH.TERRAIN_FG + 2);
    const bladeColors = [0x81c784, 0x66bb6a, 0x4caf50, 0xa5d6a7];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      for (let b = 0; b < 4; b++) {
        const t = b / 4;
        const bx = p1.x + (p2.x - p1.x) * t + Math.random() * 8;
        const by = p1.y + (p2.y - p1.y) * t;
        const bh = 5 + Math.random() * 10;
        const lean = (Math.random() - 0.5) * 6;
        const color = bladeColors[Math.floor(Math.random() * bladeColors.length)];
        blades.lineStyle(1.5, color, 0.8);
        blades.lineBetween(bx, by, bx + lean, by - bh);
      }
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
    const rockSizes = [18, 15, 20];
    rockPositions.forEach((rx, idx) => {
      const y = this.getHeightAtX(rx);
      this.drawRock(rx, y - rockSizes[idx] * 0.4, rockSizes[idx], idx);
    });
  }

  drawRock(x, y, r, seed) {
    const g = this.scene.add.graphics();

    // Ground shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 3, y + r * 0.45, r * 2.6, r * 0.8);

    // Generate irregular polygon vertices with seeded variation
    const sides = 8;
    const verts = [];
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
      // Use seed to make each rock unique but consistent
      const variation = 0.75 + ((Math.sin(seed * 100 + i * 37) + 1) / 2) * 0.4;
      verts.push({
        x: x + Math.cos(ang) * r * variation,
        y: y + Math.sin(ang) * r * variation * 0.75
      });
    }

    // Dark base (shadow side)
    g.fillStyle(0x37474f, 1);
    g.beginPath();
    g.moveTo(verts[0].x + 2, verts[0].y + 2);
    for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x + 2, verts[i].y + 2);
    g.closePath();
    g.fillPath();

    // Main body
    g.fillStyle(COLORS.ROCK_DARK, 1);
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
    g.closePath();
    g.fillPath();

    // Lighter upper-left face
    g.fillStyle(COLORS.ROCK, 1);
    g.beginPath();
    g.moveTo(verts[0].x - 2, verts[0].y - 2);
    for (let i = 1; i < Math.ceil(verts.length * 0.6); i++) {
      g.lineTo(verts[i].x - 2, verts[i].y - 2);
    }
    g.lineTo(x, y);
    g.closePath();
    g.fillPath();

    // Specular highlight
    g.fillStyle(0xb0bec5, 0.45);
    g.fillEllipse(x - r * 0.2, y - r * 0.22, r * 0.5, r * 0.35);

    // Surface detail — crack lines
    g.lineStyle(1, 0x37474f, 0.35);
    g.lineBetween(x - r * 0.35, y, x + r * 0.15, y + r * 0.25);
    g.lineBetween(x, y - r * 0.2, x + r * 0.3, y + r * 0.15);

    // Moss patches on top
    g.fillStyle(COLORS.MOSS, 0.55);
    g.fillEllipse(x - r * 0.15, y - r * 0.42, r * 0.35, r * 0.15);
    g.fillEllipse(x + r * 0.15, y - r * 0.38, r * 0.25, r * 0.12);

    g.setDepth(DEPTH.OBSTACLES);

    this.scene.matter.add.circle(x, y, r * 0.85, {
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

    // ── Confetti dots scattered in the finish area ──
    const confettiColors = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xea80fc, 0xffab40];
    for (let i = 0; i < 40; i++) {
      const cx = fxStart + Math.random() * (fxEnd - fxStart);
      const cy = fy - 20 - Math.random() * 120;
      const cr = 1.5 + Math.random() * 2.5;
      g.fillStyle(confettiColors[Math.floor(Math.random() * confettiColors.length)], 0.6 + Math.random() * 0.3);
      g.fillCircle(cx, cy, cr);
    }

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

    // ── Start arch (two pillars + top bar) ──
    const archX = fxStart + 15;
    g.fillStyle(0xeeeeee, 1);
    g.fillRect(archX - 4, fy - 90, 8, 90);
    g.fillRect(archX + 56, fy - 90, 8, 90);
    // Top bar
    g.fillStyle(0xd32f2f, 1);
    g.fillRect(archX - 6, fy - 95, 70, 10);
    // Checkered pattern on top bar
    for (let ci = 0; ci < 7; ci++) {
      g.fillStyle(ci % 2 === 0 ? 0xffffff : 0x212121, 1);
      g.fillRect(archX - 6 + ci * 10, fy - 95, 10, 10);
    }

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
