import { z } from "zod";
import { QUEUES } from "./queues";

export const pingPayloadSchema = z.object({ nonce: z.string().min(1).max(64) });
export const documentProcessPayloadSchema = z.object({
  materialId: z.string().uuid(),
  userId: z.string().uuid(),
  pipelineVersion: z.number().int().min(1),
});

export type PingPayload = z.infer<typeof pingPayloadSchema>;
export type DocumentProcessPayload = z.infer<typeof documentProcessPayloadSchema>;

/** Every job payload is validated at the boundary; handlers never see unvalidated data. */
export const PAYLOAD_SCHEMAS = {
  [QUEUES.ping]: pingPayloadSchema,
  [QUEUES.documentProcess]: documentProcessPayloadSchema,
} as const;
