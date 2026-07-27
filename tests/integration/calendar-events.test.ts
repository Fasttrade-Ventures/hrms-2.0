import { describe, expect, it } from "vitest";

import { expandLeaveRequestDays, mergeEventsForDay } from "../../packages/domain/src/calendar/events";
import { groupEventsByDate } from "../../apps/web/src/lib/calendar/types";

describe("groupEventsByDate", () => {
  it("groups expanded leave days", () => {
    const events = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      halfDay: false,
      status: "approved",
      leaveTypeName: "Annual Leave",
      employeeName: "Siti",
    });
    const grouped = groupEventsByDate(events);
    expect(grouped.get("2026-07-10")).toHaveLength(1);
    expect(grouped.get("2026-07-11")).toHaveLength(1);
  });
});

describe("mergeEventsForDay ordering", () => {
  it("keeps holidays first", () => {
    const leave = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      halfDay: false,
      status: "pending",
      leaveTypeName: "MC",
      employeeName: "Ali",
    })[0]!;
    const holiday = {
      id: "h1",
      kind: "holiday" as const,
      title: "Merdeka",
      date: "2026-07-01",
      sourceId: "h1",
      sortKey: "holiday:h1",
    };
    const merged = mergeEventsForDay("2026-07-01", [leave, holiday]);
    expect(merged[0]?.kind).toBe("holiday");
  });
});
