import type { CreateRoadmap } from '@/lib/db/schemas/roadmap';

/**
 * Frontend Developer Roadmap

 * 
 * Layout: Vertical flow with horizontal branching
 * Node positions are on a grid: x in steps of 200, y in steps of 120
 */
export const frontendRoadmap: CreateRoadmap = {
  slug: 'frontend',
  title: 'Front-end Developer',
  description: 'Step by step guide to becoming a modern frontend developer in 2024. Learn HTML, CSS, JavaScript, and modern frameworks.',
  category: 'frontend',
  version: '2024.1',
  estimatedHours: 200,
  difficulty: 5,
  prerequisites: [],
  isActive: true,
  nodes: [
    // === ROW 0: FOUNDATION ===
    {
      id: 'internet',
      title: 'Internet',
      description: 'Learn how the internet works, what is HTTP, browsers, DNS, and hosting.',
      type: 'milestone',
      position: { x: 400, y: 0 },
      learningObjectives: [
        'How does the Internet work?',
        'What is HTTP?',
        'What is a Domain Name?',
        'What is Hosting?',
        'DNS and how it works?',
        'Browsers and how they work?',
      ],
      resources: [
        { title: 'How Does the Internet Work?', type: 'article', description: 'MDN Web Docs explanation' },
        { title: 'HTTP Crash Course', type: 'video', description: 'YouTube tutorial on HTTP basics' },
      ],
      estimatedMinutes: 120,
      difficulty: 2,
      skillCluster: 'frontend',
      tags: ['basics', 'web-fundamentals'],
    },
    
    // === ROW 1: HTML ===
    {
      id: 'html',
      title: 'HTML',
      description: 'Learn the basics of HTML including semantic HTML, forms, and accessibility.',
      type: 'milestone',
      position: { x: 400, y: 120 },
      subRoadmapSlug: 'html-basics',
      learningObjectives: [
        'Learn the basics',
        'Writing Semantic HTML',
        'Forms and Validations',
        'Accessibility',
        'SEO Basics',
      ],
      resources: [
        { title: 'HTML Living Standard', type: 'documentation', description: 'WHATWG specification' },
        { title: 'freeCodeCamp HTML Course', type: 'video', description: 'Complete HTML tutorial' },
      ],
      estimatedMinutes: 300,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['html', 'markup', 'fundamentals'],
    },

    // === ROW 2: CSS ===
    {
      id: 'css',
      title: 'CSS',
      description: 'Master CSS for styling web pages including layouts, responsive design, and animations.',
      type: 'milestone',
      position: { x: 400, y: 240 },
      subRoadmapSlug: 'css-fundamentals',
      learningObjectives: [
        'Learn the basics',
        'Making Layouts',
        'Responsive Design',
      ],
      resources: [
        { title: 'CSS MDN Docs', type: 'documentation', description: 'Complete CSS reference' },
        { title: 'CSS-Tricks', type: 'article', description: 'Tips and tutorials' },
      ],
      estimatedMinutes: 480,
      difficulty: 4,
      skillCluster: 'frontend',
      tags: ['css', 'styling', 'layouts'],
    },

    // === ROW 3: JAVASCRIPT ===
    {
      id: 'javascript',
      title: 'JavaScript',
      description: 'Core JavaScript concepts including syntax, DOM manipulation, and async programming.',
      type: 'milestone',
      position: { x: 400, y: 360 },
      subRoadmapSlug: 'javascript-core',
      learningObjectives: [
        'Syntax and Basic Constructs',
        'Learn DOM Manipulation',
        'Learn Fetch API / Ajax (XHR)',
        'ES6+ and modular JavaScript',
        'Understand Hoisting, Event Bubbling, Scope, Prototype',
      ],
      resources: [
        { title: 'JavaScript.info', type: 'documentation', description: 'Modern JavaScript Tutorial' },
        { title: 'Eloquent JavaScript', type: 'book', description: 'Free online book' },
      ],
      estimatedMinutes: 600,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['javascript', 'programming', 'core'],
    },

    // === ROW 4: VERSION CONTROL + PACKAGE MANAGERS ===
    {
      id: 'version-control',
      title: 'Version Control',
      description: 'Learn Git and version control basics for collaborative development.',
      type: 'topic',
      position: { x: 200, y: 480 },
      learningObjectives: [
        'Basic Usage of Git',
        'Creating repositories',
        'Branching and Merging',
        'Working with remotes',
      ],
      resources: [
        { title: 'Git Handbook', type: 'documentation', description: 'GitHub Guides' },
      ],
      estimatedMinutes: 180,
      difficulty: 3,
      skillCluster: 'devops',
      tags: ['git', 'version-control'],
    },
    {
      id: 'package-managers',
      title: 'Package Managers',
      description: 'npm, yarn, pnpm - manage project dependencies efficiently.',
      type: 'topic',
      position: { x: 600, y: 480 },
      learningObjectives: [
        'npm basics',
        'package.json structure',
        'Installing packages',
        'npm scripts',
      ],
      resources: [
        { title: 'npm Documentation', type: 'documentation', description: 'Official npm docs' },
      ],
      estimatedMinutes: 90,
      difficulty: 3,
      skillCluster: 'frontend',
      tags: ['npm', 'yarn', 'pnpm'],
    },

    // === ROW 5: BUILD TOOLS + REPO HOSTING ===
    {
      id: 'repo-hosting',
      title: 'GitHub / GitLab',
      description: 'Learn to use repository hosting services.',
      type: 'topic',
      position: { x: 200, y: 600 },
      learningObjectives: [
        'GitHub usage',
        'Pull Requests',
        'Issues and Projects',
      ],
      resources: [
        { title: 'GitHub Skills', type: 'practice', description: 'Interactive tutorials' },
      ],
      estimatedMinutes: 120,
      difficulty: 2,
      skillCluster: 'devops',
      tags: ['github', 'gitlab'],
    },
    {
      id: 'build-tools',
      title: 'Build Tools',
      description: 'Module bundlers and build tools for modern web development.',
      type: 'milestone',
      position: { x: 600, y: 600 },
      learningObjectives: [
        'Vite',
        'esbuild',
        'Webpack basics',
      ],
      resources: [
        { title: 'Vite Documentation', type: 'documentation', description: 'Next generation frontend tooling' },
      ],
      estimatedMinutes: 180,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['vite', 'webpack', 'bundling'],
    },

    // === ROW 6: FRAMEWORKS (REACT + VUE + ANGULAR) ===
    {
      id: 'react',
      title: 'React',
      description: 'Learn React, the most popular JavaScript library for building user interfaces.',
      type: 'milestone',
      position: { x: 400, y: 720 },
      subRoadmapSlug: 'react-fundamentals',
      learningObjectives: [
        'Components and JSX',
        'State and Props',
        'Hooks (useState, useEffect)',
        'Context API',
      ],
      resources: [
        { title: 'React Documentation', type: 'documentation', description: 'Official React docs' },
      ],
      estimatedMinutes: 600,
      difficulty: 6,
      skillCluster: 'frontend',
      tags: ['react', 'framework'],
    },
    {
      id: 'vue',
      title: 'Vue.js',
      description: 'Alternative to React - progressive JavaScript framework.',
      type: 'optional',
      position: { x: 200, y: 720 },
      learningObjectives: [
        'Vue 3 Composition API',
        'Single File Components',
        'Reactivity System',
      ],
      resources: [
        { title: 'Vue.js Guide', type: 'documentation', description: 'Official Vue documentation' },
      ],
      estimatedMinutes: 480,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['vue', 'framework'],
    },
    {
      id: 'angular',
      title: 'Angular',
      description: 'Alternative to React - full-featured framework by Google.',
      type: 'optional',
      position: { x: 600, y: 720 },
      learningObjectives: [
        'TypeScript fundamentals',
        'Components and Modules',
        'Services and DI',
      ],
      resources: [
        { title: 'Angular Documentation', type: 'documentation', description: 'Official Angular docs' },
      ],
      estimatedMinutes: 600,
      difficulty: 7,
      skillCluster: 'frontend',
      tags: ['angular', 'framework'],
    },

    // === ROW 7: TESTING + TYPESCRIPT ===
    {
      id: 'testing',
      title: 'Testing',
      description: 'Learn testing strategies including unit, integration, and e2e testing.',
      type: 'milestone',
      position: { x: 250, y: 840 },
      learningObjectives: [
        'Unit Testing with Vitest',
        'Component Testing',
        'E2E with Playwright',
      ],
      resources: [
        { title: 'Vitest Documentation', type: 'documentation', description: 'Next generation testing' },
      ],
      estimatedMinutes: 300,
      difficulty: 6,
      skillCluster: 'testing',
      tags: ['testing', 'vitest'],
    },
    {
      id: 'typescript',
      title: 'TypeScript',
      description: 'Strongly typed JavaScript for better developer experience.',
      type: 'milestone',
      position: { x: 550, y: 840 },
      learningObjectives: [
        'Basic syntax and types',
        'Interfaces and type aliases',
        'Generics',
      ],
      resources: [
        { title: 'TypeScript Handbook', type: 'documentation', description: 'Official TypeScript docs' },
      ],
      estimatedMinutes: 360,
      difficulty: 5,
      skillCluster: 'frontend',
      tags: ['typescript', 'types'],
    },

    // === ROW 8: SSR/SSG ===
    {
      id: 'ssr-ssg',
      title: 'Next.js / SSR',
      description: 'Next.js, Nuxt.js, Astro - modern meta-frameworks.',
      type: 'milestone',
      position: { x: 400, y: 960 },
      subRoadmapSlug: 'nextjs-fundamentals',
      learningObjectives: [
        'Next.js App Router',
        'Server Components',
        'Static Site Generation',
        'API Routes',
      ],
      resources: [
        { title: 'Next.js Docs', type: 'documentation', description: 'Official Next.js documentation' },
      ],
      estimatedMinutes: 480,
      difficulty: 7,
      skillCluster: 'frontend',
      tags: ['nextjs', 'ssr', 'ssg'],
    },

    // === ROW 9: SECURITY + AUTH ===
    {
      id: 'authentication',
      title: 'Authentication',
      description: 'JWT, OAuth, Session-based auth, and third-party providers.',
      type: 'topic',
      position: { x: 200, y: 1080 },
      learningObjectives: [
        'JWT, OAuth, SSO',
        'Session-based auth',
        'Third-party auth (Clerk)',
      ],
      resources: [
        { title: 'Auth0 Docs', type: 'documentation', description: 'Authentication guides' },
      ],
      estimatedMinutes: 180,
      difficulty: 6,
      skillCluster: 'security',
      tags: ['auth', 'jwt', 'oauth'],
    },
    {
      id: 'web-security',
      title: 'Web Security',
      description: 'HTTPS, CORS, XSS, CSRF, Content Security Policy.',
      type: 'topic',
      position: { x: 600, y: 1080 },
      learningObjectives: [
        'HTTPS and TLS',
        'OWASP top 10',
        'Content Security Policy',
      ],
      resources: [
        { title: 'OWASP Cheat Sheets', type: 'article', description: 'Security best practices' },
      ],
      estimatedMinutes: 150,
      difficulty: 6,
      skillCluster: 'security',
      tags: ['security', 'https', 'cors'],
    },

    // === ROW 10: PERFORMANCE ===
    {
      id: 'performance',
      title: 'Performance',
      description: 'Core Web Vitals, optimization techniques, performance monitoring.',
      type: 'milestone',
      position: { x: 400, y: 1200 },
      learningObjectives: [
        'Core Web Vitals',
        'Image optimization',
        'Code splitting',
        'Lazy loading',
      ],
      resources: [
        { title: 'web.dev Performance', type: 'documentation', description: 'Google performance guides' },
      ],
      estimatedMinutes: 240,
      difficulty: 7,
      skillCluster: 'performance',
      tags: ['performance', 'optimization'],
    },

    // === ROW 11: OPTIONAL ADVANCED ===
    {
      id: 'pwa',
      title: 'PWA',
      description: 'Service Workers, Web App Manifest, offline functionality.',
      type: 'optional',
      position: { x: 200, y: 1320 },
      learningObjectives: [
        'Service Workers',
        'Web App Manifest',
        'Caching strategies',
      ],
      resources: [
        { title: 'web.dev PWA', type: 'documentation', description: 'Google PWA guides' },
      ],
      estimatedMinutes: 180,
      difficulty: 6,
      skillCluster: 'frontend',
      tags: ['pwa', 'service-worker'],
    },
    {
      id: 'mobile-apps',
      title: 'Mobile Apps',
      description: 'React Native - build mobile apps with web technologies.',
      type: 'optional',
      position: { x: 400, y: 1320 },
      learningObjectives: [
        'React Native basics',
        'Expo framework',
        'App deployment',
      ],
      resources: [
        { title: 'React Native Docs', type: 'documentation', description: 'Official React Native docs' },
      ],
      estimatedMinutes: 480,
      difficulty: 7,
      skillCluster: 'frontend',
      tags: ['react-native', 'mobile'],
    },
    {
      id: 'graphql',
      title: 'GraphQL',
      description: 'Query language for APIs - alternative to REST.',
      type: 'optional',
      position: { x: 600, y: 1320 },
      learningObjectives: [
        'GraphQL basics',
        'Queries and Mutations',
        'Apollo Client',
      ],
      resources: [
        { title: 'GraphQL Docs', type: 'documentation', description: 'Official GraphQL documentation' },
      ],
      estimatedMinutes: 240,
      difficulty: 6,
      skillCluster: 'api-design',
      tags: ['graphql', 'api'],
    },
  ],
  
  edges: [
    // Main vertical flow
    { id: 'e1', source: 'internet', target: 'html', type: 'sequential' },
    { id: 'e2', source: 'html', target: 'css', type: 'sequential' },
    { id: 'e3', source: 'css', target: 'javascript', type: 'sequential' },
    
    // After JavaScript - split to version control and package managers
    { id: 'e4', source: 'javascript', target: 'version-control', type: 'recommended' },
    { id: 'e5', source: 'javascript', target: 'package-managers', type: 'sequential' },
    
    // Version control path
    { id: 'e6', source: 'version-control', target: 'repo-hosting', type: 'sequential' },
    
    // Package managers path
    { id: 'e7', source: 'package-managers', target: 'build-tools', type: 'sequential' },
    
    // Build tools to frameworks
    { id: 'e8', source: 'build-tools', target: 'react', type: 'sequential' },
    { id: 'e9', source: 'build-tools', target: 'vue', type: 'optional' },
    { id: 'e10', source: 'build-tools', target: 'angular', type: 'optional' },
    
    // React to testing and typescript
    { id: 'e11', source: 'react', target: 'testing', type: 'sequential' },
    { id: 'e12', source: 'react', target: 'typescript', type: 'recommended' },
    
    // To SSR
    { id: 'e13', source: 'typescript', target: 'ssr-ssg', type: 'sequential' },
    { id: 'e14', source: 'testing', target: 'ssr-ssg', type: 'recommended' },
    
    // SSR to security and performance
    { id: 'e15', source: 'ssr-ssg', target: 'authentication', type: 'recommended' },
    { id: 'e16', source: 'ssr-ssg', target: 'web-security', type: 'recommended' },
    { id: 'e17', source: 'ssr-ssg', target: 'performance', type: 'sequential' },
    
    // Performance to advanced
    { id: 'e18', source: 'performance', target: 'pwa', type: 'optional' },
    { id: 'e19', source: 'performance', target: 'mobile-apps', type: 'optional' },
    { id: 'e20', source: 'performance', target: 'graphql', type: 'optional' },
  ],
};
