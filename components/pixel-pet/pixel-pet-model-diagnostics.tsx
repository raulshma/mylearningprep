"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";

import { PixelPetModel } from "@/components/pixel-pet/pixel-pet-model";

type ModelCheck =
  | { state: "idle" }
  | {
      state: "ok";
      status: number;
      contentType: string | null;
      contentLength: string | null;
    }
  | {
      state: "error";
      status?: number;
      message: string;
    };

export function PixelPetModelDiagnostics({
  fileName,
  modelScale,
}: {
  fileName: string;
  modelScale: number;
}) {
  const url = `/api/pixel-pets/${fileName}`;
  const [check, setCheck] = React.useState<ModelCheck>({ state: "idle" });

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (cancelled) return;

        if (!res.ok) {
          setCheck({
            state: "error",
            status: res.status,
            message: `HEAD ${res.status} ${res.statusText}`,
          });
          return;
        }

        setCheck({
          state: "ok",
          status: res.status,
          contentType: res.headers.get("content-type"),
          contentLength: res.headers.get("content-length"),
        });
      } catch (e) {
        if (cancelled) return;
        setCheck({
          state: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
        <div className="text-sm font-medium text-foreground">Model API check</div>
        <div className="mt-2 text-xs text-muted-foreground">
          <div>
            URL: <span className="font-mono">{url}</span>
          </div>
          {check.state === "idle" ? (
            <div className="mt-1">Checking…</div>
          ) : check.state === "ok" ? (
            <div className="mt-1 space-y-1">
              <div>
                Status: <span className="font-mono">{check.status}</span>
              </div>
              <div>
                Content-Type:{" "}
                <span className="font-mono">{check.contentType ?? "(missing)"}</span>
              </div>
              <div>
                Content-Length:{" "}
                <span className="font-mono">{check.contentLength ?? "(missing)"}</span>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-red-400">
              {check.message}
              {typeof check.status === "number" ? (
                <span className="ml-2 font-mono">({check.status})</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
        <div className="text-sm font-medium text-foreground">Preview</div>
        <div className="mt-2 h-[180px] w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <Canvas
            dpr={[1, 1.5]}
            frameloop="always"
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            orthographic
            camera={{ position: [0, 0, 10], zoom: 95 }}
          >
            <ambientLight intensity={0.9} />
            <directionalLight position={[3, 6, 5]} intensity={0.7} />
            <React.Suspense fallback={null}>
              <Center>
                <PixelPetModel fileName={fileName} modelScale={modelScale} />
              </Center>
            </React.Suspense>
          </Canvas>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          If this box is empty or red, the model failed to load/render.
        </div>
      </div>
    </div>
  );
}
