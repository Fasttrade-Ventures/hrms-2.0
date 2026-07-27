import { describe, expect, it } from "vitest";

import { validateCustomValues } from "./custom-fields";

const schema = [
  { key: "imei", label: "IMEI", type: "text" as const, required: true },
  { key: "color", label: "Color", type: "select" as const, options: ["Black", "Silver"] },
];

describe("validateCustomValues", () => {
  it("requires required fields", () => {
    expect(() => validateCustomValues(schema, {})).toThrow(/imei/i);
  });

  it("returns normalized values", () => {
    expect(validateCustomValues(schema, { imei: "123", color: "Black" })).toEqual({
      imei: "123",
      color: "Black",
    });
  });
});
