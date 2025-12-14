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
import { CallbackVisualizer as CallbackVisualizerBase } from './CallbackVisualizer';
import { TimerPlayground as TimerPlaygroundBase } from './TimerPlayground';

// Error Handling/Debugging components
import { ErrorTypeExplorer as ErrorTypeExplorerBase } from './ErrorTypeExplorer';
import { DebugSimulator as DebugSimulatorBase } from './DebugSimulator';
import { StackTraceAnalyzer as StackTraceAnalyzerBase } from './StackTraceAnalyzer';

// Arrays and Objects components
import { ArrayMethodVisualizer as ArrayMethodVisualizerBase } from './ArrayMethodVisualizer';
import { MethodChainingPlayground as MethodChainingPlaygroundBase } from './MethodChainingPlayground';
import { ObjectExplorer as ObjectExplorerBase } from './ObjectExplorer';

// Regular Expressions components
import { RegexTester as RegexTesterBase } from './RegexTester';
import { PatternBuilder as PatternBuilderBase } from './PatternBuilder';

// Web Storage components
import { StorageInspector as StorageInspectorBase } from './StorageInspector';
import { StorageComparison as StorageComparisonBase } from './StorageComparison';

// JavaScript Introduction components
import { JsUseCaseExplorer as JsUseCaseExplorerBase } from './JsUseCaseExplorer';
import { JsTimelineExplorer as JsTimelineExplorerBase } from './JsTimelineExplorer';
import { EcmaScriptVersionExplorer as EcmaScriptVersionExplorerBase } from './EcmaScriptVersionExplorer';

// Data Types components
import { TypeVisualizer as TypeVisualizerBase } from './TypeVisualizer';
import { TypeofExplorer as TypeofExplorerBase } from './TypeofExplorer';
import { BuiltInObjectExplorer as BuiltInObjectExplorerBase } from './BuiltInObjectExplorer';

// Variable Naming Validator component
import { VariableNamingValidator as VariableNamingValidatorBase } from './VariableNamingValidator';

// Data Structures components
import { IndexedCollectionVisualizer as IndexedCollectionVisualizerBase } from './IndexedCollectionVisualizer';
import { KeyedCollectionExplorer as KeyedCollectionExplorerBase } from './KeyedCollectionExplorer';
import { JsonPlayground as JsonPlaygroundBase } from './JsonPlayground';

// This Keyword components
import { ThisKeywordVisualizer as ThisKeywordVisualizerBase } from './ThisKeywordVisualizer';

// Loop Visualizer component
import { LoopVisualizer as LoopVisualizerBase } from './LoopVisualizer';

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
export const CallbackVisualizer = withErrorBoundary(CallbackVisualizerBase, 'CallbackVisualizer');
export const TimerPlayground = withErrorBoundary(TimerPlaygroundBase, 'TimerPlayground');
export const ErrorTypeExplorer = withErrorBoundary(ErrorTypeExplorerBase, 'ErrorTypeExplorer');
export const DebugSimulator = withErrorBoundary(DebugSimulatorBase, 'DebugSimulator');
export const StackTraceAnalyzer = withErrorBoundary(StackTraceAnalyzerBase, 'StackTraceAnalyzer');
export const ArrayMethodVisualizer = withErrorBoundary(ArrayMethodVisualizerBase, 'ArrayMethodVisualizer');
export const MethodChainingPlayground = withErrorBoundary(MethodChainingPlaygroundBase, 'MethodChainingPlayground');
export const ObjectExplorer = withErrorBoundary(ObjectExplorerBase, 'ObjectExplorer');
export const RegexTester = withErrorBoundary(RegexTesterBase, 'RegexTester');
export const PatternBuilder = withErrorBoundary(PatternBuilderBase, 'PatternBuilder');
export const StorageInspector = withErrorBoundary(StorageInspectorBase, 'StorageInspector');
export const StorageComparison = withErrorBoundary(StorageComparisonBase, 'StorageComparison');
export const JsUseCaseExplorer = withErrorBoundary(JsUseCaseExplorerBase, 'JsUseCaseExplorer');
export const JsTimelineExplorer = withErrorBoundary(JsTimelineExplorerBase, 'JsTimelineExplorer');
export const EcmaScriptVersionExplorer = withErrorBoundary(EcmaScriptVersionExplorerBase, 'EcmaScriptVersionExplorer');

// Data Types components
export const TypeVisualizer = withErrorBoundary(TypeVisualizerBase, 'TypeVisualizer');
export const TypeofExplorer = withErrorBoundary(TypeofExplorerBase, 'TypeofExplorer');
export const BuiltInObjectExplorer = withErrorBoundary(BuiltInObjectExplorerBase, 'BuiltInObjectExplorer');

// Variable Naming Validator
export const VariableNamingValidator = withErrorBoundary(VariableNamingValidatorBase, 'VariableNamingValidator');

// Data Structures components
export const IndexedCollectionVisualizer = withErrorBoundary(IndexedCollectionVisualizerBase, 'IndexedCollectionVisualizer');
export const KeyedCollectionExplorer = withErrorBoundary(KeyedCollectionExplorerBase, 'KeyedCollectionExplorer');
export const JsonPlayground = withErrorBoundary(JsonPlaygroundBase, 'JsonPlayground');

// This Keyword Visualizer
export const ThisKeywordVisualizer = withErrorBoundary(ThisKeywordVisualizerBase, 'ThisKeywordVisualizer');

// Loop Visualizer
export const LoopVisualizer = withErrorBoundary(LoopVisualizerBase, 'LoopVisualizer');

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
  CallbackVisualizerProps,
  CallbackStep,
} from './CallbackVisualizer';

export type {
  TimerPlaygroundProps,
} from './TimerPlayground';

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

export type {
  ArrayMethodVisualizerProps,
  ArrayMethod,
  ArrayMethodStep,
} from './ArrayMethodVisualizer';

export type {
  MethodChainingPlaygroundProps,
  ChainableMethod,
  ChainStep,
} from './MethodChainingPlayground';

export type {
  ObjectExplorerProps,
  ObjectProperty,
} from './ObjectExplorer';

export type {
  RegexTesterProps,
  RegexMatch,
  RegexTestResult,
} from './RegexTester';

export type {
  PatternBuilderProps,
  PatternElement,
  PatternElementType,
} from './PatternBuilder';

export type {
  StorageInspectorProps,
  StorageItem,
  StorageQuota,
  StorageType,
} from './StorageInspector';

export type {
  StorageComparisonProps,
  StorageFeature,
  StorageTypeInfo,
} from './StorageComparison';

export type {
  JsUseCaseExplorerProps,
} from './JsUseCaseExplorer';

export type {
  JsTimelineExplorerProps,
} from './JsTimelineExplorer';

export type {
  EcmaScriptVersionExplorerProps,
} from './EcmaScriptVersionExplorer';

export type {
  IndexedCollectionVisualizerProps,
  ArrayOperation,
  CollectionType,
} from './IndexedCollectionVisualizer';

export type {
  KeyedCollectionExplorerProps,
  KeyedCollectionType,
} from './KeyedCollectionExplorer';

export type {
  JsonPlaygroundProps,
  JsonMode,
} from './JsonPlayground';

export type {
  ThisKeywordVisualizerProps,
} from './ThisKeywordVisualizer';

export type {
  LoopVisualizerProps,
  LoopType,
  LoopStep,
  LoopState,
} from './LoopVisualizer';

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
export { CallbackVisualizerBase };
export { TimerPlaygroundBase };
export { ErrorTypeExplorerBase };
export { DebugSimulatorBase };
export { StackTraceAnalyzerBase };
export { ArrayMethodVisualizerBase };
export { MethodChainingPlaygroundBase };
export { ObjectExplorerBase };
export { RegexTesterBase };
export { PatternBuilderBase };
export { StorageInspectorBase };
export { StorageComparisonBase };
export { JsUseCaseExplorerBase };
export { JsTimelineExplorerBase };
export { EcmaScriptVersionExplorerBase };
export { TypeVisualizerBase };
export { TypeofExplorerBase };
export { BuiltInObjectExplorerBase };
export { VariableNamingValidatorBase };
export { IndexedCollectionVisualizerBase };
export { KeyedCollectionExplorerBase };
export { JsonPlaygroundBase };
export { ThisKeywordVisualizerBase };
export { LoopVisualizerBase };
