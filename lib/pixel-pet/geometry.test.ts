import { describe, expect, it } from "vitest";

import {
  advanceEdgeProgress,
  findNearestEdgeTarget,
  getPointOnEdge,
  type RectLike,
} from "./geometry";

const rect: RectLike = {
  left: 0,
  top: 0,
  right: 200,
  bottom: 100,
  width: 200,
  height: 100,
};

describe("pixel-pet geometry", () => {
  it("computes a point on each edge", () => {
    expect(getPointOnEdge(rect, "top", 0.5)).toEqual({ x: 100, y: 0 });
    expect(getPointOnEdge(rect, "bottom", 0)).toEqual({ x: 0, y: 100 });
    expect(getPointOnEdge(rect, "left", 1)).toEqual({ x: 0, y: 100 });
    expect(getPointOnEdge(rect, "right", 0.25)).toEqual({ x: 200, y: 25 });
  });

  it("advances along edges and rolls corners clockwise", () => {
    // Move 50px along top edge of width 200 => progress + 0.25
    const s1 = advanceEdgeProgress(rect, "top", 0, 50);
    expect(s1).toEqual({ edge: "top", progress: 0.25 });

    // Move past end of top edge (remaining rolls to right edge)
    const s2 = advanceEdgeProgress(rect, "top", 0.9, 40); // 0.1*200=20px to end, then 20px down right
    expect(s2.edge).toBe("right");
    expect(s2.progress).toBeCloseTo(0.2); // 20 / height 100
  });

  it("finds nearest edge among containers", () => {
    const containers = [
      { id: "a", rect },
      {
        id: "b",
        rect: { left: 300, top: 0, right: 400, bottom: 100, width: 100, height: 100 },
      },
    ];

    const nearTop = findNearestEdgeTarget(containers, { x: 10, y: 2 });
    expect(nearTop.containerId).toBe("a");
    expect(nearTop.edge).toBe("top");
    expect(nearTop.distance).toBe(2);
  });
});
