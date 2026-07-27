import { describe, expect, it } from "vitest";

import {
  calendarMonthBounds,
  expandDateRangeToDays,
  expandLeaveRequestDays,
  mergeEventsForDay,
} from "./events";

describe("expandDateRangeToDays", () => {
  it("expands inclusive range", () => {
    expect(expandDateRangeToDays("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });
});

describe("expandLeaveRequestDays", () => {
  it("marks half day on end date only", () => {
    const days = expandLeaveRequestDays({
      id: "lr1",
      startDate: "2026-07-10",
      endDate: "2026-07-11",
      halfDay: true,
      status: "approved",
      leaveTypeName: "Annual Leave",
      employeeName: "Ali",
    });
    expect(days).toHaveLength(2);
    expect(days[1]?.title).toContain("½");
  });
});

describe("mergeEventsForDay", () => {
  it("orders holiday before company before leave", () => {
    const sorted = mergeEventsForDay("2026-07-01", [
      { kind: "leave", sortKey: "leave:1", id: "1", title: "Leave", date: "2026-07-01", sourceId: "1" },
      { kind: "holiday", sortKey: "holiday:1", id: "2", title: "Holiday", date: "2026-07-01", sourceId: "2" },
      {
        kind: "company_event",
        sortKey: "company:1",
        id: "3",
        title: "Event",
        date: "2026-07-01",
        sourceId: "3",
      },
    ]);
    expect(sorted.map((e) => e.kind)).toEqual(["holiday", "company_event", "leave"]);
  });
});

describe("calendarMonthBounds", () => {
  it("pads month to Mon-start weeks", () => {
    const { weeks } = calendarMonthBounds(2026, 7);
    expect(weeks[0]?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weeks.at(-1)?.length).toBe(7);
  });
});
