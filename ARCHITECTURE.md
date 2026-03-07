# Arrangement Forge — Architecture Specification

**Status:** Approved
**Date:** 2026-03-02
**Purpose:** This document is the single source of truth for all implementation decisions. Every agent task references this document for tech stack, data model, project structure, and API contracts.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Complex reactive UI (undo/redo, context-aware inspector, real-time playback). TypeScript required — data model complexity demands compile-time safety. |
| **Styling** | Tailwind CSS 4 (custom `forge` dark theme via CSS custom properties) | Custom premium dark theme via CSS custom properties in `src/styles/globals.css`. No component library. |
| **Audio** | Tone.js + Web Audio API | MIDI playback via browser synths/samplers. Tone.js for MVP; upgrade to SoundFont/custom samples post-MVP. |
| **Backend** | Supabase (hosted) | Postgres + Auth + Storage + Edge Functions + Realtime. Minimal backend code for MVP. |
| **Auth** | Supabase Auth | Email/password + Google OAuth. |
| **Storage** | Supabase Storage | MIDI files, audio exports, future sample libraries. |
| **AI Generation** | Stubbed (rule-based MIDI generator) | MVP generates MIDI from structured params using genre-aware rules/templates. Same API contract as future AI service — swap implementation later. |
| **Deployment** | Vercel (frontend) + Supabase (backend) | Vercel for React SPA with CDN. Supabase is fully hosted. |
| **Package Manager** | npm | Standard. No yarn, no pnpm. |
| **Testing** | Vitest (unit) + Playwright (e2e) | Vitest native to Vite. Playwright for browser audio integration tests. |
| **Linting** | ESLint + Prettier | Standard config. No custom rules unless they prevent real bugs. |

---

## Data Model

### Entity Relationship Summary

```
User 1──∞ Project 1──1 Arrangement 1──∞ Section 1──∞ Block
                                    1──∞ Stem
```

### Tables

#### `users` (managed by Supabase Auth)
Supabase Auth handles user records. Extended profile data in `profiles`.

#### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK, FK → auth.users) | |
| display_name | text | |
| chord_display_mode | text | 'letter' or 'roman', default 'letter' |
| default_genre | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `projects`
A project is a single song/arrangement workspace.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | |
| name | text | 'Untitled Project' default |
| key | text | e.g., 'Bb', 'C', 'F#' |
| tempo | integer | BPM, 40-240 |
| time_signature | text | e.g., '4/4', '3/4', '6/8' |
| genre | text | |
| sub_style | text | |
| energy | integer | 0-100 |
| groove | integer | 0-100 |
| swing_pct | integer | 50-80, nullable (null = not applicable) |
| dynamics | integer | 0-100 |
| generation_hints | text | Free-text hints from description parser |
| chord_chart_raw | text | Raw user input (text tab) |
| has_arrangement | boolean | false until first generation |
| generated_at | timestamptz | nullable |
| generated_tempo | integer | Tempo at generation time (for deviation hints) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `stems`
Each project has 1-N stems (instruments).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| instrument | text | 'drums', 'bass', 'piano', 'guitar', 'strings' |
| sort_order | integer | Display order in arrangement |
| volume | float | 0.0-1.0, default 0.8 |
| pan | float | -1.0 (L) to 1.0 (R), default 0.0 |
| is_muted | boolean | default false |
| is_solo | boolean | default false |
| created_at | timestamptz | |

#### `sections`
Structural sections of the arrangement (Intro, Verse, Chorus, etc.).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| name | text | 'Intro', 'Verse 1', 'Chorus', etc. |
| sort_order | integer | Display order left-to-right |
| bar_count | integer | Number of bars in this section |
| start_bar | integer | Computed: first bar number of this section |
| energy_override | integer | nullable (null = inherited from project) |
| groove_override | integer | nullable |
| swing_pct_override | integer | nullable |
| dynamics_override | integer | nullable |
| created_at | timestamptz | |

#### `blocks`
Bar-level blocks within a stem. The fundamental editing unit.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| stem_id | uuid (FK → stems) | |
| section_id | uuid (FK → sections) | |
| start_bar | integer | Bar number where this block starts (1-indexed) |
| end_bar | integer | Bar number where this block ends (inclusive) |
| chord_degree | text | nullable. Roman numeral: 'I', 'ii', 'V', 'bII', etc. |
| chord_quality | text | nullable. 'maj7', 'min7', 'dom7', etc. |
| chord_bass_degree | text | nullable. For slash chords. |
| style | text | Instrument-specific style string (see below) |
| energy_override | integer | nullable (null = inherited from section) |
| dynamics_override | integer | nullable |
| midi_data | jsonb | Generated MIDI note data for this block |
| created_at | timestamptz | |

**Style values by instrument:**
- Drums: 'jazz_brush_swing', 'funk_pocket', 'half_time_feel', 'rock_straight', etc.
- Bass: 'walking', 'pedal_tone', 'slap', 'fingerstyle', 'pick', etc.
- Piano: 'jazz_comp', 'block_chords', 'stride', 'arpeggiated', 'pad', etc.
- Guitar: 'fingerpick_arpeggios', 'rhythm_strum', 'muted_funk', 'power_chords', etc.
- Strings: 'sustained_pad', 'tremolo', 'pizzicato', 'arco_melody', etc.

#### `chords`
The chord lane — one chord per bar, shared across all stems.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| bar_number | integer | 1-indexed |
| degree | text | nullable ('I', 'ii', 'V', 'bII', null for N.C.) |
| quality | text | nullable ('maj7', 'min7', 'dom7', etc.) |
| bass_degree | text | nullable (for slash chords) |

#### `ai_chat_messages`
Persistent AI chat history across context switches (per shakedown #6).

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| project_id | uuid (FK → projects) | |
| role | text | 'user' or 'assistant' |
| content | text | Message text |
| scope | text | 'setup', 'song', 'section', 'block' |
| scope_target | text | nullable. e.g., 'Verse 2', 'Bass bar 7' |
| created_at | timestamptz | |

---

## Style Inheritance Cascade

The cascade follows CSS specificity logic (per shakedown #6):

```
Project (song-level defaults)
  └── Section (overrides project values, or null = inherited)
       └── Block (overrides section values, or null = inherited)
```

**Resolution function (used throughout the app):**

```typescript
function resolveStyle(
  project: Project,
  section: Section,
  block: Block | null,
  field: 'energy' | 'groove' | 'swing_pct' | 'dynamics'
): { value: number; source: 'project' | 'section' | 'block' } {
  if (block && block[`${field}_override`] != null) {
    return { value: block[`${field}_override`]!, source: 'block' };
  }
  if (section[`${field}_override`] != null) {
    return { value: section[`${field}_override`]!, source: 'section' };
  }
  return { value: project[field], source: 'project' };
}
```

Inherited values display dimmer. Overridden values display bold/highlighted.

---

## Project Structure

```
arrangement-forge/
├── public/
│   └── samples/drums/                    # Drum sample audio files
├── src/
│   ├── main.tsx                          # App entry point
│   ├── App.tsx                           # Root component, router
│   ├── vite-env.d.ts                     # Vite type declarations
│   ├── types/                            # TypeScript type definitions
│   │   ├── index.ts                      # Barrel export (only barrel in project)
│   │   ├── project.ts                    # Project, Section, Stem, Block, Chord
│   │   ├── audio.ts                      # Audio engine types
│   │   └── ui.ts                         # UI state types (selection, mode, etc.)
│   ├── lib/                              # Non-React utilities
│   │   ├── supabase.ts                   # Supabase client init
│   │   ├── chords.ts                     # Chord parsing, Roman<>letter conversion
│   │   ├── chord-chart-parser.ts         # Raw text -> ChordEntry[]
│   │   ├── midi-generator.ts             # Stubbed AI: rule-based MIDI generation
│   │   ├── description-parser.ts         # Free-text -> structured controls parser
│   │   ├── genre-config.ts               # GENRE_SUBSTYLES, GENRE_SLIDERS configs
│   │   ├── style-cascade.ts              # resolveStyle() and cascade utilities
│   │   ├── bass-patterns.ts              # Bass instrument pattern library
│   │   ├── drum-patterns.ts              # Drum instrument pattern library
│   │   ├── guitar-patterns.ts            # Guitar instrument pattern library
│   │   ├── piano-patterns.ts             # Piano instrument pattern library
│   │   ├── strings-patterns.ts           # Strings instrument pattern library
│   │   ├── undo-helpers.ts               # Undo/redo helper utilities
│   │   └── utils.ts                      # General utility functions
│   ├── audio/                            # Tone.js audio engine
│   │   ├── engine.ts                     # AudioEngine class (init, play, stop, seek)
│   │   ├── instruments.ts                # Instrument definitions and sample loading
│   │   ├── transport.ts                  # Transport controls (play/pause/seek/loop)
│   │   ├── metronome.ts                  # Click track and count-in
│   │   ├── drum-kit.ts                   # Drum kit definitions
│   │   ├── sampled-drum-kit.ts           # Sampled drum kit implementation
│   │   └── sampler-cache.ts              # Audio sampler caching
│   ├── store/                            # Zustand state management
│   │   ├── auth-store.ts                 # Auth state
│   │   ├── project-store.ts              # Project state
│   │   ├── selection-store.ts            # Current selection (song/section/block)
│   │   ├── undo-store.ts                 # Undo/redo stack
│   │   └── ui-store.ts                   # UI state (mixer open, zoom level, etc.)
│   ├── hooks/                            # Custom React hooks
│   │   ├── useAuth.ts                    # Auth init, sign-in/out, profile hydration
│   │   ├── useAudio.ts                   # Audio engine hook
│   │   ├── useAutoSave.ts               # Auto-save hook
│   │   ├── useGenerate.ts               # Generation trigger hook
│   │   ├── useProject.ts                 # Project CRUD + Supabase sync
│   │   └── useKeyboardShortcuts.ts       # Global keyboard shortcut handler
│   ├── components/                       # React components
│   │   ├── layout/
│   │   │   ├── AppShell.tsx              # Top-level layout (top bar + left panel + arrangement)
│   │   │   ├── TopBar.tsx                # Title bar + params bar
│   │   │   └── StatusBar.tsx             # Bottom status bar
│   │   ├── left-panel/
│   │   │   ├── LeftPanel.tsx             # Context-aware panel container
│   │   │   ├── SectionContext.tsx        # Section-level inspector
│   │   │   ├── BlockContext.tsx          # Block-level inspector (instrument-specific)
│   │   │   ├── StyleControlsSection.tsx  # Genre, sub-style, sliders
│   │   │   ├── InputSection.tsx          # Pre-generation: Text/Upload/Image tabs
│   │   │   ├── AiAssistantSection.tsx    # AI chat with scope badges
│   │   │   └── ChordPalette.tsx          # Chord selection palette
│   │   ├── arrangement/
│   │   │   ├── ArrangementView.tsx       # Main arrangement container
│   │   │   └── ChordLane.tsx             # Bottom chord display row
│   │   ├── sequencer-block.tsx           # Single bar-block (clickable, splittable)
│   │   ├── transport/
│   │   │   ├── TransportBar.tsx          # Play/pause, scrubber, loop, metronome
│   │   │   └── Scrubber.tsx              # Playhead position scrubber
│   │   ├── mixer/
│   │   │   └── MixerDrawer.tsx           # Collapsible mixer container
│   │   ├── library/
│   │   │   └── ProjectCard.tsx           # Project card for library view
│   │   ├── ui/                           # Primitive UI components (shadcn-derived)
│   │   │   ├── collapsible.tsx           # Collapsible container
│   │   │   ├── scroll-area.tsx           # Scroll area wrapper
│   │   │   └── select.tsx                # Select dropdown
│   │   └── shared/
│   │       ├── ConfirmDialog.tsx         # Reusable confirmation dialog
│   │       └── ScopeBadge.tsx            # "Song" / "Verse 2" / "Bass bar 7" badge
│   ├── pages/                            # Route-level pages (default exports allowed)
│   │   ├── EditorPage.tsx                # Main arrangement editor (the primary view)
│   │   ├── LibraryPage.tsx               # User's saved projects
│   │   ├── LoginPage.tsx                 # Auth page
│   │   └── SettingsPage.tsx              # User preferences
│   └── styles/
│       └── globals.css                   # Tailwind imports + forge theme tokens
├── supabase/
│   ├── migrations/                       # Database migrations (SQL)
│   │   ├── 001_initial_schema.sql
│   │   └── 002_add_feel_column.sql
│   └── functions/                        # Supabase Edge Functions
│       └── generate/                     # AI generation endpoint
│           └── index.ts
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── eslint.config.js
├── package.json
├── .env.local                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── CLAUDE.md                             # Agent constraints and guardrails
├── ARCHITECTURE.md                       # This file
└── DESIGN_SYSTEM.md                      # Visual design tokens and component patterns
```

---

## API Contracts

### Supabase Database Operations

All database operations use the Supabase JS client (`@supabase/supabase-js`). No custom REST API. Standard CRUD via `supabase.from('table').select/insert/update/delete`.

**Row Level Security (RLS) policy:** Every table has RLS enabled. Users can only read/write their own data. Policy: `auth.uid() = user_id` (projects) or via join to project's user_id (stems, sections, blocks, chords, ai_chat_messages).

### Generation API

**Endpoint:** Supabase Edge Function `POST /functions/v1/generate`

**Request:**
```typescript
interface GenerationRequest {
  project_id: string;
  key: string;                    // 'Bb', 'C', etc.
  tempo: number;                  // BPM
  time_signature: string;         // '4/4', '3/4', etc.
  genre: string;
  sub_style: string;
  energy: number;                 // 0-100
  groove: number;                 // 0-100
  swing_pct: number | null;
  dynamics: number;               // 0-100
  chords: ChordEntry[];           // Parsed chord progression
  generation_hints: string;       // Free-text hints
  stems: string[];                // ['drums','bass','piano','guitar','strings']
}

interface ChordEntry {
  degree: string | null;          // 'I', 'ii', 'V', 'bII', null (N.C.)
  quality: string | null;         // 'maj7', 'min7', 'dom7'
  bass_degree: string | null;     // For slash chords
}
```

**Response:**
```typescript
interface GenerationResponse {
  sections: SectionData[];
  stems: StemData[];
  blocks: BlockData[];
  chords: ChordData[];
}

interface SectionData {
  name: string;
  sort_order: number;
  bar_count: number;
  start_bar: number;
}

interface StemData {
  instrument: string;
  sort_order: number;
}

interface BlockData {
  stem_instrument: string;
  section_name: string;
  start_bar: number;
  end_bar: number;
  chord_degree: string | null;
  chord_quality: string | null;
  style: string;
  midi_data: MidiNoteData[];
}

interface MidiNoteData {
  note: string;        // e.g., 'C4', 'Bb3'
  time: number;        // Start time in beats from block start
  duration: number;    // Duration in beats
  velocity: number;    // 0-127
}

interface ChordData {
  bar_number: number;
  degree: string | null;
  quality: string | null;
  bass_degree: string | null;
}
```

**MVP stub implementation:** The edge function contains a rule-based generator that:
1. Creates sections from the chord progression (auto-detects verse/chorus patterns or defaults to a single section)
2. Creates blocks for each stem × section with genre-appropriate styles
3. Generates MIDI note data per block using music theory rules (chord tones, scale patterns, genre-typical rhythms)
4. Returns the complete arrangement structure

**Future AI implementation:** Same request/response contract. Replace the rule-based generator with an AI API call. No frontend changes required.

---

## Audio Engine Architecture

```
Tone.js Transport (master clock)
  ├── Tone.Sampler (drums)     ← triggered by block MIDI data
  ├── Tone.Sampler (bass)      ← triggered by block MIDI data
  ├── Tone.Sampler (piano)     ← triggered by block MIDI data
  ├── Tone.Sampler (guitar)    ← triggered by block MIDI data
  ├── Tone.Sampler (strings)   ← triggered by block MIDI data
  ├── Tone.MetalSynth (click)  ← metronome
  └── Tone.Gain (master)       ← master volume
```

Each stem routes through: `Sampler → Gain (volume) → Panner → Master Gain → Destination`

Solo/Mute logic: Mute sets stem gain to 0. Solo mutes all other stems. Multiple solos = only soloed stems audible.

Transport syncs Tone.js Transport position with the arrangement's bar/beat structure. Playhead position is computed from transport time + tempo + time signature.

---

## Code Conventions

### Naming and Imports
- **File naming:** kebab-case for files, PascalCase for React components, camelCase for functions/variables
- **Path alias:** Use `@/` for all `src/` imports (e.g., `@/lib/chords`, `@/store/project-store`)
- **Types barrel:** Import shared types via `import { Project } from '@/types'`
- **No barrel re-exports** except `types/index.ts`. Import directly from the source file.
- Named exports for all files. Default exports only for page/route components in `src/pages/`.

### Data Semantics
- **Chord storage:** Always Roman numerals internally. Letter names computed from key + degree at display time.
- **Bar numbering:** 1-indexed throughout. Bar 1 is the first bar of the arrangement.
- **Block spans:** Blocks cover contiguous bar ranges within a section. `start_bar` and `end_bar` are inclusive.
- **Null = inherited:** Any `_override` field that is null means "inherit from parent level."
- **DB field mapping:** Database uses snake_case, TypeScript uses camelCase. Transform in the `useProject` hook at the boundary.
- **All timestamps:** ISO 8601 strings
- **All UUIDs:** `string` type

### State and Components
- **State management:** Zustand for global stores (project, selection, undo, UI). React `useState` for component-local UI only.
- **No prop drilling** beyond 2 levels -- use stores.
- **Functional components only**, no class components.
- Use the `forge` theme's CSS custom property classes (`bg-background`, `bg-primary`, `text-foreground`, `bg-card`, `border-border`, etc.) defined in `src/styles/globals.css`.
- No custom CSS framework -- only Tailwind utilities + forge theme tokens.
