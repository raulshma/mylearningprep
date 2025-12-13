'use client';

import { CodePlayground } from '../javascript/CodePlayground';
import type { CodePlaygroundProps } from '../javascript/CodePlayground';

/**
 * TypePlayground Component
 * A TypeScript-focused code playground that wraps CodePlayground with TypeScript defaults.
 * 
 * Note: TypeScript code is transpiled to JavaScript before execution since the
 * browser sandbox only executes JavaScript. Type annotations are stripped during execution.
 */
export interface TypePlaygroundProps extends Omit<CodePlaygroundProps, 'language'> {
  /** Optional prop to show TypeScript-specific tips */
  showTypeHints?: boolean;
}

const defaultTypeScriptCode = `// Welcome to the TypeScript Playground!
// Write TypeScript code and click "Run" to execute.

// Type annotations help catch errors early
let message: string = "Hello, TypeScript!";
let count: number = 42;
let isActive: boolean = true;

console.log(message);
console.log("Count:", count);
console.log("Active:", isActive);

// Try the type system:
// let broken: number = "oops";  // Uncomment to see the error!
`;

/**
 * TypePlayground - Interactive TypeScript code editor
 * 
 * Uses Monaco editor with TypeScript language support for syntax highlighting
 * and type checking. Code is executed in a sandboxed environment.
 */
export function TypePlayground({
  initialCode = defaultTypeScriptCode,
  height = 300,
  showLineNumbers = true,
  showConsole = true,
  autoRun = false,
  timeout,
  onCodeChange,
  onExecute,
}: TypePlaygroundProps) {
  return (
    <CodePlayground
      initialCode={initialCode}
      language="typescript"
      height={height}
      showLineNumbers={showLineNumbers}
      showConsole={showConsole}
      autoRun={autoRun}
      timeout={timeout}
      onCodeChange={onCodeChange}
      onExecute={onExecute}
    />
  );
}

export default TypePlayground;
