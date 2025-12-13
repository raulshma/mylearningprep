import type React from "react";
import type { Metadata, Viewport } from "next";

import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Initialize fonts
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

// <CHANGE> Updated metadata for IT Interview Prep Platform
export const metadata: Metadata = {
  title: "MyLearningPrep | AI-Powered Learning Preparation",
  description:
    "Ace your next technical interview with personalized, AI-driven preparation tailored to your specific role and company.",
  generator: "Next.js",
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
};

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
            {children}
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
