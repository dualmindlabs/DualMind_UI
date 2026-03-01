# Duplicate CSS Definitions Analysis

**Task**: 3.3 - Document duplicate definitions  
**Date**: Baseline audit  
**Files Compared**: styles.css vs ui-improvements.css

## Executive Summary

- **Total Duplicates Found**: 25+ major class duplicates
- **Conflicting Properties**: 15+ conflicts requiring resolution
- **Severity**: HIGH - Multiple classes have completely different implementations
- **Impact**: Visual inconsistencies, increased file size, maintenance burden

## Critical Duplicates with Conflicts

### 1. `.chat-empty` - MAJOR CONFLICT

**styles.css** (Lines ~400-420):
```css
.chat-empty {
  padding: var(--space-8);
  text-align: center;
  border: var(--border-glass-strong);
  box-shadow: var(--shadow-md);
  max-width: 600px;
  margin: 80px auto;
}
```

**ui-improvements.css** (Lines ~1-30):
```css
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 40px;
  max-width: 700px;
  margin: 80px auto;
  background: rgba(20, 22, 35, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Conflicts**:
- Different display modes (block vs flex)
- Different padding values
- Different max-width (600px vs 700px)
- Different background (none vs rgba with backdrop-filter)
- Different border-radius (not specified vs 20px)

**Resolution**: Use ui-improvements.css version (more complete styling)


### 2. `.response-card` - CRITICAL CONFLICT

**styles.css** (Lines ~600-650):
```css
.response-card {
  padding: var(--space-4);
  border: var(--border-glass-strong);
  box-shadow: var(--shadow-md);
  height: 100%;
  min-height: 400px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}
```

**ui-improvements.css** (Lines ~400-500):
```css
.response-card {
  --accent: var(--chat-accent-left);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 14px 22px;
  background: linear-gradient(180deg, rgba(18, 20, 30, 0.94), rgba(12, 14, 22, 0.92));
  border: 1px solid var(--chat-border);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.38);
  min-height: clamp(260px, 36vh, 360px);
  max-height: min(62vh, 560px);
  overflow: hidden;
  min-width: 0;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal);
}

.response-card::before {
  content: "";
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 12px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), var(--accent), rgba(255, 255, 255, 0.08));
  opacity: 0.8;
}
```

**Conflicts**:
- Different padding (var(--space-4) vs specific px values)
- Different background (none vs gradient)
- Different min/max-height values
- ui-improvements.css adds ::before pseudo-element
- ui-improvements.css adds --accent custom property
- Different border-radius

**Resolution**: Use ui-improvements.css version (more polished, includes accent bar)

### 3. `.user-bubble` - MAJOR CONFLICT

**styles.css** (Lines ~550-570):
```css
.user-bubble {
  max-width: 70%;
  padding: var(--space-3) var(--space-4);
  background: rgba(74, 171, 194, 0.12);
  border: 1px solid rgba(74, 171, 194, 0.25);
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

**ui-improvements.css** (Lines ~200-220):
```css
.user-bubble {
  background: linear-gradient(180deg, rgba(74, 171, 194, 0.18), rgba(74, 171, 194, 0.1));
  border: 1px solid rgba(74, 171, 194, 0.35);
  border-radius: 18px 18px 6px 18px;
  padding: 14px 18px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  max-width: 100%;
}
```

**Conflicts**:
- Different background (solid rgba vs gradient)
- Different border opacity (0.25 vs 0.35)
- Different border-radius (4px vs 6px corner)
- Different padding
- Different max-width (70% vs 100%)
- Different box-shadow
- styles.css has backdrop-filter, ui-improvements.css doesn't

**Resolution**: Merge - use gradient from ui-improvements.css, keep backdrop-filter from styles.css


### 4. `.model-badge` - CONFLICT

**styles.css** (Lines ~650-670):
```css
.model-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: 'Inria Sans', sans-serif;
  font-size: var(--text-sm);
  opacity: 0.9;
}
```

**ui-improvements.css** (Lines ~450-470):
```css
.model-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Outfit', var(--font-family-base);
  color: var(--chat-ink);
  padding: 0;
  background: transparent;
  border: none;
}
```

**Conflicts**:
- Different display (inline-flex vs flex)
- Different gap (var(--space-2) vs 10px)
- Different font-family ('Inria Sans' vs 'Outfit')
- Different font-size (var(--text-sm) vs 13px)
- ui-improvements.css adds font-weight, color, padding, background, border

**Resolution**: Use ui-improvements.css version (more complete)

### 5. `.floating-voting` - MAJOR CONFLICT

**styles.css** (Lines ~1200-1250):
```css
.floating-voting {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, calc(-100% - 14px));
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 1000;
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: calc(100% - 16px);
  flex-wrap: nowrap;
}

@media (max-width: 560px) {
  .floating-voting {
    padding: 8px 12px;
    gap: 8px;
    max-width: 96%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
    background: rgba(15, 15, 20, 0.96);
    border-color: rgba(255, 255, 255, 0.15);
    bottom: calc(100% + 10px);
    top: auto;
    transform: translateX(-50%);
    border-radius: 12px;
    white-space: nowrap;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}
```

**ui-improvements.css** (Lines ~150-170):
```css
.floating-voting-container {
  background: rgba(15, 17, 25, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 16px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

**Conflicts**:
- Different class names (.floating-voting vs .floating-voting-container)
- Different positioning approach
- Different responsive behavior
- styles.css has complex mobile handling

**Resolution**: Keep styles.css version (more complete with responsive handling), remove ui-improvements.css version


### 6. `.vote-btn-light` - TRUNCATION ISSUE

**styles.css** (Lines ~1399-1470):
```css
.vote-btn-light {
  padding: 12px 24px;
  background: rgba(40, 40, 40, 0.8);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}
/* ... extensive hover and active states ... */
```

**ui-improvements.css** (Lines ~180-200):
```css
.vote-btn-light {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vote-btn-light:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.vote-btn-light.active {
  background: rgba(74, 171, 194, 0.2);
  border-color: rgba(74, 171, 194, 0.4);
  box-shadow: 0 0 20px rgba(74, 171, 194, 0.3);
}
```

**Conflicts**:
- Different background colors
- Different border widths (1.5px vs 1px)
- Different font-family (Inter vs not specified)
- styles.css has extensive data-vote attribute styling
- styles.css has ::before and ::after pseudo-elements for icons

**Resolution**: Use styles.css version (more complete with all vote states)

### 7. `.responses-grid` - CONFLICT

**styles.css** (Lines ~580-600):
```css
.responses-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  align-items: start;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.responses-grid.single-response {
  grid-template-columns: 1fr;
  max-width: 800px;
  margin: 0 auto;
}
```

**ui-improvements.css** (Lines ~350-370):
```css
.responses-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  margin: 0;
}

.responses-grid.single-response {
  grid-template-columns: minmax(0, 1fr);
  max-width: 900px;
  margin: 0 auto;
}
```

**Conflicts**:
- Different grid-template-columns (1fr vs minmax(0, 1fr))
- Different gap (var(--space-4) vs 18px)
- Different align-items (start vs stretch)
- Different max-width (1100px vs 100%)
- Different margin (0 auto vs 0)
- Different single-response max-width (800px vs 900px)

**Resolution**: Use ui-improvements.css version (minmax prevents overflow issues)


### 8. `.chat-area` - CONFLICT

**styles.css** (Lines ~380-400):
```css
.chat-area {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}
```

**ui-improvements.css** (Lines ~250-280):
```css
.chat-area {
  --chat-surface: rgba(16, 18, 28, 0.92);
  --chat-surface-strong: rgba(10, 12, 18, 0.96);
  --chat-border: rgba(255, 255, 255, 0.08);
  --chat-ink: rgba(255, 255, 255, 0.92);
  --chat-muted: rgba(255, 255, 255, 0.62);
  --chat-accent-left: #4AABC2;
  --chat-accent-right: #CB9275;
  --chat-accent-user: #7aa6ff;
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  font-family: 'Outfit', var(--font-family-base);
  height: auto;
  overflow: visible;
  display: block;
}
```

**Conflicts**:
- Different max-width (1100px vs 1180px)
- ui-improvements.css adds custom properties
- ui-improvements.css adds font-family, height, overflow, display

**Resolution**: Merge - use ui-improvements.css version, move custom properties to :root

### 9. `.user-avatar` - CONFLICT

**styles.css** (Lines ~540-560):
```css
.user-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  order: 2;
}
```

**ui-improvements.css** (Lines ~290-310):
```css
.chat-area .user-avatar {
  width: 28px;
  height: 28px;
  font-size: 11px;
  background: linear-gradient(135deg, #4AABC2 0%, #577B87 100%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
```

**Conflicts**:
- Different size (32px vs 28px)
- Different gradient colors
- ui-improvements.css adds box-shadow
- ui-improvements.css is scoped to .chat-area

**Resolution**: Use ui-improvements.css version (more polished with shadow)

### 10. `.response-header` - CONFLICT

**styles.css** (Lines ~660-680):
```css
.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
```

**ui-improvements.css** (Lines ~480-500):
```css
.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
```

**Conflicts**:
- Different gap (var(--space-3) vs 12px)
- Different margin-bottom (var(--space-3) vs 0)
- ui-improvements.css adds padding-bottom and border-bottom

**Resolution**: Use ui-improvements.css version (adds visual separation)

