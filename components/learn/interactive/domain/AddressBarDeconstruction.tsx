"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrlPart {
  id: string;
  text: string;
  label: string;
  description: string;
  color: string;
}

export function AddressBarDeconstruction() {
  const [activePart, setActivePart] = useState<string | null>(null);

  const urlParts: UrlPart[] = [
    {
      id: "protocol",
      text: "https://",
      label: "Protocol",
      description: "HyperText Transfer Protocol Secure. It tells the browser how to talk to the server. 'Secure' means it's encrypted!",
      color: "text-green-500 bg-green-500/10",
    },
    {
      id: "subdomain",
      text: "www.",
      label: "Subdomain",
      description: "A specific section of the website. 'www' is the most common, but it could be 'blog', 'mail', or anything!",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      id: "domain",
      text: "google",
      label: "Second-Level Domain (SLD)",
      description: "The unique name of the website. This is what you buy from a registrar.",
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      id: "tld",
      text: ".com",
      label: "Top-Level Domain (TLD)",
      description: "The category of the site. Common ones are .com (commercial), .org (organization), .gov (government).",
      color: "text-orange-500 bg-orange-500/10",
    },
    {
      id: "path",
      text: "/search",
      label: "Path",
      description: "The specific page or resource you are looking for on the website.",
      color: "text-gray-500 bg-gray-500/10",
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto my-8 font-sans">
      <div className="bg-background border rounded-xl shadow-sm overflow-hidden">
        {/* Browser Chrome */}
        <div className="bg-muted/30 p-2 border-b flex items-center gap-2">
          <div className="flex gap-1.5 ml-2">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          
          {/* Address Bar Input Simulation */}
          <div className="flex-1 ml-4 bg-background border rounded-lg h-9 flex items-center px-3 gap-2 text-sm shadow-sm relative overflow-hidden">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            
            <div className="flex items-center font-mono">
              {urlParts.map((part) => (
                <motion.span
                  key={part.id}
                  className={cn(
                    "cursor-pointer px-0.5 rounded transition-colors duration-200",
                    activePart === part.id ? part.color : "hover:bg-muted"
                  )}
                  onHoverStart={() => setActivePart(part.id)}
                  onClick={() => setActivePart(part.id)}
                >
                  {part.text}
                </motion.span>
              ))}
            </div>
            
            {/* Blinking Cursor */}
            <motion.div
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-0.5 h-4 bg-primary ml-0.5"
            />
          </div>
        </div>

        {/* Explanation Area */}
        <div className="p-6 min-h-[140px] bg-card">
          <AnimatePresence mode="wait">
            {activePart ? (
              <motion.div
                key={activePart}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex gap-4 items-start"
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0", 
                  urlParts.find(p => p.id === activePart)?.color
                )}>
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {urlParts.find(p => p.id === activePart)?.label}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
                      Part: &quot;{urlParts.find(p => p.id === activePart)?.text}&quot;
                    </span>
                  </h3>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    {urlParts.find(p => p.id === activePart)?.description}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-2"
              >
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>Hover over different parts of the URL above to see what they mean!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
