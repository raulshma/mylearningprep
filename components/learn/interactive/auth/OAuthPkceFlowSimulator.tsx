"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Globe,
  Server,
  User,
  Code,
  RotateCcw,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type StepId =
  | "start"
  | "authorize-request"
  | "login-consent"
  | "redirect-with-code"
  | "token-request"
  | "token-response"
  | "api-call";

type Actor = "browser" | "client" | "as" | "api";

type Step = {
  id: StepId;
  title: string;
  actor: Actor;
  whatHappens: string;
  youSend: Array<{ label: string; value: string; sensitive?: boolean }>;
  attackerCanSee: Array<string>;
};

const baseSteps: Step[] = [
  {
    id: "start",
    title: "Start sign-in",
    actor: "client",
    whatHappens:
      "Your app prepares a login transaction (a one-time code verifier) and redirects the browser to the Authorization Server.",
    youSend: [
      { label: "code_verifier", value: "(stored locally, NOT sent yet)", sensitive: true },
      { label: "code_challenge", value: "BASE64URL(SHA256(code_verifier))" },
      { label: "state", value: "random CSRF token" },
    ],
    attackerCanSee: [
      "If someone can read the URL: they may see client_id, redirect_uri, state, and the code_challenge (not the verifier).",
    ],
  },
  {
    id: "authorize-request",
    title: "Authorization request",
    actor: "browser",
    whatHappens:
      "The browser navigates to the Authorization Endpoint with response_type=code and PKCE parameters.",
    youSend: [
      { label: "response_type", value: "code" },
      { label: "client_id", value: "your-client" },
      { label: "redirect_uri", value: "https://app.example/callback" },
      { label: "code_challenge_method", value: "S256" },
      { label: "code_challenge", value: "..." },
      { label: "state", value: "..." },
      { label: "scope", value: "openid profile email" },
    ],
    attackerCanSee: [
      "The authorization request parameters are in the browser address bar.",
      "PKCE uses S256 so the verifier is NOT exposed here.",
    ],
  },
  {
    id: "login-consent",
    title: "Login + consent",
    actor: "as",
    whatHappens:
      "The Authorization Server authenticates the user and (optionally) asks for consent. This step is UI-driven.",
    youSend: [
      { label: "user credentials", value: "(entered on AS / IdP pages)", sensitive: true },
      { label: "MFA", value: "(one-time codes / passkeys)", sensitive: true },
    ],
    attackerCanSee: [
      "If phishing succeeds, credentials can be stolen — use trusted providers + HTTPS + user education.",
    ],
  },
  {
    id: "redirect-with-code",
    title: "Redirect back with code",
    actor: "browser",
    whatHappens:
      "The browser is redirected back to your redirect_uri with an authorization code and the original state.",
    youSend: [
      { label: "code", value: "authorization_code" },
      { label: "state", value: "(must match stored state)" },
    ],
    attackerCanSee: [
      "Authorization code is visible in the URL (query string).",
      "PKCE binds the code to your app instance, reducing code injection/misuse.",
    ],
  },
  {
    id: "token-request",
    title: "Token request",
    actor: "client",
    whatHappens:
      "Your app exchanges the code at the Token Endpoint. This is a back-channel call over TLS.",
    youSend: [
      { label: "grant_type", value: "authorization_code" },
      { label: "code", value: "authorization_code" },
      { label: "redirect_uri", value: "https://app.example/callback" },
      { label: "code_verifier", value: "(the original secret)", sensitive: true },
    ],
    attackerCanSee: [
      "Normally not visible to the browser/URL.",
      "If your client is a public browser SPA, the token request might be done in-browser; keep the verifier secret and avoid leaking it.",
    ],
  },
  {
    id: "token-response",
    title: "Token response",
    actor: "as",
    whatHappens:
      "The Authorization Server returns tokens (access token, and often an ID token for OIDC).",
    youSend: [
      { label: "access_token", value: "bearer token" , sensitive: true},
      { label: "id_token", value: "JWT (OIDC)" , sensitive: true},
      { label: "refresh_token", value: "(optional)" , sensitive: true},
      { label: "expires_in", value: "3600" },
    ],
    attackerCanSee: [
      "Tokens must never leak into URLs/logs. Prefer storing them securely (often httpOnly cookies for web apps).",
    ],
  },
  {
    id: "api-call",
    title: "Call your API",
    actor: "client",
    whatHappens:
      "Your app uses the access token to call a Resource Server API.",
    youSend: [
      { label: "Authorization", value: "Bearer <access_token>", sensitive: true },
    ],
    attackerCanSee: [
      "If XSS happens, an attacker can steal tokens in JS storage. Favor httpOnly cookies for web sessions.",
    ],
  },
];

const actorLabel: Record<Actor, string> = {
  browser: "Browser",
  client: "Client App",
  as: "Authorization Server",
  api: "Resource Server",
};

const actorIcon: Record<Actor, React.ReactNode> = {
  browser: <Globe className="w-4 h-4" />,
  client: <User className="w-4 h-4" />,
  as: <Server className="w-4 h-4" />,
  api: <ShieldCheck className="w-4 h-4" />,
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function OAuthPkceFlowSimulator() {
  const steps = useMemo(() => baseSteps, []);
  const [index, setIndex] = useState(0);

  const step = steps[index];

  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const reset = () => setIndex(0);

  return (
    <div className="w-full max-w-3xl mx-auto my-8 border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="bg-muted/50 p-4 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">OAuth 2.0 Authorization Code + PKCE</span>
            <span className="text-xs text-muted-foreground">
              Step {index + 1} of {steps.length} · {actorLabel[step.actor]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button size="sm" onClick={next} disabled={index >= steps.length - 1} className="gap-2">
            <Play className="w-4 h-4" />
            Next
          </Button>
        </div>
      </div>

      <div className="p-6 bg-background">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <motion.div
                className={
                  "h-7 w-7 rounded-full border flex items-center justify-center text-xs font-semibold " +
                  (i === index
                    ? "bg-primary text-primary-foreground border-primary"
                    : i < index
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border")
                }
                layout
              >
                {i + 1}
              </motion.div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Badge>
                <span className="inline-flex items-center gap-1">
                  {actorIcon[step.actor]}
                  {actorLabel[step.actor]}
                </span>
              </Badge>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
            </div>

            <p className="text-sm text-muted-foreground leading-7">{step.whatHappens}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">What you send / store</span>
                </div>
                <ul className="space-y-2">
                  {step.youSend.map((item) => (
                    <li key={item.label} className="text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-foreground">{item.label}</span>
                        {item.sensitive ? (
                          <span className="text-[10px] font-medium text-red-500">sensitive</span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground">public</span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-muted-foreground break-words">
                        {item.value}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Security note</span>
                </div>
                <ul className="space-y-2 list-disc list-inside text-xs text-muted-foreground">
                  {step.attackerCanSee.map((line) => (
                    <li key={line} className="leading-6">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-foreground">Why PKCE matters</span>
              </div>
              <p className="text-sm text-muted-foreground leading-7">
                PKCE ties the authorization code to the client instance that started the login. Even if an attacker steals the code, they
                still can’t redeem it without the secret <span className="font-mono">code_verifier</span>.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
