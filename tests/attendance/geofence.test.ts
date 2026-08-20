import { describe, expect, it } from "vitest";

import { distanceMeters, isWithinGeofence, validateGeofenceClockIn } from "@/lib/attendance/geofence";

describe("attendance geofence", () => {
  const branch = {
    enabled: true,
    branchName: "HQ",
    latitude: 3.139,
    longitude: 101.6869,
    radiusMeters: 100,
  };

  it("detects coordinates within radius", () => {
    expect(
      isWithinGeofence({ latitude: 3.13901, longitude: 101.68695 }, branch),
    ).toBe(true);
  });

  it("detects coordinates outside radius", () => {
    expect(distanceMeters({ latitude: 3.15, longitude: 101.7 }, branch)).toBeGreaterThan(1000);
  });

  it("requires coordinates when geofence is enabled", () => {
    const result = validateGeofenceClockIn({ geofence: branch, latitude: null, longitude: null });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Location is required");
    }
  });

  it("marks out_of_range when outside geofence and outsideAction is flag", () => {
    const result = validateGeofenceClockIn({
      geofence: { ...branch, outsideAction: "flag" },
      latitude: 3.2,
      longitude: 101.8,
    });
    expect(result).toEqual({ ok: true, status: "out_of_range" });
  });

  it("blocks clock-in when outside geofence and outsideAction is block", () => {
    const result = validateGeofenceClockIn({
      geofence: { ...branch, outsideAction: "block" },
      latitude: 3.2,
      longitude: 101.8,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("outside the allowed clock-in radius");
    }
  });
});
