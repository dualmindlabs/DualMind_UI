const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 65476;

// JWT Secret (in production, this should be from environment variables)
const JWT_SECRET = 'dualmind-dev-secret-key-2024';

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(bodyParser.json());

// Mock user database
const users = [
  {
    id: 1,
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  },
  {
    id: 2,
    email: 'admin@dualmind.com',
    password: 'admin123',
    name: 'Admin User'
  }
];

// Mock leaderboard data
const mockLeaderboard = [
  {
    modelName: 'GPT-4',
    providerName: 'OpenAI',
    winRate: 85.2,
    totalWins: 1250,
    totalResponses: 1470
  },
  {
    modelName: 'Claude-3',
    providerName: 'Anthropic',
    winRate: 82.1,
    totalWins: 1180,
    totalResponses: 1438
  },
  {
    modelName: 'Gemini Pro',
    providerName: 'Google',
    winRate: 78.5,
    totalWins: 980,
    totalResponses: 1250
  }
];

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Create JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('✅ Login successful for:', user.email);

  res.json({
    success: true,
    token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
  });
});

app.post('/api/auth/signup', (req, res) => {
  console.log('📝 Signup attempt:', req.body);

  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and name are required'
    });
  }

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Create new user
  const newUser = {
    id: users.length + 1,
    email,
    password, // In production, this should be hashed!
    name
  };

  users.push(newUser);

  // Create JWT token
  const token = jwt.sign(
    {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('✅ Signup successful for:', newUser.email);

  res.json({
    success: true,
    token: token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    },
    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
  });
});

// Protected endpoints (require Bearer token)
app.get('/api/arena/model-stats', authenticateToken, (req, res) => {
  console.log('📊 Leaderboard requested by:', req.user.email);

  res.json({
    success: true,
    items: mockLeaderboard,
    totalItems: mockLeaderboard.length
  });
});

app.post('/api/arena/vote', authenticateToken, (req, res) => {
  console.log('🗳️ Vote submitted by:', req.user.email, 'Data:', req.body);

  // Mock successful vote
  res.json({
    success: true,
    message: 'Vote recorded successfully'
  });
});

app.post('/api/arena/dualchat', authenticateToken, (req, res) => {
  console.log('💬 Chat request by:', req.user.email, 'Data:', req.body);

  // Mock AI response
  setTimeout(() => {
    res.json({
      success: true,
      response: {
        model1: {
          response: "Hello! I'm an AI assistant. How can I help you today?",
          confidence: 0.95
        },
        model2: {
          response: "Hi there! I'm another AI model ready to assist you with your questions.",
          confidence: 0.92
        }
      }
    });
  }, 1000); // Simulate processing time
});

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DualMind Mock API Server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/arena/model-stats (protected)',
      'POST /api/arena/vote (protected)',
      'POST /api/arena/dualchat (protected)'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DualMind Mock API Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   POST /api/auth/login');
  console.log('   POST /api/auth/signup');
  console.log('   GET /api/health');
  console.log('   GET /api/arena/model-stats (requires auth)');
  console.log('   POST /api/arena/vote (requires auth)');
  console.log('   POST /api/arena/dualchat (requires auth)');
  console.log('\n🔑 Test credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');
  console.log('   Email: admin@dualmind.com');
  console.log('   Password: admin123');
});