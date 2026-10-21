// Animated stick-figure demo, mirrored like the camera and driven by the pace slider.

const rad = (d) => (d * Math.PI) / 180;
const LIGHT = "#E6EDDF";
const GOLD = "#F0B44C";

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
    seg(up.shA, up.handA, active === "A" ? GOLD : LIGHT) +
    seg(up.shB, up.handB, active === "B" ? GOLD : LIGHT) + head(up.head);
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
      squat: () => squatFigure(value)
    };
    const figure = figures[exercise.demo];
    demoBody.innerHTML = figure ? figure() : "";
  }
  requestAnimationFrame(demoFrame);
}
