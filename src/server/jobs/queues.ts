import type { PgBoss } from "pg-boss";

export const QUEUES = {
  ping: "system.ping",
  documentProcess: "document.process",
  documentDead: "document.dead",
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

type QueueOptions = Parameters<PgBoss["createQueue"]>[1];
export type QueueDefinition = { name: QueueName; options?: QueueOptions };

/**
 * Queue policy notes (verified in docs/testing/INFRA_COMPATIBILITY_SPIKE.md):
 * - singletonKey only deduplicates on exclusive/short/stately queues, never on a standard queue.
 * - retries are on by default, so every handler must be idempotent.
 */
export const QUEUE_DEFINITIONS: ReadonlyArray<QueueDefinition> = [
  { name: QUEUES.documentDead },
  { name: QUEUES.ping, options: { retryLimit: 1, retryDelay: 1, expireInSeconds: 30 } },
  {
    name: QUEUES.documentProcess,
    options: { policy: "exclusive", retryLimit: 2, retryDelay: 30, retryBackoff: true, expireInSeconds: 600, deadLetter: QUEUES.documentDead },
  },
];
