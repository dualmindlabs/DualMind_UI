# Legacy Code

This folder contains the original vanilla JavaScript/HTML/CSS version of DualMind Lab.

**DO NOT USE THESE FILES** - They are kept for reference only.

## Active Version

The active, production version is the Next.js app in the root of the project:
- `/app` - Next.js pages
- `/src/components` - React components  
- `/lib` - TypeScript utilities and API clients

## What's In This Folder

- `index.html` - Original main HTML file
- `js/` - Original vanilla JavaScript code
- `css/` - Original CSS styles
- `components/` - Original vanilla JS components
- `config.js` - Old configuration (now in environment variables)
- Various other HTML pages and assets from the original app

## Migration Status

The entire application has been successfully converted to Next.js 15 with TypeScript. All functionality from the legacy version has been reimplemented with modern React patterns, proper state management, and TypeScript safety.

To run the new Next.js version:
```bash
npm run dev
```
