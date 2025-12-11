"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Search, Globe, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function HttpRequestBuilder() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/home");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    setIsLoading(true);
    setResponse(null);

    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      if (method === "GET") {
        setResponse(
          path === "/home"
            ? "HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html>...</html>"
            : "HTTP/1.1 404 Not Found"
        );
      } else if (method === "POST") {
        setResponse("HTTP/1.1 201 Created\nLocation: /new-resource");
      } else {
        setResponse("HTTP/1.1 405 Method Not Allowed");
      }
    }, 1200);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 space-y-4">
      <Card className="p-6 bg-card border shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          HTTP Request Builder
        </h3>

        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Method
            </label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full sm:w-[120px] bg-background">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[3] w-full space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Path
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                example.com
              </span>
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="pl-[100px] font-mono text-sm bg-background"
                placeholder="/path/to/resource"
              />
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[100px]"
          >
            {isLoading ? "Sending..." : "Send"}
            {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Visualization of the raw request */}
        <div className="mt-6 mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Generated Request
          </label>
          <div className="p-4 bg-zinc-950 text-green-400 font-mono text-sm rounded-lg shadow-inner overflow-x-auto">
            <div>
              <span className="text-purple-400">{method}</span> {path} HTTP/1.1
            </div>
            <div className="text-zinc-400">Host: example.com</div>
            <div className="text-zinc-400">User-Agent: Browser/1.0</div>
            <div className="text-zinc-400">Accept: */*</div>
          </div>
        </div>

        {/* Response Area */}
        {response && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Server Response
              </label>
            </div>
            
            <div className="p-4 bg-zinc-900 border-l-4 border-blue-500 text-blue-100 font-mono text-sm rounded-r-lg shadow-sm">
              <pre className="whitespace-pre-wrap">{response}</pre>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
