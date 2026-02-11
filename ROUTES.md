# DualMind Lab Routes

## Public Routes (No Auth Required)
- `/` - Landing page
- `/auth/login` - Sign in page
- `/auth/sign-up` - Create account page
- `/auth/callback` - OAuth callback handler

## Protected Routes (Auth Required)
- `/arena` - Main arena page (battle mode, direct chat, side-by-side)
- `/leaderboard` - Model rankings and statistics
- `/about` - About page
- `/faq` - Frequently asked questions
- `/models` - Available AI models
- `/shared/[shareId]` - View shared battles

## How It Works

**Landing Page (`/`)**
- Shows sign in / sign up options
- Redirects to `/arena` if already logged in

**Arena (`/arena`)**
- Main application interface
- Compare AI models
- Vote on responses
- View conversation history

**Leaderboard (`/leaderboard`)**
- View ELO rankings
- Sort by different metrics
- Filter by model provider

## Starting the App

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Visit http://localhost:3000
```

## Building for Production

```bash
npm run build
npm start
```

Then deploy to Vercel or your preferred hosting.
