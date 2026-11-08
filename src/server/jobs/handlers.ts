import type { Logger } from "../platform/logger";
import { QUEUES, type QueueName } from "./queues";
import { PAYLOAD_SCHEMAS, type PingPayload } from "./payloads";

export type JobContext = Readonly<{ jobId: string; queue: QueueName; attempt: number; signal: AbortSignal; logger: Logger }>;
export type JobHandler<P> = (payload: P, ctx: JobContext) => Promise<void>;

/**
 * Handlers are registered here. Each must be idempotent, honour ctx.signal, and keep payload contents out of logs.
 * Document processing (B3) registers its stages here and calls the same application services as the API.
 */
export type HandlerRegistry = Partial<{ [Q in keyof typeof PAYLOAD_SCHEMAS]: JobHandler<unknown> }>;

export const pingHandler: JobHandler<PingPayload> = async (_payload, ctx) => {
  ctx.logger.info("ping handled", { jobId: ctx.jobId });
};

export function defaultHandlers(): HandlerRegistry {
  return { [QUEUES.ping]: pingHandler as JobHandler<unknown> };
}
