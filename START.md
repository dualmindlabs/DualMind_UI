# DualMind Next.js - Start Here

## ✅ Project Status

Your DualMind Lab application has been successfully converted from vanilla JavaScript to Next.js 15 with TypeScript, Supabase authentication, and a modern component architecture.

## What's Been Done

- ✅ Complete Next.js 15 app with App Router
- ✅ TypeScript for type safety
- ✅ Supabase authentication integrated
- ✅ Tailwind CSS styling system
- ✅ All legacy vanilla JS code moved to `/legacy` folder
- ✅ Clean codebase with no routing conflicts
- ✅ Proper middleware for auth protection
- ✅ Full component system built

## How to Run the App

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Environment Variables
Make sure you have these in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://calqfzajyidkdzbaswjp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_API_BASE_URL=https://api.dualmindlab.tech
```

### Step 3: Start the Dev Server
```bash
npm run dev
```

### Step 4: Visit the App
Open [http://localhost:3000](http://localhost:3000)

## What You'll See

**Landing Page (Not Logged In):**
- DualMind Lab logo
- Sign In / Sign Up buttons
- Feature overview cards

**After Sign In:**
- Arena page with dual-chat interface
- Model selection
- Real-time AI responses
- Voting UI
- Thread history sidebar

## Available Pages

- `/` - Landing page (redirects to `/arena` if logged in)
- `/auth/login` - Login page
- `/auth/sign-up` - Sign up page
- `/arena` - Main arena/chat interface (protected)
- `/leaderboard` - Model rankings
- `/about` - About page
- `/faq` - FAQ page
- `/models` - Models information

## Project Structure

```
app/                    # Next.js 15 App Router
├── page.tsx           # Landing page
├── layout.tsx         # Root layout
├── globals.css        # Global styles
├── arena/             # Arena page
├── auth/              # Auth pages
├── leaderboard/       # Leaderboard page
└── [other pages]

lib/                   # Core libraries
├── api-client.ts      # DualMind API client
├── types.ts           # TypeScript types
├── hooks/             # React hooks
└── supabase/          # Supabase setup

public/               # Static assets
legacy/               # Old vanilla JS code (archived)
```

## Troubleshooting

### "Still seeing directory listing?"
Make sure you're running `npm run dev` and the dev server is using port 3000.

### "Seeing raw source code?"
The preview environment needs to properly serve the Next.js app. Refresh the page or restart the dev server.

### "Environment variables not set?"
Check the Vars section in the v0 sidebar to add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_BASE_URL`.

## Next Steps

1. Customize the design in `/app/globals.css`
2. Add more features in `/app/[route]/page.tsx`
3. Create new React components in `components/`
4. Deploy to Vercel with one click!

## Production Deployment

Deploy to Vercel using:
```bash
vercel deploy
```

Or connect your GitHub repo for automatic deployments.

---

**Happy building! 🚀**
