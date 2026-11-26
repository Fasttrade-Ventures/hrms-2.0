import { describe, expect, it } from "vitest";

import {
  HIRIX_CORE_KEY_NAME,
  HIRIX_CORE_SCOPES,
  findHirixCoreKey,
  liveHirixCoreKeyIds,
  type ApiKeyRow,
} from "../../apps/web/src/lib/integrations/hirix-core/keys";

function key(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: "k1",
    name: HIRIX_CORE_KEY_NAME,
    key_prefix: "hrms_live_abcde",
    scopes: ["employees:write"],
    last_used_at: null,
    revoked_at: null,
    created_at: "2026-11-26T08:00:00.000Z",
    ...overrides,
  };
}

describe("Hirix Core key", () => {
  it("is locked to creating employees only", () => {
    expect([...HIRIX_CORE_SCOPES]).toEqual(["employees:write"]);
  });

  it("finds the live key", () => {
    expect(findHirixCoreKey([key()])?.id).toBe("k1");
  });

  it("ignores revoked keys, other names and keys with extra scopes", () => {
    expect(findHirixCoreKey([key({ revoked_at: "2026-11-26T09:00:00.000Z" })])).toBeNull();
    expect(findHirixCoreKey([key({ name: "Virtual office" })])).toBeNull();
    expect(findHirixCoreKey([key({ scopes: ["employees:write", "payroll:read"] })])).toBeNull();
    expect(findHirixCoreKey([key({ scopes: null })])).toBeNull();
  });

  it("prefers the newest live key", () => {
    const keys = [
      key({ id: "old", created_at: "2026-11-01T00:00:00.000Z" }),
      key({ id: "new", created_at: "2026-11-20T00:00:00.000Z" }),
    ];
    expect(findHirixCoreKey(keys)?.id).toBe("new");
  });

  it("lists every live Hirix Core key so rotation revokes them all", () => {
    const keys = [
      key({ id: "a" }),
      key({ id: "b", scopes: ["employees:read"] }),
      key({ id: "c", revoked_at: "2026-11-26T09:00:00.000Z" }),
      key({ id: "d", name: "Other" }),
    ];
    expect(liveHirixCoreKeyIds(keys)).toEqual(["a", "b"]);
  });
});
