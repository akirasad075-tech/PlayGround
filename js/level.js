/**
 * Level geometry and encounter data for the Spiral Keep.
 * Coordinates are world pixels. y grows downward; floors use their top edge.
 */

export const WORLD = {
  w: 2800,
  h: 2300,
  start: { x: 330, y: 2050 },
  mistY: 2220,
  gate: { x: 2050, y: 420, w: 132, h: 220 },
};

export const FLOOR_NAMES = [
  'Grand Atrium',
  'Portrait Gallery',
  'Moonlit Library',
  'The Observatory',
  'The Rooftop',
];

function floor(x1, x2, top, thickness, index) {
  return { x: x1, y: top, w: x2 - x1, h: thickness, kind: 'floor', floor: index };
}

export const SOLIDS = [
  // The Spiral Keep's five tiers. Gaps are deliberate.
  floor(0, 1150, 2050, 112, 0),
  floor(1400, 2250, 2050, 112, 0),
  floor(2480, 2800, 2050, 112, 0),

  floor(330, 1500, 1600, 92, 1),
  floor(1660, 2560, 1600, 92, 1),
  floor(2720, 2800, 1600, 92, 1),

  floor(0, 380, 1150, 92, 2),
  floor(540, 1080, 1150, 92, 2),
  floor(1240, 2450, 1150, 92, 2),

  floor(230, 1430, 700, 92, 3),
  floor(1590, 2200, 700, 92, 3),
  floor(2360, 2800, 700, 92, 3),

  floor(1680, 2580, 420, 82, 4),
  floor(2740, 2800, 420, 82, 4),

  // Outer walls of the keep.
  { x: -90, y: -200, w: 90, h: 2500, kind: 'wall', floor: 0 },
  { x: 2800, y: -200, w: 90, h: 2500, kind: 'wall', floor: 0 },
];

const ledge = (x1, x2, y, floorIndex, kind = 'ledge') => ({
  x: x1, y, w: x2 - x1, h: 15, kind, floor: floorIndex,
});

export const LEDGES = [
  // Crossing stones over the broken floor sections.
  ledge(1218, 1332, 1968, 0),
  ledge(2312, 2412, 1978, 0),
  ledge(1532, 1632, 1512, 1),
  ledge(1112, 1208, 1062, 2),
  ledge(1472, 1550, 612, 3),

  // Ornamental balconies that make the atrium feel climbable.
  ledge(1010, 1170, 1880, 0, 'balcony'),
  ledge(1730, 1870, 1840, 0, 'balcony'),
  ledge(2130, 2260, 1740, 0, 'balcony'),
  ledge(1290, 1430, 1390, 1, 'balcony'),
  ledge(1880, 2030, 1320, 1, 'balcony'),
  ledge(700, 850, 990, 2, 'balcony'),
  ledge(1470, 1610, 940, 2, 'balcony'),
  ledge(2030, 2170, 870, 2, 'balcony'),
  ledge(880, 1010, 650, 3, 'balcony'),
  ledge(1580, 1720, 560, 3, 'balcony'),
  ledge(2280, 2400, 520, 4, 'balcony'),
];

export const LADDERS = [
  { x: 2640, top: 1600, bottom: 2050, exitX: 2515, floor: 1 },
  { x: 460, top: 1150, bottom: 1600, exitX: 575, floor: 2 },
  { x: 2280, top: 700, bottom: 1150, exitX: 2395, floor: 3 },
  { x: 2660, top: 420, bottom: 700, exitX: 2765, floor: 4 },
];

export const ANCHORS = [
  { x: 500, y: 1790, chain: 100 },
  { x: 960, y: 1792, chain: 102 },
  { x: 1755, y: 1812, chain: 122 },
  { x: 1205, y: 1322, chain: 82 },
  { x: 1955, y: 1340, chain: 100 },
  { x: 810, y: 882, chain: 92 },
  { x: 1500, y: 905, chain: 115 },
  { x: 1185, y: 522, chain: 22 },
  { x: 2215, y: 526, chain: 26 },
];

export const CHECKPOINTS = [
  { x: 320, y: 2050, floor: 0, name: 'Courtyard Lantern' },
  { x: 2460, y: 1600, floor: 1, name: 'Gallery Landing' },
  { x: 600, y: 1150, floor: 2, name: 'Library Landing' },
  { x: 2420, y: 700, floor: 3, name: 'Observatory Landing' },
  { x: 2500, y: 420, floor: 4, name: 'Rooftop Lantern' },
];

export const TORCHES = [
  { x: 280, y: 1938, floor: 0 },
  { x: 890, y: 1938, floor: 0 },
  { x: 1570, y: 1938, floor: 0 },
  { x: 2310, y: 1938, floor: 0 },
  { x: 2740, y: 1938, floor: 0 },

  { x: 610, y: 1488, floor: 1 },
  { x: 1240, y: 1488, floor: 1 },
  { x: 1790, y: 1488, floor: 1 },
  { x: 2410, y: 1488, floor: 1 },
  { x: 2772, y: 1488, floor: 1 },

  { x: 180, y: 1038, floor: 2 },
  { x: 760, y: 1038, floor: 2 },
  { x: 1490, y: 1038, floor: 2 },
  { x: 2040, y: 1038, floor: 2 },
  { x: 2408, y: 1038, floor: 2 },

  { x: 420, y: 588, floor: 3 },
  { x: 1050, y: 588, floor: 3 },
  { x: 1700, y: 588, floor: 3 },
  { x: 2480, y: 588, floor: 3 },
  { x: 2770, y: 588, floor: 3 },

  { x: 1760, y: 308, floor: 4 },
  { x: 2250, y: 308, floor: 4 },
  { x: 2720, y: 308, floor: 4 },
];

export const WINDOWS = [
  { x: 560, floor: 0 },
  { x: 1260, floor: 0 },
  { x: 1980, floor: 0 },
  { x: 2680, floor: 0 },

  { x: 430, floor: 1 },
  { x: 1140, floor: 1 },
  { x: 1860, floor: 1 },
  { x: 2530, floor: 1 },

  { x: 270, floor: 2 },
  { x: 940, floor: 2 },
  { x: 1650, floor: 2 },
  { x: 2300, floor: 2 },

  { x: 500, floor: 3 },
  { x: 1200, floor: 3 },
  { x: 1900, floor: 3 },
  { x: 2620, floor: 3 },
];

export const BANNERS = [
  { x: 360, floor: 0, color: '#9d365c' },
  { x: 1130, floor: 0, color: '#3b5d8e' },
  { x: 2180, floor: 0, color: '#9d365c' },
  { x: 880, floor: 1, color: '#6d4a9e' },
  { x: 1580, floor: 1, color: '#9d365c' },
  { x: 2240, floor: 1, color: '#6d4a9e' },
  { x: 660, floor: 2, color: '#3b5d8e' },
  { x: 1380, floor: 2, color: '#6d4a9e' },
  { x: 2150, floor: 2, color: '#9d365c' },
  { x: 760, floor: 3, color: '#9d365c' },
  { x: 1360, floor: 3, color: '#3b5d8e' },
  { x: 2450, floor: 3, color: '#6d4a9e' },
];

export const BOOKSHELVES = [
  { x: 620, y: 1150, w: 250 },
  { x: 1330, y: 1150, w: 210 },
  { x: 1980, y: 1150, w: 220 },
  { x: 1250, y: 700, w: 200 },
];

export const PORTRAITS = [
  { x: 720, y: 1600 },
  { x: 1450, y: 1600 },
  { x: 2040, y: 1600 },
  { x: 2350, y: 1600 },
];

export const CRATES = [
  { x: 245, y: 2050, scale: 1.0 },
  { x: 430, y: 2050, scale: 0.75 },
  { x: 1510, y: 2050, scale: 1.1 },
  { x: 1660, y: 2050, scale: 0.8 },
  { x: 2490, y: 1600, scale: 0.8 },
  { x: 690, y: 1150, scale: 0.95 },
  { x: 2320, y: 1150, scale: 1.05 },
];

export const PRINCESSES = [
  {
    id: 'rosalind',
    name: 'Rosalind',
    title: 'Princess of the Rose Court',
    x: 2000,
    y: 2050,
    floor: 0,
    home: [1850, 2176],
    color: '#f17fa4',
    accent: '#ffd0dd',
  },
  {
    id: 'liora',
    name: 'Liora',
    title: 'Princess of the Tidal Library',
    x: 820,
    y: 1600,
    floor: 1,
    home: [650, 1040],
    color: '#75e6d0',
    accent: '#c7fff5',
  },
  {
    id: 'celeste',
    name: 'Celeste',
    title: 'Princess of the High Observatory',
    x: 2090,
    y: 1150,
    floor: 2,
    home: [1880, 2216],
    color: '#ffd479',
    accent: '#fff0c2',
  },
];

export const GUARDS = [
  { x1: 780, x2: 1120, y: 2050, floor: 0, speed: 47, facing: 1 },
  { x1: 1680, x2: 2120, y: 2050, floor: 0, speed: 52, facing: -1 },
  { x1: 950, x2: 1400, y: 1600, floor: 1, speed: 45, facing: 1 },
  { x1: 1850, x2: 2350, y: 1600, floor: 1, speed: 58, facing: -1 },
  { x1: 1300, x2: 1850, y: 1150, floor: 2, speed: 51, facing: 1 },
  { x1: 500, x2: 1150, y: 700, floor: 3, speed: 44, facing: -1 },
  { x1: 1750, x2: 2140, y: 700, floor: 3, speed: 55, facing: 1 },
];

export const DECOR = {
  arches: [0, 700, 1400, 2100, 2800],
  curtains: [1400, 1400, 0, 0, 0],
};

/** Top surface of a solid floor at x, at or near y. */
export function floorAt(x, y, tolerance = 30) {
  let best = null;
  for (const s of SOLIDS) {
    if (s.kind !== 'floor') continue;
    if (x < s.x || x > s.x + s.w) continue;
    if (Math.abs(s.y - y) > tolerance) continue;
    if (!best || s.y < best) best = s.y;
  }
  return best;
}

/** Is there a floor surface below x within maxDrop? */
export function floorBelow(x, y, maxDrop = 600) {
  let best = null;
  for (const s of SOLIDS) {
    if (s.kind !== 'floor') continue;
    if (x < s.x || x > s.x + s.w) continue;
    if (s.y < y - 2) continue;
    if (s.y - y > maxDrop) continue;
    if (!best || s.y < best) best = s.y;
  }
  return best;
}

export function floorNameForY(y) {
  if (y < 420) return FLOOR_NAMES[4];
  if (y < 700) return FLOOR_NAMES[3];
  if (y < 1150) return FLOOR_NAMES[2];
  if (y < 1600) return FLOOR_NAMES[1];
  return FLOOR_NAMES[0];
}

export function floorIndexForY(y) {
  if (y < 420) return 4;
  if (y < 700) return 3;
  if (y < 1150) return 2;
  if (y < 1600) return 1;
  return 0;
}
