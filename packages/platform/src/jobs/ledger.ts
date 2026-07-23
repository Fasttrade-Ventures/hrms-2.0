export type JobStatus = "pending" | "running" | "completed" | "failed";

export type ScheduledJob = {
  id: string;
  name: string;
  idempotencyKey: string;
  status: JobStatus;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
};

const ledger = new Map<string, ScheduledJob>();

export function enqueueJob(name: string, idempotencyKey: string, scheduledFor: Date): ScheduledJob {
  const existing = ledger.get(idempotencyKey);
  if (existing) return existing;

  const job: ScheduledJob = {
    id: crypto.randomUUID(),
    name,
    idempotencyKey,
    status: "pending",
    scheduledFor,
  };
  ledger.set(idempotencyKey, job);
  return job;
}

export function markJobRunning(idempotencyKey: string): ScheduledJob {
  const job = ledger.get(idempotencyKey);
  if (!job) throw new Error(`Job not found: ${idempotencyKey}`);
  job.status = "running";
  job.startedAt = new Date();
  return job;
}

export function markJobCompleted(idempotencyKey: string): ScheduledJob {
  const job = ledger.get(idempotencyKey);
  if (!job) throw new Error(`Job not found: ${idempotencyKey}`);
  job.status = "completed";
  job.completedAt = new Date();
  return job;
}

export function getJob(idempotencyKey: string): ScheduledJob | undefined {
  return ledger.get(idempotencyKey);
}
