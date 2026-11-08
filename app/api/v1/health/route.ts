import { route } from "../../../../src/server/http/route";
import { buildHealth } from "../../../../src/server/health";

export const dynamic = "force-dynamic";

/** Public, shallow health check. Exposes enumerations only (no versions, hosts, or error text). */
export const GET = route(async () => {
  const health = await buildHealth();
  return Response.json(health, { status: health.status === "down" ? 503 : 200, headers: { "cache-control": "no-store" } });
});
