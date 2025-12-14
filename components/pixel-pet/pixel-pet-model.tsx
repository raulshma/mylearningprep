"use client";

import React, { Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";

interface PixelPetModelProps {
  fileName: string;
  modelScale: number;
}

class ModelErrorBoundary extends React.Component<
  {
    fallback?: React.ReactNode;
    onError?: (error: unknown) => void;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function LoadedModel({ fileName, modelScale }: PixelPetModelProps) {
  const url = `/api/pixel-pets/${fileName}`;
  const gltf = useGLTF(url);

  // Clone so multiple instances (or hot reload) don't mutate shared scene graph
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const fit = useMemo(() => {
    // Compute bounds in local space, then center + scale so it fits nicely in our fixed-size canvas.
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x || 0, size.y || 0, size.z || 0);
    const autoScale = maxDim > 0 ? 1 / maxDim : 1;

    return {
      // Apply caller tuning after auto-fitting
      scale: autoScale * (modelScale || 1),
      // Center the model at the origin before scaling
      offset: new Vector3(-center.x, -center.y, -center.z),
    };
  }, [scene, modelScale]);

  return (
    <group scale={fit.scale}>
      <primitive object={scene} position={[fit.offset.x, fit.offset.y, fit.offset.z]} />
    </group>
  );
}

export function PixelPetModel(props: PixelPetModelProps) {
  const url = `/api/pixel-pets/${props.fileName}`;

  // Warm the cache so the first render is less likely to "pop".
  useEffect(() => {
    try {
      useGLTF.preload(url);
    } catch {
      // ignore (preload is best-effort)
    }
  }, [url]);

  return (
    <ModelErrorBoundary
      onError={(error) => {
        console.error("PixelPetModel: failed to load GLB", {
          url,
          fileName: props.fileName,
          error,
        });
      }}
      fallback={
        <mesh>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#ff4d4f" />
        </mesh>
      }
    >
      <Suspense
        fallback={
          <mesh>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color="#8c8c8c" />
          </mesh>
        }
      >
        <LoadedModel {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
