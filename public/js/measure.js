// Pure landmark maths: no DOM, no state. Angles are in degrees on pixel coordinates.

export function px(lm, width, height) {
  return { x: lm.x * width, y: lm.y * height };
}
export function pointsFor(ex, side) {
  if (ex.measure.type === "tilt") return [...ex.measure.from, ...ex.measure.to];
  if (ex.measure.sides) return ex.measure.sides[side ?? "left"];
  return ex.measure.points;
}
function sideVisibility(landmarks, pts) {
  return Math.min(...pts.map((i) => landmarks[i].visibility ?? 1));
}
// Returns the side to track. Only switches away from `current` when the other side is clearly more visible.
// With "pick": "moving" the first choice is by visibility; after that main.js follows the moving side.
export function pickSide(landmarks, ex, current) {
  if (!ex.measure.sides) return current;
  if (ex.measure.pick === "moving" && current !== null) return current;
  const left = sideVisibility(landmarks, ex.measure.sides.left);
  const right = sideVisibility(landmarks, ex.measure.sides.right);
  const best = right > left ? "right" : "left";
  if (current === null || (best !== current && Math.abs(right - left) > 0.25)) return best;
  return current;
}
export function isVisible(landmarks, ex, side) {
  return pointsFor(ex, side).every((i) => (landmarks[i].visibility ?? 1) > 0.5);
}
function angleAt(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}
export function measure(landmarks, ex, side, width, height) {
  if (ex.measure.type === "angle") {
    const [a, b, c] = pointsFor(ex, side).map((i) => px(landmarks[i], width, height));
    return angleAt(a, b, c);
  }
  const mid = (i, j) => {
    const p = px(landmarks[i], width, height);
    const q = px(landmarks[j], width, height);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };
  const hip = mid(...ex.measure.from);
  const shoulder = mid(...ex.measure.to);
  return Math.abs((Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y) * 180) / Math.PI);
}
