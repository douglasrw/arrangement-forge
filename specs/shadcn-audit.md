# shadcn/ui Component Replacement Audit

## Summary

| Metric | Count |
|--------|-------|
| Total hand-rolled UI components found | 42 |
| Replaceable with shadcn/ui | 34 |
| Already using Radix (shadcn-compatible) | 3 (Select, Collapsible, ScrollArea) |
| Low effort (drop-in swap) | 18 |
| Medium effort (prop refactoring) | 12 |
| High effort (significant restructuring) | 4 |

### Already Installed shadcn/ui Components

These are already Radix-based and follow shadcn patterns — no replacement needed:

- `src/components/ui/select.tsx` — shadcn Select (Radix primitive)
- `src/components/ui/collapsible.tsx` — shadcn Collapsible (Radix re-export)
- `src/components/ui/scroll-area.tsx` — shadcn ScrollArea (Radix primitive)

---

## Priority Ranking

Ordered by: highest visual improvement + lowest effort first.

### Tier 1: High Impact, Low Effort

| # | Component | File | shadcn Equivalent | Effort |
|---|-----------|------|-------------------|--------|
| 1 | ConfirmDialog modal | `src/components/shared/ConfirmDialog.tsx` | **Dialog** (AlertDialog) | Low |
| 2 | Login form inputs (email, password) | `src/pages/LoginPage.tsx:89-115` | **Input** + **Label** | Low |
| 3 | Settings form inputs | `src/pages/SettingsPage.tsx:90-97` | **Input** + **Label** | Low |
| 4 | Login submit button | `src/pages/LoginPage.tsx:124-132` | **Button** | Low |
| 5 | Settings save button | `src/pages/SettingsPage.tsx:201-211` | **Button** | Low |
| 6 | Login mode toggle (Sign In / Sign Up) | `src/pages/LoginPage.tsx:60-81` | **Tabs** | Low |
| 7 | Library search input | `src/pages/LibraryPage.tsx:116-123` | **Input** | Low |
| 8 | Library sort select | `src/pages/LibraryPage.tsx:125-137` | **Select** | Low |
| 9 | Settings chord mode radio | `src/pages/SettingsPage.tsx:110-133` | **RadioGroup** | Low |
| 10 | Settings genre select | `src/pages/SettingsPage.tsx:142-153` | **Select** | Low |
| 11 | Error alert banners | `LoginPage.tsx:118-122`, `SettingsPage.tsx:193-196` | **Alert** (not in list but useful) | Low |
| 12 | Library project card badges | `src/pages/LibraryPage.tsx:198-205` | **Badge** | Low |

### Tier 2: High Impact, Medium Effort

| # | Component | File | shadcn Equivalent | Effort |
|---|-----------|------|-------------------|--------|
| 13 | User menu dropdown | `src/components/layout/TopBar.tsx:321-352` | **DropdownMenu** | Medium |
| 14 | TopBar key dropdown (native select) | `src/components/layout/TopBar.tsx:12-46` | **Select** | Medium |
| 15 | Chord display toggle [A \| I] | `src/components/layout/TopBar.tsx:121-163` | **ToggleGroup** | Medium |
| 16 | InputSection tab switcher | `src/components/left-panel/InputSection.tsx:27-43` | **Tabs** | Medium |
| 17 | ChordPalette time-sig select | `src/components/left-panel/ChordPalette.tsx:249-259` | **Select** | Medium |
| 18 | Save indicator tooltip | `src/components/layout/TopBar.tsx:262-273` | **Tooltip** | Medium |
| 19 | ScopeBadge | `src/components/shared/ScopeBadge.tsx` | **Badge** | Low |
| 20 | Library project cards | `src/pages/LibraryPage.tsx:176-211` | **Card** | Medium |
| 21 | ProjectCard (unused/library) | `src/components/library/ProjectCard.tsx` | **Card** + **Badge** | Medium |
| 22 | Login "or" separator | `src/pages/LoginPage.tsx:135-139` | **Separator** | Low |
| 23 | Settings "Coming Soon" separator | `src/pages/SettingsPage.tsx:159-163` | **Separator** | Low |

### Tier 3: Medium Impact, Medium Effort

| # | Component | File | shadcn Equivalent | Effort |
|---|-----------|------|-------------------|--------|
| 24 | BlockContext toggle switch | `src/components/left-panel/BlockContext.tsx:148-175` | **Switch** | Medium |
| 25 | Transport play/pause/stop buttons | `src/components/transport/TransportBar.tsx:97-146` | **Button** (icon variant) | Medium |
| 26 | Transport loop/metronome toggles | `src/components/transport/TransportBar.tsx:208-237` | **Toggle** | Medium |
| 27 | TopBar export button | `src/components/layout/TopBar.tsx:302-308` | **Button** (disabled variant) | Low |
| 28 | TopBar gear icon button | `src/components/layout/TopBar.tsx:311-318` | **Button** (ghost/icon) | Low |
| 29 | MixerDrawer mute/solo buttons | `src/components/mixer/MixerDrawer.tsx:296-321` | **Toggle** | Medium |
| 30 | Section name input | `src/components/left-panel/SectionContext.tsx:160-175` | **Input** | Low |
| 31 | Section +/- bar buttons | `src/components/left-panel/SectionContext.tsx:182-199` | **Button** (icon) | Low |
| 32 | Block duplicate/delete buttons | `src/components/left-panel/BlockContext.tsx:373-386` | **Button** | Low |

### Tier 4: Low Impact or High Effort

| # | Component | File | shadcn Equivalent | Effort |
|---|-----------|------|-------------------|--------|
| 33 | Style sliders (5x in StyleControls) | `src/components/left-panel/StyleControlsSection.tsx:122-168` | **Slider** | High |
| 34 | Section context sliders (5x) | `src/components/left-panel/SectionContext.tsx:277-321` | **Slider** | High |
| 35 | Block context volume/pan sliders | `src/components/left-panel/BlockContext.tsx:44-143` (InstrumentSlider) | **Slider** | High |
| 36 | MixerDrawer vertical faders | `src/components/mixer/MixerDrawer.tsx:45-120` (VerticalFader) | N/A (no shadcn vertical slider) | High |
| 37 | Drum sub-mix sliders | `src/components/mixer/MixerDrawer.tsx:186-201` | **Slider** | Medium |
| 38 | MixerDrawer collapsible panel | `src/components/mixer/MixerDrawer.tsx:238-391` | **Sheet** (bottom) | High |
| 39 | LeftPanel collapsible sidebar | `src/components/left-panel/LeftPanel.tsx:108-177` | **Sheet** (left) | High |
| 40 | BPM inline editor | `src/components/layout/TopBar.tsx:51-116` | Custom (no equivalent) | N/A |
| 41 | Project name inline editor | `src/components/layout/TopBar.tsx:228-258` | Custom (no equivalent) | N/A |
| 42 | Scrubber (playback slider) | `src/components/transport/Scrubber.tsx` | **Slider** | Medium |

---

## Detailed Component Inventory

### Buttons

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `TopBar.tsx` | 302-308 | Export button (disabled) | Button `variant="outline"` + `disabled` | Low | Medium -- consistent disabled state |
| `TopBar.tsx` | 311-318 | Settings gear icon button | Button `variant="ghost" size="icon"` | Low | Low -- already clean |
| `TopBar.tsx` | 322-329 | User avatar button | Button `variant="ghost" size="icon"` | Low | Low |
| `TransportBar.tsx` | 97-104 | Skip to start | Button `variant="ghost" size="icon"` | Medium | Low -- transport has custom styling |
| `TransportBar.tsx` | 107-113 | Stop button | Button `variant="ghost" size="icon"` | Medium | Low |
| `TransportBar.tsx` | 117-133 | Play/Pause (primary circle) | Button `variant="default"` + custom | Medium | Low -- very custom styling |
| `TransportBar.tsx` | 136-146 | Skip to end | Button `variant="ghost" size="icon"` | Medium | Low |
| `InputSection.tsx` | 113-125 | Generate button | Button `variant="default"` | Low | Medium -- consistent hover/disabled |
| `SectionContext.tsx` | 182-199 | +/- bar adjustment buttons | Button `variant="secondary" size="icon"` | Low | Medium |
| `SectionContext.tsx` | 326-332 | Delete Section (text) | Button `variant="link" destructive` | Low | Low |
| `BlockContext.tsx` | 373-378 | Duplicate Block | Button `variant="secondary"` | Low | Medium |
| `BlockContext.tsx` | 379-385 | Delete Block (text) | Button `variant="link" destructive` | Low | Low |
| `LoginPage.tsx` | 124-132 | Sign In / Create Account | Button `variant="default"` | Low | Medium |
| `LoginPage.tsx` | 142-154 | Continue with Google | Button `variant="outline"` | Low | Medium |
| `LibraryPage.tsx` | 94-99 | Settings nav button | Button `variant="ghost"` | Low | Low |
| `LibraryPage.tsx` | 100-108 | + New Project | Button `variant="default"` | Low | Medium |
| `SettingsPage.tsx` | 70-75 | Back to Library | Button `variant="ghost"` | Low | Low |
| `SettingsPage.tsx` | 201-211 | Save Settings | Button `variant="default"` | Low | Medium |
| `ArrangementView.tsx` | 54-61 | Empty state Generate | Button `variant="default"` (large) | Low | Medium |

### Inputs & Textareas

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `LoginPage.tsx` | 89-98 | Email input | Input + Label | Low | Medium -- consistent focus rings |
| `LoginPage.tsx` | 105-115 | Password input | Input + Label | Low | Medium |
| `SettingsPage.tsx` | 90-97 | Display name input | Input + Label | Low | Medium |
| `LibraryPage.tsx` | 116-123 | Search input | Input | Low | Medium |
| `SectionContext.tsx` | 160-175 | Section name input | Input | Low | Low |
| `InputSection.tsx` | 66-78 | Chord chart textarea | Textarea + Label | Low | Medium |
| `InputSection.tsx` | 88-101 | Description textarea | Textarea + Label | Low | Medium |
| `BlockContext.tsx` | 359-369 | Chord override textarea | Textarea | Low | Low |
| `AiAssistantSection.tsx` | 119-131 | AI chat input | Input | Low | Low -- transparent bg intentional |
| `TopBar.tsx` | 83-101 | BPM inline editor | Custom (no equivalent) | N/A | N/A |
| `TopBar.tsx` | 231-246 | Project name inline editor | Custom (no equivalent) | N/A | N/A |

### Selects & Dropdowns

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `TopBar.tsx` | 12-46 | Key dropdown (native `<select>`) | Select | Medium | High -- styled popover vs native |
| `ChordPalette.tsx` | 249-259 | Time signature (native `<select>`) | Select | Medium | High |
| `SettingsPage.tsx` | 142-153 | Default genre (native `<select>`) | Select | Medium | High |
| `LibraryPage.tsx` | 125-137 | Sort order (native `<select>`) | Select | Medium | High |
| `TopBar.tsx` | 321-352 | User menu (hand-rolled dropdown) | DropdownMenu | Medium | High -- keyboard nav, focus mgmt |
| `SettingsPage.tsx` | 169-189 | Disabled selects (Coming Soon) | Select `disabled` | Low | Medium |

### Sliders & Range Inputs

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `StyleControlsSection.tsx` | 122-168 | 5x style sliders (Energy, Groove, etc.) | Slider | High | Medium -- custom fill + thumb styling |
| `SectionContext.tsx` | 277-321 | 5x section override sliders | Slider | High | Medium |
| `BlockContext.tsx` | 44-143 | InstrumentSlider (volume, pan) | Slider | High | Medium -- colored thumb is custom |
| `MixerDrawer.tsx` | 45-120 | VerticalFader (5x instruments + master) | No equivalent | High | N/A -- vertical orientation not supported |
| `MixerDrawer.tsx` | 186-201 | Drum sub-mix sliders (5x) | Slider | Medium | Medium |
| `Scrubber.tsx` | 9-22 | Playback position slider | Slider | Medium | Low |

### Toggles & Toggle Groups

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `TopBar.tsx` | 121-163 | Chord display [A \| I] toggle | ToggleGroup | Medium | Medium -- consistent pressed state |
| `TransportBar.tsx` | 208-221 | Loop toggle button | Toggle | Medium | Medium |
| `TransportBar.tsx` | 224-237 | Metronome toggle button | Toggle | Medium | Medium |
| `BlockContext.tsx` | 148-175 | ToggleSwitch (chord override) | Switch | Medium | High -- native switch component |
| `MixerDrawer.tsx` | 296-321 | Mute/Solo buttons (5x each) | Toggle | Medium | Medium |

### Tabs

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `InputSection.tsx` | 27-43 | Input mode tabs (Chord/Text/Upload) | Tabs | Medium | High -- consistent tab styling |
| `LoginPage.tsx` | 60-81 | Auth mode tabs (Sign In/Sign Up) | Tabs | Low | Medium |

### Dialogs & Modals

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `ConfirmDialog.tsx` | 1-122 | Confirm/delete modal | AlertDialog | Low | High -- focus trap, scroll lock, animations |

### Badges & Pills

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `ScopeBadge.tsx` | 1-42 | Scope indicator (Song/Section/Block) | Badge | Low | Medium |
| `ProjectCard.tsx` | 49-58 | Genre/Key/Tempo badges | Badge | Low | Medium |
| `LibraryPage.tsx` | 198-205 | Project metadata badges | Badge | Low | Medium |
| `AiAssistantSection.tsx` | 87-98 | AI chat scope badges | Badge (custom color) | Medium | Low -- uses dynamic inline styles |

### Cards

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `ProjectCard.tsx` | 29-91 | Library project card | Card + CardHeader + CardContent | Medium | Medium |
| `LibraryPage.tsx` | 176-211 | Inline project card | Card | Medium | Medium |
| `SettingsPage.tsx` | 82-100 | Profile settings card | Card + CardHeader + CardContent | Medium | Medium |
| `SettingsPage.tsx` | 103-155 | Editor preferences card | Card | Medium | Medium |

### Separators

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `LoginPage.tsx` | 135-139 | "or" divider between auth methods | Separator | Low | Low |
| `TopBar.tsx` | 340 | Menu divider (`h-px bg-border`) | Separator | Low | Low |
| `SettingsPage.tsx` | 159-163 | "Coming Soon" section divider | Separator | Low | Low |

### Tooltips

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `TopBar.tsx` | 270-272 | Save status tooltip (CSS hover) | Tooltip | Medium | High -- proper positioning, animations |

### Radio Groups

| Location | Lines | Description | shadcn | Effort | Visual Improvement |
|----------|-------|-------------|--------|--------|--------------------|
| `SettingsPage.tsx` | 110-133 | Chord display mode radio buttons | RadioGroup | Low | Medium -- consistent radio styling |

### Not Replaceable (Domain-Specific)

These are highly custom components that have no shadcn equivalent:

| Location | Description | Reason |
|----------|-------------|--------|
| `MixerDrawer.tsx:45-120` | VerticalFader | Vertical slider with drag, not in shadcn |
| `MixerDrawer.tsx:125-143` | LevelMeter (L/R VU bars) | Audio-specific visualization |
| `sequencer-block.tsx` | SequencerBlock | Domain-specific DAW block |
| `ArrangementView.tsx` | Full arrangement grid | Domain-specific sequencer UI |
| `ChordLane.tsx` | Chord lane display | Domain-specific |
| `ChordPalette.tsx` | Chord builder palette | Domain-specific music UI |
| `TopBar.tsx:51-116` | BPM inline click-to-edit | No shadcn equivalent |
| `TopBar.tsx:228-258` | Project name inline edit | No shadcn equivalent |

---

## Recommended Migration Order

### Phase 1: Foundation (install shadcn, add base components)
1. Install shadcn/ui CLI and configure for the `forge` theme
2. Add: Button, Input, Label, Textarea, Badge, Separator, Card

### Phase 2: Forms & Pages (biggest visual win, lowest risk)
3. Migrate LoginPage (Button, Input, Label, Tabs, Separator)
4. Migrate SettingsPage (Button, Input, Label, Select, RadioGroup, Card, Separator)
5. Migrate LibraryPage (Button, Input, Select, Card, Badge)

### Phase 3: Dialogs & Dropdowns (accessibility win)
6. Replace ConfirmDialog with AlertDialog
7. Replace TopBar user menu with DropdownMenu
8. Replace TopBar key dropdown with Select
9. Add Tooltip for save indicator

### Phase 4: Editor Panel Controls
10. Replace InputSection tabs with Tabs
11. Replace ChordDisplayToggle with ToggleGroup
12. Replace BlockContext ToggleSwitch with Switch
13. Replace transport toggles with Toggle

### Phase 5: Sliders (highest effort, audit custom styling needs)
14. Evaluate if shadcn Slider can replicate the teal-fill + hidden-thumb pattern
15. Replace style sliders if feasible, otherwise keep custom
16. Mixer vertical faders: keep custom (no shadcn equivalent)

---

## Notes

- **Theme compatibility:** shadcn/ui uses the same CSS custom property pattern (`--background`, `--foreground`, etc.) that the `forge` theme already defines in `src/styles/globals.css`. This makes integration straightforward.
- **Radix already present:** The project already depends on `@radix-ui/react-select`, `@radix-ui/react-collapsible`, and `@radix-ui/react-scroll-area`. Adding more shadcn components will reuse the same Radix foundation.
- **Slider caveat:** The hand-rolled sliders use a custom visual pattern (teal accent fill bar + thumb that appears on hover). The shadcn Slider may need CSS overrides to match. The mixer vertical faders have no shadcn equivalent.
- **No new dependencies concern:** shadcn/ui components are copied into the project (not installed as a package), so this aligns with the CLAUDE.md constraint against adding unlisted dependencies. However, each component may pull in a Radix primitive that needs to be installed.
