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

// Hosting components
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
