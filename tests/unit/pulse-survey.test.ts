import { describe, expect, it } from "vitest";

import {
  openPulseSurveyRunSchema,
  pulseSurveyTemplateSchema,
} from "../../packages/validation/src/pulse-survey";
import {
  canShowGroupSplit,
  computeEnps,
  hideAverageUntilThreshold,
  pulseRunStatus,
} from "../../apps/web/src/lib/hr/pulse";
import { buildPulseSurveyOpenedEmail } from "../../packages/platform/src/mail/pulse-survey";

describe("pulse survey validation", () => {
  it("requires two choices for single choice questions", () => {
    const result = pulseSurveyTemplateSchema.safeParse({
      name: "Check-in",
      sections: [
        {
          title: "Main",
          questions: [
            {
              title: "Pick one",
              questionType: "single_choice",
              required: true,
              choices: [{ label: "Only one", sortOrder: 0 }],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an eNPS template", () => {
    const result = pulseSurveyTemplateSchema.safeParse({
      name: "Weekly pulse",
      sections: [
        {
          title: "Engagement",
          questions: [
            {
              title: "How likely are you to recommend working here?",
              questionType: "enps",
              required: true,
              choices: [],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a close date before the open date", () => {
    const result = openPulseSurveyRunSchema.safeParse({
      templateId: "00000000-0000-4000-8000-000000000099",
      opensOn: "2026-11-12",
      closesOn: "2026-11-10",
    });
    expect(result.success).toBe(false);
  });
});

describe("pulse survey results helpers", () => {
  it("computes eNPS from promoters and detractors", () => {
    expect(computeEnps([10, 9, 7, 6, 0])).toEqual({
      promoters: 2,
      passive: 1,
      detractors: 2,
      score: 0,
    });
  });

  it("hides averages until five staff answers", () => {
    expect(hideAverageUntilThreshold(4, 8)).toBeNull();
    expect(hideAverageUntilThreshold(5, 8)).toBe(8);
    expect(canShowGroupSplit(4)).toBe(false);
    expect(canShowGroupSplit(5)).toBe(true);
  });

  it("derives scheduled, open, and closed status", () => {
    expect(pulseRunStatus("2026-11-12", "2026-11-20", "2026-11-11", null)).toBe("scheduled");
    expect(pulseRunStatus("2026-11-10", "2026-11-20", "2026-11-11", null)).toBe("open");
    expect(pulseRunStatus("2026-11-01", "2026-11-05", "2026-11-11", null)).toBe("closed");
    expect(pulseRunStatus("2026-11-10", "2026-11-20", "2026-11-11", "2026-11-11T00:00:00Z")).toBe("closed");
  });
});

describe("pulse survey email", () => {
  it("builds a subject and link without raw HTML from the title", () => {
    const email = buildPulseSurveyOpenedEmail({
      title: 'Pulse <script>alert(1)</script>',
      message: "Answer once.",
      surveyUrl: "http://localhost:3000/employee/pulse",
    });
    expect(email.subject).toContain("Pulse");
    expect(email.html).toContain("Answer in BukuHR");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("http://localhost:3000/employee/pulse");
  });
});
