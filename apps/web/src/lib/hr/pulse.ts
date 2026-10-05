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
