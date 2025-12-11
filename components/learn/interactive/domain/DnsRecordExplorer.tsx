"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Globe, Mail, Shield, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: string;
  description: string;
  useCase: string;
  icon: any;
  color: string;
}

export function DnsRecordExplorer() {
  const [activeRecord, setActiveRecord] = useState<string>("A");

  const records: DnsRecord[] = [
    {
      type: "A",
      name: "example.com",
      value: "93.184.216.34",
      ttl: "3600",
      description: "Maps a hostname to an IPv4 address.",
      useCase: "The most common record. Used to point your domain to your web server.",
      icon: Globe,
      color: "text-blue-600 bg-blue-100",
    },
    {
      type: "AAAA",
      name: "example.com",
      value: "2606:2800:220:1:248:1893:25c8:1946",
      ttl: "3600",
      description: "Maps a hostname to an IPv6 address.",
      useCase: "Same as 'A' records but for the newer, longer IP addresses.",
      icon: Globe,
      color: "text-indigo-600 bg-indigo-100",
    },
    {
      type: "CNAME",
      name: "www.example.com",
      value: "example.com",
      ttl: "3600",
      description: "Canonical Name. Maps one hostname to another hostname.",
      useCase: "Used to alias 'www' to the root domain, or for subdomains like 'blog' pointing to a 3rd party service.",
      icon: ArrowRight,
      color: "text-purple-600 bg-purple-100",
    },
    {
      type: "MX",
      name: "example.com",
      value: "10 mail.example.com",
      ttl: "3600",
      description: "Mail Exchange. Specifies the mail servers handling email for the domain.",
      useCase: "Critical for receiving email. The number (10) is the priority.",
      icon: Mail,
      color: "text-orange-600 bg-orange-100",
    },
    {
      type: "TXT",
      name: "example.com",
      value: "v=spf1 include:_spf.google.com ~all",
      ttl: "3600",
      description: "Text record. Stores arbitrary text data.",
      useCase: "Originally for notes, now widely used for verification (SPF, DKIM) and ownership proof.",
      icon: FileText,
      color: "text-gray-600 bg-gray-100",
    },
    {
      type: "NS",
      name: "example.com",
      value: "ns1.example.com",
      ttl: "86400",
      description: "Name Server. Delegates a DNS zone to use the given authoritative name servers.",
      useCase: "Tells the rest of the internet which servers hold the 'master' records for this domain.",
      icon: Shield,
      color: "text-red-600 bg-red-100",
    },
  ];

  const selected = records.find(r => r.type === activeRecord)!;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sidebar: Record List */}
        <div className="col-span-1 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Record Types
          </h3>
          {records.map((record) => (
            <button
              key={record.type}
              onClick={() => setActiveRecord(record.type)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
                activeRecord === record.type 
                  ? "bg-card border-primary shadow-sm" 
                  : "bg-transparent border-transparent hover:bg-muted"
              )}
            >
              <span className={cn("px-2 py-1 rounded text-xs font-bold w-12 text-center", record.color.replace("text-", "bg-").replace("bg-", "text-whitetext-"))} style={{backgroundColor: 'var(--background)'}}> 
                {/* Fallback styling for badge */}
                 <span className={cn("px-2 py-0.5 rounded text-xs font-bold", record.color)}>
                  {record.type}
                 </span>
              </span>
              <span className="font-medium text-sm">{record.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content: Record Details */}
        <div className="col-span-1 md:col-span-2">
          <motion.div
            key={activeRecord}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
             <div className="bg-card border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-muted/30">
                   <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className={cn("p-3 rounded-xl", selected.color)}>
                            <selected.icon className="w-6 h-6" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold">{selected.type} Record</h2>
                            <p className="text-muted-foreground">{selected.description}</p>
                         </div>
                      </div>
                   </div>
                   
                   {/* Mock Config Line */}
                   <div className="font-mono text-sm bg-background border p-3 rounded-lg overflow-x-auto">
                      <span className="text-muted-foreground">{selected.name}</span>
                      <span className="mx-4 text-primary font-bold">IN {selected.type}</span>
                      <span className="text-foreground">{selected.value}</span>
                   </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1">
                   <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      When to use it?
                   </h4>
                   <p className="text-muted-foreground leading-relaxed">
                      {selected.useCase}
                   </p>
                   
                   <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                      <div>
                         <span className="text-xs uppercase text-muted-foreground font-semibold">Time To Live (TTL)</span>
                         <p className="font-mono text-lg">{selected.ttl}s</p>
                      </div>
                      <div>
                         <span className="text-xs uppercase text-muted-foreground font-semibold">Priority</span>
                         <p className="font-mono text-lg">{selected.type === "MX" ? "10" : "N/A"}</p>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
