/**
 * Next.js instrumentation hook: runs once when the server starts.
 * Starts the embedded worker only when WORKER_MODE=embedded (default is off, so the frontend runs with no
 * database and no environment at all). The dynamic import keeps server-only code out of other runtimes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startEmbeddedWorkerOnce } = await import("./src/server/jobs/embedded");
  await startEmbeddedWorkerOnce();
}
