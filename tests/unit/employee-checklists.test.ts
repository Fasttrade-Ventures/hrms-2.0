import { describe, expect, it } from "vitest";

import { checklistOwnerLabel, openChecklistTasks, tasksFromTemplate } from "@/lib/employees/checklists";

describe("employee checklists", () => {
  it("copies template items into open tasks for that employee", () => {
    const tasks = tasksFromTemplate("onboarding", [
      { title: " Collect laptop ", ownerLabel: "IT" },
      { title: "   ", ownerLabel: "HR" },
      { title: "Sign handbook", ownerLabel: "" },
    ]);

    expect(tasks).toEqual([
      { kind: "onboarding", title: "Collect laptop", ownerLabel: "IT", description: "", done: false },
      { kind: "onboarding", title: "Sign handbook", ownerLabel: "HR", description: "", done: false },
    ]);
  });

  it("accepts a portal role as the task owner", () => {
    expect(checklistOwnerLabel("hr_administrator")).toBe("HR Administrator");
    expect(checklistOwnerLabel("manager")).toBe("Manager");
    expect(checklistOwnerLabel("HR")).toBeNull();
  });

  it("keeps only tasks that are not done", () => {
    const open = openChecklistTasks([
      { id: "1", kind: "offboarding", title: "Return laptop", ownerLabel: "IT", description: "", done: false },
      { id: "2", kind: "offboarding", title: "Disable account", ownerLabel: "HR", description: "", done: true },
    ]);
    expect(open.map((task) => task.id)).toEqual(["1"]);
  });
});
