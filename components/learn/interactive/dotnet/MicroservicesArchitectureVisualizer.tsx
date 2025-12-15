'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  Box, 
  Boxes, 
  Database, 
  Server, 
  Users, 
  ShoppingCart,
  CreditCard,
  Package,
  ArrowLeftRight,
  Building2,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MicroservicesArchitectureVisualizerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface ServiceNode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const microservices: ServiceNode[] = [
  { 
    id: 'users', 
    name: 'User Service', 
    icon: <Users className="h-5 w-5" />, 
    color: 'bg-blue-500 border-blue-400',
    description: 'Handles authentication & user profiles'
  },
  { 
    id: 'catalog', 
    name: 'Catalog Service', 
    icon: <Package className="h-5 w-5" />, 
    color: 'bg-green-500 border-green-400',
    description: 'Manages product listings & inventory'
  },
  { 
    id: 'orders', 
    name: 'Order Service', 
    icon: <ShoppingCart className="h-5 w-5" />, 
    color: 'bg-purple-500 border-purple-400',
    description: 'Processes and tracks orders'
  },
  { 
    id: 'payment', 
    name: 'Payment Service', 
    icon: <CreditCard className="h-5 w-5" />, 
    color: 'bg-orange-500 border-orange-400',
    description: 'Handles payment processing'
  },
];

export function MicroservicesArchitectureVisualizer({
  mode = 'beginner',
  title = 'Microservices Architecture',
}: MicroservicesArchitectureVisualizerProps) {
  const [viewMode, setViewMode] = useState<'monolith' | 'microservices'>('monolith');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const resetDemo = () => {
    setViewMode('monolith');
    setSelectedService(null);
    setIsAnimating(false);
  };

  const toggleView = async () => {
    setIsAnimating(true);
    setSelectedService(null);
    await new Promise(resolve => setTimeout(resolve, 300));
    setViewMode(prev => prev === 'monolith' ? 'microservices' : 'monolith');
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsAnimating(false);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-purple-400" />
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
        {mode === 'beginner' && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-200 mb-2">🏙️ City Planning Analogy</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-red-400 font-medium">Monolith</span>
                  <p className="text-gray-400">One giant skyscraper with everything inside. If the elevator breaks, everyone is stuck!</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-green-400 font-medium">Microservices</span>
                  <p className="text-gray-400">City blocks with specialized buildings. The bank can upgrade without affecting the hospital!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={toggleView}
            disabled={isAnimating}
            className={cn(
              'px-6 py-2 font-medium transition-all',
              viewMode === 'monolith' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            )}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Switch to {viewMode === 'monolith' ? 'Microservices' : 'Monolith'}
          </Button>
        </div>

        {/* Architecture Visualization */}
        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            {viewMode === 'monolith' ? (
              <motion.div
                key="monolith"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative">
                  {/* Monolith Box */}
                  <motion.div
                    className="bg-gradient-to-br from-red-900/50 to-red-950/50 border-2 border-red-500 rounded-xl p-6 min-w-[300px]"
                    animate={{ 
                      boxShadow: ['0 0 20px rgba(239,68,68,0.3)', '0 0 30px rgba(239,68,68,0.5)', '0 0 20px rgba(239,68,68,0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="text-center mb-4">
                      <Building2 className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <h3 className="text-lg font-bold text-red-300">Monolithic Application</h3>
                      <p className="text-xs text-gray-400">Everything in one codebase</p>
                    </div>

                    {/* Internal Modules */}
                    <div className="space-y-2">
                      {microservices.map((service, index) => (
                        <motion.div
                          key={service.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-2 bg-gray-800/50 rounded px-3 py-2"
                        >
                          <div className="text-gray-400">{service.icon}</div>
                          <span className="text-sm text-gray-300">{service.name.replace(' Service', ' Module')}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Single Database */}
                    <div className="mt-4 flex justify-center">
                      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2 border border-gray-600">
                        <Database className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm text-gray-300">Single Database</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Warning Labels */}
                  {mode !== 'beginner' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="absolute -right-4 -top-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full"
                    >
                      ⚠️ Tightly Coupled
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="microservices"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                {/* Microservices Grid */}
                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                  {microservices.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: index * 0.15,
                        type: 'spring',
                        stiffness: 200
                      }}
                      whileHover={{ scale: 1.05, zIndex: 10 }}
                      onClick={() => setSelectedService(
                        selectedService === service.id ? null : service.id
                      )}
                      className={cn(
                        'cursor-pointer rounded-xl p-4 border-2 transition-all',
                        service.color,
                        'bg-opacity-20 hover:bg-opacity-30',
                        selectedService === service.id && 'ring-2 ring-white ring-offset-2 ring-offset-gray-950'
                      )}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="text-white mb-2">{service.icon}</div>
                        <h4 className="text-sm font-medium text-white">{service.name}</h4>
                        
                        {/* Own Database */}
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-300">
                          <Database className="h-3 w-3" />
                          <span>Own DB</span>
                        </div>

                        {/* Description on selection */}
                        <AnimatePresence>
                          {selectedService === service.id && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs text-gray-300 mt-2"
                            >
                              {service.description}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Communication Lines (Advanced) */}
                {mode === 'advanced' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    <svg className="w-full h-full">
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                        </marker>
                      </defs>
                      {/* Simplified connection lines */}
                      <motion.line
                        x1="50%" y1="30%" x2="50%" y2="70%"
                        stroke="#6b7280"
                        strokeWidth="1"
                        strokeDasharray="4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1 }}
                      />
                    </svg>
                  </motion.div>
                )}

                {/* Benefits Labels */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-center gap-4 mt-6 flex-wrap"
                >
                  <span className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full">
                    ✓ Independent Deployment
                  </span>
                  <span className="text-xs bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full">
                    ✓ Technology Freedom
                  </span>
                  <span className="text-xs bg-purple-900/50 text-purple-400 px-3 py-1 rounded-full">
                    ✓ Scalable
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Intermediate/Advanced: Principles */}
        {mode !== 'beginner' && viewMode === 'microservices' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
          >
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="font-medium text-blue-400 mb-1">🎯 Single Responsibility</h5>
              <p className="text-gray-400 text-xs">Each service does one thing well</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="font-medium text-green-400 mb-1">🔒 Data Ownership</h5>
              <p className="text-gray-400 text-xs">Each service owns its data</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="font-medium text-purple-400 mb-1">📦 Bounded Context</h5>
              <p className="text-gray-400 text-xs">Clear boundaries between domains</p>
            </div>
          </motion.div>
        )}

        {/* Advanced: Code Example */}
        {mode === 'advanced' && viewMode === 'microservices' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto"
          >
            <div className="text-gray-500 mb-2">{"//"} Each microservice is a separate project</div>
            <pre className="text-gray-300">
{`src/
├── Services/
│   ├── UserService/
│   │   ├── UserService.API/
│   │   └── UserService.Domain/
│   ├── CatalogService/
│   │   ├── CatalogService.API/
│   │   └── CatalogService.Domain/
│   ├── OrderService/
│   └── PaymentService/
└── ApiGateway/`}
            </pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default MicroservicesArchitectureVisualizer;
