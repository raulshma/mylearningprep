// JavaScript Interactive Components for Learning Lessons
// All components are wrapped with error boundaries (Requirements 23.5)

import { withErrorBoundary } from '@/components/learn/shared';

// Code Playground component
import { CodePlayground as CodePlaygroundBase } from './CodePlayground';

// Variable Visualizer component
import { VariableVisualizer as VariableVisualizerBase } from './VariableVisualizer';

// DOM components
import { DomTreeVisualizer as DomTreeVisualizerBase } from './DomTreeVisualizer';
import { DomManipulationSandbox as DomManipulationSandboxBase } from './DomManipulationSandbox';
import { EventFlowSimulator as EventFlowSimulatorBase } from './EventFlowSimulator';

// Fetch API components
import { ApiRequestBuilder as ApiRequestBuilderBase } from './ApiRequestBuilder';
import { ResponseInspector as ResponseInspectorBase } from './ResponseInspector';

// ES6+ components
import { ES6FeatureExplorer as ES6FeatureExplorerBase } from './ES6FeatureExplorer';
import { ModuleDependencyVisualizer as ModuleDependencyVisualizerBase } from './ModuleDependencyVisualizer';
import { SyntaxTransformer as SyntaxTransformerBase } from './SyntaxTransformer';

// Hoisting/Scope/Prototype components
import { ScopeChainVisualizer as ScopeChainVisualizerBase } from './ScopeChainVisualizer';
import { HoistingSimulator as HoistingSimulatorBase } from './HoistingSimulator';
import { PrototypeChainExplorer as PrototypeChainExplorerBase } from './PrototypeChainExplorer';
import { EventBubblingPlayground as EventBubblingPlaygroundBase } from './EventBubblingPlayground';

// Async/Await components
import { EventLoopVisualizer as EventLoopVisualizerBase } from './EventLoopVisualizer';
import { PromiseChainBuilder as PromiseChainBuilderBase } from './PromiseChainBuilder';
import { AsyncTimeline as AsyncTimelineBase } from './AsyncTimeline';

// Error Handling/Debugging components
import { ErrorTypeExplorer as ErrorTypeExplorerBase } from './ErrorTypeExplorer';
import { DebugSimulator as DebugSimulatorBase } from './DebugSimulator';
import { StackTraceAnalyzer as StackTraceAnalyzerBase } from './StackTraceAnalyzer';

// Wrap all interactive components with error boundaries
export const CodePlayground = withErrorBoundary(CodePlaygroundBase, 'CodePlayground');
export const VariableVisualizer = withErrorBoundary(VariableVisualizerBase, 'VariableVisualizer');
export const DomTreeVisualizer = withErrorBoundary(DomTreeVisualizerBase, 'DomTreeVisualizer');
export const DomManipulationSandbox = withErrorBoundary(DomManipulationSandboxBase, 'DomManipulationSandbox');
export const EventFlowSimulator = withErrorBoundary(EventFlowSimulatorBase, 'EventFlowSimulator');
export const ApiRequestBuilder = withErrorBoundary(ApiRequestBuilderBase, 'ApiRequestBuilder');
export const ResponseInspector = withErrorBoundary(ResponseInspectorBase, 'ResponseInspector');
export const ES6FeatureExplorer = withErrorBoundary(ES6FeatureExplorerBase, 'ES6FeatureExplorer');
export const ModuleDependencyVisualizer = withErrorBoundary(ModuleDependencyVisualizerBase, 'ModuleDependencyVisualizer');
export const SyntaxTransformer = withErrorBoundary(SyntaxTransformerBase, 'SyntaxTransformer');
export const ScopeChainVisualizer = withErrorBoundary(ScopeChainVisualizerBase, 'ScopeChainVisualizer');
export const HoistingSimulator = withErrorBoundary(HoistingSimulatorBase, 'HoistingSimulator');
export const PrototypeChainExplorer = withErrorBoundary(PrototypeChainExplorerBase, 'PrototypeChainExplorer');
export const EventBubblingPlayground = withErrorBoundary(EventBubblingPlaygroundBase, 'EventBubblingPlayground');
export const EventLoopVisualizer = withErrorBoundary(EventLoopVisualizerBase, 'EventLoopVisualizer');
export const PromiseChainBuilder = withErrorBoundary(PromiseChainBuilderBase, 'PromiseChainBuilder');
export const AsyncTimeline = withErrorBoundary(AsyncTimelineBase, 'AsyncTimeline');
export const ErrorTypeExplorer = withErrorBoundary(ErrorTypeExplorerBase, 'ErrorTypeExplorer');
export const DebugSimulator = withErrorBoundary(DebugSimulatorBase, 'DebugSimulator');
export const StackTraceAnalyzer = withErrorBoundary(StackTraceAnalyzerBase, 'StackTraceAnalyzer');

// Re-export types
export type {
  CodePlaygroundProps,
  ExecutionResult,
  ExecutionError,
  ConsoleOutput,
} from './CodePlayground';

export type {
  VariableVisualizerProps,
  VariableState,
  VariableStep,
} from './VariableVisualizer';

export type {
  DomTreeVisualizerProps,
  DomTreeNode,
} from './DomTreeVisualizer';

export type {
  DomManipulationSandboxProps,
} from './DomManipulationSandbox';

export type {
  EventFlowSimulatorProps,
  NestedElement,
  EventPhase,
  EventFlowStep,
} from './EventFlowSimulator';

export type {
  ApiRequestBuilderProps,
  HttpMethod,
  Header,
  ApiResponse,
} from './ApiRequestBuilder';

export type {
  ResponseInspectorProps,
  ResponseData,
} from './ResponseInspector';

export type {
  ES6FeatureExplorerProps,
  ES6Feature,
} from './ES6FeatureExplorer';

export type {
  ModuleDependencyVisualizerProps,
  ModuleNode,
  ModuleExport,
  ModuleImport,
  ImportItem,
  DependencyEdge,
} from './ModuleDependencyVisualizer';

export type {
  SyntaxTransformerProps,
  TransformRule,
  TransformResult,
  TransformHighlight,
} from './SyntaxTransformer';

export type {
  ScopeChainVisualizerProps,
  Variable,
  Scope,
  ScopeResolutionStep,
} from './ScopeChainVisualizer';

export type {
  HoistingSimulatorProps,
  Declaration,
  HoistingStep,
} from './HoistingSimulator';

export type {
  PrototypeChainExplorerProps,
  PrototypeProperty,
  PrototypeNode,
} from './PrototypeChainExplorer';

export type {
  EventBubblingPlaygroundProps,
  EventLogEntry,
  PlaygroundElement,
} from './EventBubblingPlayground';

export type {
  EventLoopVisualizerProps,
  Task,
  EventLoopStep,
} from './EventLoopVisualizer';

export type {
  PromiseChainBuilderProps,
  PromiseStep,
  ExecutionStep,
} from './PromiseChainBuilder';

export type {
  AsyncTimelineProps,
  AsyncOperation,
  TimelineEvent,
} from './AsyncTimeline';

export type {
  ErrorTypeExplorerProps,
  ErrorTypeInfo,
} from './ErrorTypeExplorer';

export type {
  DebugSimulatorProps,
  CodeLine,
  Variable as DebugVariable,
  ExecutionState,
} from './DebugSimulator';

export type {
  StackTraceAnalyzerProps,
  StackFrame,
  ParsedStackTrace,
} from './StackTraceAnalyzer';

// Export base components for testing
export { CodePlaygroundBase };
export { VariableVisualizerBase };
export { DomTreeVisualizerBase };
export { DomManipulationSandboxBase };
export { EventFlowSimulatorBase };
export { ApiRequestBuilderBase };
export { ResponseInspectorBase };
export { ES6FeatureExplorerBase };
export { ModuleDependencyVisualizerBase };
export { SyntaxTransformerBase };
export { ScopeChainVisualizerBase };
export { HoistingSimulatorBase };
export { PrototypeChainExplorerBase };
export { EventBubblingPlaygroundBase };
export { EventLoopVisualizerBase };
export { PromiseChainBuilderBase };
export { AsyncTimelineBase };
export { ErrorTypeExplorerBase };
export { DebugSimulatorBase };
export { StackTraceAnalyzerBase };
