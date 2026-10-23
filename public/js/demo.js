// Animated stick-figure demo, mirrored like the camera and driven by the pace slider.

const rad = (d) => (d * Math.PI) / 180;
const LIGHT = "#E6EDDF";
const GOLD = "#F0B44C";
const DIM = "rgba(230, 237, 223, 0.5)";
const FLOOR = "rgba(159, 179, 154, 0.5)";

function rot(p, c, deg) {
  const r = rad(deg);
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(r) - dy * Math.sin(r), c[1] + dx * Math.sin(r) + dy * Math.cos(r)];
}
function seg(a, b, color = LIGHT, w = 5) {
  return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function head(p) {
  return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="${LIGHT}"/>`;
}
function frontFigure(personLeftDeg, personRightDeg, tilt, active) {
  const hip = [60, 92];
  const up = { head: [60, 30], neck: [60, 46], shA: [76, 48], shB: [44, 48] };
  for (const k in up) up[k] = rot(up[k], hip, tilt);
  up.handA = [up.shA[0] + 38 * Math.sin(rad(personLeftDeg)), up.shA[1] + 38 * Math.cos(rad(personLeftDeg))];
  up.handB = [up.shB[0] - 38 * Math.sin(rad(personRightDeg)), up.shB[1] + 38 * Math.cos(rad(personRightDeg))];
  return seg([52, 94], [50, 158]) + seg([68, 94], [70, 158]) + seg([52, 94], [68, 94]) +
    seg(hip, up.neck, active === "torso" ? GOLD : LIGHT) + seg(up.shB, up.shA) +
    seg(up.shA, up.handA, active === "A" || active === "both" ? GOLD : LIGHT) +
    seg(up.shB, up.handB, active === "B" || active === "both" ? GOLD : LIGHT) + head(up.head);
}
// Side view facing left. Limb angles are degrees from straight down, positive = forward.
// The figure stands on the ground: the lowest foot point is placed at y = 156.
function at(p, deg, len) {
  return [p[0] - len * Math.sin(rad(deg)), p[1] + len * Math.cos(rad(deg))];
}
function sideFigure({ lean = 0, near = { thigh: 0, shin: 0 }, far = { thigh: 0, shin: 0 }, arm = 8, active = [] }) {
  const legs = [near, far].map(({ thigh, shin, toe = shin + 90 }) => {
    const knee = at([0, 0], thigh, 36);
    const ankle = at(knee, shin, 36);
    return { knee, ankle, toe: at(ankle, toe, 12) };
  });
  const lowest = Math.max(...legs.flatMap((l) => [l.ankle[1], l.toe[1]]));
  const hip = [64, 156 - lowest];
  const move = (p) => [p[0] + hip[0], p[1] + hip[1]];
  const [n, f] = legs.map((l) => ({ knee: move(l.knee), ankle: move(l.ankle), toe: move(l.toe) }));
  const shoulder = at(hip, 180 - lean, 44);
  const color = (part, base = LIGHT) => (active.includes(part) ? GOLD : base);
  const leg = (l, c) => seg(hip, l.knee, c) + seg(l.knee, l.ankle, c) + seg(l.ankle, l.toe, c);
  return leg(f, color("far", DIM)) + seg(hip, shoulder, color("trunk")) + leg(n, color("near")) +
    seg(shoulder, at(shoulder, arm, 38), color("arm")) + head(at(hip, 180 - lean, 60));
}
// Solve x in [lo, hi] where fn(x) crosses target; fn must be monotonic on the interval.
function solve(fn, target, lo, hi) {
  const rising = fn(hi) > fn(lo);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if ((fn(mid) < target) === rising) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
// Both knees bend to `knee` degrees. The back thigh is solved so the tucked back toes
// land level with the front foot, keeping both feet on the ground.
function lungeFigure(knee) {
  const bend = 180 - knee;
  const front = 20 + (170 - knee) * 0.9;
  const frontAnkle = 36 * Math.cos(rad(front)) + 36 * Math.cos(rad(front - bend));
  const backToe = (t) => 36 * Math.cos(rad(t)) + 36 * Math.cos(rad(t - bend)) + 12 * Math.cos(rad(40));
  const back = solve(backToe, frontAnkle, -60, 10);
  return sideFigure({
    near: { thigh: front, shin: front - bend },
    far: { thigh: back, shin: back - bend, toe: 40 },
    active: ["near", "far"]
  });
}
// Upper intersection of the circles around p (radius r1) and q (radius r2).
function meet(p, r1, q, r2) {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const m = [p[0] + (a * dx) / d, p[1] + (a * dy) / d];
  return [m[0] + (h * dy) / d, m[1] - (h * dx) / d];
}
function angleAt(a, b, c) {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}
// Floor poses are solved from the measured hip angle (shoulder-hip-knee), so the demo
// matches the range bar exactly and limbs keep their lengths.
function floorFigure({ head: h, shoulder, hand, hip, knee, ankle }) {
  return seg([4, 158], [116, 158], FLOOR, 2) + seg(knee, ankle) + seg(hip, knee, GOLD) +
    seg(hip, shoulder, GOLD) + seg(shoulder, hand) + head(h);
}
// All fours with hands and knees fixed. Thigh and arm are the same length, so the body is a
// parallelogram: the trunk stays level and the hip angle is 90° minus the thigh's lean back.
function childsPoseFigure(hipAngle) {
  const knee = [72, 152];
  const lean = rad(90 - hipAngle);
  const hip = [knee[0] + 40 * Math.sin(lean), knee[1] - 40 * Math.cos(lean)];
  const shoulder = [hip[0] - 48, hip[1]];
  return floorFigure({ head: [shoulder[0] - 12, shoulder[1] - 2], shoulder, hand: [24, 152], hip, knee, ankle: [108, 152] });
}
// Lying on the back, shoulders and feet fixed. The trunk pivots up around the shoulder.
function bridgeFigure(hipAngle) {
  const shoulder = [26, 148];
  const ankle = [108, 152];
  const pose = (lift) => {
    const hip = [shoulder[0] + 40 * Math.cos(rad(lift)), shoulder[1] - 40 * Math.sin(rad(lift))];
    return { hip, knee: meet(hip, 38, ankle, 38) };
  };
  const lift = solve((l) => { const p = pose(l); return angleAt(shoulder, p.hip, p.knee); }, hipAngle, 0, 22);
  return floorFigure({ head: [12, 144], shoulder, hand: [56, 152], ...pose(lift), ankle });
}
function squatFigure(knee) {
  const a = (180 - knee) / 2;
  const ankle = [70, 156];
  const kneeP = [ankle[0] - 36 * Math.sin(rad(a)), ankle[1] - 36 * Math.cos(rad(a))];
  const hipP = [kneeP[0] + 36 * Math.sin(rad(a * 1.4)), kneeP[1] - 36 * Math.cos(rad(a * 1.4))];
  const lean = a * 0.7;
  const shoulder = [hipP[0] - 44 * Math.sin(rad(lean)), hipP[1] - 44 * Math.cos(rad(lean))];
  const headP = [hipP[0] - 60 * Math.sin(rad(lean)), hipP[1] - 60 * Math.cos(rad(lean))];
  const reach = 15 + ((180 - knee) / 85) * 70;
  const hand = [shoulder[0] - 34 * Math.sin(rad(reach)), shoulder[1] + 34 * Math.cos(rad(reach))];
  return seg(ankle, [ankle[0] - 14, ankle[1]]) + seg(ankle, kneeP, GOLD) + seg(kneeP, hipP, GOLD) +
    seg(hipP, shoulder) + seg(shoulder, hand) + head(headP);
}

// getState() returns { exercise, secondsPerLift } so the demo always follows the current choice.
export function startDemo(demoBody, getState) {
  const demoStart = performance.now();
  function demoFrame(now) {
    requestAnimationFrame(demoFrame);
    if (demoBody.closest("[hidden]")) return;
    const { exercise, secondsPerLift } = getState();
    const period = 2 * secondsPerLift * 1000;
    const cycle = (now - demoStart) / period;
    const f = (1 - Math.cos(2 * Math.PI * (cycle % 1))) / 2;
    const [s, e] = exercise.range;
    const value = s + (e - s) * f;
    const figures = {
      armLeft: () => frontFigure(value, 15, 0, "A"),
      armRight: () => frontFigure(15, value, 0, "B"),
      bend: () => frontFigure(10, 10, (Math.floor(cycle) % 2 ? -1 : 1) * value, "torso"),
      squat: () => squatFigure(value),
      armsBoth: () => frontFigure(value, value, 0, "both"),
      armForward: () => sideFigure({ arm: value, active: ["arm"] }),
      kneeLift: () => sideFigure({ near: { thigh: 180 - value, shin: (180 - value) * 0.15 }, active: ["near"] }),
      heelCurl: () => sideFigure({ near: { thigh: 0, shin: value - 180 }, arm: 50, active: ["near"] }),
      rollDown: () => sideFigure({ lean: 180 - value, arm: 4, active: ["trunk"] }),
      lunge: () => lungeFigure(value),
      childsPose: () => childsPoseFigure(value),
      bridge: () => bridgeFigure(value)
    };
    const figure = figures[exercise.demo];
    demoBody.innerHTML = figure ? figure() : "";
  }
  requestAnimationFrame(demoFrame);
}
