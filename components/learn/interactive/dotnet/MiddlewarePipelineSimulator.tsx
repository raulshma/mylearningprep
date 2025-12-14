'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, ArrowDown, Server, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MiddlewareItem {
  name: string;
  description: string;
  color?: string;
}

export interface MiddlewarePipelineSimulatorProps {
  middleware?: MiddlewareItem[];
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

const defaultMiddleware: MiddlewareItem[] = [
  { name: 'Exception Handler', description: 'Catches unhandled exceptions', color: 'bg-red-500' },
  { name: 'HTTPS Redirection', description: 'Redirects HTTP to HTTPS', color: 'bg-yellow-500' },
  { name: 'Static Files', description: 'Serves static content', color: 'bg-green-500' },
  { name: 'Routing', description: 'Matches URL to endpoint', color: 'bg-blue-500' },
  { name: 'Authentication', description: 'Validates identity', color: 'bg-purple-500' },
  { name: 'Authorization', description: 'Checks permissions', color: 'bg-pink-500' },
  { name: 'Endpoint', description: 'Executes the handler', color: 'bg-cyan-500' },
];

type RequestPhase = 'idle' | 'request' | 'processing' | 'response';

export function MiddlewarePipelineSimulator({
  middleware = defaultMiddleware,
  mode = 'beginner',
  title = 'ASP.NET Core Request Pipeline',
}: MiddlewarePipelineSimulatorProps) {
  const [phase, setPhase] = useState<RequestPhase>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isReturning, setIsReturning] = useState(false);
  const [requestUrl, setRequestUrl] = useState('/api/users');
  const [isAnimating, setIsAnimating] = useState(false);

  const resetDemo = () => {
    setPhase('idle');
    setCurrentIndex(-1);
    setIsReturning(false);
    setIsAnimating(false);
  };

  const startRequest = async () => {
    setIsAnimating(true);
    setPhase('request');
    setCurrentIndex(-1);
    setIsReturning(false);

    // Forward pass through middleware
    for (let i = 0; i < middleware.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setCurrentIndex(i);
    }

    // Response phase
    await new Promise(resolve => setTimeout(resolve, 400));
    setPhase('response');
    setIsReturning(true);

    // Return pass through middleware
    for (let i = middleware.length - 1; i >= 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setCurrentIndex(i);
    }

    await new Promise(resolve => setTimeout(resolve, 400));
    setCurrentIndex(-1);
    setIsAnimating(false);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-400" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Beginner Analogy */}
        {mode === 'beginner' && phase === 'idle' && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-200 mb-2">🏭 Think of Middleware like an Assembly Line</h4>
            <p className="text-sm text-gray-400">
              Each worker (middleware) on the line can inspect, modify, or reject the product (request).
              The request passes through each station in order, then the response comes back through in reverse!
            </p>
          </div>
        )}

        {/* Request URL Input */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">Request:</span>
            <code className="bg-gray-800 px-2 py-1 rounded text-cyan-400 text-xs">
              GET {requestUrl}
            </code>
          </div>
          
          {phase === 'idle' && (
            <Button
              size="sm"
              onClick={startRequest}
              disabled={isAnimating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-1" />
              Send Request
            </Button>
          )}
        </div>

        {/* Pipeline Visualization */}
        <div className="relative">
          {/* Request indicator */}
          <AnimatePresence>
            {phase !== 'idle' && currentIndex === -1 && !isReturning && (
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -left-2 top-0 flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-gray-400">Incoming Request</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Middleware Pipeline */}
          <div className="ml-12 space-y-2">
            {middleware.map((mw, index) => {
              const isActive = currentIndex === index;
              const isPassed = isReturning ? index > currentIndex : index < currentIndex;
              
              return (
                <motion.div
                  key={mw.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-300',
                    isActive && !isReturning && 'scale-105 shadow-lg',
                    isActive && isReturning && 'scale-105 shadow-lg ring-2 ring-green-400',
                    isPassed && !isReturning && 'opacity-50',
                    isPassed && isReturning && 'opacity-100',
                    !isActive && !isPassed && 'opacity-70',
                    mw.color || 'bg-gray-800',
                    'border-gray-700'
                  )}
                  animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                >
                  {/* Direction indicator */}
                  <div className="w-6 flex justify-center">
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'w-4 h-4 rounded-full',
                          isReturning ? 'bg-green-400' : 'bg-blue-400'
                        )}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="w-full h-full rounded-full bg-inherit"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Middleware info */}
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{mw.name}</div>
                    {mode !== 'beginner' && (
                      <div className="text-xs text-gray-300">{mw.description}</div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-xs">
                    {isActive && !isReturning && (
                      <span className="text-blue-300">Processing →</span>
                    )}
                    {isActive && isReturning && (
                      <span className="text-green-300">← Returning</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Response indicator */}
          <AnimatePresence>
            {isReturning && currentIndex === -1 && (
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center justify-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-green-400">Response: 200 OK</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Code Example for Advanced Mode */}
        {mode === 'advanced' && (
          <div className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs">
            <pre className="text-gray-300">
              <span className="text-gray-500">// Program.cs - Middleware Order Matters!</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseExceptionHandler</span>
              <span className="text-gray-400">(</span>
              <span className="text-amber-400">&quot;/Error&quot;</span>
              <span className="text-gray-400">);</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseHttpsRedirection</span>
              <span className="text-gray-400">();</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseStaticFiles</span>
              <span className="text-gray-400">();</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseRouting</span>
              <span className="text-gray-400">();</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseAuthentication</span>
              <span className="text-gray-400">();</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">UseAuthorization</span>
              <span className="text-gray-400">();</span>
              {'\n'}
              <span className="text-purple-400">app</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">MapControllers</span>
              <span className="text-gray-400">();</span>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MiddlewarePipelineSimulator;
