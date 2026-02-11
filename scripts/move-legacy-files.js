const fs = require('fs');
const path = require('path');

const legacyItems = [
  'about',
  'admin-email-system',
  'arena-redesign.css',
  'assets',
  'auth-callback.html',
  'auth-verify.html',
  'backend-api-endpoints.md',
  'careers',
  'chat_math_fixed.png',
  'components',
  'cookies',
  'css',
  'dist',
  'faq',
  'how-it-works',
  'js',
  'leaderboard',
  'login',
  'login-test.html',
  'mock-api-server.js',
  'models',
  'old-html-backup',
  'PERFECT-INPUT-CENTER-FIX.css',
  'performance-monitor.js',
  'privacy',
  'razorpay-test.html',
  'share',
  'streaming-example.html',
  'terms',
  'test-auth.html',
  'test-everything.js',
  'test-server.html',
  'theme.js',
  'verify.html',
  'worker.js',
  'API_ENDPOINTS_VERIFIED.md',
  'AUTH_REQUIRED_UPDATE.md',
  'BATTLE_ICON_UPDATE.md',
  'CHATGPT_SCROLL_IMPLEMENTATION.md',
  'DEBUG_GUIDE.md',
  'FINAL_STATUS.md',
  'IMPROVEMENTS-COMPLETE.md',
  'INPUT-CENTERING-COMPLETE.md',
  'PERFECT-CENTERING-FIX.md',
  'PRODUCTION_READY_FIXES.md',
  'README-PERFECT-SETUP.md',
  'SCROLL_BEHAVIOR_UPDATE.md',
  'SERVERS-ARE-RUNNING.txt',
  'SETUP_COMPLETE.md',
  'SYSTEM_PERFECT.md',
  'UI-IMPROVEMENTS-FINAL.md',
  'UI_FIXES_COMPLETE.md',
  'VOTE_RESET_IMPLEMENTATION.md',
  'arena.dualmindlab.tech-1767900748196.log'
];

const rootDir = path.join(__dirname, '..');
const legacyDir = path.join(rootDir, 'legacy');

// Ensure legacy directory exists
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
}

let moved = 0;
let skipped = 0;

legacyItems.forEach(item => {
  const sourcePath = path.join(rootDir, item);
  const destPath = path.join(legacyDir, item);
  
  try {
    if (fs.existsSync(sourcePath)) {
      // Check if destination exists
      if (fs.existsSync(destPath)) {
        console.log(`Skipping ${item} - already exists in legacy`);
        skipped++;
      } else {
        fs.renameSync(sourcePath, destPath);
        console.log(`Moved ${item} to legacy/`);
        moved++;
      }
    }
  } catch (error) {
    console.error(`Error moving ${item}:`, error.message);
  }
});

console.log(`\nDone! Moved ${moved} items, skipped ${skipped} items.`);
