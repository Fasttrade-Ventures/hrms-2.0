import { describe, expect, it } from "vitest";
import {
  createPositionSchema,
  updatePositionSchema,
  createEmployeeSchema,
  updateEmployeeCoreSchema,
} from "@hrms/validation";

describe("Positions Catalog Schema & Validation", () => {
  it("validates valid create position payload", () => {
    const valid = createPositionSchema.parse({
      title: "Senior Software Engineer",
      departmentId: "123e4567-e89b-12d3-a456-426614174000",
      description: "Responsible for full-stack web applications and microservices.",
      isActive: true,
    });

    expect(valid.title).toBe("Senior Software Engineer");
    expect(valid.departmentId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(valid.isActive).toBe(true);
  });

  it("requires a non-empty position title", () => {
    expect(() =>
      createPositionSchema.parse({
        title: "",
      }),
    ).toThrow();
  });

  it("defaults isActive to true when omitted", () => {
    const valid = createPositionSchema.parse({
      title: "HR Executive",
    });

    expect(valid.isActive).toBe(true);
    expect(valid.departmentId).toBeUndefined();
    expect(valid.description).toBeUndefined();
  });

  it("validates update position payload with inactive toggle", () => {
    const updated = updatePositionSchema.parse({
      title: "Legacy Role",
      isActive: false,
    });

    expect(updated.title).toBe("Legacy Role");
    expect(updated.isActive).toBe(false);
  });

  it("accepts positionId in createEmployeeSchema and updateEmployeeCoreSchema", () => {
    const employee = createEmployeeSchema.parse({
      fullName: "Alex Tan",
      email: "alex.tan@example.com",
      joinDate: "2026-10-01",
      positionId: "123e4567-e89b-12d3-a456-426614174000",
      jobTitle: "Senior Software Engineer",
    });

    expect(employee.positionId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(employee.jobTitle).toBe("Senior Software Engineer");

    const coreUpdate = updateEmployeeCoreSchema.parse({
      positionId: "123e4567-e89b-12d3-a456-426614174000",
      jobTitle: "Lead Engineer",
    });

    expect(coreUpdate.positionId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(coreUpdate.jobTitle).toBe("Lead Engineer");
  });
});
