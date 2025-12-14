'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen,
  FileCode2, 
  FileJson, 
  FileCog,
  FileText,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ProjectStructureExplorerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  template?: 'webapi' | 'mvc' | 'minimal';
  title?: string;
}

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  description: string;
  details?: string;
  icon?: 'code' | 'json' | 'cog' | 'text';
  importance?: 'critical' | 'important' | 'optional';
  children?: FileNode[];
}

const getFileIcon = (icon?: string) => {
  switch (icon) {
    case 'code':
      return <FileCode2 className="h-4 w-4 text-purple-400" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-400" />;
    case 'cog':
      return <FileCog className="h-4 w-4 text-blue-400" />;
    case 'text':
      return <FileText className="h-4 w-4 text-gray-400" />;
    default:
      return <FileCode2 className="h-4 w-4 text-gray-400" />;
  }
};

const webApiStructure: FileNode[] = [
  {
    name: 'MyWebApi',
    type: 'folder',
    description: 'Root project folder',
    children: [
      {
        name: 'Controllers',
        type: 'folder',
        description: 'API endpoint handlers',
        details: 'Controllers handle incoming HTTP requests and return responses. Each controller typically manages one resource (like Users, Products, etc.).',
        children: [
          {
            name: 'WeatherForecastController.cs',
            type: 'file',
            icon: 'code',
            description: 'Sample API controller',
            details: 'A demo controller that comes with the template. Shows how to create API endpoints with attributes like [HttpGet] and [Route].',
            importance: 'important'
          }
        ]
      },
      {
        name: 'Properties',
        type: 'folder',
        description: 'Project properties',
        children: [
          {
            name: 'launchSettings.json',
            type: 'file',
            icon: 'json',
            description: 'Debug/launch configuration',
            details: 'Configures how the app runs during development - ports, environment variables, and launch profiles for different scenarios.',
            importance: 'optional'
          }
        ]
      },
      {
        name: 'appsettings.json',
        type: 'file',
        icon: 'json',
        description: 'Main configuration file',
        details: 'The primary configuration file. Store connection strings, API keys (use secrets in production!), feature flags, and any settings your app needs.',
        importance: 'critical'
      },
      {
        name: 'appsettings.Development.json',
        type: 'file',
        icon: 'json',
        description: 'Development-specific settings',
        details: 'Settings that only apply when running in Development mode. Overrides values from appsettings.json for local development.',
        importance: 'important'
      },
      {
        name: 'Program.cs',
        type: 'file',
        icon: 'code',
        description: 'Application entry point',
        details: 'The main entry point! Configures services, middleware pipeline, and starts the web server. This is where your app "boots up".',
        importance: 'critical'
      },
      {
        name: 'MyWebApi.csproj',
        type: 'file',
        icon: 'cog',
        description: 'Project file (dependencies)',
        details: 'Defines the project: target framework (.NET version), NuGet packages, and build settings. Like a package.json for .NET.',
        importance: 'important'
      },
      {
        name: 'WeatherForecast.cs',
        type: 'file',
        icon: 'code',
        description: 'Sample model class',
        details: 'A simple C# class (POCO) representing data. Models define the shape of your data - what gets sent in API responses.',
        importance: 'optional'
      }
    ]
  }
];

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  onSelect: (node: FileNode) => void;
  selectedNode: FileNode | null;
  mode: 'beginner' | 'intermediate' | 'advanced';
}

function TreeNode({ node, depth, onSelect, selectedNode, mode }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const isFolder = node.type === 'folder';
  const isSelected = selectedNode?.name === node.name;
  
  const showNode = mode === 'advanced' || node.importance !== 'optional' || depth < 2;
  
  if (!showNode && mode === 'beginner') return null;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors",
          isSelected ? "bg-purple-900/40 border border-purple-500/50" : "hover:bg-gray-800",
          node.importance === 'critical' && "border-l-2 border-l-green-500"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            setIsExpanded(!isExpanded);
          }
          onSelect(node);
        }}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-yellow-500" />
            ) : (
              <Folder className="h-4 w-4 text-yellow-600" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            {getFileIcon(node.icon)}
          </>
        )}
        <span className={cn(
          "text-sm",
          isFolder ? "text-gray-200 font-medium" : "text-gray-300"
        )}>
          {node.name}
        </span>
        {node.importance === 'critical' && mode === 'beginner' && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded">
            Key File
          </span>
        )}
      </motion.div>
      
      <AnimatePresence>
        {isFolder && isExpanded && node.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedNode={selectedNode}
                mode={mode}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProjectStructureExplorer({
  mode = 'beginner',
  title = 'ASP.NET Core Project Structure'
}: ProjectStructureExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);

  return (
    <Card className="my-6 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Folder className="h-4 w-4 text-yellow-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-b border-gray-800">
            <h4 className="font-medium text-yellow-300 mb-2 flex items-center gap-2">
              🏠 Think of Project Structure like a Well-Organized House
            </h4>
            <p className="text-sm text-gray-300">
              Just like your home has specific rooms for different purposes (kitchen for cooking, bedroom for sleeping), 
              an ASP.NET Core project has <strong>folders and files</strong> for different jobs. 
              Click on any file to learn what it does!
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row min-h-[300px]">
          {/* File Tree */}
          <div className="flex-1 p-4 border-r border-gray-800 overflow-auto">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Explorer
            </div>
            {webApiStructure.map((node) => (
              <TreeNode
                key={node.name}
                node={node}
                depth={0}
                onSelect={setSelectedNode}
                selectedNode={selectedNode}
                mode={mode}
              />
            ))}
          </div>

          {/* Details Panel */}
          <div className="w-full lg:w-80 p-4 bg-gray-900/30">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    {selectedNode.type === 'folder' ? (
                      <FolderOpen className="h-8 w-8 text-yellow-500" />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getFileIcon(selectedNode.icon)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-white">{selectedNode.name}</h3>
                      <p className="text-xs text-gray-400">
                        {selectedNode.type === 'folder' ? 'Folder' : 'File'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                        Purpose
                      </h4>
                      <p className="text-sm text-gray-300">{selectedNode.description}</p>
                    </div>

                    {selectedNode.details && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                          Details
                        </h4>
                        <p className="text-sm text-gray-300">{selectedNode.details}</p>
                      </div>
                    )}

                    {selectedNode.importance && (
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-xs",
                        selectedNode.importance === 'critical' && "bg-green-900/30 text-green-400 border border-green-500/30",
                        selectedNode.importance === 'important' && "bg-blue-900/30 text-blue-400 border border-blue-500/30",
                        selectedNode.importance === 'optional' && "bg-gray-800 text-gray-400"
                      )}>
                        {selectedNode.importance === 'critical' && "🌟 This is one of the most important files!"}
                        {selectedNode.importance === 'important' && "📌 Good to understand this file."}
                        {selectedNode.importance === 'optional' && "💡 Nice to know, but not essential to start."}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center text-gray-500"
                >
                  <Info className="h-8 w-8 mb-2" />
                  <p className="text-sm">Click on a file or folder to see details</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Legend */}
        {mode !== 'beginner' && (
          <div className="p-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-green-500" />
              Critical
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-blue-500" />
              Important
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-gray-500" />
              Optional
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectStructureExplorer;
