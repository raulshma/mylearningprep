"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, KeyRound, Server, User, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "session" | "jwt";

type RequestLine = {
  title: string;
  headerLabel: string;
  headerValue: string;
  serverDoes: string;
  risk: string;
};

const commonTips = [
  "Always use HTTPS in production.",
  "Protect your app from XSS (tokens in JS storage are easy to steal).",
  "Rotate/expire credentials and validate them on every request.",
];

export function SessionVsTokenVisualizer() {
  const [mode, setMode] = useState<Mode>("session");

  const data = useMemo(() => {
    const session: RequestLine[] = [
      {
        title: "1) Sign in",
        headerLabel: "Set-Cookie",
        headerValue: "sessionId=abc123; HttpOnly; Secure; SameSite=Lax",
        serverDoes:
          "Creates a server-side session record and stores only a random session ID in the cookie.",
        risk:
          "If CSRF is not handled, attackers can trigger unwanted actions using the victim’s cookie.",
      },
      {
        title: "2) Call API",
        headerLabel: "Cookie",
        headerValue: "sessionId=abc123",
        serverDoes:
          "Looks up the session, checks it’s valid, and identifies the user.",
        risk:
          "If session IDs leak (logs/refs) and no rotation, an attacker can replay it until it expires.",
      },
      {
        title: "3) Logout / rotate",
        headerLabel: "Set-Cookie",
        headerValue: "sessionId=; Max-Age=0",
        serverDoes:
          "Invalidates the server-side session and clears the cookie.",
        risk:
          "If you don’t invalidate server-side sessions, logout becomes ‘best effort’.",
      },
    ];

    const jwt: RequestLine[] = [
      {
        title: "1) Sign in",
        headerLabel: "(response body)",
        headerValue: "access_token=eyJ... (JWT)",
        serverDoes:
          "Issues a signed token containing claims (e.g., sub, aud, exp).",
        risk:
          "If stored in localStorage and XSS happens, the attacker can steal it instantly.",
      },
      {
        title: "2) Call API",
        headerLabel: "Authorization",
        headerValue: "Bearer eyJ...",
        serverDoes:
          "Verifies the signature, checks exp/aud/iss, then authorizes the request.",
        risk:
          "JWTs are bearer tokens: whoever has it can use it until expiration.",
      },
      {
        title: "3) Revocation story",
        headerLabel: "(depends)",
        headerValue: "short exp + refresh token OR token blacklist",
        serverDoes:
          "JWTs are hard to revoke instantly unless you add server-side checks.",
        risk:
          "Long-lived JWTs increase blast radius if leaked.",
      },
    ];

    return mode === "session" ? session : jwt;
  }, [mode]);

  return (
    <div className="w-full max-w-3xl mx-auto my-8 border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="bg-muted/50 p-4 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            {mode === "session" ? (
              <Cookie className="w-4 h-4 text-primary" />
            ) : (
              <KeyRound className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Session Cookies vs JWT Bearer Tokens</span>
            <span className="text-xs text-muted-foreground">Toggle the model and watch what changes.</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "session" ? "default" : "secondary"}
            onClick={() => setMode("session")}
          >
            Session
          </Button>
          <Button
            size="sm"
            variant={mode === "jwt" ? "default" : "secondary"}
            onClick={() => setMode("jwt")}
          >
            JWT
          </Button>
        </div>
      </div>

      <div className="p-6 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Client</span>
            </div>
            <p className="text-sm text-muted-foreground leading-7">
              {mode === "session"
                ? "Holds an httpOnly cookie. JavaScript can’t read it. The browser automatically includes it on requests."
                : "Holds a token. If stored in JS-accessible storage, your app must attach it manually to requests."}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Server</span>
            </div>
            <p className="text-sm text-muted-foreground leading-7">
              {mode === "session"
                ? "Stores session state (who you are) and checks the session ID on each request."
                : "Verifies signatures and validates claims (exp/aud/iss). Often pairs JWTs with refresh tokens or session cookies."}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {data.map((line) => (
              <div key={line.title} className="rounded-lg border border-border p-4 bg-background">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{line.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground font-mono break-words">
                      {line.headerLabel}: {line.headerValue}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 hidden md:block" />
                  <div className="text-sm text-muted-foreground leading-7 md:max-w-[46%]">
                    {line.serverDoes}
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-muted/40 border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-foreground">Risk to watch</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-6">{line.risk}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-sm font-semibold text-foreground mb-2">Quick best practices</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {commonTips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
