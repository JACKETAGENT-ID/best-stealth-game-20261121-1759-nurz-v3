// Everything the eye sees: marble floor, glass vitrines, lantern cones,
// wardens on their beats, and the green door home.
import { TILE, COLS, ROWS, MAP_ROWS } from './museum.js';
import { GUARD_RANGE, CAMERA_RANGE } from './wardens.js';

const GEM_COLORS = { 1: '#ffb347', 2: '#cfe8ff', 3: '#5aa2ff' };

function conePath(ctx, x, y, facing, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, range, halfAngle, hot) {
  const g = ctx.createRadialGradient(x, y, 10, x, y, range);
  const alpha = hot ? 0.5 : 0.3;
  g.addColorStop(0, `rgba(255, 214, 110, ${alpha})`);
  g.addColorStop(0.7, `rgba(255, 196, 80, ${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(255, 196, 80, 0)');
  ctx.fillStyle = g;
  conePath(ctx, x, y, facing, range, halfAngle);
  ctx.fill();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#181a26' : '#141623';
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE, TILE);
    }
  }
}

function drawWallsAndVitrines(ctx, solid) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = MAP_ROWS[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#2c2f42';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3d4060';
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + TILE - 5, TILE, 5);
      } else if (ch === 'V') {
        // Glass vitrine on a plinth: cover you can read at a glance.
        ctx.fillStyle = '#232838';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = 'rgba(140, 190, 255, 0.28)';
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.strokeStyle = 'rgba(190, 220, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 6.5, y + 6.5, TILE - 13, TILE - 13);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + TILE - 8);
        ctx.lineTo(x + TILE - 10, y + 10);
        ctx.stroke();
      }
    }
  }
}

function drawExit(ctx, exit, open, time) {
  const x = exit.tx * TILE;
  const y = exit.ty * TILE;
  const pulse = open ? 0.75 + Math.sin(time * 4) * 0.25 : 0.35;
  ctx.fillStyle = open ? `rgba(64, 220, 110, ${pulse})` : 'rgba(220, 170, 60, 0.4)';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = open ? '#7dffab' : '#d8a83c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
  ctx.fillStyle = open ? '#0a2412' : '#241a08';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x + TILE / 2, y + TILE / 2);
}

function drawTreasure(ctx, t, time) {
  const bob = Math.sin(time * 3 + t.id * 2) * 2;
  const color = GEM_COLORS[t.id];
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - 9 + bob);
  ctx.lineTo(t.x + 7, t.y + bob);
  ctx.lineTo(t.x, t.y + 9 + bob);
  ctx.lineTo(t.x - 7, t.y + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(t.x - 2, t.y - 3 + bob, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawLaser(ctx, gate) {
  // Floor posts.
  ctx.fillStyle = '#3a3f55';
  for (const [px, py] of [[gate.x1, gate.y1], [gate.x2, gate.y2]]) {
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gate.isOn() ? '#ff3b30' : '#5a2a28';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f55';
  }
  // The beam itself: solid red while live, a faint dotted warning while dark.
  if (gate.isOn()) {
    ctx.save();
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(255, 60, 45, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gate.x1, gate.y1);
    ctx.lineTo(gate.x2, gate.y2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(255, 90, 70, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gate.x1, gate.y1);
    ctx.lineTo(gate.x2, gate.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawWarden(ctx, w, time) {
  drawCone(ctx, w.x, w.y, w.facing, GUARD_RANGE, 0.62, w.seesPlayer);
  // Faint patrol beat, so a route can be learned before it is walked.
  ctx.save();
  ctx.setLineDash([2, 8]);
  ctx.strokeStyle = 'rgba(150, 160, 200, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  w.waypoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // Body: dark uniform, brass helmet, facing tick.
  const bob = Math.sin(w.stepPhase) * 1.2;
  ctx.fillStyle = '#0d0f1c';
  ctx.beginPath();
  ctx.arc(w.x, w.y + bob * 0.3, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = w.seesPlayer ? '#ff5a4a' : '#8a93b8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.arc(w.x, w.y + bob * 0.3, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w.x, w.y + bob * 0.3);
  ctx.lineTo(w.x + Math.cos(w.facing) * 14, w.y + bob * 0.3 + Math.sin(w.facing) * 14);
  ctx.stroke();
  if (w.seesPlayer) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('!', w.x, w.y - 16 + bob * 0.3);
  }
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.facing, CAMERA_RANGE, 0.5, cam.seesPlayer);
  ctx.fillStyle = '#22263a';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = cam.seesPlayer ? '#ff5a4a' : '#7d86a8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = cam.seesPlayer ? '#ff3b30' : '#37d67a';
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawThief(ctx, thief, time) {
  const glow = ctx.createRadialGradient(thief.x, thief.y, 4, thief.x, thief.y, 46);
  glow.addColorStop(0, 'rgba(244, 212, 124, 0.20)');
  glow.addColorStop(1, 'rgba(244, 212, 124, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 46, 0, Math.PI * 2);
  ctx.fill();
  const bob = thief.moving ? Math.sin(thief.stepPhase) * 1.5 : Math.sin(time * 2) * 0.8;
  ctx.fillStyle = '#1d1420';
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob * 0.3, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = thief.sneaking ? '#7fb8ff' : '#f4d47c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point and lantern dot show which way Wren faces.
  ctx.fillStyle = '#f4d47c';
  ctx.beginPath();
  ctx.arc(thief.x + Math.cos(thief.facing) * 8, thief.y + Math.sin(thief.facing) * 8 + bob * 0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw one frame of the gallery. `s` is the engine's live state. */
export function drawWorld(ctx, s) {
  const W = COLS * TILE;
  const H = ROWS * TILE;
  ctx.clearRect(0, 0, W, H);
  drawFloor(ctx);
  for (const t of s.museum.treasures) {
    if (!t.taken) drawTreasure(ctx, t, s.time);
  }
  drawExit(ctx, s.museum.exit, s.lootTaken === s.museum.treasures.length, s.time);
  drawWallsAndVitrines(ctx, s.museum.solid);
  for (const gate of s.lasers) drawLaser(ctx, gate);
  for (const cam of s.cameras) drawCamera(ctx, cam);
  for (const w of s.wardens) drawWarden(ctx, w, s.time);
  drawThief(ctx, s.thief, s.time);
  // Night vignette: dark corners, readable middle.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(2, 3, 8, 0)');
  v.addColorStop(1, 'rgba(2, 3, 8, 0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  // Alarm flush when the gallery has almost spotted Wren.
  if (s.detection > 55) {
    ctx.fillStyle = `rgba(255, 40, 30, ${(s.detection - 55) / 220})`;
    ctx.fillRect(0, 0, W, H);
  }
}
