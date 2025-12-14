import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_MODELS = new Set([
  "pixel_dog.glb",
  "pixel_plane.glb",
  "pixel_car.glb",
]);

function getSafeModelName(model: string): string | null {
  // Basic hardening: reject path separators and only allow known files
  if (model.includes("/") || model.includes("\\")) return null;
  if (!ALLOWED_MODELS.has(model)) return null;
  return model;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;
  const safe = getSafeModelName(model);

  if (!safe) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "3dmodels", safe);

  try {
    const file = await readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("pixel-pets route: failed to read model", { safe, error });
    return new Response("Not found", { status: 404 });
  }
}

export async function HEAD(
  _req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;
  const safe = getSafeModelName(model);

  if (!safe) {
    return new Response(null, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "3dmodels", safe);

  try {
    const info = await stat(filePath);
    return new Response(null, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("pixel-pets route: failed to stat model", { safe, error });
    return new Response(null, { status: 404 });
  }
}
