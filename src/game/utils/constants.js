export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PHYSICS = {
  GRAVITY_Y: 0.9,       // Lighter gravity 
  BUGGY: {
    MASS: 25,            // Lighter
    FRICTION: 0.15,
    RESTITUTION: 0.04,
  },
  WHEEL: {
    MASS: 6,
    FRICTION: 1.0,       // Maximum grip
    RESTITUTION: 0.1,
    DENSITY: 0.03
  },
  SUSPENSION: {
    STIFFNESS: 0.14,
    DAMPING: 0.3,        // More damping = stable landings
    LENGTH: 10
  },
  CONTROLS: {
    SPEED: 0.18,         // More torque for climbing
    AIR_ROTATION: 0.04
  }
};

export const DEPTH = {
  SKY: 0,
  CLOUDS: 10,
  MOUNTAINS_FAR: 15,
  MOUNTAINS_NEAR: 18,
  FOREST: 20,
  TERRAIN_BG: 40,
  TERRAIN_FG: 50,
  OBSTACLES: 60,
  BUGGY: 70,
  PARTICLES: 80
};

export const COLORS = {
  SKY_TOP: '#1e88e5',
  SKY_BOTTOM: '#bbdefb',
  GRASS_TOP: 0x66bb6a,
  GRASS_MID: 0x43a047,
  DIRT_TOP: 0x8d6e63,
  DIRT_BOTTOM: 0x5d4037,
  BUGGY_BODY: 0xd32f2f,
  BUGGY_BODY_DARK: 0xb71c1c,
  BUGGY_ACCENT: 0xff5252,
  WHEEL_OUTER: 0x212121,
  WHEEL_INNER: 0x424242,
  WHEEL_RIM: 0x9e9e9e,
  WHEEL_HUB: 0xcc3333,
  MOUNTAIN_FAR: 0x81c784,
  MOUNTAIN_NEAR: 0x4caf50,
  ROCK: 0x78909c,
  ROCK_DARK: 0x546e7a,
  SNOW: 0xf5f5f5,
  SNOW_SHADOW: 0xcfd8dc,
  PEBBLE: 0x6d4c41,
  PEBBLE_LIGHT: 0x8d6e63,
  DUST_LIGHT: 0xbcaaa4,
  DUST_MID: 0x8d6e63,
  DUST_DARK: 0x795548,
  MOSS: 0x558b2f,
};
