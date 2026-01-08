# DualMind UI - Blank Screen Debug Guide

## Issue Summary
App loads with background image visible but no UI components (sidebar, header, chat input) rendering.

## Project Type
**Vanilla JavaScript with ES6 Modules** (NOT React)
- Entry: `index.html`
- Main script: `js/app-final.js` (ES6 module)
- Components: Vanilla JS classes in `/components/`

## Root Cause Analysis

The app initializes components in `js/app-final.js` at line 993:
```javascript
const app = new App();
```

Components should render into these containers:
- `#sidebar-container` → Sidebar component
- `#header-container` → Header component  
- `#main-content` → ChatView component
- `#chat-input-container` → ChatInput component

**Possible causes:**
1. JavaScript module loading error (CORS, 404, syntax error)
2. Missing dependency files
3. Async initialization race condition
4. CSS hiding elements (`display: none`, `opacity: 0`, `z-index` issues)

## Step-by-Step Debugging

### 1. Check Browser Console (CRITICAL)

**Press F12** → **Console tab**

Look for errors in RED:
- ❌ `Failed to load module` → Missing JS file
- ❌ `Uncaught SyntaxError` → Code syntax error
- ❌ `Uncaught ReferenceError` → Undefined variable/function
- ❌ `CORS error` → Server not serving files correctly

**Run these commands in Console:**
```javascript
// Check if app initialized
window.LMArena

// Check if containers exist
document.getElementById('sidebar-container')
document.getElementById('header-container')
document.getElementById('main-content')
document.getElementById('chat-input-container')

// Check if containers have content
document.getElementById('sidebar-container').innerHTML
document.getElementById('header-container').innerHTML

// Check if components loaded
window.LMArena?.components
```

**Expected results:**
- `window.LMArena` should be an object (not undefined)
- Containers should exist (not null)
- `.innerHTML` should have HTML content (not empty string)

### 2. Check Network Tab

**F12** → **Network tab** → Reload page

Look for failed requests (red text, 404 status):
- `app-final.js` - Main app
- `Sidebar.js`, `Header.js`, `ChatInput.js`, `ChatView.js` - Components
- `icons.js`, `mockArena.js`, `apiClient.js` - Dependencies
- `styles.css`, `auth-styles.css` - Stylesheets

**All should be 200 OK status**

### 3. Check Elements Tab

**F12** → **Elements tab**

Inspect the DOM structure:
```html
<div id="app">
  <img class="app-background" src="..."> <!-- ✅ This loads -->
  <div id="sidebar-container">
    <!-- Should have <aside> element inside -->
  </div>
  <div id="header-container">
    <!-- Should have <header> element inside -->
  </div>
  <main id="main-content" class="main-content">
    <!-- Should have chat content -->
  </main>
  <div id="chat-input-container">
    <!-- Should have chat input -->
  </div>
</div>
```

**If containers are empty** → JavaScript not running
**If containers have content but invisible** → CSS issue

### 4. Check CSS Issues

In **Elements tab**, select `#sidebar-container` and check **Styles panel**:

Look for these CSS properties that hide elements:
- `display: none` ❌
- `opacity: 0` ❌
- `visibility: hidden` ❌
- `z-index: -1` ❌
- `position: absolute; left: -9999px` ❌
- `transform: translateX(-100%)` ❌ (mobile sidebar)

### 5. Check for CORS Issues

If you see CORS errors, the server needs proper headers.

**Fix:** Use `npx serve` with CORS enabled:
```bash
npx serve . -p 8000 --cors
```

## Common Fixes

### Fix 1: Module Loading Error

**Symptom:** Console shows `Failed to load module script`

**Solution:** Ensure server is running and serving files correctly:
```bash
npm start
```

Server should show: `Serving! - Local: http://localhost:8000`

### Fix 2: Missing Dependencies

**Symptom:** Console shows `Cannot find module` or `404 Not Found`

**Solution:** Check all files exist:
```bash
# Check if files exist
ls js/app-final.js
ls components/Sidebar.js
ls components/Header.js
ls components/ChatInput.js
ls components/chat/ChatView.js
ls js/icons.js
ls js/mockArena.js
ls js/apiClient.js
```

### Fix 3: Async Initialization Race

**Symptom:** `window.LMArena` is undefined or components are null

**Solution:** The app waits for DOMContentLoaded, but check if auth is blocking:

In `js/app-final.js` line 85-94, the app checks authentication and may redirect.

**Quick fix:** Enable guest mode:
```javascript
// In browser console
localStorage.setItem('dualmind.guest', 'true');
location.reload();
```

### Fix 4: CSS Hiding Elements

**Symptom:** Elements exist in DOM but not visible

**Solution:** Check computed styles in DevTools:
1. Select element in Elements tab
2. Check Computed tab
3. Look for `display`, `opacity`, `visibility`, `z-index`

**Override in Console:**
```javascript
document.getElementById('sidebar-container').style.display = 'block';
document.getElementById('sidebar-container').style.opacity = '1';
document.getElementById('sidebar-container').style.visibility = 'visible';
```

### Fix 5: Background Image Blocking Content

**Symptom:** Background loads but covers UI

**Solution:** Check z-index in CSS:
```css
.app-background {
  z-index: -1; /* Should be negative */
}
```

## Quick Test Commands

Run these in **Browser Console** to test:

```javascript
// 1. Check app loaded
console.log('App:', window.LMArena);

// 2. Force render components
if (window.LMArena?.components) {
  window.LMArena.components.sidebar?.render();
  window.LMArena.components.header?.render();
  window.LMArena.components.chatInput?.render();
  window.LMArena.components.chatView?.render();
}

// 3. Check component state
console.log('Sidebar:', window.LMArena?.components?.sidebar);
console.log('Header:', window.LMArena?.components?.header);
console.log('ChatInput:', window.LMArena?.components?.chatInput);
console.log('ChatView:', window.LMArena?.components?.chatView);

// 4. Manually inject test content
document.getElementById('sidebar-container').innerHTML = '<div style="background:red;color:white;padding:20px;">SIDEBAR TEST</div>';
document.getElementById('header-container').innerHTML = '<div style="background:blue;color:white;padding:20px;">HEADER TEST</div>';
```

## Expected Behavior

When working correctly:
1. Server starts on port 8000
2. Browser loads `index.html`
3. `app-final.js` loads as ES6 module
4. App class initializes
5. Components render into containers
6. UI appears with sidebar, header, and chat input

## Next Steps

1. **Open browser to http://localhost:8000**
2. **Press F12** to open DevTools
3. **Check Console tab** for errors
4. **Run diagnostic commands** above
5. **Report findings** - share console errors or screenshots

## Files to Share for Diagnosis

If issue persists, share:
- Screenshot of browser console (F12 → Console)
- Screenshot of Network tab showing failed requests
- Output of: `document.getElementById('sidebar-container').innerHTML`
- Any red error messages from console
