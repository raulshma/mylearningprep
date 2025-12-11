'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DemoType = 
  | 'ip-address-demo'
  | 'url-parser'
  | 'request-builder'
  | 'packet-simulator';

interface InteractiveDemoProps {
  type: DemoType;
  title?: string;
}

export function InteractiveDemo({ type, title }: InteractiveDemoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {title || getDemoTitle(type)}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">Interactive Demo</span>
      </div>
      <div className="p-6">
        {type === 'ip-address-demo' && <IPAddressDemo />}
        {type === 'url-parser' && <URLParserDemo />}
        {type === 'request-builder' && <RequestBuilderDemo />}
        {type === 'packet-simulator' && <PacketSimulatorDemo />}
      </div>
    </motion.div>
  );
}

function getDemoTitle(type: DemoType): string {
  switch (type) {
    case 'ip-address-demo': return 'Your IP Address';
    case 'url-parser': return 'URL Structure';
    case 'request-builder': return 'HTTP Request Builder';
    case 'packet-simulator': return 'Packet Journey Simulator';
    default: return 'Interactive Demo';
  }
}

// IP Address Demo
function IPAddressDemo() {
  const [revealed, setRevealed] = useState(false);
  // Simulated IP - in real implementation, fetch from API
  const mockIP = '192.168.1.42';
  const mockPublicIP = '203.0.113.195';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every device on the Internet has a unique address. Click below to see examples:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground block mb-1">Local IP (Your Network)</span>
          <motion.div
            className="font-mono text-lg text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: revealed ? 1 : 0 }}
          >
            {revealed ? mockIP : '•••.•••.•.••'}
          </motion.div>
        </div>

        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
          <span className="text-xs text-muted-foreground block mb-1">Public IP (Internet)</span>
          <motion.div
            className="font-mono text-lg text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: revealed ? 1 : 0 }}
          >
            {revealed ? mockPublicIP : '•••.•.•••.•••'}
          </motion.div>
        </div>
      </div>

      <Button 
        onClick={() => setRevealed(!revealed)} 
        variant="outline" 
        size="sm"
      >
        {revealed ? 'Hide' : 'Reveal'} IP Addresses
      </Button>

      {revealed && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground"
        >
          💡 Your local IP is used within your home network. Your public IP is how websites see you!
        </motion.p>
      )}
    </div>
  );
}

// URL Parser Demo
function URLParserDemo() {
  const [url, setUrl] = useState('https://www.example.com:443/path/page?query=value#section');
  
  const parts = parseURL(url);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground block mb-2">
          Enter a URL to parse:
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground font-mono text-sm"
          placeholder="https://example.com/page"
        />
      </div>

      <div className="space-y-2">
        {Object.entries(parts).map(([key, value]) => (
          <motion.div
            key={key}
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-xs font-medium text-muted-foreground w-20">{key}</span>
            <code className={cn(
              'text-sm font-mono flex-1',
              value ? 'text-primary' : 'text-muted-foreground/50'
            )}>
              {value || '(none)'}
            </code>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function parseURL(urlString: string): Record<string, string> {
  try {
    const url = new URL(urlString);
    return {
      Protocol: url.protocol.replace(':', ''),
      Host: url.hostname,
      Port: url.port || '(default)',
      Path: url.pathname,
      Query: url.search.replace('?', ''),
      Hash: url.hash.replace('#', ''),
    };
  } catch {
    return {
      Protocol: '',
      Host: '',
      Port: '',
      Path: '',
      Query: '',
      Hash: '',
    };
  }
}

// Request Builder Demo
function RequestBuilderDemo() {
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [path, setPath] = useState('/api/users');

  const request = `${method} ${path} HTTP/1.1
Host: example.com
User-Agent: MyBrowser/1.0
Accept: application/json${method === 'POST' ? '\nContent-Type: application/json\n\n{"name": "John"}' : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
            className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-2">Path</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
          />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-zinc-900 border border-border font-mono text-xs text-green-400 whitespace-pre overflow-x-auto">
        {request}
      </div>
    </div>
  );
}

// Packet Simulator Demo
function PacketSimulatorDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentHop, setCurrentHop] = useState(-1);

  const hops = [
    { name: 'Your Router', ip: '192.168.1.1', time: '1ms' },
    { name: 'ISP Gateway', ip: '10.0.0.1', time: '5ms' },
    { name: 'Regional Hub', ip: '172.16.0.1', time: '15ms' },
    { name: 'Internet Exchange', ip: '203.0.113.1', time: '25ms' },
    { name: 'Destination Server', ip: '93.184.216.34', time: '35ms' },
  ];

  const runSimulation = () => {
    setIsRunning(true);
    setCurrentHop(-1);

    hops.forEach((_, i) => {
      setTimeout(() => {
        setCurrentHop(i);
        if (i === hops.length - 1) {
          setTimeout(() => setIsRunning(false), 500);
        }
      }, (i + 1) * 800);
    });
  };

  const reset = () => {
    setIsRunning(false);
    setCurrentHop(-1);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Watch your data packet travel through the Internet:
      </p>

      <div className="space-y-2">
        {hops.map((hop, i) => (
          <motion.div
            key={i}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              currentHop === i 
                ? 'bg-primary/10 border-primary' 
                : currentHop > i 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-secondary/30 border-border'
            )}
            animate={currentHop === i ? { scale: [1, 1.02, 1] } : {}}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
              currentHop >= i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{hop.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{hop.ip}</div>
            </div>
            {currentHop >= i && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-green-500 font-medium"
              >
                {hop.time}
              </motion.div>
            )}
            <ChevronRight className={cn(
              'w-4 h-4',
              currentHop >= i ? 'text-primary' : 'text-muted-foreground/30'
            )} />
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={runSimulation} 
          disabled={isRunning}
          size="sm"
        >
          {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isRunning ? 'Running...' : 'Start Trace'}
        </Button>
        <Button onClick={reset} variant="outline" size="sm" disabled={currentHop === -1}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
