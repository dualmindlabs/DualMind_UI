# DualMind Arena - AI Battle Platform

A premium, SaaS-level web application for comparing AI language models through interactive battles. Compare responses from multiple AI models side-by-side, vote on your preferences, and contribute to community-driven leaderboards.

## Quick Start

### Prerequisites
- Node.js 14+ installed
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (credentials configured in config.js)
- Optional: Backend API server

### Installation & Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:8000` in your browser.

## Features

### Battle Mode
Compare two AI models side-by-side with anonymous testing, real-time streaming responses, and community voting.

### Side-by-Side Mode
Choose specific models to compare and analyze their responses directly.

### Direct Chat Mode
Chat with a single AI model with full conversation history maintained.

### Leaderboard
Live model rankings based on community votes, win rates, and performance statistics.

### Authentication
Secure Supabase-powered authentication with email/password login and session management.

### Responsive Design
Fully responsive interface optimized for desktop, tablet, and mobile devices.

## 📁 Project Structure

```
DualMind_UI/
├── index.html              # Main app entry
├── config.js               # Global configuration
├── components/             # UI components
│   ├── Header.js          # Top navigation
│   ├── Sidebar.js         # Side navigation
│   └── chat/              # Chat components
├── css/                   # Stylesheets
│   ├── styles.css         # Main styles
│   └── auth-styles.css    # Auth page styles
├── js/                    # JavaScript modules
│   ├── app.js             # Main app logic
│   ├── apiClient.js       # API client
│   ├── supabase-auth.js   # Auth service
│   ├── supabase-init.js   # Auth initialization
│   └── leaderboardModal.js # Leaderboard component
├── login/                 # Login/signup page
│   └── index.html
└── package.json           # Dependencies

```

## Configuration

### Backend URL
Edit `config.js` to configure your backend API:

```javascript
// Automatically detects localhost vs production
const BACKEND_URL = isLocalhost 
  ? 'http://localhost:5079' 
  : 'https://api.dualmindlab.tech';
```

### Supabase Credentials
Configure your Supabase project in `config.js`:

```javascript
window.DUALMIND_CONFIG.supabase = {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

## Customization

### Design Tokens
The app uses a modern design system with CSS custom properties. Edit `css/styles.css` to customize:

```css
:root {
  /* Brand Colors */
  --color-primary: #6366f1;
  --color-accent: #22d3ee;
  
  /* Background Colors */
  --bg-0: #000000;
  --bg-1: #0a0a0a;
  
  /* Typography */
  --font-family-base: 'Inter', sans-serif;
  --text-base: 15px;
  
  /* Border Radius */
  --radius-md: 16px;
}
```

### Background Image
Replace `./assets/background.png` with your custom background image for a personalized look.

## API Integration

The app works with an optional backend API or can run in offline mode with mock responses.

### Key Endpoints
- `POST /api/arena/chat` - Single model chat
- `POST /api/arena/dualchat` - Battle mode (two models)
- `POST /api/arena/model-vote` - Submit vote
- `GET /api/arena/model-stats` - Leaderboard data
- `GET /api/health` - Backend health check

All authenticated endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

## 🧪 Testing

### Test Authentication
1. Navigate to login page
2. Create account or login
3. Verify redirect to main app
4. Check user info in header/sidebar

### Test Battle Mode
1. Enter a prompt
2. Wait for 2 model responses
3. Vote for preferred response
4. Check leaderboard updates

### Test Direct Chat
1. Switch to Direct Chat mode
2. Send messages
3. Verify conversation flow

## Troubleshooting

### Backend Connection Issues
The app automatically falls back to offline mode with mock responses if the backend is unavailable. To resolve:
- Verify backend is running on the correct port
- Check CORS settings on your backend server
- Ensure API URL is correctly configured in `config.js`

### Authentication Problems
- Clear browser cache and localStorage
- Verify Supabase credentials in `config.js`
- Check browser console for detailed error messages
- Ensure email confirmation is properly configured in Supabase

### Common Issues
- **Blank screen**: Check browser console for JavaScript errors
- **Slow loading**: Enable caching in `config.js`
- **Mobile issues**: Clear mobile browser cache and reload

## Responsive Design

Fully responsive interface with optimized layouts:
- **Desktop** (1024px+): Full sidebar with all features
- **Tablet** (768px-1024px): Collapsible sidebar
- **Mobile** (<768px): Drawer sidebar with touch-optimized controls

## Security

- JWT-based authentication with Supabase
- Secure session storage and token management
- HTTPS recommended for production deployments
- CORS protection and XSS prevention
- Input sanitization and validation

## Deployment

### Production Checklist
- Configure production backend URL in `config.js`
- Enable HTTPS for secure connections
- Set up CDN for static assets (optional)
- Configure Supabase production environment
- Test all features thoroughly
- Enable performance monitoring

## Performance

- Optimized CSS with modern design tokens
- Efficient event handling with delegation
- Lazy loading for optimal bundle size
- GPU-accelerated animations
- Request caching for API calls

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus chat input
- `Ctrl/Cmd + B` - Toggle sidebar
- `Escape` - Close modals and menus

## Support

For issues, questions, or feature requests:
- GitHub Issues: [github.com/dualmindlabs/DualMind_UI](https://github.com/dualmindlabs/DualMind_UI/issues)
- Email: support@dualmindlab.tech

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with modern web standards and inspired by leading AI platforms including ChatGPT, Claude, and Vercel.
