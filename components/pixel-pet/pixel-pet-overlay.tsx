"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";

import type { PixelPetPreferences } from "@/lib/db/schemas/user";
import { getPixelPetDefinition } from "@/lib/pixel-pet/registry";
import {
  advanceEdgeProgress,
  findNearestEdgeTarget,
  getPointOnEdge,
  type Point,
  type RectLike,
} from "@/lib/pixel-pet/geometry";
import { PixelPetModel } from "@/components/pixel-pet/pixel-pet-model";
import { updatePixelPetPreferences } from "@/lib/actions/user";
import { usePixelPetStore } from "@/hooks/use-pixel-pet";

interface PixelPetOverlayProps {
  initialPreferences: PixelPetPreferences | null;
  plan: string;
}

const PET_SIZE = 96;
// Tuned for a calmer "desktop companion" pace
const WALK_SPEED_PX_PER_S = 20;
const SNAP_THRESHOLD_PX = 44;
const JUMP_CHECK_EVERY_MS = 900;
const JUMP_DISTANCE_PX = 28;
const JUMP_DURATION_MS = 420;
const EDGE_INSET_PX = 10;

const DEFAULT_PREFS: PixelPetPreferences = {
  schemaVersion: 1,
  enabled: false,
  selectedId: "pixel_dog",
  surfaceId: "app-shell",
  edge: "bottom",
  progress: 0.5,
  offset: { x: 0, y: 0 },
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function rectFromDomRect(r: DOMRect): RectLike {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

function clampRectToViewport(rect: RectLike): RectLike {
  if (typeof window === "undefined") return rect;

  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(window.innerWidth, rect.right);
  const bottom = Math.min(window.innerHeight, rect.bottom);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return { left, top, right, bottom, width, height };
}

function applyEdgeInset(point: Point, rect: RectLike, edge: PixelPetPreferences["edge"]): Point {
  switch (edge) {
    case "top":
      return { x: point.x, y: Math.min(rect.bottom, point.y + EDGE_INSET_PX) };
    case "bottom":
      return { x: point.x, y: Math.max(rect.top, point.y - EDGE_INSET_PX) };
    case "left":
      return { x: Math.min(rect.right, point.x + EDGE_INSET_PX), y: point.y };
    case "right":
      return { x: Math.max(rect.left, point.x - EDGE_INSET_PX), y: point.y };
  }
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function PixelPetOverlay({ initialPreferences, plan }: PixelPetOverlayProps) {
  const isProPlus = plan === "PRO" || plan === "MAX";

  const hydrate = usePixelPetStore((s) => s.hydrate);
  const prefs = usePixelPetStore((s) => s.prefs);
  const setPlacement = usePixelPetStore((s) => s.setPlacement);

  // Hydrate on mount and when server-provided preferences change
  React.useEffect(() => {
    hydrate(initialPreferences ?? DEFAULT_PREFS);
  }, [hydrate, initialPreferences]);

  const enabled = isProPlus && prefs.enabled;

  const [pos, setPos] = React.useState<Point>({ x: -9999, y: -9999 });
  const containersRef = React.useRef<Array<{ id: string; rect: RectLike }>>([]);

  const dragRef = React.useRef<
    | {
        pointerId: number;
        dx: number;
        dy: number;
        dragging: boolean;
      }
    | null
  >(null);

  const jumpRef = React.useRef<
    | {
        start: Point;
        end: Point;
        startAt: number;
        target: { containerId: string; edge: PixelPetPreferences["edge"]; progress: number };
      }
    | null
  >(null);

  const lastTickRef = React.useRef<number | null>(null);
  const lastJumpCheckRef = React.useRef<number>(0);

  const selectedDef = React.useMemo(
    () => getPixelPetDefinition(prefs.selectedId),
    [prefs.selectedId]
  );

  const collectContainers = React.useCallback(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-pet-edge-container]")
    );

    const containers = nodes
      .map((el, idx) => {
        const id =
          el.getAttribute("data-pet-edge-id") ||
          el.getAttribute("data-pet-surface") ||
          `container-${idx}`;
        const rect = el.getBoundingClientRect();
        // Clamp to viewport so scrollable/oversized containers don't push the pet off-screen
        return { id, rect: clampRectToViewport(rectFromDomRect(rect)) };
      })
      // Filter out degenerate rects
      .filter((c) => c.rect.width > 20 && c.rect.height > 20);

    containersRef.current = containers;
  }, []);

  React.useEffect(() => {
    if (!enabled) return;

    collectContainers();

    const ro = new ResizeObserver(() => collectContainers());
    for (const el of document.querySelectorAll<HTMLElement>("[data-pet-edge-container]")) {
      ro.observe(el);
    }

    const onScrollOrResize = () => collectContainers();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [enabled, collectContainers]);

  React.useEffect(() => {
    if (!enabled) return;

    const reduced = prefersReducedMotion();

    const tick = () => {
      const t = nowMs();
      const last = lastTickRef.current;
      lastTickRef.current = t;
      const dtMs = last == null ? 16 : t - last;
      const dtS = Math.min(0.05, Math.max(0, dtMs / 1000));

      // Jump animation
      const jump = jumpRef.current;
      if (jump) {
        const u = Math.min(1, (t - jump.startAt) / JUMP_DURATION_MS);
        // Simple arc: ease + sine bump
        const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const arc = Math.sin(Math.PI * u) * 18;
        const x = jump.start.x + (jump.end.x - jump.start.x) * ease;
        const y = jump.start.y + (jump.end.y - jump.start.y) * ease - arc;
        setPos({ x, y });

        if (u >= 1) {
          jumpRef.current = null;
          setPlacement({
            surfaceId: jump.target.containerId,
            edge: jump.target.edge,
            progress: jump.target.progress,
          });
        }

        requestAnimationFrame(tick);
        return;
      }

      // Dragging
      if (dragRef.current?.dragging) {
        requestAnimationFrame(tick);
        return;
      }

      const containers = containersRef.current;
      const active =
        containers.find((c) => c.id === prefs.surfaceId) ??
        containers.find((c) => c.id === "app-shell") ??
        containers[0];

      if (!active) {
        requestAnimationFrame(tick);
        return;
      }

      // Compute updated prefs (walk)
      const nextWalk = reduced
        ? { edge: prefs.edge, progress: prefs.progress }
        : advanceEdgeProgress(
            active.rect,
            prefs.edge,
            prefs.progress,
            WALK_SPEED_PX_PER_S * dtS
          );

      if (!reduced && (nextWalk.edge !== prefs.edge || nextWalk.progress !== prefs.progress)) {
        // Update in-memory placement (do not persist every tick)
        setPlacement({
          surfaceId: active.id,
          edge: nextWalk.edge,
          progress: nextWalk.progress,
        });
      }

      // Current position
      const p0 = getPointOnEdge(active.rect, nextWalk.edge, nextWalk.progress);
      const pinset = applyEdgeInset(p0, active.rect, nextWalk.edge);
      const pFinal = {
        x: pinset.x + (prefs.offset?.x ?? 0),
        y: pinset.y + (prefs.offset?.y ?? 0),
      };
      setPos(pFinal);

      // Jump check (keep it light)
      if (!reduced && t - lastJumpCheckRef.current > JUMP_CHECK_EVERY_MS) {
        lastJumpCheckRef.current = t;

        const nearestOther = findNearestEdgeTarget(
          containers.filter((c) => c.id !== active.id),
          pFinal
        );

        if (
          nearestOther.distance < JUMP_DISTANCE_PX &&
          nearestOther.containerId !== active.id
        ) {
          const targetContainer = containers.find((c) => c.id === nearestOther.containerId);
          if (targetContainer) {
            const rawTarget = getPointOnEdge(
              targetContainer.rect,
              nearestOther.edge,
              nearestOther.progress
            );
            const targetInset = applyEdgeInset(rawTarget, targetContainer.rect, nearestOther.edge);

            jumpRef.current = {
              start: pFinal,
              end: {
                x: targetInset.x + (prefs.offset?.x ?? 0),
                y: targetInset.y + (prefs.offset?.y ?? 0),
              },
              startAt: t,
              target: {
                containerId: nearestOther.containerId,
                edge: nearestOther.edge,
                progress: nearestOther.progress,
              },
            };
          }
        }
      }

      requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, prefs.edge, prefs.progress, prefs.offset?.x, prefs.offset?.y, prefs.surfaceId, setPlacement]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    dragRef.current = {
      pointerId: e.pointerId,
      dx: pos.x - e.clientX,
      dy: pos.y - e.clientY,
      dragging: true,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag?.dragging || drag.pointerId !== e.pointerId) return;

    const x = e.clientX + drag.dx;
    const y = e.clientY + drag.dy;
    setPos({ x, y });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag?.dragging || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;

    const containers = containersRef.current;
    const nearest = findNearestEdgeTarget(containers, { x: e.clientX + drag.dx, y: e.clientY + drag.dy });

    if (nearest.distance <= SNAP_THRESHOLD_PX) {
      setPlacement({
        surfaceId: nearest.containerId,
        edge: nearest.edge,
        progress: nearest.progress,
      });

      // Persist placement (one write on drop)
      try {
        await updatePixelPetPreferences({
          surfaceId: nearest.containerId,
          edge: nearest.edge,
          progress: nearest.progress,
        });
      } catch (error) {
        console.error("Failed to persist pixel pet placement:", error);
      }
    }
  };

  if (!enabled) return null;

  const left = pos.x - PET_SIZE / 2;
  const top = pos.y - PET_SIZE / 2;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[90] pointer-events-none"
    >
      <div
        className="absolute will-change-transform"
        style={{
          width: PET_SIZE,
          height: PET_SIZE,
          transform: `translate3d(${left}px, ${top}px, 0)`,
          pointerEvents: "auto",
          cursor: "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Canvas
          key={selectedDef.fileName}
          dpr={[1, 1.5]}
          frameloop="demand"
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          orthographic
          camera={{ position: [0, 0, 10], zoom: 90 }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 6, 5]} intensity={0.7} />
          <React.Suspense fallback={null}>
            <Center>
              <group position={[0, -0.6, 0]}>
                <PixelPetModel
                  fileName={selectedDef.fileName}
                  modelScale={selectedDef.modelScale}
                />
              </group>
            </Center>
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
}
