# AGENTS.md

2D physics driving game ("Mountain Rider"): a React UI shell over a Phaser game canvas using Matter.js physics. All visuals are code-drawn with `Phaser.Graphics` — no image assets.

## Commands
- `npm run dev` — Vite dev server (default port 5173; `vite.config.js` sets no port)
- `npm run build` — production build to `dist/`
- `npm run lint` — **oxlint** (not eslint); passes with pre-existing warnings, don't chase them
- No tests and no typecheck script exist.

## Stack warning
- Uses **Phaser 4** (`phaser@^4.2.0`), despite `README.md` / `PROJECT_WORKFLOW.md` saying "Phaser 3". Most online Phaser docs target v3 and will mislead you. Matter.js is the physics engine (`physics.default: 'matter'` in `src/game/Game.js`).

## Architecture: React ↔ Phaser bridge
- `src/App.jsx` boots the game in a `useEffect` via `initGame('game-container', { setGameState, setStats })`.
- `src/game/Game.js` stores those React state setters in the Phaser **registry**; scenes fetch them with `this.registry.get('setGameState')` / `('setStats')`.
- Game state lives in React: `menu` → `playing` → `gameover` / `victory`. Scenes call the setters, then `GameScene` calls `this.scene.pause()`.
- Restart: `App.jsx` `handleRestart` → `scene.scene.restart()` on GameScene.
- Scene flow: `BootScene` → `PreloadScene` → `MenuScene` → `GameScene` (started from `App.jsx` `handleStart`).

## Key files
- `src/game/utils/constants.js` — master config (physics values, render depths, colors). Tune gameplay here: gravity, torque, suspension stiffness/damping, air rotation.
- `src/game/objects/Buggy.js` — chassis + wheels + spring constraints, input handling, upside-down detection.
- `src/game/objects/Terrain.js` — procedural sine-wave terrain, rocks, finish zone with the victory sensor (`label: 'finish'`).
- `src/game/scenes/GameScene.js` — game loop, HUD stats, crash/victory triggers.

## Gotchas
- `public/assets/images/*.png` (buggy/cloud/forest) and `src/assets/` are unused leftovers, referenced nowhere. Keep everything code-drawn.
- `PreloadScene` creates a 1px placeholder canvas texture because Phaser won't fire load-progress events without any `this.load` calls.
- Buggy physics dimensions (chassis size, wheel radius/offsets) are **hardcoded in the `Buggy` constructor**, not in constants.js. Changing them requires updating the graphics in `createChassisTexture()` / `createWheelTexture()` to match.
- `main.jsx` uses `React.StrictMode`, so effects run twice in dev; `initGame` destroys any existing game instance first — that's expected, not a leak to fix.
- Crash rule: staying upside-down (>120° tilt) for 3 seconds triggers game over (`Buggy.update()`).
- Only `src/index.css` is imported; `src/App.css` is dead code.
