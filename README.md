# DualMind Arena

DualMind Arena is a premium, SaaS-level AI battle platform for comparing language models side-by-side.

Live Demo: [https://arena.dualmindlab.tech](https://arena.dualmindlab.tech)

## Project Structure

```
DualMind_UI/
├── components/    # Reusable UI components
├── css/           # Design system tokens and styles
├── js/            # Core application and API modules
├── leaderboard/   # Leaderboard page routing/assets
└── login/         # Login and signup pages
```

## Tech Stack

- **Frontend**: Vanilla JS (ES Modules, custom event bus), Tailwind CSS/Vanilla CSS
- **Database & Auth**: Supabase (Client-side integration)
- **Edge Deployment**: Cloudflare Workers
- **Email Notifications**: Resend

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `config.example.js` to `.env` (or setup your system environment variables) and fill in your Supabase credentials:
   ```env
   SUPABASE_URL=YOUR_SUPABASE_URL
   SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```

## Key API Endpoints

All authenticated API requests communicate through:
- `POST /api/arena/chat` - Interact with a single AI model.
- `POST /api/arena/dualchat` - Generate responses from two anonymous models side-by-side.
- `POST /api/arena/model-vote` - Submit a vote for the preferred model response.
- `GET /api/arena/model-stats` - Fetch Elo ratings and performance stats for the leaderboard.
