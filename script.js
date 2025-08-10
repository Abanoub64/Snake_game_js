// --- Canvas and grid setup ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const tile = 20; // grid size in pixels
const tilesX = Math.floor(canvas.width / tile);
const tilesY = Math.floor(canvas.height / tile);

// --- HUD elements ---
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const bestKey = "snake_best_v1";

// --- Game state ---
let snake, apple, score, best, running, paused, stepMs, lastTime, acc;

function randInt(n) {
  return Math.floor(Math.random() * n);
}

function placeApple() {
  // ensure apple not on snake
  let ok = false,
    ax,
    ay;
  while (!ok) {
    ax = randInt(tilesX);
    ay = randInt(tilesY);
    ok = !snake.cells.some((c) => c.x === ax && c.y === ay);
  }
  apple.x = ax;
  apple.y = ay;
}

function reset() {
  score = 0;
  scoreEl.textContent = score;
  stepMs = 140; // starting speed (lower is faster)
  speedEl.textContent = (140 / stepMs).toFixed(1) + "x";
  running = true;
  paused = false;
  lastTime = performance.now();
  acc = 0;

  snake = {
    x: Math.floor(tilesX / 2),
    y: Math.floor(tilesY / 2),
    dx: 1,
    dy: 0,
    nextDx: 1,
    nextDy: 0,
    cells: [],
    maxCells: 4,
  };

  apple = { x: 5, y: 5 };
  placeApple();
  draw(true);
}

function gameOver() {
  running = false;
  // update best
  if (score > best) {
    best = score;
    localStorage.setItem(bestKey, String(best));
    bestEl.textContent = best;
  }
  draw(true);
}

function eatApple() {
  score++;
  scoreEl.textContent = score;

  // increase length and speed gradually
  snake.maxCells++;
  if (stepMs > 70 && score % 4 === 0) {
    stepMs -= 8;
    speedEl.textContent = (140 / stepMs).toFixed(1) + "x";
  }
  placeApple();
}

function step(dt) {
  if (!running || paused) return;

  // apply buffered direction to prevent instant reverse
  if (
    (snake.dx === 0 || snake.nextDx === 0) &&
    (snake.dy === 0 || snake.nextDy === 0)
  ) {
    snake.dx = snake.nextDx;
    snake.dy = snake.nextDy;
  }

  snake.x += snake.dx;
  snake.y += snake.dy;

  // wall collision ends game
  if (snake.x < 0 || snake.x >= tilesX || snake.y < 0 || snake.y >= tilesY) {
    gameOver();
    return;
  }

  // add head to front of the cells
  snake.cells.unshift({ x: snake.x, y: snake.y });
  // trim to max length
  if (snake.cells.length > snake.maxCells) snake.cells.pop();

  // apple collision
  if (snake.x === apple.x && snake.y === apple.y) eatApple();

  // self collision
  for (let i = 1; i < snake.cells.length; i++) {
    if (snake.cells[i].x === snake.x && snake.cells[i].y === snake.y) {
      gameOver();
      return;
    }
  }

  draw();
}

function draw(showOverlay = false) {
  // clear board
  ctx.fillStyle = "#0b0f21";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0.5 + tile; x < canvas.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0.5 + tile; y < canvas.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // draw apple
  drawRoundedCell(apple.x, apple.y, "#ff4d5a");

  // draw snake
  snake.cells.forEach((c, i) => {
    const isHead = i === 0;
    drawRoundedCell(c.x, c.y, isHead ? "#7df7b0" : "#49d187");
  });

  // overlays
  if (showOverlay) {
    ctx.save();
    ctx.fillStyle = "rgba(8,10,20,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e9eef7";
    ctx.textAlign = "center";
    ctx.font =
      "bold 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(
      running ? "Paused" : "Game Over",
      canvas.width / 2,
      canvas.height / 2 - 10
    );

    ctx.font = "14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillStyle = "#a0b2ff";
    ctx.fillText(
      "Press R to restart · P to resume",
      canvas.width / 2,
      canvas.height / 2 + 18
    );
    ctx.restore();
  } else if (paused || !running) {
    // ensure overlay stays if paused/stopped
    draw(true);
  }
}

function drawRoundedCell(cx, cy, color) {
  const x = cx * tile;
  const y = cy * tile;
  const r = 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + tile, y, x + tile, y + tile, r);
  ctx.arcTo(x + tile, y + tile, x, y + tile, r);
  ctx.arcTo(x, y + tile, x, y, r);
  ctx.arcTo(x, y, x + tile, y, r);
  ctx.closePath();
  ctx.fill();
}

// --- Game loop with fixed timestep ---
function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  if (!paused && running) {
    acc += dt;
    while (acc >= stepMs) {
      step(stepMs);
      acc -= stepMs;
    }
    // draw only once per frame unless overlay forced in step/draw
    if (running && !paused) draw();
  }
  requestAnimationFrame(loop);
}

// --- Input handling ---
const dirs = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  w: [0, -1],
  s: [0, 1],
};

window.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "p" || k === "P") {
    if (running) {
      paused = !paused;
      draw(true);
    }
    return;
  }
  if (k === "r" || k === "R") {
    reset();
    return;
  }
  if (!running) return;

  if (dirs[k]) {
    const [nx, ny] = dirs[k];
    // prevent reversing directly into yourself
    const reverse = nx === -snake.dx && ny === -snake.dy;
    if (!reverse) {
      snake.nextDx = nx;
      snake.nextDy = ny;
    }
  }
});

// --- Persisted best score ---
best = Number(localStorage.getItem(bestKey) || 0);
bestEl.textContent = best;

// --- Start game ---
reset();
requestAnimationFrame((t) => {
  lastTime = t;
  requestAnimationFrame(loop);
});
