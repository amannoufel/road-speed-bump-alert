/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if user is approaching a hump (within alert radius, heading toward it)
 */
export function isApproachingHump(
  userLat: number,
  userLng: number,
  humpLat: number,
  humpLng: number,
  alertRadiusMeters: number = 100
): boolean {
  const dist = haversineDistance(userLat, userLng, humpLat, humpLng);
  return dist <= alertRadiusMeters;
}

/**
 * Find nearby humps sorted by distance
 */
export function findNearbyHumps<T extends { lat: number; lng: number }>(
  userLat: number,
  userLng: number,
  humps: T[],
  radiusMeters: number = 200
): Array<T & { distance: number }> {
  return humps
    .map((hump) => ({
      ...hump,
      distance: haversineDistance(userLat, userLng, hump.lat, hump.lng),
    }))
    .filter((h) => h.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
}
