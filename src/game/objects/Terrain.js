import Phaser from 'phaser'
import { DEPTH, COLORS } from '../utils/constants'

export default class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.terrainWidth = 3800;
    this.segmentLength = 40;

    this.points = [];
    this.bodies = [];

    this.generateTerrain();
    this.drawTerrain();
    this.addObstacles();
    this.addFinishZone();
  }

  // Generate height-map points
  generateTerrain() {
    const startY = 500;
    const finishZoneStart = this.terrainWidth - 500; // Last 500px is flat finish

    for (let x = 0; x <= this.terrainWidth; x += this.segmentLength) {
      // Calculate hills value
      const hillY = startY
        + Math.sin(x / 350) * 60
        + Math.sin(x / 180) * 30
        + Math.cos(x / 90) * 10
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

  // Draw terrain with realistic stratified earth, mountain road, and natural grass
  drawTerrain() {
    const pts = this.points;
    const bottom = 1200;

    // 1. Deep bedrock fill
    const bedrock = this.scene.add.graphics();
    bedrock.fillStyle(COLORS.BEDROCK, 1);
    bedrock.beginPath();
    bedrock.moveTo(pts[0].x, pts[0].y + 95);
    for (const p of pts) bedrock.lineTo(p.x, p.y + 95);
    bedrock.lineTo(this.terrainWidth, bottom);
    bedrock.lineTo(0, bottom);
    bedrock.closePath();
    bedrock.fillPath();
    bedrock.setDepth(DEPTH.TERRAIN_BG);

    // 2. Rocky subsoil layer with organic wavy boundary
    const subsoil = this.scene.add.graphics();
    subsoil.fillStyle(COLORS.DIRT_BOTTOM, 1);
    subsoil.beginPath();
    subsoil.moveTo(pts[0].x, pts[0].y + 48);
    for (let i = 0; i < pts.length; i++) {
      const wave = Math.sin(i * 0.7) * 5;
      subsoil.lineTo(pts[i].x, pts[i].y + 48 + wave);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const wave = Math.cos(i * 0.5) * 7;
      subsoil.lineTo(pts[i].x, pts[i].y + 102 + wave);
    }
    subsoil.closePath();
    subsoil.fillPath();
    subsoil.setDepth(DEPTH.TERRAIN_BG + 0.25);

    // 3. Rich loam mid-layer
    const loam = this.scene.add.graphics();
    loam.fillStyle(COLORS.DIRT_MID, 1);
    loam.beginPath();
    loam.moveTo(pts[0].x, pts[0].y + 20);
    for (let i = 0; i < pts.length; i++) {
      const wave = Math.cos(i * 0.6) * 3;
      loam.lineTo(pts[i].x, pts[i].y + 20 + wave);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const wave = Math.sin(i * 0.7) * 5;
      loam.lineTo(pts[i].x, pts[i].y + 52 + wave);
    }
    loam.closePath();
    loam.fillPath();
    loam.setDepth(DEPTH.TERRAIN_BG + 0.5);

    // 4. Organic topsoil layer
    const topsoil = this.scene.add.graphics();
    topsoil.fillStyle(COLORS.DIRT_TOP, 1);
    topsoil.beginPath();
    topsoil.moveTo(pts[0].x, pts[0].y + 6);
    for (let i = 0; i < pts.length; i++) topsoil.lineTo(pts[i].x, pts[i].y + 6);
    for (let i = pts.length - 1; i >= 0; i--) {
      const wave = Math.cos(i * 0.6) * 3;
      topsoil.lineTo(pts[i].x, pts[i].y + 24 + wave);
    }
    topsoil.closePath();
    topsoil.fillPath();
    topsoil.setDepth(DEPTH.TERRAIN_BG + 0.7);

    // 5. Soil strata lines, fissures, and rootlets
    const soilTex = this.scene.add.graphics();
    soilTex.setDepth(DEPTH.TERRAIN_BG + 0.85);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const p = pts[i];
      // Subtle strata grain
      soilTex.lineStyle(1.5, 0x2c1e15, 0.28);
      const ly1 = p.y + 26 + Math.random() * 18;
      soilTex.lineBetween(p.x, ly1, p.x + this.segmentLength * 1.6, ly1 + (Math.random() - 0.5) * 5);

      soilTex.lineStyle(1, 0x1e130d, 0.25);
      const ly2 = p.y + 58 + Math.random() * 26;
      soilTex.lineBetween(p.x, ly2, p.x + this.segmentLength * 2.1, ly2 + (Math.random() - 0.5) * 6);

      // Fine rootlets near surface
      if (Math.random() > 0.55) {
        soilTex.lineStyle(1.2, 0x70533f, 0.35);
        const rx = p.x + Math.random() * 28;
        const ry = p.y + 10 + Math.random() * 8;
        soilTex.lineBetween(rx, ry, rx + (Math.random() - 0.3) * 14, ry + 5 + Math.random() * 9);
      }
    }

    // 6. Embedded angular stones & pebbles in subsoil
    const pebbles = this.scene.add.graphics();
    pebbles.setDepth(DEPTH.TERRAIN_BG + 0.95);
    for (let i = 0; i < pts.length - 1; i += 2) {
      const p = pts[i];
      for (let j = 0; j < 3; j++) {
        const px = p.x + Math.random() * this.segmentLength * 2;
        const py = p.y + 16 + Math.random() * 68;
        const pr = 1.8 + Math.random() * 3.8;
        const pColor = Math.random() > 0.45 ? COLORS.ROCK_DARK : COLORS.PEBBLE;
        pebbles.fillStyle(pColor, 0.55);
        pebbles.fillEllipse(px, py, pr * 2.2, pr * 1.4);
        // Upper-left highlight on embedded stone
        pebbles.fillStyle(COLORS.ROCK_LIGHT, 0.25);
        pebbles.fillEllipse(px - pr * 0.25, py - pr * 0.25, pr * 1.1, pr * 0.6);
      }
    }

    // 7. Compacted mountain dirt/gravel roadbed along the top surface
    const road = this.scene.add.graphics();
    road.setDepth(DEPTH.TERRAIN_FG);

    // Road base fill (compacted earth/gravel)
    road.fillStyle(COLORS.ROAD_MID, 1);
    road.beginPath();
    road.moveTo(pts[0].x, pts[0].y - 1);
    for (let i = 0; i < pts.length; i++) road.lineTo(pts[i].x, pts[i].y - 1);
    for (let i = pts.length - 1; i >= 0; i--) road.lineTo(pts[i].x, pts[i].y + 11);
    road.closePath();
    road.fillPath();

    // Sunlit dusty upper road surface
    road.lineStyle(5, COLORS.ROAD_TOP, 0.95);
    road.beginPath();
    road.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) road.lineTo(pts[i].x, pts[i].y);
    road.strokePath();

    // Darker compacted tire rut / worn track line
    road.lineStyle(2.5, COLORS.ROAD_RUT, 0.65);
    road.beginPath();
    road.moveTo(pts[0].x, pts[0].y + 3);
    for (let i = 1; i < pts.length; i++) road.lineTo(pts[i].x, pts[i].y + 3);
    road.strokePath();

    // Fine surface gravel specks on the road
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const t = Math.random();
        const gx = p1.x + (p2.x - p1.x) * t;
        const gy = p1.y + (p2.y - p1.y) * t + Math.random() * 5;
        road.fillStyle(Math.random() > 0.5 ? COLORS.PEBBLE_LIGHT : COLORS.ROCK_DARK, 0.6);
        road.fillCircle(gx, gy, 0.9 + Math.random() * 1.1);
      }
    }

    // 8. Natural grassy verge & shoulder hugging the road edge
    const grassVerge = this.scene.add.graphics();
    grassVerge.setDepth(DEPTH.TERRAIN_FG + 0.5);

    grassVerge.fillStyle(COLORS.GRASS_DARK, 0.92);
    grassVerge.beginPath();
    grassVerge.moveTo(pts[0].x, pts[0].y + 5);
    for (let i = 0; i < pts.length; i++) {
      grassVerge.lineTo(pts[i].x, pts[i].y + 5 + Math.sin(i * 1.3) * 1.5);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      grassVerge.lineTo(pts[i].x, pts[i].y + 15 + Math.cos(i * 0.9) * 3);
    }
    grassVerge.closePath();
    grassVerge.fillPath();

    grassVerge.lineStyle(3.5, COLORS.GRASS_MID, 0.9);
    grassVerge.beginPath();
    grassVerge.moveTo(pts[0].x, pts[0].y + 5);
    for (let i = 1; i < pts.length; i++) {
      grassVerge.lineTo(pts[i].x, pts[i].y + 5 + Math.sin(i * 1.3) * 1.2);
    }
    grassVerge.strokePath();

    // 9. Realistic dense grass tufts, dry stalks & tiny wildflowers along the verge
    const blades = this.scene.add.graphics();
    blades.setDepth(DEPTH.TERRAIN_FG + 1);
    const bladeColors = [0x3d6627, 0x4f7c33, 0x628f40, 0x769f4e, 0x8a9c4b];
    const finishStart = this.terrainWidth - 350;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      // Keep the asphalt/gravel finish pad mostly clear of tall grass
      const isFinishPad = p1.x >= finishStart;
      const tuftCount = isFinishPad ? 1 : 6;

      for (let b = 0; b < tuftCount; b++) {
        const t = (b + Math.random() * 0.7) / tuftCount;
        const bx = p1.x + (p2.x - p1.x) * t;
        const by = p1.y + (p2.y - p1.y) * t + 3;
        const bh = 4 + Math.random() * 11;
        const lean = (Math.random() - 0.45) * 7;
        const color = bladeColors[Math.floor(Math.random() * bladeColors.length)];

        blades.lineStyle(1.3, color, 0.85);
        blades.beginPath();
        blades.moveTo(bx, by);
        blades.lineTo(bx + lean * 0.4, by - bh * 0.55);
        blades.lineTo(bx + lean, by - bh);
        blades.strokePath();

        // Occasional tiny wildflower / clover accent
        if (!isFinishPad && Math.random() > 0.93) {
          const flowerColor = Math.random() > 0.5 ? 0xf5e9a6 : 0xe8eef2;
          blades.fillStyle(flowerColor, 0.85);
          blades.fillCircle(bx + lean, by - bh - 1, 1.4);
        }
      }
    }

    // Physics segments (unchanged)
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

  // Obstacles
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

    // Soft ambient-occlusion ground shadow
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(x + 4, y + r * 0.5, r * 2.5, r * 0.75);

    // Generate irregular craggy polygon vertices
    const sides = 10;
    const verts = [];
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const variation = 0.72 + ((Math.sin(seed * 100 + i * 43) + 1) / 2) * 0.42;
      verts.push({
        x: x + Math.cos(ang) * r * variation,
        y: y + Math.sin(ang) * r * variation * 0.76
      });
    }

    // Deep shadow base
    g.fillStyle(COLORS.ROCK_SHADOW, 1);
    g.beginPath();
    g.moveTo(verts[0].x + 2, verts[0].y + 2);
    for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x + 2, verts[i].y + 2);
    g.closePath();
    g.fillPath();

    // Main granite/slate body
    g.fillStyle(COLORS.ROCK_DARK, 1);
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
    g.closePath();
    g.fillPath();

    // Sunlit upper-left facet
    g.fillStyle(COLORS.ROCK, 1);
    g.beginPath();
    g.moveTo(verts[0].x - 1, verts[0].y - 1);
    for (let i = 1; i < Math.ceil(verts.length * 0.55); i++) {
      g.lineTo(verts[i].x - 1, verts[i].y - 1);
    }
    g.lineTo(x + r * 0.1, y + r * 0.1);
    g.closePath();
    g.fillPath();

    // Crisp upper-left ridge highlight
    g.fillStyle(COLORS.ROCK_LIGHT, 0.55);
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    g.lineTo(verts[1].x, verts[1].y);
    g.lineTo(verts[2].x, verts[2].y);
    g.lineTo(x - r * 0.12, y - r * 0.08);
    g.closePath();
    g.fillPath();

    // Fracture / crack lines
    g.lineStyle(1.2, COLORS.ROCK_SHADOW, 0.5);
    g.lineBetween(x - r * 0.35, y - r * 0.05, x + r * 0.18, y + r * 0.25);
    g.lineBetween(x + r * 0.05, y - r * 0.25, x + r * 0.32, y + r * 0.14);

    // Mineral speckles
    g.fillStyle(0xb0b7bd, 0.35);
    g.fillCircle(x - r * 0.28, y - r * 0.15, 1.3);
    g.fillCircle(x + r * 0.1, y - r * 0.22, 1.1);
    g.fillStyle(0x26292c, 0.35);
    g.fillCircle(x + r * 0.22, y + r * 0.18, 1.4);

    // Natural moss & lichen clinging to top crevices
    g.fillStyle(COLORS.MOSS, 0.65);
    g.fillEllipse(x - r * 0.18, y - r * 0.44, r * 0.42, r * 0.16);
    g.fillEllipse(x + r * 0.16, y - r * 0.38, r * 0.28, r * 0.13);

    g.setDepth(DEPTH.OBSTACLES);

    this.scene.matter.add.circle(x, y, r * 0.85, {
      isStatic: true,
      friction: 0.6,
      restitution: 0.2,
      label: 'obstacle'
    });
  }

  /* ── Finish Zone — realistic mountain rally checkpoint ── */
  addFinishZone() {
    const lastPt = this.points[this.points.length - 1];
    const fy = lastPt.y;
    const fxStart = this.terrainWidth - 350;
    const fxEnd = this.terrainWidth;
    const flagX = this.terrainWidth - 180;

    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OBSTACLES + 1);

    // Weathered asphalt/concrete finish pad
    g.fillStyle(0x3a4045, 1);
    g.fillRect(fxStart, fy - 4, fxEnd - fxStart, 13);
    g.fillStyle(0x52585e, 0.7);
    g.fillRect(fxStart, fy - 4, fxEnd - fxStart, 4);

    // Checkered ground strip
    const stripeW = 25;
    for (let sx = fxStart; sx < fxEnd; sx += stripeW) {
      const idx = Math.floor((sx - fxStart) / stripeW);
      g.fillStyle(idx % 2 === 0 ? 0xe5e7eb : 0x26292c, 0.92);
      g.fillRect(sx, fy - 6, stripeW, 5);
    }

    // End barrier (steel & timber guard wall)
    g.fillStyle(0x4a5056, 1);
    g.fillRect(fxEnd - 22, fy - 102, 22, 102);
    g.fillStyle(0x6b7278, 1);
    g.fillRect(fxEnd - 20, fy - 100, 6, 98);
    // Hazard stripes
    for (let sy = fy - 100; sy < fy; sy += 20) {
      const sIdx = Math.floor((sy - (fy - 100)) / 20);
      g.fillStyle(sIdx % 2 === 0 ? 0xd4a017 : 0x222528, 1);
      g.fillRect(fxEnd - 22, sy, 22, 10);
    }

    // End wall physics
    this.scene.matter.add.rectangle(fxEnd - 10, fy - 50, 20, 100, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.3,
      label: 'wall'
    });

    // Metallic flag pole with shading
    g.fillStyle(0x61676c, 1);
    g.fillRect(flagX - 3, fy - 140, 6, 140);
    g.fillStyle(0xb0b7bd, 1);
    g.fillRect(flagX - 2, fy - 140, 2, 140);

    // Pole finial & concrete base
    g.fillStyle(0xc9a227, 1);
    g.fillCircle(flagX, fy - 142, 5.5);
    g.fillStyle(0x4b5156, 1);
    g.fillRoundedRect(flagX - 18, fy - 8, 36, 10, 3);

    // Checkered rally flag
    const flagW = 56;
    const flagH = 36;
    const rows = 4;
    const cols = 5;
    const cellW = flagW / cols;
    const cellH = flagH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWhite = (r + c) % 2 === 0;
        g.fillStyle(isWhite ? 0xf1f3f5 : 0xb71c1c, 1);
        g.fillRect(flagX + 4 + c * cellW, fy - 138 + r * cellH, cellW, cellH);
      }
    }
    g.lineStyle(1.5, 0x26292c, 0.9);
    g.strokeRect(flagX + 4, fy - 138, flagW, flagH);

    // Checkpoint pennants
    this.drawBanner(g, fxStart + 30, fy, 0xc62828);
    this.drawBanner(g, fxStart + 80, fy, 0xd4a017);
    this.drawBanner(g, fxEnd - 60, fy, 0x2e7d32);
    this.drawBanner(g, fxEnd - 110, fy, 0x1565c0);

    // Finish sign
    const finishText = this.scene.add.text(flagX, fy - 158, 'FINISH', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f4f6f8',
      stroke: '#1e2226',
      strokeThickness: 4,
    });
    finishText.setOrigin(0.5, 1);
    finishText.setDepth(DEPTH.OBSTACLES + 2);

    // Checkpoint arch
    const archX = fxStart + 15;
    g.fillStyle(0x52585e, 1);
    g.fillRect(archX - 4, fy - 90, 8, 90);
    g.fillRect(archX + 56, fy - 90, 8, 90);
    g.fillStyle(0x9aa1a8, 0.7);
    g.fillRect(archX - 3, fy - 90, 2, 90);
    g.fillRect(archX + 57, fy - 90, 2, 90);

    for (let ci = 0; ci < 7; ci++) {
      g.fillStyle(ci % 2 === 0 ? 0xf1f3f5 : 0x222528, 1);
      g.fillRect(archX - 6 + ci * 10, fy - 95, 10, 10);
    }

    // Victory sensor
    this.finishSensor = this.scene.matter.add.rectangle(flagX, fy - 60, 80, 180, {
      isStatic: true,
      isSensor: true,
      label: 'finish'
    });
  }

  drawBanner(g, x, groundY, color) {
    g.fillStyle(0x61676c, 1);
    g.fillRect(x - 2, groundY - 80, 4, 80);
    g.fillStyle(color, 0.9);
    g.fillTriangle(x + 2, groundY - 78, x + 2, groundY - 55, x + 22, groundY - 66);
    g.fillStyle(0xd0d5da, 0.9);
    g.fillCircle(x, groundY - 82, 2.5);
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
