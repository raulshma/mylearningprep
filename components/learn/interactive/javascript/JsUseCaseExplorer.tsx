'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Server, 
  Smartphone, 
  Monitor, 
  ChevronRight,
  Play,
  Code,
  Zap,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface JsUseCaseExplorerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
}

interface UseCase {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  examples: string[];
  code?: string;
  color: string;
}

const useCases: UseCase[] = [
  {
    id: 'web',
    title: 'Web Development',
    icon: <Globe className="w-8 h-8" />,
    description: 'JavaScript brings web pages to life! It can change content, respond to clicks, and create smooth animations.',
    examples: ['Interactive forms', 'Image sliders', 'Live search', 'Infinite scroll'],
    code: `// Change button text when clicked
const button = document.querySelector('button');
button.addEventListener('click', () => {
  button.textContent = 'Clicked! ✓';
});`,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'server',
    title: 'Server-Side (Node.js)',
    icon: <Server className="w-8 h-8" />,
    description: 'With Node.js, JavaScript runs on servers to handle millions of requests, connect to databases, and power APIs.',
    examples: ['REST APIs', 'Real-time chat', 'File uploads', 'Authentication'],
    code: `// Create a simple web server
const http = require('http');

http.createServer((req, res) => {
  res.end('Hello from the server!');
}).listen(3000);`,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'mobile',
    title: 'Mobile Apps',
    icon: <Smartphone className="w-8 h-8" />,
    description: 'Frameworks like React Native let you build real mobile apps for iOS and Android using JavaScript.',
    examples: ['Instagram', 'Facebook', 'Discord', 'Uber Eats'],
    code: `// React Native component
function WelcomeScreen() {
  return (
    <View>
      <Text>Welcome to our app!</Text>
      <Button title="Get Started" />
    </View>
  );
}`,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'desktop',
    title: 'Desktop Apps',
    icon: <Monitor className="w-8 h-8" />,
    description: 'Electron lets you create cross-platform desktop applications that run on Windows, Mac, and Linux.',
    examples: ['VS Code', 'Slack', 'Discord', 'Figma'],
    code: `// Electron main process
const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800, height: 600
  });
  win.loadFile('index.html');
});`,
    color: 'from-orange-500 to-red-500',
  },
];

export function JsUseCaseExplorer({ mode = 'beginner' }: JsUseCaseExplorerProps) {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [demoActive, setDemoActive] = useState(false);

  const handleSelect = useCallback((id: string) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedCase(prev => prev === id ? null : id);
    setTimeout(() => setIsAnimating(false), 300);
  }, [isAnimating]);

  const activeCase = useCases.find(c => c.id === selectedCase);

  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <Zap className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">JavaScript Use Cases</h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'beginner' 
              ? 'Click to explore where JavaScript is used!'
              : mode === 'intermediate'
              ? 'Explore different JavaScript environments with code examples'
              : 'Deep dive into JavaScript runtime environments'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {useCases.map((useCase, index) => (
          <motion.button
            key={useCase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(useCase.id)}
            className={cn(
              'relative p-4 rounded-xl border transition-all duration-200 text-left group',
              selectedCase === useCase.id
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg w-fit mb-3 bg-gradient-to-br',
              useCase.color,
              'text-white'
            )}>
              {useCase.icon}
            </div>
            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
              {useCase.title}
            </h4>
            <ChevronRight className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-transform',
              selectedCase === useCase.id && 'rotate-90'
            )} />
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeCase && (
          <motion.div
            key={activeCase.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'p-5 rounded-xl border border-border bg-gradient-to-br',
              'from-card to-muted/20'
            )}>
              <p className="text-muted-foreground mb-4">
                {activeCase.description}
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Real-World Examples
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {activeCase.examples.map(example => (
                      <span
                        key={example}
                        className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {(mode === 'intermediate' || mode === 'advanced') && activeCase.code && (
                  <div>
                    <h5 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Code Example
                    </h5>
                    <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs overflow-x-auto">
                      <code>{activeCase.code}</code>
                    </pre>
                  </div>
                )}
              </div>

              {mode === 'beginner' && activeCase.id === 'web' && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-dashed border-border">
                  <h5 className="font-medium text-sm text-foreground mb-2">Try it!</h5>
                  <Button
                    size="sm"
                    onClick={() => setDemoActive(!demoActive)}
                    className={cn(
                      'transition-all duration-300',
                      demoActive && 'bg-green-500 hover:bg-green-600'
                    )}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {demoActive ? 'Clicked! ✓' : 'Click Me'}
                  </Button>
                  {demoActive && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-green-600 dark:text-green-400"
                    >
                      That&apos;s JavaScript in action! 🎉
                    </motion.p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedCase && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          👆 Select a card above to learn more
        </div>
      )}
    </div>
  );
}

export default JsUseCaseExplorer;
