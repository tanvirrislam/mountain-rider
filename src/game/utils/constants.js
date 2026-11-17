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
  MOUNTAINS_MID: 17,
  MOUNTAINS_NEAR: 18,
  FOREST: 20,
  TERRAIN_BG: 40,
  TERRAIN_FG: 50,
  OBSTACLES: 60,
  BUGGY: 70,
  PARTICLES: 80
};

export const COLORS = {
  // Atmospheric sky gradient (zenith -> horizon)
  SKY_TOP: '#1a4c80',
  SKY_MID: '#4b86be',
  SKY_LOWER: '#9bc4e2',
  SKY_BOTTOM: '#e3edf2',

  // Realistic alpine & foothill mountain palette
  MOUNTAIN_FAR: 0x678099,
  MOUNTAIN_FAR_SHADOW: 0x4b637c,
  MOUNTAIN_MID: 0x445f5c,
  MOUNTAIN_MID_SHADOW: 0x2c4240,
  MOUNTAIN_NEAR: 0x2f4d36,
  MOUNTAIN_NEAR_SHADOW: 0x1e3324,

  // Snow & mist
  SNOW: 0xf4f7fb,
  SNOW_SHADOW: 0xa5b9cf,
  MIST: 0xdce7ef,

  // Realistic meadow grass & road trail
  GRASS_TOP: 0x5c8a3b,
  GRASS_MID: 0x41692a,
  GRASS_DARK: 0x2c4a1c,
  ROAD_TOP: 0x8a735d,
  ROAD_MID: 0x705b47,
  ROAD_RUT: 0x574434,

  // Stratified earth & soil
  DIRT_TOP: 0x614736,
  DIRT_MID: 0x4a3527,
  DIRT_BOTTOM: 0x36261b,
  BEDROCK: 0x241912,

  // Buggy metallic & off-road palette
  BUGGY_BODY: 0xc62828,
  BUGGY_BODY_DARK: 0x8e1616,
  BUGGY_ACCENT: 0xe53935,
  WHEEL_OUTER: 0x1a1a1a,
  WHEEL_INNER: 0x333333,
  WHEEL_RIM: 0xb0b7bd,
  WHEEL_HUB: 0xb71c1c,

  // Rocks, pebbles, dust, moss
  ROCK: 0x71777d,
  ROCK_LIGHT: 0x8f969c,
  ROCK_DARK: 0x4c5257,
  ROCK_SHADOW: 0x32363a,
  PEBBLE: 0x5d4a3a,
  PEBBLE_LIGHT: 0x7d6856,
  DUST_LIGHT: 0xc7b8a8,
  DUST_MID: 0x9e8b78,
  DUST_DARK: 0x756352,
  MOSS: 0x4e6e31,
};
