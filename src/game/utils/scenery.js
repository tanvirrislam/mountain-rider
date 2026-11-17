import { DEPTH, COLORS } from './constants';

/**
 * Deterministic pseudo-random generator for consistent procedural scenery.
 */
function createRng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Draws an atmospheric multi-stop sky with a soft upper-left sun glow.
 */
export function drawRealisticSky(scene, width, height, keyPrefix = 'sky') {
  const skyKey = `${keyPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const skyTex = scene.textures.createCanvas(skyKey, width, height);
  if (!skyTex) return null;

  const ctx = skyTex.getContext();

  // Vertical atmospheric gradient
  const grd = ctx.createLinearGradient(0, 0, 0, height);
  grd.addColorStop(0, COLORS.SKY_TOP);
  grd.addColorStop(0.38, COLORS.SKY_MID);
  grd.addColorStop(0.72, COLORS.SKY_LOWER);
  grd.addColorStop(1, COLORS.SKY_BOTTOM);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  // Subtle warm atmospheric haze near the horizon
  const hazeGrd = ctx.createLinearGradient(0, height * 0.55, 0, height);
  hazeGrd.addColorStop(0, 'rgba(255, 244, 224, 0)');
  hazeGrd.addColorStop(1, 'rgba(255, 240, 218, 0.24)');
  ctx.fillStyle = hazeGrd;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  // Soft solar corona in upper-left (consistent with upper-left sunlight)
  const sunX = width * 0.16;
  const sunY = height * 0.18;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 260);
  sunGlow.addColorStop(0, 'rgba(255, 253, 240, 0.92)');
  sunGlow.addColorStop(0.12, 'rgba(255, 246, 214, 0.48)');
  sunGlow.addColorStop(0.4, 'rgba(255, 232, 185, 0.14)');
  sunGlow.addColorStop(1, 'rgba(255, 232, 185, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  // Crisp sun core
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 252, 235, 0.85)';
  ctx.fill();

  skyTex.refresh();
  const sky = scene.add.image(width / 2, height / 2, skyKey);
  sky.setScrollFactor(0);
  sky.setDepth(DEPTH.SKY);
  return sky;
}

/**
 * Ridged noise helper for sharp, natural alpine mountain silhouettes.
 */
function mountainRidgeHeight(x, seedOffset, amplitude) {
  const n1 = 1 - Math.abs(Math.sin((x + seedOffset) / 260));
  const n2 = 1 - Math.abs(Math.sin((x + seedOffset * 1.7) / 130 + 1.1));
  const n3 = Math.sin((x + seedOffset * 0.5) / 420) * 0.5 + 0.5;
  const crag = (1 - Math.abs(Math.sin((x + seedOffset * 2.3) / 48))) * 0.14;
  const combined = n1 * 0.55 + n2 * 0.25 + n3 * 0.2 + crag;
  return -combined * amplitude;
}

/**
 * Draws a layered, sunlit-and-shaded mountain range with optional snowcaps and valley mist.
 */
export function drawRealisticMountainRange(scene, {
  totalW = 6000,
  baseY = 360,
  amplitude = 180,
  scrollFactor = 0.08,
  depth = DEPTH.MOUNTAINS_FAR,
  bodyColor = COLORS.MOUNTAIN_FAR,
  shadowColor = COLORS.MOUNTAIN_FAR_SHADOW,
  hasSnow = true,
  snowThreshold = 0.45,
  seedOffset = 0,
  mistAlpha = 0.22,
} = {}) {
  const g = scene.add.graphics();
  g.setScrollFactor(scrollFactor);
  g.setDepth(depth);

  const step = 12;
  const bottomY = baseY + amplitude + 260;
  const pts = [];

  for (let x = -200; x <= totalW; x += step) {
    const offset = mountainRidgeHeight(x, seedOffset, amplitude);
    pts.push({ x, y: baseY + offset });
  }

  // Main sunlit mountain mass
  g.fillStyle(bodyColor, 1);
  g.beginPath();
  g.moveTo(-200, bottomY);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.lineTo(totalW, bottomY);
  g.closePath();
  g.fillPath();

  // Right-facing shaded slopes (sunlight from upper-left)
  g.fillStyle(shadowColor, 0.78);
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    // Descending slope (going down to the right) is in shadow
    if (curr.y > prev.y) {
      let endIdx = i;
      while (endIdx < pts.length - 1 && pts[endIdx + 1].y >= pts[endIdx].y) {
        endIdx++;
      }
      const ridgeStart = pts[i - 1];
      const valleyEnd = pts[endIdx];
      const ridgeDrop = Math.max(40, (valleyEnd.y - ridgeStart.y) * 1.45 + 50);

      g.beginPath();
      g.moveTo(ridgeStart.x, ridgeStart.y);
      for (let j = i; j <= endIdx; j++) {
        g.lineTo(pts[j].x, pts[j].y);
      }
      g.lineTo(valleyEnd.x - (valleyEnd.x - ridgeStart.x) * 0.15, valleyEnd.y + ridgeDrop);
      g.lineTo(ridgeStart.x + 8, ridgeStart.y + ridgeDrop * 0.65);
      g.closePath();
      g.fillPath();

      i = endIdx;
    }
  }

  // Subtle craggy rock striations
  g.lineStyle(1.5, shadowColor, 0.3);
  for (let i = 2; i < pts.length - 2; i += 4) {
    const p = pts[i];
    const h = baseY - p.y;
    if (h > amplitude * 0.25) {
      g.lineBetween(p.x, p.y + 4, p.x + 14, p.y + 28 + (h * 0.18));
    }
  }

  // Alpine snowcaps on high peaks
  if (hasSnow) {
    const snowLineY = baseY - amplitude * snowThreshold;
    for (let i = 1; i < pts.length - 1; i++) {
      if (pts[i].y < snowLineY) {
        const startIdx = Math.max(0, i - 1);
        let endIdx = i;
        while (endIdx < pts.length - 1 && pts[endIdx].y < snowLineY) {
          endIdx++;
        }

        // Find peak within this snow segment
        let peakIdx = startIdx;
        for (let k = startIdx; k <= endIdx; k++) {
          if (pts[k].y < pts[peakIdx].y) peakIdx = k;
        }

        // Sunlit snow (left slope up to peak)
        g.fillStyle(COLORS.SNOW, 0.94);
        g.beginPath();
        g.moveTo(pts[startIdx].x, snowLineY);
        for (let k = startIdx; k <= peakIdx; k++) {
          g.lineTo(pts[k].x, pts[k].y);
        }
        // Jagged snowline return
        const midX = pts[peakIdx].x + 6;
        g.lineTo(midX, snowLineY + 10);
        g.lineTo((pts[startIdx].x + midX) * 0.5, snowLineY - 5);
        g.closePath();
        g.fillPath();

        // Shaded snow (right slope from peak)
        g.fillStyle(COLORS.SNOW_SHADOW, 0.85);
        g.beginPath();
        g.moveTo(pts[peakIdx].x, pts[peakIdx].y);
        for (let k = peakIdx + 1; k <= endIdx; k++) {
          g.lineTo(pts[k].x, pts[k].y);
        }
        g.lineTo(pts[endIdx].x, snowLineY + 6);
        g.lineTo(midX, snowLineY + 10);
        g.closePath();
        g.fillPath();

        i = endIdx;
      }
    }
  }

  // Atmospheric valley mist at the base for aerial perspective
  if (mistAlpha > 0) {
    const mistStart = baseY - amplitude * 0.15;
    for (let m = 0; m < 4; m++) {
      const bandY = mistStart + m * 24;
      const alpha = mistAlpha * (m + 1) * 0.28;
      g.fillStyle(COLORS.MIST, Math.min(0.45, alpha));
      g.fillRect(-200, bandY, totalW + 200, 48);
    }
  }

  return g;
}

/**
 * Draws a single realistic conifer (pine/spruce) with organic drooping boughs and bark trunk.
 */
function drawRealisticPineTree(g, cx, baseY, height, width, palette, rng) {
  const trunkW = Math.max(4, width * 0.15);
  const trunkH = height * 0.34;

  // Trunk (dark bark + sunlit left edge)
  g.fillStyle(0x2d1d14, 1);
  g.fillTriangle(
    cx - trunkW * 0.65, baseY + 2,
    cx - trunkW * 0.18, baseY - trunkH,
    cx + trunkW * 0.65, baseY + 2
  );
  g.fillStyle(0x4b3324, 0.85);
  g.fillTriangle(
    cx - trunkW * 0.6, baseY + 2,
    cx - trunkW * 0.18, baseY - trunkH,
    cx, baseY + 2
  );

  // Layered organic boughs from bottom to top
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const progress = t / (tiers - 1); // 0 = bottom, 1 = top
    const tierBaseY = baseY - height * (0.14 + progress * 0.66);
    const tierTopY = tierBaseY - height * (0.34 - progress * 0.1);
    const halfW = width * (0.56 - progress * 0.36) * (0.9 + rng() * 0.2);
    const droop = 4 + (1 - progress) * 6;

    // Shadowed full bough
    g.fillStyle(palette.dark, 1);
    g.beginPath();
    g.moveTo(cx, tierTopY);
    g.lineTo(cx + halfW * 0.55, tierBaseY - droop * 0.3);
    g.lineTo(cx + halfW, tierBaseY + droop);
    g.lineTo(cx + halfW * 0.45, tierBaseY + droop * 0.4);
    g.lineTo(cx, tierBaseY + droop * 0.7);
    g.lineTo(cx - halfW * 0.45, tierBaseY + droop * 0.4);
    g.lineTo(cx - halfW, tierBaseY + droop);
    g.lineTo(cx - halfW * 0.55, tierBaseY - droop * 0.3);
    g.closePath();
    g.fillPath();

    // Mid-tone foliage body
    g.fillStyle(palette.mid, 0.95);
    g.beginPath();
    g.moveTo(cx, tierTopY + 1);
    g.lineTo(cx + halfW * 0.4, tierBaseY - droop * 0.1);
    g.lineTo(cx + halfW * 0.72, tierBaseY + droop * 0.65);
    g.lineTo(cx, tierBaseY + droop * 0.45);
    g.lineTo(cx - halfW * 0.85, tierBaseY + droop * 0.75);
    g.lineTo(cx - halfW * 0.5, tierBaseY - droop * 0.2);
    g.closePath();
    g.fillPath();

    // Sunlit upper-left needle highlights
    g.fillStyle(palette.light, 0.75);
    g.beginPath();
    g.moveTo(cx - 1, tierTopY + 2);
    g.lineTo(cx + halfW * 0.12, tierBaseY + droop * 0.2);
    g.lineTo(cx - halfW * 0.38, tierBaseY + droop * 0.35);
    g.lineTo(cx - halfW * 0.82, tierBaseY + droop * 0.65);
    g.lineTo(cx - halfW * 0.48, tierBaseY - droop * 0.2);
    g.closePath();
    g.fillPath();
  }
}

/**
 * Draws a multi-layered realistic conifer forest with mist, undergrowth, and ferns.
 */
export function drawRealisticForest(scene, totalW = 6000, baseY = 430, {
  scrollBack = 0.14,
  scrollMid = 0.17,
  scrollFront = 0.20,
  seed = 42,
} = {}) {
  const rng = createRng(seed);

  // 1. Distant misty treeline silhouette
  const gFar = scene.add.graphics();
  gFar.setDepth(DEPTH.FOREST - 2);
  gFar.setScrollFactor(scrollBack);
  gFar.fillStyle(0x3a5846, 0.75);
  for (let x = -100; x < totalW; x += 28) {
    const h = 38 + rng() * 34;
    const w = 22 + rng() * 14;
    const cx = x + rng() * 14;
    const yOff = Math.sin(x / 300) * 10;
    gFar.fillTriangle(cx - w * 0.5, baseY + yOff, cx, baseY + yOff - h, cx + w * 0.5, baseY + yOff);
  }
  gFar.fillStyle(COLORS.MIST, 0.24);
  gFar.fillRect(-100, baseY - 22, totalW + 200, 70);

  // 2. Mid-ground conifers
  const gMid = scene.add.graphics();
  gMid.setDepth(DEPTH.FOREST - 1);
  gMid.setScrollFactor(scrollMid);
  const midPalette = { dark: 0x1e3824, mid: 0x2b4d32, light: 0x416944 };

  for (let x = -80; x < totalW; x += 44) {
    const treeH = 54 + rng() * 44;
    const treeW = 30 + rng() * 16;
    const cx = x + rng() * 20;
    const yOff = Math.sin(x / 220) * 8;
    drawRealisticPineTree(gMid, cx, baseY + yOff, treeH, treeW, midPalette, rng);
  }

  // 3. Foreground detailed pines & undergrowth
  const gFront = scene.add.graphics();
  gFront.setDepth(DEPTH.FOREST);
  gFront.setScrollFactor(scrollFront);

  const frontPalettes = [
    { dark: 0x152b1a, mid: 0x224228, light: 0x3b633c },
    { dark: 0x19311e, mid: 0x274b2c, light: 0x477043 },
    { dark: 0x1d331b, mid: 0x2f4f28, light: 0x527541 },
  ];

  for (let x = -60; x < totalW; x += 48) {
    const treeH = 66 + rng() * 58;
    const treeW = 34 + rng() * 20;
    const cx = x + rng() * 24;
    const palette = frontPalettes[Math.floor(rng() * frontPalettes.length)];
    drawRealisticPineTree(gFront, cx, baseY + 4, treeH, treeW, palette, rng);
  }

  // Undergrowth bushes & fern clusters
  for (let x = -40; x < totalW; x += 52) {
    const bx = x + rng() * 36;
    const r = 7 + rng() * 9;
    gFront.fillStyle(0x1b361e, 1);
    gFront.fillEllipse(bx, baseY + 4, r * 2.2, r * 1.2);
    gFront.fillStyle(0x2f542d, 0.9);
    gFront.fillEllipse(bx - r * 0.25, baseY + 1, r * 1.6, r * 0.95);
    gFront.fillStyle(0x4c783e, 0.65);
    gFront.fillEllipse(bx - r * 0.35, baseY - 1, r * 0.9, r * 0.5);
  }

  // Forest floor earth & moss transition
  gFront.fillStyle(0x182b18, 1);
  gFront.fillRect(-100, baseY + 2, totalW + 200, 140);
  gFront.fillStyle(0x2b4725, 0.8);
  gFront.fillRect(-100, baseY + 2, totalW + 200, 10);

  // Soft ground mist separating forest from foreground road
  gFront.fillStyle(COLORS.MIST, 0.14);
  gFront.fillRect(-100, baseY - 6, totalW + 200, 26);

  return { gFar, gMid, gFront };
}

/**
 * Creates a volumetric, softly shaded cumulus cloud graphic.
 */
export function createRealisticCloud(scene, x, y, {
  scale = 1,
  alpha = 0.92,
  scrollFactor = 0,
  depth = DEPTH.CLOUDS,
  seed = 1,
} = {}) {
  const rng = createRng(seed);
  const g = scene.add.graphics();
  g.setScrollFactor(scrollFactor);
  g.setDepth(depth);
  g.setAlpha(alpha);

  const s = scale;

  // Soft outer atmospheric halo puffs
  const puffCount = 9;
  const puffs = [];
  for (let i = 0; i < puffCount; i++) {
    const t = i / (puffCount - 1);
    const px = (t - 0.5) * 96 * s + (rng() - 0.5) * 12 * s;
    // Arch higher in the middle like real cumulus clouds
    const arch = Math.sin(t * Math.PI);
    const py = (-arch * 16 - rng() * 10) * s;
    const pr = (14 + arch * 16 + rng() * 6) * s;
    puffs.push({ px, py, pr });
  }

  // Subtle wispy outer glow
  g.fillStyle(0xffffff, 0.16);
  for (const p of puffs) {
    g.fillEllipse(p.px, p.py - 2 * s, p.pr * 2.4, p.pr * 1.65);
  }

  // Cool blue-grey shaded underside (flat-ish cumulus base)
  g.fillStyle(0xb9cadb, 0.72);
  g.fillEllipse(0, 6 * s, 118 * s, 26 * s);
  for (const p of puffs) {
    g.fillEllipse(p.px + 2 * s, p.py + 5 * s, p.pr * 1.9, p.pr * 1.25);
  }

  // Main cloud volume
  g.fillStyle(0xe8eff6, 0.92);
  for (const p of puffs) {
    g.fillEllipse(p.px, p.py, p.pr * 1.85, p.pr * 1.35);
  }

  // Bright sunlit upper-left crests
  g.fillStyle(0xffffff, 0.95);
  for (const p of puffs) {
    g.fillEllipse(p.px - 3 * s, p.py - 4 * s, p.pr * 1.45, p.pr * 1.05);
  }

  g.setPosition(x, y);
  return g;
}
