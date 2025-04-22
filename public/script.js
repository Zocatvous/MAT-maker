// script.js
const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');

// controls
document.getElementById('roomW'); // ensure DOM loaded
const roomWIn       = document.getElementById('roomW');
const roomHIn       = document.getElementById('roomH');
const scaleIn       = document.getElementById('scale');
const setRoomBtn    = document.getElementById('setRoom');
const clearBtn      = document.getElementById('clear');
const finishPolyBtn = document.getElementById('finishPoly');
const modeSel       = document.getElementById('mode');

// state
let rects       = [];
let polygons    = [];
let currentPoly = [];
let doors       = [];
let action      = null;
let startPt     = { x: 0, y: 0 };
let mousePx     = { x: 0, y: 0 };
const HANDLE_SIZE = 8;

// conversions
function toPx(u)   { return u * parseFloat(scaleIn.value); }
function toUnit(p) { return p / parseFloat(scaleIn.value); }

// resize canvas
function resizeCanvas() {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  redraw();
}
window.addEventListener('load',   resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// distance & projection helper
function pointSegmentDist(px,py,x1,y1,x2,y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const l2 = vx*vx + vy*vy;
  let t = l2 ? (vx*wx + vy*wy)/l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const projx = x1 + t*vx, projy = y1 + t*vy;
  const dx = px - projx, dy = py - projy;
  return { dist: Math.hypot(dx, dy), t };
}

// redraw scene
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // room border
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // draw walls
  polygons.forEach(poly => {
    if (poly.length < 2) return;
    ctx.beginPath();
    poly.forEach((pt, i) => {
      const x = toPx(pt.x), y = toPx(pt.y);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle   = 'rgba(200,200,200,0.5)'; ctx.fill();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
  });

  // draw polygon in progress
  if (currentPoly.length > 0) {
    ctx.beginPath();
    currentPoly.forEach((pt, i) => {
      const x = toPx(pt.x), y = toPx(pt.y);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'grey'; ctx.stroke();
    ctx.setLineDash([]);
  }

  // preview rectangle
  if (modeSel.value === 'draw' && action === 'draw') {
    const x0 = toPx(startPt.x), y0 = toPx(startPt.y);
    const w  = mousePx.x - x0, h = mousePx.y - y0;
    ctx.fillStyle   = 'rgba(221,221,221,0.5)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, w, h);
  }

  // door previews & placed doors
  if (modeSel.value === 'door' && polygons.length) {
    // find nearest wall for preview
    let best = { dist: Infinity, polyIndex: -1, segIndex: -1, t: 0 };
    polygons.forEach((poly, pi) => poly.forEach((pt, i) => {
      const nxt = poly[(i+1)%poly.length];
      const r = pointSegmentDist(mousePx.x, mousePx.y,
        toPx(pt.x), toPx(pt.y), toPx(nxt.x), toPx(nxt.y));
      if (r.dist < best.dist) best = { dist: r.dist, polyIndex: pi, segIndex: i, t: r.t };
    }));
    if (best.dist < 20) {
      // draw preview door
      const poly = polygons[best.polyIndex];
      const a = poly[best.segIndex], b = poly[(best.segIndex+1)%poly.length];
      const x1 = toPx(a.x), y1 = toPx(a.y);
      const x2 = toPx(b.x), y2 = toPx(b.y);
      const cx = x1 + best.t*(x2 - x1);
      const cy = y1 + best.t*(y2 - y1);
      const ang= Math.atan2(y2 - y1, x2 - x1);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      const len = 1 * parseFloat(scaleIn.value);
      const thk = 0.2 * parseFloat(scaleIn.value);
      ctx.fillStyle   = 'rgba(165,42,42,0.5)';
      ctx.fillRect(-len/2, -thk/2, len, thk);
      ctx.restore();
    }
  }
  doors.forEach(d => {
    const poly = polygons[d.polyIndex];
    const a = poly[d.segIndex], b = poly[(d.segIndex+1)%poly.length];
    const x1 = toPx(a.x), y1 = toPx(a.y);
    const x2 = toPx(b.x), y2 = toPx(b.y);
    const cx = x1 + d.t*(x2-x1);
    const cy = y1 + d.t*(y2-y1);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    const len = d.length * parseFloat(scaleIn.value);
    const thk = d.thickness * parseFloat(scaleIn.value);
    ctx.fillStyle   = 'brown'; ctx.fillRect(-len/2, -thk/2, len, thk);
    ctx.strokeStyle = 'sienna'; ctx.lineWidth = 2;
    ctx.strokeRect(-len/2, -thk/2, len, thk);
    ctx.restore();
  });

  // draw rectangles
  rects.forEach(r => {
    const x = toPx(r.x), y = toPx(r.y);
    const w = toPx(r.w), h = toPx(r.h);
    ctx.fillStyle   = '#ddd'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  });
}

// track mouse
canvas.addEventListener('mousemove', e => {
  const R = canvas.getBoundingClientRect();
  mousePx = { x: e.clientX - R.left, y: e.clientY - R.top };
  if (modeSel.value === 'polygon' || (modeSel.value === 'draw' && action === 'draw') || modeSel.value === 'door') {
    redraw();
  }
});

// mousedown
canvas.addEventListener('mousedown', e => {
  const R  = canvas.getBoundingClientRect();
  const px = e.clientX - R.left, py = e.clientY - R.top;
  const ux = toUnit(px), uy = toUnit(py);
  if (modeSel.value === 'polygon') {
    currentPoly.push({ x: ux, y: uy }); redraw(); return;
  }
  if (modeSel.value === 'door') {
    let best = { dist: Infinity, polyIndex: -1, segIndex: -1, t: 0 };
    polygons.forEach((poly, pi) => poly.forEach((pt, i) => {
      const nxt = poly[(i+1)%poly.length];
      const r = pointSegmentDist(px, py, toPx(pt.x), toPx(pt.y), toPx(nxt.x), toPx(nxt.y));
      if (r.dist < best.dist) best = { dist: r.dist, polyIndex: pi, segIndex: i, t: r.t };
    }));
    if (best.dist < 20) { doors.push({ polyIndex: best.polyIndex, segIndex: best.segIndex, t: best.t, length: 1, thickness: 0.2 }); redraw(); }
    return;
  }
  if (modeSel.value === 'draw') {
    action  = 'draw'; startPt = { x: ux, y: uy };
  }
});

// mouseup completes draw
window.addEventListener('mouseup', e => {
  if (action === 'draw') {
    const R  = canvas.getBoundingClientRect();
    const px = e.clientX - R.left, py = e.clientY - R.top;
    const ux = toUnit(px), uy = toUnit(py);
    rects.push({ x: startPt.x, y: startPt.y, w: ux - startPt.x, h: uy - startPt.y });
    action = null; redraw();
  }
});

// finish room/walls
finishPolyBtn.addEventListener('click', () => {
  if (currentPoly.length >= 3) { polygons.push([...currentPoly]); currentPoly = []; redraw(); }
});

// toolbar\setRoomBtn.addEventListener('click', () => { rects=[]; polygons=[]; currentPoly=[]; doors=[]; action=null; resizeCanvas(); });
clearBtn.addEventListener('click', () => { rects=[]; polygons=[]; currentPoly=[]; doors=[]; action=null; redraw(); });

// initial draw
redraw();
