# Mountain Rider – Project Workflow Explanation

This document explains how the project works, step by step, so it is easy to present or explain to someone else.

---

## 1. What this project is

Mountain Rider is a 2D physics-based driving game built with:

- React for the UI and overlays
- Phaser for the game engine and scene rendering
- Matter.js physics for the buggy, wheels, collisions, and terrain interaction

The game is made mostly with code drawings, so there are no image assets for the terrain, buggy, or background.

---

## 2. High-level architecture

The project is split into three main layers:

1. React UI layer
   - Handles the menu screen, HUD, game-over screen, and victory screen.
   - Located mainly in `src/App.jsx`.

2. Phaser game layer
   - Handles the actual game canvas, camera, scenes, and visuals.
   - Located in `src/game/`.

3. Physics layer
   - Handles movement, collision, suspension, and body behavior.
   - Powered by Matter.js through Phaser.

So in simple words:
- React controls the screen outside the game
- Phaser runs the game itself
- Matter makes the vehicle and world feel physical

---

## 3. Main project structure

### `src/`
This folder contains the React app entry point and the game UI.

- `main.jsx` – starts the React app
- `App.jsx` – main UI component for menus and overlays
- `index.css` – styling for the React overlays and HUD

### `src/game/`
This folder contains the full Phaser game.

- `Game.js` – creates and initializes the Phaser game
- `utils/constants.js` – stores game-wide values like physics, colors, and depth layers
- `scenes/` – contains different game states
- `objects/` – contains game objects like the buggy and terrain

---

## 4. How the app starts

The startup flow is:

1. `index.html` loads the app
2. `src/main.jsx` mounts the React app
3. `src/App.jsx` runs
4. Inside `App.jsx`, `useEffect()` calls `initGame()` from `src/game/Game.js`
5. `Game.js` creates a Phaser game and loads the scenes

So the first real game flow is:

- `BootScene` starts
- `PreloadScene` runs
- `MenuScene` appears
- The player clicks start
- `GameScene` begins

---

## 5. How the game scenes work

### `BootScene`
- Starts the game
- Immediately moves to the preload scene

### `PreloadScene`
- Shows a loading screen
- Prepares the game environment
- Then moves to the menu scene

### `MenuScene`
- Draws the intro background
- Shows the mountain scenery and clouds
- Gives the player the start button

### `GameScene`
- Creates the playable level
- Spawns the terrain and buggy
- Starts the game loop
- Handles collisions and win/lose states

This is the core gameplay scene.

---

## 6. How React and Phaser work together

This project uses a small bridge between React and Phaser.

### In `src/game/Game.js`
The game registers two React functions into Phaser:

- `setGameState`
- `setStats`

These are passed from `App.jsx` into the Phaser game registry.

### Why this is needed
Phaser runs the game logic, but React needs to know when:
- the game starts
- the player crashes
- the player wins
- the HUD stats should change

So when a scene wants to update the UI, it calls these registered functions.

This is how the project keeps the game and UI connected.

---

## 7. What each important file does

### `src/App.jsx`
This is the main React controller for the game UI.

It is responsible for:
- showing the menu screen
- showing the HUD during play
- showing the game over and victory screens
- starting and restarting the game
- updating the visible stats like distance, time, and speed

### `src/game/Game.js`
This file is the game bootstrap file.

It is responsible for:
- creating the Phaser game instance
- loading the scenes
- supplying React state functions to Phaser

### `src/game/utils/constants.js`
This file stores global configuration values.

It contains:
- screen size
- physics values
- rendering depth values
- color palette

This file is one of the most important files in the project because many systems depend on it.

### `src/game/scenes/GameScene.js`
This is the main gameplay scene.

It handles:
- background generation
- cloud movement
- terrain creation
- buggy creation
- collision state
- victory and crash triggers
- HUD updates

### `src/game/objects/Buggy.js`
This file defines the player vehicle.

It manages:
- chassis and wheel physics bodies
- spring-based suspension
- keyboard input
- movement and rotation
- visual drawing for the buggy
- upside-down/crash detection

### `src/game/objects/Terrain.js`
This file builds the world.

It creates:
- the terrain shape
- grass and dirt layers
- rocks and obstacles
- the finish zone
- static physics bodies so the buggy can drive on the terrain

---

## 8. How the gameplay loop works

The gameplay loop is basically this:

1. `GameScene` starts
2. It creates the terrain and buggy
3. The camera follows the buggy
4. The game loop runs every frame
5. The buggy updates its physics and input
6. The scene updates the HUD values
7. If the buggy crashes, the game switches to game over
8. If the buggy reaches the finish line, the game switches to victory

### During each frame
The game updates:
- buggy position and physics
- dust particles
- clouds
- HUD stats
- collision events

So the scene is constantly syncing game logic and visuals.

---

## 9. How the player controls the buggy

The controls are simple:

- `A` or Left Arrow = reverse / rotate left
- `D` or Right Arrow = accelerate / rotate right

These inputs are captured inside `Buggy.js` and converted into physics forces.

The buggy is designed to feel like a rough off-road vehicle, so it can be unstable and challenging.

---

## 10. Game states in the app

The app uses four main states:

- `menu` – shows the start screen
- `playing` – shows the HUD and gameplay
- `gameover` – shows the crash screen
- `victory` – shows the success screen

These states are managed in `App.jsx` and updated by Phaser scenes.

---

## 11. Why the project is organized this way

This structure is helpful because:

- React handles UI smoothly
- Phaser handles real-time graphics and gameplay
- objects are separated so each part is easier to modify
- scenes make the game flow easier to manage
- constants centralize important values

That is why the project feels modular instead of being one giant file.

---

## 12. Quick explanation you can say aloud

If you want a short explanation for someone else, you can say:

> This project is a React + Phaser game. React is used for the menu and UI overlays, while Phaser runs the actual game canvas. The game world is built with procedural terrain, and the buggy uses Matter.js physics for movement and collisions. The game has scenes for menu, loading, gameplay, and result screens, and the React UI updates based on what happens inside the game.

---

## 13. Best files to edit for common changes

- Want to change the UI/menu screen? → `src/App.jsx`
- Want to change the game startup or scene flow? → `src/game/Game.js`
- Want to change physics or colors? → `src/game/utils/constants.js`
- Want to change the buggy design or movement feel? → `src/game/objects/Buggy.js`
- Want to change terrain shape, hills, or obstacles? → `src/game/objects/Terrain.js`
- Want to change background mountains or sky? → `src/game/scenes/GameScene.js` and `src/game/scenes/MenuScene.js`

---

## 14. Summary

The project works like this:

- React starts the app
- Phaser creates the game
- Scenes control the flow
- Terrain and buggy are created inside the game scene
- Physics makes the buggy move and collide
- React updates the UI based on the game state

That is the whole workflow in one simple model.
