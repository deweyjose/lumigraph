/**
 * Equirectangular SVG mapping: viewBox 0 0 360 180
 * x = longitude + 180, y = 90 − latitude
 */
export function lonLatToSvg(
  lon: number,
  lat: number
): { x: number; y: number } {
  return { x: lon + 180, y: 90 - lat };
}

export function shortestLongitudeDelta(from: number, to: number): number {
  let d = to - from;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function interpolateLonLat(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  t: number
): { lat: number; lon: number } {
  const lat = from.lat + (to.lat - from.lat) * t;
  const dLon = shortestLongitudeDelta(from.lon, to.lon);
  let lon = from.lon + dLon * t;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

/**
 * Maps latitude/longitude onto a circular telemetry dial while keeping the
 * marker inside the ringed viewport. Longitude drives x and latitude drives y.
 */
export function lonLatToDial(
  lon: number,
  lat: number,
  radius = 1
): { x: number; y: number } {
  const xNorm = lon / 180;
  const yNorm = lat / 90;
  const scale = Math.max(1, Math.hypot(xNorm, yNorm));
  const x = (xNorm / scale) * radius;
  const y = (-yNorm / scale) * radius;
  return {
    x: x === 0 ? 0 : x,
    y: y === 0 ? 0 : y,
  };
}
