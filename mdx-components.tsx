import dynamic from 'next/dynamic';
import type { MDXComponents } from 'mdx/types';
import {
  AnimatedDiagram,
  InteractiveDemo,
  InfoBox,
  Quiz,
  Question,
  Answer,
  CodeExample,
  ProgressCheckpoint,
  KeyConcept,
  Comparison,
  EnhancedCodeBlock,
  // EF Core specific components
  DotnetCodePreview as EfCoreDotnetCodePreview,
  DbContextVisualizer as EfCoreDbContextVisualizer,
  ChangeTrackingVisualizer,
  RelationshipDiagram,
  QueryExecutionVisualizer,
  MigrationFlowDiagram,
} from '@/components/learn/mdx-components';

import { HttpConversation } from '@/components/learn/interactive/http/HttpConversation';
import { HttpRequestBuilder } from '@/components/learn/interactive/http/HttpRequestBuilder';
import { PacketInspector } from '@/components/learn/interactive/http/PacketInspector';

import { AddressBarDeconstruction } from '@/components/learn/interactive/domain/AddressBarDeconstruction';
import { DnsResolutionFlow } from '@/components/learn/interactive/domain/DnsResolutionFlow';
import { DnsRecordExplorer as DnsRecordExplorerLegacy } from '@/components/learn/interactive/domain/DnsRecordExplorer';

import { ServerArchitectureDiagram } from '@/components/learn/interactive/hosting/ServerArchitectureDiagram';

const HostingTypeSelector = dynamic(() => import('@/components/learn/interactive/hosting/HostingTypeSelector').then(mod => mod.HostingTypeSelector), { ssr: false });

import { DnsRecordExplorer } from '@/components/learn/interactive/dns/DnsRecordExplorer';
import { DnsResolutionSimulator } from '@/components/learn/interactive/dns/DnsResolutionSimulator';

import { DomInspector } from '@/components/learn/interactive/browser/DomInspector';
import { RenderingPipelineSimulator } from '@/components/learn/interactive/browser/RenderingPipelineSimulator';

import { LiveHtmlEditor } from '@/components/learn/interactive/html/LiveHtmlEditor';
import { ElementExplorer } from '@/components/learn/interactive/html/ElementExplorer';

import { SemanticStructureBuilder } from '@/components/learn/interactive/semantic/SemanticStructureBuilder';
import { StructureComparison } from '@/components/learn/interactive/semantic/StructureComparison';

import { FormBuilder } from '@/components/learn/interactive/forms/FormBuilder';
import { FormValidationTester } from '@/components/learn/interactive/forms/FormValidationTester';

import { AccessibilityChecker } from '@/components/learn/interactive/accessibility/AccessibilityChecker';
import { ScreenReaderSimulator } from '@/components/learn/interactive/accessibility/ScreenReaderSimulator';

import { SeoPreview } from '@/components/learn/interactive/seo/SeoPreview';
import { MetaTagEditor } from '@/components/learn/interactive/seo/MetaTagEditor';

// JavaScript Lesson Components
import { CodePlayground } from '@/components/learn/interactive/javascript/CodePlayground';
import { VariableVisualizer } from '@/components/learn/interactive/javascript/VariableVisualizer';
import { DomTreeVisualizer } from '@/components/learn/interactive/javascript/DomTreeVisualizer';
import { DomManipulationSandbox } from '@/components/learn/interactive/javascript/DomManipulationSandbox';
import { EventFlowSimulator } from '@/components/learn/interactive/javascript/EventFlowSimulator';
import { ApiRequestBuilder } from '@/components/learn/interactive/javascript/ApiRequestBuilder';
import { ResponseInspector } from '@/components/learn/interactive/javascript/ResponseInspector';
import { ES6FeatureExplorer } from '@/components/learn/interactive/javascript/ES6FeatureExplorer';
import { ModuleDependencyVisualizer } from '@/components/learn/interactive/javascript/ModuleDependencyVisualizer';
import { SyntaxTransformer } from '@/components/learn/interactive/javascript/SyntaxTransformer';
import { ScopeChainVisualizer } from '@/components/learn/interactive/javascript/ScopeChainVisualizer';
import { HoistingSimulator } from '@/components/learn/interactive/javascript/HoistingSimulator';
import { PrototypeChainExplorer } from '@/components/learn/interactive/javascript/PrototypeChainExplorer';
import { EventBubblingPlayground } from '@/components/learn/interactive/javascript/EventBubblingPlayground';
import { EventLoopVisualizer } from '@/components/learn/interactive/javascript/EventLoopVisualizer';
import { PromiseChainBuilder } from '@/components/learn/interactive/javascript/PromiseChainBuilder';
import { AsyncTimeline } from '@/components/learn/interactive/javascript/AsyncTimeline';
import { ErrorTypeExplorer } from '@/components/learn/interactive/javascript/ErrorTypeExplorer';
import { DebugSimulator } from '@/components/learn/interactive/javascript/DebugSimulator';
import { StackTraceAnalyzer } from '@/components/learn/interactive/javascript/StackTraceAnalyzer';
import { ArrayMethodVisualizer } from '@/components/learn/interactive/javascript/ArrayMethodVisualizer';
import { MethodChainingPlayground } from '@/components/learn/interactive/javascript/MethodChainingPlayground';
import { ObjectExplorer } from '@/components/learn/interactive/javascript/ObjectExplorer';
import { RegexTester } from '@/components/learn/interactive/javascript/RegexTester';
import { PatternBuilder } from '@/components/learn/interactive/javascript/PatternBuilder';
import { StorageInspector } from '@/components/learn/interactive/javascript/StorageInspector';
import { StorageComparison } from '@/components/learn/interactive/javascript/StorageComparison';
import { JsUseCaseExplorer } from '@/components/learn/interactive/javascript/JsUseCaseExplorer';
import { JsTimelineExplorer } from '@/components/learn/interactive/javascript/JsTimelineExplorer';
import { EcmaScriptVersionExplorer } from '@/components/learn/interactive/javascript/EcmaScriptVersionExplorer';
import { TypeVisualizer } from '@/components/learn/interactive/javascript/TypeVisualizer';
import { TypeofExplorer } from '@/components/learn/interactive/javascript/TypeofExplorer';
import { BuiltInObjectExplorer } from '@/components/learn/interactive/javascript/BuiltInObjectExplorer';
import { CallbackVisualizer } from '@/components/learn/interactive/javascript/CallbackVisualizer';
import { TimerPlayground } from '@/components/learn/interactive/javascript/TimerPlayground';
import { VariableNamingValidator } from '@/components/learn/interactive/javascript/VariableNamingValidator';
import { ThisKeywordVisualizer } from '@/components/learn/interactive/javascript/ThisKeywordVisualizer';
import { IndexedCollectionVisualizer } from '@/components/learn/interactive/javascript/IndexedCollectionVisualizer';
import { KeyedCollectionExplorer } from '@/components/learn/interactive/javascript/KeyedCollectionExplorer';
import { JsonPlayground } from '@/components/learn/interactive/javascript/JsonPlayground';
import { LoopVisualizer } from '@/components/learn/interactive/javascript/LoopVisualizer';
import { FunctionVisualizer } from '@/components/learn/interactive/javascript/FunctionVisualizer';
import { TypeCastingVisualizer } from '@/components/learn/interactive/javascript/TypeCastingVisualizer';
import { EqualityComparisonVisualizer } from '@/components/learn/interactive/javascript/EqualityComparisonVisualizer';
import { IteratorGeneratorVisualizer, YieldVisualizer, IterableBuilder } from '@/components/learn/interactive/javascript/IteratorGeneratorVisualizer';
import { ControlFlowVisualizer as JsControlFlowVisualizer } from '@/components/learn/interactive/javascript/ControlFlowVisualizer';
import { OperatorVisualizer } from '@/components/learn/interactive/javascript/OperatorVisualizer';

// React Lesson Components
import {
  ReactPlayground,
  JsxTransformer,
  ComponentTreeVisualizer,
  DataFlowDiagram,
  PropsInspector,
  StateTimeline,
  ErrorBoundarySimulator,
  ErrorPropagationVisualizer,
  ServerClientBoundaryVisualizer,
  ComponentTypeSelector,
  ServerDataFlowDiagram,
} from '@/components/learn/interactive/react';

// CSS Lesson Components
import {
  BoxModelVisualizer,
  SelectorPlayground,
  FlexboxPlayground,
  GridPlayground,
  CssEditor,
  PositioningDemo,
  ColorMixer,
  AnimationBuilder,
  TransformPlayground,
  ResponsivePreview,
  SpecificityCalculator,
  AnimationTimeline,
  BrowserCompatibility,
  CssComparison,
} from '@/components/learn/interactive/css';

// Build Tools Lesson Components
import {
  BuildPipelineVisualizer,
  PackageManagerSimulator,
  DependencyGraphExplorer,
  BundlerComparison,
  TranspilerDemo,
  ViteDevServerDemo,
  ViteConfigExplorer,
  EsbuildSpeedDemo,
  EsbuildConfigDemo,
  WebpackConceptVisualizer,
} from '@/components/learn/interactive/build-tools';

// Testing Lesson Components
import {
  TestRunnerSimulator,
  TestPyramidExplorer,
  MockingVisualizer,
  AssertionPlayground,
  ComponentTestSimulator,
  E2EFlowVisualizer,
  LocatorPlayground,
  PageObjectModelDemo,
} from '@/components/learn/interactive/testing';

// Authentication Lesson Components
import { OAuthPkceFlowSimulator } from '@/components/learn/interactive/auth/OAuthPkceFlowSimulator';
import { SessionVsTokenVisualizer } from '@/components/learn/interactive/auth/SessionVsTokenVisualizer';

// .NET Lesson Components
import { DotnetCodePreview } from '@/components/learn/interactive/dotnet/DotnetCodePreview';
import { DependencyInjectionVisualizer } from '@/components/learn/interactive/dotnet/DependencyInjectionVisualizer';
import { MiddlewarePipelineSimulator } from '@/components/learn/interactive/dotnet/MiddlewarePipelineSimulator';
import { EntityFrameworkVisualizer } from '@/components/learn/interactive/dotnet/EntityFrameworkVisualizer';
import { ApiEndpointBuilder as DotnetApiEndpointBuilder } from '@/components/learn/interactive/dotnet/ApiEndpointBuilder';
import { SolidPrincipleDemo } from '@/components/learn/interactive/dotnet/SolidPrincipleDemo';
import { AspNetCoreIntroVisualizer } from '@/components/learn/interactive/dotnet/AspNetCoreIntroVisualizer';
import { ProjectStructureExplorer } from '@/components/learn/interactive/dotnet/ProjectStructureExplorer';
import { ConfigurationVisualizer } from '@/components/learn/interactive/dotnet/ConfigurationVisualizer';
import { EnvironmentSwitcher } from '@/components/learn/interactive/dotnet/EnvironmentSwitcher';
import { ControlFlowVisualizer } from '@/components/learn/interactive/dotnet/ControlFlowVisualizer';
import { OopConceptVisualizer } from '@/components/learn/interactive/dotnet/OopConceptVisualizer';
import { CollectionExplorer } from '@/components/learn/interactive/dotnet/CollectionExplorer';
import { LinqQueryBuilder } from '@/components/learn/interactive/dotnet/LinqQueryBuilder';
import { WebApiControllerVisualizer } from '@/components/learn/interactive/dotnet/WebApiControllerVisualizer';
import { RoutingAttributeExplorer } from '@/components/learn/interactive/dotnet/RoutingAttributeExplorer';
import { ModelBindingVisualizer } from '@/components/learn/interactive/dotnet/ModelBindingVisualizer';
import { ResponseFormattingDemo } from '@/components/learn/interactive/dotnet/ResponseFormattingDemo';
import { MinimalApiBuilder } from '@/components/learn/interactive/dotnet/MinimalApiBuilder';
import { ServiceLifetimeDemo } from '@/components/learn/interactive/dotnet/ServiceLifetimeDemo';
import { DIContainerExplorer } from '@/components/learn/interactive/dotnet/DIContainerExplorer';
import { DIPatternShowcase } from '@/components/learn/interactive/dotnet/DIPatternShowcase';
import { BuiltInMiddlewareExplorer } from '@/components/learn/interactive/dotnet/BuiltInMiddlewareExplorer';
import { CustomMiddlewareBuilder } from '@/components/learn/interactive/dotnet/CustomMiddlewareBuilder';
import { IdentityArchitectureVisualizer } from '@/components/learn/interactive/dotnet/IdentityArchitectureVisualizer';
import { JwtTokenVisualizer } from '@/components/learn/interactive/dotnet/JwtTokenVisualizer';
import { AuthFlowDiagram } from '@/components/learn/interactive/dotnet/AuthFlowDiagram';
import { PolicyBuilder } from '@/components/learn/interactive/dotnet/PolicyBuilder';
import { CacheVisualization } from '@/components/learn/interactive/dotnet/CacheVisualization';

// Deployment Lesson Components
import { DockerDotnetVisualizer } from '@/components/learn/interactive/dotnet/DockerDotnetVisualizer';
import { AzureAppServiceExplorer } from '@/components/learn/interactive/dotnet/AzureAppServiceExplorer';
import { KubernetesClusterVisualizer } from '@/components/learn/interactive/dotnet/KubernetesClusterVisualizer';
import { AspireAppBuilder } from '@/components/learn/interactive/dotnet/AspireAppBuilder';

// Database Lesson Components
import { SqlQueryVisualizer } from '@/components/learn/interactive/dotnet/SqlQueryVisualizer';
import { SqlServerExplorer } from '@/components/learn/interactive/dotnet/SqlServerExplorer';
import { PostgresqlExplorer } from '@/components/learn/interactive/dotnet/PostgresqlExplorer';
import { DatabaseDesignVisualizer } from '@/components/learn/interactive/dotnet/DatabaseDesignVisualizer';
import { DbContextVisualizer } from '@/components/learn/interactive/dotnet/DbContextVisualizer';

// Dapper Lesson Components
import { DapperQueryVisualizer } from '@/components/learn/interactive/dotnet/DapperQueryVisualizer';
import { DapperCommandVisualizer } from '@/components/learn/interactive/dotnet/DapperCommandVisualizer';
import { DapperMultiMappingVisualizer } from '@/components/learn/interactive/dotnet/DapperMultiMappingVisualizer';
import { BlazorHostingVisualizer } from '@/components/learn/interactive/blazor/BlazorHostingVisualizer';

// CI/CD Lesson Components
import { GitHubActionsVisualizer } from '@/components/learn/interactive/dotnet/GitHubActionsVisualizer';
import { AzureDevOpsVisualizer } from '@/components/learn/interactive/dotnet/AzureDevOpsVisualizer';
import { CICDPipelineBuilder } from '@/components/learn/interactive/dotnet/CICDPipelineBuilder';

// Microservices Lesson Components
import { MicroservicesArchitectureVisualizer } from '@/components/learn/interactive/dotnet/MicroservicesArchitectureVisualizer';
import { ServiceCommunicationDemo } from '@/components/learn/interactive/dotnet/ServiceCommunicationDemo';
import { ApiGatewaySimulator } from '@/components/learn/interactive/dotnet/ApiGatewaySimulator';

// gRPC Lesson Components
import { GrpcVsRestComparison } from '@/components/learn/interactive/grpc/GrpcVsRestComparison';
import { GrpcArchitectureVisualizer } from '@/components/learn/interactive/grpc/GrpcArchitectureVisualizer';
import { ProtobufSchemaBuilder } from '@/components/learn/interactive/grpc/ProtobufSchemaBuilder';
import { GrpcServiceBuilder } from '@/components/learn/interactive/grpc/GrpcServiceBuilder';
import { StreamingPatternVisualizer } from '@/components/learn/interactive/grpc/StreamingPatternVisualizer';

// SQL Lesson Components
import {
  RdbmsConceptVisualizer,
  JoinVisualizer,
  SubqueryPlayground,
  TransactionSimulator,
  WindowFunctionExplorer,
  NumericFunctionExplorer,
  StringFunctionPlayground,
  DateTimeExplorer,
  ViewBuilder,
  IndexVisualizer,
  SecurityPermissionDemo,
  StoredProcedureBuilder,
  QueryOptimizer,
} from '@/components/learn/interactive/sql';

/**
 * MDX Components Configuration
 * This file provides custom components for MDX content rendering.
 * These components enable interactive, animated learning experiences.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Interactive learning components
    AnimatedDiagram,
    InteractiveDemo,
    InteractiveDemoPanel: InteractiveDemo,
    InfoBox,
    Quiz,
    Question,
    Answer,
    CodeExample,
    ProgressCheckpoint,
    KeyConcept,
    Comparison,

    // HTTP Lesson Components
    HttpConversation,
    HttpRequestBuilder,
    PacketInspector,

    // Domain Lesson Components
    AddressBarDeconstruction,
    DnsResolutionFlow,
    DnsRecordExplorerLegacy,

    // Hosting Lesson Components

    ServerArchitectureDiagram,

    // DNS Lesson Components
    DnsRecordExplorer,
    DnsResolutionSimulator,

    // Browser Lesson Components
    DomInspector,
    RenderingPipelineSimulator,

    // HTML Lesson Components
    LiveHtmlEditor,
    ElementExplorer,

    // Semantic HTML Lesson Components
    SemanticStructureBuilder,
    StructureComparison,

    // Forms Lesson Components
    FormBuilder,
    FormValidationTester,

    // Accessibility Lesson Components
    AccessibilityChecker,
    ScreenReaderSimulator,

    // SEO Lesson Components
    SeoPreview,
    MetaTagEditor,

    // JavaScript Lesson Components
    CodePlayground,
    VariableVisualizer,
    DomTreeVisualizer,
    DomManipulationSandbox,
    EventFlowSimulator,
    ApiRequestBuilder,
    ResponseInspector,
    ES6FeatureExplorer,
    ModuleDependencyVisualizer,
    SyntaxTransformer,
    ScopeChainVisualizer,
    HoistingSimulator,
    PrototypeChainExplorer,
    EventBubblingPlayground,
    EventLoopVisualizer,
    PromiseChainBuilder,
    AsyncTimeline,
    ErrorTypeExplorer,
    DebugSimulator,
    StackTraceAnalyzer,
    ArrayMethodVisualizer,
    MethodChainingPlayground,
    ObjectExplorer,
    RegexTester,
    PatternBuilder,
    StorageInspector,
    StorageComparison,
    JsUseCaseExplorer,
    JsTimelineExplorer,
    EcmaScriptVersionExplorer,
    TypeVisualizer,
    TypeofExplorer,
    BuiltInObjectExplorer,
    CallbackVisualizer,
    TimerPlayground,
    VariableNamingValidator,
    IndexedCollectionVisualizer,
    KeyedCollectionExplorer,
    JsonPlayground,
    ThisKeywordVisualizer,
    LoopVisualizer,
    FunctionVisualizer,
    TypeCastingVisualizer,
    EqualityComparisonVisualizer,
    JsControlFlowVisualizer,
    IteratorGeneratorVisualizer,
    YieldVisualizer,
    IterableBuilder,
    OperatorVisualizer,

    // React Lesson Components
    ReactPlayground,
    JsxTransformer,
    ComponentTreeVisualizer,
    DataFlowDiagram,
    PropsInspector,
    StateTimeline,
    ErrorBoundarySimulator,
    ErrorPropagationVisualizer,
    
    // Server Components Lesson Components
    ServerClientBoundaryVisualizer,
    ComponentTypeSelector,
    ServerDataFlowDiagram,

    // CSS Lesson Components
    BoxModelVisualizer,
    SelectorPlayground,
    FlexboxPlayground,
    GridPlayground,
    CssEditor,
    PositioningDemo,
    ColorMixer,
    AnimationBuilder,
    TransformPlayground,
    ResponsivePreview,
    SpecificityCalculator,
    AnimationTimeline,
    BrowserCompatibility,
    CssComparison,

    // Build Tools Lesson Components
    BuildPipelineVisualizer,
    PackageManagerSimulator,
    DependencyGraphExplorer,
    BundlerComparison,
    TranspilerDemo,
    ViteDevServerDemo,
    ViteConfigExplorer,
    EsbuildSpeedDemo,
    EsbuildConfigDemo,
    WebpackConceptVisualizer,

    // Testing Lesson Components
    TestRunnerSimulator,
    TestPyramidExplorer,
    MockingVisualizer,
    AssertionPlayground,
    ComponentTestSimulator,
    E2EFlowVisualizer,
    LocatorPlayground,
    PageObjectModelDemo,

    // Authentication Lesson Components
    OAuthPkceFlowSimulator,
    SessionVsTokenVisualizer,

    // .NET Lesson Components
    DotnetCodePreview,
    DependencyInjectionVisualizer,
    MiddlewarePipelineSimulator,
    EntityFrameworkVisualizer,
    DotnetApiEndpointBuilder,
    SolidPrincipleDemo,
    AspNetCoreIntroVisualizer,
    ProjectStructureExplorer,
    ConfigurationVisualizer,
    EnvironmentSwitcher,
    ControlFlowVisualizer,
    OopConceptVisualizer,
    CollectionExplorer,
    LinqQueryBuilder,
    WebApiControllerVisualizer,
    RoutingAttributeExplorer,
    ModelBindingVisualizer,
    ResponseFormattingDemo,
    MinimalApiBuilder,
    ServiceLifetimeDemo,
    DIContainerExplorer,
    DIPatternShowcase,
    BuiltInMiddlewareExplorer,
    CustomMiddlewareBuilder,
    IdentityArchitectureVisualizer,
    JwtTokenVisualizer,
    AuthFlowDiagram,
    PolicyBuilder,
    CacheVisualization,

    // Deployment Lesson Components
    DockerDotnetVisualizer,
    AzureAppServiceExplorer,
    KubernetesClusterVisualizer,
    AspireAppBuilder,

    // Database Lesson Components
    SqlQueryVisualizer,
    SqlServerExplorer,
    PostgresqlExplorer,
    DatabaseDesignVisualizer,
    DbContextVisualizer,

    // Migration Lesson Components
    MigrationVisualizer: dynamic(() => import('@/components/learn/interactive/dotnet/MigrationVisualizer').then(mod => mod.MigrationVisualizer), { ssr: false }),

    // EF Core Lesson Components (from mdx-components/ef-core)
    // These provide enhanced visualizations for EF Core lessons
    ChangeTrackingVisualizer,
    RelationshipDiagram,
    QueryExecutionVisualizer,
    MigrationFlowDiagram,

    // Dapper Lesson Components
    DapperQueryVisualizer,
    DapperCommandVisualizer,
    DapperMultiMappingVisualizer,

    // Blazor Lesson Components
    BlazorHostingVisualizer,
    HostingTypeSelector,
    InteractiveCodeEditor: dynamic(() => import('@/components/learn/interactive/blazor/InteractiveCodeEditor').then(mod => mod.InteractiveCodeEditor), { ssr: false }),
    ComponentVisualizer: dynamic(() => import('@/components/learn/interactive/blazor/ComponentVisualizer').then(mod => mod.ComponentVisualizer), { ssr: false }),
    JSInteropVisualizer: dynamic(() => import('@/components/learn/interactive/blazor/JSInteropVisualizer').then(mod => mod.JSInteropVisualizer), { ssr: false }),
    ComponentDataFlowVisualizer: dynamic(() => import('@/components/learn/interactive/blazor/ComponentDataFlowVisualizer').then(mod => mod.ComponentDataFlowVisualizer), { ssr: false }),
    JSModuleVisualizer: dynamic(() => import('@/components/learn/interactive/blazor/JSModuleVisualizer').then(mod => mod.JSModuleVisualizer), { ssr: false }),


    // CI/CD Lesson Components
    GitHubActionsVisualizer,
    AzureDevOpsVisualizer,
    CICDPipelineBuilder,

    // Microservices Lesson Components
    MicroservicesArchitectureVisualizer,
    ServiceCommunicationDemo,
    ApiGatewaySimulator,

    // gRPC Lesson Components
    GrpcVsRestComparison,
    GrpcArchitectureVisualizer,
    ProtobufSchemaBuilder,
    GrpcServiceBuilder,
    StreamingPatternVisualizer,

    // SQL Lesson Components
    RdbmsConceptVisualizer,
    JoinVisualizer,
    SubqueryPlayground,
    TransactionSimulator,
    WindowFunctionExplorer,
    NumericFunctionExplorer,
    StringFunctionPlayground,
    DateTimeExplorer,
    ViewBuilder,
    IndexVisualizer,
    SecurityPermissionDemo,
    StoredProcedureBuilder,
    QueryOptimizer,

    // Enhanced HTML elements with proper styling
    h1: ({ children, ...props }) => (
      <h1
        className="text-3xl font-bold mt-8 mb-4 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className="text-2xl font-semibold mt-8 mb-3 text-foreground border-b border-border pb-2 scroll-mt-20"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className="text-xl font-semibold mt-6 mb-2 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className="text-lg font-medium mt-4 mb-2 text-foreground scroll-mt-20"
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...props }) => (
      <p className="text-base text-muted-foreground leading-7 mb-4" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-muted-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-muted-foreground" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-7" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4"
        {...props}
      >
        {children}
      </blockquote>
    ),
    code: ({ children, className, ...props }) => {
      // If this code element is inside a pre (code block), don't render inline styles
      // The pre handler will take care of it
      const isCodeBlock = className?.startsWith('language-');
      
      if (isCodeBlock) {
        return <code className={className} {...props}>{children}</code>;
      }
      
      // Inline code
      return (
        <code
          className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => {
      // Extract code element from children
      const codeElement = children as any;
      
      // Check if this is a code block (has a code child with className)
      if (
        codeElement?.props?.className?.startsWith('language-') &&
        typeof codeElement?.props?.children === 'string'
      ) {
        return (
          <EnhancedCodeBlock
            className={codeElement.props.className}
            {...props}
          >
            {codeElement.props.children}
          </EnhancedCodeBlock>
        );
      }
      
      // Fallback for non-code-block pre elements
      return (
        <pre
          className="bg-secondary/50 border border-border rounded-xl p-4 overflow-x-auto my-4"
          {...props}
        >
          {children}
        </pre>
      );
    },
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    hr: (props) => <hr className="border-border my-8" {...props} />,
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse border border-border" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="border border-border bg-secondary/50 px-4 py-2 text-left font-semibold text-foreground"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border border-border px-4 py-2 text-muted-foreground" {...props}>
        {children}
      </td>
    ),
    ...components,
  };
}
