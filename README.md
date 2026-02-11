# DualMind Lab - Next.js App

A modern AI model comparison platform built with Next.js 15, allowing users to compare responses from different AI models in real-time.

## Features

- **Arena Mode**: Compare two anonymous AI models and vote on the best response
- **Direct Chat**: Chat directly with a specific AI model
- **Side-by-Side**: Compare two specific models simultaneously
- **Leaderboard**: View ELO rankings of all available AI models
- **Thread History**: Save and revisit your conversation threads
- **Share Threads**: Share interesting conversations with others
- **Real-time Streaming**: Watch AI responses stream in real-time via Server-Sent Events (SSE)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Authentication**: Supabase Auth
- **Data Fetching**: SWR
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase account
- Access to DualMind Lab API

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dualmindlabs/DualMind_UI.git
cd DualMind_UI
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_API_BASE_URL`: DualMind Lab API endpoint

4. Run the development server:
```bash
npm run dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                      # Next.js App Router pages
│   ├── about/               # About page
│   ├── auth/                # Authentication pages
│   ├── faq/                 # FAQ page
│   ├── leaderboard/         # Leaderboard page
│   ├── models/              # Models info page
│   ├── shared/              # Shared thread viewer
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home/Arena page
│   └── globals.css          # Global styles
├── src/components/          # React components
│   ├── arena-shell.tsx      # Main arena orchestrator
│   ├── header.tsx           # App header
│   ├── sidebar.tsx          # Thread history sidebar
│   ├── chat-input.tsx       # Message input component
│   ├── chat-view.tsx        # Chat message display
│   ├── response-card.tsx    # AI response card
│   ├── floating-voting.tsx  # Voting UI
│   └── share-modal.tsx      # Share thread modal
├── lib/                     # Utilities and libraries
│   ├── api-client.ts        # DualMind API client
│   ├── types.ts             # TypeScript types
│   ├── utils.ts             # Utility functions
│   ├── hooks/               # Custom React hooks
│   │   ├── use-auth.ts      # Authentication hook
│   │   └── use-arena.ts     # Arena state management
│   └── supabase/            # Supabase client setup
│       ├── client.ts        # Browser client
│       ├── server.ts        # Server client
│       └── middleware.ts    # Auth middleware
└── middleware.ts            # Next.js middleware
```

## API Integration

The app integrates with the DualMind Lab API for:
- Starting arena battles
- Streaming AI responses via SSE
- Submitting votes
- Managing threads
- Fetching leaderboard data
- Sharing threads

All API calls are handled through the `apiClient` in `lib/api-client.ts`.

## Authentication

Authentication is handled via Supabase Auth:
- Email/password sign up and login
- Session management via HTTP-only cookies
- Protected routes via Next.js middleware
- User metadata stored in Supabase

## Deployment

The easiest way to deploy is via Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
