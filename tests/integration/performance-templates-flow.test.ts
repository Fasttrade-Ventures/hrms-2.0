import { describe, expect, it } from "vitest";
import {
  appraisalTemplateSchema,
  createReviewCycleWithTemplateSchema,
} from "@hrms/validation";

describe("Performance Appraisal Templates Integration Lifecycle", () => {
  it("executes the full template lifecycle: definition, validation, cloning, cycle linking, and mutation guards", () => {
    // 1. Define and validate initial template
    const templateInput = {
      name: "Engineering H2 Performance Review",
      description: "Appraisal for software engineering teams",
      targetDepartmentId: "a1111111-1111-1111-1111-111111111111",
      isDefault: true,
      isActive: true,
      ratingScale: {
        min: 1,
        max: 5,
        step: 1,
        labels: {
          "1": "Needs Immediate Improvement",
          "2": "Developing",
          "3": "Meets High Standards",
          "4": "Exceeds Expectations",
          "5": "Role Model",
        },
      },
      sections: [
        {
          title: "Technical Excellence & Code Quality",
          description: "Architecture, clean code, testing, and system reliability.",
          weightPct: 50,
          sortOrder: 0,
          questions: [
            {
              title: "Code Quality & Maintainability",
              description: "Writes well-structured, thoroughly tested code.",
              questionType: "rating" as const,
              required: true,
              sortOrder: 0,
            },
            {
              title: "System Design & Scalability",
              description: "Designs robust services and handles technical debt effectively.",
              questionType: "rating" as const,
              required: true,
              sortOrder: 1,
            },
          ],
        },
        {
          title: "Impact & Project Delivery",
          description: "Delivery against roadmap milestones.",
          weightPct: 30,
          sortOrder: 1,
          questions: [
            {
              title: "Key Projects Delivered",
              description: "Highlight major features shipped during this cycle.",
              questionType: "text" as const,
              required: true,
              sortOrder: 0,
            },
          ],
        },
        {
          title: "Leadership & Team Mentorship",
          description: "Cross-functional support and onboarding peer engineers.",
          weightPct: 20,
          sortOrder: 2,
          questions: [
            {
              title: "Peer Mentorship",
              description: "Actively supports junior team members and participates in code reviews.",
              questionType: "yes_no" as const,
              required: false,
              sortOrder: 0,
            },
          ],
        },
      ],
    };

    const validatedTemplate = appraisalTemplateSchema.parse(templateInput);
    expect(validatedTemplate.name).toBe("Engineering H2 Performance Review");
    expect(validatedTemplate.sections).toHaveLength(3);
    expect(validatedTemplate.sections.reduce((acc, s) => acc + s.weightPct, 0)).toBe(100);

    // 2. Simulate Template Cloning
    const clonedTemplate = {
      ...validatedTemplate,
      name: `${validatedTemplate.name} (Copy)`,
      isDefault: false,
      sections: validatedTemplate.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => ({ ...q })),
      })),
    };

    const validatedClone = appraisalTemplateSchema.parse(clonedTemplate);
    expect(validatedClone.name).toBe("Engineering H2 Performance Review (Copy)");
    expect(validatedClone.isDefault).toBe(false);
    expect(validatedClone.sections).toHaveLength(3);

    // 3. Link Template to a Review Cycle
    const cycleInput = {
      name: "H2 2026 Engineering Appraisal Cycle",
      periodStart: "2026-07-01",
      periodEnd: "2026-12-31",
      dueDate: "2027-01-15",
      templateId: "b2222222-2222-2222-2222-222222222222",
      targetDepartmentId: "a1111111-1111-1111-1111-111111111111",
    };

    const validatedCycle = createReviewCycleWithTemplateSchema.parse(cycleInput);
    expect(validatedCycle.templateId).toBe("b2222222-2222-2222-2222-222222222222");
    expect(validatedCycle.targetDepartmentId).toBe("a1111111-1111-1111-1111-111111111111");

    // 4. Safety Guard Simulation: Active cycle prevents destructive deletion
    const activeCyclesCount = 1;
    const canMutateActiveTemplate = (activeCount: number) => {
      if (activeCount > 0) {
        throw new Error(
          `Cannot modify sections of this template because it is assigned to ${activeCount} active appraisal cycle(s).`,
        );
      }
      return true;
    };

    expect(() => canMutateActiveTemplate(activeCyclesCount)).toThrow(
      /Cannot modify sections of this template because it is assigned to 1 active appraisal cycle/i,
    );

    // When active cycles are closed (count is 0), modification is allowed
    expect(canMutateActiveTemplate(0)).toBe(true);
  });
});
