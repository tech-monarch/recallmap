import { z } from "zod";

/**
 * Public, shallow health response. It deliberately exposes only enumerations:
 * no versions, hostnames, connection strings, or error text.
 */
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  time: z.string(),
  checks: z.object({
    config: z.enum(["ok", "invalid"]),
    database: z.enum(["ok", "unavailable", "not_configured"]),
    worker: z.object({
      mode: z.enum(["embedded", "standalone", "off"]),
      /** Whether a worker heartbeat was seen recently. A sleeping service has none. */
      state: z.enum(["running", "not_running", "not_applicable", "unknown"]),
    }),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
