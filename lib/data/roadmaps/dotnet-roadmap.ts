import type { CreateRoadmap } from '@/lib/db/schemas/roadmap';

/**
 * .NET Developer Roadmap
 * Comprehensive learning path for ASP.NET Core and .NET development
 *
 * Layout: Vertical flow with horizontal branching
 * Node positions are on a grid: x in steps of 200, y in steps of 120
 */
export const dotnetRoadmap: CreateRoadmap = {
  slug: 'dotnet',
  title: '.NET Developer',
  description:
    'Step by step guide to becoming a modern .NET developer. Learn C#, ASP.NET Core, Entity Framework, Web APIs, and enterprise patterns.',
  category: 'dotnet',
  version: '2025.1',
  estimatedHours: 250,
  difficulty: 6,
  prerequisites: [],
  isActive: true,
  nodes: [
    // === ROW 0: C# BASICS ===
    {
      id: 'csharp-basics',
      title: 'C# Basics',
      description:
        'Master the C# programming language - the foundation of all .NET development.',
      type: 'milestone',
      position: { x: 400, y: 0 },
      learningObjectives: [
        { title: 'Variables & Data Types', lessonId: 'variables-data-types' },
        { title: 'Control Flow (if/else, switch)', lessonId: 'control-flow' },
        { title: 'OOP Basics (Classes, Objects)', lessonId: 'oop-basics' },
        { title: 'Collections (List, Dictionary)', lessonId: 'collections' },
        { title: 'LINQ Introduction', lessonId: 'linq-introduction' },
      ],
      resources: [
        {
          title: 'Microsoft Learn: C# Fundamentals',
          url: 'https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/',
          type: 'documentation',
          description: 'Official Microsoft C# learning path',
        },
        {
          title: 'C# 12 Documentation',
          url: 'https://learn.microsoft.com/en-us/dotnet/csharp/',
          type: 'documentation',
          description: 'Official C# language reference',
        },
        {
          title: 'freeCodeCamp C# Course',
          url: 'https://www.youtube.com/watch?v=GhQdlIFylQ8',
          type: 'video',
          description: 'Free comprehensive C# tutorial',
        },
      ],
      estimatedMinutes: 480,
      difficulty: 3,
      skillCluster: 'backend',
      tags: ['csharp', 'dotnet', 'basics', 'programming'],
    },

    // === ROW 1: ASP.NET CORE BASICS ===
    {
      id: 'aspnet-core-basics',
      title: 'ASP.NET Core Basics',
      description:
        'Learn the fundamentals of ASP.NET Core - the modern, cross-platform web framework.',
      type: 'milestone',
      position: { x: 400, y: 120 },
      learningObjectives: [
        { title: 'What is ASP.NET Core?', lessonId: 'what-is-aspnet-core' },
        { title: 'Project Structure', lessonId: 'project-structure' },
        { title: 'Program.cs & Startup', lessonId: 'program-startup' },
        { title: 'Configuration & Settings', lessonId: 'configuration' },
        { title: 'Environments (Dev, Staging, Prod)', lessonId: 'environments' },
      ],
      resources: [
        {
          title: 'ASP.NET Core Documentation',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/',
          type: 'documentation',
          description: 'Official ASP.NET Core docs',
        },
        {
          title: 'ASP.NET Core Fundamentals',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/',
          type: 'documentation',
          description: 'Core concepts and architecture',
        },
      ],
      estimatedMinutes: 300,
      difficulty: 4,
      skillCluster: 'backend',
      tags: ['aspnet', 'core', 'web', 'framework'],
    },

    // === ROW 2: SOLID PRINCIPLES ===
    {
      id: 'solid-principles',
      title: 'SOLID Principles',
      description:
        'Master the five principles of object-oriented design for maintainable code.',
      type: 'milestone',
      position: { x: 400, y: 240 },
      learningObjectives: [
        { title: 'Single Responsibility Principle', lessonId: 'single-responsibility' },
        { title: 'Open/Closed Principle', lessonId: 'open-closed' },
        { title: 'Liskov Substitution Principle', lessonId: 'liskov-substitution' },
        { title: 'Interface Segregation Principle', lessonId: 'interface-segregation' },
        { title: 'Dependency Inversion Principle', lessonId: 'dependency-inversion' },
      ],
      resources: [
        {
          title: 'SOLID Principles in C#',
          url: 'https://learn.microsoft.com/en-us/archive/msdn-magazine/2014/may/csharp-best-practices-dangers-of-violating-solid-principles-in-csharp',
          type: 'article',
          description: 'Microsoft article on SOLID in C#',
        },
      ],
      estimatedMinutes: 180,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['solid', 'design-patterns', 'architecture'],
    },

    // === ROW 3: DEPENDENCY INJECTION ===
    {
      id: 'dependency-injection',
      title: 'Dependency Injection',
      description:
        'Learn the built-in DI container in ASP.NET Core for loosely coupled applications.',
      type: 'milestone',
      position: { x: 400, y: 360 },
      learningObjectives: [
        { title: 'DI Fundamentals', lessonId: 'di-fundamentals' },
        { title: 'Service Lifetimes (Singleton, Scoped, Transient)', lessonId: 'service-lifetimes' },
        { title: 'Built-in DI Container', lessonId: 'builtin-di-container' },
        { title: 'DI Patterns & Best Practices', lessonId: 'di-patterns' },
      ],
      resources: [
        {
          title: 'Dependency Injection in ASP.NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection',
          type: 'documentation',
          description: 'Official DI documentation',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['dependency-injection', 'di', 'ioc'],
    },

    // === ROW 4: DATABASES + ORMS ===
    {
      id: 'databases',
      title: 'Databases',
      description:
        'Learn database fundamentals including SQL Server and PostgreSQL.',
      type: 'topic',
      position: { x: 200, y: 480 },
      learningObjectives: [
        { title: 'SQL Fundamentals', lessonId: 'sql-fundamentals' },
        { title: 'SQL Server Basics', lessonId: 'sql-server-basics' },
        { title: 'PostgreSQL Basics', lessonId: 'postgresql-basics' },
        { title: 'Database Design', lessonId: 'database-design' },
      ],
      resources: [
        {
          title: 'SQL Server Documentation',
          url: 'https://learn.microsoft.com/en-us/sql/',
          type: 'documentation',
          description: 'Official SQL Server docs',
        },
        {
          title: 'PostgreSQL Tutorial',
          url: 'https://www.postgresqltutorial.com/',
          type: 'documentation',
          description: 'Comprehensive PostgreSQL guide',
        },
      ],
      estimatedMinutes: 240,
      difficulty: 4,
      skillCluster: 'backend',
      tags: ['database', 'sql', 'sql-server', 'postgresql'],
    },
    {
      id: 'entity-framework-core',
      title: 'Entity Framework Core',
      description:
        'Master the powerful ORM for .NET - Entity Framework Core.',
      type: 'milestone',
      position: { x: 600, y: 480 },
      learningObjectives: [
        { title: 'DbContext & DbSet', lessonId: 'dbcontext-dbset' },
        { title: 'Code-First Migrations', lessonId: 'code-first-migrations' },
        { title: 'Querying Data with LINQ', lessonId: 'querying-with-linq' },
        { title: 'Relationships (1:1, 1:N, N:N)', lessonId: 'ef-relationships' },
        { title: 'EF Core Performance', lessonId: 'ef-performance' },
      ],
      resources: [
        {
          title: 'Entity Framework Core Documentation',
          url: 'https://learn.microsoft.com/en-us/ef/core/',
          type: 'documentation',
          description: 'Official EF Core docs',
        },
        {
          title: 'Getting Started with EF Core',
          url: 'https://learn.microsoft.com/en-us/ef/core/get-started/overview/first-app',
          type: 'documentation',
          description: 'EF Core quick start tutorial',
        },
      ],
      estimatedMinutes: 360,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['ef-core', 'orm', 'database'],
    },

    // === ROW 5: DAPPER + WEB APIS ===
    {
      id: 'dapper',
      title: 'Dapper',
      description:
        'Learn Dapper - the micro ORM for high-performance data access.',
      type: 'optional',
      position: { x: 200, y: 600 },
      learningObjectives: [
        { title: 'Dapper Basics', lessonId: 'dapper-basics' },
        { title: 'Queries & Commands', lessonId: 'dapper-queries' },
        { title: 'Multi-Mapping', lessonId: 'dapper-multi-mapping' },
      ],
      resources: [
        {
          title: 'Dapper Documentation',
          url: 'https://www.learndapper.com/',
          type: 'documentation',
          description: 'Dapper learning resources',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 4,
      skillCluster: 'backend',
      tags: ['dapper', 'orm', 'micro-orm'],
    },
    {
      id: 'web-apis',
      title: 'Web APIs',
      description:
        'Build RESTful APIs with ASP.NET Core Web API.',
      type: 'milestone',
      position: { x: 600, y: 600 },
      learningObjectives: [
        { title: 'Controllers & Actions', lessonId: 'controllers-actions' },
        { title: 'Routing & Attributes', lessonId: 'api-routing' },
        { title: 'Model Binding & Validation', lessonId: 'model-binding' },
        { title: 'Response Formatting', lessonId: 'response-formatting' },
        { title: 'Minimal APIs', lessonId: 'minimal-apis' },
      ],
      resources: [
        {
          title: 'Create Web APIs with ASP.NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/web-api/',
          type: 'documentation',
          description: 'Official Web API documentation',
        },
        {
          title: 'Minimal APIs Overview',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview',
          type: 'documentation',
          description: 'Modern minimal API approach',
        },
      ],
      estimatedMinutes: 300,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['web-api', 'rest', 'controllers'],
    },

    // === ROW 6: MIDDLEWARE + REST DESIGN ===
    {
      id: 'middleware',
      title: 'Middleware',
      description:
        'Understand the ASP.NET Core request pipeline and middleware.',
      type: 'topic',
      position: { x: 200, y: 720 },
      learningObjectives: [
        { title: 'Request Pipeline', lessonId: 'request-pipeline' },
        { title: 'Built-in Middleware', lessonId: 'builtin-middleware' },
        { title: 'Custom Middleware', lessonId: 'custom-middleware' },
      ],
      resources: [
        {
          title: 'ASP.NET Core Middleware',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/',
          type: 'documentation',
          description: 'Official middleware documentation',
        },
      ],
      estimatedMinutes: 120,
      difficulty: 4,
      skillCluster: 'backend',
      tags: ['middleware', 'pipeline', 'request'],
    },
    {
      id: 'rest-design',
      title: 'REST API Design',
      description:
        'Learn REST principles and API design best practices.',
      type: 'milestone',
      position: { x: 600, y: 720 },
      learningObjectives: [
        { title: 'REST Principles', lessonId: 'rest-principles' },
        { title: 'HTTP Methods & Status Codes', lessonId: 'http-methods' },
        { title: 'API Versioning', lessonId: 'api-versioning' },
        { title: 'OpenAPI / Swagger', lessonId: 'openapi-swagger' },
      ],
      resources: [
        {
          title: 'REST API Design Best Practices',
          url: 'https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design',
          type: 'documentation',
          description: 'Microsoft API design guide',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['rest', 'api-design', 'swagger'],
    },

    // === ROW 7: AUTHENTICATION + SIGNALR ===
    {
      id: 'authentication',
      title: 'Authentication & Authorization',
      description:
        'Secure your applications with identity, JWT, and OAuth.',
      type: 'milestone',
      position: { x: 200, y: 840 },
      learningObjectives: [
        { title: 'ASP.NET Core Identity', lessonId: 'aspnet-identity' },
        { title: 'JWT Authentication', lessonId: 'jwt-authentication' },
        { title: 'OAuth 2.0 & OpenID Connect', lessonId: 'oauth-openid' },
        { title: 'Authorization Policies', lessonId: 'authorization-policies' },
      ],
      resources: [
        {
          title: 'ASP.NET Core Security',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/security/',
          type: 'documentation',
          description: 'Official security documentation',
        },
      ],
      estimatedMinutes: 240,
      difficulty: 6,
      skillCluster: 'backend',
      tags: ['auth', 'jwt', 'oauth', 'identity'],
    },
    {
      id: 'signalr',
      title: 'SignalR (Real-time)',
      description:
        'Build real-time web applications with SignalR.',
      type: 'topic',
      position: { x: 600, y: 840 },
      learningObjectives: [
        { title: 'SignalR Fundamentals', lessonId: 'signalr-fundamentals' },
        { title: 'Hubs & Clients', lessonId: 'hubs-clients' },
        { title: 'Groups & Broadcasting', lessonId: 'groups-broadcasting' },
      ],
      resources: [
        {
          title: 'SignalR Documentation',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/signalr/',
          type: 'documentation',
          description: 'Official SignalR documentation',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 5,
      skillCluster: 'backend',
      tags: ['signalr', 'real-time', 'websockets'],
    },

    // === ROW 8: CACHING + LOGGING ===
    {
      id: 'caching',
      title: 'Caching',
      description:
        'Improve performance with in-memory and distributed caching.',
      type: 'topic',
      position: { x: 200, y: 960 },
      learningObjectives: [
        { title: 'In-Memory Caching', lessonId: 'memory-caching' },
        { title: 'Distributed Caching (Redis)', lessonId: 'redis-caching' },
        { title: 'Response Caching', lessonId: 'response-caching' },
      ],
      resources: [
        {
          title: 'Caching in ASP.NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/performance/caching/',
          type: 'documentation',
          description: 'Official caching documentation',
        },
      ],
      estimatedMinutes: 120,
      difficulty: 4,
      skillCluster: 'backend',
      tags: ['caching', 'redis', 'performance'],
    },
    {
      id: 'logging',
      title: 'Logging',
      description:
        'Implement structured logging with built-in and third-party providers.',
      type: 'topic',
      position: { x: 600, y: 960 },
      learningObjectives: [
        { title: 'Built-in Logging', lessonId: 'builtin-logging' },
        { title: 'Serilog', lessonId: 'serilog' },
        { title: 'Structured Logging', lessonId: 'structured-logging' },
      ],
      resources: [
        {
          title: 'Logging in .NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/logging/',
          type: 'documentation',
          description: 'Official logging documentation',
        },
      ],
      estimatedMinutes: 90,
      difficulty: 3,
      skillCluster: 'backend',
      tags: ['logging', 'serilog', 'observability'],
    },

    // === ROW 9: TESTING ===
    {
      id: 'testing',
      title: 'Testing',
      description:
        'Write unit tests, integration tests, and use testing frameworks.',
      type: 'milestone',
      position: { x: 400, y: 1080 },
      learningObjectives: [
        { title: 'xUnit Testing Framework', lessonId: 'xunit-testing' },
        { title: 'Unit Testing Best Practices', lessonId: 'unit-testing' },
        { title: 'Integration Testing', lessonId: 'integration-testing' },
        { title: 'Mocking with Moq', lessonId: 'mocking-moq' },
      ],
      resources: [
        {
          title: 'Testing in ASP.NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/test/',
          type: 'documentation',
          description: 'Official testing documentation',
        },
        {
          title: 'xUnit Documentation',
          url: 'https://xunit.net/',
          type: 'documentation',
          description: 'xUnit testing framework',
        },
      ],
      estimatedMinutes: 240,
      difficulty: 5,
      skillCluster: 'testing',
      tags: ['testing', 'xunit', 'moq'],
    },

    // === ROW 10: CI/CD + DEPLOYMENT ===
    {
      id: 'cicd',
      title: 'CI/CD Pipelines',
      description:
        'Automate build, test, and deployment with GitHub Actions and Azure DevOps.',
      type: 'topic',
      position: { x: 200, y: 1200 },
      learningObjectives: [
        { title: 'GitHub Actions for .NET', lessonId: 'github-actions' },
        { title: 'Azure DevOps Pipelines', lessonId: 'azure-devops' },
        { title: 'Build & Release Automation', lessonId: 'build-automation' },
      ],
      resources: [
        {
          title: 'GitHub Actions for .NET',
          url: 'https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-net',
          type: 'documentation',
          description: 'Official GitHub Actions docs',
        },
      ],
      estimatedMinutes: 150,
      difficulty: 5,
      skillCluster: 'devops',
      tags: ['cicd', 'github-actions', 'devops'],
    },
    {
      id: 'deployment',
      title: 'Deployment',
      description:
        'Deploy .NET applications to Azure, Docker, and Kubernetes.',
      type: 'milestone',
      position: { x: 600, y: 1200 },
      learningObjectives: [
        { title: 'Docker for .NET', lessonId: 'docker-dotnet' },
        { title: 'Azure App Service', lessonId: 'azure-app-service' },
        { title: 'Kubernetes Basics', lessonId: 'kubernetes-basics' },
      ],
      resources: [
        {
          title: 'Host and Deploy ASP.NET Core',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/',
          type: 'documentation',
          description: 'Official deployment documentation',
        },
        {
          title: 'Containerize .NET Apps',
          url: 'https://learn.microsoft.com/en-us/dotnet/core/docker/',
          type: 'documentation',
          description: 'Docker containerization guide',
        },
      ],
      estimatedMinutes: 240,
      difficulty: 6,
      skillCluster: 'devops',
      tags: ['deployment', 'docker', 'azure', 'kubernetes'],
    },

    // === ROW 11: ADVANCED TOPICS ===
    {
      id: 'blazor',
      title: 'Blazor',
      description:
        'Build interactive web UIs using C# instead of JavaScript.',
      type: 'optional',
      position: { x: 200, y: 1320 },
      learningObjectives: [
        { title: 'Blazor Server vs WebAssembly', lessonId: 'blazor-hosting' },
        { title: 'Components & Data Binding', lessonId: 'blazor-components' },
        { title: 'JavaScript Interop', lessonId: 'blazor-js-interop' },
      ],
      resources: [
        {
          title: 'Blazor Documentation',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/blazor/',
          type: 'documentation',
          description: 'Official Blazor documentation',
        },
      ],
      estimatedMinutes: 300,
      difficulty: 6,
      skillCluster: 'frontend',
      tags: ['blazor', 'webassembly', 'spa'],
    },
    {
      id: 'microservices',
      title: 'Microservices',
      description:
        'Design and build distributed microservices architectures.',
      type: 'optional',
      position: { x: 400, y: 1320 },
      learningObjectives: [
        { title: 'Microservices Principles', lessonId: 'microservices-principles' },
        { title: 'Service Communication', lessonId: 'service-communication' },
        { title: 'API Gateway Pattern', lessonId: 'api-gateway' },
      ],
      resources: [
        {
          title: '.NET Microservices',
          url: 'https://learn.microsoft.com/en-us/dotnet/architecture/microservices/',
          type: 'documentation',
          description: 'Microservices architecture guide',
        },
      ],
      estimatedMinutes: 360,
      difficulty: 7,
      skillCluster: 'system-design',
      tags: ['microservices', 'distributed', 'architecture'],
    },
    {
      id: 'grpc',
      title: 'gRPC',
      description:
        'High-performance RPC framework for service-to-service communication.',
      type: 'optional',
      position: { x: 600, y: 1320 },
      learningObjectives: [
        { title: 'gRPC Fundamentals', lessonId: 'grpc-fundamentals' },
        { title: 'Protocol Buffers', lessonId: 'protobuf' },
        { title: 'gRPC in ASP.NET Core', lessonId: 'grpc-aspnet' },
      ],
      resources: [
        {
          title: 'gRPC on .NET',
          url: 'https://learn.microsoft.com/en-us/aspnet/core/grpc/',
          type: 'documentation',
          description: 'Official gRPC documentation',
        },
      ],
      estimatedMinutes: 180,
      difficulty: 6,
      skillCluster: 'backend',
      tags: ['grpc', 'rpc', 'protobuf'],
    },
  ],

  edges: [
    // Main vertical flow
    { id: 'e1', source: 'csharp-basics', target: 'aspnet-core-basics', type: 'sequential' },
    { id: 'e2', source: 'aspnet-core-basics', target: 'solid-principles', type: 'sequential' },
    { id: 'e3', source: 'solid-principles', target: 'dependency-injection', type: 'sequential' },

    // After DI - split to databases and EF Core
    { id: 'e4', source: 'dependency-injection', target: 'databases', type: 'recommended' },
    { id: 'e5', source: 'dependency-injection', target: 'entity-framework-core', type: 'sequential' },

    // Database path
    { id: 'e6', source: 'databases', target: 'dapper', type: 'optional' },

    // EF Core to Web APIs
    { id: 'e7', source: 'entity-framework-core', target: 'web-apis', type: 'sequential' },

    // Web APIs to middleware and REST design
    { id: 'e8', source: 'web-apis', target: 'middleware', type: 'recommended' },
    { id: 'e9', source: 'web-apis', target: 'rest-design', type: 'sequential' },

    // REST design to auth and SignalR
    { id: 'e10', source: 'rest-design', target: 'authentication', type: 'sequential' },
    { id: 'e11', source: 'rest-design', target: 'signalr', type: 'recommended' },

    // Auth to caching and logging
    { id: 'e12', source: 'authentication', target: 'caching', type: 'recommended' },
    { id: 'e13', source: 'authentication', target: 'logging', type: 'recommended' },

    // Converge to testing
    { id: 'e14', source: 'caching', target: 'testing', type: 'recommended' },
    { id: 'e15', source: 'logging', target: 'testing', type: 'sequential' },

    // Testing to CI/CD and deployment
    { id: 'e16', source: 'testing', target: 'cicd', type: 'recommended' },
    { id: 'e17', source: 'testing', target: 'deployment', type: 'sequential' },

    // Advanced topics
    { id: 'e18', source: 'deployment', target: 'blazor', type: 'optional' },
    { id: 'e19', source: 'deployment', target: 'microservices', type: 'optional' },
    { id: 'e20', source: 'deployment', target: 'grpc', type: 'optional' },
  ],
};
