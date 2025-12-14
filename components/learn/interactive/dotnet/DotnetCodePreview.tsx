'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface CodeStep {
  lineNumbers: number[];
  highlight: string;
  explanation: string;
  variables?: Record<string, string>;
  output?: string;
}

export interface DotnetCodePreviewProps {
  code: string;
  title?: string;
  steps?: CodeStep[];
  language?: 'csharp' | 'fsharp';
  showLineNumbers?: boolean;
}

const csharpKeywords = [
  'using', 'namespace', 'class', 'public', 'private', 'protected', 'internal',
  'static', 'void', 'int', 'string', 'bool', 'var', 'new', 'return', 'if', 'else',
  'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'async', 'await', 'interface', 'abstract',
  'virtual', 'override', 'sealed', 'readonly', 'const', 'get', 'set', 'this',
  'base', 'null', 'true', 'false', 'in', 'out', 'ref', 'where', 'select', 'from',
];

function highlightCSharp(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, lineIndex) => {
    // Simple syntax highlighting
    let highlighted = line;
    
    // Highlight strings
    highlighted = highlighted.replace(/"([^"]*)"/g, '<span class="text-amber-400">"$1"</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/(\/\/.*)/g, '<span class="text-gray-500">$1</span>');
    
    // Highlight keywords
    csharpKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(regex, '<span class="text-purple-400">$1</span>');
    });
    
    // Highlight types (PascalCase)
    highlighted = highlighted.replace(/\b([A-Z][a-zA-Z0-9]+)(?=\s|<|>|\(|\)|\[|\]|,|\.)/g, 
      '<span class="text-cyan-400">$1</span>');
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');
    
    return (
      <div key={lineIndex} dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />
    );
  });
}

export function DotnetCodePreview({
  code,
  title = 'C# Code',
  steps = [],
  showLineNumbers = true,
}: DotnetCodePreviewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showExecution, setShowExecution] = useState(false);

  const lines = code.split('\n');
  const currentStepData = steps[currentStep];

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    setShowExecution(true);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowExecution(false);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Code2 className="h-4 w-4 text-purple-400" />
          {title}
        </CardTitle>
        {steps.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExecution(!showExecution)}
              className="text-gray-400 hover:text-white"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showExecution ? 'Hide' : 'Show'} Execution
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="text-gray-400 hover:text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-gray-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Code Panel */}
          <div className="flex-1 overflow-x-auto">
            <pre className="p-4 text-sm font-mono leading-relaxed">
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const isHighlighted = currentStepData?.lineNumbers?.includes(lineNumber);
                
                return (
                  <motion.div
                    key={index}
                    className={cn(
                      'flex transition-colors duration-300',
                      isHighlighted && showExecution && 'bg-purple-900/30 border-l-2 border-purple-400'
                    )}
                    animate={isHighlighted && showExecution ? { opacity: [0.7, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {showLineNumbers && (
                      <span className="w-8 text-right pr-4 text-gray-600 select-none">
                        {lineNumber}
                      </span>
                    )}
                    <span className="text-gray-200">
                      {highlightCSharp(line)[0]}
                    </span>
                  </motion.div>
                );
              })}
            </pre>
          </div>

          {/* Execution Panel */}
          <AnimatePresence>
            {showExecution && steps.length > 0 && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-gray-800 bg-gray-900/50"
              >
                <div className="p-4 space-y-4">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Step {currentStep + 1} of {steps.length}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Explanation */}
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-purple-400 mb-1">
                      {currentStepData?.highlight}
                    </p>
                    <p>{currentStepData?.explanation}</p>
                  </div>

                  {/* Variables */}
                  {currentStepData?.variables && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Variables
                      </p>
                      <div className="space-y-1">
                        {Object.entries(currentStepData.variables).map(([name, value]) => (
                          <div
                            key={name}
                            className="flex justify-between text-xs bg-gray-800/50 rounded px-2 py-1"
                          >
                            <span className="text-cyan-400">{name}</span>
                            <span className="text-amber-400">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Output */}
                  {currentStepData?.output && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Output
                      </p>
                      <div className="bg-black/50 rounded p-2 text-xs font-mono text-green-400">
                        {currentStepData.output}
                      </div>
                    </div>
                  )}

                  {/* Step navigation */}
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentStep === 0}
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="text-gray-400"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentStep >= steps.length - 1}
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="text-gray-400"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export default DotnetCodePreview;
