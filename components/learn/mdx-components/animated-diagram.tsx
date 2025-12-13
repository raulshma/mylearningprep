'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Server, Globe, Wifi, ArrowRight, Zap, GitBranch, Layers, Folder, Cloud, Upload, Download, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AnimatedControls,
  type AnimationSpeed,
  speedMultipliers,
} from '@/components/learn/shared/animated-controls';

type DiagramType = 
  | 'packet-flow' 
  | 'dns-lookup' 
  | 'http-request' 
  | 'tcp-handshake'
  | 'client-server'
  | 'git-three-trees'
  | 'git-branch-merge'
  | 'git-remote-flow';

interface AnimatedDiagramProps {
  type: DiagramType;
  autoPlay?: boolean;
  speed?: AnimationSpeed;
}

export function AnimatedDiagram({ 
  type, 
  autoPlay = true,
  speed: initialSpeed = 'normal' 
}: AnimatedDiagramProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);
  const [resetKey, setResetKey] = useState(0);
  const multiplier = speedMultipliers[speed];

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: AnimationSpeed) => {
    setSpeed(newSpeed);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setResetKey((prev) => prev + 1);
    // Restart playing after a brief pause
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Diagram content based on type */}
      <div className="relative p-6 min-h-[280px]">
        {type === 'packet-flow' && (
          <PacketFlowDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'dns-lookup' && (
          <DNSLookupDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'http-request' && (
          <HTTPRequestDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'client-server' && (
          <ClientServerDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'tcp-handshake' && (
          <TCPHandshakeDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'git-three-trees' && (
          <GitThreeTreesDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'git-branch-merge' && (
          <GitBranchMergeDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
        {type === 'git-remote-flow' && (
          <GitRemoteFlowDiagram key={resetKey} isPlaying={isPlaying} multiplier={multiplier} />
        )}
      </div>

      {/* Controls - Requirements 11.1: play/pause and speed adjustment */}
      <AnimatedControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onReset={handleReset}
        label={getDiagramLabel(type)}
      />
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
    case 'git-three-trees': return 'Git: working tree → staging → commits';
    case 'git-branch-merge': return 'Git: branches and merging';
    case 'git-remote-flow': return 'Git: local repo ↔ remote repo sync';
    default: return 'Interactive diagram';
  }
}

function GitThreeTreesDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch h-full">
      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Folder className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Working tree</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Your files on disk. You edit code here.
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-primary/10 border border-primary/20 font-mono">index.ts</span>
            <span className="text-muted-foreground">modified</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-secondary border border-border font-mono">README.md</span>
            <span className="text-muted-foreground">untracked</span>
          </div>
        </div>
      </div>

      <div className="relative p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-foreground">Staging area (index)</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          A &quot;shopping cart&quot; of changes you intend to commit.
        </p>

        <div className="mt-4">
          <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-mono inline-block">
            index.ts
          </div>
        </div>

        {isPlaying && (
          <>
            <motion.div
              className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground flex items-center gap-2"
              animate={{ opacity: [0, 1, 1, 0], x: [-6, 0, 0, 6] }}
              transition={{ duration: 2.2 * multiplier, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight className="w-4 h-4" />
              <span className="font-mono">git add</span>
            </motion.div>
            <motion.div
              className="absolute -right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground flex items-center gap-2"
              animate={{ opacity: [0, 0, 1, 1, 0], x: [6, 6, 0, 0, -6] }}
              transition={{ duration: 2.2 * multiplier, repeat: Infinity, ease: 'easeInOut', times: [0, 0.35, 0.55, 0.85, 1] }}
            >
              <span className="font-mono">git commit</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </>
        )}
      </div>

      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-green-500" />
          <h4 className="font-semibold text-foreground">Repository (commits)</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Your project history. Commits are snapshots with messages.
        </p>

        <div className="mt-4 space-y-2">
          {[{ id: 'a1b2c3d', msg: 'feat: add login' }, { id: 'e4f5g6h', msg: 'fix: handle null user' }].map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{c.id}</span>
              <span className="text-foreground truncate">{c.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GitBranchMergeDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => setStep((s) => (s + 1) % 4), 1600 * multiplier);
    return () => clearInterval(interval);
  }, [isPlaying, multiplier]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className={cn('p-3 rounded-xl border', step <= 1 ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border')}>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">main</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Stable history</p>
        </div>

        <div className={cn('p-3 rounded-xl border', step >= 1 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-secondary/30 border-border')}>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold">feature/login</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Work in progress</p>
        </div>
      </div>

      <div className="relative h-28 rounded-xl border border-border bg-secondary/30 overflow-hidden">
        <div className="absolute inset-0 p-4">
          {/* main line */}
          <div className="absolute left-6 right-6 top-7 h-0.5 bg-border" />
          {/* feature line */}
          <div className="absolute left-16 right-10 top-16 h-0.5 bg-border" />

          {/* commits */}
          {[0, 1, 2].map((i) => (
            <div
              key={`m-${i}`}
              className={cn(
                'absolute top-7 -translate-y-1/2 w-3 h-3 rounded-full',
                i <= 1 ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
              style={{ left: `${18 + i * 18}%` }}
            />
          ))}

          {[0, 1].map((i) => (
            <div
              key={`f-${i}`}
              className={cn(
                'absolute top-16 -translate-y-1/2 w-3 h-3 rounded-full',
                step >= 2 ? 'bg-blue-500' : 'bg-muted-foreground/40'
              )}
              style={{ left: `${34 + i * 18}%` }}
            />
          ))}

          {/* merge commit */}
          <motion.div
            className={cn(
              'absolute top-7 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center',
              step === 3 ? 'bg-green-500 text-white' : 'bg-muted-foreground/40 text-transparent'
            )}
            style={{ left: '72%' }}
            animate={step === 3 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6 * multiplier }}
          >
            <GitMerge className="w-3 h-3" />
          </motion.div>

          {/* branch off line */}
          <div className="absolute left-[34%] top-7 w-0.5 h-9 bg-border" />
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground"
      >
        {step === 0 && <span><span className="font-mono text-foreground">main</span> has stable commits.</span>}
        {step === 1 && <span>Create a branch: <span className="font-mono text-foreground">git switch -c feature/login</span>.</span>}
        {step === 2 && <span>Make commits on the branch without affecting <span className="font-mono text-foreground">main</span>.</span>}
        {step === 3 && <span>Merge back: <span className="font-mono text-foreground">git merge feature/login</span>.</span>}
      </motion.div>
    </div>
  );
}

function GitRemoteFlowDiagram({ isPlaying, multiplier }: { isPlaying: boolean; multiplier: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center h-full">
      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Folder className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Local</h4>
        </div>
        <p className="text-xs text-muted-foreground">Your machine (commits, branches, working tree).</p>
      </div>

      <div className="relative p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Download className="w-4 h-4" />
            <span className="font-mono">fetch</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="w-4 h-4" />
            <span className="font-mono">push</span>
          </div>
        </div>

        {isPlaying && (
          <>
            <motion.div
              className="absolute left-6 right-6 top-12 h-0.5 bg-border"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.6 * multiplier, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-10 left-6 w-3 h-3 rounded bg-blue-500"
              animate={{ x: ['0%', '260%'] }}
              transition={{ duration: 2.2 * multiplier, repeat: Infinity, ease: 'linear' }}
              title="fetch"
            />
            <motion.div
              className="absolute top-14 right-6 w-3 h-3 rounded bg-green-500"
              animate={{ x: ['0%', '-260%'] }}
              transition={{ duration: 2.2 * multiplier, repeat: Infinity, ease: 'linear', delay: 0.6 * multiplier }}
              title="push"
            />
          </>
        )}
      </div>

      <div className="p-4 rounded-xl border border-border bg-secondary/30">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-foreground">Remote</h4>
        </div>
        <p className="text-xs text-muted-foreground">Shared server (GitHub/GitLab). Collaboration happens here.</p>
      </div>
    </div>
  );
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
