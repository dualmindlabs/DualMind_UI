const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Files and directories to copy
const itemsToCopy = [
  'index.html',
  'about',
  'careers',
  'how-it-works',
  'login',
  'leaderboard',
  'models',
  'faq',
  'js',
  'css',
  'components',
  'assets',
  'admin-email-system',
  'config.js',
  'theme.js',
  'api-service.js',
  'arena-core.js',
  'arena-redesign.css',
  'performance-monitor.js',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'js/app-final.js'  // Add the new app file
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Skipping ${src} (not found)`);
    return;
  }
  
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src}`);
  }
}

console.log('Building deployment package...\n');

itemsToCopy.forEach(item => {
  const srcPath = path.join(__dirname, item);
  const destPath = path.join(distDir, item);
  copyRecursive(srcPath, destPath);
});

console.log('\n✅ Build complete! Files copied to dist/');
console.log('Run: wrangler deploy --config wrangler-dist.toml');
