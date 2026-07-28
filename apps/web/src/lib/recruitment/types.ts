export const RECRUITMENT_STAGES = [
  "applied",
  "screening",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type RecruitmentStage = (typeof RECRUITMENT_STAGES)[number];

export const TERMINAL_STAGES: RecruitmentStage[] = ["hired", "rejected", "withdrawn"];

export function canMoveToStage(from: RecruitmentStage, to: RecruitmentStage): boolean {
  if (TERMINAL_STAGES.includes(from)) return false;
  if (TERMINAL_STAGES.includes(to)) return true;
  const order = RECRUITMENT_STAGES.indexOf(from);
  const target = RECRUITMENT_STAGES.indexOf(to);
  return target >= order;
}
