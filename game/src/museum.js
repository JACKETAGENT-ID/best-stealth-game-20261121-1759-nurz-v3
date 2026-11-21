// The Halcyon Gallery: one floor plan, parsed from text rows.
// '#' wall, 'V' glass vitrine (cover: blocks movement and sight),
// '.' floor, 'P' Wren's starting corner, '1'..'3' treasures, 'E' exit door.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

export const MAP_ROWS = [
  '##############################',
  '#P....V........#......V......#',
  '#.....V....1...#...V.........#',
  '#..V......V....#.....V...V...#',
  '#..............#.............#',
  '#.####.######..#.######.##...#',
  '#.............#..............#',
  '#..V....2..V......V....V.....#',
  '#.............#..............#',
  '#..#######.#####.#######.....#',
  '#.............#..............#',
  '#.V.......V...#....V....V....#',
  '#....3........#.......V......#',
  '#.............#.............E#',
  '#..V....V.....#..V.....V.....#',
  '#.##########..#..##########..#',
  '#.............#..............#',
  '#..V......V...#.....V....V...#',
  '#.............#..............#',
  '##############################',
];

export const TREASURE_NAMES = {
  1: 'Sun Opal',
  2: 'Moon Pearl',
  3: 'Star Sapphire',
};

/** Parse MAP_ROWS into grid data the rest of the game queries. */
export function parseMuseum() {
  const solid = new Set();
  const treasures = [];
  let start = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { tx: 28, ty: 13 };
  for (let ty = 0; ty < ROWS; ty++) {
    const row = MAP_ROWS[ty];
    for (let tx = 0; tx < COLS; tx++) {
      const ch = row[tx];
      if (ch === '#' || ch === 'V') solid.add(`${tx},${ty}`);
      if (ch === 'P') start = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
      if (ch === 'E') exit = { tx, ty };
      if (ch === '1' || ch === '2' || ch === '3') {
        treasures.push({
          id: Number(ch),
          name: TREASURE_NAMES[ch],
          tx, ty,
          x: tx * TILE + TILE / 2,
          y: ty * TILE + TILE / 2,
          taken: false,
        });
      }
    }
  }
  return { solid, treasures, start, exit };
}

/** True when tile (tx, ty) blocks movement and sight. Out of bounds counts as solid. */
export function tileSolid(solid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return solid.has(`${tx},${ty}`);
}

/** True when the pixel point (x, y) sits inside a solid tile. */
export function pointSolid(solid, x, y) {
  return tileSolid(solid, Math.floor(x / TILE), Math.floor(y / TILE));
}

/**
 * Line of sight between two pixel points: sample along the segment and fail
 * when a sample lands in a solid tile. Walls and vitrines both block sight,
 * so a vitrine is real cover, not decoration.
 */
export function losClear(solid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointSolid(solid, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/**
 * Move a circle (x, y, radius) by (dx, dy) with axis-separated collision,
 * so sliding along a wall feels smooth instead of sticking.
 */
export function moveCircle(solid, x, y, radius, dx, dy) {
  let nx = x + dx;
  if (dx !== 0) {
    const top = Math.floor((y - radius + 1) / TILE);
    const bottom = Math.floor((y + radius - 1) / TILE);
    const edge = dx > 0 ? nx + radius : nx - radius;
    const tc = Math.floor(edge / TILE);
    for (let tr = top; tr <= bottom; tr++) {
      if (tileSolid(solid, tc, tr)) {
        nx = dx > 0 ? tc * TILE - radius - 0.01 : (tc + 1) * TILE + radius + 0.01;
        break;
      }
    }
  }
  let ny = y + dy;
  if (dy !== 0) {
    const left = Math.floor((nx - radius + 1) / TILE);
    const right = Math.floor((nx + radius - 1) / TILE);
    const edge = dy > 0 ? ny + radius : ny - radius;
    const tr = Math.floor(edge / TILE);
    for (let tc = left; tc <= right; tc++) {
      if (tileSolid(solid, tc, tr)) {
        ny = dy > 0 ? tr * TILE - radius - 0.01 : (tr + 1) * TILE + radius + 0.01;
        break;
      }
    }
  }
  return { x: nx, y: ny };
}
