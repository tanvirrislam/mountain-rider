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
 * Fast 2D value noise + fBm for procedural rock, soil, and mountain ridges.
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
    freq *= 2.02;
    amp *= 0.5;
  }
  return val / max;
}

/**
 * Helper to create or reuse a canvas texture cleanly across scene restarts.
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
 * Photorealistic atmospheric sky with smooth Rayleigh/Mie scattering and a natural,
 * glitch-free radial solar corona & photosphere disc.
 */
export function drawRealisticSky(scene, width, height, keyPrefix = 'sky') {
  const key = `${keyPrefix}-ultra-v3`;
  getOrCreateCanvasTexture(scene, key, width, height, (ctx, w, h) => {
    // 1. Smooth atmospheric Rayleigh scattering gradient
    const skyGrd = ctx.createLinearGradient(0, 0, 0, h);
    skyGrd.addColorStop(0.0, '#0f315e');   // Deep zenith cobalt
    skyGrd.addColorStop(0.24, '#215794');  // Clear upper-sky azure
    skyGrd.addColorStop(0.50, '#4f89be');  // Mid-sky cerulean
    skyGrd.addColorStop(0.74, '#92C0DE');  // Lower sky pale blue
    skyGrd.addColorStop(0.90, '#cde0ea');  // Horizon mist
    skyGrd.addColorStop(1.0, '#ece9e0');   // Warm horizon scatter
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, w, h);

    // 2. Natural Sun with smooth concentric radial scattering (zero polygon spokes or artifacts)
    const sunX = w * 0.16;
    const sunY = h * 0.17;

    // Wide atmospheric Mie forward-scatter glow
    const wideGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.55);
    wideGlow.addColorStop(0.0, 'rgba(255, 250, 232, 0.52)');
    wideGlow.addColorStop(0.10, 'rgba(255, 242, 210, 0.28)');
    wideGlow.addColorStop(0.28, 'rgba(255, 234, 190, 0.10)');
    wideGlow.addColorStop(0.60, 'rgba(240, 225, 200, 0.03)');
    wideGlow.addColorStop(1.0, 'rgba(200, 220, 240, 0)');
    ctx.fillStyle = wideGlow;
    ctx.fillRect(0, 0, w, h);

    // Medium solar corona aura
    const corona = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 135);
    corona.addColorStop(0.0, 'rgba(255, 254, 244, 0.92)');
    corona.addColorStop(0.22, 'rgba(255, 248, 220, 0.58)');
    corona.addColorStop(0.55, 'rgba(255, 238, 190, 0.16)');
    corona.addColorStop(1.0, 'rgba(255, 235, 180, 0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 135, 0, Math.PI * 2);
    ctx.fill();

    // Crisp, softly anti-aliased solar photosphere disc
    const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 32);
    disc.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    disc.addColorStop(0.58, 'rgba(255, 253, 240, 0.98)');
    disc.addColorStop(0.82, 'rgba(255, 246, 210, 0.55)');
    disc.addColorStop(1.0, 'rgba(255, 240, 195, 0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();
  });

  const sky = scene.add.image(width / 2, height / 2, key);
  sky.setScrollFactor(0);
  sky.setDepth(DEPTH.SKY);
  return sky;
}

/**
 * Computes a realistic multi-octave eroded alpine ridge height.
 */
function erodedMountainHeight(x, seedOffset) {
  const r1 = 1 - Math.abs(Math.sin((x + seedOffset) / 280) * 0.72 + Math.cos((x - seedOffset) / 430) * 0.28);
  const r2 = 1 - Math.abs(Math.sin((x + seedOffset * 1.8) / 130));
  const r3 = 1 - Math.abs(Math.cos((x * 1.35 - seedOffset * 0.7) / 56));
  const detail = fbm2D((x + seedOffset) * 0.014, seedOffset * 0.02, 3, Math.floor(seedOffset) + 11);

  return (r1 * 0.54 + r2 * 0.26 + r3 * 0.10 + detail * 0.14);
}

/**
 * Renders a single seamless, ultra-realistic 3D-lit alpine mountain range spanning
 * the entire parallax view (zero tile seams, zero bottom cutoffs).
 */
export function drawRealisticMountainRange(scene, {
  baseY = 360,
  amplitude = 190,
  scrollFactor = 0.08,
  depth = DEPTH.MOUNTAINS_FAR,
  layerType = 'far', // 'far' | 'mid' | 'near'
  seedOffset = 0,
  mistAlpha = 0.28,
} = {}) {
  // A single 2200px wide texture covers the entire camera + parallax travel with zero tiling seams
  const texW = 2200;
  const texH = Math.ceil(amplitude + 420);
  const topY = baseY - amplitude - 20;
  const key = `mtn-ultra-v3-${layerType}-${seedOffset}`;

  getOrCreateCanvasTexture(scene, key, texW, texH, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const crestY = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const elev = erodedMountainHeight(x * 0.85, seedOffset);
      crestY[x] = 20 + (1 - elev) * amplitude;
    }

    // Sunlight vector from upper-left
    const lx = -0.68;
    const ly = -0.52;
    const lz = 0.51;

    const palettes = {
      far: {
        rockSun: [120, 138, 160],
        rockShadow: [62, 82, 110],
        snowSun: [248, 251, 255],
        snowShadow: [150, 175, 206],
        treeColor: [64, 94, 106],
        hazeColor: [188, 212, 230],
        hazeStrength: 0.34,
        snowLine: 0.56,
      },
      mid: {
        rockSun: [106, 116, 124],
        rockShadow: [44, 56, 70],
        snowSun: [244, 248, 252],
        snowShadow: [136, 160, 188],
        treeColor: [42, 72, 58],
        hazeColor: [176, 202, 220],
        hazeStrength: 0.18,
        snowLine: 0.32,
      },
      near: {
        rockSun: [92, 98, 94],
        rockShadow: [36, 44, 44],
        snowSun: [240, 245, 250],
        snowShadow: [130, 150, 175],
        treeColor: [32, 60, 36],
        hazeColor: [168, 194, 210],
        hazeStrength: 0.07,
        snowLine: 0.0,
      },
    };
    const pal = palettes[layerType] || palettes.far;

    for (let x = 0; x < w; x++) {
      const cY = crestY[x];
      const cYLeft = crestY[Math.max(0, x - 2)];
      const cYRight = crestY[Math.min(w - 1, x + 2)];
      const ridgeSlopeX = (cYRight - cYLeft) * 0.25;

      const startY = Math.max(0, Math.floor(cY));
      for (let y = startY; y < h; y++) {
        const distFromCrest = y - cY;
        const normAlt = 1 - y / (amplitude + 40);

        const gullyNoise = fbm2D((x + seedOffset) * 0.022 + ridgeSlopeX * 0.15, y * 0.018, 3, seedOffset + 5);
        const cragNoise = valueNoise2D(x * 0.09, y * 0.07 + x * 0.02, seedOffset + 29);
        const strata = Math.sin(y * 0.16 + gullyNoise * 6) * 0.08;

        const gullyNextX = fbm2D((x + 2 + seedOffset) * 0.022 + ridgeSlopeX * 0.15, y * 0.018, 3, seedOffset + 5);
        const dHdx = ridgeSlopeX * 0.45 + (gullyNextX - gullyNoise) * 14 + (cragNoise - 0.5) * 0.8;
        const dHdy = 0.55 + strata;
        const invLen = 1 / Math.sqrt(dHdx * dHdx + dHdy * dHdy + 1);
        const nx = dHdx * invLen;
        const ny = -dHdy * invLen;
        const nz = invLen;

        const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
        const light = Math.min(1, Math.pow(dot, 0.85) * 1.15);

        const steepness = Math.abs(dHdx);
        const snowFactor = pal.snowLine > 0
          ? Math.max(0, Math.min(1, (normAlt - (1 - pal.snowLine) + (gullyNoise - 0.5) * 0.22 - steepness * 0.28) * 5.5))
          : 0;

        const forestZone = Math.max(0, Math.min(1, ((0.54 - normAlt) * 3.2 + (gullyNoise - 0.45) * 0.9 - steepness * 0.35)));

        const rockMicro = 0.86 + cragNoise * 0.28 + strata * 0.5;
        let r = (pal.rockShadow[0] + (pal.rockSun[0] - pal.rockShadow[0]) * light) * rockMicro;
        let g = (pal.rockShadow[1] + (pal.rockSun[1] - pal.rockShadow[1]) * light) * rockMicro;
        let b = (pal.rockShadow[2] + (pal.rockSun[2] - pal.rockShadow[2]) * light) * rockMicro;

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

        if (snowFactor > 0.01) {
          const sr = pal.snowShadow[0] + (pal.snowSun[0] - pal.snowShadow[0]) * light;
          const sg = pal.snowShadow[1] + (pal.snowSun[1] - pal.snowShadow[1]) * light;
          const sb = pal.snowShadow[2] + (pal.snowSun[2] - pal.snowShadow[2]) * light;
          r = r * (1 - snowFactor) + sr * snowFactor;
          g = g * (1 - snowFactor) + sg * snowFactor;
          b = b * (1 - snowFactor) + sb * snowFactor;
        }

        const valleyMist = Math.pow(Math.max(0, Math.min(1, (y - amplitude * 0.45) / (h - amplitude * 0.45))), 1.5) * mistAlpha * 1.8;
        const totalHaze = Math.min(0.88, pal.hazeStrength + valleyMist);

        r = r * (1 - totalHaze) + pal.hazeColor[0] * totalHaze;
        g = g * (1 - totalHaze) + pal.hazeColor[1] * totalHaze;
        b = b * (1 - totalHaze) + pal.hazeColor[2] * totalHaze;

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

  const img = scene.add.image(texW / 2 - 120, topY + texH / 2, key);
  img.setScrollFactor(scrollFactor);
  img.setDepth(depth);
  return img;
}

/**
 * Generates high-resolution botanical tree textures:
 * - Norway Spruce / Alpine Fir with thousands of fine needle strokes & timber branches
 * - Mountain Oak / Broadleaf with full branching limb structure & mottled leaf clusters
 */
function ensureBotanicalTreeTextures(scene) {
  // 1. Realistic Conifer (Spruce / Alpine Fir) — 2 natural variants
  for (let v = 0; v < 2; v++) {
    const key = `tree-conifer-v3-${v}`;
    getOrCreateCanvasTexture(scene, key, 180, 280, (ctx, w, h) => {
      const rng = createRng(501 + v * 97);
      const cx = w / 2;
      const baseY = h - 14;
      const treeH = h - 32;

      // Soft ground ambient-occlusion shadow at base of trunk
      const shd = ctx.createRadialGradient(cx, baseY + 2, 3, cx, baseY + 2, 36);
      shd.addColorStop(0, 'rgba(8, 14, 10, 0.55)');
      shd.addColorStop(1, 'rgba(8, 14, 10, 0)');
      ctx.fillStyle = shd;
      ctx.save();
      ctx.translate(cx, baseY + 2);
      ctx.scale(1.5, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sturdy tapered wooden trunk with bark shading & root flare
      const trunkGrd = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
      trunkGrd.addColorStop(0.0, '#6e4c34');
      trunkGrd.addColorStop(0.42, '#472f1f');
      trunkGrd.addColorStop(1.0, '#1e120a');
      ctx.fillStyle = trunkGrd;
      ctx.beginPath();
      ctx.moveTo(cx - 9, baseY + 3);
      ctx.quadraticCurveTo(cx - 5, baseY - 12, cx - 1.5, baseY - treeH * 0.96);
      ctx.lineTo(cx + 1.5, baseY - treeH * 0.96);
      ctx.quadraticCurveTo(cx + 5, baseY - 12, cx + 9, baseY + 3);
      ctx.closePath();
      ctx.fill();

      // Render 26 whorls of downward-sweeping conifer boughs with fine needle brushwork
      const whorls = 26;
      ctx.lineCap = 'round';

      for (let i = 0; i < whorls; i++) {
        const t = i / (whorls - 1); // 0 = lowest boughs, 1 = top leader spire
        const wy = baseY - treeH * (0.11 + t * 0.85);
        const maxSpan = (1 - Math.pow(t, 0.84)) * 68 + 4;

        // Draw woody internal branch limbs first
        ctx.strokeStyle = '#2d1c12';
        ctx.lineWidth = Math.max(1, (1 - t) * 2.5);
        ctx.beginPath();
        ctx.moveTo(cx, wy);
        ctx.quadraticCurveTo(cx - maxSpan * 0.5, wy + 8, cx - maxSpan * 0.92, wy + 12);
        ctx.moveTo(cx, wy);
        ctx.quadraticCurveTo(cx + maxSpan * 0.5, wy + 8, cx + maxSpan * 0.92, wy + 12);
        ctx.stroke();

        // Number of foliage sub-boughs across this whorl
        const boughCount = Math.max(5, Math.floor((1 - t) * 18 + 5));
        for (let b = 0; b < boughCount; b++) {
          const side = (b / (boughCount - 1)) * 2 - 1; // -1 (left) to +1 (right)
          const bx = cx + side * maxSpan * (0.72 + rng() * 0.28);
          const droop = Math.abs(side) * (8 + (1 - t) * 11) + (rng() - 0.5) * 4;
          const by = wy + droop;
          const boughScale = (0.65 + (1 - t) * 0.65) * (0.85 + rng() * 0.3);

          // Upper-left sunlight exposure
          const sunLight = Math.max(0, Math.min(1, (-side * 0.55 + 0.45) * (0.4 + Math.abs(side) * 0.65) + t * 0.22));

          // 1) Soft deep ambient occlusion under bough
          const aoRad = 11 * boughScale;
          const aoGrd = ctx.createRadialGradient(bx + 1, by + 2, 1, bx + 1, by + 2, aoRad);
          aoGrd.addColorStop(0, 'rgba(9, 20, 12, 0.85)');
          aoGrd.addColorStop(0.7, 'rgba(12, 26, 15, 0.45)');
          aoGrd.addColorStop(1, 'rgba(12, 26, 15, 0)');
          ctx.fillStyle = aoGrd;
          ctx.beginPath();
          ctx.arc(bx + 1, by + 2, aoRad, 0, Math.PI * 2);
          ctx.fill();

          // 2) Fine radiating pine-needle strokes (16 needles per sub-bough)
          const rBase = Math.round(20 + sunLight * 46 + v * 6);
          const gBase = Math.round(42 + sunLight * 68 + v * 9);
          const bBase = Math.round(22 + sunLight * 28);

          const needles = 14;
          for (let n = 0; n < needles; n++) {
            const nAng = (side < 0 ? Math.PI * 0.85 : Math.PI * 0.15) + (rng() - 0.5) * 1.45;
            const nLen = (6 + rng() * 7) * boughScale;
            const shade = 0.82 + rng() * 0.36;
            const nr = Math.min(255, Math.round(rBase * shade));
            const ng = Math.min(255, Math.round(gBase * shade));
            const nb = Math.min(255, Math.round(bBase * shade));

            ctx.strokeStyle = `rgba(${nr}, ${ng}, ${nb}, 0.92)`;
            ctx.lineWidth = 1.35;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(nAng) * nLen, by + Math.sin(nAng) * nLen * 0.85);
            ctx.stroke();
          }

          // 3) Sunlit needle tip highlight on upper-left boughs
          if (sunLight > 0.42) {
            ctx.strokeStyle = `rgba(${rBase + 38}, ${gBase + 48}, ${bBase + 18}, 0.72)`;
            ctx.lineWidth = 1.1;
            for (let hIdx = 0; hIdx < 5; hIdx++) {
              const hAng = -Math.PI * 0.65 + (rng() - 0.5) * 0.9;
              const hLen = (5 + rng() * 5) * boughScale;
              ctx.beginPath();
              ctx.moveTo(bx - 1, by - 1);
              ctx.lineTo(bx - 1 + Math.cos(hAng) * hLen, by - 1 + Math.sin(hAng) * hLen);
              ctx.stroke();
            }
          }
        }
      }
    });
  }

  // 2. Realistic Broadleaf Mountain Tree (Oak / Maple / Birch) with full limb structure & fine foliage
  const broadleafKey = 'tree-broadleaf-v3';
  getOrCreateCanvasTexture(scene, broadleafKey, 200, 260, (ctx, w, h) => {
    const rng = createRng(773);
    const cx = w / 2;
    const baseY = h - 14;

    // Ground shadow
    const shd = ctx.createRadialGradient(cx, baseY + 2, 4, cx, baseY + 2, 42);
    shd.addColorStop(0, 'rgba(8, 14, 10, 0.52)');
    shd.addColorStop(1, 'rgba(8, 14, 10, 0)');
    ctx.fillStyle = shd;
    ctx.save();
    ctx.translate(cx, baseY + 2);
    ctx.scale(1.6, 0.32);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Recursive organic limb & branch skeleton
    ctx.lineCap = 'round';
    const drawBranch = (x1, y1, len, angle, thickness, depthLeft) => {
      const x2 = x1 + Math.cos(angle) * len;
      const y2 = y1 + Math.sin(angle) * len;

      // Dark bark shadow
      ctx.strokeStyle = '#261b13';
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) * 0.5 + (rng() - 0.5) * 4, (y1 + y2) * 0.5, x2, y2);
      ctx.stroke();

      // Sunlit left bark highlight
      if (thickness > 2) {
        ctx.strokeStyle = '#5c4432';
        ctx.lineWidth = thickness * 0.4;
        ctx.beginPath();
        ctx.moveTo(x1 - thickness * 0.2, y1);
        ctx.lineTo(x2 - thickness * 0.2, y2);
        ctx.stroke();
      }

      if (depthLeft > 0) {
        const subCount = depthLeft === 3 ? 3 : 2;
        for (let b = 0; b < subCount; b++) {
          const spread = (b - (subCount - 1) / 2) * (0.48 + rng() * 0.22);
          drawBranch(
            x2,
            y2,
            len * (0.68 + rng() * 0.14),
            angle + spread,
            thickness * 0.65,
            depthLeft - 1
          );
        }
      }
    };

    // Main trunk & primary limbs
    drawBranch(cx, baseY, 54, -Math.PI / 2 + 0.04, 11, 3);

    // Paint 14 major canopy domes, each composed of dozens of tiny mottled leaf clusters
    const domes = [
      { x: cx - 38, y: baseY - 122, r: 28 },
      { x: cx + 38, y: baseY - 118, r: 28 },
      { x: cx - 52, y: baseY - 148, r: 26 },
      { x: cx + 48, y: baseY - 146, r: 26 },
      { x: cx, y: baseY - 135, r: 34 },
      { x: cx - 26, y: baseY - 168, r: 30 },
      { x: cx + 26, y: baseY - 165, r: 30 },
      { x: cx, y: baseY - 188, r: 28 },
      { x: cx - 16, y: baseY - 198, r: 22 },
      { x: cx + 16, y: baseY - 194, r: 22 },
    ];

    // Pass 1: Deep interior canopy shadow
    for (const d of domes) {
      const shdGrd = ctx.createRadialGradient(d.x + 3, d.y + 4, 2, d.x + 3, d.y + 4, d.r * 1.2);
      shdGrd.addColorStop(0, 'rgba(14, 28, 16, 0.90)');
      shdGrd.addColorStop(0.7, 'rgba(18, 34, 20, 0.55)');
      shdGrd.addColorStop(1, 'rgba(18, 34, 20, 0)');
      ctx.fillStyle = shdGrd;
      ctx.beginPath();
      ctx.arc(d.x + 3, d.y + 4, d.r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pass 2: Hundreds of fine individual leaf clusters (3–6px) with 3D sun lighting
    for (const d of domes) {
      const leafClusters = 42;
      for (let l = 0; l < leafClusters; l++) {
        const ang = rng() * Math.PI * 2;
        const dist = Math.pow(rng(), 0.58) * d.r;
        const lx = d.x + Math.cos(ang) * dist;
        const ly = d.y + Math.sin(ang) * dist * 0.88;

        // Global + local dome illumination from upper-left sun
        const globalLight = (cx - lx) / 70 * 0.45 + (baseY - 150 - ly) / 70 * 0.55 + 0.5;
        const localLight = -Math.cos(ang) * 0.35 - Math.sin(ang) * 0.35;
        const light = Math.max(0, Math.min(1, globalLight * 0.7 + localLight * 0.3 + (rng() - 0.5) * 0.15));

        const rCol = Math.round(24 + light * 76);
        const gCol = Math.round(48 + light * 92);
        const bCol = Math.round(20 + light * 32);

        ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, 0.92)`;
        const lw = 3.2 + rng() * 3.2;
        const lh = 2.2 + rng() * 2.4;
        ctx.beginPath();
        ctx.ellipse(lx, ly, lw, lh, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/**
 * Draws a multi-layered photorealistic forest with zero hard horizontal bars or floating trunks.
 */
export function drawRealisticForest(scene, totalW = 6000, baseY = 430, {
  scrollBack = 0.16,
  scrollMid = 0.20,
  scrollFront = 0.25,
  seed = 42,
  includeRoadside = true,
  terrain = null,
} = {}) {
  ensureBotanicalTreeTextures(scene);
  const rng = createRng(seed);

  // Smooth forest foundation gradient canvas (replaces hard fillRect bars)
  const floorKey = 'forest-foundation-v3';
  const floorW = 2200;
  const floorH = 340;
  getOrCreateCanvasTexture(scene, floorKey, floorW, floorH, (ctx, w, h) => {
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0.0, 'rgba(32, 54, 42, 0)');
    grd.addColorStop(0.14, 'rgba(32, 54, 42, 0.85)');
    grd.addColorStop(0.32, 'rgba(20, 36, 24, 0.98)');
    grd.addColorStop(1.0, 'rgba(14, 24, 16, 1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });

  const floorImg = scene.add.image(floorW / 2 - 120, baseY + floorH / 2 - 28, floorKey);
  floorImg.setScrollFactor(scrollBack);
  floorImg.setDepth(DEPTH.FOREST - 2.5);

  // 1. Far misty alpine forest line
  const maxFarX = 1600;
  for (let x = -120; x < maxFarX; x += 28) {
    const tex = rng() > 0.5 ? 'tree-conifer-v3-0' : 'tree-conifer-v3-1';
    const s = 0.34 + rng() * 0.16;
    const yOff = Math.sin(x / 240) * 10;
    const img = scene.add.image(x + rng() * 14, baseY + 6 + yOff, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setTint(0x709086);
    img.setAlpha(0.86);
    img.setScrollFactor(scrollBack);
    img.setDepth(DEPTH.FOREST - 2);
  }

  // 2. Mid-ground mixed conifer & broadleaf forest
  const maxMidX = 1750;
  for (let x = -100; x < maxMidX; x += 36) {
    const rVal = rng();
    const tex = rVal > 0.78 ? 'tree-broadleaf-v3' : (rVal > 0.38 ? 'tree-conifer-v3-0' : 'tree-conifer-v3-1');
    const s = 0.50 + rng() * 0.22;
    const yOff = Math.sin(x / 180) * 8;
    const img = scene.add.image(x + rng() * 18, baseY + 18 + yOff, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setTint(0x9cb5a6);
    img.setScrollFactor(scrollMid);
    img.setDepth(DEPTH.FOREST - 1);
  }

  // 3. Foreground detailed forest layer
  const maxFrontX = 1950;
  for (let x = -80; x < maxFrontX; x += 44) {
    const rVal = rng();
    const tex = rVal > 0.75 ? 'tree-broadleaf-v3' : (rVal > 0.38 ? 'tree-conifer-v3-0' : 'tree-conifer-v3-1');
    const s = 0.68 + rng() * 0.32;
    const img = scene.add.image(x + rng() * 20, baseY + 32, tex);
    img.setOrigin(0.5, 0.95);
    img.setScale(s);
    img.setScrollFactor(scrollFront);
    img.setDepth(DEPTH.FOREST);
  }

  // 4. Full-scale roadside trees firmly rooted into the terrain shoulder (1:1 world space)
  if (includeRoadside && terrain) {
    for (let x = 160; x < terrain.terrainWidth - 400; x += 145) {
      const tx = x + (rng() - 0.5) * 45;
      // Anchor deep enough into the sloped shoulder so trunk never floats on steep hills
      const yLeft = terrain.getHeightAtX(tx - 10);
      const yRight = terrain.getHeightAtX(tx + 10);
      const ty = Math.max(yLeft, yRight) + 18;

      const rVal = rng();
      const tex = rVal > 0.74 ? 'tree-broadleaf-v3' : (rVal > 0.36 ? 'tree-conifer-v3-0' : 'tree-conifer-v3-1');
      const s = 0.88 + rng() * 0.45;
      const tree = scene.add.image(tx, ty, tex);
      tree.setOrigin(0.5, 0.95);
      tree.setScale(s);
      tree.setDepth(DEPTH.TERRAIN_BG - 2);
    }
  }
}

/**
 * Generates silky-smooth, photorealistic volumetric cumulus clouds using
 * multi-scale radial gradient atmospheric billows with zero rectangular clipping.
 */
export function createRealisticCloud(scene, x, y, {
  scale = 1,
  alpha = 0.95,
  scrollFactor = 0,
  depth = DEPTH.CLOUDS,
  seed = 1,
} = {}) {
  const variant = Math.abs(seed) % 4;
  const key = `cloud-volumetric-v3-${variant}`;
  const cw = 380;
  const ch = 190;

  getOrCreateCanvasTexture(scene, key, cw, ch, (ctx, w, h) => {
    const rng = createRng(400 + variant * 83);
    const cx = w / 2;
    const cy = h * 0.58;

    // Helper to stamp a soft, radially-feathered cloud puff (guaranteed zero hard edge)
    const stampPuff = (px, py, rx, ry, r, g, b, centerAlpha) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, ry / rx);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grd.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, ${centerAlpha})`);
      grd.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${(centerAlpha * 0.62).toFixed(3)})`);
      grd.addColorStop(0.78, `rgba(${r}, ${g}, ${b}, ${(centerAlpha * 0.18).toFixed(3)})`);
      grd.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Define major cumulus cauliflower turrets well inside the 380x190 canvas bounds
    const turrets = [
      { ox: -78, oy: 12, r: 44 },
      { ox: -42, oy: -8, r: 54 },
      { ox: 4, oy: -22, r: 62 },
      { ox: 48, oy: -4, r: 50 },
      { ox: 82, oy: 14, r: 42 },
    ];

    // 1. Soft outer atmospheric vapor mist halo
    for (const t of turrets) {
      stampPuff(cx + t.ox, cy + t.oy, t.r * 1.35, t.r * 0.95, 225, 236, 248, 0.18);
    }

    // 2. Deep slate-blue ambient-occluded cloud base (flat cumulus underside)
    for (let i = 0; i < 22; i++) {
      const u = (i / 21) * 2 - 1;
      const px = cx + u * 96 + (rng() - 0.5) * 18;
      const py = cy + 16 + (rng() - 0.5) * 8;
      const rad = (28 + (1 - Math.abs(u) * 0.5) * 22) * (0.85 + rng() * 0.25);
      stampPuff(px, py, rad * 1.25, rad * 0.65, 128, 148, 174, 0.26);
    }

    // 3. Cool pearl-grey mid-cloud volume billows
    for (const t of turrets) {
      for (let j = 0; j < 7; j++) {
        const ang = rng() * Math.PI * 2;
        const dist = rng() * t.r * 0.45;
        const px = cx + t.ox + Math.cos(ang) * dist;
        const py = cy + t.oy + Math.sin(ang) * dist * 0.75;
        const rad = t.r * (0.65 + rng() * 0.35);
        stampPuff(px, py, rad, rad * 0.82, 184, 200, 218, 0.32);
      }
    }

    // 4. Crisp, bright sunlit cumulus cauliflower domes (shifted toward upper-left sun)
    for (const t of turrets) {
      for (let j = 0; j < 9; j++) {
        const ang = -Math.PI * 0.65 + (rng() - 0.5) * 1.8;
        const dist = rng() * t.r * 0.48;
        const px = cx + t.ox - 5 + Math.cos(ang) * dist;
        const py = cy + t.oy - 6 + Math.sin(ang) * dist * 0.75;
        const rad = t.r * (0.48 + rng() * 0.36);
        stampPuff(px, py, rad, rad * 0.85, 244, 248, 254, 0.42);
      }
    }

    // 5. Brilliant warm solar rim-highlights on upper-left turret crests
    for (const t of turrets) {
      stampPuff(
        cx + t.ox - t.r * 0.22,
        cy + t.oy - t.r * 0.26,
        t.r * 0.62,
        t.r * 0.48,
        255,
        254,
        248,
        0.52
      );
    }
  });

  const img = scene.add.image(x, y, key);
  img.setScrollFactor(scrollFactor);
  img.setDepth(depth);
  img.setScale(scale);
  img.setAlpha(alpha);
  return img;
}
