# 🏔️ Mountain Rider — Project Workflow & Complete Code Walkthrough

This document explains the entire project file by file: what every file does, what every function does, *why* it exists, how the pieces connect, and exactly what to edit to change the visuals or the physics.

> **Read this first:** the game is drawn **100% with code** (`Phaser.Graphics`). There are no image assets anywhere in the game. Even though `public/assets/images/` contains `buggy.png`, `cloud.png`, and `forest.png`, those are unused leftovers and are never loaded. If you want to change how anything *looks*, you edit drawing code — never image files.

---

## 1. The Big Picture

The game is split into **two worlds that talk to each other**:

| Layer | Technology | Responsibility |
|---|---|---|
| UI shell | React (`src/App.jsx`) | Menus, HUD (distance/time/speed), game-over & victory screens |
| Game engine | Phaser 4 (`src/game/`) | Rendering, camera, scenes, physics via Matter.js |

- **React** owns everything *outside* the canvas: buttons, overlays, and the game state machine (`menu → playing → gameover/victory`).
- **Phaser** owns everything *inside* the canvas: the buggy, terrain, mountains, clouds, particles, and physics.
- **Matter.js** is the physics engine (rigid bodies, spring constraints, collisions, torque). It ships *built into* Phaser and is enabled with `physics.default: 'matter'`.

The two communicate through **Phaser's Registry** — a tiny key/value store on the game instance. React drops its state-updater functions into the registry, and Phaser scenes call them whenever something the UI cares about happens.

---

## 2. Startup Flow (from browser to game)

```
index.html
   └─ loads /src/main.jsx            (React entry)
        └─ renders <App/> in #root   (React.StrictMode)
             └─ App useEffect → initGame('game-container', { setGameState, setStats })
                  └─ Game.js creates the Phaser.Game instance
                       └─ scene flow: BootScene → PreloadScene → MenuScene → GameScene
```

The React app mounts, and inside its `useEffect` it tells Phaser to boot. Phaser runs its own scene pipeline. The menu scene sits behind the React menu overlay; when the player clicks **Start Engine**, React tells `MenuScene` to switch to `GameScene`.

---

## 3. File-by-File Walkthrough

---

### 3.1 `index.html`

The Vite HTML shell. It has one empty `<div id="root">` (React mounts here) and loads `/src/main.jsx` as a module.

---

### 3.2 `src/main.jsx` — React entry point

```js
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

**What it does:** mounts the whole app and imports the styles (`./index.css`).

**Why `React.StrictMode`?** In dev, StrictMode deliberately runs effects twice (mount → unmount → mount). That means `App.jsx`'s `useEffect` calls `initGame` twice. This is *handled* — see `Game.js` below, which destroys the first game before creating the second. **Do not "fix" this; it is expected behavior.**

---

### 3.3 `src/App.jsx` — the React UI shell

**State it owns (this is the master game state):**
- `gameState` — `'menu' | 'playing' | 'gameover' | 'victory'`. This single value decides which overlay React shows.
- `stats` — `{ distance, time, speed }`, updated ~every frame from Phaser.

**Functions:**

- **`useEffect(...)` (boot):**
  ```js
  const game = initGame('game-container', { setGameState, setStats });
  gameRef.current = game;
  return () => game.destroy(true);
  ```
  Boots Phaser once, stores the instance in a ref, and destroys it on unmount (the StrictMode double-run relies on this cleanup).

- **`handleStart()`** — called by the Start button. Sets state to `'playing'`, grabs `MenuScene` and tells it to `scene.start('GameScene')`. *Why:* the actual gameplay is a Phaser scene; React just pulls the trigger.

- **`handleRestart()`** — called by Try Again / Play Again. Sets `'playing'` and calls `scene.restart()` on `GameScene`. `scene.restart()` re-runs `GameScene.create()` from scratch (fresh terrain, fresh buggy). *Why:* no page reload needed; Phaser tears down and rebuilds the scene.

**What it renders:**
- `<div id="game-container" />` — Phaser mounts its canvas here (this is the `parent` in Game.js config).
- HUD (`gameState === 'playing'`): three glass panels showing Distance / Time / Speed, reading from `stats`.
- Menu overlay: title, Start button, controls hint.
- Game-over overlay: "Crashed!" + final distance/time + Try Again.
- Victory overlay: "Victory!" + final stats + Play Again.

**Why this split:** React is far better at DOM/CSS overlays than Phaser. The HUD is styled by `src/index.css` (glassmorphism, key badges, buttons). `src/App.css` is **dead code** — only `src/index.css` is imported.

---

### 3.4 `src/game/Game.js` — the Phaser bootstrap + bridge

**The config object** (global, module-level):
```js
const config = {
  type: Phaser.AUTO,        // WebGL when available, Canvas fallback
  width: GAME_WIDTH,        // 1280
  height: GAME_HEIGHT,      // 720
  parent: 'game-container', // where the <canvas> is injected
  transparent: true,        // no opaque background; React CSS shows behind/around
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'matter', matter: { gravity: { y: PHYSICS.GRAVITY_Y }, debug: false } },
  scene: [BootScene, PreloadScene, MenuScene, GameScene],
};
```
- `physics.default: 'matter'` is the single most important line: **all `this.matter` calls in the rest of the code work because of this.**
- `matter.debug: false` hides physics wireframes. Set it `true` to visualize bodies while tuning.

**`initGame(parent, reactHooks)`** (the exported function):
```js
let game = null;
export default function initGame(parent, reactHooks) {
  if (game) game.destroy(true);          // kill any previous instance (StrictMode!)
  const customConfig = { ...config, parent };
  game = new Phaser.Game(customConfig);
  game.registry.set('setGameState', reactHooks.setGameState);
  game.registry.set('setStats', reactHooks.setStats);
  return game;
}
```

**Why the Registry bridge:** Phaser scenes cannot import React, and React cannot call into Phaser scenes without a reference. The registry is Phaser's built-in shared store, so:
1. `App.jsx` → passes its real `setState` functions into `game.registry`.
2. Scenes → read them back with `this.registry.get('setGameState')` and call them.

That is the entire "bridge". Nothing else couples React and Phaser.

---

### 3.5 `src/game/utils/constants.js` — the master config file

This file is imported by almost every game module. **Tune the game here first.**

```js
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
```
Canvas size, also used by the scale mode.

**`PHYSICS`** — every physics number in the game:
- `GRAVITY_Y: 0.9` — Matter gravity multiplier (Phaser's Matter default is 1). Lower = moon-like.
- `BUGGY.{MASS, FRICTION, RESTITUTION}` — chassis body properties.
- `WHEEL.{MASS, FRICTION, RESTITUTION, DENSITY}` — `FRICTION: 1.0` = maximum grip.
- `SUSPENSION.{STIFFNESS, DAMPING, LENGTH}` — the spring constraints between chassis and wheels.
- `CONTROLS.{SPEED, AIR_ROTATION}` — wheel torque when accelerating, and how fast the chassis rotates mid-air.

**`DEPTH`** — the render z-order (higher = drawn on top):
`SKY(0) → CLOUDS(10) → MOUNTAINS_FAR(15) → MOUNTAINS_NEAR(18) → FOREST(20) → TERRAIN_BG(40) → TERRAIN_FG(50) → OBSTACLES(60) → BUGGY(70) → PARTICLES(80)`.
Layers that "feel" far away get lower depth and a small `scrollFactor` (parallax).

**`COLORS`** — every hex color used by the drawing code, named by purpose (`GRASS_TOP`, `BUGGY_BODY`, `WHEEL_RIM`, `ROCK`, `DUST_*`, `MOSS`, ...). Sky gradient colors are stored as `#rrggbb` strings, everything else as `0xrrggbb` numbers.

**Why it exists:** without it, colors and physics numbers would be scattered and duplicated across every drawing method. One change here ripples through the whole game.

---

### 3.6 `src/game/scenes/BootScene.js`

```js
preload() { /* intentionally empty */ }
create()  { this.scene.start('PreloadScene'); }
```

**What it does:** the very first scene. Nothing to load, so it immediately hands off to the loading scene.

**Why it exists:** it's the conventional Phaser entry point and gives a guaranteed place to load boot-critical assets if you ever add any. Currently it's just a pass-through.

---

### 3.7 `src/game/scenes/PreloadScene.js`

This scene shows the "Loading..." screen.

**`preload()`:**
1. Draws the loading screen with graphics: dark background, rounded progress-bar tray, "Loading..." text.
2. Registers `this.load.on('progress', ...)` to re-draw the bar fill at the current fraction (0→1), and `this.load.on('complete', ...)` to destroy the loading graphics.
3. **The subtle trick:** the game has *no* assets to load, but Phaser only fires `progress`/`complete` events if there is at least one `this.load` operation. So it fakes one:
   ```js
   const canvas = document.createElement('canvas');
   canvas.width = 1; canvas.height = 1;
   this.textures.addCanvas('placeholder', canvas);
   ```

**Why this matters:** remove that placeholder and the loading bar would freeze (no events fire) — but since there are no real assets, the bar still completes instantly. Keep the placeholder.

**`create()`:** `this.scene.start('MenuScene')`.

---

### 3.8 `src/game/scenes/MenuScene.js` — the animated background behind the menu

**`create()`** builds the whole intro backdrop with code:

1. **Sky gradient** — creates a *texture* (not graphics) with a vertical `createLinearGradient` from `#1565c0` → `#42a5f5` → `#e3f2fd`, then adds it as a full-screen image.
   ```js
   const skyKey = 'menu-sky-' + Date.now();  // unique key so restarts don't clash
   const skyTex = this.textures.createCanvas(skyKey, w, h);
   const ctx = skyTex.getContext();
   // ... draw gradient into ctx, then skyTex.refresh()
   this.add.image(w / 2, h / 2, skyKey);
   ```
   *Why a texture and not `Graphics`?* Gradients are easy on a raw 2D canvas context but tedious with `Graphics` shapes.

2. **Far + near mountain silhouettes** — a single `Graphics` object:
   - Generates points along `Math.sin(x/150)*50 + Math.sin(x/60)*20` (far) and `Math.sin(x/100)*30 + Math.cos(x/200)*25` (near).
   - Fills polygons down to the bottom edge.
   - Then draws a darker "shadow face" on the right side of every peak (where `prev.y > curr.y && next.y > curr.y`) to fake a sun-lit ridge.

3. **5 floating clouds** via `drawMenuCloud()` (see below).

**`drawMenuCloud(x, y)`** — draws one puffy cloud out of rounded rects + circles:
- A bluish "shadow" silhouette slightly offset, then a white body on top.
- Random scale `s` (0.5–1.2) for variety.
- *Why rounded rects + circles?* A cloud is just a rounded box with three circles for puffs; it's the cheapest convincing cloud.

> **Graphics tip:** the menu scene's mountains/clouds are *not* the same code as the in-game ones. In-game layers live in `GameScene` (3.10) and use `setScrollFactor` for parallax; the menu versions are static.

---

### 3.9 `src/game/scenes/GameScene.js` — the gameplay scene

This is the heart of the game. It sets up the world, owns the loop, and triggers win/lose.

**`create()`:**
```js
this.isGameOver = false; this.isVictory = false;      // locks the update loop
this.startTime = this.time.now;                        // for the HUD timer
this.setGameState = this.registry.get('setGameState'); // pull React setters out of
this.setStats = this.registry.get('setStats');         // the Phaser registry
this.createBackground();                               // sky + parallax mountains + forest
this.terrain = new Terrain(this);                      // world ground, rocks, finish
this.buggy = new Buggy(this, 250, 350);                // spawn the player car
this.cameras.main.setBounds(0, 0, this.terrain.terrainWidth + 200, 1500);
this.cameras.main.startFollow(this.buggy.chassisSprite, true, 0.06, 0.06, -80, 40);
this.matter.world.on('collisionstart', this.handleCollisions, this);
this.clouds = []; this.spawnClouds();
this.dustParticles = [];
```

**Why each line:**
- `registry.get(...)` is the React↔Phaser bridge (section 3.4).
- Camera bounds = terrain length (+200 slack), height 1500. The camera **follows the chassis sprite** with a gentle lerp (0.06) and an offset of `-80, +40` — the buggy sits left-of-center, slightly high, so you can see what's ahead.
- `collisionstart` listener: the win condition is a collision, not a check in the loop.

**`createBackground()`** — three background systems:
1. **Sky gradient texture** — same technique as MenuScene but colors come from `COLORS.SKY_TOP/BOTTOM`. Set `scrollFactor(0)` so it stays glued to the screen.
2. `drawMountainLayer(COLORS.MOUNTAIN_FAR, 0.08, DEPTH.MOUNTAINS_FAR, 1, 100, 280)` and `drawMountainLayer(COLORS.MOUNTAIN_NEAR, 0.15, DEPTH.MOUNTAINS_NEAR, 2, 120, 320)` — two parallax ridge layers.
3. `drawForestLayer(w, h)` — a pine forest band.

**`drawMountainLayer(color, scrollFactor, depth, alpha, amplitude, baseY)`** — draws one parallax mountain row:
- Samples points every 15px across a 6000px-wide strip using three summed sines/cosines.
- Fills a polygon from `-200` to `totalW` down to `baseY + amplitude + 200`.
- Adds a darker shadow face on the right of each peak (same trick as the menu).
- **`setScrollFactor(scrollFactor)` is what creates depth** — 0.08 rows move slower than the camera than 0.15 rows, which move slower than the terrain itself.

**`drawForestLayer(w, h)`** — draws two rows of pine trees + bushes + ground band, all with `Graphics`:
- A back row (`scrollFactor 0.17`, lighter green, spacing 55px).
- A main row (`scrollFactor 0.2`, spacing 38px): trunk rect, three stacked triangles of darkening greens for a pine silhouette, a highlight triangle on the upper-left, plus scattered bushes and grass tufts.
- *Why triangles?* Layered triangles are the cheapest way to fake a pine tree.

**`spawnClouds()` / `createCloudGraphic(x, y)`** — spawns 8 drifting clouds:
- `createCloudGraphic` draws a shadow+body cloud (like the menu one) at a random scale, sets `scrollFactor(0)` (fixed to the screen), random alpha.
- Each gets a random `speedX`; `update()` moves them right and wraps them.

**`emitDust(x, y)`** — when accelerating, spawns 4 small colored circles behind the rear wheel with random drift/float values and stores them in `this.dustParticles`. The loop updates/fades/grows them.

**`handleCollisions(event)`** — the win check:
```js
if ((bodyA.label === 'chassis' && bodyB.label === 'finish') || ...) this.triggerVictory();
```
Every Matter body has a `label`. The terrain pieces are labeled `'terrain'`, rocks `'obstacle'`, the wall `'wall'`, the buggy chassis `'chassis'`, and the invisible finish sensor `'finish'`. *Why labels?* Collision events give you pairs of bodies; labels are how you tell which thing hit which.

**`triggerVictory()` / `triggerGameOver()`** — identical shape:
```js
this.isVictory = true;                 // lock the update loop
this.setGameState('victory');          // tell React to swap the overlay
this.scene.pause();                    // freeze the game world
```
Pausing the scene stops all updates/rendering while React shows the result screen. Restart works because `scene.restart()` re-creates the scene in an un-paused state.

**`update(time, delta)`** — the per-frame game loop:
1. `this.buggy.update(delta)` → returns stats (position/distance/speed/isAccelerating/crashed).
2. If `stats.crashed`, call `triggerGameOver()`.
3. Drift the clouds right, wrap past 1400.
4. If accelerating, emit dust from the rear wheel position; then update every dust particle (age → scale up, fade out, destroy after 700ms).
5. Push HUD numbers to React:
   ```js
   dist = (stats.distance - 250) / 100;   // distance in "meters", spawn at x=250
   elapsed = (time - this.startTime) / 1000;
   speed = Math.abs(stats.speed) * 3.6;   // px/s → km/h
   this.setStats({ distance, time, speed });
   ```

---

### 3.10 `src/game/objects/Buggy.js` — the player's car

This is the biggest file and the most fun to modify. It builds the physics car (chassis + 2 wheels + 2 spring constraints), draws it, handles input, and detects crashes.

**The constructor — hardcoded geometry (important!):**

```js
const chassisW = 120;   // chassis body width
const chassisH = 24;    // chassis body height
const wheelRadius = 22; // wheel radius
const wheelOffsetX = 50;// wheel distance from center
const wheelOffsetY = 18;// wheel drop below chassis center
```

These are **hardcoded, not in constants.js.** If you change them, you must also update the matching drawing code (`createChassisTexture` uses `w`/`h`, `createWheelTexture` uses `r`, and the fenders' arcs in the chassis drawing use `50`/`18`/`28`). See section 4.2.

**Physics bodies:**
1. **Chassis** — `scene.matter.add.rectangle(x, y, 120, 24, {...})` with mass/friction/restitution from constants, a chamfer so it's a rounded rect, and `label: 'chassis'` (used by the win check).
2. **Center of mass** — `scene.matter.body.setCentre(this.chassis, { x: 0, y: 6 }, true)` shifts CoM *down* so the buggy naturally tries to right itself. *Why:* a real buggy's weight sits low; this makes it far less tippy.
3. **Wheels** — two circles (`wheelA` rear, `wheelB` front) at `±wheelOffsetX`, `+wheelOffsetY`, with `friction: 1.0` for grip.
4. **Suspension** — two spring constraints:
   ```js
   scene.matter.add.constraint(this.chassis, this.wheelA, len, stiff, {
     pointA: { x: -wheelOffsetX, y: wheelOffsetY },
     damping: damp,
     render: { visible: false }
   });
   ```
   `length`, `stiffness`, `damping` come from `PHYSICS.SUSPENSION`. The `pointA` offsets matter — the spring attaches at the wheel point *on the chassis*, so it behaves like a suspension arm. `render.visible: false` hides the debug line.

**Visuals — `createChassisTexture(scene, w, h)`:**

This method draws the entire car body with `Graphics` and returns it (it's positioned/rotated every frame in `update()`). The layers, bottom-to-top:

1. **Drop shadow** — a translucent black rounded rect below the body.
2. **Rear engine block** — dark grey rounded rect + exhaust pipes (tiny rects/circles at the back-left).
3. **Main body** — dark red base, red fill, bright accent strip on top, white racing stripe with a black divider.
4. **Cockpit** — drawn as polygons: dark outline, red fill, blue windows (`fillStyle(0x81d4fa, 0.7)`), a pillar line, a white window shine, and a black roll cage (stroked lines).
5. **Front bumper** — a stroked polyline of dark lines at the front-right.
6. **Fenders** — two stroked arcs (`g.arc(-50, 18, 28, Math.PI, 0, false)`) at the wheel positions, dark base + red accent.
7. **Headlight** — housing + yellow circle + white highlight. **Tail light** — red rounded rect at the rear.

**Why so many small shapes?** Each one is a "cheap" `Graphics` primitive. Combined, they read as a detailed off-road buggy without a single texture. To restyle the car, edit *these* fills/lines — the coordinates are all relative to the chassis center (the graphics object is placed at the body position each frame).

**Visuals — `createWheelTexture(scene, r)`:**

Draws one wheel at radius `r`:
1. Black tire circle.
2. 8 tread nubs (`lineBetween` at radius `r-6`→`r+1`).
3. Dark inner rubber, grey rim, rim shadow.
4. Red hub, 5 light spokes (lines from center at `r*0.4`), center bolt.

**Why the wheels and chassis are separate graphics objects:** the wheel sprites are positioned/rotated from the *wheel bodies* (`wheelA.position/angle`) every frame, so they visibly spin and bob with the suspension. Chassis and wheels must be independent to make that work.

**`update(delta)`:**

1. **Sync visuals → physics:** copy each body's position and rotation onto its sprite.
2. **Self-righting torque:** every frame, damp angular velocity and add a small restoring torque proportional to current tilt:
   ```js
   MBody.setAngularVelocity(this.chassis,
     this.chassis.angularVelocity * (1 - 0.04) - currentAngle * 0.002);
   ```
   *Why:* otherwise a minor roll would never recover on its own. This is what lets the player recover from a bad landing.
3. **Input:**
   ```js
   if (cursors.right.isDown || keys.D.isDown) {
     MBody.setAngularVelocity(this.wheelA, accel);   // spin the wheels → drive
     MBody.setAngularVelocity(this.wheelB, accel);
     MBody.setAngularVelocity(this.chassis, this.chassis.angularVelocity + airRot * 0.06); // tilt in air
   }
   ```
   The wheels are spun directly via `setAngularVelocity` (the friction with the ground does the rest — this is why `WHEEL.FRICTION: 1.0` matters). The tiny chassis spin adds air control so you can rotate the car mid-jump.
4. **Upside-down detection:**
   ```js
   const deg = Phaser.Math.RadToDeg(this.chassis.angle) % 360;
   const norm = deg < 0 ? deg + 360 : deg;
   if (norm > 120 && norm < 240) this.upsideDownTimer += delta; else this.upsideDownTimer = 0;
   ```
   The chassis angle is normalized to 0–360; if it's between 120° and 240° the buggy is (roughly) inverted, and a timer accumulates.
5. **Returns stats** to `GameScene.update()`: `{ position, distance: x, speed: vx, isAccelerating, crashed: upsideDownTimer > 3000 }`. Crash = 3 full seconds inverted.

---

### 3.11 `src/game/objects/Terrain.js` — the whole world

**Constructor:**
```js
this.terrainWidth = 3800;    // track length in px — longer = longer race
this.segmentLength = 40;     // physics segment resolution
this.points = [];            // heightmap {x,y}
this.bodies = [];            // physics segment bodies
this.generateTerrain();      // 1. build the heightmap
this.drawTerrain();          // 2. draw it + create physics
this.addObstacles();         // 3. rocks
this.addFinishZone();        // 4. finish platform, flag, sensor
```

**`generateTerrain()`** — builds the heightmap first (pure math, no drawing):

```js
const startY = 500;
const finishZoneStart = this.terrainWidth - 500; // last 500px flatten to a finish
const hillY = startY + Math.sin(x/350)*60 + Math.sin(x/180)*30 + Math.cos(x/90)*10 + (Math.random()-0.5)*4;
```

Then it shapes the ride in four zones:
- `x < 400` → **flat starting zone** (y = 500).
- `400–800` → **smooth ease-in** to the hills (smoothstep: `t*t*(3-2t)`).
- `800 → finishZoneStart` → full sine/cosine hills (amplitude up to ±100px).
- `≥ finishZoneStart` → **ease back to flat** so the finish platform sits level.
- Finally `y = Phaser.Math.Clamp(y, 300, 620)` keeps everything on screen.

*Why a heightmap first?* Every drawing layer (dirt, grass, pebbles, blades) and every physics segment is derived from the same `points` array, so everything lines up perfectly. Change one formula here and the whole track changes consistently.

**`drawTerrain()`** — draws + physics, bottom to top:

*Drawing layers (all `Graphics`, using `DEPTH.TERRAIN_BG`/`TERRAIN_FG` + fractional offsets to stack):*
1. **Deep earth** — big dark polygon down to `y=1200`.
2. **Mid dirt / upper dirt** — brown bands following the heightmap +35/+85 and +12/+40.
3. **Soil texture** — random horizontal grain lines and root-like marks.
4. **Pebbles** — small light/dark circles with highlights, scattered below the surface.
5. **Green grass body** — the visible turf polygon (`TERRAIN_FG`).
6. **Transition band** — dark green strip under the grass edge.
7. **Grass top strips** — thick stroked paths right on the surface line (dark, then bright) for a crisp edge.
8. **Grass blades** — ~4 blades per segment, random height/lean/color, the topmost layer.

*Physics (at the end):*
```js
for (each point pair) {
  const seg = this.scene.matter.add.rectangle(cx, cy + 20, len + 2, 40, {
    isStatic: true, angle, friction: 0.9, restitution: 0.05, label: 'terrain'
  });
}
```
One static rectangle per 40px segment, rotated to the slope, sitting 20px under the surface. **Why segments instead of one big polygon?** A chain of rotated boxes is what lets the buggy ride smoothly over crests and dips; Matter also handles it more cheaply. `label: 'terrain'` keeps it out of the win check.

**`addObstacles()` / `drawRock(x, y, r, seed)`** — 3 rocks at `[1200, 2000, 2600]`, radii `[18, 15, 20]`:
- `getHeightAtX(rx)` finds the terrain height so the rock sits *on* the ground.
- Draws a shadow ellipse, then a seeded irregular 8-sided polygon (the `seed` varies each rock deterministically via `Math.sin(seed*100 + i*37)`), a darker base, a lighter upper-left face, a specular highlight, crack lines, and moss ellipses.
- Adds a **static circle physics body** (`label: 'obstacle'`) at `r*0.85` so the buggy bumps into it.

**`addFinishZone()`** — the end of the track:
1. **Asphalt strip + checkered ground** on the flattened finish area.
2. **End wall** (visual + a static physics box, `label: 'wall'`) so the buggy can't drive off the world.
3. **Flag pole + base + ball**, and a **checkered flag** drawn as a 4×5 grid of alternating white/red cells.
4. **Banners** (four pennants) via `drawBanner(g, x, groundY, color)`.
5. **Confetti dots** — 40 small colored circles floating over the zone.
6. **"🏁 FINISH" text** — a Phaser `Text` object (the only text in the game world).
7. **Start arch** — two pillars + a checkered top bar.
8. **The victory sensor** — *the* critical piece:
   ```js
   this.finishSensor = this.scene.matter.add.rectangle(flagX, fy - 60, 80, 180, {
     isStatic: true, isSensor: true, label: 'finish'
   });
   ```
   An invisible, static, non-colliding body labeled `'finish'`. When the chassis touches it, `GameScene.handleCollisions` fires → victory.

**`getHeightAtX(x)`** — linear-interpolates the heightmap between two known points. Used by the rocks so they land on the ground. If you move `terrainWidth` or change the hill formula, everything that calls this still works automatically.

---

## 4. What to Change for Graphics (the "how do I make it look different?" guide)

Everything below is **code**. There are no sprites to swap.

### 4.1 Change colors → `src/game/utils/constants.js`
- Sky top/bottom, grass, dirt, rock, buggy body, wheel rims, dust, moss — all in `COLORS`.
- Example: `BUGGY_BODY: 0xd32f2f` → `0x2196f3` makes the car blue (in 2 places, since `BUGGY_BODY_DARK` and `BUGGY_ACCENT` are separate shades).

### 4.2 Restyle the buggy → `Buggy.js`
- **Body/cockpit/engine/bumpers/fenders/headlight:** edit the drawing calls inside `createChassisTexture()`. All coordinates are relative to the chassis center. Fender arcs are hardcoded to `(±50, 18, r=28)` and the wheels sit at `±50` — if you move the wheels, move the fenders too.
- **Wheels:** edit `createWheelTexture()` (tread nubs, rim color, spokes, hub).
- **Size/positions:** change the constructor constants `chassisW/chassisH/wheelRadius/wheelOffsetX/wheelOffsetY`. **Rule:** physics size and drawing must agree — the graphics use `w`, `h`, `r` passed in, and the fender arcs + engine coordinates use the same offsets. If they drift apart, the body won't line up with the wheels.

### 4.3 Redesign the terrain look → `Terrain.js` `drawTerrain()`
- Grass/dirt band colors, blade density (the `b < 4` loop), pebble frequency, soil texture lines — all tweakable there.
- **Track shape/length** → `generateTerrain()`: `terrainWidth` (length), `startY` (height), the `Math.sin`/`Math.cos` coefficients (hill amplitude/frequency), the flat-zone boundaries (400/800/`finishZoneStart`). The physics automatically follows the new shape.

### 4.4 Change the background → `GameScene.js`
- **Sky gradient colors:** `COLORS.SKY_TOP/SKY_BOTTOM` (used in `createBackground`).
- **Mountain silhouette shape:** `drawMountainLayer()` — tune `amplitude`, `baseY`, and the sine frequencies; add a third layer by copying the call.
- **Parallax speed:** the `scrollFactor` args (0.08 / 0.15) — larger = moves faster with the camera.
- **Forest:** `drawForestLayer()` — tree spacing (38/55), tree heights, the green palette (currently hardcoded hexes, not `COLORS`).

### 4.5 Menu background → `MenuScene.js` `create()` / `drawMenuCloud()`
- Sky gradient stops, mountain formulas, cloud count/scale — all here, independent of the gameplay background.

### 4.6 Layer order → `DEPTH` in `constants.js`
If a graphic is hidden behind another, adjust these values. They're already ordered so that background < terrain < buggy < particles.

---

## 5. What to Change for Physics → `constants.js` `PHYSICS`

| Constant | Effect |
|---|---|
| `GRAVITY_Y` | Global gravity (0.9 is floaty, 1.0–1.2 is heavier) |
| `CONTROLS.SPEED` | Wheel spin torque — acceleration & hill-climbing power |
| `CONTROLS.AIR_ROTATION` | How fast the car tilts mid-air (A/D while airborne) |
| `SUSPENSION.STIFFNESS / DAMPING / LENGTH` | Bounciness of landings |
| `BUGGY.MASS` vs `WHEEL.MASS` | Car weight / wheel grip balance |
| `WHEEL.FRICTION` | Grip (1.0 = maximum; lower = slides) |

Two things *not* in constants:
- **Self-righting torque** (`correctionStrength` / `angularDamping`) is hardcoded in `Buggy.update()`.
- **Crash rule** (3 seconds inverted, threshold 120°–240°) is hardcoded in `Buggy.update()`.

---

## 6. Game States & Restart Flow

```
'playing' ── buggy upside-down 3s ──▶ triggerGameOver → setGameState('gameover') → scene.pause()
'playing' ── chassis hits 'finish' sensor ──▶ triggerVictory → setGameState('victory') → scene.pause()
```

- **Try Again / Play Again** → `App.jsx handleRestart` → `GameScene.scene.restart()` → everything rebuilt in `create()`.
- **Start Engine** → `App.jsx handleStart` → `MenuScene.scene.start('GameScene')`.

React renders the correct overlay purely from `gameState`; Phaser keeps running (or is paused) underneath.

---

## 7. Quick Reference — File Responsibilities

| File | Owns |
|---|---|
| `src/main.jsx` | React mount + StrictMode |
| `src/App.jsx` | UI, game-state machine, HUD, boot/restart buttons |
| `src/game/Game.js` | Phaser instance + registry bridge |
| `src/game/utils/constants.js` | Size, physics, depth, colors |
| `scenes/BootScene.js` | Entry → PreloadScene |
| `scenes/PreloadScene.js` | Loading bar + placeholder texture |
| `scenes/MenuScene.js` | Menu backdrop (sky, mountains, clouds) |
| `scenes/GameScene.js` | World setup, camera, loop, dust, win/lose |
| `objects/Buggy.js` | Car physics + drawing + input + crash check |
| `objects/Terrain.js` | Heightmap, drawing, rocks, finish zone, sensors |

## 8. Commands

```bash
npm install      # once
npm run dev      # dev server (default http://localhost:5173)
npm run build    # production build → dist/
npm run lint     # oxlint (not eslint) — pre-existing warnings are fine
```
No tests and no typecheck exist for this project.
