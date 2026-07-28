export type GeofenceConfig = {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  branchName: string;
};

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusM = 6_371_000;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

export function isWithinGeofence(
  coords: { latitude: number; longitude: number },
  geofence: Pick<GeofenceConfig, "latitude" | "longitude" | "radiusMeters">,
): boolean {
  return distanceMeters(coords, geofence) <= geofence.radiusMeters;
}

export function validateGeofenceClockIn(input: {
  geofence: GeofenceConfig | null;
  latitude?: number | null;
  longitude?: number | null;
}): { ok: true; status: "present" | "out_of_range" } | { ok: false; error: string } {
  if (!input.geofence?.enabled) {
    return { ok: true, status: "present" };
  }

  if (input.latitude == null || input.longitude == null) {
    return { ok: false, error: "Location is required to clock in at this branch." };
  }

  const within = isWithinGeofence(
    { latitude: input.latitude, longitude: input.longitude },
    input.geofence,
  );

  return within
    ? { ok: true, status: "present" }
    : { ok: true, status: "out_of_range" };
}
