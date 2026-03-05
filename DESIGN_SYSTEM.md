# Arrangement Forge — Design System

## Philosophy

Dark, clean, professional. Linear/Vercel aesthetic. No gradients. Minimal shadows. Cyan accent on near-black. The UI should feel like a professional tool, not a toy.

---

## Color Tokens

All colors are defined as CSS custom properties in `src/styles/globals.css` and mapped to Tailwind via `@theme inline`.

| Token | CSS Variable | Hex | Description |
|-------|-------------|-----|-------------|
| `bg-background` | `--background` | `#09090b` | Page background. Near-black with a hint of blue. |
| `text-foreground` | `--foreground` | `#fafafa` | Primary text. Off-white. |
| `bg-card` | `--card` | `#18181b` | Card/panel surfaces. Dark zinc. |
| `text-card-foreground` | `--card-foreground` | `#fafafa` | Text on cards. Off-white. |
| `bg-popover` | `--popover` | `#18181b` | Dropdown/popover background. Same as card. |
| `text-popover-foreground` | `--popover-foreground` | `#fafafa` | Text in popovers. |
| `bg-primary` | `--primary` | `#06b6d4` | Primary action color. Cyan-500. |
| `text-primary-foreground` | `--primary-foreground` | `#09090b` | Text on primary backgrounds. Near-black. |
| `bg-secondary` | `--secondary` | `#27272a` | Secondary surfaces/buttons. Zinc-800. |
| `text-secondary-foreground` | `--secondary-foreground` | `#fafafa` | Text on secondary surfaces. |
| `bg-muted` | `--muted` | `#27272a` | Muted backgrounds. Same as secondary. |
| `text-muted-foreground` | `--muted-foreground` | `#a1a1aa` | De-emphasized text. Zinc-400. |
| `bg-accent` | `--accent` | `#27272a` | Accent surfaces (hover states, active items). |
| `text-accent-foreground` | `--accent-foreground` | `#fafafa` | Text on accent surfaces. |
| `bg-destructive` | `--destructive` | `#ef4444` | Destructive actions. Red-500. |
| `text-destructive-foreground` | `--destructive-foreground` | `#fafafa` | Text on destructive backgrounds. |
| `border-border` | `--border` | `#3f3f46` | Default border color. Zinc-700. |
| `border-input` | `--input` | `#3f3f46` | Input border color. Same as border. |
| `ring-ring` | `--ring` | `#0891b2` | Focus ring color. Cyan-600. |
| `bg-sidebar` | `--sidebar` | `#111113` | Sidebar/left panel background. Slightly lighter than page. |

**Base radius:** `--radius: 0.5rem` (8px, equivalent to `rounded-lg`).

---

## Typography

- **Font family:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` (system font stack, set on `body` in globals.css)
- **Base font size:** `14px` (set on `body`)
- **Base line height:** `1.5` (set on `body`)
- **Font smoothing:** `-webkit-font-smoothing: antialiased`

### Scale

| Use | Class | Size |
|-----|-------|------|
| Page heading | `text-xl font-semibold` | 20px |
| Section heading | `text-lg font-semibold` | 18px |
| Card heading | `text-base font-medium` | 16px |
| Body text | `text-sm` | 14px (base) |
| Labels | `text-xs text-muted-foreground` | 12px |
| Captions / metadata | `text-xs text-muted-foreground` | 12px |
| Tiny indicators | `text-[10px] text-muted-foreground` | 10px |

### Weights

| Weight | When to use |
|--------|------------|
| `font-normal` (400) | Body text, descriptions |
| `font-medium` (500) | Card titles, button text, active tabs |
| `font-semibold` (600) | Page/section headings, emphasis |
| `font-bold` (700) | Rarely. Only for extreme emphasis. |

---

## Spacing

- **Base unit:** 4px (Tailwind default, `1` = 0.25rem = 4px)
- **Standard component padding:** `p-4` (16px) for compact, `p-6` (24px) for standard
- **Input internal padding:** `px-3 py-2` (12px horizontal, 8px vertical)
- **Button internal padding:** `px-4 py-2` (16px horizontal, 8px vertical)
- **Form field gap:** `gap-1.5` (6px) between label and input
- **Section gap:** `gap-4` (16px) between groups, `gap-6` (24px) between major sections
- **Component gap:** `gap-2` (8px) between inline items (buttons, badges)

---

## Element Sizing Scale

Three tiers standardize indicator dots, labels, icons, and touch targets across the app. Pick a tier based on the element's importance — never use arbitrary sizes.

| Element | Compact | Standard | Large |
|---------|---------|----------|-------|
| Indicator dot | `size-2` (8px) | `size-2.5` (10px) | `size-3` (12px) |
| Label text | `text-xs` (12px) | `text-sm` (14px) | `text-base` (16px) |
| Icon | `size-3.5` (14px) | `size-4` (16px) | `size-5` (20px) |
| Touch target | `size-7` (28px) | `size-8` (32px) | `size-10` (40px) |
| Lane/row height | `h-8` (32px) | `h-10` (40px) | `h-12` (48px) |

### Tier assignment

| Context | Tier | Rationale |
|---------|------|-----------|
| Stem lane labels (arrangement gutter) | Standard | Primary UI, always visible |
| TopBar metadata pills | Compact | Secondary info, glanceable |
| Transport controls | Standard | Primary interaction zone |
| Status bar indicators | Compact | Peripheral information |
| Left panel section headers | Standard | Navigation landmarks |

### Rules

- **Minimum visible dot size:** `size-2` (8px). Anything smaller looks cheap on dark backgrounds.
- **Minimum label size:** `text-xs` (12px). `text-[10px]` is prohibited in new code.
- **Clickable elements:** Must have at least Compact touch target (`size-7` / 28px).
- Never use arbitrary pixel values (e.g., `text-[10px]`, `size-1.5`) for these elements — pick a tier.

---

## Borders & Radius

- **Default border:** `border border-border` (1px solid `#3f3f46`)
- **Radius scale:**

| Use | Class | Value |
|-----|-------|-------|
| Buttons, inputs, alerts | `rounded-md` | 6px |
| Cards, panels, modals | `rounded-lg` | 8px (matches `--radius`) |
| Avatars, status dots, pills | `rounded-full` | 9999px |
| Never on page containers | — | — |

- **Focus ring:** `focus:outline-none focus:ring-2 focus:ring-ring`

---

## Shadows

Minimal. The dark theme provides depth through background color layering, not shadows.

| Use | Class |
|-----|-------|
| Cards, panels | None |
| Dropdowns, popovers | `shadow-lg` |
| Modals | `shadow-lg` |
| Everything else | None |

---

## Components

### Cards

```
bg-card border border-border rounded-lg p-6
```

Compact variant: `p-4`. No shadow. Text inherits `text-card-foreground`.

### Buttons

| Variant | Classes |
|---------|---------|
| Primary | `bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors` |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors` |
| Outline | `border border-border bg-background text-foreground hover:bg-secondary rounded-md px-4 py-2 text-sm font-medium transition-colors` |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium transition-colors` |
| Ghost | `text-foreground hover:bg-secondary rounded-md px-4 py-2 text-sm font-medium transition-colors` |
| Disabled | Add `opacity-50 cursor-not-allowed` to any variant |
| Icon-only | `p-2 rounded-md` (square hit target) |

### Inputs

```
w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground
focus:outline-none focus:ring-2 focus:ring-ring
```

- **Error state:** Replace `border-input` with `border-destructive focus:ring-destructive`
- **Label:** `text-xs text-muted-foreground` above the input with `gap-1.5`
- **Every input must have a unique `id` and a corresponding `<label htmlFor={id}>`**

### Select / Dropdown

Same base styles as inputs. Dropdown menu uses `bg-popover text-popover-foreground border border-border rounded-lg shadow-lg`.

### Tabs

- **Container:** `flex gap-1 bg-secondary rounded-lg p-1`
- **Active tab:** `bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium`
- **Inactive tab:** `text-muted-foreground hover:text-foreground rounded-md px-4 py-1.5 text-sm`

### Dividers

- **Horizontal rule:** `h-px bg-border`
- **With text:** Flex container with `h-px bg-border flex-1` on each side, `text-xs text-muted-foreground px-3` for the label

### Alerts / Toasts

| Type | Classes |
|------|---------|
| Error | `rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive` |
| Success | `rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-400` |
| Info | `rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary` |

### Modals / Dialogs

- **Overlay:** `fixed inset-0 bg-black/60 backdrop-blur-sm z-50`
- **Content:** `bg-card border border-border rounded-lg p-6 shadow-lg max-w-md mx-auto`
- **Must use `ConfirmDialog` from `src/components/shared/ConfirmDialog.tsx` for destructive actions**

### Scrollbars

Custom scrollbars are defined in globals.css:
- Width: `6px`
- Thumb: `#3f3f46` (border color), `rounded` (3px radius)
- Thumb hover: `#52525b` (zinc-600)
- Track: transparent

---

## Interactive States

| State | Pattern |
|-------|---------|
| Hover | `/90` opacity of base color, or `hover:bg-secondary` for neutral elements |
| Focus | `focus:outline-none focus:ring-2 focus:ring-ring` |
| Active / pressed | `/80` opacity of base color |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` |
| Transition | `transition-colors` for color changes, `transition-all` for layout shifts |

---

## Layout Patterns

| Pattern | Classes |
|---------|---------|
| Page background | `bg-background min-h-screen` |
| Centered content | `flex items-center justify-center min-h-screen` |
| Content max-width | `max-w-7xl mx-auto px-4` |
| Sidebar | `w-64 bg-sidebar border-r border-border` |
| App shell | Full viewport, `overflow: hidden` on html/body (set in globals.css) |

---

## Animations

- **Forge pulse:** `forge-pulse` keyframe defined in globals.css. Use via `.forge-pulse` class. Fades opacity 1 -> 0.4 -> 1 over 1.5s, infinite. Use for loading/generating states.
- **Transitions:** Prefer `transition-colors` (150ms default). Use `transition-all` only when multiple properties change.
- **No custom animations** beyond Tailwind defaults and `forge-pulse`.

---

## Golden Screenshots

This section will be populated as designs are approved.

- Login page: (pending)
- Editor — empty state: (pending)
- Editor — arrangement view: (pending)
- Library page: (pending)

---

## Automated Enforcement

Five layers of mechanical UI quality enforcement prevent regressions:

| Layer | Tool | Enforcement Point | What it catches |
|-------|------|-------------------|----------------|
| 1 | `@axe-core/playwright` | Playwright tests | Color contrast (WCAG AA), touch targets, ARIA, labels |
| 2 | `eslint-plugin-jsx-a11y` | ESLint (pre-commit) | Missing alt/labels, non-keyboard elements, bad ARIA |
| 3 | `no-fixed-width-shrink.sh` | Pre-commit hook | `w-[Npx] shrink-0` overflow anti-pattern |
| 4 | Overflow assertions | Playwright tests | `scrollWidth > clientWidth` on all views |
| 5 | Golden baseline screenshots | Playwright `toHaveScreenshot()` | Any visual regression from approved state |

**Planned:** `eslint-plugin-tailwindcss` when Tailwind v4 support stabilizes ([tracking issue](https://github.com/francoismassart/eslint-plugin-tailwindcss/issues/325)).

### Running enforcement tests
```
# Accessibility + overflow + visual regression
source ~/.secrets.env && PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx playwright test

# ESLint with jsx-a11y
npx eslint src/
```

---

## Quality Checklist (8-Criterion Gate)

Every UI component must pass these checks before shipping:

| Check | What to verify | Common fix |
|-------|---------------|------------|
| Card padding | Content has `p-6` (standard) or `p-4` (compact) | Add padding class |
| Input spacing | `gap-1.5` between label and input, `gap-4` between form fields | Wrap in flex with gap |
| Button padding | `px-4 py-2` for standard, `px-3 py-1.5` for compact | Use button pattern from above |
| Section gaps | `gap-6` between major sections, `gap-4` within sections | Add gap to flex/grid container |
| Text hierarchy | Headings use `text-lg font-semibold`, labels use `text-xs text-muted-foreground` | Reference typography section |
| Border visibility | All interactive elements have `border border-border` or `border border-input` | Add border class |
| Dark theme contrast | Text readable against `bg-background` (#0a0a0f) and `bg-card` (#111118) | Use `text-foreground` or `text-muted-foreground` |
| Container padding | Every functional zone (panels, bars, cards, modals) has minimum 8px (p-2) internal padding. Zero-padding containers are always a bug. | Add `p-2` or larger padding to containers |

---

## Anti-Patterns

- No gradients
- No box shadows except on modals/dropdowns
- No `rounded-full` on cards or containers (only on avatars, badges, status dots, pills)
- No opacity below 0.5 for interactive elements
- No custom animations beyond Tailwind defaults and `forge-pulse`
- No DaisyUI classes (DaisyUI has been removed)
- No hardcoded hex colors in components — use theme tokens only
- No CSS-in-JS (styled-components, emotion, CSS modules)
- No generic AI fonts (Inter, Roboto) — use the system font stack
- No gradients on backgrounds — use flat color tokens
- No `confirm()`, `alert()`, or `prompt()` — use `ConfirmDialog` or custom UI
- No `w-[Npx]` with `shrink-0` in flex/grid children (use `flex-1` or CSS grid)
