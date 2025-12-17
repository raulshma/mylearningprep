import type React from "react";
import type { Metadata, Viewport } from "next";

import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PWAProvider } from "@/components/pwa-provider";
import { MobileBottomNavGlobal } from "@/components/navigation/mobile-bottom-nav-global";

// Initialize fonts
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

// <CHANGE> Updated metadata for IT Interview Prep Platform
export const metadata: Metadata = {
  applicationName: "MyLearningPrep",
  title: "MyLearningPrep | AI-Powered Learning Preparation",
  description:
    "Ace your next technical interview with personalized, AI-driven preparation tailored to your specific role and company.",
  generator: "Next.js",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    // "black-translucent" enables a more full-screen feel on iOS PWAs.
    // We add safe-area padding in CSS for standalone mode to avoid notch overlap.
    statusBarStyle: "black-translucent",
    title: "MyLearningPrep",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

/**
 * Wraps the application content with global providers, layout structure, and app-level UI.
 *
 * Provides authentication (Clerk), theming, PWA support, global UI elements (toaster and mobile bottom nav),
 * and renders analytics and performance insights outside the provider stack.
 *
 * @param children - The application content to render inside the global providers
 * @returns The root React element containing global providers and app-level UI components
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className={`font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            themes={["light", "dark", "dark-dim", "cyberpunk", "system"]}
            disableTransitionOnChange
          >
            <PWAProvider>
              {children}
              <MobileBottomNavGlobal />
            </PWAProvider>
            <Toaster />
          </ThemeProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}