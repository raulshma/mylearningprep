'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  FileJson, 
  Key,
  Lock,
  Server,
  ArrowDown,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ConfigurationVisualizerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface ConfigSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  priority: number;
  description: string;
  example: string;
  color: string;
}

const configSources: ConfigSource[] = [
  {
    id: 'appsettings',
    name: 'appsettings.json',
    icon: <FileJson className="h-5 w-5" />,
    priority: 1,
    description: 'Base configuration stored in JSON file',
    example: '{\n  "ConnectionStrings": {\n    "Default": "Server=..."\n  },\n  "Logging": {\n    "LogLevel": "Information"\n  }\n}',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'appsettings-env',
    name: 'appsettings.{Environment}.json',
    icon: <Server className="h-5 w-5" />,
    priority: 2,
    description: 'Environment-specific overrides (Development, Production)',
    example: '// appsettings.Development.json\n{\n  "Logging": {\n    "LogLevel": "Debug"\n  }\n}',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'env-vars',
    name: 'Environment Variables',
    icon: <Key className="h-5 w-5" />,
    priority: 3,
    description: 'System environment variables (great for containers)',
    example: 'ASPNETCORE_ENVIRONMENT=Production\nConnectionStrings__Default="Server=prod..."',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'user-secrets',
    name: 'User Secrets',
    icon: <Lock className="h-5 w-5" />,
    priority: 4,
    description: 'Development-only secrets (never committed to git!)',
    example: '// Stored in %APPDATA%\\Microsoft\\UserSecrets\n{\n  "ApiKeys": {\n    "Stripe": "sk_test_abc123"\n  }\n}',
    color: 'from-purple-500 to-pink-500'
  }
];

export function ConfigurationVisualizer({
  mode = 'beginner',
  title = 'Configuration in ASP.NET Core'
}: ConfigurationVisualizerProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const selectedSourceData = configSources.find(s => s.id === selectedSource);

  return (
    <Card className="my-6 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-4 mb-6 border border-blue-500/20"
          >
            <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
              📱 Configuration is Like Your Phone&apos;s Settings App
            </h4>
            <p className="text-sm text-gray-300">
              Just like your phone has settings for volume, brightness, and WiFi, your ASP.NET Core app 
              has settings for database connections, API keys, and feature flags. These settings can come 
              from <strong>different places</strong> and override each other!
            </p>
          </motion.div>
        )}

        {/* Configuration Sources */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Configuration Sources (Click to explore)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configSources.map((source, index) => (
              <motion.button
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedSource(
                  selectedSource === source.id ? null : source.id
                )}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden",
                  selectedSource === source.id
                    ? "bg-gray-800 border-blue-500"
                    : "bg-gray-900/50 border-gray-700 hover:border-gray-600"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0",
                    source.color
                  )}>
                    {source.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white text-sm truncate">{source.name}</h4>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                        Priority {source.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{source.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Source Details */}
        <AnimatePresence mode="wait">
          {selectedSourceData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  {selectedSourceData.icon}
                  {selectedSourceData.name} Example
                </h4>
                <pre className="bg-gray-950 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                  <code className="text-gray-300">{selectedSourceData.example}</code>
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hierarchy Visualization */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHierarchy(!showHierarchy)}
          className="mb-4"
        >
          {showHierarchy ? 'Hide' : 'Show'} Override Hierarchy
        </Button>

        <AnimatePresence>
          {showHierarchy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-4">
                  ⬇️ Later sources override earlier ones
                </h4>
                
                <div className="space-y-2">
                  {configSources.map((source, index) => (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.15 }}
                    >
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        index === configSources.length - 1 
                          ? "bg-green-900/20 border-green-500/30" 
                          : "bg-gray-800/50 border-gray-700"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold",
                          source.color
                        )}>
                          {source.priority}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm text-white">{source.name}</span>
                        </div>
                        {index === configSources.length - 1 && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Wins
                          </span>
                        )}
                      </div>
                      {index < configSources.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    <strong>💡 Key Point:</strong> If the same setting exists in multiple places, 
                    the one with higher priority wins. User Secrets override everything else 
                    (but only in Development mode).
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options Pattern (Advanced) */}
        {mode === 'advanced' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-gray-900 rounded-xl p-4 border border-gray-700"
          >
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-400" />
              Options Pattern (Strongly-Typed Configuration)
            </h4>
            <pre className="bg-gray-950 rounded-lg p-4 text-xs font-mono overflow-x-auto mb-3">
              <code className="text-gray-300">{`// 1. Define options class
public class EmailSettings
{
    public string SmtpServer { get; set; }
    public int Port { get; set; }
}

// 2. Register in Program.cs
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("Email"));

// 3. Inject and use
public class EmailService
{
    private readonly EmailSettings _settings;
    
    public EmailService(IOptions<EmailSettings> options)
    {
        _settings = options.Value;
    }
}`}</code>
            </pre>
            <p className="text-xs text-gray-400">
              The Options pattern provides compile-time safety and IntelliSense for your configuration.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConfigurationVisualizer;
