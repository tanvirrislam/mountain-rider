import { DEPTH } from './constants';

/**
 * Deterministic pseudo-random generator.
 */
export function createRng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Fast 2D value noise + fBm for procedural clouds, rock, bark, and foliage.
 */
function hash2D(ix, iy, seed = 1) {
  let n = ix * 374761393 + iy * 668265263 + seed * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function valueNoise2D(x, y, seed = 1) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm2D(x, y, octaves = 4, seed = 1) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    val += valueNoise2D(x * freq, y * freq, seed + i * 31) * amp;
    max += amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return val / max;
}

/**
 * Helper to create or replace a canvas texture cleanly across scene restarts.
 */
export function getOrCreateCanvasTexture(scene, key, width, height, drawFn) {
  if (scene.textures.exists(key)) {
    const existing = scene.textures.get(key);
    const src = existing.getSourceImage();
    if (src && src.width === width && src.height === height) {
      return key;
    }
    scene.textures.remove(key);
  }
  const tex = scene.textures.createCanvas(key, width, height);
  if (tex) {
    const ctx = tex.getContext();
    drawFn(ctx, width, height);
    tex.refresh();
  }
  return key;
}

/**
 * Photorealistic atmospheric sky with Rayleigh/Mie scattering, solar bloom,
 * high-altitude cirrus wisps, and diagonal crepuscular god rays.
 */
export function drawRealisticSky(scene, width, height, keyPrefix = 'sky') {
  const key = `${keyPrefix}-ultra-v2`;
  getOrCreateCanvasTexture(scene, key, width, height, (ctx, w, h) => {
    // 1. Deep atmospheric Rayleigh scattering gradient
    const skyGrd = ctx.createLinearGradient(0, 0, 0, h);
    skyGrd.addColorStop(0.0, '#0d2b52');   // Deep stratosphere cobalt
    skyGrd.addColorStop(0.22, '#1f538a');  // Upper sky azure
    skyGrd.addColorStop(0.48, '#4682b8');  // Mid-sky cerulean
    skyGrd.addColorStop(0.72, '#8ab6d6');  // Lower sky pale blue
    skyGrd.addColorStop(0.88, '#c9dde8');  // Horizon mist
    skyGrd.addColorStop(1.0, '#ebe6dc');   // Warm golden-white horizon scatter
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, w, h);

    // 2. High-altitude wispy cirrus clouds painted into upper atmosphere
    ctx.save();
    for (let y = 20; y < h * 0.42; y += 3) {
      for (let x = 0; x < w; x += 6) {
        const n = fbm2D(x * 0.0045 + y * 0.008, y * 0.035, 3, 77);
        const streak = fbm2D(x * 0.012, y * 0.08, 2, 19);
        const cVal = (n * 0.65 + streak * 0.35) - 0.56;
        if (cVal > 0) {
          const alpha = Math.min(0.22, cVal * 0.55) * (1 - y / (h * 0.45));
          ctx.fillStyle = `rgba(248, 252, 255, ${alpha.toFixed(3)})`;
          ctx.fillRect(x, y, 7, 3);
        }
      }
    }
    ctx.restore();

    // 3. Solar position (upper-left) & Mie forward scattering glow
    const sunX = w * 0.15;
    const sunY = h * 0.16;

    const outerGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, w * 0.65);
    outerGlow.addColorStop(0.0, 'rgba(255, 252, 238, 0.95)');
    outerGlow.addColorStop(0.06, 'rgba(255, 244, 212, 0.72)');
    outerGlow.addColorStop(0.18, 'rgba(255, 228, 175, 0.34)');
    outerGlow.addColorStop(0.42, 'rgba(235, 215, 190, 0.12)');
    outerGlow.addColorStop(1.0, 'rgba(200, 220, 240, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, w, h);

    // 4. Diagonal crepuscular god rays streaming across the valley
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rayAngles = [0.32, 0.46, 0.58, 0.71, 0.86, 1.02];
    const rayWidths = [0.06, 0.09, 0.045, 0.08, 0.05, 0.07];
    for (let i = 0; i < rayAngles.length; i++) {
      const ang = rayAngles[i];
      const halfSpread = rayWidths[i];
      const len = w * 1.1;
      const rayGrd = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, len);
      rayGrd.addColorStop(0.0, 'rgba(255, 248, 220, 0.16)');
      rayGrd.addColorStop(0.45, 'rgba(255, 242, 200, 0.07)');
      rayGrd.addColorStop(1.0, 'rgba(255, 242, 200, 0)');
      ctx.fillStyle = rayGrd;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(ang - halfSpread) * len, sunY + Math.sin(ang - halfSpread) * len);
      ctx.lineTo(sunX + Math.cos(ang + halfSpread) * len, sunY + Math.sin(ang + halfSpread) * len);
      ctx.closePath();
      ctx.fill();
    }

    // Bright solar disc & subtle lens halo
    const coreGrd = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 44);
    coreGrd.addColorStop(0.0, 'rgba(255, 255, 250, 1)');
    coreGrd.addColorStop(0.45, 'rgba(255, 250, 225, 0.85)');
    coreGrd.addColorStop(1.0, 'rgba(255, 240, 190, 0)');
    ctx.fillStyle = coreGrd;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
    ctx.fill();

    // Subtle secondary lens flare ring along sun-center axis
    const flareX = sunX + (w * 0.5 - sunX) * 0.55;
    const flareY = sunY + (h * 0.5 - sunY) * 0.55;
    const flareGrd = ctx.createRadialGradient(flareX, flareY, 8, flareX, flareY, 34);
    flareGrd.addColorStop(0.0, 'rgba(255, 235, 190, 0)');
    flareGrd.addColorStop(0.7, 'rgba(255, 235, 190, 0.06)');
    flareGrd.addColorStop(0.9, 'rgba(210, 240, 255, 0.08)');
    flareGrd.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = flareGrd;
    ctx.beginPath();
    ctx.arc(flareX, flareY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const sky = scene.add.image(width / 2, height / 2, key);
  sky.setScrollFactor(0);
  sky.setDepth(DEPTH.SKY);
  return sky;
}

/**
 * Computes a realistic multi-octave eroded alpine ridge height.
 */
function erodedMountainHeight(x, z, seedOffset) {
  // Primary sharp alpine ridge (ridged multifractal)
  const r1 = 1 - Math.abs(Math.sin((x + seedOffset) / 290) * 0.7 + Math.cos((x - seedOffset) / 470) * 0.3);
  const r2 = 1 - Math.abs(Math.sin((x + seedOffset * 1.9 + z * 0.4) / 135));
  const r3 = 1 - Math.abs(Math.cos((x * 1.4 - seedOffset * 0.7 + z * 0.8) / 58));
  const detail = fbm2D((x + seedOffset) * 0.015, z * 0.02, 3, Math.floor(seedOffset) + 11);

  return (r1 * 0.52 + r2 * 0.27 + r3 * 0.11 + detail * 0.14);
}

/**
 * Renders a photorealistic 3D-lit alpine mountain range onto a tiled canvas texture,
 * complete with normal-mapped rock faces, gullies, snow accumulation by slope,
 * sub-alpine forest carpeting, and volumetric valley mist.
 */
export function drawRealisticMountainRange(scene, {
  totalW = 6000,
  baseY = 360,
  amplitude = 190,
  scrollFactor = 0.08,
  depth = DEPTH.MOUNTAINS_FAR,
  layerType = 'far', // 'far' | 'mid' | 'near'
  seedOffset = 0,
  mistAlpha = 0.28,
} = {}) {
  // Render a 2000px wide repeating/seamless-spanning high-detail canvas tile and place across totalW
  const tileW = 2048;
  const texH = Math.ceil(amplitude + 240);
  const topY = baseY - amplitude - 20;
  const key = `mtn-ultra-${layerType}-${seedOffset}`;

  getOrCreateCanvasTexture(scene, key, tileW, texH, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Precompute ridge crest Y and sub-ridge depth profile for every column x
    const crestY = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      // Periodic blend near tile edges so adjacent tiles join smoothly
      const angle = (x / w) * Math.PI * 2;
      const wx = Math.cos(angle) * 320 + Math.sin(angle * 2) * 160 + x * 0.65;
      const elev = erodedMountainHeight(wx, 0, seedOffset);
      crestY[x] = 20 + (1 - elev) * amplitude;
    }

    // Light direction from upper-left: (-0.68, -0.52, 0.51)
    const lx = -0.68;
    const ly = -0.52;
    const lz = 0.51;

    // Color palettes per distance layer (aerial perspective)
    const palettes = {
      far: {
        rockSun: [122, 138, 158],
        rockShadow: [64, 84, 112],
        snowSun: [248, 251, 255],
        snowShadow: [152, 176, 206],
        treeColor: [68, 96, 108],
        hazeColor: [188, 210, 228],
        hazeStrength: 0.36,
        snowLine: 0.58,
      },
      mid: {
        rockSun: [108, 118, 126],
        rockShadow: [46, 58, 72],
        snowSun: [244, 248, 252],
        snowShadow: [138, 162, 190],
        treeColor: [44, 74, 62],
        hazeColor: [176, 202, 220],
        hazeStrength: 0.20,
        snowLine: 0.34,
      },
      near: {
        rockSun: [96, 100, 98],
        rockShadow: [38, 44, 46],
        snowSun: [240, 245, 250],
        snowShadow: [130, 150, 175],
        treeColor: [34, 62, 38],
        hazeColor: [168, 194, 210],
        hazeStrength: 0.08,
        snowLine: 0.0, // Foothills: rocky outcrops + dense conifer forest
      },
    };
    const pal = palettes[layerType] || palettes.far;

    for (let x = 0; x < w; x++) {
      const cY = crestY[x];
      const cYLeft = crestY[(x - 2 + w) % w];
      const cYRight = crestY[(x + 2) % w];
      const ridgeSlopeX = (cYRight - cYLeft) * 0.25;

      const startY = Math.max(0, Math.floor(cY));
      for (let y = startY; y < h; y++) {
        const distFromCrest = y - cY;
        const normAlt = 1 - y / (amplitude + 40); // 1 at top peak, 0 near base

        // 3D rocky gully displacement below the ridge crest
        const gullyNoise = fbm2D((x + seedOffset) * 0.022 + ridgeSlopeX * 0.15, y * 0.018, 3, seedOffset + 5);
        const cragNoise = valueNoise2D(x * 0.09, y * 0.07 + x * 0.02, seedOffset + 29);
        const strata = Math.sin(y * 0.16 + gullyNoise * 6) * 0.08;

        // Compute local 3D surface normal (nx, ny, nz)
        const gullyNextX = fbm2D((x + 2 + seedOffset) * 0.022 + ridgeSlopeX * 0.15, y * 0.018, 3, seedOffset + 5);
        const dHdx = ridgeSlopeX * 0.45 + (gullyNextX - gullyNoise) * 14 + (cragNoise - 0.5) * 0.8;
        const dHdy = 0.55 + strata;
        const invLen = 1 / Math.sqrt(dHdx * dHdx + dHdy * dHdy + 1);
        const nx = dHdx * invLen;
        const ny = -dHdy * invLen;
        const nz = invLen;

        // Diffuse Lambertian lighting + rim light
        const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
        const light = Math.min(1, Math.pow(dot, 0.85) * 1.15);

        // Determine material: Snow vs Exposed Cliff vs Forested Lower Slope
        const steepness = Math.abs(dHdx);
        const snowFactor = pal.snowLine > 0
          ? Math.max(0, Math.min(1, (normAlt - (1 - pal.snowLine) + (gullyNoise - 0.5) * 0.22 - steepness * 0.28) * 5.5))
          : 0;

        // Sub-alpine forest grows on lower slopes where not too steep
        const forestZone = Math.max(0, Math.min(1, ((0.52 - normAlt) * 3.2 + (gullyNoise - 0.45) * 0.9 - steepness * 0.35)));

        // Base rock color (interpolated between shadow and sunlit granite, plus micro-crag texture)
        const rockMicro = 0.86 + cragNoise * 0.28 + strata * 0.5;
        let r = (pal.rockShadow[0] + (pal.rockSun[0] - pal.rockShadow[0]) * light) * rockMicro;
        let g = (pal.rockShadow[1] + (pal.rockSun[1] - pal.rockShadow[1]) * light) * rockMicro;
        let b = (pal.rockShadow[2] + (pal.rockSun[2] - pal.rockShadow[2]) * light) * rockMicro;

        // Blend sub-alpine conifer forest texture on lower slopes
        if (forestZone > 0.01) {
          const canopyBump = valueNoise2D(x * 0.18, y * 0.22, seedOffset + 91);
          const treeShade = (0.55 + light * 0.65) * (0.75 + canopyBump * 0.45);
          const tr = pal.treeColor[0] * treeShade;
          const tg = pal.treeColor[1] * treeShade;
          const tb = pal.treeColor[2] * treeShade;
          r = r * (1 - forestZone) + tr * forestZone;
          g = g * (1 - forestZone) + tg * forestZone;
          b = b * (1 - forestZone) + tb * forestZone;
        }

        // Blend alpine snow & glacier ice
        if (snowFactor > 0.01) {
          const sr = pal.snowShadow[0] + (pal.snowSun[0] - pal.snowShadow[0]) * light;
          const sg = pal.snowShadow[1] + (pal.snowSun[1] - pal.snowShadow[1]) * light;
          const sb = pal.snowShadow[2] + (pal.snowSun[2] - pal.snowShadow[2]) * light;
          r = r * (1 - snowFactor) + sr * snowFactor;
          g = g * (1 - snowFactor) + sg * snowFactor;
          b = b * (1 - snowFactor) + sb * snowFactor;
        }

        // Aerial perspective & valley mist increasing toward the mountain base
        const valleyMist = Math.pow(Math.max(0, Math.min(1, (y - amplitude * 0.45) / (h - amplitude * 0.45))), 1.6) * mistAlpha * 1.8;
        const totalHaze = Math.min(0.88, pal.hazeStrength + valleyMist);

        r = r * (1 - totalHaze) + pal.hazeColor[0] * totalHaze;
        g = g * (1 - totalHaze) + pal.hazeColor[1] * totalHaze;
        b = b * (1 - totalHaze) + pal.hazeColor[2] * totalHaze;

        // Anti-aliased 1.5px crest edge
        const edgeAlpha = Math.min(1, distFromCrest / 1.5);

        const idx = (y * w + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = Math.round(edgeAlpha * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });

  // Tile the rendered mountain range across the world width
  const images = [];
  for (let x = -200; x < totalW; x += tileW) {
    const img = scene.add.image(x + tileW / 2, topY + texH / 2, key);
    img.setScrollFactor(scrollFactor);
    img.setDepth(depth);
    images.push(img);
  }
  return images;
}

/**
 * Generates high-resolution botanical tree textures (Spruce, Mountain Pine, Silver Birch)
 * with realistic bark, branch structure, needle clusters, and 3D lighting.
 */
function ensureBotanicalTreeTextures(scene) {
  // 1. Tall Alpine Spruce (2 variants)
  for (let v = 0; v < 2; v++) {
    const key = `tree-spruce-v2-${v}`;
    getOrCreateCanvasTexture(scene, key, 140, 240, (ctx, w, h) => {
      const rng = createRng(301 + v * 73);
      const cx = w / 2;
      const baseY = h - 8;
      const treeH = h - 24;

      // Tapered textured bark trunk
      const gradTrunk = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0);
      gradTrunk.addColorStop(0, '#5c402c');
      gradTrunk.addColorStop(0.45, '#3d281a');
      gradTrunk.addColorStop(1, '#1e120b');
      ctx.fillStyle = gradTrunk;
      ctx.beginPath();
      ctx.moveTo(cx - 6, baseY);
      ctx.lineTo(cx - 1.5, baseY - treeH * 0.92);
      ctx.lineTo(cx + 1.5, baseY - treeH * 0.92);
      ctx.lineTo(cx + 6, baseY);
      ctx.closePath();
      ctx.fill();

      // 22 dense horizontal-drooping branch whorls from bottom to crown
      const levels = 24;
      for (let i = 0; i < levels; i++) {
        const t = i / (levels - 1); // 0 = bottom, 1 = top spire
        const y = baseY - treeH * (0.08 + t * 0.88);
        const maxSpan = (1 - Math.pow(t, 0.82)) * 56 + 4;
        const clusters = Math.max(4, Math.floor((1 - t) * 16 + 4));

        for (let c = 0; c < clusters; c++) {
          const side = (c / (clusters - 1)) * 2 - 1; // -1 left to +1 right
          const bx = cx + side * maxSpan * (0.75 + rng() * 0.3);
          const droop = Math.abs(side) * (10 + (1 - t) * 10) + (rng() - 0.5) * 5;
          const by = y + droop;
          const rad = (5.5 + (1 - t) * 6.5) * (0.8 + rng() * 0.35);

          // 3D lighting: upper-left branches receive warm sunlight, right/inner branches in deep shadow
          const distFromCenter = Math.abs(side);
          const sunExposure = Math.max(0, Math.min(1, (-side * 0.55 + 0.45) * (0.45 + distFromCenter * 0.65) + t * 0.2));

          // Deep interior needle shadow
          ctx.fillStyle = 'rgba(12, 24, 15, 0.92)';
          ctx.beginPath();
          ctx.ellipse(bx + 1.5, by + 2, rad * 1.15, rad * 0.72, side * 0.35, 0, Math.PI * 2);
          ctx.fill();

          // Needle cluster body with jagged pine spikes
          const rCol = Math.round(18 + sunExposure * 52 + v * 6);
          const gCol = Math.round(38 + sunExposure * 76 + v * 8);
          const bCol = Math.round(22 + sunExposure * 34);
          ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;

          ctx.beginPath();
          const spikes = 9;
          for (let s = 0; s < spikes; s++) {
            const ang = (s / spikes) * Math.PI * 2;
            const rSpike = rad * (s % 2 === 0 ? 1.25 : 0.68);
            const px = bx + Math.cos(ang) * rSpike * 1.15;
            const py = by + Math.sin(ang) * rSpike * 0.75;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();

          // Sunlit needle tips on upper-left
          if (sunExposure > 0.38) {
            ctx.fillStyle = `rgba(${rCol + 32}, ${gCol + 42}, ${bCol + 18}, 0.65)`;
            ctx.beginPath();
            ctx.ellipse(bx - rad * 0.25, by - rad * 0.2, rad * 0.55, rad * 0.32, -0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    });
  }

  // 2. Broad Mountain Pine / Deciduous Birch-Alder Accent
  const birchKey = 'tree-birch-v2';
  getOrCreateCanvasTexture(scene, birchKey, 150, 220, (ctx, w, h) => {
    const rng = createRng(887);
    const cx = w / 2;
    const baseY = h - 8;

    // Slightly curved silver-bark trunk with dark lenticel markings
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d8d4cc';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx - 5, baseY - 70, cx + 2, baseY - 145);
    ctx.stroke();

    // Trunk shadow side
    ctx.strokeStyle = '#5c5852';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 2.5, baseY);
    ctx.quadraticCurveTo(cx - 2.5, baseY - 70, cx + 4, baseY - 145);
    ctx.stroke();

    // Dark birch bark horizontal notches
    ctx.fillStyle = '#2b2623';
    for (let y = baseY - 12; y > baseY - 130; y -= 9) {
      ctx.fillRect(cx - 4 + (rng() - 0.5) * 3, y, 4 + rng() * 3, 2);
    }

    // Airy, sunlit leaf clusters
    const puffs = 55;
    for (let i = 0; i < puffs; i++) {
      const ang = rng() * Math.PI * 2;
      const dist = Math.pow(rng(), 0.65) * 48;
      const px = cx + Math.cos(ang) * dist;
      const py = baseY - 118 + Math.sin(ang) * dist * 1.15;
      const rad = 10 + rng() * 12;

      const light = Math.max(0, Math.min(1, (cx - px) / 55 * 0.5 + (baseY - 118 - py) / 65 * 0.5 + 0.5));
      ctx.fillStyle = 'rgba(22, 38, 18, 0.75)';
      ctx.beginPath();
      ctx.arc(px + 2, py + 2.5, rad, 0, Math.PI * 2);
      ctx.fill();

      const r = Math.round(42 + light * 74);
      const g = Math.round(72 + light * 88);
      const b = Math.round(28 + light * 36);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.88)`;
      ctx.beginPath();
      ctx.arc(px, py, rad * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Draws a multi-layered photorealistic forest (background parallax + foreground roadside trees).
 */
export function drawRealisticForest(scene, totalW = 6000, baseY = 430, {
  scrollBack = 0.14,
  scrollMid = 0.18,
  scrollFront = 0.24,
  seed = 42,
  includeRoadside = true,
  terrain = null,
} = {}) {
  ensureBotanicalTreeTextures(scene);
  const rng = createRng(seed);

  // 1. Far misty forest carpet & canopy ridge
  const gFar = scene.add.graphics();
  gFar.setDepth(DEPTH.FOREST - 2);
  gFar.setScrollFactor(scrollBack);
  gFar.fillStyle(0x284237, 0.92);
  gFar.fillRect(-200, baseY - 12, totalW + 400, 180);

  for (let x = -120; x < totalW; x += 26) {
    const tex = rng() > 0.5 ? 'tree-spruce-v2-0' : 'tree-spruce-v2-1';
    const s = 0.34 + rng() * 0.18;
    const yOff = Math.sin(x / 260) * 12;
    const img = scene.add.image(x + rng() * 14, baseY + yOff, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setTint(0x6b8c82);
    img.setAlpha(0.82);
    img.setScrollFactor(scrollBack);
    img.setDepth(DEPTH.FOREST - 2);
  }

  // Soft valley mist band between far and mid forest
  const mistMid = scene.add.graphics();
  mistMid.setDepth(DEPTH.FOREST - 1.5);
  mistMid.setScrollFactor(scrollMid);
  mistMid.fillStyle(0xd8e6ee, 0.22);
  mistMid.fillRect(-200, baseY - 38, totalW + 400, 55);

  // 2. Mid-ground dense alpine forest
  for (let x = -100; x < totalW; x += 38) {
    const rVal = rng();
    const tex = rVal > 0.85 ? 'tree-birch-v2' : (rVal > 0.42 ? 'tree-spruce-v2-0' : 'tree-spruce-v2-1');
    const s = 0.52 + rng() * 0.26;
    const yOff = Math.sin(x / 190) * 9;
    const img = scene.add.image(x + rng() * 18, baseY + 12 + yOff, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setTint(0x9bb5a8);
    img.setScrollFactor(scrollMid);
    img.setDepth(DEPTH.FOREST - 1);
  }

  // 3. Foreground detailed forest layer
  const gFloor = scene.add.graphics();
  gFloor.setDepth(DEPTH.FOREST);
  gFloor.setScrollFactor(scrollFront);
  gFloor.fillStyle(0x162618, 1);
  gFloor.fillRect(-200, baseY + 14, totalW + 400, 220);

  for (let x = -80; x < totalW; x += 46) {
    const rVal = rng();
    const tex = rVal > 0.82 ? 'tree-birch-v2' : (rVal > 0.4 ? 'tree-spruce-v2-0' : 'tree-spruce-v2-1');
    const s = 0.72 + rng() * 0.38;
    const img = scene.add.image(x + rng() * 22, baseY + 22, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setScrollFactor(scrollFront);
    img.setDepth(DEPTH.FOREST);
  }

  // 4. Full-scale roadside trees anchored to the actual terrain (1:1 parallax right behind the road)
  if (includeRoadside && terrain) {
    for (let x = 140; x < terrain.terrainWidth - 380; x += 135) {
      const tx = x + (rng() - 0.5) * 55;
      const ty = terrain.getHeightAtX(tx) + 8;
      const rVal = rng();
      const tex = rVal > 0.78 ? 'tree-birch-v2' : (rVal > 0.38 ? 'tree-spruce-v2-0' : 'tree-spruce-v2-1');
      const s = 0.95 + rng() * 0.55;
      const tree = scene.add.image(tx, ty, tex);
      tree.setOrigin(0.5, 0.96);
      tree.setScale(s);
      tree.setDepth(DEPTH.TERRAIN_BG - 2);
    }
  }
}

/**
 * Generates and spawns true volumetric cumulus clouds using fBm noise and Beer-Lambert
 * directional self-shadowing (silver-white sunlit crests, warm rim light, slate-grey bases).
 */
export function createRealisticCloud(scene, x, y, {
  scale = 1,
  alpha = 0.95,
  scrollFactor = 0,
  depth = DEPTH.CLOUDS,
  seed = 1,
} = {}) {
  const variant = Math.abs(seed) % 4;
  const key = `cloud-volumetric-v2-${variant}`;
  const cw = 260;
  const ch = 120;

  getOrCreateCanvasTexture(scene, key, cw, ch, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    const seedBase = 200 + variant * 53;

    // Precompute cloud density field using multi-lobe cumulus envelope + fBm turbulence
    const density = new Float32Array(w * h);
    const lobes = [
      { cx: 0.50, cy: 0.46, rx: 0.26, ry: 0.34 },
      { cx: 0.31, cy: 0.54, rx: 0.22, ry: 0.26 },
      { cx: 0.69, cy: 0.52, rx: 0.23, ry: 0.28 },
      { cx: 0.18, cy: 0.64, rx: 0.16, ry: 0.18 },
      { cx: 0.82, cy: 0.64, rx: 0.16, ry: 0.18 },
    ];

    for (let py = 0; py < h; py++) {
      const ny = py / h;
      // Flatten the bottom of cumulus clouds naturally
      const bottomCut = ny > 0.74 ? Math.max(0, 1 - (ny - 0.74) * 5.2) : 1;

      for (let px = 0; px < w; px++) {
        const nx = px / w;
        let env = 0;
        for (const l of lobes) {
          const dx = (nx - l.cx) / l.rx;
          const dy = (ny - l.cy) / l.ry;
          const d = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
          if (d > env) env = d;
        }
        if (env <= 0) continue;

        const n = fbm2D(px * 0.032, py * 0.036, 4, seedBase);
        const detail = valueNoise2D(px * 0.09, py * 0.09, seedBase + 17) * 0.18;
        const val = Math.max(0, (env * 1.15 + (n - 0.48) * 0.68 + detail - 0.28) * bottomCut);
        density[py * w + px] = Math.min(1, val * 1.55);
      }
    }

    // Raymarch toward upper-left sun (-2, -2) to compute volumetric self-shadowing
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const d = density[py * w + px];
        if (d <= 0.01) continue;

        // Accumulate optical depth toward the sun
        let shadowAcc = 0;
        for (let step = 1; step <= 6; step++) {
          const sx = Math.max(0, px - step * 4);
          const sy = Math.max(0, py - step * 3);
          shadowAcc += density[sy * w + sx];
        }
        const transmittance = Math.exp(-shadowAcc * 0.42);
        const heightLight = 1 - (py / h) * 0.45;
        const illumination = Math.min(1, transmittance * 0.75 + heightLight * 0.35);

        // Interpolate between cool slate-blue cloud base and warm sunlit silver-white crest
        const r = Math.round(148 + illumination * 107);
        const g = Math.round(166 + illumination * 89);
        const b = Math.round(188 + illumination * 67);

        const idx = (py * w + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.round(Math.pow(d, 0.78) * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });

  const img = scene.add.image(x, y, key);
  img.setScrollFactor(scrollFactor);
  img.setDepth(depth);
  img.setScale(scale);
  img.setAlpha(alpha);
  return img;
}
