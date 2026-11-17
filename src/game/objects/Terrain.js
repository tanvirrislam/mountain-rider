import Phaser from 'phaser';
import { DEPTH, COLORS } from '../utils/constants';
import {
  createRng,
  valueNoise2D,
  fbm2D,
  getOrCreateCanvasTexture,
} from '../utils/scenery';

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

  // Generate height-map points (unchanged for identical physics & gameplay)
  generateTerrain() {
    const startY = 500;
    const finishZoneStart = this.terrainWidth - 500;

    for (let x = 0; x <= this.terrainWidth; x += this.segmentLength) {
      const hillY = startY
        + Math.sin(x / 350) * 60
        + Math.sin(x / 180) * 30
        + Math.cos(x / 90) * 10
        + (Math.sin(x * 0.37) * 1.8);

      let y;

      if (x < 400) {
        y = startY;
      } else if (x < 800) {
        const t = (x - 400) / 400;
        const ease = t * t * (3 - 2 * t);
        y = startY + (hillY - startY) * ease;
      } else if (x >= finishZoneStart) {
        const lastHillY = this.points.length > 0 ? this.points[this.points.length - 1].y : startY;
        if (x === finishZoneStart) {
          this._finishBlendStart = lastHillY;
        }
        const blendStart = this._finishBlendStart || startY;
        const t = (x - finishZoneStart) / 200;
        const ease = Math.min(1, t * t * (3 - 2 * t));
        y = blendStart + (startY - blendStart) * ease;
      } else {
        y = hillY;
      }

      y = Phaser.Math.Clamp(y, 300, 620);
      this.points.push({ x, y });
    }
  }

  /**
   * Renders ultra-realistic 3D-shaded road, geological rock/soil cliff cutaway,
   * roadside guardrails, and lush meadow grass + wildflowers with zero seams.
   */
  drawTerrain() {
    const pts = this.points;
    const bottom = 1500;

    // 1. Deep abyssal bedrock fill overlapping well inside the canvas slices
    const deepBedrock = this.scene.add.graphics();
    deepBedrock.fillStyle(0x14100d, 1);
    deepBedrock.beginPath();
    deepBedrock.moveTo(pts[0].x, pts[0].y + 90);
    for (const p of pts) deepBedrock.lineTo(p.x, p.y + 90);
    deepBedrock.lineTo(this.terrainWidth, bottom);
    deepBedrock.lineTo(0, bottom);
    deepBedrock.closePath();
    deepBedrock.fillPath();
    deepBedrock.setDepth(DEPTH.TERRAIN_BG);

    // 2. Per-pixel 3D normal-lit geological cliff + gravel/asphalt roadbed slices
    const sliceW = 1900;
    const minY = 270;
    const maxY = 860;
    const sliceH = maxY - minY;

    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const startX = sIdx * sliceW;
      const key = `terrain-ultra-slice-v3-${sIdx}`;

      getOrCreateCanvasTexture(this.scene, key, sliceW, sliceH, (ctx, w, h) => {
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        const surfY = new Float32Array(w + 2);
        for (let lx = 0; lx <= w + 1; lx++) {
          surfY[lx] = this.getHeightAtX(startX + lx) - minY;
        }

        // Upper-left sunlight vector
        const sunX = -0.62;
        const sunY = -0.58;
        const sunZ = 0.53;

        for (let lx = 0; lx < w; lx++) {
          const wx = startX + lx;
          const topY = surfY[lx];
          const topYNext = surfY[lx + 1];
          const roadSlope = topYNext - topY;
          const yStart = Math.max(0, Math.floor(topY - 2));

          for (let ly = yStart; ly < h; ly++) {
            const depthBelowRoad = ly - topY;
            if (depthBelowRoad < -1.5) continue;

            const idx = (ly * w + lx) * 4;
            const edgeAlpha = depthBelowRoad < 0 ? Math.max(0, 1 + depthBelowRoad / 1.5) : 1;

            const nMacro = fbm2D(wx * 0.018, (ly + minY) * 0.022, 3, 401);
            const nMed = valueNoise2D(wx * 0.08, (ly + minY) * 0.09, 509);
            const nFine = valueNoise2D(wx * 0.35, (ly + minY) * 0.35, 613);

            // Compute road surface color (compacted mountain macadam/gravel with tire ruts)
            const slopeShade = Math.max(0.76, Math.min(1.18, 1 - roadSlope * 0.22));
            const crown = Math.sin(Math.min(1, Math.max(0, depthBelowRoad / 12)) * Math.PI);
            const tireRut = (depthBelowRoad > 2.5 && depthBelowRoad < 6.5) ? 0.84 : 1.0;
            const gravelSpeck = (nFine - 0.5) * 32 + (nMed - 0.5) * 18;
            const roadR = (108 + 22 * crown + gravelSpeck) * tireRut * slopeShade;
            const roadG = (94 + 18 * crown + gravelSpeck * 0.9) * tireRut * slopeShade;
            const roadB = (80 + 14 * crown + gravelSpeck * 0.8) * tireRut * slopeShade;

            // Compute grassy verge & humus topsoil color
            const grassEdgeDepth = 16 + (nMed - 0.5) * 5;
            const grassFactor = Math.max(0, Math.min(1, 1 - Math.abs(depthBelowRoad - 13) / 7 + (nFine - 0.5) * 0.3));
            const soilShade = 0.65 + nMed * 0.45 + (nFine - 0.5) * 0.25;
            const grassR = (44 + nFine * 30) * slopeShade;
            const grassG = (80 + nFine * 42) * slopeShade;
            const grassB = (28 + nFine * 18);
            const humusR = 66 * soilShade;
            const humusG = 47 * soilShade;
            const humusB = 33 * soilShade;
            const vergeR = humusR * (1 - grassFactor) + grassR * grassFactor;
            const vergeG = humusG * (1 - grassFactor) + grassG * grassFactor;
            const vergeB = humusB * (1 - grassFactor) + grassB * grassFactor;

            // Compute 3D normal-mapped cliff rock & loam color
            const strataWave = Math.sin((ly + minY) * 0.11 + nMacro * 7 + wx * 0.008);
            const nMacroNextX = fbm2D((wx + 2) * 0.018, (ly + minY) * 0.022, 3, 401);
            const nMacroNextY = fbm2D(wx * 0.018, (ly + 2 + minY) * 0.022, 3, 401);
            const dHdx = (nMacroNextX - nMacro) * 16 + (nFine - 0.5) * 0.9;
            const dHdy = (nMacroNextY - nMacro) * 14 + strataWave * 0.45;
            const invLen = 1 / Math.sqrt(dHdx * dHdx + dHdy * dHdy + 1);
            const nx = dHdx * invLen;
            const ny = dHdy * invLen;
            const nz = invLen;

            const diff = Math.max(0.14, nx * sunX + ny * sunY + nz * sunZ);
            const ao = Math.min(1, Math.max(0.2, (depthBelowRoad - 16) / 28)) * 0.35 + 0.65;
            const deepFade = Math.max(0.16, 1 - depthBelowRoad / 360);
            const light = diff * ao * deepFade * (0.85 + nFine * 0.3);

            const rockBlend = Math.min(1, Math.max(0, (depthBelowRoad - 22) / 52));
            let cliffR = (114 * (1 - rockBlend) + 102 * rockBlend + strataWave * 10) * light;
            let cliffG = (88 * (1 - rockBlend) + 96 * rockBlend + strataWave * 8) * light;
            let cliffB = (66 * (1 - rockBlend) + 92 * rockBlend + strataWave * 6) * light;

            if (ny < -0.18 && depthBelowRoad > 24 && depthBelowRoad < 130) {
              const mossAmt = Math.min(0.75, (-ny - 0.18) * 2.2 * (1 - depthBelowRoad / 130));
              cliffR = cliffR * (1 - mossAmt) + 52 * light * 1.3 * mossAmt;
              cliffG = cliffG * (1 - mossAmt) + 86 * light * 1.3 * mossAmt;
              cliffB = cliffB * (1 - mossAmt) + 36 * light * 1.3 * mossAmt;
            }

            // Smooth organic blending between Road -> Grassy Verge -> Cliff Wall (zero hard horizontal lines)
            let r;
            let g;
            let b;
            const roadEdge = 9.5 + (nFine - 0.5) * 2.2;
            const cliffEdge = 24 + (nMacro - 0.5) * 9;

            if (depthBelowRoad < roadEdge) {
              const t = Math.max(0, (depthBelowRoad - (roadEdge - 3)) / 3);
              const s = t * t * (3 - 2 * t);
              r = roadR * (1 - s) + vergeR * s;
              g = roadG * (1 - s) + vergeG * s;
              b = roadB * (1 - s) + vergeB * s;
            } else if (depthBelowRoad < cliffEdge) {
              const t = Math.max(0, (depthBelowRoad - grassEdgeDepth) / Math.max(2, cliffEdge - grassEdgeDepth));
              const s = Math.min(1, t * t * (3 - 2 * t));
              r = vergeR * (1 - s) + cliffR * s;
              g = vergeG * (1 - s) + cliffG * s;
              b = vergeB * (1 - s) + cliffB * s;
            } else {
              r = cliffR;
              g = cliffG;
              b = cliffB;
            }

            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
            data[idx + 3] = Math.round(edgeAlpha * 255);
          }
        }

        ctx.putImageData(imgData, 0, 0);
      });

      const sliceImg = this.scene.add.image(startX + sliceW / 2, minY + sliceH / 2, key);
      sliceImg.setDepth(DEPTH.TERRAIN_FG);
    }

    // 3. Roadside Timber Posts & Galvanized W-Beam Guardrails on hilly sections
    this.drawRoadsideGuardrails();

    // 4. Multi-layered botanical grass blades, ferns & wildflowers along the road shoulder
    this.drawRealisticGrassAndFlora();

    // 5. Physics segments (unchanged)
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

  /**
   * Draws realistic weathered timber posts and galvanized steel guardrails firmly anchored into the ground.
   */
  drawRoadsideGuardrails() {
    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.TERRAIN_BG - 0.5);

    const sections = [
      { startX: 520, endX: 1040 },
      { startX: 1480, endX: 1880 },
      { startX: 2220, endX: 2520 },
      { startX: 2800, endX: 3240 },
    ];

    for (const sec of sections) {
      const postStep = 48;
      const postPoints = [];
      for (let x = sec.startX; x <= sec.endX; x += postStep) {
        const y = this.getHeightAtX(x);
        postPoints.push({ x, y });

        // Weathered timber post extending deep into the ground so it never floats
        g.fillStyle(0x2b1e16, 1);
        g.fillRect(x - 3, y - 22, 6, 36);
        g.fillStyle(0x543d2c, 1);
        g.fillRect(x - 3, y - 22, 2.5, 36);

        // Reflective red roadside delineator tab on post
        g.fillStyle(0xd32f2f, 0.9);
        g.fillRect(x - 1.5, y - 19, 3, 4);
      }

      // Corrugated galvanized steel W-beam rail connecting posts
      for (let i = 0; i < postPoints.length - 1; i++) {
        const p1 = postPoints[i];
        const p2 = postPoints[i + 1];

        g.lineStyle(6, 0x5a626a, 1);
        g.lineBetween(p1.x, p1.y - 13, p2.x, p2.y - 13);

        g.lineStyle(2, 0xb8c0c8, 0.9);
        g.lineBetween(p1.x, p1.y - 15, p2.x, p2.y - 15);

        g.lineStyle(1.5, 0x2f353b, 0.85);
        g.lineBetween(p1.x, p1.y - 13, p2.x, p2.y - 13);
      }
    }
  }

  /**
   * Draws realistic multi-toned grass tufts, seed stalks, and wildflowers along the road verge.
   */
  drawRealisticGrassAndFlora() {
    const pts = this.points;
    const rng = createRng(901);
    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.TERRAIN_FG + 1);

    const finishStart = this.terrainWidth - 350;
    const rootColors = [0x1e3614, 0x26421a, 0x2f4f21];
    const tipColors = [0x4c7832, 0x5e8c3e, 0x739e4c, 0x8ca854];

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const isFinishPad = p1.x >= finishStart;
      const count = isFinishPad ? 2 : 9;

      for (let b = 0; b < count; b++) {
        const t = (b + rng() * 0.8) / count;
        const bx = p1.x + (p2.x - p1.x) * t;
        const by = p1.y + (p2.y - p1.y) * t + 11 + rng() * 3;
        const bh = 6 + rng() * 12;
        const lean = (rng() - 0.42) * 8;

        const rCol = rootColors[Math.floor(rng() * rootColors.length)];
        const tCol = tipColors[Math.floor(rng() * tipColors.length)];

        // Lower shaded stem
        g.lineStyle(1.6, rCol, 0.9);
        g.lineBetween(bx, by, bx + lean * 0.45, by - bh * 0.55);

        // Sunlit tapered upper blade
        g.lineStyle(1.1, tCol, 0.88);
        g.lineBetween(bx + lean * 0.45, by - bh * 0.55, bx + lean, by - bh);

        // Occasional alpine wildflowers (dandelions, white mountain daisies, purple lupines)
        if (!isFinishPad && rng() > 0.94) {
          const fRoll = rng();
          const fCol = fRoll > 0.6 ? 0xf7d84a : (fRoll > 0.25 ? 0xf2f5f7 : 0x9b7ede);
          g.fillStyle(fCol, 0.92);
          g.fillCircle(bx + lean, by - bh - 1, 1.6);
        }
      }
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

  /**
   * Renders a photorealistic 3D-shaded granite boulder onto a canvas texture
   * with directional lighting, granite crystalline speckles, fractures, and moss.
   */
  drawRock(x, y, r, seed) {
    const pad = 16;
    const size = Math.ceil((r + pad) * 2);
    const key = `boulder-ultra-v3-${seed}-${r}`;

    getOrCreateCanvasTexture(this.scene, key, size, size, (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;

      // 1. Soft ambient-occlusion ground shadow
      const shdGrd = ctx.createRadialGradient(cx + 3, cy + r * 0.52, 2, cx + 3, cy + r * 0.52, r * 1.35);
      shdGrd.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      shdGrd.addColorStop(0.6, 'rgba(0, 0, 0, 0.22)');
      shdGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shdGrd;
      ctx.save();
      ctx.translate(cx + 3, cy + r * 0.52);
      ctx.scale(1.35, 0.42);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Craggy angular boulder silhouette
      const sides = 12;
      const verts = [];
      for (let i = 0; i < sides; i++) {
        const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const variation = 0.78 + ((Math.sin(seed * 97 + i * 41) + 1) / 2) * 0.34;
        verts.push({
          x: cx + Math.cos(ang) * r * variation,
          y: cy + Math.sin(ang) * r * variation * 0.82,
        });
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.clip();

      // 3D directional sphere/facet lighting gradient
      const rockGrd = ctx.createRadialGradient(
        cx - r * 0.38,
        cy - r * 0.38,
        r * 0.1,
        cx,
        cy,
        r * 1.25
      );
      rockGrd.addColorStop(0.0, '#a8b0b8');
      rockGrd.addColorStop(0.35, '#767e85');
      rockGrd.addColorStop(0.75, '#495056');
      rockGrd.addColorStop(1.0, '#272b2f');
      ctx.fillStyle = rockGrd;
      ctx.fillRect(0, 0, w, h);

      // Sharp planar rock facets
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      ctx.lineTo(verts[1].x, verts[1].y);
      ctx.lineTo(cx - r * 0.1, cy + r * 0.05);
      ctx.lineTo(verts[10].x, verts[10].y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.1, cy + r * 0.05);
      ctx.lineTo(verts[3].x, verts[3].y);
      ctx.lineTo(verts[6].x, verts[6].y);
      ctx.lineTo(verts[8].x, verts[8].y);
      ctx.closePath();
      ctx.fill();

      // Crystalline granite grain speckles
      const rng = createRng(seed * 131 + 17);
      for (let s = 0; s < 65; s++) {
        const sx = cx + (rng() - 0.5) * r * 1.9;
        const sy = cy + (rng() - 0.5) * r * 1.6;
        ctx.fillStyle = rng() > 0.5 ? 'rgba(230,235,240,0.22)' : 'rgba(20,24,28,0.28)';
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Deep fracture crevice
      ctx.strokeStyle = 'rgba(18, 22, 26, 0.65)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45, cy - r * 0.1);
      ctx.lineTo(cx - r * 0.05, cy + r * 0.08);
      ctx.lineTo(cx + r * 0.35, cy + r * 0.25);
      ctx.stroke();

      // Velvety green moss on upper crest
      const mossGrd = ctx.createLinearGradient(0, cy - r, 0, cy - r * 0.2);
      mossGrd.addColorStop(0, 'rgba(95, 138, 52, 0.85)');
      mossGrd.addColorStop(1, 'rgba(48, 76, 26, 0.0)');
      ctx.fillStyle = mossGrd;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 0.75);

      ctx.restore();
    });

    const rockImg = this.scene.add.image(x, y, key);
    rockImg.setDepth(DEPTH.OBSTACLES);

    this.scene.matter.add.circle(x, y, r * 0.85, {
      isStatic: true,
      friction: 0.6,
      restitution: 0.2,
      label: 'obstacle'
    });
  }

  /* ── Finish Zone — realistic mountain rally stage finish gantry & tarmac ── */
  addFinishZone() {
    const lastPt = this.points[this.points.length - 1];
    const fy = lastPt.y;
    const fxStart = this.terrainWidth - 350;
    const fxEnd = this.terrainWidth;
    const flagX = this.terrainWidth - 180;

    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OBSTACLES + 1);

    // 1. Weathered tarmac rally finish pad with FIA red/white curbs
    g.fillStyle(0x282c30, 1);
    g.fillRect(fxStart, fy - 3, fxEnd - fxStart, 14);
    g.fillStyle(0x3b4147, 0.8);
    g.fillRect(fxStart, fy - 3, fxEnd - fxStart, 3);

    // Tire skid marks on tarmac
    g.fillStyle(0x141618, 0.45);
    g.fillRect(fxStart + 20, fy - 2, 190, 2.5);

    // Red & white painted rally curbing
    const stripeW = 22;
    for (let sx = fxStart; sx < fxEnd - 24; sx += stripeW) {
      const idx = Math.floor((sx - fxStart) / stripeW);
      g.fillStyle(idx % 2 === 0 ? 0xe8ecef : 0xc62828, 0.95);
      g.fillRect(sx, fy - 5, stripeW - 1, 4);
    }

    // 2. Concrete Jersey barrier & reflective hazard chevron wall at end
    g.fillStyle(0x52585e, 1);
    g.fillRect(fxEnd - 24, fy - 102, 24, 102);
    g.fillStyle(0x7c848c, 1);
    g.fillRect(fxEnd - 22, fy - 100, 5, 98);
    for (let sy = fy - 100; sy < fy; sy += 20) {
      const sIdx = Math.floor((sy - (fy - 100)) / 20);
      g.fillStyle(sIdx % 2 === 0 ? 0xe0a816 : 0x1c1f22, 1);
      g.fillRect(fxEnd - 24, sy, 24, 10);
    }

    // End wall physics (unchanged)
    this.scene.matter.add.rectangle(fxEnd - 10, fy - 50, 20, 100, {
      isStatic: true,
      friction: 0.5,
      restitution: 0.3,
      label: 'wall'
    });

    // 3. Brushed steel flagpole & shaded waving checkered rally flag
    g.fillStyle(0x4b5258, 1);
    g.fillRect(flagX - 3, fy - 144, 6, 144);
    g.fillStyle(0xc0c7ce, 0.9);
    g.fillRect(flagX - 2, fy - 144, 2, 144);
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(flagX, fy - 146, 5);
    g.fillStyle(0x373c40, 1);
    g.fillRoundedRect(flagX - 18, fy - 8, 36, 10, 3);

    const flagW = 58;
    const flagH = 36;
    const rows = 4;
    const cols = 6;
    const cellW = flagW / cols;
    const cellH = flagH / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const waveY = Math.sin(c * 0.9) * 2.2;
        const isWhite = (r + c) % 2 === 0;
        const shade = c % 2 === 1 ? 0.9 : 1.0;
        const baseColor = isWhite
          ? Phaser.Display.Color.GetColor(242 * shade, 244 * shade, 246 * shade)
          : Phaser.Display.Color.GetColor(185 * shade, 28 * shade, 28 * shade);
        g.fillStyle(baseColor, 1);
        g.fillRect(flagX + 3 + c * cellW, fy - 140 + r * cellH + waveY, cellW + 0.5, cellH + 0.5);
      }
    }

    // 4. Rally stage steel truss gantry at finish entrance
    const archX = fxStart + 18;
    g.fillStyle(0x3a4046, 1);
    g.fillRect(archX - 5, fy - 96, 9, 96);
    g.fillRect(archX + 58, fy - 96, 9, 96);
    g.fillStyle(0x8c969e, 0.8);
    g.fillRect(archX - 3, fy - 96, 2.5, 96);
    g.fillRect(archX + 60, fy - 96, 2.5, 96);

    // Overhead gantry banner
    g.fillStyle(0x1e2226, 1);
    g.fillRect(archX - 8, fy - 104, 78, 14);
    for (let ci = 0; ci < 7; ci++) {
      g.fillStyle(ci % 2 === 0 ? 0xf1f3f5 : 0xc62828, 1);
      g.fillRect(archX - 5 + ci * 10.2, fy - 101, 9.5, 8);
    }

    // Stage marker flags
    this.drawBanner(g, fxStart + 88, fy, COLORS.BUGGY_BODY);
    this.drawBanner(g, fxEnd - 68, fy, 0xd4a017);

    const finishText = this.scene.add.text(flagX, fy - 158, 'STAGE FINISH', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
      stroke: '#16191d',
      strokeThickness: 4,
    });
    finishText.setOrigin(0.5, 1);
    finishText.setDepth(DEPTH.OBSTACLES + 2);

    // Victory sensor (unchanged)
    this.finishSensor = this.scene.matter.add.rectangle(flagX, fy - 60, 80, 180, {
      isStatic: true,
      isSensor: true,
      label: 'finish'
    });
  }

  drawBanner(g, x, groundY, color) {
    g.fillStyle(0x4b5258, 1);
    g.fillRect(x - 1.5, groundY - 76, 3, 76);
    g.fillStyle(color, 0.92);
    g.fillTriangle(x + 1.5, groundY - 74, x + 1.5, groundY - 52, x + 22, groundY - 63);
    g.fillStyle(0xd0d5da, 0.9);
    g.fillCircle(x, groundY - 77, 2.2);
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
