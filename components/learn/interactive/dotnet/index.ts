// .NET Interactive Components for Learning Lessons
// All components support beginner, intermediate, and advanced modes

export { DotnetCodePreview } from './DotnetCodePreview';
export { DependencyInjectionVisualizer } from './DependencyInjectionVisualizer';
export { MiddlewarePipelineSimulator } from './MiddlewarePipelineSimulator';
export { EntityFrameworkVisualizer } from './EntityFrameworkVisualizer';
export { ApiEndpointBuilder } from './ApiEndpointBuilder';
export { SolidPrincipleDemo } from './SolidPrincipleDemo';

// EF Core Components
export { DbContextVisualizer } from './DbContextVisualizer';
export { MigrationVisualizer } from './MigrationVisualizer';
export { RelationshipDiagram } from './RelationshipDiagram';
export { PerformanceAnalyzer } from './PerformanceAnalyzer';

// C# Basics Components
export { ControlFlowVisualizer } from './ControlFlowVisualizer';
export { OopConceptVisualizer } from './OopConceptVisualizer';
export { CollectionExplorer } from './CollectionExplorer';
export { LinqQueryBuilder } from './LinqQueryBuilder';

export { AspNetCoreIntroVisualizer } from './AspNetCoreIntroVisualizer';
export { ProjectStructureExplorer } from './ProjectStructureExplorer';
export { ConfigurationVisualizer } from './ConfigurationVisualizer';
export { EnvironmentSwitcher } from './EnvironmentSwitcher';

// Web API Components
export { WebApiControllerVisualizer } from './WebApiControllerVisualizer';
export { RoutingAttributeExplorer } from './RoutingAttributeExplorer';
export { ModelBindingVisualizer } from './ModelBindingVisualizer';
export { ResponseFormattingDemo } from './ResponseFormattingDemo';
export { MinimalApiBuilder } from './MinimalApiBuilder';

// Dependency Injection Components
export { ServiceLifetimeDemo } from './ServiceLifetimeDemo';
export { DIContainerExplorer } from './DIContainerExplorer';
export { DIPatternShowcase } from './DIPatternShowcase';

// Middleware Components
export { BuiltInMiddlewareExplorer } from './BuiltInMiddlewareExplorer';
export { CustomMiddlewareBuilder } from './CustomMiddlewareBuilder';

// Authentication Components
export { IdentityArchitectureVisualizer } from './IdentityArchitectureVisualizer';
export { JwtTokenVisualizer } from './JwtTokenVisualizer';
export { AuthFlowDiagram } from './AuthFlowDiagram';
export { PolicyBuilder } from './PolicyBuilder';

// Types exports
export type { DotnetCodePreviewProps, CodeStep } from './DotnetCodePreview';
export type { DependencyInjectionVisualizerProps, ServiceLifetime, Service } from './DependencyInjectionVisualizer';
export type { MiddlewarePipelineSimulatorProps, MiddlewareItem } from './MiddlewarePipelineSimulator';
export type { EntityFrameworkVisualizerProps, EntityExample } from './EntityFrameworkVisualizer';
export type { ApiEndpointBuilderProps, ApiEndpoint, HttpMethod } from './ApiEndpointBuilder';
export type { SolidPrincipleDemoProps, SolidPrinciple, CodeComparison } from './SolidPrincipleDemo';
export type { ControlFlowVisualizerProps, FlowType } from './ControlFlowVisualizer';
export type { OopConceptVisualizerProps, DemoType, ClassDefinition, ObjectInstance } from './OopConceptVisualizer';
export type { CollectionExplorerProps, CollectionType } from './CollectionExplorer';
export type { LinqQueryBuilderProps, LinqOperator, DataItem } from './LinqQueryBuilder';
export type { AspNetCoreIntroVisualizerProps } from './AspNetCoreIntroVisualizer';
export type { ProjectStructureExplorerProps } from './ProjectStructureExplorer';
export type { ConfigurationVisualizerProps } from './ConfigurationVisualizer';
export type { EnvironmentSwitcherProps } from './EnvironmentSwitcher';

// EF Core Types
export type { DbContextVisualizerProps, Entity } from './DbContextVisualizer';
export type { MigrationVisualizerProps, Migration } from './MigrationVisualizer';
export type { RelationshipDiagramProps, RelationshipType } from './RelationshipDiagram';
export type { PerformanceAnalyzerProps, PerformanceScenario } from './PerformanceAnalyzer';

// Web API Types
export type { WebApiControllerVisualizerProps, ControllerAction } from './WebApiControllerVisualizer';
export type { RoutingAttributeExplorerProps, RouteTemplate } from './RoutingAttributeExplorer';
export type { ModelBindingVisualizerProps, BindingSource, BindingParameter } from './ModelBindingVisualizer';
export type { ResponseFormattingDemoProps, ResponseFormat, ActionResultType } from './ResponseFormattingDemo';
export type { MinimalApiBuilderProps, MinimalEndpoint } from './MinimalApiBuilder';

export type { ServiceLifetimeDemoProps } from './ServiceLifetimeDemo';
export type { DIContainerExplorerProps } from './DIContainerExplorer';
export type { DIPatternShowcaseProps, DIPattern } from './DIPatternShowcase';

// Database Components
export { SqlQueryVisualizer } from './SqlQueryVisualizer';
export { SqlServerExplorer } from './SqlServerExplorer';
export { PostgresqlExplorer } from './PostgresqlExplorer';
export { DatabaseDesignVisualizer } from './DatabaseDesignVisualizer';

// Database Types
export type { SqlQueryVisualizerProps, QueryType, TableRow } from './SqlQueryVisualizer';
export type { SqlServerExplorerProps } from './SqlServerExplorer';
export type { PostgresqlExplorerProps } from './PostgresqlExplorer';
export type { DatabaseDesignVisualizerProps, RelationshipType as DbRelationshipType, NormalizationLevel } from './DatabaseDesignVisualizer';

// Middleware Types
export type { BuiltInMiddlewareExplorerProps } from './BuiltInMiddlewareExplorer';
export type { CustomMiddlewareBuilderProps } from './CustomMiddlewareBuilder';

// Authentication Types
export type { IdentityArchitectureVisualizerProps } from './IdentityArchitectureVisualizer';
export type { JwtTokenVisualizerProps } from './JwtTokenVisualizer';
export type { AuthFlowDiagramProps } from './AuthFlowDiagram';
export type { PolicyBuilderProps } from './PolicyBuilder';

// Deployment Components
export { DockerDotnetVisualizer } from './DockerDotnetVisualizer';
export { AzureAppServiceExplorer } from './AzureAppServiceExplorer';
export { KubernetesClusterVisualizer } from './KubernetesClusterVisualizer';
export { AspireAppBuilder } from './AspireAppBuilder';

// Deployment Types
export type { DockerDotnetVisualizerProps } from './DockerDotnetVisualizer';
export type { AzureAppServiceExplorerProps } from './AzureAppServiceExplorer';
export type { KubernetesClusterVisualizerProps } from './KubernetesClusterVisualizer';
export type { AspireAppBuilderProps } from './AspireAppBuilder';

// CI/CD Components
export { GitHubActionsVisualizer } from './GitHubActionsVisualizer';
export { AzureDevOpsVisualizer } from './AzureDevOpsVisualizer';
export { CICDPipelineBuilder } from './CICDPipelineBuilder';

// CI/CD Types
export type { GitHubActionsVisualizerProps } from './GitHubActionsVisualizer';
export type { AzureDevOpsVisualizerProps } from './AzureDevOpsVisualizer';
export type { CICDPipelineBuilderProps } from './CICDPipelineBuilder';

// Microservices Components
export { MicroservicesArchitectureVisualizer } from './MicroservicesArchitectureVisualizer';
export { ServiceCommunicationDemo } from './ServiceCommunicationDemo';
export { ApiGatewaySimulator } from './ApiGatewaySimulator';

// Microservices Types
export type { MicroservicesArchitectureVisualizerProps } from './MicroservicesArchitectureVisualizer';
export type { ServiceCommunicationDemoProps } from './ServiceCommunicationDemo';
export type { ApiGatewaySimulatorProps } from './ApiGatewaySimulator';

export {DapperQueryVisualizer} from './DapperQueryVisualizer';
export {DapperCommandVisualizer} from './DapperCommandVisualizer';
export {DapperMultiMappingVisualizer} from './DapperMultiMappingVisualizer';
export { CacheVisualization } from './CacheVisualization';