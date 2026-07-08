// ============================================================
// Geo Service – calculates distance between two GPS coordinates
// using the Haversine formula.
// ============================================================

// --------------------------------------------------
// distanceMeters – Returns the great-circle distance in meters
// between two latitude/longitude points on Earth.
// Uses the Haversine formula:
//   a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
//   c = 2 · atan2(√a, √(1-a))
//   d = R · c   where R = Earth's radius (6,371,000 m)
// --------------------------------------------------
export function distanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
