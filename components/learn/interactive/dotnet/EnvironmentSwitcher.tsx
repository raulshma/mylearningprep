'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Bug, 
  Rocket,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Shield,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EnvironmentSwitcherProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface Environment {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  features: { name: string; enabled: boolean; description: string }[];
  configExample: string;
}

const environments: Environment[] = [
  {
    id: 'development',
    name: 'Development',
    icon: <Bug className="h-6 w-6" />,
    color: 'text-green-400',
    bgColor: 'from-green-500 to-emerald-600',
    description: 'Local development on your machine',
    features: [
      { name: 'Developer Exception Page', enabled: true, description: 'Detailed error pages with stack traces' },
      { name: 'Hot Reload', enabled: true, description: 'See changes without restarting' },
      { name: 'Detailed Logging', enabled: true, description: 'Debug-level logs for troubleshooting' },
      { name: 'User Secrets', enabled: true, description: 'Local secrets not in source control' },
      { name: 'HTTPS Redirection', enabled: false, description: 'Optional for local dev' },
      { name: 'Response Caching', enabled: false, description: 'Disabled for fresh content' }
    ],
    configExample: `ASPNETCORE_ENVIRONMENT=Development

// launchSettings.json
{
  "profiles": {
    "MyApp": {
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}`
  },
  {
    id: 'staging',
    name: 'Staging',
    icon: <FlaskConical className="h-6 w-6" />,
    color: 'text-yellow-400',
    bgColor: 'from-yellow-500 to-orange-600',
    description: 'Testing environment (replica of production)',
    features: [
      { name: 'Developer Exception Page', enabled: false, description: 'Generic error pages shown' },
      { name: 'Hot Reload', enabled: false, description: 'Not available in published apps' },
      { name: 'Detailed Logging', enabled: true, description: 'Useful for debugging staging issues' },
      { name: 'User Secrets', enabled: false, description: 'Use env vars or vault instead' },
      { name: 'HTTPS Redirection', enabled: true, description: 'Should match production' },
      { name: 'Response Caching', enabled: true, description: 'Test caching behavior' }
    ],
    configExample: `ASPNETCORE_ENVIRONMENT=Staging

// appsettings.Staging.json
{
  "ConnectionStrings": {
    "Default": "Server=staging-db..."
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}`
  },
  {
    id: 'production',
    name: 'Production',
    icon: <Rocket className="h-6 w-6" />,
    color: 'text-red-400',
    bgColor: 'from-red-500 to-pink-600',
    description: 'Live environment serving real users',
    features: [
      { name: 'Developer Exception Page', enabled: false, description: 'Never show internals to users!' },
      { name: 'Hot Reload', enabled: false, description: 'Not available in published apps' },
      { name: 'Detailed Logging', enabled: false, description: 'Only warnings and errors' },
      { name: 'User Secrets', enabled: false, description: 'Use Azure Key Vault or similar' },
      { name: 'HTTPS Redirection', enabled: true, description: 'Security is mandatory' },
      { name: 'Response Caching', enabled: true, description: 'Optimize for performance' }
    ],
    configExample: `ASPNETCORE_ENVIRONMENT=Production

// appsettings.Production.json
{
  "ConnectionStrings": {
    "Default": "Server=prod-db..."
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning"
    }
  }
}`
  }
];

export function EnvironmentSwitcher({
  mode = 'beginner',
  title = 'ASP.NET Core Environments'
}: EnvironmentSwitcherProps) {
  const [selectedEnv, setSelectedEnv] = useState('development');

  const currentEnv = environments.find(e => e.id === selectedEnv)!;

  return (
    <Card className="my-6 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Server className="h-4 w-4 text-blue-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-4 mb-6 border border-green-500/20"
          >
            <h4 className="font-medium text-green-300 mb-2 flex items-center gap-2">
              🎭 Environments are Like Theater Rehearsals
            </h4>
            <p className="text-sm text-gray-300">
              Before a big show, actors have dress rehearsals. Similarly, your app has different 
              &quot;stages&quot;: <strong>Development</strong> (practice at home), <strong>Staging</strong> (dress rehearsal), 
              and <strong>Production</strong> (the real show with audience!). Each stage has different settings.
            </p>
          </motion.div>
        )}

        {/* Environment Selector */}
        <div className="flex justify-center gap-4 mb-6">
          {environments.map((env) => (
            <motion.button
              key={env.id}
              onClick={() => setSelectedEnv(env.id)}
              className={cn(
                "relative px-6 py-4 rounded-xl border-2 transition-all",
                selectedEnv === env.id
                  ? `bg-gradient-to-br ${env.bgColor} border-transparent shadow-lg scale-105`
                  : "bg-gray-900 border-gray-700 hover:border-gray-600"
              )}
              whileHover={{ scale: selectedEnv === env.id ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  selectedEnv === env.id ? "text-white" : env.color
                )}>
                  {env.icon}
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  selectedEnv === env.id ? "text-white" : "text-gray-300"
                )}>
                  {env.name}
                </span>
              </div>
              
              {selectedEnv === env.id && (
                <motion.div
                  layoutId="env-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Environment Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEnv.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Description */}
            <div className={cn(
              "p-4 rounded-xl mb-6 border",
              currentEnv.id === 'development' && "bg-green-900/20 border-green-500/30",
              currentEnv.id === 'staging' && "bg-yellow-900/20 border-yellow-500/30",
              currentEnv.id === 'production' && "bg-red-900/20 border-red-500/30"
            )}>
              <div className="flex items-center gap-3 mb-2">
                <div className={currentEnv.color}>{currentEnv.icon}</div>
                <h3 className="font-medium text-white">{currentEnv.name} Environment</h3>
              </div>
              <p className="text-sm text-gray-300">{currentEnv.description}</p>
            </div>

            {/* Features Grid */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Features in {currentEnv.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentEnv.features.map((feature, index) => (
                  <motion.div
                    key={feature.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      feature.enabled 
                        ? "bg-green-900/10 border-green-500/20" 
                        : "bg-gray-900/50 border-gray-700"
                    )}
                  >
                    <div className="mt-0.5">
                      {feature.enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          feature.enabled ? "text-white" : "text-gray-400"
                        )}>
                          {feature.name}
                        </span>
                        {feature.enabled ? (
                          <Eye className="h-3 w-3 text-green-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      {mode !== 'beginner' && (
                        <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Code Example (Intermediate/Advanced) */}
            {mode !== 'beginner' && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Setting the Environment
                </h4>
                <pre className="bg-gray-950 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <code className="text-gray-300">{currentEnv.configExample}</code>
                </pre>
              </div>
            )}

            {/* Program.cs Example (Advanced) */}
            {mode === 'advanced' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-700"
              >
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                  Checking Environment in Code
                </h4>
                <pre className="bg-gray-950 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <code className="text-gray-300">{`// Program.cs
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// Or inject IWebHostEnvironment
public class MyService
{
    public MyService(IWebHostEnvironment env)
    {
        if (env.IsProduction())
        {
            // Production-specific logic
        }
    }
}`}</code>
                </pre>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Warning for Production */}
        {selectedEnv === 'production' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30"
          >
            <p className="text-xs text-red-300 flex items-start gap-2">
              <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Security Tip:</strong> Never expose detailed errors, debug info, or developer 
                exception pages in production. This can reveal sensitive information about your app!
              </span>
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default EnvironmentSwitcher;
