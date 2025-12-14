'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Box, ArrowRight, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ServiceLifetime = 'Singleton' | 'Scoped' | 'Transient';

export interface Service {
  name: string;
  lifetime: ServiceLifetime;
  dependencies?: string[];
}

export interface DependencyInjectionVisualizerProps {
  services?: Service[];
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

const lifetimeColors: Record<ServiceLifetime, string> = {
  Singleton: 'bg-purple-500 border-purple-400',
  Scoped: 'bg-blue-500 border-blue-400',
  Transient: 'bg-green-500 border-green-400',
};

const lifetimeIcons: Record<ServiceLifetime, React.ReactNode> = {
  Singleton: <Circle className="h-3 w-3 fill-current" />,
  Scoped: <Box className="h-3 w-3" />,
  Transient: <ArrowRight className="h-3 w-3" />,
};

const lifetimeDescriptions: Record<ServiceLifetime, string> = {
  Singleton: 'One instance for the entire application lifetime',
  Scoped: 'One instance per request/scope',
  Transient: 'New instance every time it\'s requested',
};

const defaultServices: Service[] = [
  { name: 'ILogger', lifetime: 'Singleton' },
  { name: 'DbContext', lifetime: 'Scoped', dependencies: ['ILogger'] },
  { name: 'IUserRepository', lifetime: 'Scoped', dependencies: ['DbContext'] },
  { name: 'IEmailService', lifetime: 'Transient', dependencies: ['ILogger'] },
  { name: 'UserController', lifetime: 'Scoped', dependencies: ['IUserRepository', 'IEmailService'] },
];

export function DependencyInjectionVisualizer({
  services = defaultServices,
  mode = 'beginner',
  title = 'Dependency Injection Container',
}: DependencyInjectionVisualizerProps) {
  const [registeredServices, setRegisteredServices] = useState<Service[]>([]);
  const [resolvedService, setResolvedService] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState(0);
  const [requestCount, setRequestCount] = useState(1);
  const [instanceCounts, setInstanceCounts] = useState<Record<string, number>>({});

  const resetDemo = () => {
    setRegisteredServices([]);
    setResolvedService(null);
    setIsAnimating(false);
    setStep(0);
    setRequestCount(1);
    setInstanceCounts({});
  };

  const startRegistration = async () => {
    setIsAnimating(true);
    setStep(1);
    
    // Animate service registration one by one
    for (let i = 0; i < services.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRegisteredServices(prev => [...prev, services[i]]);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setStep(2);
    setIsAnimating(false);
  };

  const resolveServices = async () => {
    setIsAnimating(true);
    setStep(3);
    
    // Simulate resolving the controller
    const controller = services.find(s => s.name === 'UserController');
    if (controller) {
      setResolvedService(controller.name);
      
      // Update instance counts based on lifetime
      const newCounts = { ...instanceCounts };
      
      const resolveDeps = (service: Service) => {
        if (service.lifetime === 'Transient') {
          newCounts[service.name] = (newCounts[service.name] || 0) + 1;
        } else if (service.lifetime === 'Scoped') {
          if (!newCounts[service.name]) {
            newCounts[service.name] = 1;
          }
        } else {
          // Singleton - only one ever
          newCounts[service.name] = 1;
        }
        
        service.dependencies?.forEach(depName => {
          const dep = services.find(s => s.name === depName);
          if (dep) resolveDeps(dep);
        });
      };
      
      resolveDeps(controller);
      setInstanceCounts(newCounts);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsAnimating(false);
  };

  const simulateNewRequest = () => {
    setRequestCount(prev => prev + 1);
    
    const newCounts = { ...instanceCounts };
    
    services.forEach(service => {
      if (service.lifetime === 'Transient') {
        newCounts[service.name] = (newCounts[service.name] || 0) + 1;
      } else if (service.lifetime === 'Scoped') {
        newCounts[service.name] = (newCounts[service.name] || 0) + 1;
      }
      // Singleton stays the same
    });
    
    setInstanceCounts(newCounts);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Box className="h-4 w-4 text-blue-400" />
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
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {(['Singleton', 'Scoped', 'Transient'] as ServiceLifetime[]).map(lifetime => (
            <div key={lifetime} className="flex items-center gap-2">
              <div className={cn(
                'w-4 h-4 rounded border-2',
                lifetimeColors[lifetime]
              )} />
              <span className="text-gray-400">{lifetime}</span>
              {mode !== 'beginner' && (
                <span className="text-gray-600">
                  ({lifetimeDescriptions[lifetime]})
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Beginner Mode - Analogy */}
        {mode === 'beginner' && step === 0 && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-200 mb-2">🏪 Think of DI like a Restaurant Kitchen</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li><span className="text-purple-400">Singleton</span> = The head chef (only one, shared by everyone)</li>
              <li><span className="text-blue-400">Scoped</span> = Your table&apos;s waiter (one per customer group)</li>
              <li><span className="text-green-400">Transient</span> = Napkins (fresh one for every use)</li>
            </ul>
          </div>
        )}

        {/* Main Visualization */}
        <div className="space-y-4">
          {/* Step 1: Registration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">
                1. Service Registration (Startup)
              </h4>
              {step === 0 && (
                <Button
                  size="sm"
                  onClick={startRegistration}
                  disabled={isAnimating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Register Services
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <AnimatePresence>
                {registeredServices.map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'p-2 rounded-lg border-2 text-center',
                      lifetimeColors[service.lifetime],
                      'bg-opacity-20'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1 text-white text-xs">
                      {lifetimeIcons[service.lifetime]}
                      <span className="truncate">{service.name}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2: Resolution */}
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300">
                  2. Dependency Resolution (Runtime)
                </h4>
                {step === 2 && (
                  <Button
                    size="sm"
                    onClick={resolveServices}
                    disabled={isAnimating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resolve Controller
                  </Button>
                )}
              </div>

              {step >= 3 && (
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    Request #{requestCount} - Resolving UserController
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    {services.map(service => (
                      <motion.div
                        key={service.name}
                        initial={{ scale: 0.8 }}
                        animate={{ 
                          scale: resolvedService ? 1 : 0.8,
                          opacity: resolvedService ? 1 : 0.5
                        }}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs text-white',
                          lifetimeColors[service.lifetime]
                        )}
                      >
                        {service.name}
                        {instanceCounts[service.name] && (
                          <span className="ml-1 bg-black/30 px-1 rounded">
                            ×{instanceCounts[service.name]}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {mode !== 'beginner' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={simulateNewRequest}
                      className="mt-4"
                    >
                      Simulate New Request
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Code Example for Advanced Mode */}
        {mode === 'advanced' && step >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs"
          >
            <pre className="text-gray-300">
              <span className="text-gray-500">// Program.cs</span>
              {'\n'}
              <span className="text-purple-400">builder</span>
              <span className="text-gray-400">.</span>
              <span className="text-cyan-400">Services</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">AddSingleton</span>
              <span className="text-gray-400">&lt;</span>
              <span className="text-cyan-400">ILogger</span>
              <span className="text-gray-400">, </span>
              <span className="text-cyan-400">Logger</span>
              <span className="text-gray-400">&gt;();</span>
              {'\n'}
              <span className="text-purple-400">builder</span>
              <span className="text-gray-400">.</span>
              <span className="text-cyan-400">Services</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">AddScoped</span>
              <span className="text-gray-400">&lt;</span>
              <span className="text-cyan-400">DbContext</span>
              <span className="text-gray-400">&gt;();</span>
              {'\n'}
              <span className="text-purple-400">builder</span>
              <span className="text-gray-400">.</span>
              <span className="text-cyan-400">Services</span>
              <span className="text-gray-400">.</span>
              <span className="text-yellow-400">AddTransient</span>
              <span className="text-gray-400">&lt;</span>
              <span className="text-cyan-400">IEmailService</span>
              <span className="text-gray-400">, </span>
              <span className="text-cyan-400">EmailService</span>
              <span className="text-gray-400">&gt;();</span>
            </pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default DependencyInjectionVisualizer;
