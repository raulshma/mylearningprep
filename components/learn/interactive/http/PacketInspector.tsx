"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Lock, Unlock, FileCode, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PacketInspector() {
  const [protocol, setProtocol] = useState<"http1" | "http2" | "https">("http1");

  const packetData = {
    http1: {
      type: "text",
      content: `GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0
Accept: text/html

[Empty Body]`,
      description: "Plain text, human readable. Sent as a continuous stream of characters.",
      features: ["Text-based", "Head-of-line blocking", "No encryption (default)"],
    },
    http2: {
      type: "binary",
      content: `[Frame: HEADERS]
  :method = GET
  :path = /index.html
  :scheme = https
  :authority = www.example.com

[Frame: DATA]
  Stream ID: 1
  Flags: END_STREAM`,
      description: "Binary framing layer. Header compression (HPACK). Multiplexing over single connection.",
      features: ["Binary", "Multiplexing", "Header Compression"],
    },
    https: {
      type: "encrypted",
      content: `[TLS Record Layer]
  Content Type: Application Data
  Version: TLS 1.3
  Length: 42
  Encrypted Data: 
    a8 2f 94 bc 11 e0 ... (unreadable)`,
      description: "Encrypted transport. Wraps HTTP/1.1 or HTTP/2. Ensures confidentiality and integrity.",
      features: ["Encryption (TLS)", "Integrity Check", "Authentication"],
    },
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8">
      <Card className="p-1">
        <Tabs defaultValue="http1" onValueChange={(v) => setProtocol(v as any)} className="w-full">
          <div className="p-4 border-b bg-muted/30">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Protocol Inspector
                </h3>
             </div>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="http1">HTTP/1.1</TabsTrigger>
              <TabsTrigger value="http2">HTTP/2</TabsTrigger>
              <TabsTrigger value="https" className="gap-2">
                HTTPS <Lock className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 min-h-[300px] grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={protocol === "https" ? "default" : "outline"} className="uppercase">
                    {protocol === "https" ? "Encrypted" : "Clear Text"}
                </Badge>
                {protocol === "http1" && <FileCode className="w-4 h-4 text-muted-foreground" />}
                {protocol === "http2" && <Database className="w-4 h-4 text-muted-foreground" />}
                {protocol === "https" && <Lock className="w-4 h-4 text-green-500" />}
              </div>
              
              <div className="p-4 rounded-lg bg-zinc-950 font-mono text-sm shadow-inner h-[200px] overflow-auto border border-zinc-800 relative group">
                {protocol === "https" ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                        <Lock className="w-8 h-8 opacity-50" />
                        <span className="text-xs">Paylod Encrypted</span>
                    </div>
                ): null}
                
                <pre className={`text-zinc-300 ${protocol === "https" ? "blur-sm select-none opacity-50" : ""}`}>
                  {packetData[protocol].content}
                </pre>

                {/* Overlay for HTTPS to show "decrypted" on hover is a nice touch, but let's keep it simple for now or maybe add a toggle later. */}
              </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Analysis</h4>
                <p className="text-sm leading-relaxed">
                    {packetData[protocol].description}
                </p>
                
                <div className="space-y-2">
                    {packetData[protocol].features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {feature}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
