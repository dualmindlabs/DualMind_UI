const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Define exactly what to copy to avoid the 100k+ files (like node_modules, next-dualmind, etc)
const filesToCopy = [
    'index.html',
    'auth-callback.html',
    'auth-verify.html',
    'config.js',
    'forgot-password.html',
    'login-modern.html',
    'manifest.json',
    'og-image.png',
    'robots.txt',
    'signup-modern.html',
    'sitemap.xml',
    'sw.js',
    'terms.html',
    'theme.js',
    'update-password.html',
    'waitlist.html',
    'ads.txt'
];

const foldersToCopy = [
    'about',
    'assets',
    'careers',
    'components',
    'cookies',
    'css',
    'faq',
    'how-it-works',
    'js',
    'leaderboard',
    'login',
    'models',
    'privacy',
    'share',
    'terms'
];

// Clean dist folder if it exists
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// Copy individual files
for (const file of filesToCopy) {
    if (fs.existsSync(path.join(srcDir, file))) {
        fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
    }
}

// Copy directories
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

for (const folder of foldersToCopy) {
    if (fs.existsSync(path.join(srcDir, folder))) {
        copyDir(path.join(srcDir, folder), path.join(distDir, folder));
    }
}

console.log('Frontend built to /dist successfully!');