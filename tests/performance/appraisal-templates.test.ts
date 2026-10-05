import { describe, expect, it } from "vitest";
import {
  appraisalTemplateSchema,
  appraisalSectionSchema,
  appraisalQuestionSchema,
  createReviewCycleWithTemplateSchema,
} from "@hrms/validation";

describe("Performance Appraisal Templates Validation", () => {
  it("validates a complete appraisal template with sections and questions", () => {
    const validData = {
      name: "Annual Performance Review 2026",
      description: "Standard evaluation for salaried staff.",
      targetDepartmentId: "123e4567-e89b-12d3-a456-426614174000",
      isDefault: true,
      isActive: true,
      ratingScale: {
        min: 1,
        max: 5,
        step: 1,
        labels: {
          "1": "Unsatisfactory",
          "2": "Needs Improvement",
          "3": "Meets Expectations",
          "4": "Exceeds Expectations",
          "5": "Outstanding",
        },
      },
      sections: [
        {
          title: "Core Competencies",
          description: "Behavioral and cultural alignment.",
          weightPct: 40,
          sortOrder: 0,
          questions: [
            {
              title: "Problem Solving",
              description: "Solves complex operational problems effectively.",
              questionType: "rating" as const,
              required: true,
              sortOrder: 0,
            },
            {
              title: "Team Collaboration",
              description: "Assists teammates and communicates clearly.",
              questionType: "rating" as const,
              required: true,
              sortOrder: 1,
            },
          ],
        },
        {
          title: "Key Results & Achievements",
          description: "Goal delivery against cycle targets.",
          weightPct: 60,
          sortOrder: 1,
          questions: [
            {
              title: "Key Projects Delivered",
              description: "List major outcomes and milestones delivered.",
              questionType: "text" as const,
              required: true,
              sortOrder: 0,
            },
            {
              title: "Completed Certification Requirement",
              description: "Has the employee passed required training modules?",
              questionType: "yes_no" as const,
              required: false,
              sortOrder: 1,
            },
          ],
        },
      ],
    };

    const parsed = appraisalTemplateSchema.parse(validData);
    expect(parsed.name).toBe("Annual Performance Review 2026");
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[0].questions).toHaveLength(2);
    expect(parsed.sections[1].questions[0].questionType).toBe("text");
    expect(parsed.sections[1].questions[1].questionType).toBe("yes_no");
  });

  it("rejects templates with missing name or empty sections", () => {
    expect(() =>
      appraisalTemplateSchema.parse({
        name: "",
        sections: [],
      }),
    ).toThrow();
  });

  it("rejects sections without questions", () => {
    expect(() =>
      appraisalSectionSchema.parse({
        title: "Empty Section",
        weightPct: 50,
        sortOrder: 0,
        questions: [],
      }),
    ).toThrow(/at least one question/i);
  });

  it("validates question types (rating, text, yes_no)", () => {
    const validQuestion = appraisalQuestionSchema.parse({
      title: "Self Reflection",
      questionType: "text",
      required: true,
    });
    expect(validQuestion.questionType).toBe("text");

    expect(() =>
      appraisalQuestionSchema.parse({
        title: "Invalid Type Question",
        questionType: "unknown_type",
      }),
    ).toThrow();
  });

  it("validates review cycle creation with template and department linking", () => {
    const cycleInput = {
      name: "Q3 Operations Appraisal",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      dueDate: "2026-10-15",
      templateId: "123e4567-e89b-12d3-a456-426614174000",
      targetDepartmentId: "123e4567-e89b-12d3-a456-426614174001",
    };

    const parsed = createReviewCycleWithTemplateSchema.parse(cycleInput);
    expect(parsed.name).toBe("Q3 Operations Appraisal");
    expect(parsed.templateId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(parsed.targetDepartmentId).toBe("123e4567-e89b-12d3-a456-426614174001");
  });
});
