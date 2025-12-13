// Interactive Components for Learning Lessons
// All components are wrapped with error boundaries (Requirements 11.5, 10.5, 23.5)

import { withErrorBoundary } from '@/components/learn/shared';

// JavaScript components
import { CodePlayground as CodePlaygroundBase } from './javascript/CodePlayground';
import { VariableVisualizer as VariableVisualizerBase } from './javascript/VariableVisualizer';
import { DomTreeVisualizer as DomTreeVisualizerBase } from './javascript/DomTreeVisualizer';
import { DomManipulationSandbox as DomManipulationSandboxBase } from './javascript/DomManipulationSandbox';
import { EventFlowSimulator as EventFlowSimulatorBase } from './javascript/EventFlowSimulator';
import { ApiRequestBuilder as ApiRequestBuilderBase } from './javascript/ApiRequestBuilder';
import { ResponseInspector as ResponseInspectorBase } from './javascript/ResponseInspector';
import { ArrayMethodVisualizer as ArrayMethodVisualizerBase } from './javascript/ArrayMethodVisualizer';
import { MethodChainingPlayground as MethodChainingPlaygroundBase } from './javascript/MethodChainingPlayground';
import { ObjectExplorer as ObjectExplorerBase } from './javascript/ObjectExplorer';
import { RegexTester as RegexTesterBase } from './javascript/RegexTester';
import { PatternBuilder as PatternBuilderBase } from './javascript/PatternBuilder';

// TypeScript components
import { TypePlayground as TypePlaygroundBase } from './typescript/TypePlayground';

import { HostingTypeSelector as HostingTypeSelectorBase } from './hosting/HostingTypeSelector';
import { ServerArchitectureDiagram as ServerArchitectureDiagramBase } from './hosting/ServerArchitectureDiagram';

// DNS components
import { DnsRecordExplorer as DnsRecordExplorerBase } from './dns/DnsRecordExplorer';
import { DnsResolutionSimulator as DnsResolutionSimulatorBase } from './dns/DnsResolutionSimulator';

// Browser components
import { DomInspector as DomInspectorBase } from './browser/DomInspector';
import { RenderingPipelineSimulator as RenderingPipelineSimulatorBase } from './browser/RenderingPipelineSimulator';

// HTML components
import { LiveHtmlEditor as LiveHtmlEditorBase } from './html/LiveHtmlEditor';
import { ElementExplorer as ElementExplorerBase } from './html/ElementExplorer';

// Semantic HTML components
import { SemanticStructureBuilder as SemanticStructureBuilderBase } from './semantic/SemanticStructureBuilder';
import { StructureComparison as StructureComparisonBase } from './semantic/StructureComparison';

// Forms components
import { FormBuilder as FormBuilderBase } from './forms/FormBuilder';
import { FormValidationTester as FormValidationTesterBase } from './forms/FormValidationTester';

// Accessibility components
import { AccessibilityChecker as AccessibilityCheckerBase } from './accessibility/AccessibilityChecker';
import { ScreenReaderSimulator as ScreenReaderSimulatorBase } from './accessibility/ScreenReaderSimulator';

// SEO components
import { SeoPreview as SeoPreviewBase } from './seo/SeoPreview';
import { MetaTagEditor as MetaTagEditorBase } from './seo/MetaTagEditor';

// React components
import { ReactPlayground as ReactPlaygroundBase } from './react/ReactPlayground';
import { JsxTransformer as JsxTransformerBase } from './react/JsxTransformer';
import { ComponentTreeVisualizer as ComponentTreeVisualizerBase } from './react/ComponentTreeVisualizer';
import { RouteVisualizer as RouteVisualizerBase } from './react/RouteVisualizer';
import { NavigationSimulator as NavigationSimulatorBase } from './react/NavigationSimulator';
import { RouteMatcher as RouteMatcherBase } from './react/RouteMatcher';

// Server Components lesson components
import { ServerClientBoundaryVisualizer as ServerClientBoundaryVisualizerBase } from './react/ServerClientBoundaryVisualizer';
import { ComponentTypeSelector as ComponentTypeSelectorBase } from './react/ComponentTypeSelector';
import { ServerDataFlowDiagram as ServerDataFlowDiagramBase } from './react/ServerDataFlowDiagram';

// Wrap all interactive components with error boundaries
export const HostingTypeSelector = withErrorBoundary(HostingTypeSelectorBase, 'HostingTypeSelector');
export const ServerArchitectureDiagram = withErrorBoundary(ServerArchitectureDiagramBase, 'ServerArchitectureDiagram');

export const DnsRecordExplorer = withErrorBoundary(DnsRecordExplorerBase, 'DnsRecordExplorer');
export const DnsResolutionSimulator = withErrorBoundary(DnsResolutionSimulatorBase, 'DnsResolutionSimulator');

export const DomInspector = withErrorBoundary(DomInspectorBase, 'DomInspector');
export const RenderingPipelineSimulator = withErrorBoundary(RenderingPipelineSimulatorBase, 'RenderingPipelineSimulator');

export const LiveHtmlEditor = withErrorBoundary(LiveHtmlEditorBase, 'LiveHtmlEditor');
export const ElementExplorer = withErrorBoundary(ElementExplorerBase, 'ElementExplorer');

export const SemanticStructureBuilder = withErrorBoundary(SemanticStructureBuilderBase, 'SemanticStructureBuilder');
export const StructureComparison = withErrorBoundary(StructureComparisonBase, 'StructureComparison');

export const FormBuilder = withErrorBoundary(FormBuilderBase, 'FormBuilder');
export const FormValidationTester = withErrorBoundary(FormValidationTesterBase, 'FormValidationTester');

export const AccessibilityChecker = withErrorBoundary(AccessibilityCheckerBase, 'AccessibilityChecker');
export const ScreenReaderSimulator = withErrorBoundary(ScreenReaderSimulatorBase, 'ScreenReaderSimulator');

export const SeoPreview = withErrorBoundary(SeoPreviewBase, 'SeoPreview');
export const MetaTagEditor = withErrorBoundary(MetaTagEditorBase, 'MetaTagEditor');

// JavaScript components
export const CodePlayground = withErrorBoundary(CodePlaygroundBase, 'CodePlayground');
export const VariableVisualizer = withErrorBoundary(VariableVisualizerBase, 'VariableVisualizer');
export const DomTreeVisualizer = withErrorBoundary(DomTreeVisualizerBase, 'DomTreeVisualizer');
export const DomManipulationSandbox = withErrorBoundary(DomManipulationSandboxBase, 'DomManipulationSandbox');
export const EventFlowSimulator = withErrorBoundary(EventFlowSimulatorBase, 'EventFlowSimulator');
export const ApiRequestBuilder = withErrorBoundary(ApiRequestBuilderBase, 'ApiRequestBuilder');
export const ResponseInspector = withErrorBoundary(ResponseInspectorBase, 'ResponseInspector');
export const ArrayMethodVisualizer = withErrorBoundary(ArrayMethodVisualizerBase, 'ArrayMethodVisualizer');
export const MethodChainingPlayground = withErrorBoundary(MethodChainingPlaygroundBase, 'MethodChainingPlayground');
export const ObjectExplorer = withErrorBoundary(ObjectExplorerBase, 'ObjectExplorer');
export const RegexTester = withErrorBoundary(RegexTesterBase, 'RegexTester');
export const PatternBuilder = withErrorBoundary(PatternBuilderBase, 'PatternBuilder');

// TypeScript components
export const TypePlayground = withErrorBoundary(TypePlaygroundBase, 'TypePlayground');

// React components
export const ReactPlayground = withErrorBoundary(ReactPlaygroundBase, 'ReactPlayground');
export const JsxTransformer = withErrorBoundary(JsxTransformerBase, 'JsxTransformer');
export const ComponentTreeVisualizer = withErrorBoundary(ComponentTreeVisualizerBase, 'ComponentTreeVisualizer');
export const RouteVisualizer = withErrorBoundary(RouteVisualizerBase, 'RouteVisualizer');
export const NavigationSimulator = withErrorBoundary(NavigationSimulatorBase, 'NavigationSimulator');
export const RouteMatcher = withErrorBoundary(RouteMatcherBase, 'RouteMatcher');

// Server Components lesson components
export const ServerClientBoundaryVisualizer = withErrorBoundary(ServerClientBoundaryVisualizerBase, 'ServerClientBoundaryVisualizer');
export const ComponentTypeSelector = withErrorBoundary(ComponentTypeSelectorBase, 'ComponentTypeSelector');
export const ServerDataFlowDiagram = withErrorBoundary(ServerDataFlowDiagramBase, 'ServerDataFlowDiagram');

// Re-export types and utilities
export type { HostingType, HostingTypeInfo } from './hosting/HostingTypeSelector';
export type { DiagramType } from './hosting/ServerArchitectureDiagram';
export type { DnsRecordType, DnsRecord } from './dns/DnsRecordExplorer';
export type { DnsResolutionStep } from './dns/DnsResolutionSimulator';
export type { DomNode } from './browser/DomInspector';
export type { RenderingStage, RenderingStageInfo } from './browser/RenderingPipelineSimulator';
export type { SemanticTag, SemanticElement } from './semantic/SemanticStructureBuilder';
export type { InputType, FormElement, ValidationRule } from './forms/FormBuilder';
export type { ValidationState, ValidationExample } from './forms/FormValidationTester';
export type { IssueSeverity, AccessibilityIssue, AccessibilityExample } from './accessibility/AccessibilityChecker';
export type { ScreenReaderOutput, ScreenReaderExample } from './accessibility/ScreenReaderSimulator';
export type { SeoMetaTags, SeoPreviewProps } from './seo/SeoPreview';
export type { MetaTag, MetaTagEditorProps } from './seo/MetaTagEditor';
export type { CodePlaygroundProps, ExecutionResult, ExecutionError, ConsoleOutput } from './javascript/CodePlayground';
export type { VariableVisualizerProps, VariableState, VariableStep } from './javascript/VariableVisualizer';
export type { DomTreeVisualizerProps, DomTreeNode } from './javascript/DomTreeVisualizer';
export type { DomManipulationSandboxProps } from './javascript/DomManipulationSandbox';
export type { EventFlowSimulatorProps, NestedElement, EventPhase, EventFlowStep } from './javascript/EventFlowSimulator';
export type { ApiRequestBuilderProps, HttpMethod, Header, ApiResponse } from './javascript/ApiRequestBuilder';
export type { ResponseInspectorProps, ResponseData } from './javascript/ResponseInspector';
export type { ArrayMethodVisualizerProps, ArrayMethod, ArrayMethodStep } from './javascript/ArrayMethodVisualizer';
export type { MethodChainingPlaygroundProps, ChainableMethod, ChainStep } from './javascript/MethodChainingPlayground';
export type { ObjectExplorerProps, ObjectProperty } from './javascript/ObjectExplorer';
export type { RegexTesterProps, RegexMatch, RegexTestResult } from './javascript/RegexTester';
export type { PatternBuilderProps, PatternElement, PatternElementType } from './javascript/PatternBuilder';

// TypeScript component types
export type { TypePlaygroundProps } from './typescript/TypePlayground';

// React component types
export type { ReactPlaygroundProps, ReactPlaygroundError, ConsoleOutput as ReactConsoleOutput } from './react/ReactPlayground';
export type { JsxTransformerProps, TransformStep } from './react/JsxTransformer';
export type { ComponentTreeVisualizerProps, ComponentNode, PropInfo } from './react/ComponentTreeVisualizer';
export type { RouteVisualizerProps, RouteConfig as RouteVisualizerRouteConfig } from './react/RouteVisualizer';
export type { NavigationSimulatorProps, RouteConfig as NavigationSimulatorRouteConfig } from './react/NavigationSimulator';
export type { RouteMatcherProps, RoutePattern, MatchResult } from './react/RouteMatcher';

// Server Components lesson types
export type { ServerClientBoundaryVisualizerProps, ServerClientComponent } from './react/ServerClientBoundaryVisualizer';
export type { ComponentTypeSelectorProps, ComponentScenario } from './react/ComponentTypeSelector';
export type { ServerDataFlowDiagramProps } from './react/ServerDataFlowDiagram';
