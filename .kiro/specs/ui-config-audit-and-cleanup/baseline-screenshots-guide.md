# Baseline Screenshots Guide

**Task**: 3.2 - Capture baseline screenshots  
**Purpose**: Document current visual appearance before any CSS changes  
**Status**: Manual task - requires browser-based screenshot capture

## Screenshot Requirements

### Breakpoints to Test
1. **320px** - Extra small mobile (iPhone SE)
2. **380px** - Small mobile
3. **560px** - Medium mobile (landscape)
4. **640px** - Large mobile / Small tablet
5. **768px** - Tablet portrait
6. **1024px** - Tablet landscape / Small desktop
7. **1440px** - Desktop
8. **1920px** - Large desktop

### UI States to Capture

#### 1. Empty State
- **File**: `empty-state-{breakpoint}.png`
- **Description**: Chat area with no messages
- **States**: Default empty state with placeholder

#### 2. Sidebar States
- **Files**: 
  - `sidebar-open-{breakpoint}.png`
  - `sidebar-collapsed-{breakpoint}.png`
  - `sidebar-closed-mobile-{breakpoint}.png`
- **Description**: All sidebar visibility states

#### 3. Chat with Messages
- **File**: `chat-with-messages-{breakpoint}.png`
- **Description**: Chat area with user message and responses
- **States**: Normal conversation view

#### 4. Response Cards
- **Files**:
  - `response-cards-side-by-side-{breakpoint}.png`
  - `response-cards-streaming-{breakpoint}.png`
  - `response-cards-winner-loser-{breakpoint}.png`
- **Description**: Response card variations

#### 5. Voting UI
- **Files**:
  - `voting-ui-default-{breakpoint}.png`
  - `voting-ui-hover-{breakpoint}.png`
  - `voting-ui-selected-{breakpoint}.png`
- **Description**: Floating voting buttons in all states


#### 6. Modals
- **Files**:
  - `modal-leaderboard-{breakpoint}.png`
  - `modal-custom-delete-{breakpoint}.png`
  - `modal-custom-edit-{breakpoint}.png`
  - `modal-response-expanded-{breakpoint}.png`
- **Description**: All modal types

#### 7. Dropdowns
- **Files**:
  - `dropdown-mode-selector-{breakpoint}.png`
  - `dropdown-user-menu-{breakpoint}.png`
- **Description**: Dropdown menus open

#### 8. Header States
- **Files**:
  - `header-default-{breakpoint}.png`
  - `header-mobile-{breakpoint}.png`
- **Description**: Header component variations

#### 9. Input States
- **Files**:
  - `input-default-{breakpoint}.png`
  - `input-focused-{breakpoint}.png`
  - `input-with-attachments-{breakpoint}.png`
  - `input-disabled-{breakpoint}.png`
- **Description**: Chat input component states

#### 10. Model Selector
- **Files**:
  - `model-selector-battle-{breakpoint}.png`
  - `model-selector-arena-{breakpoint}.png`
  - `model-selector-direct-{breakpoint}.png`
- **Description**: Model selection UI for each mode

#### 11. Hover States
- **Files**:
  - `hover-buttons-{breakpoint}.png`
  - `hover-response-card-{breakpoint}.png`
  - `hover-sidebar-items-{breakpoint}.png`
- **Description**: Interactive element hover states

#### 12. Focus States
- **Files**:
  - `focus-input-{breakpoint}.png`
  - `focus-buttons-{breakpoint}.png`
- **Description**: Keyboard focus indicators

## Directory Structure

```
.kiro/specs/ui-config-audit-and-cleanup/baseline-screenshots/
├── 320px/
│   ├── empty-state-320px.png
│   ├── sidebar-open-320px.png
│   ├── chat-with-messages-320px.png
│   └── ...
├── 380px/
│   └── ...
├── 560px/
│   └── ...
├── 640px/
│   └── ...
├── 768px/
│   └── ...
├── 1024px/
│   └── ...
├── 1440px/
│   └── ...
└── 1920px/
    └── ...
```

## Screenshot Capture Instructions

### Tools Recommended
1. **Browser DevTools** - Built-in responsive design mode
2. **Playwright** - Automated screenshot capture
3. **Percy** - Visual regression testing service
4. **Manual** - Browser screenshot extensions

### Playwright Script Example

```javascript
// capture-baseline.js
const { chromium } = require('playwright');

const breakpoints = [320, 380, 560, 640, 768, 1024, 1440, 1920];
const baseUrl = 'http://localhost:3000'; // Adjust to your dev server

async function captureBaseline() {
  const browser = await chromium.launch();
  
  for (const width of breakpoints) {
    const context = await browser.newContext({
      viewport: { width, height: 1080 }
    });
    const page = await context.newPage();
    
    // Navigate to app
    await page.goto(baseUrl);
    
    // Capture empty state
    await page.screenshot({
      path: `.kiro/specs/ui-config-audit-and-cleanup/baseline-screenshots/${width}px/empty-state-${width}px.png`,
      fullPage: true
    });
    
    // Add more screenshot captures for different states...
    
    await context.close();
  }
  
  await browser.close();
}

captureBaseline();
```

### Manual Capture Steps

1. **Open Application** in browser
2. **Open DevTools** (F12)
3. **Enable Responsive Design Mode** (Ctrl+Shift+M)
4. **Set viewport width** to target breakpoint
5. **Navigate to desired UI state**
6. **Capture screenshot** (DevTools screenshot tool or extension)
7. **Save** to appropriate directory with naming convention
8. **Repeat** for all breakpoints and states

## Validation Checklist

After capturing screenshots, verify:

- [ ] All 8 breakpoints captured
- [ ] All 12 UI state categories captured
- [ ] Screenshots are full-page where appropriate
- [ ] File naming follows convention: `{state}-{breakpoint}px.png`
- [ ] Images are high quality (PNG format, not compressed)
- [ ] Directory structure matches specification
- [ ] Total screenshots: ~96 images (12 states × 8 breakpoints)

## Notes for Visual Regression Testing

These baseline screenshots will be used to:
1. Compare against post-fix screenshots
2. Identify unintended visual changes
3. Validate that preservation requirements are met
4. Document the "before" state for stakeholders

## Estimated Time

- **Automated (Playwright)**: 15-30 minutes to write script + 10 minutes to run
- **Manual**: 2-3 hours for all breakpoints and states

## Next Steps

After screenshots are captured:
1. Review all images for completeness
2. Document any visual issues observed
3. Proceed to Task 3.3 (Document duplicate definitions)
4. Use screenshots as reference during CSS consolidation

