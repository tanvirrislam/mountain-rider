# 🏔️ Mountain Rider

Mountain Rider is a 2D physics-based side-scrolling driving game built as a University Computer Graphics Lab project. It features procedural terrain generation, advanced vehicle physics, and a modern React-based UI, all drawn entirely with code (no external image assets).

## 🏗️ Architecture & Tech Stack

This project uses a hybrid architecture, combining the strengths of three powerful libraries:

1. **Vite + React (UI Layer)**: Handles the main application shell, the glassmorphic menus, the HUD (Distance, Time, Speed), and game over screens. React is perfect for building responsive and beautiful UI components.
2. **Phaser 3 (Game Engine)**: Handles the rendering loop, cameras, particle systems, procedural graphics drawing, and the game loop.
3. **Matter.js (Physics Engine)**: Built directly into Phaser 3, Matter.js handles the rigid body physics, constraints (springs/suspension), collisions, and torque.

### 🌉 The React-Phaser Bridge
React and Phaser run in parallel. To make them talk to each other, we use **Phaser's Registry** (`game.registry`). 
In `Game.js`, React passes its state-setter functions (`setGameState`, `setStats`) into the Phaser registry. Inside `GameScene.js`, Phaser retrieves these functions and calls them when the player moves, crashes, or crosses the finish line. This allows React to instantly update the UI based on what happens inside the game canvas.

---

## 📂 Project Structure

Here is where everything lives, so you know exactly where to go to make changes:

### `/src` (Root)
* `main.jsx` - The entry point of the React application.
* `App.jsx` - The main React component containing all the UI (Menus, HUD, Game Over screens).
* `index.css` - All the styling, glassmorphism effects, and animations for the UI.

### `/src/game` (The Game Engine)
* **`Game.js`** - Initializes the Phaser game instance and sets up the bridge to React.
* **`/utils/constants.js`** - **IMPORTANT FILE!** This is the master configuration file. It contains all the Physics values, rendering depths (Z-index), and Hex Colors.

### `/src/game/scenes` (Game States)
* **`BootScene.js`** - Initializes the game.
* **`PreloadScene.js`** - Placeholder for loading assets (currently empty since everything is code-drawn).
* **`MenuScene.js`** - Draws the beautiful procedural sky, mountains, and clouds behind the React menu.
* **`GameScene.js`** - The core game loop. It creates the terrain, buggy, background layers, handles collisions, checks for crashes, and sends data back to React.

### `/src/game/objects` (Game Entities)
* **`Buggy.js`** - The player's vehicle. Contains the physics setup (chassis + wheels + spring constraints) and the detailed `Phaser.Graphics` drawing code that makes the car look good.
* **`Terrain.js`** - Generates the procedural hills using sine waves, draws the grass/dirt layers, places obstacles (rocks), and creates the finish line area.

---

## 🛠️ How to Change Things (Modding Guide)

Want to tweak the game? Here is how to do it:

### 1. Changing Colors & Visuals
Open `src/game/utils/constants.js`. You will find a `COLORS` object. You can change the hex codes here to instantly change the color of the sky, grass, buggy body, wheels, or mountains.
* *Example: Change `BUGGY_BODY` to `0x2196f3` to make the buggy blue.*

### 2. Tuning the Physics (Making it easier/harder)
Open `src/game/utils/constants.js` and look at the `PHYSICS` object.
* **Gravity (`GRAVITY_Y`)**: Lower it (e.g., `0.5`) for moon gravity, increase it (e.g., `1.5`) for a heavy, realistic feel.
* **Speed (`CONTROLS.SPEED`)**: Increase this to give the buggy more motor torque.
* **Suspension (`SUSPENSION.STIFFNESS` / `DAMPING`)**: Tweak these to make the buggy bouncy or stiff.
* **Air Control (`CONTROLS.AIR_ROTATION`)**: Determines how fast the buggy rotates in the air when pressing A/D.

### 3. Modifying the Buggy Design
Open `src/game/objects/Buggy.js`. 
* The **physics structure** (width, height, wheel positions) is defined in the `constructor()`. Note: if you change the physics size, you must also update the graphics to match.
* The **visual drawing** happens in `createChassisTexture()` and `createWheelTexture()`. This is standard canvas-style drawing (lines, rectangles, arcs) using `Phaser.Graphics`.

### 4. Changing the Terrain Layout
Open `src/game/objects/Terrain.js`.
* Look inside the `generateTerrain()` method. The hills are generated using a mix of `Math.sin()` and `Math.cos()` waves. 
* To make the hills steeper, increase the multiplier (e.g., `Math.sin(x / 350) * 100`).
* To make the track longer, change `this.terrainWidth = 3800` to a higher number.

---

## 🚀 Running the Game

To start the development server, run:
```bash
npm install
npm run dev
```
Then open `http://localhost:5175` in your browser. (Vite usually runs on port 5173, 5174, or 5175).
