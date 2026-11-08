import { AppError } from "../../platform/errors";
import { assertSafeKey, type ObjectMeta, type ObjectStore, type UploadTarget } from "./types";

/** In-memory ObjectStore for tests and offline development. Keys are validated like a real store would. */
export class InMemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, { body: Uint8Array; contentType: string }>();
  readonly issuedTargets: Array<{ key: string; contentType: string; contentLength: number }> = [];

  async createUploadTarget(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<UploadTarget> {
    assertSafeKey(input.key);
    if (!Number.isInteger(input.contentLength) || input.contentLength <= 0) throw new AppError("validation_failed", "Invalid content length.");
    this.issuedTargets.push({ key: input.key, contentType: input.contentType, contentLength: input.contentLength });
    return {
      url: `memory://upload/${encodeURIComponent(input.key)}`,
      method: "PUT",
      headers: { "Content-Type": input.contentType, "Content-Length": String(input.contentLength) },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async head(key: string): Promise<ObjectMeta | null> {
    assertSafeKey(key);
    const o = this.objects.get(key);
    return o ? { key, size: o.body.byteLength, contentType: o.contentType } : null;
  }

  async get(key: string): Promise<Uint8Array | null> {
    assertSafeKey(key);
    return this.objects.get(key)?.body ?? null;
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    assertSafeKey(key);
    this.objects.set(key, { body, contentType });
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    this.objects.delete(key);
  }

  get size(): number {
    return this.objects.size;
  }
}
