"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";

import type { PixelPetPreferences, PixelPetPosition } from "@/lib/db/schemas/user";
import { getPixelPetDefinition } from "@/lib/pixel-pet/registry";
import { PixelPetModel } from "@/components/pixel-pet/pixel-pet-model";
import { updatePixelPetPreferences } from "@/lib/actions/user";
import { usePixelPetStore } from "@/hooks/use-pixel-pet";

interface PixelPetOverlayProps {
  initialPreferences: PixelPetPreferences | null;
  plan: string;
}

const BASE_PET_SIZE = 96;
const WALK_SPEED = 15; // pixels per second
const MIN_REST_TIME = 3000; // ms
const MAX_REST_TIME = 8000; // ms
const MIN_WALK_DISTANCE = 50; // px
const MAX_WALK_DISTANCE = 200; // px
const SCREEN_PADDING = 50; // px from edges

const DEFAULT_PREFS: PixelPetPreferences = {
  schemaVersion: 1,
  enabled: false,
  selectedId: "pixel_dog",
  surfaceId: "app-shell",
  edge: "bottom",
  progress: 0.5,
  offset: { x: 0, y: 0 },
  size: 1,
  position: { x: 100, y: 100 },
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clampToScreen(x: number, y: number, petSize: number): PixelPetPosition {
  if (typeof window === "undefined") return { x, y };
  
  const halfSize = petSize / 2;
  return {
    x: Math.max(SCREEN_PADDING, Math.min(window.innerWidth - SCREEN_PADDING - halfSize, x)),
    y: Math.max(SCREEN_PADDING, Math.min(window.innerHeight - SCREEN_PADDING - halfSize, y)),
  };
}

function getRandomTarget(currentX: number, currentY: number, petSize: number): PixelPetPosition {
  if (typeof window === "undefined") return { x: currentX, y: currentY };
  
  const angle = Math.random() * Math.PI * 2;
  const distance = randomBetween(MIN_WALK_DISTANCE, MAX_WALK_DISTANCE);
  
  const targetX = currentX + Math.cos(angle) * distance;
  const targetY = currentY + Math.sin(angle) * distance;
  
  return clampToScreen(targetX, targetY, petSize);
}

export function PixelPetOverlay({ initialPreferences, plan }: PixelPetOverlayProps) {
  const isProPlus = plan === "PRO" || plan === "MAX";

  const hydrate = usePixelPetStore((s) => s.hydrate);
  const prefs = usePixelPetStore((s) => s.prefs);
  const currentPos = usePixelPetStore((s) => s.currentPos);
  const petState = usePixelPetStore((s) => s.petState);
  const direction = usePixelPetStore((s) => s.direction);
  const setCurrentPos = usePixelPetStore((s) => s.setCurrentPos);
  const setPetState = usePixelPetStore((s) => s.setPetState);
  const setDirection = usePixelPetStore((s) => s.setDirection);
  const setPosition = usePixelPetStore((s) => s.setPosition);

  const enabled = isProPlus && prefs.enabled;
  const sizeMultiplier = prefs.size ?? 1;
  const petSize = BASE_PET_SIZE * sizeMultiplier;

  // Motion values for smooth animation
  const x = useMotionValue(currentPos.x);
  const y = useMotionValue(currentPos.y);
  
  // Spring config for smooth following
  const springX = useSpring(x, { stiffness: 300, damping: 30 });
  const springY = useSpring(y, { stiffness: 300, damping: 30 });

  const isDragging = React.useRef(false);
  const animationRef = React.useRef<ReturnType<typeof animate> | null>(null);
  const [cursorStyle, setCursorStyle] = React.useState<"grab" | "grabbing">("grab");

  // Hydrate on mount
  React.useEffect(() => {
    hydrate(initialPreferences ?? DEFAULT_PREFS);
  }, [hydrate, initialPreferences]);

  // Initialize position on screen
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    
    const initialPos = clampToScreen(
      prefs.position?.x ?? window.innerWidth / 2,
      prefs.position?.y ?? window.innerHeight - 150,
      petSize
    );
    
    x.set(initialPos.x);
    y.set(initialPos.y);
    setCurrentPos(initialPos);
  }, [enabled, prefs.position?.x, prefs.position?.y, petSize, x, y, setCurrentPos]);

  // Main behavior loop: walk -> rest -> walk
  React.useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;

    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    const startWalking = () => {
      if (!mounted || isDragging.current) return;
      
      const currentX = x.get();
      const currentY = y.get();
      const target = getRandomTarget(currentX, currentY, petSize);
      
      // Set direction based on movement
      const newDirection = target.x > currentX ? 1 : -1;
      setDirection(newDirection);
      setPetState("walking");

      // Calculate duration based on distance
      const distance = Math.sqrt(
        Math.pow(target.x - currentX, 2) + Math.pow(target.y - currentY, 2)
      );
      const duration = distance / WALK_SPEED;

      // Cancel any existing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Animate to target
      animationRef.current = animate(x, target.x, {
        duration,
        ease: "linear",
        onUpdate: (v) => setCurrentPos({ x: v, y: y.get() }),
      });

      animate(y, target.y, {
        duration,
        ease: "linear",
        onUpdate: (v) => setCurrentPos({ x: x.get(), y: v }),
        onComplete: () => {
          if (!mounted || isDragging.current) return;
          startResting();
        },
      });
    };

    const startResting = () => {
      if (!mounted || isDragging.current) return;
      
      setPetState("resting");
      const restTime = randomBetween(MIN_REST_TIME, MAX_REST_TIME);
      
      timeoutId = setTimeout(() => {
        if (mounted && !isDragging.current) {
          startWalking();
        }
      }, restTime);
    };

    // Start the behavior loop after a short delay
    timeoutId = setTimeout(startWalking, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [enabled, petSize, x, y, setCurrentPos, setPetState, setDirection]);

  // Drag handlers
  const handleDragStart = () => {
    isDragging.current = true;
    setPetState("dragging");
    setCursorStyle("grabbing");
    
    // Stop any ongoing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
  };

  const handleDrag = (_: unknown, info: { point: { x: number; y: number } }) => {
    const clamped = clampToScreen(info.point.x, info.point.y, petSize);
    setCurrentPos(clamped);
  };

  const handleDragEnd = async () => {
    isDragging.current = false;
    setCursorStyle("grab");
    
    const finalPos = { x: x.get(), y: y.get() };
    const clamped = clampToScreen(finalPos.x, finalPos.y, petSize);
    
    setPosition(clamped);
    setCurrentPos(clamped);
    setPetState("resting");

    // Persist position
    try {
      await updatePixelPetPreferences({ position: clamped });
    } catch (error) {
      console.error("Failed to persist pixel pet position:", error);
    }
  };

  if (!enabled) return null;

  const selectedDef = getPixelPetDefinition(prefs.selectedId);

  return (
    <div aria-hidden className="fixed inset-0 z-[90] pointer-events-none">
      <motion.div
        className="absolute will-change-transform"
        style={{
          width: petSize,
          height: petSize,
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
          pointerEvents: "auto",
          cursor: cursorStyle,
        }}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.1 }}
        whileHover={{ scale: 1.05 }}
      >
        <Canvas
          key={`${selectedDef.fileName}-${sizeMultiplier}`}
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
              <group 
                position={[0, -0.6, 0]} 
                scale={[direction, 1, 1]}
              >
                <PixelPetModel
                  fileName={selectedDef.fileName}
                  modelScale={selectedDef.modelScale}
                />
              </group>
            </Center>
          </React.Suspense>
        </Canvas>
        
        {/* State indicator (subtle) */}
        {petState === "resting" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs opacity-60">
            💤
          </div>
        )}
      </motion.div>
    </div>
  );
}
