import { describe, expect, it } from "vitest";

import { openChecklistTasks, tasksFromTemplate } from "@/lib/employees/checklists";

describe("employee checklists", () => {
  it("copies template items into open tasks for that employee", () => {
    const tasks = tasksFromTemplate("onboarding", [
      { title: " Collect laptop ", ownerLabel: "IT" },
      { title: "   ", ownerLabel: "HR" },
      { title: "Sign handbook", ownerLabel: "" },
    ]);

    expect(tasks).toEqual([
      { kind: "onboarding", title: "Collect laptop", ownerLabel: "IT", done: false },
      { kind: "onboarding", title: "Sign handbook", ownerLabel: "HR", done: false },
    ]);
  });

  it("keeps only tasks that are not done", () => {
    const open = openChecklistTasks([
      { id: "1", kind: "offboarding", title: "Return laptop", ownerLabel: "IT", done: false },
      { id: "2", kind: "offboarding", title: "Disable account", ownerLabel: "HR", done: true },
    ]);
    expect(open.map((task) => task.id)).toEqual(["1"]);
  });
});
