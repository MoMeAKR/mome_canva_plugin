# UI/UX Design Guide

This document defines the visual language, CSS tokens, component patterns, data visualization rules, and interaction principles used across submodules (`Blagounette`, `Pump`, and future widgets) so they can be consistently applied to new submodals, editors, trackers, and views.

---

## 1. Core Design Principles

1. **Clarity & Low Visual Noise**:
   - Avoid rendering empty placeholders (e.g., never show `"label"` or `"→"` on unlabeled edges) or permanent high-contrast destructive buttons on every element.
   - Reveal secondary controls contextually (discrete handles, quick-click popovers, subtle danger states that only tint red on hover, keyboard shortcuts).
2. **Progressive Disclosure & Selection-Gated Lists**:
   - Keep secondary or historical template lists hidden until the user expresses intent (e.g., selecting at least one filter/item in a builder).
   - Once triggered, reveal a larger scrollable list (`max-height: 320px`) strictly filtered by the exact selected item(s), ranked by **exact match → prefix match → compactness → usage frequency & recency**.
3. **Separation of Display vs. Construction**:
   - **Initial / Entry Modals & Detail Views** are strictly **read-only for complex canvases/graphs** (`editable: false`), keeping the overview light, scannable, and free of nested form clutter.
   - **Dedicated Editor / Builder Modals** own the construction experience (`editable: true`) and claim generous viewport real estate (`96vw × 90vh`).
4. **Typography-Driven Hierarchy**:
   - Use the modern UI sans-serif stack (`--blag-font-sans`) for all headings, body text, buttons, inputs, and menus.
   - Reserve monospace (`--blag-font-mono`) strictly for `#tags`, unit badges (`#reps`, `#hold`), numeric inputs/chart ticks, delta badges (`+12`, `★ New PR!`), keyboard shortcut badges (`Enter ↵`, `Tab`, `N`, `Del`), and system paths.
5. **Forgiving UX & Mistake Recovery**:
   - Every user-created template, queued group, or session entry must provide a direct, low-friction way to undo or delete mistakes across builder, active, and summary states.

---

## 2. CSS Design Tokens

Every root container (`.blagounette-widget`, `.blagounette-modal`, `.workout-widget`, `.workout-modal`, floating menus, inline submodals) inherits the following CSS variables:

```css
--blag-font-sans: var(--font-interface), -apple-system, BlinkMacSystemFont, "Inter",
  "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif;
--blag-font-mono: var(--font-monospace), "JetBrains Mono", "SF Mono", Menlo, monospace;

--blag-radius-sm: 6px;
--blag-radius-md: 8px;
--blag-radius-lg: 12px;
--blag-radius-xl: 16px;
--blag-radius-pill: 999px;

--blag-border-subtle: color-mix(in srgb, var(--background-modifier-border) 65%, transparent 35%);
--blag-border-strong: color-mix(in srgb, var(--background-modifier-border) 90%, transparent 10%);
--blag-surface-elevated: color-mix(in srgb, var(--background-primary) 96%, var(--background-secondary) 4%);
--blag-surface-subtle: color-mix(in srgb, var(--background-secondary) 38%, transparent 62%);
--blag-surface-hover: color-mix(in srgb, var(--background-modifier-hover) 55%, transparent 45%);
--blag-transition: 140ms cubic-bezier(0.2, 0, 0, 1);
```

---

## 3. Typography Scale

| Role | Element / Class | Size | Weight | Tracking | Font |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Modal Title** | `.blagounette-modal h2`, `.workout-modal h2` | `1.28rem` | `650` | `-0.022em` | `--blag-font-sans` |
| **Widget Title** | `.__title` | `1.22rem` | `650` | `-0.02em` | `--blag-font-sans` |
| **Card / Active Title** | `.__active-title` | `1.04rem` | `650` | `-0.015em` | `--blag-font-sans` |
| **Section Title** | `.__form-section-title`, `.__row-source` | `0.92–0.94rem` | `600` | `-0.012em` | `--blag-font-sans` |
| **Uppercase Label** | `.__section-label`, `.__stat-label` | `0.70–0.71rem` | `600` | `+0.06–0.07em` | `--blag-font-sans` |
| **Setting Name** | `.setting-item-name` | `0.88rem` | `550` | `-0.005em` | `--blag-font-sans` |
| **Muted / Subtitle** | `.__muted`, `.__form-section-desc` | `0.81–0.84rem` | `400` | `0` | `--blag-font-sans` |
| **Tags, Badges & Ticks** | `.__chip--tag`, `.__mono-badge`, `.__chart-tick` | `0.74–0.76rem` | `500–600` | `0` | `--blag-font-mono` |

---

## 4. Button & Navigation System

### 4.1 Primary & Secondary Action Buttons
- **Standard / Secondary Button (`__secondary-btn`)**:
  - Height: `34–36px`, Padding: `0 14px`, Radius: `var(--blag-radius-md)` (`8px`)
  - Font: `0.84rem`, weight `500`, `--blag-font-sans`
  - Surface: `var(--blag-surface-subtle)` with `1px solid var(--blag-border-subtle)`
- **Primary CTA Button (`button.mod-cta`, `__primary-btn`)**:
  - Background: `var(--interactive-accent)`, Text: `var(--text-on-accent)`, Weight: `600`
  - Active micro-interaction: `transform: scale(0.98)`

### 4.2 Secondary Action Chips (`__chip`)
Used for section actions, view switchers, and item tabs (`Open structure editor`, `Actions`, `+ Node (N)`, `Clear all`):
- Height: `30px`, Padding: `0 12px`, Radius: `8px` (`--blag-radius-md`)
- Font: `--blag-font-sans`, `0.81rem`, weight `500`
- Hover: highlights border with `color-mix(in srgb, var(--interactive-accent) 55%, var(--background-modifier-border) 45%)`
- Active state (`.is-active`): `15%` tinted accent background + `55%` accent border & accent text (`font-weight: 600`).

### 4.3 Tag Filter & Quick-Fill Pills (`__chip.__chip--tag`, `__mono-badge`)
Used for `#tag` filters, unit badges (`#reps`, `#hold`), and 1-tap quick-fill suggestions (`Repeat last (15)`, `Match PR (20)`):
- Height: `22–26px`, Padding: `0 8–10px`, Radius: `999px` (`--blag-radius-pill`)
- Font: `--blag-font-mono`, `0.74–0.76rem`

### 4.4 Navigation Back Button (`__back-btn`)
Used for view-level back navigation (`← All entries`, `← Home`, `← Supersets`):
- Structure:
  ```html
  <button type="button" class="...__back-btn">
    <span class="...__back-btn-icon"><!-- Lucide arrow-left SVG --></span>
    <span class="...__back-btn-label">Back</span>
  </button>
  ```
- Height: `32px`, Radius: `8px`, subtle border and background fill.
- Hovering shifts `.__back-btn-icon` left by `2px` (`transform: translateX(-2px)`).

### 4.5 Icon Buttons (`__icon-btn`)
- Dimensions: `32px × 32px`, Radius: `8px`, `16px` stroke icon.
- Variants:
  - `.__icon-btn--primary`: subtle accent tint (`14%`) at rest, solid accent fill with contrast text on hover.
  - `.__icon-btn.is-danger`: muted neutral icon at rest (low visual noise), transitioning to soft red tint (`14%`), red border, and error text color on hover. Use `trash-2` for deleting templates, supersets, or mistake entries.

---

## 5. Modal Architecture & Submodal Patterns

### 5.1 Standard Content / Creation Modal
Apply `contentEl.addClass("...-modal")` inside `onOpen()`:
- **Container**: `.modal:has(.blagounette-modal), .modal:has(.workout-modal)` automatically receives `16px` border-radius, subtle border, `20px 24px` padding, and deep elevation shadow (`0 18px 48px rgba(0, 0, 0, 0.24)`).
- **Header Row (`__header-row`)**:
  Pair the modal `h2` title on the left with a keyboard shortcut badge (`Enter ↵`) or utility actions on the right.
- **Form Sections (`__form-section`)**:
  Group related inputs into sections with `.__form-section-header` (title + optional status/inheritance badge) and `.__form-section-desc`.
- **Hierarchy & Inherited Properties in Creation Modals**:
  - When creating items that can be standalone or nested (e.g., base exercises vs. variations), provide a clean segmented toggle (**Base** vs. **Variation of existing**).
  - When **Variation** is active (or pre-selected from a row's quick-add button), reveal an inline searchable parent selector list showing each candidate's full breadcrumb path and type badge.
  - Automatically lock inherited properties (such as tracking unit) to the selected parent and display an `Inherited from parent` badge.
- **Interactive Type / Mode Option Cards (`__type-card`)**:
  - Prefer 2-column descriptive option cards (icon + title + short explanation) over plain dropdowns for binary or ternary type choices.
- **Live Preview & Inline Validation**:
  - Validate duplicates in real time and disable the primary CTA when invalid.
  - Render a compact preview bar (`__preview`) above the footer showing the resolved hierarchy path (`Parent → Child`) and unit/tag pill before saving.
- **Footer Bar (`__footer`)**:
  - Separated top border (`1px solid var(--blag-border-subtle)`), right-aligned `Cancel` + primary `Save` CTA, with keyboard commit (`Enter` / `Cmd+Enter`).

### 5.2 Full-Viewport Builder / Editor Modal
For interactive editors, graph builders, or multi-pane submodals:
1. Add `this.modalEl.addClass("blagounette-graph-modal")` in the `Modal` constructor.
2. Size: `96vw` width (`max-width: 96vw`) and `90vh` content height.
3. Mount the interactive workspace inside `.blagounette-widget__graph-modal-mount` so it flexes to fill the vertical viewport (`min-height: 74vh`).

### 5.3 Lightweight Inline Submodal (Overlay Dialog)
For quick atomic edits inside a full-screen modal:
- Use `.blagounette-construction-graph__inline-rename-modal` (`position: fixed; inset: 0; z-index: 10000; backdrop-filter: blur(3px)`).
- Wrap content in `.blagounette-construction-graph__inline-rename-shell` (`border-radius: 16px`, `padding: 18px 20px`).
- Support keyboard commit (`Enter` / `Cmd+Enter`) and dismissal (`Escape` / backdrop click).

---

## 6. Form Inputs, Fast Logging & Dropdowns

- **Text Inputs & Textareas**:
  Add `.__minimal-input`, `.__search-input`, or `.__minimal-textarea`.
  - Styled as modern soft-filled inputs (`background: var(--blag-surface-subtle)`, `border: 1px solid var(--blag-border-subtle)`, `border-radius: 8px`, `padding: 6px 11px`).
  - Focus state transitions to `--background-primary` with a `3px` accent focus ring (`0 0 0 3px color-mix(in srgb, var(--interactive-accent) 20%, transparent 80%)`).
- **Fast Logging Inputs (`__big-input`)**:
  - For rapid numeric entry during active sessions, use a centered `--blag-font-mono` input (`1.5rem`, `font-weight: 650`) paired with:
    1. **Context Benchmark Strip (`__set-context-strip`)**: Shows today's logged sequence (`15 → 14`) alongside the target benchmark (`Prev Set #3: 13 · PR: 18`).
    2. **1-Tap Quick-Fill Chips (`__quick-fill-row`)**: Chips for `Repeat last`, `Prev #N`, and `Match PR` that populate the input in one click.
    3. **Keyboard Commit**: Pressing `Enter` inside the numeric input immediately logs the entry.
- **Popover Menus & Multi-Selects**:
  - Menus use `12px` radius (`--blag-radius-lg`), `6px` internal padding, and `8px`-radius option items.

---

## 7. Data Visualization, Curves & KPI Statistics

### 7.1 Comparative KPI Stat Cards (`__stat-card`)
Avoid walls of uniform, single-number boxes. Consolidate metrics into high-signal comparative cards:
- **Header Row (`__stat-header`)**: Uppercase label (`0.70rem`) on the left + contextual delta badge (`__stat-delta`) on the right.
  - `.is-positive`: soft green background (`16%`) and green text (`+6 vs prev`, `★ New PR!`).
  - `.is-negative`: soft red background (`14%`) and red text.
- **Primary Value (`__stat-value`)**: `1.08rem`, weight `650`, `-0.015em` tracking.
- **Progress Bar (`__stat-progress`)**: `4px` rounded track showing progress toward previous session volume or all-time record, turning green at `>= 100%`.
- **Comparative Subtitle (`__stat-help`)**: Concise secondary benchmark (`3 sets today · Prev: 45 reps (3 sets)`).

### 7.2 Readable SVG Charts & Curves (`__chart-wrap`)
When rendering time-series or set-progression SVG curves:
1. **Generous Coordinate Space**:
   - Use `viewBox="0 0 560 220"` with `padLeft: 40`, `padRight: 48` (dual-axis) or `24` (single-axis), `padTop: 26`, `padBottom: 34`.
   - Expand Y-axis domains by `8–12%` headroom so peak points and labels never clip the top border.
2. **Clear Dual-Axis Ticks & Headers**:
   - Render 3 horizontal grid lines and ticks (`0%`, `50%`, `100%`) in `--blag-font-mono` (`10px`).
   - Include explicit uppercase axis titles at the top of each axis (`Per set` on left, `Cumulative` on right).
   - Automatically thin X-axis labels when plotting more than 10 points so dates/indices never overlap.
3. **Visual Depth & Comparative Shading**:
   - Render a vertical `linearGradient` area fill under primary curves.
   - When comparing two cumulative trajectories (e.g., **Today** vs. **Previous session**), shade the polygon between them green (`rgba(34, 197, 94, 0.14)`) when ahead and red (`rgba(239, 68, 68, 0.12)`) when behind.
   - Use `fill: var(--background-primary)` on data point circles so markers adapt cleanly to both light and dark themes.
4. **Zero-Collision Labeling**:
   - Apply a background halo stroke to all SVG text labels (`paint-order: stroke; stroke: var(--background-primary); stroke-width: 3.5px–4px`).
   - Do not render an end-of-series tip label on a series that already displays per-point labels.
   - When two secondary/tertiary curves terminate within `16px` vertically, offset the upper label upward (`dy: -10`) and the lower label downward (`dy: +14`).
   - Left-align horizontal reference line labels (`x = padLeft + 6`) so they never collide with right-side cumulative curve endpoints.
   - Attach a native SVG `<title>` tooltip to every data point circle.

---

## 8. Interactive Canvas & Graph UX Rules

When building node/graph canvases (`BlagGraphEditor`, `BlagConstructionGraphEditor`, or future diagram submodals):

1. **Behavior-Based Node Interaction (No Protruding Handles)**:
   - **Quick Click & Release (`< 800ms`, movement `< 5px`)**: Toggles the node's contextual action menu.
   - **Hold (`>= 800ms`) or Drag (`>= 5px`)**: Enters drag mode (`.is-dragging`) and moves the node in real time.
2. **Shift + Click Ordered Linking (`1 → 2`)**:
   - Holding `Shift` and clicking a first node marks it with `.is-shift-selected` and badge `1`.
   - Clicking a second node while holding `Shift` creates a directed edge (`node1 → node2`) preserving selection order.
3. **Discrete Edge Midpoint Handle**:
   - Unlabeled edges display only `.blagounette-construction-graph__edge-midpoint-handle` (a subtle `10px` circle on the edge midpoint that scales on hover).
   - Labeled edges display `.blagounette-construction-graph__edge-label-btn`.
   - Clicking either opens the edge options menu (**Add/Edit label**, **Reverse direction**, **Delete edge**).
4. **Z-Index Stacking Hierarchy**:
   Because CSS `transform: translate(-50%, -50%)` creates a new stacking context on every node and edge midpoint, always elevate the parent container when its menu is open:
   - SVG Edges Layer: `z-index: 1`
   - Default Node Cards / Pills: `z-index: 2`
   - Default Edge Midpoint Overlay: `z-index: 3`
   - Dragging Node (`.is-dragging`): `z-index: 60 !important`
   - Edge Overlay with Open Menu (`.has-open-menu`): `z-index: 95 !important`
   - Node or Edge Midpoint with Open Menu (`.is-menu-open`): `z-index: 100 !important`
   - Inline Submodal Overlay: `z-index: 10000`
