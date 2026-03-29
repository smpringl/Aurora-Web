# Aurora-Web Redesign Plan — Attio/SiteMarker Style

> Rebuild the Aurora website using the exact black-and-white design system from `SiteMarker/sitemarker-resources/budget-planning-2026/`. All green accents removed. Pure monochrome.

---

## Design System (from SiteMarker reference)

### CSS Variables
```css
--black: #000000;
--white: #ffffff;
--gray-50: #fafafa;
--gray-100: #f5f5f5;
--gray-200: #e5e5e5;
--gray-300: #d4d4d4;
--gray-400: #a3a3a3;
--gray-500: #737373;
--gray-600: #525252;
--gray-700: #404040;
--gray-800: #262626;
--gray-900: #171717;
--radius: 12px;
--radius-sm: 8px;
```

### Typography
| Element | Size | Weight | Letter-spacing | Line-height |
|---------|------|--------|----------------|-------------|
| h1 | 56px | 600 | -0.03em | 1.1 |
| h2 | 36px | 600 | -0.02em | 1.2 |
| h3 | 20px | 600 | -0.01em | — |
| h4 (label) | 14px | 500 | 0.06em (uppercase) | — |
| body | 16px | 400 | — | 1.6 |
| small | 13px | 400 | — | — |
| xs | 11px | 400 | — | — |
| KPI value | 32px | 600 (mono) | -0.02em | — |
| Table header | 12px | 500 (uppercase) | 0.05em | — |
| Numeric | 13-14px | 600 (mono) | — | — |

### Fonts
- **Primary**: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Monospace**: `'SF Mono', 'Fira Code', monospace`
- Font smoothing: `-webkit-font-smoothing: antialiased`

### Buttons
- **Primary**: bg black, text white, rounded-lg (12px)
- **Secondary/Ghost**: bg transparent, text `--gray-600`, hover text black
- **Pill badge**: 12px uppercase, `0.08em` letter-spacing, 1px border `--gray-700`, `border-radius: 100px`, padding `6px 16px`

### Cards
- Background: white
- Border: `1px solid --gray-200` (`#e5e5e5`)
- Border-radius: 12px
- Padding: 32px
- No box-shadow (flat design — current `AURORA_BOX_SHADOW` removed)

### Tables
- Header: bg `--gray-50`, 12px uppercase, `0.05em` tracking, `--gray-500` text
- Cell padding: `14px 20px`
- Row borders: `1px solid --gray-100`
- Hover: bg `--gray-50`
- Numeric cells: right-aligned, monospace
- Total row: bg black, text white

### Section Labels
```css
.section-label::before {
  content: '';
  width: 24px;
  height: 1px;
  background: --gray-300;
}
/* 12px, uppercase, 0.06em tracking, --gray-400 */
```

### Animations
- Fade-up: `opacity: 0 → 1`, `translateY(24px → 0)`, 0.6s ease
- Staggered delays: 0.1s increments
- Bar fills: `cubic-bezier(0.16, 1, 0.3, 1)`, 1.2s

---

## Files to Modify

### 1. Foundation (do first)

#### `tailwind.config.ts`
- Remove `secondary.green: "#B3FD00"` (lime green accent)
- Update color palette to match SiteMarker grays (`gray-50` through `gray-900`)
- Set `--radius: 12px` (was `0.5rem`)
- Add `fontFamily.mono: ['SF Mono', 'Fira Code', 'monospace']`
- Keep all shadcn/ui mappings working but point to new values

#### `src/globals.css`
- Replace all CSS custom properties with SiteMarker values
- Remove `.bg-secondary-green`, `.text-secondary-green`, `.hover\:bg-secondary-green:hover`
- Remove dark mode variables (pure light mode, black-and-white only)
- Update body: `background: #ffffff` (was `#f9f9f9`), `color: --gray-900`
- Update heading defaults to SiteMarker typography (weight 600, tight letter-spacing)
- Update `p` color to `--gray-600` (was `#808080`)
- Add section-label, animate, and mono utility classes

#### `src/lib/constants.ts`
- Remove `AURORA_BOX_SHADOW` — no shadows in the new design. Cards use borders only.

---

### 2. Marketing Pages

#### `src/components/Header.tsx`
**Current**: Fixed white bar, border-bottom, logo left, nav center, buttons right.
**New**: Same layout but updated styling:
- Remove border-bottom, use clean separation
- Nav links: 14px weight-500 `--gray-600`, hover `--black`
- "Sign Up" button: bg black, text white, `border-radius: 100px` (pill shape)
- "Log In" button: text only, `--gray-600`, hover black
- Height: keep ~64px
- Max-width container: 1200px (was `max-w-5xl` ~1024px)

#### `src/components/Hero.tsx`
**Current**: Email input with shadow, corporate logo circle + dots + API card.
**New**:
- h1: 56px, weight 600, letter-spacing -0.03em, line-height 1.1
- Subtitle: 20px, `--gray-400`, weight 400
- Remove email input box shadow, use `1px solid --gray-200` border instead
- Remove circular logo/dots/card visual — replace with cleaner API response showcase:
  - Full-width card with `1px solid --gray-200`, 12px radius, 32px padding
  - Monospace JSON preview of API response (like a code block)
  - Section label above: `— API RESPONSE` in the section-label style
- CTA button: bg black, text white, pill shape
- Background: white (not `#f9f9f9`)

#### `src/components/TrustSection.tsx`
**Current**: "Built by researchers..." text + logo placeholders.
**New**:
- Section label style: `— TRUSTED BY` (12px uppercase with line prefix)
- Logo row: keep same logos, use `--gray-400` text color
- Clean spacing: `padding: 60px 0`

#### `src/components/ValuePropsSection.tsx`
**Current**: 3 cards with black circles containing green icons.
**New**:
- h2: 36px, weight 600, letter-spacing -0.02em
- Cards: white bg, `1px solid --gray-200`, 12px radius, 32px padding
- Remove green icon circles — use simple black icons (no circle background) or numbered indicators
- Card title: 20px, weight 600
- Card description: 16px, `--gray-600`
- Keep 3-column grid layout

#### `src/components/IntegrationsShowcase.tsx`
**Current**: 2-column, big Aurora mark background with integration logos in shadow cards.
**New**:
- Keep 2-column layout
- Left: heading + description + button
- Right: Integration logos in flat bordered cards (no shadow), `1px solid --gray-200`
- Button: bg black, pill, text white
- Remove all box shadows

#### `src/components/StatsSection.tsx`
**Current**: 3-column stats with animated counter.
**New**: KPI-card grid style from SiteMarker:
- Container: `1px solid --gray-200`, 12px radius, `gap: 1px`, `background: --gray-200` (creates divider lines)
- Each stat card: white bg, 32px padding
- Label: 13px, weight 500, `--gray-500`
- Value: 32px, weight 600, monospace font, black
- Sub-label: 13px, `--gray-400`
- Keep animated counter logic

#### `src/components/CTASection.tsx`
**Current**: "Ready to Start" heading + 2 buttons.
**New**:
- Black background section (like SiteMarker cover slide)
- h2: white, 36px, weight 600
- Description: `--gray-400`
- Primary CTA: bg white, text black, pill
- Secondary CTA: border white, text white, pill
- Padding: 80px vertical

#### `src/components/Footer.tsx`
**Current**: Black bg, green section headers, 4-column grid.
**New**:
- Keep black bg
- Section headers: white (not green), 14px uppercase, `0.06em` tracking
- Links: `--gray-400`, hover white
- Border-top separator: `--gray-800`
- Remove all green accents

---

### 3. Auth Page

#### `src/pages/Auth.tsx`
**Current**: Centered card with Supabase Auth UI.
**New**:
- Background: white
- Card: `1px solid --gray-200`, 12px radius, 32px padding (no shadow)
- Keep Supabase Auth UI — update brand colors: `brand: '#000000'`, `brandAccent: '#404040'` (was `#808080`)
- Logo above card
- Heading: 36px, weight 600

---

### 4. Pricing Page

#### `src/pages/Pricing.tsx`
**Current**: 3 cards with green badges and per-card billing toggles.
**New**:
- Background: white
- Cards: `1px solid --gray-200`, 12px radius
- "Most popular" badge: bg black, text white, pill shape (not green)
- "2 months free" badge: bg `--gray-100`, text black, pill shape
- Price: 48px, weight 600, monospace font
- Feature check icons: simple black dots (`●`) or thin checkmarks in `--gray-500`
- Selected/primary card: `2px solid black` border instead of green highlight
- Billing toggle: custom styled to be black/white (remove green checked state)
- Button on best plan: bg black, text white; others: bg `--gray-100`, text black

---

### 5. Dashboard

#### `src/components/DashboardLayout.tsx`
**Current**: White header with logo + "Dashboard", collapsible sidebar, `#f9f9f9` bg.
**New**:
- Background: white
- Header: clean white, `1px solid --gray-200` bottom border, height ~60px
  - Logo left, user email + sign out right
  - Remove "Dashboard" text label
- Sidebar: white bg, `1px solid --gray-200` right border
  - Nav items: 13px, weight 500, `--gray-600`
  - Active: weight 600, black text, `--gray-50` background
  - Icons: 16px, `--gray-400` default, black when active
  - Separator: `1px solid --gray-200`
  - Width: 240px expanded, 64px collapsed
- Content area: white bg, max-width 1200px, padding 32px

#### `src/components/Overview.tsx`
**Current**: Placeholder card.
**New**: Keep as placeholder but restyle card:
- White bg, `1px solid --gray-200`, 12px radius, 32px padding
- Title: 20px, weight 600
- Description: 13px, `--gray-500`

#### `src/components/Playground.tsx`
**Current**: White card with border, domain input, JSON response.
**New**: (keep all functionality)
- Header: h1 36px weight 600, subtitle 16px `--gray-600`
- Query card: `1px solid --gray-200`, 12px radius, 32px padding
- Input: `1px solid --gray-200`, 12px radius, 13px font
- Run button: bg black, text white, pill-ish
- Cancel button: `1px solid --gray-200`, text `--gray-600`
- Loading state: spinner in black
- Response JSON: bg `--gray-50`, 8px radius, monospace 13px
- Status badges: "SUCCESS" → bg black text white; "NOT AVAILABLE" → bg `--gray-200` text `--gray-600`
- "Copy" / "View in logs" links: 12px, `--gray-400`, hover black

#### `src/components/ActivityLogs.tsx`
**Current**: Filter bar + table with colored status labels.
**New**: (keep all functionality — search, filters, pagination, expand)
- Header: h1 36px weight 600
- Filter bar: merged with table (no separate rounded-top card)
  - Search input: `1px solid --gray-200`, 8px radius (not pill)
  - Select dropdowns: `1px solid --gray-200`, 8px radius
- Table wrapper: `1px solid --gray-200`, 12px radius, overflow hidden
- Table header: bg `--gray-50`, 12px uppercase, `0.05em` tracking, `--gray-500`
- Table cells: 14px, padding `14px 20px`
- Row hover: bg `--gray-50`
- Status colors (all monochrome now):
  - COMPLETED → weight 600, black text
  - FAILED → weight 500, `--gray-500` text
  - Others → `--gray-400`
- Expanded detail: bg `--gray-50`, code block in `--gray-100` bg
- Pagination: simple Previous/Next with border buttons

#### `src/components/Usage.tsx`
**Current**: Stat cards + stacked bar chart + status breakdown + top domains.
**New**: (keep all functionality)
- Stat cards: KPI-card grid style (like SiteMarker)
  - Container: `1px solid --gray-200`, 12px radius, `gap: 1px`, `bg: --gray-200`
  - Each card: white bg, 32px padding
  - Label: 13px, weight 500, `--gray-500`, uppercase
  - Value: 32px, weight 600, monospace, black
- Bar chart: SiteMarker bar style
  - Labels: 14px, weight 500, right-aligned
  - Track: `--gray-100`, 6px radius, 40px height
  - Fill: black, 6px radius
  - Values inside bar: 13px, weight 600, white, monospace
- Status breakdown: horizontal bars, black fill (no emerald/red)
- Top domains: same bar style, black fill
- Date selector: `1px solid --gray-200`, 8px radius

#### `src/components/ApiKeyManagement.tsx`
**Current**: shadcn Cards with CardHeader/CardTitle pattern.
**New**: (keep all functionality)
- Replace Card wrapper with simple `div` + border (`1px solid --gray-200`, 12px radius)
- Section title: 20px, weight 600, black
- Section description: 13px, `--gray-500`
- API key input: monospace, `--gray-50` bg
- Buttons: bg black, text white
- Usage examples code blocks: bg `--gray-50`, monospace 13px
- Alert: `1px solid --gray-200`, bg `--gray-50`

#### `src/components/AccountSettings.tsx`
**Current**: Multiple shadcn Cards.
**New**: (keep all functionality)
- Replace Card pattern with bordered sections
- Danger zone: `1px solid --gray-200` (not red border), red button stays for "Delete Account"
- Same flat, monochrome aesthetic

---

## Migration Checklist

### Phase 1: Foundation
- [ ] Update `tailwind.config.ts` with SiteMarker design tokens
- [ ] Rewrite `globals.css` with new CSS variables and base styles
- [ ] Update/remove `constants.ts`
- [ ] Verify all shadcn components still render (Button, Input, Card, etc.)

### Phase 2: Marketing Site
- [ ] Header
- [ ] Hero
- [ ] TrustSection
- [ ] ValuePropsSection
- [ ] IntegrationsShowcase
- [ ] StatsSection
- [ ] CTASection
- [ ] Footer
- [ ] Index page wrapper

### Phase 3: Auth & Pricing
- [ ] Auth page
- [ ] Pricing page

### Phase 4: Dashboard
- [ ] DashboardLayout (header + sidebar)
- [ ] Overview
- [ ] Playground
- [ ] ActivityLogs
- [ ] Usage
- [ ] ApiKeyManagement
- [ ] AccountSettings
- [ ] Dashboard page wrapper

### Phase 5: QA
- [ ] All functionality intact (API calls, auth, filters, pagination, caching)
- [ ] No green/colored accents remaining
- [ ] Typography matches SiteMarker spec
- [ ] Spacing matches SiteMarker spec
- [ ] Responsive behavior at common breakpoints
- [ ] Build succeeds (`npm run build`)

---

## Key Principles

1. **Black and white only** — no lime green (`#B3FD00`), no emerald, no colored status indicators. Use weight/opacity for hierarchy.
2. **Borders over shadows** — `1px solid --gray-200` replaces all `box-shadow`.
3. **Tight typography** — negative letter-spacing on headings, generous on labels.
4. **Monospace for numbers** — all numeric values, prices, stats, durations use `SF Mono`.
5. **Flat, clean cards** — 12px radius, 32px padding, white bg.
6. **No functionality changes** — all Supabase queries, auth flow, API calls, caching, abort controllers, etc. stay exactly as-is.
7. **Work on a feature branch** — `redesign/attio-style` branched from `feature/dashboard-tabs`.
