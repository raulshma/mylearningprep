# Syntax State

Syntax State is an AI-powered platform for coding interview preparation and practice. It provides interactive interview simulations, real-time code streaming, topic-based learning, and comprehensive dashboards for tracking progress.

## Features

- **AI-Driven Interviews**: Simulate real coding interviews with streaming AI responses and feedback.
- **Interactive Dashboard**: Track interview history, topics, and performance metrics.
- **Topic-Based Practice**: Explore and practice specific coding topics with guided sessions.
- **Admin Panel**: Manage users, interviews, and content (admin only).
- **User Onboarding & Authentication**: Seamless Clerk integration for secure login.
- **Pricing & Subscriptions**: Stripe-powered plans for premium features.
- **Real-Time Streaming**: Live code and text generation with AI SDK.
- **Responsive UI**: Modern, accessible design with Tailwind CSS and Radix UI.
- **MongoDB Backend**: Robust data storage with TypeScript schemas.
- **View Transitions**: Smooth page transitions for enhanced UX.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **UI Library**: Radix UI, Framer Motion, Lucide Icons
- **Auth**: Clerk
- **Database**: MongoDB
- **AI/ML**: Vercel AI SDK, OpenRouter
- **Payments**: Stripe
- **Forms**: React Hook Form, Zod
- **Testing**: Vitest
- **Other**: Sonner (Toasts), Recharts (Charts), Mammoth/PDF-Parse (Document Processing)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (recommended)
- MongoDB instance (local or Atlas)
- Clerk account (for auth)
- Stripe account (for payments)
- OpenRouter API key (for AI)

### Installation

1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd syntax_state
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your keys for `CLERK_*`, `MONGODB_URI`, `STRIPE_*`, `OPENROUTER_API_KEY`, etc.

4. Run the development server:
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Start

```bash
pnpm build
pnpm start
```

### Testing

```bash
pnpm test
pnpm test:watch
```

## Deployment

Recommended: Vercel (one-click deploy from GitHub).

1. Push to GitHub.
2. Import to Vercel.
3. Add env vars in Vercel dashboard.
4. Deploy!

## Documentation

- [Clerk Docs](https://clerk.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [shadcn/ui](https://ui.shadcn.com/)

## Contributing

1. Fork the project.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

---

Star on GitHub if you find it useful!
