import { z } from "zod";
import { AppError } from "../../platform/errors";

export type ObjectMeta = Readonly<{ key: string; size: number; contentType: string }>;
export type UploadTarget = Readonly<{ url: string; method: "PUT"; headers: Readonly<Record<string, string>>; expiresAt: Date }>;

/** Vendor-neutral private object store. Cloudflare R2 is an adapter (B3); tests use the in-memory fake. */
export interface ObjectStore {
  /**
   * Presigned PUT. Signs Content-Type and the exact Content-Length (R2 presigned URLs cannot enforce a length range).
   * Callers must verify the real size with head() before accepting the upload.
   */
  createUploadTarget(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<UploadTarget>;
  head(key: string): Promise<ObjectMeta | null>;
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const uuid = z.string().uuid();

/** Server-generated key: never derived from a filename, so path traversal is impossible by construction. */
export function originalObjectKey(userId: string, materialId: string): string {
  const u = uuid.safeParse(userId);
  const m = uuid.safeParse(materialId);
  if (!u.success || !m.success) throw new AppError("validation_failed", "Invalid storage identifiers.");
  return `u/${u.data}/m/${m.data}/original`;
}

const SAFE_KEY = /^u\/[0-9a-f-]{36}\/m\/[0-9a-f-]{36}\/(original|[a-z0-9._-]{1,64})$/;
export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new AppError("validation_failed", "Invalid storage key.");
}
