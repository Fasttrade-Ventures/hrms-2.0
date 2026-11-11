export function assertPulseScore(score: number): void {
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new Error("Score must be a whole number from 0 to 10.");
  }
}

export function averageScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export const MAX_GOALS_PER_CYCLE = 5;

export function assertGoalCount(existing: number): void {
  if (existing >= MAX_GOALS_PER_CYCLE) {
    throw new Error("An employee can keep up to 5 goals on a review cycle.");
  }
}

/** Minimum staff answers before averages or group splits are shown. */
export const PULSE_MIN_ANSWERS_FOR_RESULTS = 5;

export type EnpsBucket = {
  promoters: number;
  passive: number;
  detractors: number;
  score: number | null;
};

export function computeEnps(scores: number[]): EnpsBucket {
  if (scores.length === 0) {
    return { promoters: 0, passive: 0, detractors: 0, score: null };
  }
  let promoters = 0;
  let passive = 0;
  let detractors = 0;
  for (const score of scores) {
    if (score >= 9) promoters += 1;
    else if (score >= 7) passive += 1;
    else detractors += 1;
  }
  const total = scores.length;
  const enps = Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passive, detractors, score: enps };
}

export function pulseRunStatus(opensOn: string, closesOn: string, today: string, closedAt: string | null): "draft" | "scheduled" | "open" | "closed" {
  if (closedAt) return "closed";
  if (opensOn > today) return "scheduled";
  if (closesOn < today) return "closed";
  return "open";
}

export function hideAverageUntilThreshold(count: number, average: number | null, threshold = PULSE_MIN_ANSWERS_FOR_RESULTS): number | null {
  if (count < threshold) return null;
  return average;
}

export function canShowGroupSplit(count: number, threshold = PULSE_MIN_ANSWERS_FOR_RESULTS): boolean {
  return count >= threshold;
}
