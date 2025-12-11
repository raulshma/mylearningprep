'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Server, Globe, Wifi, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DiagramType = 
  | 'packet-flow' 
  | 'dns-lookup' 
  | 'http-request' 
  | 'tcp-handshake'
  | 'client-server';

interface AnimatedDiagramProps {
  type: DiagramType;
  autoPlay?: boolean;
  speed?: 'slow' | 'normal' | 'fast';
}

const speedMultipliers = {
  slow: 1.5,
  normal: 1,
  fast: 0.5,
};

export function AnimatedDiagram({ 
  type, 
  autoPlay = true,
  speed = 'normal' 
}: AnimatedDiagramProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const multiplier = speedMultipliers[speed];

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Diagram content based on type */}
      <div className="relative p-6 min-h-[280px]">
        {type === 'packet-flow' && (
          <PacketFlowDiagram isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'dns-lookup' && (
          <DNSLookupDiagram isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'http-request' && (
          <HTTPRequestDiagram isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'client-server' && (
          <ClientServerDiagram isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'tcp-handshake' && (
          <TCPHandshakeDiagram isPlaying={isPlaying} multiplier={multiplier} />
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-3 border-t border-border bg-secondary/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {getDiagramLabel(type)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlay}
          className="text-xs"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </div>
    </motion.div>
  );
}

function getDiagramLabel(type: DiagramType): string {
  switch (type) {
    case 'packet-flow': return 'Data packets traveling across the Internet';
    case 'dns-lookup': return 'DNS lookup process';
    case 'http-request': return 'HTTP request/response cycle';
    case 'tcp-handshake': return 'TCP three-way handshake';
    case 'client-server': return 'Client-Server communication';
    default: return 'Interactive diagram';
  }
}

// Packet Flow Animation
function PacketFlowDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  return (
    <div className="flex items-center justify-between h-full">
      {/* Client */}
      <div className="flex flex-col items-center gap-2">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <Monitor className="w-8 h-8 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Your Computer</span>
      </div>

      {/* Network path with animated packets */}
      <div className="flex-1 relative mx-8 h-16">
        {/* Network line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
        
        {/* Routers */}
        {[0.25, 0.5, 0.75].map((pos, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-muted-foreground/30"
            style={{ left: `${pos * 100}%` }}
          />
        ))}

        {/* Animated packets */}
        {isPlaying && [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded bg-primary shadow-lg shadow-primary/30"
            animate={{
              left: ['0%', '100%'],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: 2.5 * multiplier,
              delay: i * 0.7 * multiplier,
              repeat: Infinity,
              ease: 'linear',
              times: [0, 0.1, 0.5, 0.9, 1],
            }}
            style={{ 
              translateX: '-50%',
            }}
          />
        ))}
      </div>

      {/* Server */}
      <div className="flex flex-col items-center gap-2">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <Server className="w-8 h-8 text-green-500" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Web Server</span>
      </div>
    </div>
  );
}

// DNS Lookup Animation
function DNSLookupDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 2000 * multiplier);

    return () => clearInterval(interval);
  }, [isPlaying, multiplier]);

  const steps = [
    { label: 'You type: google.com', active: step === 0 },
    { label: 'Browser asks DNS server', active: step === 1 },
    { label: 'DNS returns IP: 142.250.80.46', active: step === 2 },
    { label: 'Browser connects to IP', active: step === 3 },
  ];

  return (
    <div className="space-y-4">
      {/* Visual representation */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'p-3 rounded-xl transition-colors',
            step === 0 || step === 3 ? 'bg-primary/20 border-2 border-primary' : 'bg-primary/10 border border-primary/30'
          )}>
            <Monitor className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Browser</span>
        </div>

        <motion.div 
          className="flex-1 mx-4"
          animate={{ opacity: step === 1 || step === 2 ? 1 : 0.3 }}
        >
          <ArrowRight className="w-6 h-6 text-muted-foreground mx-auto" />
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'p-3 rounded-xl transition-colors',
            step === 1 || step === 2 ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-500/10 border border-blue-500/30'
          )}>
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-xs text-muted-foreground">DNS Server</span>
        </div>

        <motion.div 
          className="flex-1 mx-4"
          animate={{ opacity: step === 3 ? 1 : 0.3 }}
        >
          <ArrowRight className="w-6 h-6 text-muted-foreground mx-auto" />
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'p-3 rounded-xl transition-colors',
            step === 3 ? 'bg-green-500/20 border-2 border-green-500' : 'bg-green-500/10 border border-green-500/30'
          )}>
            <Server className="w-6 h-6 text-green-500" />
          </div>
          <span className="text-xs text-muted-foreground">Website</span>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-4 gap-2 mt-6">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            className={cn(
              'p-2 rounded-lg text-center text-xs transition-colors',
              s.active 
                ? 'bg-primary/10 border-2 border-primary text-primary font-medium' 
                : 'bg-secondary/50 text-muted-foreground'
            )}
            animate={{ scale: s.active ? 1.02 : 1 }}
          >
            <span className="font-bold mr-1">{i + 1}.</span>
            {s.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// HTTP Request/Response Animation
function HTTPRequestDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  const [phase, setPhase] = useState<'request' | 'processing' | 'response'>('request');

  useEffect(() => {
    if (!isPlaying) return;

    const phases: ('request' | 'processing' | 'response')[] = ['request', 'processing', 'response'];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % phases.length;
      setPhase(phases[index]);
    }, 1500 * multiplier);

    return () => clearInterval(interval);
  }, [isPlaying, multiplier]);

  return (
    <div className="flex items-center justify-between h-full">
      {/* Client */}
      <div className="flex flex-col items-center gap-2">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <Monitor className="w-8 h-8 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Client</span>
      </div>

      {/* Request/Response arrows */}
      <div className="flex-1 mx-8 relative h-24">
        {/* Request arrow */}
        <motion.div
          className="absolute top-2 left-0 right-0 flex items-center"
          animate={{ opacity: phase === 'request' ? 1 : 0.3 }}
        >
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="text-primary text-xs px-2 bg-card whitespace-nowrap">
            GET /page HTTP/1.1
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </motion.div>

        {/* Processing indicator */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ 
            opacity: phase === 'processing' ? 1 : 0,
            scale: phase === 'processing' ? [1, 1.2, 1] : 1 
          }}
          transition={{ duration: 0.5, repeat: phase === 'processing' ? Infinity : 0 }}
        >
          <Zap className="w-6 h-6 text-yellow-500" />
        </motion.div>

        {/* Response arrow */}
        <motion.div
          className="absolute bottom-2 left-0 right-0 flex items-center flex-row-reverse"
          animate={{ opacity: phase === 'response' ? 1 : 0.3 }}
        >
          <div className="flex-1 h-0.5 bg-green-500" />
          <div className="text-green-500 text-xs px-2 bg-card whitespace-nowrap">
            200 OK + HTML
          </div>
          <ArrowRight className="w-4 h-4 text-green-500 rotate-180" />
        </motion.div>
      </div>

      {/* Server */}
      <div className="flex flex-col items-center gap-2">
        <motion.div 
          className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
          animate={{ 
            borderColor: phase === 'processing' ? 'rgb(234 179 8 / 0.5)' : 'rgb(34 197 94 / 0.3)',
            backgroundColor: phase === 'processing' ? 'rgb(234 179 8 / 0.1)' : 'rgb(34 197 94 / 0.1)'
          }}
        >
          <Server className="w-8 h-8 text-green-500" />
        </motion.div>
        <span className="text-xs font-medium text-muted-foreground">Server</span>
      </div>
    </div>
  );
}

// Client-Server basic diagram
function ClientServerDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  return (
    <div className="flex items-center justify-center gap-8 h-full">
      <div className="text-center">
        <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary/30 mb-3">
          <Monitor className="w-12 h-12 text-primary" />
        </div>
        <h4 className="font-semibold text-foreground">Client</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Your browser, phone app,<br />or any device
        </p>
      </div>

      <motion.div
        animate={isPlaying ? { x: [0, 5, 0, -5, 0] } : {}}
        transition={{ duration: 2 * multiplier, repeat: Infinity }}
      >
        <Wifi className="w-8 h-8 text-muted-foreground" />
      </motion.div>

      <div className="text-center">
        <div className="p-6 rounded-2xl bg-green-500/10 border-2 border-green-500/30 mb-3">
          <Server className="w-12 h-12 text-green-500" />
        </div>
        <h4 className="font-semibold text-foreground">Server</h4>
        <p className="text-xs text-muted-foreground mt-1">
          A powerful computer<br />serving content
        </p>
      </div>
    </div>
  );
}

// TCP Handshake Animation
function TCPHandshakeDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 1200 * multiplier);

    return () => clearInterval(interval);
  }, [isPlaying, multiplier]);

  const handshakeSteps = [
    { from: 'client', message: 'SYN', description: 'Client: "Can we connect?"' },
    { from: 'server', message: 'SYN-ACK', description: 'Server: "Yes, can you hear me?"' },
    { from: 'client', message: 'ACK', description: 'Client: "I hear you! Connected!"' },
    { from: 'both', message: '✓', description: 'Connection established!' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center gap-2 w-24">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
            <Monitor className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Client</span>
        </div>

        <div className="flex-1 relative h-32 mx-4">
          {handshakeSteps.slice(0, 3).map((s, i) => (
            <motion.div
              key={i}
              className={cn(
                'absolute w-full flex items-center gap-2',
                s.from === 'client' ? 'flex-row' : 'flex-row-reverse'
              )}
              style={{ top: `${i * 40}px` }}
              animate={{ 
                opacity: step >= i ? 1 : 0.2,
                x: step === i ? (s.from === 'client' ? [0, 10, 0] : [0, -10, 0]) : 0
              }}
              transition={{ duration: 0.5 }}
            >
              <div className={cn(
                'flex-1 h-0.5',
                step >= i ? 'bg-primary' : 'bg-border'
              )} />
              <div className={cn(
                'px-2 py-1 rounded text-xs font-mono font-bold',
                step >= i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              )}>
                {s.message}
              </div>
              <ArrowRight className={cn(
                'w-4 h-4',
                step >= i ? 'text-primary' : 'text-muted-foreground',
                s.from === 'server' && 'rotate-180'
              )} />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 w-24">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <Server className="w-6 h-6 text-green-500" />
          </div>
          <span className="text-xs text-muted-foreground">Server</span>
        </div>
      </div>

      {/* Current step description */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-3 rounded-lg bg-secondary/50"
      >
        <span className="text-sm font-medium text-foreground">
          {handshakeSteps[step].description}
        </span>
      </motion.div>
    </div>
  );
}
