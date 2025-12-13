'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronRight, Plus, Check, Upload, Download, GitCommit, GitBranch, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DemoType = 
  | 'ip-address-demo'
  | 'url-parser'
  | 'request-builder'
  | 'packet-simulator'
  | 'git-staging-demo'
  | 'git-remote-sync';

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
        {type === 'git-staging-demo' && <GitStagingDemo />}
        {type === 'git-remote-sync' && <GitRemoteSyncDemo />}
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
    case 'git-staging-demo': return 'Git Staging (git add / restore --staged)';
    case 'git-remote-sync': return 'Remote Sync (fetch / pull / push)';
    default: return 'Interactive Demo';
  }
}

type GitFileState = 'modified' | 'untracked' | 'staged';
interface GitFile {
  name: string;
  state: GitFileState;
}

function GitStagingDemo() {
  const [files, setFiles] = useState<GitFile[]>([
    { name: 'src/app/page.tsx', state: 'modified' },
    { name: 'README.md', state: 'untracked' },
    { name: 'src/components/Button.tsx', state: 'modified' },
  ]);
  const [lastAction, setLastAction] = useState<string>('');

  const stageFile = (name: string) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, state: 'staged' } : f)));
    setLastAction(`git add ${name}`);
  };

  const unstageFile = (name: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, state: f.state === 'staged' ? 'modified' : f.state } : f))
    );
    setLastAction(`git restore --staged ${name}`);
  };

  const commit = () => {
    const hasStaged = files.some((f) => f.state === 'staged');
    if (!hasStaged) return;
    setFiles((prev) => prev.filter((f) => f.state !== 'staged'));
    setLastAction('git commit -m "..."');
  };

  const reset = () => {
    setFiles([
      { name: 'src/app/page.tsx', state: 'modified' },
      { name: 'README.md', state: 'untracked' },
      { name: 'src/components/Button.tsx', state: 'modified' },
    ]);
    setLastAction('');
  };

  const statusText = useMemo(() => {
    const staged = files.filter((f) => f.state === 'staged');
    const modified = files.filter((f) => f.state === 'modified');
    const untracked = files.filter((f) => f.state === 'untracked');

    const lines: string[] = [];
    lines.push('On branch main');
    lines.push('');

    if (staged.length) {
      lines.push('Changes to be committed:');
      for (const f of staged) lines.push(`  modified:   ${f.name}`);
      lines.push('');
    }

    if (modified.length) {
      lines.push('Changes not staged for commit:');
      lines.push('  (use "git add <file>..." to update what will be committed)');
      for (const f of modified) lines.push(`  modified:   ${f.name}`);
      lines.push('');
    }

    if (untracked.length) {
      lines.push('Untracked files:');
      lines.push('  (use "git add <file>..." to include in what will be committed)');
      for (const f of untracked) lines.push(`  ${f.name}`);
      lines.push('');
    }

    if (!staged.length && !modified.length && !untracked.length) {
      lines.push('nothing to commit, working tree clean');
    }

    return lines.join('\n');
  }, [files]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Practice the &quot;three places&quot; model: working tree → staging area → commit.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="w-4 h-4" />
            <span>Files</span>
          </div>

          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.name}
                className={cn(
                  'p-3 rounded-lg border flex items-center justify-between gap-3',
                  f.state === 'staged'
                    ? 'bg-green-500/10 border-green-500/30'
                    : f.state === 'untracked'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-secondary/30 border-border'
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.state === 'staged' ? 'staged' : f.state === 'untracked' ? 'untracked' : 'modified'}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {f.state !== 'staged' ? (
                    <Button size="sm" variant="outline" onClick={() => stageFile(f.name)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Stage
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => unstageFile(f.name)}>
                      Undo stage
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={commit} disabled={!files.some((f) => f.state === 'staged')}>
              <GitCommit className="w-4 h-4 mr-2" />
              Commit staged
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-4 h-4" />
              <span>Simulated <span className="font-mono">git status</span></span>
            </div>
            {lastAction && (
              <span className="text-xs text-muted-foreground">
                Last: <span className="font-mono text-foreground">{lastAction}</span>
              </span>
            )}
          </div>
          <pre className="bg-zinc-900 border border-border rounded-xl p-4 overflow-x-auto text-xs text-green-400 whitespace-pre">
{statusText}
          </pre>
        </div>
      </div>
    </div>
  );
}

function GitRemoteSyncDemo() {
  const [localAhead, setLocalAhead] = useState(0);
  const [localBehind, setLocalBehind] = useState(0);
  const [remoteAhead, setRemoteAhead] = useState(0);
  const [message, setMessage] = useState<string>('Start by making a local commit or simulating a teammate push.');

  const makeLocalCommit = () => {
    setLocalAhead((n) => n + 1);
    setMessage('You made a local commit. You are now "ahead" of origin/main.');
  };

  const teammatePushes = () => {
    setRemoteAhead((n) => n + 1);
    setLocalBehind((n) => n + 1);
    setMessage('A teammate pushed to origin. Your local branch is now "behind".');
  };

  const fetch = () => {
    if (remoteAhead === 0) {
      setMessage('Fetch pulled no new remote commits.');
      return;
    }
    setMessage('Fetched: updated remote-tracking branch origin/main (no merge into your branch yet).');
  };

  const pull = () => {
    if (localBehind === 0) {
      setMessage('Pull: already up to date.');
      return;
    }
    setLocalBehind(0);
    setRemoteAhead(0);
    setMessage('Pulled: your local branch now includes the remote commits.');
  };

  const push = () => {
    if (localAhead === 0) {
      setMessage('Push: nothing to push.');
      return;
    }
    setLocalAhead(0);
    setMessage('Pushed: origin now has your commits.');
  };

  const reset = () => {
    setLocalAhead(0);
    setLocalBehind(0);
    setRemoteAhead(0);
    setMessage('Reset the simulation.');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This models the difference between <span className="font-mono">fetch</span> (download history) and <span className="font-mono">pull</span> (fetch + integrate).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Your local branch</h4>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>ahead of origin/main: <span className="font-mono text-foreground">{localAhead}</span></div>
            <div>behind origin/main: <span className="font-mono text-foreground">{localBehind}</span></div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-foreground">Remote (origin)</h4>
          </div>
          <div className="text-xs text-muted-foreground">
            new commits on origin/main: <span className="font-mono text-foreground">{remoteAhead}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={makeLocalCommit}>
          <Plus className="w-4 h-4 mr-2" />
          Local commit
        </Button>
        <Button size="sm" variant="outline" onClick={teammatePushes}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Teammate pushes
        </Button>
        <Button size="sm" variant="outline" onClick={fetch}>
          <Download className="w-4 h-4 mr-2" />
          Fetch
        </Button>
        <Button size="sm" onClick={pull} disabled={localBehind === 0}>
          <Download className="w-4 h-4 mr-2" />
          Pull
        </Button>
        <Button size="sm" onClick={push} disabled={localAhead === 0}>
          <Upload className="w-4 h-4 mr-2" />
          Push
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="p-3 rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground">
        {message}
      </div>
    </div>
  );
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
