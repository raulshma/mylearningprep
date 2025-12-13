# MyLearningPrep

A comprehensive, interactive learning platform for developers preparing for technical interviews. Built with Next.js 16, React 19, and modern web technologies.

## Overview

MyLearningPrep is an all-in-one learning platform that combines structured learning roadmaps, AI-powered assistance, and gamification to help developers master frontend technologies and advance their technical skills.

## Features

### Interactive Learning Roadmaps

- **Visual Roadmap Viewer**: Interactive node-based roadmaps powered by React Flow and ELK.js for automatic layout
- **Multiple Learning Paths**: Pre-built roadmaps for Frontend Development and JavaScript fundamentals
- **Progress Tracking**: Real-time tracking of completed lessons, milestones, and topics
- **Drill-Down Navigation**: Expandable sidebar with milestones, topics, and objectives
- **Keyboard Navigation**: Navigate roadmaps using keyboard shortcuts (Escape, Arrow keys, J/K)

### MDX-Based Lesson System

- **Rich Content Lessons**: Lessons authored in MDX with interactive components
- **Experience Levels**: Three difficulty levels per lesson (Beginner, Intermediate, Advanced)
- **Interactive Demos**: Hands-on demonstrations embedded directly in lessons
- **Syntax Highlighting**: Code blocks with Shiki-powered syntax highlighting
- **Zen Mode**: Distraction-free reading mode for focused learning

### Interactive Learning Components

Specialized interactive components for various topics:

- **CSS**: Flexbox playground, Grid builder, Box model visualizer, Animation demos, Color picker, Typography explorer
- **JavaScript**: Event loop visualization, Closure demos, Prototype chain explorer, Async/await simulators
- **React**: State management demos, Hooks playground, Component lifecycle visualization, Context API explorer
- **Build Tools**: Webpack configuration visualizer, Bundler pipeline demos, Esbuild speed comparisons
- **Testing**: Unit testing with Vitest, Component testing, E2E testing with Playwright
- **Web Fundamentals**: HTTP conversation simulator, DNS lookup visualization, Domain name resolver

### AI-Powered Chat Assistant

- **Multiple AI Providers**: Support for Google AI, OpenRouter, and custom models
- **Multi-Model Comparison**: Compare responses from different AI models side-by-side
- **Conversation Management**: Archive, search, and organize chat history
- **Context-Aware Responses**: AI understands your learning progress and preferences
- **Tool Integration**: Web search, code execution, and document analysis

### Mock Interview System

- **Custom Interview Creation**: Create personalized mock interviews
- **Topic-Based Modules**: Organized interview modules by technology and topic
- **Feedback System**: Detailed feedback and improvement suggestions
- **Weakness Analysis**: Identify and track areas needing improvement
- **Timeline Tracking**: Track interview performance over time

### Gamification System

- **Experience Points (XP)**: Earn XP for completing lessons, quizzes, and challenges
- **Level Progression**: 20+ levels with increasing XP requirements
- **Achievement Badges**: Unlock badges for milestones, streaks, and mastery
- **Daily Streaks**: Bonus XP for maintaining learning streaks
- **Progress Visualization**: Animated XP awards and level-up notifications

### User Dashboard

- **Stats Overview**: Bento grid display of learning statistics
- **Learning Path Cards**: Quick access to active roadmaps and progress
- **Interview Cards**: Recent mock interviews and performance metrics
- **Usage Tracking**: Monitor AI chat usage and subscription status

### Authentication and User Management

- **Clerk Authentication**: Secure authentication with Clerk
- **Onboarding Flow**: Guided setup for new users
- **Settings Management**: User preferences and account settings
- **Theme Support**: Light and dark mode with custom theme injection

### Subscription and Payments

- **Stripe Integration**: Secure payment processing
- **Tiered Plans**: Free, Pro, and Max subscription tiers
- **Usage Limits**: Tier-based limits on AI chat and features
- **Webhook Handling**: Automated subscription management

## Tech Stack

### Frontend

- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19 with React Compiler
- **Styling**: Tailwind CSS 4 with custom design system
- **Components**: Radix UI primitives with shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation

### Content

- **MDX**: @mdx-js/mdx, @next/mdx, next-mdx-remote
- **Syntax Highlighting**: Shiki, rehype-pretty-code
- **Markdown Processing**: remark-gfm, rehype-slug, rehype-autolink-headings

### Visualization

- **Flow Diagrams**: @xyflow/react (React Flow)
- **Auto Layout**: elkjs
- **Charts**: Recharts
- **Code Editor**: Monaco Editor

### AI Integration

- **Vercel AI SDK**: ai, @ai-sdk/react, @ai-sdk/google
- **OpenRouter**: @openrouter/ai-sdk-provider
- **Streaming**: Resumable streams for AI responses

### Backend

- **Database**: MongoDB
- **Caching**: Redis (ioredis)
- **Search**: SearXNG (self-hosted)
- **Web Scraping**: Crawl4AI

### Authentication and Payments

- **Auth**: Clerk (@clerk/nextjs)
- **Payments**: Stripe
- **Webhooks**: Svix

### Testing

- **Unit Testing**: Vitest
- **Property Testing**: fast-check
- **Analytics**: @vercel/analytics

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- MongoDB instance
- Redis instance (optional, for caching)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mylearningprep.git
   cd mylearningprep
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following required variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `MONGODB_URI` - MongoDB connection string
   - `OPENROUTER_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` - AI provider keys
   - `STRIPE_SECRET_KEY` - Stripe secret key (for payments)

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

```bash
docker-compose up -d
```

This starts the application along with SearXNG for web search capabilities.

## Project Structure

```
mylearningprep/
├── app/                    # Next.js App Router pages
│   ├── (landing)/          # Landing page routes
│   ├── (sidebar)/          # Dashboard routes with sidebar
│   ├── api/                # API routes
│   ├── interview/          # Mock interview feature
│   └── learning/           # Learning path pages
├── components/             # React components
│   ├── ai-chat/            # AI chat interface
│   ├── dashboard/          # Dashboard components
│   ├── interview/          # Interview components
│   ├── learn/              # Learning components
│   │   ├── interactive/    # Interactive demos
│   │   └── mdx-components/ # Custom MDX components
│   ├── roadmap/            # Roadmap viewer
│   └── ui/                 # Base UI components
├── content/                # MDX lesson content
│   └── lessons/            # Lesson files by topic
├── lib/                    # Utilities and services
│   ├── actions/            # Server actions
│   ├── ai/                 # AI integration
│   ├── data/               # Data definitions
│   │   └── roadmaps/       # Roadmap definitions
│   ├── db/                 # Database operations
│   ├── gamification/       # XP and badge system
│   └── services/           # Business logic services
├── hooks/                  # Custom React hooks
└── styles/                 # Global styles
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |

## Content Structure

Lessons are organized in the `content/lessons/` directory by topic:

- `css/` - CSS selectors, Flexbox, Grid, animations, etc.
- `javascript/` - Variables, functions, async/await, etc.
- `react/` - Components, hooks, state management, etc.
- `html/` - Semantic HTML, forms, accessibility
- `testing/` - Unit testing, component testing, E2E testing
- `http/`, `dns/`, `domain/` - Web fundamentals

Each lesson contains:
- MDX content with interactive components
- Metadata (title, description, XP reward, difficulty)
- Experience-level specific content sections

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
