// script.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let rects = [];           // store finished rectangles
let isDrawing = false;
let startX = 0, startY = 0;

// live‐preview of the rectangle being drawn
function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw completed
  rects.forEach(r => {
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
}

// mouse events
canvas.addEventListener('mousedown', e => {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
});

canvas.addEventListener('mousemove', e => {
  if (!isDrawing) return;
  const rectBounds = canvas.getBoundingClientRect();
  const currX = e.clientX - rectBounds.left;
  const currY = e.clientY - rectBounds.top;
  const w = currX - startX;
  const h = currY - startY;
  
  drawAll();
  ctx.strokeStyle = 'red';
  ctx.strokeRect(startX, startY, w, h);
});

canvas.addEventListener('mouseup', e => {
  if (!isDrawing) return;
  isDrawing = false;
  const rectBounds = canvas.getBoundingClientRect();
  const endX = e.clientX - rectBounds.left;
  const endY = e.clientY - rectBounds.top;
  rects.push({
    x: startX,
    y: startY,
    w: endX - startX,
    h: endY - startY
  });
  ctx.strokeStyle = 'black';
  drawAll();
});

// controls
document.getElementById('resizeBtn').addEventListener('click', () => {
  const w = parseInt(document.getElementById('widthInput').value, 10);
  const h = parseInt(document.getElementById('heightInput').value, 10);
  canvas.width = w;
  canvas.height = h;
  rects = [];
  drawAll();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  rects = [];
  drawAll();
});