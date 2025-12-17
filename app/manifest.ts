import type { MetadataRoute } from "next";

/**
 * Provide the web app manifest for the MyLearningPrep application.
 *
 * @returns A `MetadataRoute.Manifest` object containing app metadata such as name, short_name, description, start_url, scope, id, display modes, theme/background colors, orientation, and icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyLearningPrep",
    short_name: "LearnPrep",
    description:
      "AI-Powered Learning Preparation - Ace your next technical interview",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    // Prefer fullscreen where supported; fallback to standalone.
    display_override: ["fullscreen", "standalone"],
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}