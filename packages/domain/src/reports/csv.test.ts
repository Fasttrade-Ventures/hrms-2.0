import { describe, expect, it } from "vitest";

import { rowsToCsv } from "./csv";

describe("rowsToCsv", () => {
  it("escapes quotes in cells", () => {
    const csv = rowsToCsv(["name"], [['Say "hi"']]);
    expect(csv).toBe('"name"\n"Say ""hi"""');
  });
});
