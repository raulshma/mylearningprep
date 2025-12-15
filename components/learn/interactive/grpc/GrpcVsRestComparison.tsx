'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, FileCode, Code2, Binary, MessageSquare } from 'lucide-react';

interface ComparisonMetric {
  name: string;
  grpc: string;
  rest: string;
  winner: 'grpc' | 'rest' | 'tie';
}

const metrics: ComparisonMetric[] = [
  {
    name: 'Data Format',
    grpc: 'Binary (Protobuf)',
    rest: 'Text (JSON/XML)',
    winner: 'grpc',
  },
  {
    name: 'Performance',
    grpc: '7-10x faster',
    rest: 'Slower (parsing overhead)',
    winner: 'grpc',
  },
  {
    name: 'Browser Support',
    grpc: 'Limited (needs gRPC-Web)',
    rest: 'Universal',
    winner: 'rest',
  },
  {
    name: 'Payload Size',
    grpc: '30-50% smaller',
    rest: 'Larger (verbose JSON)',
    winner: 'grpc',
  },
  {
    name: 'API Contract',
    grpc: 'Strict (.proto schema)',
    rest: 'Flexible (OpenAPI optional)',
    winner: 'tie',
  },
  {
    name: 'Streaming',
    grpc: 'Built-in (bidirectional)',
    rest: 'Limited (Server-Sent Events)',
    winner: 'grpc',
  },
  {
    name: 'Learning Curve',
    grpc: 'Steeper',
    rest: 'Gentle',
    winner: 'rest',
  },
  {
    name: 'Debugging',
    grpc: 'Harder (binary data)',
    rest: 'Easier (readable JSON)',
    winner: 'rest',
  },
];

export function GrpcVsRestComparison() {
  const [selectedMode, setSelectedMode] = useState<'overview' | 'details'>('overview');

  const grpcWins = metrics.filter((m) => m.winner === 'grpc').length;
  const restWins = metrics.filter((m) => m.winner === 'rest').length;

  return (
    <Card className="p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          gRPC vs REST API Comparison
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedMode === 'overview' ? 'default' : 'outline'}
            onClick={() => setSelectedMode('overview')}
          >
            Overview
          </Button>
          <Button
            size="sm"
            variant={selectedMode === 'details' ? 'default' : 'outline'}
            onClick={() => setSelectedMode('details')}
          >
            Detailed
          </Button>
        </div>
      </div>

      {selectedMode === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Binary className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">gRPC</h4>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                High-performance RPC framework using HTTP/2 and Protocol Buffers
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100">
                  ✓ {grpcWins} advantages
                </Badge>
                <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• Extremely fast & efficient</li>
                  <li>• Strong typing with schemas</li>
                  <li>• Built-in streaming support</li>
                  <li>• Ideal for microservices</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">REST API</h4>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                Traditional web API using HTTP/1.1 and JSON for communication
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-100">
                  ✓ {restWins} advantages
                </Badge>
                <ul className="text-xs space-y-1 text-green-700 dark:text-green-300">
                  <li>• Universal browser support</li>
                  <li>• Human-readable JSON</li>
                  <li>• Easier debugging</li>
                  <li>• Mature ecosystem</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>When to use gRPC:</strong> Internal microservices, real-time systems, mobile backends, low-latency requirements
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              <strong>When to use REST:</strong> Public APIs, browser clients, simple CRUD operations, legacy system integration
            </p>
          </div>
        </div>
      )}

      {selectedMode === 'details' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Metric</th>
                <th className="text-left p-3 font-semibold text-blue-600">gRPC</th>
                <th className="text-left p-3 font-semibold text-green-600">REST</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="p-3 font-medium">{metric.name}</td>
                  <td
                    className={`p-3 ${
                      metric.winner === 'grpc'
                        ? 'bg-blue-50 dark:bg-blue-950/20 font-semibold text-blue-900 dark:text-blue-100'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {metric.grpc}
                  </td>
                  <td
                    className={`p-3 ${
                      metric.winner === 'rest'
                        ? 'bg-green-50 dark:bg-green-950/20 font-semibold text-green-900 dark:text-green-100'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {metric.rest}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
