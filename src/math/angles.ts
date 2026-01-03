export function lerpAngleDeg(aDeg: number, bDeg: number, t: number): number {
  // Interpolate shortest path on a circle.
  const a = wrapDeg(aDeg);
  const b = wrapDeg(bDeg);
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return wrapDeg(a + d * t);
}

export function wrapDeg(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}


