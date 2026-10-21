import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { LIBRARY } from "./library.js";
import { px, pointsFor, pickSide, isVisible, measure } from "./measure.js";
import { startDemo } from "./demo.js";
import { bindSoundButton, initAudio, updateTone, rustle } from "./audio.js";

const REPS = 3;
const $ = (id) => document.getElementById(id);
const video = $("video");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");
const ui = {
  state: $("state"), hint: $("hint"), readout: $("readout"), marker: $("marker"),
  zNap: $("zNap"), zSlow: $("zSlow"), zFast: $("zFast"),
  sloth: $("sloth"), vineWrap: $("vineWrap"), progressLabel: $("progressLabel"),
  done: $("done"), doneStats: $("doneStats"), empty: $("empty"), emptyText: $("emptyText"),
  rangeFill: $("rangeFill")
};

let landmarker = null;
let drawing = null;
let running = false;
let lastVideoTime = -1;
let lastFrame = 0;
let exercise = LIBRARY[0];
let secondsPerLift = 10;
let smoothAngle = null;
let history = [];
let speed = 0;
let shown = "idle";
let candidate = null;
let candidateSince = 0;
let progress = 0;
let climbTime = 0;
let rushCount = 0;
let finished = false;
let cueIndex = 0;
let cueChangedAt = 0;
let lastReadout = 0;
let activeSide = null;

const select = $("exercise");
LIBRARY.forEach((ex) => {
  const opt = document.createElement("option");
  opt.value = ex.id;
  opt.textContent = ex.name;
  select.append(opt);
});
select.addEventListener("change", () => {
  exercise = LIBRARY.find((ex) => ex.id === select.value);
  resetClimb();
  if (running) setStatus("away", true);
});
$("pace").addEventListener("input", (e) => {
  secondsPerLift = Number(e.target.value);
  $("paceValue").textContent = secondsPerLift;
  layoutMeter();
});
$("reset").addEventListener("click", resetClimb);
$("again").addEventListener("click", resetClimb);
$("start").addEventListener("click", start);
bindSoundButton($("sound"));

const leaves = $("leaves");
for (let i = 0; i < 9; i++) {
  const leaf = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const right = i % 2 === 0;
  leaf.setAttribute("viewBox", "0 0 34 20");
  leaf.setAttribute("class", "leaf");
  leaf.setAttribute("aria-hidden", "true");
  leaf.style.top = `${18 + i * 9}%`;
  leaf.style.left = right ? "calc(50% + 2px)" : "calc(50% - 36px)";
  leaf.innerHTML = right
    ? '<path d="M0 10 Q14 -4 34 8 Q16 22 0 10 Z" fill="#5F8A4E"/>'
    : '<path d="M34 10 Q20 -4 0 8 Q18 22 34 10 Z" fill="#5F8A4E"/>';
  leaves.append(leaf);
}

startDemo($("demoBody"), () => ({ exercise, secondsPerLift }));

function targetSpeed() {
  return Math.abs(exercise.range[1] - exercise.range[0]) / secondsPerLift;
}
function thresholds() {
  const t = targetSpeed();
  return { nap: Math.max(2.5, t * 0.25), fast: t * 1.6, max: t * 2.4 };
}
function layoutMeter() {
  const { nap, fast, max } = thresholds();
  ui.zNap.style.width = `${(nap / max) * 100}%`;
  ui.zSlow.style.width = `${((fast - nap) / max) * 100}%`;
  ui.zFast.style.width = `${((max - fast) / max) * 100}%`;
}
layoutMeter();

async function start() {
  initAudio();
  ui.emptyText.textContent = "Waking the sloth…";
  $("start").hidden = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    ui.emptyText.textContent = "Camera access was blocked. Allow camera access in your browser’s address bar, then press Start camera again.";
    $("start").hidden = false;
    return;
  }
  try {
    if (!landmarker) {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
    }
  } catch (err) {
    ui.emptyText.textContent = "The pose model didn’t load. Check your internet connection, then reload the page.";
    $("start").hidden = false;
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  drawing = new DrawingUtils(ctx);
  ui.empty.hidden = true;
  running = true;
  lastFrame = performance.now();
  setStatus("away", true);
  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;
  const now = performance.now();
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, now);
    processFrame(result, now);
  }
  requestAnimationFrame(loop);
}

function chooseSide(landmarks, ex) {
  const next = pickSide(landmarks, ex, activeSide);
  if (next === activeSide) return;
  if (activeSide !== null) {
    smoothAngle = null;
    history = [];
  }
  activeSide = next;
}

function toneColor() {
  return shown === "climbing" ? "#F0B44C" : shown === "fast" ? "#D49AC6" : "#9FB39A";
}
function draw(landmarks) {
  drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(230, 237, 223, 0.45)", lineWidth: 3 });
  const pts = pointsFor(exercise, activeSide).map((i) => px(landmarks[i], canvas.width, canvas.height));
  ctx.strokeStyle = toneColor();
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (exercise.measure.type === "angle") {
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
  } else {
    const hip = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const sh = { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 };
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(sh.x, sh.y);
  }
  ctx.stroke();
  ctx.fillStyle = toneColor();
  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
  });
}

function settle(raw, now) {
  if (raw === shown) {
    candidate = null;
    return;
  }
  if (raw !== candidate) {
    candidate = raw;
    candidateSince = now;
  }
  const wait = { fast: 250, napping: 1200, climbing: 300, away: 600 }[raw] ?? 300;
  if (now - candidateSince >= wait) {
    if (raw === "fast" && shown !== "fast") {
      rushCount++;
      rustle();
    }
    setStatus(raw);
    candidate = null;
  }
}

function processFrame(result, now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const landmarks = result.landmarks && result.landmarks[0];
  let raw;
  let angle = null;
  if (landmarks) chooseSide(landmarks, exercise);

  if (!landmarks || !isVisible(landmarks, exercise, activeSide)) {
    raw = "away";
    smoothAngle = null;
    history = [];
    speed = 0;
    if (landmarks) drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "rgba(230, 237, 223, 0.25)", lineWidth: 2 });
  } else {
    angle = measure(landmarks, exercise, activeSide, canvas.width, canvas.height);
    smoothAngle = smoothAngle === null ? angle : smoothAngle + 0.25 * (angle - smoothAngle);
    history.push({ t: now, a: smoothAngle });
    while (history.length && now - history[0].t > 1000) history.shift();
    const past = history.find((h) => now - h.t <= 500);
    const span = past ? (now - past.t) / 1000 : 0;
    speed = span > 0.15 ? Math.abs(smoothAngle - past.a) / span : 0;
    const { nap, fast } = thresholds();
    raw = speed < nap ? "napping" : speed > fast ? "fast" : "climbing";
    draw(landmarks);
  }

  settle(raw, now);

  if (shown === "climbing" && !finished) {
    const totalClimbSeconds = REPS * 2 * secondsPerLift;
    progress = Math.min(1, progress + (dt * Math.min(speed / targetSpeed(), 1.25)) / totalClimbSeconds);
    climbTime += dt;
    if (progress >= 1) finish();
  }

  if (shown === "climbing" && now - cueChangedAt > 8000) {
    cueIndex = (cueIndex + 1) % exercise.cues.length;
    cueChangedAt = now;
    ui.hint.textContent = exercise.cues[cueIndex];
  }

  ui.sloth.style.setProperty("--p", progress.toFixed(4));
  ui.progressLabel.textContent = progress > 0 ? `${Math.round(progress * 100)}%` : "Treetop";
  const { max } = thresholds();
  ui.marker.style.left = `${Math.min(1, speed / max) * 100}%`;
  const [rs, re] = exercise.range;
  const through = smoothAngle === null ? 0 : Math.min(1, Math.max(0, (smoothAngle - rs) / (re - rs)));
  ui.rangeFill.style.width = `${through * 100}%`;
  if (now - lastReadout > 150) {
    lastReadout = now;
    const side = exercise.measure.sides && activeSide ? `Tracking your ${activeSide} leg. ` : "";
    ui.readout.textContent = angle === null
      ? "Speed appears once the camera sees you."
      : `${side}${Math.round(speed)}°/s now, sloth pace is about ${Math.round(targetSpeed())}°/s.`;
  }
  updateTone(shown === "climbing" && !finished, progress);
}

function setStatus(next, force = false) {
  if (next === shown && !force) return;
  shown = next;
  ui.state.dataset.tone = next;
  ui.sloth.classList.toggle("climbing", next === "climbing" && !finished);
  ui.sloth.classList.toggle("napping", next === "napping" && !finished);
  ui.vineWrap.classList.toggle("swaying", next === "fast" && !finished);
  if (finished) return;
  const copy = {
    away: ["Step into view", exercise.setup],
    napping: ["Napping", "Keep moving, just slowly. The sloth only climbs while you move."],
    climbing: ["Climbing", exercise.cues[cueIndex]],
    fast: ["Too quick", "The sloth is holding on. Slow down and it will climb again."]
  }[next];
  if (!copy) return;
  ui.state.textContent = copy[0];
  ui.hint.textContent = copy[1];
  if (next === "climbing") cueChangedAt = performance.now();
}

function finish() {
  finished = true;
  const mins = Math.floor(climbTime / 60);
  const secs = String(Math.round(climbTime % 60)).padStart(2, "0");
  ui.doneStats.textContent = `${mins}:${secs} of slow climbing. You rushed ${rushCount} ${rushCount === 1 ? "time" : "times"}.`;
  ui.done.classList.add("show");
  ui.state.textContent = "Treetop reached";
  ui.state.dataset.tone = "climbing";
  ui.hint.textContent = "Take a breath. Notice how your body feels now.";
  ui.sloth.classList.remove("climbing", "napping");
  ui.vineWrap.classList.remove("swaying");
}

function resetClimb() {
  progress = 0;
  climbTime = 0;
  rushCount = 0;
  finished = false;
  smoothAngle = null;
  history = [];
  cueIndex = 0;
  activeSide = null;
  ui.done.classList.remove("show");
  ui.sloth.style.setProperty("--p", "0");
  ui.progressLabel.textContent = "Treetop";
  layoutMeter();
  if (running) setStatus(shown, true);
}
