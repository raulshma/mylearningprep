export type PixelPetEdge = "top" | "right" | "bottom" | "left";

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EdgeSnapTarget {
  containerId: string;
  edge: PixelPetEdge;
  progress: number; // [0, 1]
  distance: number; // px
}

export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function getPointOnEdge(rect: RectLike, edge: PixelPetEdge, progress: number): Point {
  const t = clamp01(progress);
  switch (edge) {
    case "top":
      // Left -> Right
      return { x: rect.left + rect.width * t, y: rect.top };
    case "right":
      // Top -> Bottom
      return { x: rect.right, y: rect.top + rect.height * t };
    case "bottom":
      // Right -> Left (Clockwise)
      return { x: rect.right - rect.width * t, y: rect.bottom };
    case "left":
      // Bottom -> Top (Clockwise)
      return { x: rect.left, y: rect.bottom - rect.height * t };
  }
}

export function getProgressForEdge(rect: RectLike, edge: PixelPetEdge, point: Point): number {
  switch (edge) {
    case "top":
      return clamp01((point.x - rect.left) / (rect.width || 1));
    case "right":
      return clamp01((point.y - rect.top) / (rect.height || 1));
    case "bottom":
      return clamp01((rect.right - point.x) / (rect.width || 1));
    case "left":
      return clamp01((rect.bottom - point.y) / (rect.height || 1));
  }
}

export function distancePointToEdge(rect: RectLike, edge: PixelPetEdge, point: Point): number {
  switch (edge) {
    case "top":
      return Math.abs(point.y - rect.top);
    case "bottom":
      return Math.abs(point.y - rect.bottom);
    case "left":
      return Math.abs(point.x - rect.left);
    case "right":
      return Math.abs(point.x - rect.right);
  }
}

export function advanceEdgeProgress(
  rect: RectLike,
  edge: PixelPetEdge,
  progress: number,
  distancePx: number
): { edge: PixelPetEdge; progress: number } {
  // Move along current edge by a pixel distance.
  // When exceeding the edge, roll to next edge clockwise.
  const t = clamp01(progress);
  let remaining = distancePx;
  let e: PixelPetEdge = edge;
  let p = t;

  // Safety: avoid infinite loops on extremely large dt
  for (let i = 0; i < 8 && remaining !== 0; i++) {
    const len = e === "top" || e === "bottom" ? rect.width : rect.height;
    const pxOnEdge = p * len;

    if (remaining > 0) {
      const pxToEnd = len - pxOnEdge;
      if (remaining < pxToEnd) {
        p = (pxOnEdge + remaining) / (len || 1);
        remaining = 0;
      } else {
        // Step to the corner
        remaining -= pxToEnd;
        p = 0;
        e = nextEdgeClockwise(e);
      }
    } else {
      // Negative distance: walk counter-clockwise
      const pxToStart = pxOnEdge;
      if (-remaining < pxToStart) {
        p = (pxOnEdge + remaining) / (len || 1);
        remaining = 0;
      } else {
        remaining += pxToStart;
        p = 1;
        e = nextEdgeCounterClockwise(e);
      }
    }
  }

  return { edge: e, progress: clamp01(p) };
}

export function nextEdgeClockwise(edge: PixelPetEdge): PixelPetEdge {
  switch (edge) {
    case "top":
      return "right";
    case "right":
      return "bottom";
    case "bottom":
      return "left";
    case "left":
      return "top";
  }
}

export function nextEdgeCounterClockwise(edge: PixelPetEdge): PixelPetEdge {
  switch (edge) {
    case "top":
      return "left";
    case "left":
      return "bottom";
    case "bottom":
      return "right";
    case "right":
      return "top";
  }
}

export function findNearestEdgeTarget(
  containers: Array<{ id: string; rect: RectLike }>,
  point: Point
): EdgeSnapTarget {
  let best: EdgeSnapTarget | null = null;

  for (const c of containers) {
    const rect = c.rect;
    const edges: PixelPetEdge[] = ["top", "right", "bottom", "left"];
    for (const edge of edges) {
      const distance = distancePointToEdge(rect, edge, point);
      const progress = getProgressForEdge(rect, edge, point);
      const candidate: EdgeSnapTarget = { containerId: c.id, edge, progress, distance };

      if (!best || candidate.distance < best.distance) {
        best = candidate;
      }
    }
  }

  // If no containers, fall back to a sensible default
  return (
    best ?? {
      containerId: "app-shell",
      edge: "bottom",
      progress: 0.5,
      distance: Number.POSITIVE_INFINITY,
    }
  );
}
