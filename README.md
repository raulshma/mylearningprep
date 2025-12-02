# MyInterviewPrep

A comprehensive interview preparation platform powered by AI, designed to help users practice and improve their technical interview skills through personalized learning paths, mock interviews, and real-time feedback.

## Features

### Core Interview Preparation
- **AI-Powered Mock Interviews**: Practice technical interviews with AI assistance
- **Real-time Feedback**: Get instant feedback on your responses and performance
- **Topic-Specific Practice**: Focus on specific technical topics and domains
- **Learning Paths**: Structured learning journeys tailored to your goals
- **Interactive Chat**: AI-assisted conversations for interview practice

### AI Tools & Features
- **GitHub Analysis**: Analyze your GitHub profile for interview preparation insights
- **STAR Framework**: Practice structured interview responses using the STAR method
- **System Design**: Practice system design interviews with AI guidance
- **Tech Trends**: Stay updated with latest technology trends
- **Learning Resources**: Access curated learning materials

### User Experience
- **Modern UI/UX**: Built with Tailwind CSS and Radix UI components
- **Responsive Design**: Works seamlessly across all devices
- **Dark Mode**: Support for dark/light theme switching
- **Real-time Updates**: Streaming responses for interactive experience

### Account Management
- **User Authentication**: Secure authentication with Clerk
- **Usage Analytics**: Track your progress and usage statistics
- **Subscription Management**: Tier-based access to features
- **Profile Customization**: Personalize your learning experience

## Tech Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **React 19**: UI library with latest features
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework
- **Radix UI**: Accessible component library
- **Framer Motion**: Animation library
- **React Hook Form**: Form management with Zod validation

### Backend & APIs
- **Next.js API Routes**: Server-side API endpoints
- **Clerk**: Authentication and user management
- **Stripe**: Payment processing
- **MongoDB**: Database integration
- **Redis**: Caching and session management

### AI & Machine Learning
- **AI SDK**: Integration with multiple AI providers
- **OpenRouter**: AI model provider
- **Custom AI Tools**: Specialized interview preparation tools

### Development Tools
- **ESLint**: Code linting
- **TypeScript**: Static type checking
- **Vitest**: Testing framework
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- MongoDB connection
- Redis connection (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd syntax_state
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
   - `CLERK_SECRET_KEY`: Clerk secret key
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Sign-in URL
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: Sign-up URL
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Redirect URL after sign-in
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Redirect URL after sign-up
   - `OPENROUTER_API_KEY`: OpenRouter API key for AI features
   - `MONGODB_URI`: MongoDB connection string
   - `REDIS_URL`: Redis connection URL (optional)
   - `STRIPE_SECRET_KEY`: Stripe secret key (for payments)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
syntax_state/
├── app/                    # Next.js App Router pages
│   ├── (landing)/         # Landing page routes
│   ├── (sidebar)/         # Main app with sidebar layout
│   ├── api/               # API routes
│   ├── login/             # Authentication pages
│   └── settings/          # User settings pages
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── landing/          # Landing page components
│   └── ...              # Feature-specific components
├── lib/                  # Utility functions and configurations
├── public/               # Static assets
└── types/               # TypeScript type definitions
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode

## Key Features

### Interview Practice
- **Mock Interviews**: Simulate real interview scenarios
- **Topic-Specific Sessions**: Focus on areas like algorithms, system design, etc.
- **Real-time Feedback**: Get instant AI-powered feedback on your responses
- **Progress Tracking**: Monitor your improvement over time

### Learning Management
- **Custom Learning Paths**: Create personalized study plans
- **Resource Library**: Access curated interview materials
- **Progress Analytics**: Track your learning journey
- **Performance Metrics**: Detailed insights into your strengths and weaknesses

### AI-Powered Tools
- **GitHub Profile Analysis**: Get interview insights based on your code
- **STAR Method Practice**: Improve behavioral interview responses
- **System Design Coaching**: Practice system design interviews
- **Technical Trends**: Stay current with industry developments

## Attributions

This project uses and is grateful for the following open-source packages:

### AI & Data Processing
- **Crawl4AI** - Advanced web crawling and data extraction for AI applications
- **AI SDK** - Unified interface for working with AI models and providers
- **OpenRouter** - Access to multiple AI models through a single API

### UI Components & Styling
- **Radix UI** - Low-level UI primitives for building accessible design systems
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Framer Motion** - Production-ready motion library for React
- **Lucide React** - Beautiful & consistent icon toolkit

### Form & Validation
- **React Hook Form** - Performant, flexible, and extensible forms with easy-to-use validation
- **Zod** - TypeScript-first schema validation with static type inference

### Editor & Code Display
- **Monaco Editor** - The code editor that powers VS Code
- **Shiki** - Syntax highlighter with themes and language support
- **React Markdown** - Markdown component for React

### Development & Testing
- **Vitest** - Next generation testing framework powered by Vite
- **ESLint** - Find and fix problems in your JavaScript code
- **TypeScript** - Typed superset of JavaScript that compiles to plain JavaScript

### Data & Storage
- **MongoDB** - Document database with the scalability and flexibility you want
- **Redis** - In-memory data structure store, used as database, cache, and message broker

### Authentication & Payments
- **Clerk** - Complete user management UIs and APIs
- **Stripe** - Payment processing platform for the internet

### Development Tools & Assistants
- **GitHub Copilot** - AI pair programmer that helps write better code faster
- **Kiro** - Agentic AI development from prototype to production
- **Antigravity** - Experience liftoff
with the next-generation IDE

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please [open an issue](https://github.com/your-username/syntax_state/issues) or contact the development team.