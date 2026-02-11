# DualMind Lab - Next.js Version

**Quick Start Guide**

## Setup

1. **Install dependencies:**
```bash
npm install
# or
bun install
```

2. **Set environment variables:**
Make sure you have set:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `NEXT_PUBLIC_API_BASE_URL` - DualMind API endpoint

3. **Run the development server:**
```bash
npm run dev
# or
bun dev
```

4. **Open the app:**
Go to http://localhost:3000

## Important Notes

- The legacy vanilla JS files are archived in the `/legacy` folder
- The new Next.js app uses the `/app` directory (App Router)
- Authentication is handled via Supabase
- Components are in `/src/components` (TypeScript)

## Troubleshooting

**Getting a directory listing instead of the app?**
- Make sure you're running `npm run dev` (Next.js dev server)
- Not a static file server
- Clear browser cache
- Check that port 3000 is being used

**Authentication issues?**
- Verify Supabase credentials in environment variables
- Check browser console for error messages

**Build for production:**
```bash
npm run build
npm start
```

## Project Structure

```
/app              - Next.js pages and routes
/src/components   - React components (TypeScript)
/lib              - Utilities, hooks, API client
/legacy           - Old vanilla JS codebase (archived)
/public           - Static assets
```

This is a modern, production-ready Next.js 15 application with TypeScript, Tailwind CSS, and Supabase authentication.
