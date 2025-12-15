'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Server, Smartphone, Radio } from 'lucide-react';

type StreamingPattern = 'unary' | 'server' | 'client' | 'bidirectional';

interface PatternInfo {
  name: string;
  description: string;
  useCases: string[];
  icon: string;
  color: string;
}

const patterns: Record<StreamingPattern, PatternInfo> = {
  unary: {
    name: 'Unary RPC',
    description: 'Traditional request-response pattern',
    useCases: ['User authentication', 'CRUD operations', 'Simple queries', 'Form submissions'],
    icon: '→',
    color: 'blue',
  },
  server: {
    name: 'Server Streaming',
    description: 'Server sends multiple messages for one request',
    useCases: ['Live stock prices', 'Log streaming', 'File downloads', 'Real-time notifications'],
    icon: '→→→',
    color: 'green',
  },
  client: {
    name: 'Client Streaming',
    description: 'Client sends multiple messages, server responds once',
    useCases: ['File uploads', 'Sensor data batching', 'Metrics collection', 'Bulk inserts'],
    icon: '<<<',
    color: 'purple',
  },
  bidirectional: {
    name: 'Bidirectional Streaming',
    description: 'Both client and server stream messages independently',
    useCases: ['Chat applications', 'Multiplayer games', 'Collaborative editing', 'Video calls'],
    icon: '⟷',
    color: 'orange',
  },
};

export function StreamingPatternVisualizer() {
  const [pattern, setPattern] = useState<StreamingPattern>('unary');
  const [animating, setAnimating] = useState(false);
  const currentPattern = patterns[pattern];

  const animate = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 3000);
  };

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-50 dark:bg-${color}-950/20`,
    border: `border-${color}-200 dark:border-${color}-800`,
    text: `text-${color}-900 dark:text-${color}-100`,
    badge: `bg-${color}-100 dark:bg-${color}-900`,
  });

  return (
    <Card className="p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Radio className="w-5 h-5 text-indigo-500" />
          gRPC Streaming Patterns
        </h3>
        <Button onClick={animate} variant="outline" size="sm">
          Animate
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {(Object.keys(patterns) as StreamingPattern[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={pattern === p ? 'default' : 'outline'}
            onClick={() => setPattern(p)}
            className="flex flex-col items-center h-auto py-3"
          >
            <span className="text-lg mb-1">{patterns[p].icon}</span>
            <span className="text-xs">{patterns[p].name}</span>
          </Button>
        ))}
      </div>

      <div className="mb-6">
        {pattern === 'unary' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">Client</span>
              </div>
              <div
                className={`mt-3 p-3 bg-white dark:bg-gray-900 rounded transition-all ${
                  animating ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                → Single Request
              </div>
            </div>
            <ArrowRight
              className={`w-8 h-8 text-blue-500 transition-transform duration-500 ${animating ? 'translate-x-2' : ''}`}
            />
            <div className="flex-1 p-4 border-2 border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">Server</span>
              </div>
              <div
                className={`mt-3 p-3 bg-white dark:bg-gray-900 rounded transition-all ${
                  animating ? 'ring-2 ring-green-500 delay-500' : ''
                }`}
              >
                ← Single Response
              </div>
            </div>
          </div>
        )}

        {pattern === 'server' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">Client</span>
              </div>
              <div
                className={`mt-3 p-3 bg-white dark:bg-gray-900 rounded transition-all ${
                  animating ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                → Single Request
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ArrowRight
                className={`w-8 h-8 text-blue-500 transition-transform duration-500 ${animating ? 'translate-x-2' : ''}`}
              />
              <ArrowRight
                className={`w-8 h-8 text-green-500 rotate-180 transition-transform duration-500 ${
                  animating ? '-translate-x-2 delay-700' : ''
                }`}
              />
              <ArrowRight
                className={`w-8 h-8 text-green-500 rotate-180 transition-transform duration-500 ${
                  animating ? '-translate-x-2 delay-1000' : ''
                }`}
              />
              <ArrowRight
                className={`w-8 h-8 text-green-500 rotate-180 transition-transform duration-500 ${
                  animating ? '-translate-x-2 delay-1300' : ''
                }`}
              />
            </div>
            <div className="flex-1 p-4 border-2 border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">Server</span>
              </div>
              <div className="space-y-2 mt-3">
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-700' : ''
                  }`}
                >
                  ← Response 1
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-1000' : ''
                  }`}
                >
                  ← Response 2
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-1300' : ''
                  }`}
                >
                  ← Response 3...
                </div>
              </div>
            </div>
          </div>
        )}

        {pattern === 'client' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">Client</span>
              </div>
              <div className="space-y-2 mt-3">
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  → Request 1
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500 delay-300' : ''
                  }`}
                >
                  → Request 2
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500 delay-600' : ''
                  }`}
                >
                  → Request 3...
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ArrowRight
                className={`w-8 h-8 text-blue-500 transition-transform duration-500 ${animating ? 'translate-x-2' : ''}`}
              />
              <ArrowRight
                className={`w-8 h-8 text-blue-500 transition-transform duration-500 ${
                  animating ? 'translate-x-2 delay-300' : ''
                }`}
              />
              <ArrowRight
                className={`w-8 h-8 text-blue-500 transition-transform duration-500 ${
                  animating ? 'translate-x-2 delay-600' : ''
                }`}
              />
              <ArrowRight
                className={`w-8 h-8 text-green-500 rotate-180 transition-transform duration-500 ${
                  animating ? '-translate-x-2 delay-1200' : ''
                }`}
              />
            </div>
            <div className="flex-1 p-4 border-2 border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">Server</span>
              </div>
              <div
                className={`mt-3 p-3 bg-white dark:bg-gray-900 rounded transition-all ${
                  animating ? 'ring-2 ring-green-500 delay-1200' : ''
                }`}
              >
                ← Final Response
              </div>
            </div>
          </div>
        )}

        {pattern === 'bidirectional' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">Client</span>
              </div>
              <div className="space-y-2 mt-3">
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  → Request 1
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-500' : ''
                  }`}
                >
                  ← Response A
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500 delay-800' : ''
                  }`}
                >
                  → Request 2
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-1200' : ''
                  }`}
                >
                  ← Response B...
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-orange-500">⟷</div>
              <div className="text-xs text-center text-gray-600">Independent<br />Streams</div>
            </div>
            <div className="flex-1 p-4 border-2 border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900 dark:text-green-100">Server</span>
              </div>
              <div className="space-y-2 mt-3">
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500 delay-200' : ''
                  }`}
                >
                  Receive Request 1
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-500' : ''
                  }`}
                >
                  Send Response A
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-blue-500 delay-900' : ''
                  }`}
                >
                  Receive Request 2
                </div>
                <div
                  className={`p-2 bg-white dark:bg-gray-900 rounded text-sm transition-all ${
                    animating ? 'ring-2 ring-green-500 delay-1200' : ''
                  }`}
                >
                  Send Response B...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        <h4 className="font-semibold mb-2">{currentPattern.name}</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{currentPattern.description}</p>
        <div>
          <div className="text-sm font-semibold mb-2">Common Use Cases:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {currentPattern.useCases.map((useCase, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
                <span>{useCase}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
