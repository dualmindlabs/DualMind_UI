# Bugfix Requirements Document: UI Configuration Audit and Cleanup

## Introduction

This document identifies and catalogs ALL UI configuration mistakes, inconsistencies, and issues discovered through a comprehensive deep audit of the DualMind UI codebase. The audit analyzed App.jsx (React), vanilla JS components (Header.js, Sidebar.js, ChatInput.js), and all CSS files (styles.css, ui-improvements.css, custom-modal.css, sidebar-actions.css).

The issues span multiple categories including architectural inconsistencies, CSS duplication and conflicts, styling inconsistencies, responsive design problems, accessibility gaps, layout issues, animation inconsistencies, typography problems, variable usage issues, and dead code.

This bugfix addresses systematic cleanup and standardization of the entire UI configuration to ensure consistency, maintainability, and proper functionality across all components and breakpoints.

## Bug Analysis

### Current Behavior (Defect)

#### 1. Architectural & Paradigm Issues

1.1 WHEN the application loads THEN the system uses mixed paradigms with App.jsx as React component while Header.js, Sidebar.js, and ChatInput.js are vanilla JS classes, creating inconsistent component architecture

1.2 WHEN components need to communicate THEN the system uses custom events (document.dispatchEvent) instead of proper React patterns, causing fragile coupling

1.3 WHEN App.jsx renders THEN the system has a complete React-based Sidebar implementation that conflicts with the vanilla JS Sidebar.js component

1.4 WHEN styling is applied THEN the system uses inline Tailwind-style className arrays in App.jsx while vanilla components use traditional CSS classes, creating inconsistent styling approaches

#### 2. CSS Duplication & File Conflicts

2.1 WHEN styles.css and ui-improvements.css are loaded THEN the system has massive duplication with .chat-area, .chat-empty, .response-card, .user-bubble, .model-badge, and 30+ other classes defined in both files with conflicting values

2.2 WHEN .response-card is styled THEN the system has 3 different background values: rgba(20, 22, 35, 0.6) in ui-improvements.css vs linear-gradient in ui-improvements.css vs styles.css definitions

2.3 WHEN .chat-input-container is styled THEN the system has conflicting border-radius values: 24px in styles.css vs 20px in ui-improvements.css

2.4 WHEN .vote-btn-light is defined THEN the system has incomplete definition in styles.css (truncated at line 1399) with the rest of the styles appearing later

2.5 WHEN font-family is applied THEN the system uses 'Inter' in styles.css but 'Outfit' in ui-improvements.css for the same elements


#### 3. Color & Styling Inconsistencies

3.1 WHEN accent colors are used THEN the system has inconsistent cyan values: #4AABC2 vs #22d3ee (--color-accent) vs rgba(74, 171, 194, X) with no single source of truth

3.2 WHEN background colors are applied THEN the system uses rgba(20, 22, 35, 0.8) vs rgba(15, 17, 25, 0.95) vs rgba(10, 12, 14, 0.72) vs rgba(16, 18, 28, 0.92) for similar glass effects

3.3 WHEN border colors are defined THEN the system has inconsistent white opacity values: 0.1, 0.08, 0.06, 0.12, 0.15, 0.18, 0.2, 0.25 with no systematic scale

3.4 WHEN border-radius is applied THEN the system uses inconsistent values: 8px, 10px, 12px, 14px, 16px, 18px, 20px, 24px, 32px with overlapping CSS variables and hardcoded values

3.5 WHEN spacing is applied THEN the system mixes CSS variables (--space-X) with hardcoded pixel values (12px, 16px, 20px) inconsistently

3.6 WHEN gradients are used THEN the system has multiple gradient definitions for similar effects with no reusable pattern

#### 4. Responsive Design Issues

4.1 WHEN viewport is below 1024px THEN the system has conflicting sidebar behavior with both transform: translateX(-100%) and width transitions

4.2 WHEN mobile breakpoint is reached THEN the system has inconsistent breakpoint values: 640px, 768px, 1024px used differently across files

4.3 WHEN on mobile THEN the system has .floating-voting with complex responsive behavior that breaks layout on screens below 560px

4.4 WHEN on tablet THEN the system has #header-container left positioning that conflicts with sidebar state

4.5 WHEN on small mobile (380px) THEN the system hides .mode-text but doesn't adjust button padding proportionally

4.6 WHEN on short screens (max-height: 700px) THEN the system has hardcoded padding-bottom that may not account for all UI elements

#### 5. Accessibility Issues

5.1 WHEN using keyboard navigation THEN the system has inconsistent focus states with some buttons using :focus-visible and others using :focus

5.2 WHEN screen readers are used THEN the system has missing aria-label attributes on multiple icon buttons in App.jsx Sidebar component

5.3 WHEN tooltips are shown THEN the system has tooltip implementation in App.jsx but not in vanilla JS components, creating inconsistent UX

5.4 WHEN focus trap is enabled in Sidebar.js THEN the system has complex focus management that may conflict with React component focus

5.5 WHEN color contrast is checked THEN the system uses rgba(255, 255, 255, 0.4) and rgba(255, 255, 255, 0.45) for text which may fail WCAG AA standards

5.6 WHEN interactive elements are sized THEN the system has inconsistent touch target sizes: 32px, 34px, 36px, 40px, 44px with no mobile-first approach


#### 6. Layout & Positioning Issues

6.1 WHEN z-index is applied THEN the system has potential conflicts with --z-sidebar: 20, --z-overlay: 30, --z-dropdown: 35, --z-modal: 40 but custom-modal.css uses z-index: 99999

6.2 WHEN #chat-input-container is positioned THEN the system has complex calc() expressions that may break with sidebar state changes

6.3 WHEN .floating-voting is positioned THEN the system uses transform: translate(-50%, calc(-100% - 14px)) which may cause overflow issues

6.4 WHEN .main-content is laid out THEN the system has fixed positioning that doesn't account for dynamic header height changes

6.5 WHEN .sidebar is collapsed THEN the system has .floating-toggle button that appears but may overlap with other UI elements

6.6 WHEN modals are shown THEN the system has .response-modal with z-index: 10050 that conflicts with .custom-modal-root z-index: 99999

#### 7. Animation & Transition Inconsistencies

7.1 WHEN transitions are applied THEN the system uses inconsistent timing functions: cubic-bezier(0.4, 0, 0.2, 1) vs cubic-bezier(0.34, 1.56, 0.64, 1) vs ease vs ease-out

7.2 WHEN animations run THEN the system has inconsistent durations: 0.15s, 0.2s, 0.25s, 0.3s, 0.4s with overlapping CSS variables

7.3 WHEN hover effects are applied THEN the system has inconsistent transform values: translateY(-1px), translateY(-2px), scale(1.05), scale(1.02)

7.4 WHEN skeleton loading is shown THEN the system has two different animation names: skeleton-shimmer and skeleton-loading for the same effect

7.5 WHEN elements fade in THEN the system has multiple fadeIn, slideIn, scaleIn animations with inconsistent easing

#### 8. Typography Issues

8.1 WHEN fonts are loaded THEN the system references 'Inter', 'Inria Sans', 'Outfit', 'Do Hyeon', 'JetBrains Mono' but doesn't verify they're loaded

8.2 WHEN font sizes are applied THEN the system mixes CSS variables (--text-sm, --text-base) with hardcoded values (13px, 14px, 15px, 16px)

8.3 WHEN font weights are used THEN the system uses numeric values (400, 500, 600, 700) and CSS variables (--font-normal, --font-medium) inconsistently

8.4 WHEN line heights are set THEN the system uses 1.5, 1.6, 1.65, 1.7, --leading-relaxed with no clear pattern

8.5 WHEN letter spacing is applied THEN the system uses -0.01em, -0.02em, 0.01em, 0.2px, 0.5px, 0.6px inconsistently


#### 9. CSS Variable Issues

9.1 WHEN CSS variables are referenced THEN the system uses undefined variables: --color-cyan, --color-teal, --color-terra, --color-white, --color-black not defined in :root

9.2 WHEN glass effects are applied THEN the system defines --glass-bg, --glass-bg-strong but also uses --glass-dark, --glass-light, --glass-btn, --glass-hover, --glass-active without clear hierarchy

9.3 WHEN borders are styled THEN the system defines --border-primary, --border-secondary but also uses --border-glass, --border-glass-strong with overlapping values

9.4 WHEN variables are used THEN the system has --glass-sidebar, --glass-header, --glass-card, --glass-input defined but rarely used, with hardcoded values preferred

9.5 WHEN color variables are applied THEN the system defines --color-primary: #6366f1 but uses #4AABC2 (cyan) as the primary brand color throughout

#### 10. Component-Specific Issues

10.1 WHEN App.jsx Sidebar renders THEN the system has duplicate sidebar implementation that never shows because vanilla Sidebar.js takes precedence

10.2 WHEN Header.js renders mode dropdown THEN the system has z-index: var(--z-dropdown) that may be covered by other elements

10.3 WHEN Sidebar.js manages state THEN the system has complex isOpen/isCollapsed/isMobile logic that may conflict with CSS classes

10.4 WHEN ChatInput.js handles attachments THEN the system has .attachments-preview that uses display: none instead of proper React conditional rendering

10.5 WHEN custom-modal.css is loaded THEN the system has completely different design language (gradient backgrounds, different border radius) from main UI

#### 11. Dead Code & Unused Styles

11.1 WHEN CSS is parsed THEN the system has .api-btn, .api-indicator, .api-text styles defined but no corresponding HTML elements in components

11.2 WHEN classes are searched THEN the system has .more-btn defined in styles.css but never used in any component

11.3 WHEN animations are checked THEN the system has .animate-fade-in, .animate-slide-in, .animate-scale-in utility classes that are never applied

11.4 WHEN tooltips are inspected THEN the system has [data-tooltip] CSS but no elements use this attribute

11.5 WHEN modals are reviewed THEN the system has .dm-modal styles for leaderboard but incomplete implementation

11.6 WHEN sidebar is checked THEN the system has .footer-row class in Sidebar.js HTML but no corresponding CSS definition


#### 12. Specificity & Cascade Issues

12.1 WHEN styles cascade THEN the system has .chat-area .response-card .response-body a selector in ui-improvements.css that may not work due to specificity

12.2 WHEN !important is used THEN the system has .hidden { display: none !important; } and multiple border-color !important rules creating maintenance issues

12.3 WHEN media queries are applied THEN the system has overlapping breakpoints with different styles for the same element

12.4 WHEN pseudo-elements are styled THEN the system has ::before and ::after with inconsistent positioning and z-index values

12.5 WHEN hover states are defined THEN the system has :hover styles that may conflict with :focus-visible styles

#### 13. Browser Compatibility Issues

13.1 WHEN backdrop-filter is used THEN the system has @supports fallback but inconsistent implementation across components

13.2 WHEN CSS Grid is used THEN the system has .responses-grid with minmax(0, 1fr) but no fallback for older browsers

13.3 WHEN custom properties are used THEN the system has no fallback values for browsers that don't support CSS variables

13.4 WHEN scrollbar is styled THEN the system uses ::-webkit-scrollbar without Firefox fallback (scrollbar-width, scrollbar-color)

13.5 WHEN safe-area-inset is used THEN the system has env(safe-area-inset-bottom, 0px) but inconsistent application across components

#### 14. Performance Issues

14.1 WHEN styles are loaded THEN the system loads 4 separate CSS files (styles.css 3300 lines, ui-improvements.css, custom-modal.css, sidebar-actions.css) with massive duplication

14.2 WHEN animations run THEN the system has multiple animations (fadeIn, slideIn, scaleIn, skeleton-shimmer, skeleton-loading, pulse-glow, spin, caretBlink, dm-stream-sweep) that may cause repaints

14.3 WHEN backdrop-filter is applied THEN the system uses blur(24px) on multiple overlapping elements causing performance degradation

14.4 WHEN gradients are rendered THEN the system has complex multi-stop gradients and radial gradients that may impact paint performance

14.5 WHEN box-shadows are applied THEN the system has multiple layered shadows (0 8px 32px, 0 0 0 1px, 0 0 40px) on many elements

#### 15. State Management Issues

15.1 WHEN sidebar state changes THEN the system uses both CSS classes (.open, .collapsed) and inline styles (style.width) inconsistently

15.2 WHEN voting state is tracked THEN the system uses .active, .vote-highlight-green, .vote-selected-green classes with unclear precedence

15.3 WHEN loading state is shown THEN the system uses .loading class on submit-btn but also has separate .loader-spinner component

15.4 WHEN modal state changes THEN the system uses .show, .open, [hidden] attribute inconsistently across different modals

15.5 WHEN dropdown state is managed THEN the system uses aria-expanded attribute but also .open class with potential sync issues


### Expected Behavior (Correct)

#### 1. Architectural & Paradigm Fixes

2.1 WHEN the application loads THEN the system SHALL use a single consistent paradigm (either all React or all vanilla JS) for all UI components

2.2 WHEN components need to communicate THEN the system SHALL use proper React patterns (props, context, state management) or a consistent event bus pattern

2.3 WHEN App.jsx renders THEN the system SHALL either use the React Sidebar or remove it in favor of vanilla JS implementation, not both

2.4 WHEN styling is applied THEN the system SHALL use a single consistent approach (CSS classes with external stylesheets) across all components

#### 2. CSS Consolidation Fixes

2.5 WHEN styles are loaded THEN the system SHALL consolidate styles.css and ui-improvements.css into a single source of truth with no duplication

2.6 WHEN .response-card is styled THEN the system SHALL have exactly one background definition used consistently

2.7 WHEN .chat-input-container is styled THEN the system SHALL have exactly one border-radius value

2.8 WHEN .vote-btn-light is defined THEN the system SHALL have complete, non-truncated definition in a single location

2.9 WHEN font-family is applied THEN the system SHALL use a single font stack consistently across all components

#### 3. Color & Styling Standardization

2.10 WHEN accent colors are used THEN the system SHALL define a single --color-accent variable and use it consistently everywhere

2.11 WHEN background colors are applied THEN the system SHALL use a systematic scale (--bg-glass-1, --bg-glass-2, --bg-glass-3) with clear semantic meaning

2.12 WHEN border colors are defined THEN the system SHALL use a systematic opacity scale (0.05, 0.1, 0.15, 0.2) defined as CSS variables

2.13 WHEN border-radius is applied THEN the system SHALL use only CSS variables (--radius-xs through --radius-2xl) with no hardcoded values

2.14 WHEN spacing is applied THEN the system SHALL use only CSS variables (--space-1 through --space-16) with no hardcoded pixel values

2.15 WHEN gradients are used THEN the system SHALL define reusable gradient variables for common patterns

#### 4. Responsive Design Fixes

2.16 WHEN viewport is below 1024px THEN the system SHALL use consistent sidebar behavior with clear mobile/desktop distinction

2.17 WHEN mobile breakpoint is reached THEN the system SHALL use standardized breakpoint values (640px, 768px, 1024px) consistently

2.18 WHEN on mobile THEN the system SHALL have .floating-voting that adapts gracefully to all screen sizes without breaking layout

2.19 WHEN on tablet THEN the system SHALL have #header-container positioning that works correctly with all sidebar states

2.20 WHEN on small mobile (380px) THEN the system SHALL adjust all button sizes and spacing proportionally

2.21 WHEN on short screens (max-height: 700px) THEN the system SHALL calculate padding-bottom dynamically based on actual UI element heights


#### 5. Accessibility Improvements

2.22 WHEN using keyboard navigation THEN the system SHALL use :focus-visible consistently on all interactive elements

2.23 WHEN screen readers are used THEN the system SHALL have proper aria-label attributes on all icon-only buttons

2.24 WHEN tooltips are shown THEN the system SHALL implement consistent tooltip pattern across all components with proper ARIA attributes

2.25 WHEN focus trap is enabled THEN the system SHALL use a single, well-tested focus management solution

2.26 WHEN color contrast is checked THEN the system SHALL use text colors that meet WCAG AA standards (minimum 4.5:1 for normal text)

2.27 WHEN interactive elements are sized THEN the system SHALL use minimum 44x44px touch targets on mobile devices

#### 6. Layout & Positioning Fixes

2.28 WHEN z-index is applied THEN the system SHALL use consistent z-index scale (1, 10, 20, 30, 40, 50) across all files

2.29 WHEN #chat-input-container is positioned THEN the system SHALL use simplified positioning that works reliably with sidebar state

2.30 WHEN .floating-voting is positioned THEN the system SHALL use positioning that prevents overflow and works on all screen sizes

2.31 WHEN .main-content is laid out THEN the system SHALL account for dynamic header height using CSS variables

2.32 WHEN .sidebar is collapsed THEN the system SHALL position .floating-toggle without overlapping other UI elements

2.33 WHEN modals are shown THEN the system SHALL use consistent z-index values that respect the global stacking order

#### 7. Animation & Transition Standardization

2.34 WHEN transitions are applied THEN the system SHALL use consistent timing functions defined as CSS variables

2.35 WHEN animations run THEN the system SHALL use consistent durations from CSS variables (--transition-fast, --transition-normal, --transition-slow)

2.36 WHEN hover effects are applied THEN the system SHALL use consistent transform values (translateY(-2px), scale(1.05))

2.37 WHEN skeleton loading is shown THEN the system SHALL use a single animation name and implementation

2.38 WHEN elements fade in THEN the system SHALL use consistent animation definitions with matching easing functions

#### 8. Typography Standardization

2.39 WHEN fonts are loaded THEN the system SHALL verify font loading and provide proper fallbacks

2.40 WHEN font sizes are applied THEN the system SHALL use only CSS variables (--text-xs through --text-4xl)

2.41 WHEN font weights are used THEN the system SHALL use only CSS variables (--font-normal through --font-bold)

2.42 WHEN line heights are set THEN the system SHALL use only CSS variables (--leading-tight, --leading-normal, --leading-relaxed)

2.43 WHEN letter spacing is applied THEN the system SHALL use consistent values defined as CSS variables


#### 9. CSS Variable Fixes

2.44 WHEN CSS variables are referenced THEN the system SHALL define all variables in :root with no undefined references

2.45 WHEN glass effects are applied THEN the system SHALL use a clear hierarchy (--glass-1, --glass-2, --glass-3) with semantic naming

2.46 WHEN borders are styled THEN the system SHALL consolidate border variables into a single consistent set

2.47 WHEN variables are used THEN the system SHALL actually use defined variables instead of hardcoded values

2.48 WHEN color variables are applied THEN the system SHALL align variable names with actual usage (--color-primary should be the primary brand color)

#### 10. Component-Specific Fixes

2.49 WHEN App.jsx renders THEN the system SHALL remove duplicate Sidebar implementation

2.50 WHEN Header.js renders mode dropdown THEN the system SHALL ensure proper z-index stacking

2.51 WHEN Sidebar.js manages state THEN the system SHALL simplify state logic to prevent conflicts

2.52 WHEN ChatInput.js handles attachments THEN the system SHALL use proper conditional rendering patterns

2.53 WHEN custom-modal.css is loaded THEN the system SHALL align modal design with main UI design language

#### 11. Dead Code Removal

2.54 WHEN CSS is parsed THEN the system SHALL remove all unused styles (.api-btn, .api-indicator, .api-text, .more-btn)

2.55 WHEN classes are searched THEN the system SHALL remove unused utility classes or document their intended use

2.56 WHEN animations are checked THEN the system SHALL remove unused animation classes or apply them where needed

2.57 WHEN tooltips are inspected THEN the system SHALL either implement [data-tooltip] functionality or remove the CSS

2.58 WHEN modals are reviewed THEN the system SHALL complete or remove incomplete .dm-modal implementation

2.59 WHEN sidebar is checked THEN the system SHALL add missing CSS for .footer-row or remove the class from HTML

#### 12. Specificity & Cascade Fixes

2.60 WHEN styles cascade THEN the system SHALL use appropriate specificity without overly complex selectors

2.61 WHEN !important is used THEN the system SHALL minimize usage and document why it's necessary

2.62 WHEN media queries are applied THEN the system SHALL ensure no conflicting styles at breakpoints

2.63 WHEN pseudo-elements are styled THEN the system SHALL use consistent positioning and z-index patterns

2.64 WHEN hover states are defined THEN the system SHALL ensure they work harmoniously with focus states


#### 13. Browser Compatibility Fixes

2.65 WHEN backdrop-filter is used THEN the system SHALL implement consistent fallback across all components

2.66 WHEN CSS Grid is used THEN the system SHALL provide flexbox fallback for older browsers

2.67 WHEN custom properties are used THEN the system SHALL provide fallback values where critical

2.68 WHEN scrollbar is styled THEN the system SHALL include both webkit and Firefox scrollbar styles

2.69 WHEN safe-area-inset is used THEN the system SHALL apply consistently across all fixed/absolute positioned elements

#### 14. Performance Improvements

2.70 WHEN styles are loaded THEN the system SHALL consolidate into a single optimized CSS file

2.71 WHEN animations run THEN the system SHALL use GPU-accelerated properties (transform, opacity) and minimize repaints

2.72 WHEN backdrop-filter is applied THEN the system SHALL limit usage to essential elements only

2.73 WHEN gradients are rendered THEN the system SHALL simplify complex gradients where possible

2.74 WHEN box-shadows are applied THEN the system SHALL consolidate layered shadows into single definitions

#### 15. State Management Fixes

2.75 WHEN sidebar state changes THEN the system SHALL use CSS classes exclusively for state management

2.76 WHEN voting state is tracked THEN the system SHALL use clear, non-overlapping class names with documented precedence

2.77 WHEN loading state is shown THEN the system SHALL use consistent loading state pattern across all components

2.78 WHEN modal state changes THEN the system SHALL use consistent state management pattern (prefer classes over attributes)

2.79 WHEN dropdown state is managed THEN the system SHALL keep aria-expanded in sync with visual state

### Unchanged Behavior (Regression Prevention)

#### 3. Core Functionality Preservation

3.1 WHEN users interact with the sidebar THEN the system SHALL CONTINUE TO open, close, and collapse as expected

3.2 WHEN users type in the chat input THEN the system SHALL CONTINUE TO auto-resize and handle input correctly

3.3 WHEN users click vote buttons THEN the system SHALL CONTINUE TO register votes and update UI state

3.4 WHEN users open modals THEN the system SHALL CONTINUE TO display modals with proper overlay and focus management

3.5 WHEN users navigate with keyboard THEN the system SHALL CONTINUE TO support full keyboard navigation

3.6 WHEN users view on mobile THEN the system SHALL CONTINUE TO display responsive mobile layout

3.7 WHEN users hover over elements THEN the system SHALL CONTINUE TO show appropriate hover states

3.8 WHEN users view chat responses THEN the system SHALL CONTINUE TO display side-by-side comparison correctly

3.9 WHEN users scroll content THEN the system SHALL CONTINUE TO scroll smoothly with proper overflow handling

3.10 WHEN users switch modes THEN the system SHALL CONTINUE TO change between Battle, Arena, and Direct Chat modes


#### 4. Visual Consistency Preservation

3.11 WHEN the UI is viewed THEN the system SHALL CONTINUE TO maintain the dark, glassmorphic design aesthetic

3.12 WHEN colors are displayed THEN the system SHALL CONTINUE TO use the cyan/teal accent color scheme

3.13 WHEN animations play THEN the system SHALL CONTINUE TO provide smooth, polished transitions

3.14 WHEN text is rendered THEN the system SHALL CONTINUE TO display crisp, readable typography

3.15 WHEN spacing is applied THEN the system SHALL CONTINUE TO maintain comfortable visual hierarchy

#### 5. Component Behavior Preservation

3.16 WHEN Header component renders THEN the system SHALL CONTINUE TO display mode selector and user menu

3.17 WHEN Sidebar component renders THEN the system SHALL CONTINUE TO show recent chats and navigation

3.18 WHEN ChatInput component renders THEN the system SHALL CONTINUE TO show action buttons and submit button

3.19 WHEN response cards render THEN the system SHALL CONTINUE TO display model responses with proper formatting

3.20 WHEN voting UI renders THEN the system SHALL CONTINUE TO show voting options after responses complete

#### 6. Interaction Preservation

3.21 WHEN users click buttons THEN the system SHALL CONTINUE TO provide visual feedback (hover, active states)

3.22 WHEN users focus inputs THEN the system SHALL CONTINUE TO show focus rings and visual indicators

3.23 WHEN users open dropdowns THEN the system SHALL CONTINUE TO display dropdown menus correctly positioned

3.24 WHEN users resize window THEN the system SHALL CONTINUE TO adapt layout responsively

3.25 WHEN users use touch devices THEN the system SHALL CONTINUE TO support touch interactions properly

#### 7. Accessibility Preservation

3.26 WHEN screen readers are used THEN the system SHALL CONTINUE TO announce UI elements correctly

3.27 WHEN keyboard navigation is used THEN the system SHALL CONTINUE TO support tab navigation

3.28 WHEN high contrast mode is enabled THEN the system SHALL CONTINUE TO remain usable

3.29 WHEN zoom is increased THEN the system SHALL CONTINUE TO scale appropriately

3.30 WHEN reduced motion is preferred THEN the system SHALL CONTINUE TO respect prefers-reduced-motion

#### 8. Performance Preservation

3.31 WHEN page loads THEN the system SHALL CONTINUE TO load quickly without blocking rendering

3.32 WHEN animations run THEN the system SHALL CONTINUE TO maintain 60fps performance

3.33 WHEN many elements are rendered THEN the system SHALL CONTINUE TO handle large DOMs efficiently

3.34 WHEN styles are applied THEN the system SHALL CONTINUE TO avoid layout thrashing

3.35 WHEN images load THEN the system SHALL CONTINUE TO handle loading states gracefully

