import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const IMAGE = /\.(jpe?g|png|webp)$/i;

/** Lists the image files you drop into public/sidebar-images. Nothing is stored or uploaded. */
export async function GET() {
  try {
    const files = (await readdir(path.join(process.cwd(), "public", "sidebar-images"))).filter((f) => IMAGE.test(f)).sort();
    return Response.json({ images: files.map((f) => `/sidebar-images/${encodeURIComponent(f)}`) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ images: [] });
  }
}
