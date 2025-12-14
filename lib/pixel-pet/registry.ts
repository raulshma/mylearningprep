import type { PixelPetId } from "@/lib/db/schemas/user";

export interface PixelPetDefinition {
  id: PixelPetId;
  label: string;
  /** GLB filename inside /3dmodels (served via /api/pixel-pets/[model]) */
  fileName: string;
  kind: "pet" | "object";
  /** Default scene scale tweak per model */
  modelScale: number;
}

export const PIXEL_PET_REGISTRY: PixelPetDefinition[] = [
  {
    id: "pixel_dog",
    label: "Pixel Dog",
    fileName: "pixel_dog.glb",
    kind: "pet",
    modelScale: 1,
  },
  {
    id: "pixel_plane",
    label: "Pixel Plane",
    fileName: "pixel_plane.glb",
    kind: "object",
    modelScale: 3.5,
  },
  {
    id: "pixel_toyota_corolla_e80",
    label: "Pixel Corolla E80",
    fileName: "pixel_car.glb",
    kind: "object",
    modelScale: 1.5,
  },
];

export function getPixelPetDefinition(id: PixelPetId): PixelPetDefinition {
  const def = PIXEL_PET_REGISTRY.find((p) => p.id === id);
  if (!def) {
    // Keep runtime resilient in case DB contains an older/unknown id
    return PIXEL_PET_REGISTRY[0];
  }
  return def;
}
