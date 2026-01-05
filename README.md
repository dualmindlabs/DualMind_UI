# DualMind Arena - AI Battle Platform

**The ultimate AI model comparison platform with real-time battles and leaderboards.**

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Backend server running on `http://localhost:65476`
- Supabase account (credentials already configured)

### Installation & Run

```powershell
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open **http://localhost:8000** in your browser.

## ✨ Features

### 🎯 Battle Mode
- Compare two AI models side-by-side
- Random model selection for blind testing
- Vote for the better response
- Real-time streaming responses

### 💬 Direct Chat Mode
- Chat with a single AI model
- Conversation history maintained
- Multiple model options

### 🏆 Leaderboard
- Live model rankings
- Win rates and statistics
- Response time metrics
- Cached for performance

### 🔐 Authentication
- Supabase-powered auth
- Email/password login
- Google OAuth support
- Admin role detection
- Secure session management

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

## 🔧 Configuration

### Backend URL
Edit `config.js` to switch between local and production:

```javascript
const BACKEND_MODE = 'localhost'; // or 'production'

const BACKEND_URLS = {
  localhost: 'http://localhost:65476',
  production: 'https://api.dualmindlab.tech'
};
```

### Supabase Credentials
Already configured in `config.js`:
- URL: `https://calqfzajyidkdzbaswjp.supabase.co`
- Anon Key: (configured)

## 🎨 Customization

### Change Background Image
Edit `index.html` line 35:
```html
<img 
  src="YOUR_IMAGE_URL_HERE" 
  alt="" 
  class="app-background"
  loading="eager"
/>
```

### Modify Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
  --color-teal: #577B87;
  --color-cyan: #4AABC2;
  --color-terra: #CB9275;
  --color-cream: #FDF4CD;
}
```

## 📡 API Endpoints

All endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

### Arena
- `POST /api/arena/chat` - Single model chat
- `POST /api/arena/chat/stream` - Streaming chat
- `POST /api/arena/dualchat` - Battle mode (2 models)
- `POST /api/arena/model-vote` - Submit vote
- `GET /api/arena/model-stats` - Leaderboard data

### Admin
- `GET /api/admin/check` - Check admin status

### Health
- `GET /health` - Backend health check

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

## 🐛 Troubleshooting

### Backend Not Available
- App falls back to offline mode with mock responses
- Check backend is running on correct port
- Verify CORS settings on backend

### Login Issues
- Clear browser cache and localStorage
- Check Supabase credentials in config.js
- Verify email confirmation settings

### API Errors
- Check browser console for details
- Verify backend URL in config.js
- Ensure auth token is valid

## 📱 Responsive Design

Fully responsive with breakpoints:
- **Desktop**: Full sidebar, all features
- **Tablet**: Collapsible sidebar
- **Mobile**: Drawer sidebar, optimized layout

## 🔒 Security

- JWT-based authentication
- Secure session storage
- HTTPS recommended for production
- CORS protection
- XSS prevention

## 📚 Documentation

- `SETUP_COMPLETE.md` - Detailed setup guide
- `API_ENDPOINTS_VERIFIED.md` - API documentation

## 🚀 Deployment

### Production Checklist
- [ ] Update `BACKEND_MODE` to 'production'
- [ ] Configure production backend URL
- [ ] Enable HTTPS
- [ ] Set up CDN for static assets
- [ ] Configure Supabase production settings
- [ ] Test all features in production

## 💡 Tips

- Use **Ctrl/Cmd + K** to focus chat input
- Press **Escape** to close modals/sidebar
- Click **Leaderboard** to see model rankings
- Vote after each battle to improve rankings

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check browser console for errors

## 📄 License

Proprietary - DualMind Arena

---

**Built with ❤️ for AI enthusiasts**
