'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Zap, 
  Code2, 
  Server, 
  Layers, 
  ArrowRight,
  CheckCircle2,
  Monitor,
  Apple,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AspNetCoreIntroVisualizerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  color: string;
}

const features: Feature[] = [
  {
    id: 'cross-platform',
    icon: <Globe className="h-6 w-6" />,
    title: 'Cross-Platform',
    description: 'Runs on Windows, Linux, and macOS',
    details: [
      'Deploy to any operating system',
      'Develop on your preferred platform',
      'Use Docker containers seamlessly',
      'Host on cloud or on-premises'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'high-performance',
    icon: <Zap className="h-6 w-6" />,
    title: 'High Performance',
    description: 'One of the fastest web frameworks available',
    details: [
      'Kestrel: blazing fast web server',
      'Async/await built into the core',
      'Minimal memory footprint',
      'Handles millions of requests'
    ],
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'open-source',
    icon: <Code2 className="h-6 w-6" />,
    title: 'Open Source',
    description: 'Community-driven with MIT license',
    details: [
      'Full source code on GitHub',
      'Community contributions welcome',
      'Transparent development process',
      'Free to use commercially'
    ],
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'unified',
    icon: <Layers className="h-6 w-6" />,
    title: 'Unified Framework',
    description: 'One framework for web, APIs, and real-time',
    details: [
      'Web APIs (REST, GraphQL)',
      'MVC websites with Razor',
      'Real-time with SignalR',
      'gRPC services'
    ],
    color: 'from-purple-500 to-pink-500'
  }
];

const platforms = [
  { name: 'Windows', icon: <Monitor className="h-8 w-8" />, color: 'text-blue-400' },
  { name: 'macOS', icon: <Apple className="h-8 w-8" />, color: 'text-gray-300' },
  { name: 'Linux', icon: <Terminal className="h-8 w-8" />, color: 'text-orange-400' },
];

export function AspNetCoreIntroVisualizer({
  mode = 'beginner',
  title = 'What is ASP.NET Core?'
}: AspNetCoreIntroVisualizerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showEvolution, setShowEvolution] = useState(false);

  const selectedFeatureData = features.find(f => f.id === selectedFeature);

  return (
    <Card className="my-6 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Server className="h-4 w-4 text-purple-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-4 mb-6 border border-purple-500/20"
          >
            <h4 className="font-medium text-purple-300 mb-2 flex items-center gap-2">
              🧰 Think of ASP.NET Core like a Universal Toolbox
            </h4>
            <p className="text-sm text-gray-300">
              Just like a Swiss Army knife works anywhere you take it, ASP.NET Core lets you build 
              web applications that run on <strong>any computer</strong> - Windows, Mac, or Linux. 
              It&apos;s Microsoft&apos;s modern, fast, and free tool for building websites and APIs!
            </p>
          </motion.div>
        )}

        {/* Cross-Platform Animation */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
            Runs Everywhere
          </h3>
          <div className="flex items-center justify-center gap-4">
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.div
                  className={cn(
                    "w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center",
                    platform.color
                  )}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {platform.icon}
                </motion.div>
                <span className="text-xs text-gray-400">{platform.name}</span>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            className="flex justify-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-full border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-400">Same code runs on all platforms!</span>
            </div>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {features.map((feature, index) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedFeature(
                selectedFeature === feature.id ? null : feature.id
              )}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                selectedFeature === feature.id
                  ? "bg-gray-800 border-purple-500 scale-105"
                  : "bg-gray-900/50 border-gray-700 hover:border-gray-600"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 text-white",
                feature.color
              )}>
                {feature.icon}
              </div>
              <h4 className="font-medium text-white text-sm mb-1">{feature.title}</h4>
              <p className="text-xs text-gray-400">{feature.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Feature Details */}
        <AnimatePresence mode="wait">
          {selectedFeatureData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "p-4 rounded-xl bg-gradient-to-br border",
                `${selectedFeatureData.color.replace(' to-', '/20 to-')}/10`,
                "border-gray-700"
              )}>
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  {selectedFeatureData.icon}
                  {selectedFeatureData.title} Details
                </h4>
                <ul className="space-y-2">
                  {selectedFeatureData.details.map((detail, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
                      <ArrowRight className="h-3 w-3 text-purple-400" />
                      {detail}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Framework Evolution (Intermediate/Advanced) */}
        {mode !== 'beginner' && (
          <div className="mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEvolution(!showEvolution)}
              className="mb-4"
            >
              {showEvolution ? 'Hide' : 'Show'} Framework Evolution
            </Button>

            <AnimatePresence>
              {showEvolution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-gray-300">ASP.NET (2002-2016)</span>
                      </div>
                      <p className="text-xs text-gray-500">Windows-only, System.Web dependency, IIS hosting required</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-gray-300">ASP.NET Core (2016+)</span>
                      </div>
                      <p className="text-xs text-gray-500">Cross-platform, modular, high-performance, cloud-ready</p>
                    </div>
                  </div>

                  {mode === 'advanced' && (
                    <div className="bg-gray-900 rounded-lg p-4 mt-4">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Architecture Highlights
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-purple-400">Kestrel:</span>
                          <span className="text-gray-400 ml-2">Cross-platform web server</span>
                        </div>
                        <div>
                          <span className="text-purple-400">DI Container:</span>
                          <span className="text-gray-400 ml-2">Built-in dependency injection</span>
                        </div>
                        <div>
                          <span className="text-purple-400">Middleware:</span>
                          <span className="text-gray-400 ml-2">Composable request pipeline</span>
                        </div>
                        <div>
                          <span className="text-purple-400">Configuration:</span>
                          <span className="text-gray-400 ml-2">Multiple providers (JSON, env, secrets)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AspNetCoreIntroVisualizer;
