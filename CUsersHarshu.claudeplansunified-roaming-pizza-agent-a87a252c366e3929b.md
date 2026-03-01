# Leaderboard Redesign Plan
## Design Direction: Technical Minimalist / Editorial Brutalism

### Overview
This plan details the implementation of a new high-end leaderboard. The goal is to create a visually memorable, high-craft interface using a "Technical Minimalist" or "Editorial Brutalism" aesthetic.

### Technical Requirements
- Map to new API fields: `displayName`, `providerName`, `eloScore`, `totalResponses`, `winRate`.
- Calculate `eloRank` by array index (sorted by `eloScore` DESC, then `winRate` DESC) rather than using the API's `eloRank`.
- Replace the existing `<table>` layout with CSS Grid.

### Visual Memorability & Anchors
- **Top 3 Podium / Emphasized Rows**: The top 3 models will have distinct visual treatments, perhaps larger typography, distinct subtle gradients, or prominent ranking numbers.
- **Win-Rate Visualization**: An elegant, minimalist progress bar or data visualization block representing win rates without standard UI components.
- **Typography**: Clean, monospace or high-contrast sans-serif data points characteristic of "Technical Minimalist" design.
- **Layout**: Strict grid alignments, prominent spacing, and clear delineation of data hierarchy.

### Step-by-Step Implementation Plan

1. **Refactor JS Logic (`js/leaderboardPage.js` & `js/leaderboardModal.js`)**
   - Update `normalizeItems` or sorting logic to properly handle sorting:
     - Sort primarily by `eloScore` DESC.
     - Sort secondarily by `winRate` DESC.
   - Map properties strictly to the specified keys (`displayName`, `providerName`, `eloScore`, `totalResponses`, `winRate`).
   - Remove usage of API-provided `eloRank` and calculate `rank` using `index + 1`.
   - Update the HTML generation templates to use `div` elements structured for CSS Grid instead of `table`, `tr`, `td`.

2. **Refactor CSS (`css/leaderboard-page.css`)**
   - Remove all existing `table`-related styling.
   - Implement a CSS Grid layout for the leaderboard container.
     - Example: `display: grid; grid-template-columns: 80px 2fr 1fr 1fr 1fr;`
   - Apply the "Technical Minimalist" aesthetic:
     - Use uppercase metadata labels with tight letter spacing.
     - High contrast, sharp edges, and minimal use of rounded corners.
     - Thin borders or strong horizontal rules to separate rows.
   - Style the Win-Rate bar as a stark, minimalist visual element.
   - Emphasize the top 3 items visually (e.g., larger rank numbers, slight opacity differences).

3. **Update Components & Utilities**
   - Ensure the skeleton loader (`renderSkeleton`) matches the new CSS Grid structure.
   - Verify responsiveness (collapsing grid columns on mobile view).

### Critical Files for Implementation
- `js/leaderboardPage.js` - [Core logic to modify for sorting, field mapping, and grid HTML generation]
- `js/leaderboardModal.js` - [Same updates needed if it shares the rendering template or logic]
- `css/leaderboard-page.css` - [Requires complete overhaul to replace tables with CSS Grid and apply the Technical Minimalist aesthetic]
