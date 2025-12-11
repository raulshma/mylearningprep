"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, Server, Globe, Database, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  id: number;
  source: "user" | "resolver" | "root" | "tld" | "auth";
  target: "user" | "resolver" | "root" | "tld" | "auth";
  message: string;
  subMessage?: string;
}

export function DnsResolutionFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps: Step[] = [
    {
      id: 1,
      source: "user",
      target: "resolver",
      message: "Where is example.com?",
      subMessage: "Browser asks the ISP's Recursive Resolver",
    },
    {
      id: 2,
      source: "resolver",
      target: "root",
      message: "Where is .com?",
      subMessage: "Resolver asks the Root Server",
    },
    {
      id: 3,
      source: "root",
      target: "resolver",
      message: "Go to the .com TLD Server",
      subMessage: "Root server replies with TLD server address",
    },
    {
      id: 4,
      source: "resolver",
      target: "tld",
      message: "Where is example.com?",
      subMessage: "Resolver asks the TLD Server",
    },
    {
      id: 5,
      source: "tld",
      target: "resolver",
      message: "Go to NameServer 1.2.3.4",
      subMessage: "TLD server gives the Authoritative NameServer",
    },
    {
      id: 6,
      source: "resolver",
      target: "auth",
      message: "Where is example.com?",
      subMessage: "Resolver asks the Authoritative Server",
    },
    {
      id: 7,
      source: "auth",
      target: "resolver",
      message: "It is at 93.184.216.34",
      subMessage: "Authoritative Server gives the final IP",
    },
    {
      id: 8,
      source: "resolver",
      target: "user",
      message: "Here is the IP: 93.184.216.34",
      subMessage: "Resolver sends the answer back to browser",
    },
  ];

  const nodes = {
    user: { label: "User", icon: Laptop, color: "bg-blue-500" },
    resolver: { label: "Resolver", icon: Server, color: "bg-indigo-500" },
    root: { label: "Root (.)", icon: Globe, color: "bg-purple-500" },
    tld: { label: "TLD (.com)", icon: Database, color: "bg-orange-500" },
    auth: { label: "Example.com", icon: Server, color: "bg-green-500" },
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentStep < steps.length) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2500);
    } else if (currentStep >= steps.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const reset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const activeStepData = steps[currentStep] || steps[steps.length - 1];
  const isFinished = currentStep >= steps.length;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 border rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          DNS Resolution Journey
        </h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reset}
            disabled={currentStep === 0}
          >
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isFinished}
          >
            {isPlaying ? "Pause" : currentStep > 0 ? "Resume" : "Start Query"}
          </Button>
        </div>
      </div>

      <div className="p-8 relative min-h-[400px]">
        {/* Nodes Layout */}
        <div className="grid grid-cols-3 gap-y-12 gap-x-8 text-center relative z-10">
          
          {/* Top Row: User - Resolver */}
          <div className="col-span-1 flex flex-col items-center gap-2">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
               ["user", "resolver"].includes(activeStepData.source) || ["user", "resolver"].includes(activeStepData.target) 
               ? "scale-110 ring-2 ring-primary ring-offset-2" 
               : "opacity-70"
             } bg-blue-100`}>
                <Laptop className="w-8 h-8 text-blue-600" />
             </div>
             <span className="font-medium text-sm">User Browser</span>
          </div>
          
          <div className="col-span-1 flex flex-col items-center justify-center">
             {/* Connection Line Visual */}
             <div className="h-0.5 w-full bg-border absolute top-16 left-0 -z-10" />
          </div>

          <div className="col-span-1 flex flex-col items-center gap-2">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
               ["resolver", "root", "tld", "auth"].includes(activeStepData.source) || activeStepData.target === "resolver"
               ? "scale-110 ring-2 ring-indigo-500 ring-offset-2" 
               : "opacity-70"
             } bg-indigo-100`}>
                <Server className="w-8 h-8 text-indigo-600" />
             </div>
             <span className="font-medium text-sm">Recursive Resolver</span>
          </div>

          {/* Bottom Row: Root - TLD - Auth */}
          <div className="col-span-3 grid grid-cols-3 gap-8 mt-8 pt-8 border-t border-dashed border-muted-foreground/20">
             
             {/* Root */}
             <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-all ${
                  activeStepData.target === "root" || activeStepData.source === "root"
                  ? "scale-110 ring-2 ring-purple-500 ring-offset-2 bg-purple-100" 
                  : "bg-muted"
                }`}>
                   <Globe className={`w-6 h-6 ${ activeStepData.target === "root" ? "text-purple-600" : "text-muted-foreground"}`} />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Root Server (.)</span>
             </div>

             {/* TLD */}
             <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-all ${
                  activeStepData.target === "tld" || activeStepData.source === "tld"
                  ? "scale-110 ring-2 ring-orange-500 ring-offset-2 bg-orange-100" 
                  : "bg-muted"
                }`}>
                   <Database className={`w-6 h-6 ${ activeStepData.target === "tld" ? "text-orange-600" : "text-muted-foreground"}`} />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">TLD Server (.com)</span>
             </div>

             {/* Auth */}
             <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-all ${
                  activeStepData.target === "auth" || activeStepData.source === "auth"
                  ? "scale-110 ring-2 ring-green-500 ring-offset-2 bg-green-100" 
                  : "bg-muted"
                }`}>
                   <Server className={`w-6 h-6 ${ activeStepData.target === "auth" ? "text-green-600" : "text-muted-foreground"}`} />
                </div>
                <span className="text-xs text-muted-foreground font-semibold">Authoritative NS</span>
             </div>

          </div>
        </div>

        {/* Message Bubble Overlay */}
        <AnimatePresence mode="wait">
          {!isFinished && currentStep < steps.length && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="bg-popover border shadow-lg rounded-xl p-4 max-w-xs text-center">
                 <div className="text-xs uppercase font-bold text-muted-foreground mb-1">
                    Step {currentStep + 1}: {steps[currentStep].source} → {steps[currentStep].target}
                 </div>
                 <div className="font-medium text-popover-foreground mb-1">
                    "{steps[currentStep].message}"
                 </div>
                 <div className="text-xs text-muted-foreground">
                    {steps[currentStep].subMessage}
                 </div>
              </div>
            </motion.div>
          )}
          
          {isFinished && (
             <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center bg-green-50 p-6 rounded-2xl border border-green-200 shadow-xl"
             >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Resolution Complete!</h3>
                <p className="text-green-700">The browser now has the IP address and can load the website.</p>
             </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
