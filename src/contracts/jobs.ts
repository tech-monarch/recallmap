import { z } from "zod";

/** What the UI may say about a background job. "completed" only ever comes from the queue itself. */
export const jobStatusSchema = z.object({
  jobId: z.string(),
  state: z.enum(["queued", "active", "retrying", "completed", "failed", "cancelled", "unknown"]),
  workerAlive: z.boolean(),
  /** Plain-language note for the UI; never claims progress that the queue has not recorded. */
  note: z.string(),
});

export type JobStatus = z.infer<typeof jobStatusSchema>;
