import type { PgBoss } from "pg-boss";
import type { JobStatus } from "../../contracts/jobs";
import type { Db } from "../db/client";
import { isWorkerAlive } from "./heartbeat";

const STATE_MAP: Record<string, JobStatus["state"]> = {
  created: "queued",
  retry: "retrying",
  active: "active",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed",
};

/**
 * What the UI may say about a job. "completed" comes only from the queue's own record; a missing or sleeping
 * worker is reported as such and never as progress.
 */
export class JobStatusService {
  constructor(
    private readonly boss: Pick<PgBoss, "getJobById">,
    private readonly db: Db,
  ) {}

  async describe(queue: string, jobId: string): Promise<JobStatus> {
    const job = await this.boss.getJobById(queue, jobId);
    const workerAlive = await isWorkerAlive(this.db).catch(() => false);
    if (!job) return { jobId, state: "unknown", workerAlive, note: "This job could not be found." };
    const state = STATE_MAP[job.state] ?? "unknown";
    return { jobId, state, workerAlive, note: noteFor(state, workerAlive) };
  }
}

function noteFor(state: JobStatus["state"], workerAlive: boolean): string {
  switch (state) {
    case "queued":
    case "retrying":
      return workerAlive ? "Waiting its turn." : "Waiting for a worker. Processing continues when the service is running again; nothing has been processed yet.";
    case "active":
      return workerAlive ? "Processing." : "Marked as processing, but no worker has reported recently. It will be retried if the worker is gone.";
    case "completed":
      return "Finished.";
    case "failed":
      return "Processing failed. You can retry.";
    case "cancelled":
      return "Cancelled.";
    default:
      return "Status unknown.";
  }
}
