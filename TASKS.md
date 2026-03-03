# Arrangement Forge — Agent-Executable Task Specs

**Status:** Phase 2 complete
**Date:** 2026-03-02
**Purpose:** Self-contained task specs for parallel agent execution. Each task + ARCHITECTURE.md = everything an agent needs.

**How to read this file:**
- Tasks are ordered by dependency layer (0-8). Lower layers must complete before higher layers start.
- Each task lists the files it creates and its dependencies.
- "Depends on" means those tasks must be complete before starting.
- Size: S = <1hr, M = 1-2hr, L = 2-4hr estimated agent time.
- Every task references `ARCHITECTURE.md` for data model, project structure, and API contracts.

---

## Dependency DAG

```
Layer 0: T01, T02                          (no deps)
Layer 1: T03, T04, T24                     (T01)
Layer 2: T05, T06, T07, T08, T26          (T03/T04)
Layer 3: T25                               (T06)
Layer 4: T09, T10, T11, T12               (T05, T06, T25)
Layer 5: T13, T14, T15, T16               (T09)
Layer 6: T17, T18, T19, T20               (T16, T05, T07)
Layer 7: T21, T22                          (Layer 6)
Layer 8: T23                               (all)
```

---

## Deferred Features (Not MVP)

These features appear in the vision document but are explicitly deferred from the initial 26-task MVP. UI elements for these features render as disabled stubs with "Coming soon" labels where applicable.

- **Audio export (MP3/WAV/MIDI download)** — T13 export dropdown is visible but all items disabled. Requires `Tone.Offline` rendering + encoding.
- **Practice tracking / streak counter** — Removed from status bar and uiStore. No practice session tracking for MVP.
- **Image input (OCR for handwritten charts)** — T15 Image tab shows "Coming soon" stub.
- **File upload parsing (MusicXML/MIDI/iReal Pro)** — T15 Upload tab shows "Coming soon" stub.
- **Sharing / public arrangement profiles** — T13 share button disabled with "Coming soon" tooltip.
- **Responsive design (mobile/tablet)** — Desktop-only for MVP.
- **API/OAuth integrations** — No external API access for MVP.
- **Rate limiting by tier / pricing** — Free-only, no payment gating.
- **Practice reminders (push notifications)** — No notification system for MVP.

---

## T01: Project Scaffolding

**Layer:** 0  |  **Depends on:** none  |  **Size:** M
**Creates:** `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles/globals.css`, `src/App.tsx` (placeholder), `.env.local.example`, `.eslintrc.cjs`, `.prettierrc`

### What to Build

Initialize the Arrangement Forge frontend project from scratch using the exact tech stack from ARCHITECTURE.md.

**Package dependencies:**
- `react` 19, `react-dom` 19, `react-router-dom` 7
- `@supabase/supabase-js` 2
- `tone` (latest)
- `zustand` 5
- `tailwindcss` 4, `daisyui` 4
- Dev: `vite` 6, `typescript` 5, `@types/react`, `@types/react-dom`, `vitest`, `eslint`, `prettier`, `@vitejs/plugin-react`

**Vite config:** React plugin enabled. Dev server binds to `0.0.0.0` on port `5173` (accessible via SSH tunnel from dev machine). Alias `@/` → `src/`. Configured as:
```typescript
server: { host: '0.0.0.0', port: 5173 }
```

**Tailwind config:** DaisyUI plugin loaded. Theme set to `wireframe` (the theme used in mockups). Content paths: `./index.html`, `./src/**/*.{ts,tsx}`.

**TypeScript config:** Strict mode. JSX: `react-jsx`. Path alias `@/*` → `src/*`. Target: `ES2022`. Module: `ESNext`.

**index.html:** Standard Vite HTML entry point. Title: "Arrangement Forge". Loads `src/main.tsx`.

**src/main.tsx:** Renders `<App />` into `#root`. Imports `globals.css`.

**src/styles/globals.css:** Tailwind directives (`@tailwind base/components/utilities`). No custom CSS beyond Tailwind imports.

**src/App.tsx:** Minimal placeholder rendering `<div>Arrangement Forge</div>`. Will be replaced by T09.

**.env.local.example:** Template with `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` placeholders.

**ESLint/Prettier:** Standard React+TypeScript config. No custom rules unless they prevent real bugs.

**Directory structure:** Create all directories from ARCHITECTURE.md project structure (empty dirs with `.gitkeep` if needed): `src/types/`, `src/lib/`, `src/audio/`, `src/store/`, `src/hooks/`, `src/components/layout/`, `src/components/left-panel/`, `src/components/arrangement/`, `src/components/transport/`, `src/components/mixer/`, `src/components/shared/`, `src/pages/`, `supabase/migrations/`, `supabase/functions/generate/`.

### Acceptance Criteria

1. `npm install` succeeds with zero errors.
2. `npm run dev` starts a Vite dev server that serves the placeholder App component.
3. `npm run build` produces a production build with zero TypeScript errors.
4. Tailwind CSS with DaisyUI wireframe theme is functional (adding `className="btn btn-primary"` to a div renders a styled button).
5. All directories from ARCHITECTURE.md project structure exist.

### Constraints

- Must: Use npm (not yarn, not pnpm) per ARCHITECTURE.md.
- Must: Use exact versions/ranges specified in ARCHITECTURE.md tech stack.
- Must: Use kebab-case for filenames, PascalCase for components per ARCHITECTURE.md conventions.
- Must not: Add any application code beyond the minimal scaffolding described above.
- Must not: Add any barrel re-exports except where ARCHITECTURE.md explicitly allows (only `types/index.ts`).

### Verification

```bash
npm install && npm run dev    # dev server starts
npm run build                 # zero errors
npm run lint                  # zero warnings on scaffolding files
```

---

## T02: Supabase Schema + RLS

**Layer:** 0  |  **Depends on:** none  |  **Size:** M
**Creates:** `supabase/migrations/001_initial_schema.sql`

### What to Build

Write the complete Supabase database migration implementing all 7 tables from ARCHITECTURE.md data model. This is a single SQL migration file.

**Tables to create (see ARCHITECTURE.md for exact column definitions):**

1. **`profiles`** — Extended user profile. PK: `id` (uuid, FK → `auth.users`). Columns: `display_name` (text), `chord_display_mode` (text, default `'letter'`, check in `('letter','roman')`), `default_genre` (text, nullable), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now()).

2. **`projects`** — Song/arrangement workspace. PK: `id` (uuid, default gen_random_uuid()). FK: `user_id` → `profiles.id`. All columns per ARCHITECTURE.md: `name` (default `'Untitled Project'`), `key`, `tempo` (integer, check 40-240), `time_signature`, `genre`, `sub_style`, `energy` (integer, check 0-100), `groove` (integer, check 0-100), `swing_pct` (integer, nullable, check 50-80), `dynamics` (integer, check 0-100), `generation_hints` (text), `chord_chart_raw` (text), `has_arrangement` (boolean, default false), `generated_at` (timestamptz, nullable), `generated_tempo` (integer, nullable), `created_at`, `updated_at`.

3. **`stems`** — Instruments per project. PK: `id` (uuid). FK: `project_id` → `projects.id` (cascade delete). Columns: `instrument` (text, check in `('drums','bass','piano','guitar','strings')`), `sort_order` (integer), `volume` (float, default 0.8, check 0.0-1.0), `pan` (float, default 0.0, check -1.0 to 1.0), `is_muted` (boolean, default false), `is_solo` (boolean, default false), `created_at`.

4. **`sections`** — Structural sections. PK: `id` (uuid). FK: `project_id` → `projects.id` (cascade delete). Columns: `name` (text), `sort_order` (integer), `bar_count` (integer), `start_bar` (integer), `energy_override` (integer, nullable), `groove_override` (integer, nullable), `swing_pct_override` (integer, nullable), `dynamics_override` (integer, nullable), `created_at`.

5. **`blocks`** — Bar-level editing units. PK: `id` (uuid). FKs: `stem_id` → `stems.id` (cascade delete), `section_id` → `sections.id` (cascade delete). Columns: `start_bar` (integer), `end_bar` (integer), `chord_degree` (text, nullable), `chord_quality` (text, nullable), `chord_bass_degree` (text, nullable), `style` (text), `energy_override` (integer, nullable), `dynamics_override` (integer, nullable), `midi_data` (jsonb), `created_at`.

6. **`chords`** — One chord per bar, shared across stems. PK: `id` (uuid). FK: `project_id` → `projects.id` (cascade delete). Columns: `bar_number` (integer), `degree` (text, nullable), `quality` (text, nullable), `bass_degree` (text, nullable). Unique constraint on `(project_id, bar_number)`.

7. **`ai_chat_messages`** — Persistent AI chat history. PK: `id` (uuid). FK: `project_id` → `projects.id` (cascade delete). Columns: `role` (text, check in `('user','assistant')`), `content` (text), `scope` (text, check in `('setup','song','section','block')`), `scope_target` (text, nullable), `created_at`.

**Row Level Security (RLS):**
- Enable RLS on every table.
- `profiles`: Users can SELECT/UPDATE their own row (`auth.uid() = id`). INSERT via trigger on auth.users creation.
- `projects`: Users can SELECT/INSERT/UPDATE/DELETE where `auth.uid() = user_id`.
- `stems`, `sections`, `blocks`, `chords`, `ai_chat_messages`: Access controlled by joining to the parent `projects` table to verify `auth.uid() = projects.user_id`. Use security definer functions or subqueries for this.

**Triggers:**
- `handle_new_user()`: On `auth.users` INSERT, create a corresponding `profiles` row with `display_name` from user metadata.
- `update_updated_at()`: Before UPDATE on `profiles` and `projects`, set `updated_at = now()`.

**Indexes:**
- `projects(user_id)` — list user's projects.
- `stems(project_id)` — list stems for a project.
- `sections(project_id, sort_order)` — ordered section list.
- `blocks(stem_id)`, `blocks(section_id)` — block lookups.
- `chords(project_id, bar_number)` — chord lane lookup.
- `ai_chat_messages(project_id, created_at)` — chat history ordering.

### Acceptance Criteria

1. SQL file is syntactically valid Postgres SQL.
2. All 7 tables created with exact columns and types matching ARCHITECTURE.md.
3. RLS enabled on all tables with correct policies (user can only access own data).
4. Cascade deletes: deleting a project removes all child stems, sections, blocks, chords, and chat messages.
5. Check constraints enforce valid ranges (tempo 40-240, energy/groove/dynamics 0-100, etc.).

### Constraints

- Must: Use `gen_random_uuid()` for UUID defaults (Postgres 13+ built-in).
- Must: All timestamps use `timestamptz`.
- Must: RLS policies use `auth.uid()` (Supabase auth function).
- Must not: Create any custom REST endpoints — all data access is via Supabase client library.
- Must not: Add any tables not in ARCHITECTURE.md.

### Verification

```bash
# Verify SQL syntax (requires psql or a SQL linter)
# Deploy to Supabase local dev:
supabase db reset   # applies migration
supabase db lint    # checks for issues
```

---

## T03: TypeScript Types

**Layer:** 1  |  **Depends on:** T01  |  **Size:** S
**Creates:** `src/types/project.ts`, `src/types/audio.ts`, `src/types/ui.ts`, `src/types/index.ts`

### What to Build

Define all TypeScript interfaces and types matching the ARCHITECTURE.md data model and API contracts. These types are the compile-time contract that every other module imports.

**src/types/project.ts** — Data model types:

```typescript
// Mirror the database tables exactly.
// All fields use camelCase (transformed from snake_case by Supabase client).

interface Profile {
  id: string;
  displayName: string;
  chordDisplayMode: 'letter' | 'roman';
  defaultGenre: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  key: string;
  tempo: number;              // 40-240
  timeSignature: string;      // '4/4', '3/4', '6/8', etc.
  genre: string;
  subStyle: string;
  energy: number;             // 0-100
  groove: number;             // 0-100
  swingPct: number | null;    // 50-80, null = not applicable
  dynamics: number;           // 0-100
  generationHints: string;
  chordChartRaw: string;
  hasArrangement: boolean;
  generatedAt: string | null;
  generatedTempo: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Stem {
  id: string;
  projectId: string;
  instrument: InstrumentType;
  sortOrder: number;
  volume: number;             // 0.0-1.0
  pan: number;                // -1.0 to 1.0
  isMuted: boolean;
  isSolo: boolean;
  createdAt: string;
}

type InstrumentType = 'drums' | 'bass' | 'piano' | 'guitar' | 'strings';

interface Section {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  barCount: number;
  startBar: number;
  energyOverride: number | null;
  grooveOverride: number | null;
  swingPctOverride: number | null;
  dynamicsOverride: number | null;
  createdAt: string;
}

interface Block {
  id: string;
  stemId: string;
  sectionId: string;
  startBar: number;
  endBar: number;
  chordDegree: string | null;
  chordQuality: string | null;
  chordBassDegree: string | null;
  style: string;
  energyOverride: number | null;
  dynamicsOverride: number | null;
  midiData: MidiNoteData[];
  createdAt: string;
}

interface Chord {
  id: string;
  projectId: string;
  barNumber: number;
  degree: string | null;      // 'I', 'ii', 'V', 'bII', null = N.C.
  quality: string | null;     // 'maj7', 'min7', 'dom7'
  bassDegree: string | null;  // for slash chords
}

interface AiChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  scope: 'setup' | 'song' | 'section' | 'block';
  scopeTarget: string | null;
  createdAt: string;
}

interface MidiNoteData {
  note: string;               // 'C4', 'Bb3'
  time: number;               // beats from block start
  duration: number;           // beats
  velocity: number;           // 0-127
}
```

**Also define the generation API types** from ARCHITECTURE.md: `GenerationRequest`, `GenerationResponse`, `SectionData`, `StemData`, `BlockData`, `ChordData`, `ChordEntry`.

**src/types/audio.ts** — Audio engine types:

```typescript
type PlaybackState = 'stopped' | 'playing' | 'paused';
type CountInSetting = 'off' | '1-bar' | '2-bars';

interface TransportState {
  playbackState: PlaybackState;
  currentBar: number;
  currentBeat: number;
  elapsedSeconds: number;
  totalSeconds: number;
  isCountingIn: boolean;
}

interface AudioEngineConfig {
  metronomeEnabled: boolean;
  countIn: CountInSetting;
  masterVolume: number;       // 0.0-1.0
  loopEnabled: boolean;
  loopStartBar: number;
  loopEndBar: number;
}
```

**src/types/ui.ts** — UI state types:

```typescript
type SelectionLevel = 'song' | 'section' | 'block';
type ToolMode = 'select' | 'split';
type GenerationState = 'idle' | 'generating' | 'complete';
type SystemStatus = 'ready' | 'generating' | 'saving' | 'error' | 'offline';

interface SelectionState {
  level: SelectionLevel;
  sectionId: string | null;
  blockId: string | null;
  stemId: string | null;
}

interface UiState {
  toolMode: ToolMode;
  generationState: GenerationState;
  systemStatus: SystemStatus;
  errorMessage: string | null;
  mixerExpanded: boolean;
  zoomIndex: number;
  unsavedChanges: boolean;
  lastSavedAt: string | null;
  libraryCount: number;
}
```

**src/types/index.ts** — Barrel export (the only barrel re-export allowed per ARCHITECTURE.md):

```typescript
export * from './project';
export * from './audio';
export * from './ui';
```

### Acceptance Criteria

1. All types compile with zero TypeScript errors under strict mode.
2. Every database table from ARCHITECTURE.md has a corresponding TypeScript interface.
3. All generation API request/response types match ARCHITECTURE.md API contracts exactly.
4. Type field names use camelCase (matching Supabase JS client transform conventions).
5. Union types are used for all enums (InstrumentType, PlaybackState, ToolMode, etc.).

### Constraints

- Must: Types are interfaces (not classes) — pure type definitions, no runtime code.
- Must: Use `string` for UUID fields, `string` for timestamps (ISO 8601 strings from Supabase).
- Must not: Import anything from external packages in type files.
- Must not: Add runtime logic, utility functions, or React-specific types to these files.

### Verification

```bash
npx tsc --noEmit   # zero errors
```

---

## T04: Core Utilities

**Layer:** 1  |  **Depends on:** T01  |  **Size:** M
**Creates:** `src/lib/chords.ts`, `src/lib/genre-config.ts`, `src/lib/style-cascade.ts`, `src/lib/description-parser.ts`

### What to Build

Four pure utility modules with zero React dependencies. These are testable, standalone functions.

**src/lib/chords.ts** — Chord parsing and display (from Shakedown #7):

The internal data model stores chords as Roman numerals. This module converts between Roman numerals and letter names based on the song key.

Functions to implement:

- `formatChord(chord: Chord, key: string, mode: 'letter' | 'roman'): string` — Display a chord in the requested mode. In Roman mode: returns degree + quality (e.g., `"ii7"`, `"V7"`, `"Imaj7"`, `"bII7"`). In letter mode: resolves degree against key to produce letter name + quality (e.g., in key of C: ii7 → `"Dm7"`, V7 → `"G7"`). Handle slash chords: `"V7/vii"` → `"G7/B"` in letter mode. Handle N.C.: degree=null → `"N.C."` in both modes.

- `parseChordInput(input: string, key: string): { degree: string | null; quality: string | null; bassDegree: string | null } | null` — Parse user input that could be either Roman numeral or letter name. Input `"Dm7"` in key of C → `{ degree: 'ii', quality: 'min7' }`. Input `"ii7"` → `{ degree: 'ii', quality: 'min7' }`. Input `"N.C."` → `{ degree: null, quality: null, bassDegree: null }`. Return null if unparseable.

- `degreeToNote(degree: string, key: string): string` — Convert a Roman numeral degree to a note name. `degreeToNote('ii', 'C')` → `'D'`. `degreeToNote('bII', 'C')` → `'Db'`. Must handle all 12 keys including enharmonics (C#/Db, F#/Gb, etc.).

- `noteToDegree(note: string, key: string): string` — Inverse of degreeToNote. `noteToDegree('D', 'C')` → `'ii'`. Must infer major/minor from scale position (I=major, ii=minor, iii=minor, IV=major, V=major, vi=minor, vii°=diminished).

- `ALL_KEYS: string[]` — `['C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab','A','A#/Bb','B']`

- `QUALITY_MAP` — Maps common quality strings to canonical form: `'7'` → `'dom7'`, `'m7'` → `'min7'`, `'M7'`/`'maj7'` → `'maj7'`, `'dim'`/`'°'` → `'dim'`, `'ø'`/`'m7b5'` → `'half-dim7'`, etc.

**src/lib/genre-config.ts** — Genre/sub-style/slider configuration (from Shakedown #8b, #8c):

Export two configuration objects:

```typescript
export const GENRE_SUBSTYLES: Record<string, string[]> = {
  'Jazz':    ['Swing','Bebop','Cool','Modal','Free','Fusion','Latin Jazz'],
  'Blues':   ['Delta','Chicago','Texas','Jump Blues','Electric','Boogie'],
  'Rock':    ['Classic','Alternative','Indie','Progressive','Punk','Garage'],
  'Funk':    ['Classic Funk','P-Funk','Acid','Neo-soul','Disco'],
  'Country': ['Traditional','Outlaw','Bluegrass','Country Pop','Western Swing'],
  'Gospel':  ['Traditional','Contemporary','Southern','Praise & Worship'],
  'R&B':     ['Classic','Contemporary','New Jack Swing','Quiet Storm'],
  'Latin':   ['Bossa Nova','Samba','Son','Salsa','Bolero','Tango'],
  'Pop':     ['Synth Pop','Indie Pop','Power Pop','Dream Pop','Electropop'],
};

export const GENRE_SLIDERS: Record<string, {
  energy: boolean; groove: boolean; swing: boolean; dynamics: boolean;
}> = {
  'Jazz':    { energy: true, groove: true, swing: true,  dynamics: true },
  'Blues':   { energy: true, groove: true, swing: true,  dynamics: true },
  'Rock':    { energy: true, groove: true, swing: false, dynamics: true },
  'Funk':    { energy: true, groove: true, swing: true,  dynamics: true },
  'Country': { energy: true, groove: true, swing: true,  dynamics: true },
  'Gospel':  { energy: true, groove: true, swing: true,  dynamics: true },
  'R&B':     { energy: true, groove: true, swing: true,  dynamics: true },
  'Latin':   { energy: true, groove: true, swing: true,  dynamics: true },
  'Pop':     { energy: true, groove: true, swing: false, dynamics: true },
};
```

Also export `GENRES: string[]` (the keys of GENRE_SUBSTYLES) and `DEFAULT_GENRE = 'Jazz'`.

**src/lib/style-cascade.ts** — Style inheritance resolution (from ARCHITECTURE.md and Shakedown #6):

```typescript
export type CascadeField = 'energy' | 'groove' | 'swingPct' | 'dynamics';
export type CascadeSource = 'project' | 'section' | 'block';

export function resolveStyle(
  project: Project,
  section: Section,
  block: Block | null,
  field: CascadeField
): { value: number; source: CascadeSource } {
  // Block override wins, then section override, then project default.
  // See ARCHITECTURE.md for the exact algorithm.
}

export function isInherited(
  section: Section,
  block: Block | null,
  field: CascadeField,
  level: 'section' | 'block'
): boolean {
  // Returns true if the value at the given level is inherited (null override).
  // Used to style inherited values as dimmer vs overridden values as bold.
}
```

**src/lib/description-parser.ts** — Free-text → structured controls parser (from Shakedown #8d):

```typescript
interface ParseResult {
  genre?: string;
  subStyle?: string;
  energy?: number;
  tempo?: number;
  timeSignature?: string;
  key?: string;
  generationHints: string;  // unparsed remainder
}

export function parseDescription(text: string): ParseResult {
  // Simple keyword matching for MVP. Not NLP.
  // Map a dictionary of keywords to control values.
}
```

Keyword maps:
- Genre: `'jazz'`→`'Jazz'`, `'blues'`→`'Blues'`, `'rock'`→`'Rock'`, `'funk'`→`'Funk'`, `'country'`→`'Country'`, `'gospel'`→`'Gospel'`, `'r&b'`/`'rnb'`→`'R&B'`, `'latin'`/`'bossa'`/`'samba'`→`'Latin'`, `'pop'`→`'Pop'`
- Sub-style: `'swing'`→`'Swing'`, `'bebop'`→`'Bebop'`, `'bossa'`→`'Bossa Nova'`, `'delta'`→`'Delta'`, etc.
- Energy: `'soft'`→20, `'gentle'`→25, `'mellow'`→30, `'medium'`→50, `'moderate'`→50, `'high'`→75, `'intense'`→90, `'powerful'`→85
- Time signature: `'waltz'`→`'3/4'`, `'march'`→`'2/4'`
- Anything the parser can't map to a structured control is collected as `generationHints`.

**Parse priority rule:** The parser returns suggested values. The caller decides whether to apply them (only to controls still at default values — never overwrite user-set values).

### Acceptance Criteria

1. `formatChord({degree:'ii', quality:'min7', bassDegree:null}, 'C', 'letter')` → `'Dm7'`.
2. `formatChord({degree:'V', quality:'dom7', bassDegree:'vii'}, 'C', 'letter')` → `'G7/B'`.
3. `parseChordInput('Dm7', 'C')` → `{degree:'ii', quality:'min7', bassDegree:null}`.
4. Genre→sub-style cascade: `GENRE_SUBSTYLES['Jazz']` contains `'Swing'`.
5. `resolveStyle(project, section, block, 'energy')` correctly returns the most specific non-null override.
6. `parseDescription('jazz waltz, medium tempo, smoky feel')` extracts `genre:'Jazz'`, `timeSignature:'3/4'`, `energy:50`, and `generationHints` includes `'smoky feel'`.

### Constraints

- Must: Pure functions, no side effects, no React imports, no DOM access.
- Must: All functions are individually exported (no default exports).
- Must: Handle all 12 keys correctly for chord transposition, including enharmonic equivalents.
- Must not: Import from any file other than `src/types/`.

### Verification

```bash
npx vitest run src/lib/   # unit tests for all utility functions
```

Write unit tests alongside (or have a subsequent task create them). Every public function should have at least 3 test cases including edge cases (null chord = N.C., enharmonic keys, empty description).

---

## T05: Zustand Stores

**Layer:** 2  |  **Depends on:** T03  |  **Size:** M
**Creates:** `src/store/project-store.ts`, `src/store/selection-store.ts`, `src/store/undo-store.ts`, `src/store/ui-store.ts`

### What to Build

Four Zustand stores providing global state management. These stores are the single source of truth for all application state. Component-local state is reserved for transient UI concerns only.

**src/store/project-store.ts** — Project data state:

```typescript
interface ProjectStore {
  // Current project data
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
  chatMessages: AiChatMessage[];

  // Actions
  setProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;
  setArrangement: (data: {
    stems: Stem[];
    sections: Section[];
    blocks: Block[];
    chords: Chord[];
  }) => void;
  clearArrangement: () => void;

  // Stem actions
  updateStem: (stemId: string, partial: Partial<Stem>) => void;
  addStem: (stem: Stem) => void;
  reorderStems: (stemIds: string[]) => void;

  // Section actions
  addSection: (section: Section) => void;
  updateSection: (sectionId: string, partial: Partial<Section>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sectionIds: string[]) => void;

  // Block actions
  updateBlock: (blockId: string, partial: Partial<Block>) => void;
  splitBlock: (blockId: string, atBar: number) => void;
  mergeBlocks: (blockId1: string, blockId2: string) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;

  // Chord actions
  updateChord: (barNumber: number, chord: Partial<Chord>) => void;

  // Chat actions
  addChatMessage: (message: AiChatMessage) => void;

  // Computed / derived
  getTotalBars: () => number;
  getBlocksForStem: (stemId: string) => Block[];
  getBlocksForSection: (sectionId: string) => Block[];
  getSectionAtBar: (bar: number) => Section | undefined;
}
```

Key behavior for `splitBlock`: Given a block spanning bars 5-12 and a split at bar 9, create two blocks: one spanning 5-8 and one spanning 9-12. The new block inherits the original's style and chord data. Push undo entry.

Key behavior for `mergeBlocks`: Given two adjacent blocks in the same stem and section, merge them into a single block spanning both ranges. The merged block keeps the first block's style. Push undo entry.

**src/store/selection-store.ts** — Selection state (from Shakedown #6, #10g):

```typescript
interface SelectionStore {
  level: SelectionLevel;     // 'song' | 'section' | 'block'
  sectionId: string | null;
  blockId: string | null;
  stemId: string | null;

  // Actions
  selectSong: () => void;           // Escape or click empty space
  selectSection: (sectionId: string) => void;
  selectBlock: (blockId: string, stemId: string) => void;
  clearSelection: () => void;       // alias for selectSong

  // Navigation (from #10g keyboard shortcuts)
  selectNextBlock: () => void;      // → key
  selectPrevBlock: () => void;      // ← key
  selectBlockAbove: () => void;     // ↑ key
  selectBlockBelow: () => void;     // ↓ key
}
```

Selection determines what the left panel inspector shows:
- `level='song'` (nothing selected) → Song context inspector
- `level='section'` (section header clicked) → Section context inspector
- `level='block'` (block clicked) → Block context inspector

**src/store/undo-store.ts** — Undo/redo stack (from Shakedown #9e):

```typescript
interface UndoEntry {
  description: string;        // e.g., "Split guitar block at bar 7"
  stateBefore: string;        // JSON snapshot
  stateAfter: string;         // JSON snapshot
}

interface UndoStore {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxUndo: number;            // 50

  pushUndo: (description: string, before: string, after: string) => void;
  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;  // tooltip: "Undo: Split guitar..."
  getRedoDescription: () => string | null;
}
```

Behavior: `pushUndo` appends to undoStack (shift if >50), clears redoStack. `undo()` pops from undoStack, pushes to redoStack, returns the entry (caller restores `stateBefore`). `redo()` pops from redoStack, pushes to undoStack, returns the entry (caller restores `stateAfter`).

**src/store/ui-store.ts** — UI state:

```typescript
interface UiStore {
  toolMode: ToolMode;              // 'select' | 'split'
  generationState: GenerationState; // 'idle' | 'generating' | 'complete'
  systemStatus: SystemStatus;
  errorMessage: string | null;
  mixerExpanded: boolean;
  zoomIndex: number;               // index into ZOOM_STEPS = [1, 1.3, 1.7, 2.2, 3, 4]
  unsavedChanges: boolean;
  lastSavedAt: string | null;
  libraryCount: number;
  chordDisplayMode: 'letter' | 'roman';

  // Actions
  setToolMode: (mode: ToolMode) => void;
  setGenerationState: (state: GenerationState) => void;
  setSystemStatus: (status: SystemStatus, errorMsg?: string) => void;
  toggleMixer: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFitAll: () => void;
  markDirty: () => void;
  markSaved: () => void;
  toggleChordDisplay: () => void;
}

export const ZOOM_STEPS = [1, 1.3, 1.7, 2.2, 3, 4];
```

### Acceptance Criteria

1. All four stores instantiate without errors.
2. `projectStore.splitBlock()` correctly splits a multi-bar block into two blocks with correct bar ranges.
3. `selectionStore.selectBlock()` sets level to `'block'` and stores the blockId and stemId.
4. `undoStore.pushUndo()` → `undoStore.undo()` returns the entry with correct `stateBefore`.
5. `uiStore.zoomIn()` increments zoomIndex, `zoomOut()` decrements, `zoomFitAll()` resets to 0.

### Constraints

- Must: Use Zustand `create()` with the standard pattern (no middleware for MVP unless undo requires it).
- Must: Stores only hold serializable data (no functions, no DOM refs, no Tone.js objects).
- Must: `splitBlock` and `mergeBlocks` maintain block invariants (no overlapping bars, no gaps within a section).
- Must not: Import React or any component code from stores.

### Verification

```bash
npx vitest run src/store/   # unit tests for store actions
```

---

## T06: Supabase Client + Hooks

**Layer:** 2  |  **Depends on:** T03  |  **Size:** M
**Creates:** `src/lib/supabase.ts`, `src/hooks/useProject.ts`

### What to Build

**src/lib/supabase.ts** — Supabase client initialization:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**src/hooks/useProject.ts** — Project CRUD + Supabase sync hook:

This hook bridges the Zustand project store with Supabase persistence. It provides functions to load, save, create, and delete projects.

```typescript
export function useProject() {
  const projectStore = useProjectStore();

  return {
    // Load a project by ID — fetches project + all child records
    loadProject: async (projectId: string) => { ... },

    // Save current project state to Supabase
    saveProject: async () => { ... },

    // Create a new blank project
    createProject: async () => { ... },

    // Delete a project
    deleteProject: async (projectId: string) => { ... },

    // List user's projects (for library page)
    listProjects: async () => { ... },

    // Save arrangement after generation (bulk insert new entities)
    saveArrangement: async () => { ... },
  };
}
```

**loadProject** behavior:
1. Fetch `projects` row by ID.
2. Fetch related `stems`, `sections`, `blocks`, `chords`, `ai_chat_messages` in parallel.
3. Transform snake_case DB rows to camelCase TypeScript interfaces.
4. Call `projectStore.setProject()` and `projectStore.setArrangement()`.

**saveArrangement** behavior (called after generation):
1. Read current stems, sections, blocks, chords from project store (already have UUIDs assigned by T23 step 6).
2. Delete any existing stems/sections/blocks/chords for this project (clean slate on each generation).
3. Bulk insert all stems, sections, blocks, chords with their pre-assigned UUIDs.
4. Update the project row (`hasArrangement: true`, `generatedAt`, `generatedTempo`).
5. Update ui store: `markSaved()`.

**saveProject** behavior (called during editing, auto-save, manual save):
1. Read current state from project store.
2. Upsert `projects` row.
3. Upsert all `stems`, `sections`, `blocks`, `chords` (by UUID — entities already have IDs from initial generation).
4. Update ui store: `markSaved()`.

**Field name transform:** Supabase returns snake_case. TypeScript uses camelCase. Create helper functions `snakeToCamel` and `camelToSnake` for row transformation, or configure the Supabase client with a custom serializer.

### Acceptance Criteria

1. `supabase` client initializes without errors when env vars are set.
2. `createProject()` inserts a new project row and returns its ID.
3. `loadProject(id)` populates the project store with all related data.
4. `saveProject()` persists the current store state to Supabase.
5. Field names are correctly transformed between snake_case (DB) and camelCase (TS).

### Constraints

- Must: Use `@supabase/supabase-js` standard CRUD (no custom REST, no raw SQL from the client).
- Must: Handle errors gracefully (set system status to 'error' on failure).
- Must: Transform all field names between snake_case and camelCase.
- Must not: Expose the raw Supabase client to components — all DB access goes through this hook.

### Verification

```bash
# Integration test against Supabase local dev:
npx vitest run src/hooks/useProject.test.ts
```

---

## T07: Audio Engine

**Layer:** 2  |  **Depends on:** T03  |  **Size:** L
**Creates:** `src/audio/engine.ts`, `src/audio/instruments.ts`, `src/audio/transport.ts`, `src/audio/metronome.ts`, `src/hooks/useAudio.ts`

### What to Build

Implement the Tone.js-based audio engine per ARCHITECTURE.md audio engine architecture. The engine plays back MIDI data from blocks using browser synths/samplers.

**src/audio/engine.ts** — Core AudioEngine class:

```typescript
export class AudioEngine {
  private instruments: Map<InstrumentType, Tone.Sampler | Tone.Synth>;
  private channelGains: Map<InstrumentType, Tone.Gain>;
  private channelPanners: Map<InstrumentType, Tone.Panner>;
  private masterGain: Tone.Gain;
  private metronome: Metronome;
  private transport: TransportController;
  private initialized: boolean;

  async init(): Promise<void>;         // Initialize audio context + instruments
  dispose(): void;                     // Clean up all audio nodes

  play(): void;                        // Start playback from current position
  pause(): void;                       // Pause playback
  stop(): void;                        // Stop and return to position 0
  seek(bar: number): void;             // Jump to a specific bar

  setVolume(instrument: InstrumentType, volume: number): void;  // 0.0-1.0
  setPan(instrument: InstrumentType, pan: number): void;        // -1.0 to 1.0
  setMute(instrument: InstrumentType, muted: boolean): void;
  setSolo(instrument: InstrumentType, soloed: boolean): void;
  setMasterVolume(volume: number): void;
  setTempo(bpm: number): void;

  loadArrangement(blocks: Block[], stems: Stem[], sections: Section[], timeSignature: string): void;
  getTransportState(): TransportState;
}
```

**Signal chain per ARCHITECTURE.md:**
```
Sampler/Synth → Gain (per-stem volume) → Panner (per-stem pan) → Master Gain → Destination
```

**Solo/Mute logic:** Mute sets the stem's gain node to 0. Solo mutes all non-soloed stems. Multiple solos = only soloed stems are audible. When no stems are soloed, all non-muted stems play.

**Playback:** Schedule MIDI notes from blocks onto the Tone.js Transport. For each block:
1. Compute `blockStartSeconds = getTimeAtBar(block.startBar)` via TransportController.
2. For each note in `block.midiData`: compute `noteAbsoluteSeconds = blockStartSeconds + (note.time * 60 / tempo)` (note.time is in beats, multiply by seconds-per-beat to get seconds).
3. Schedule via `Tone.Transport.schedule(callback, noteAbsoluteSeconds)`. The callback triggers the appropriate instrument's synth/sampler with `note.note`, `note.duration * 60 / tempo` (duration also converted from beats to seconds), and `note.velocity / 127`.

**src/audio/instruments.ts** — Instrument definitions:

For MVP, use Tone.js built-in synths (not SoundFont samples — that's post-MVP):
- Drums: `Tone.MembraneSynth` (kick), `Tone.NoiseSynth` (snare/hats) — or `Tone.Sampler` with basic samples
- Bass: `Tone.MonoSynth` (deep, monophonic)
- Piano: `Tone.PolySynth` (polyphonic pad-like)
- Guitar: `Tone.PluckSynth` (plucked string)
- Strings: `Tone.PolySynth` with slow attack (pad-like)

Export a factory function: `createInstrument(type: InstrumentType): Tone.Instrument`.

**src/audio/transport.ts** — Transport controller:

Wraps `Tone.Transport` to provide bar/beat-level control. Converts between seconds and bar positions using tempo and time signature.

```typescript
export class TransportController {
  setTempo(bpm: number): void;
  setTimeSignature(numerator: number, denominator: number): void;
  getBarAtTime(seconds: number): number;
  getTimeAtBar(bar: number): number;
  getTotalDuration(totalBars: number): number;
  getCurrentBar(): number;
  getCurrentBeat(): number;
}
```

**Duration formula:** `totalSeconds = (totalBars * beatsPerBar * 60) / tempo`

**src/audio/metronome.ts** — Click track and count-in (from Shakedown #10i):

```typescript
export class Metronome {
  private enabled: boolean;
  private countIn: CountInSetting;

  setEnabled(enabled: boolean): void;
  setCountIn(setting: CountInSetting): void;
  scheduleClick(startBar: number, endBar: number, tempo: number, timeSig: string): void;
  scheduleCountIn(tempo: number, timeSig: string, onComplete: () => void): void;
}
```

- Click sound: short `Tone.MetalSynth` hit on every beat during playback.
- Count-in: plays 1 or 2 bars of clicks before music starts. During count-in, fires `onComplete` callback when done so the engine can start music playback.
- Click volume is independent of master volume.

**src/hooks/useAudio.ts** — React hook wrapping the engine:

```typescript
export function useAudio() {
  // Singleton AudioEngine instance
  // Exposes: play, pause, stop, seek, transport state
  // Subscribes to project store for arrangement data
  // Updates on stem volume/pan/mute/solo changes
  return { engine, transportState, play, pause, stop, seek, isReady };
}
```

### Acceptance Criteria

1. `engine.init()` initializes the Web Audio context and all instruments without errors.
2. `engine.loadArrangement()` + `engine.play()` produces audible playback of MIDI note data.
3. Setting volume/pan/mute/solo on individual stems correctly affects the audio output.
4. Metronome click is audible on every beat when enabled.
5. Count-in plays the correct number of bars of clicks before music starts.
6. `seek(bar)` correctly repositions playback to the specified bar.

### Constraints

- Must: Use Tone.js for all audio synthesis and scheduling (no raw Web Audio API except where Tone.js doesn't cover).
- Must: Handle the Web Audio context resume requirement (user gesture needed before audio plays).
- Must: All audio nodes are properly disposed on cleanup to prevent memory leaks.
- Must not: Load external audio samples for MVP (use Tone.js built-in synths only).
- Must not: Block the main thread — all audio scheduling happens in the audio worklet.

### Verification

```bash
# Manual testing in browser:
# 1. Call engine.init() from console
# 2. Load test arrangement data
# 3. Verify playback, mute/solo, metronome, count-in
```

---

## T08: Generation Edge Function

**Layer:** 2  |  **Depends on:** T03  |  **Size:** L
**Creates:** `supabase/functions/generate/index.ts`, `src/lib/midi-generator.ts`

### What to Build

The MVP "AI" generation is a rule-based MIDI generator that produces musically sensible arrangements from structured parameters. Same API contract as the future AI service — swap implementation later.

**supabase/functions/generate/index.ts** — Supabase Edge Function:

Handles `POST /functions/v1/generate`. Receives a `GenerationRequest`, calls the generation logic, returns a `GenerationResponse`. See ARCHITECTURE.md for exact request/response types.

```typescript
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  const request: GenerationRequest = await req.json();
  const response: GenerationResponse = generate(request);
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**src/lib/midi-generator.ts** — Rule-based generation logic:

This module contains the core generation algorithm. It can also be imported directly on the frontend for local generation (avoiding the edge function round-trip during development).

```typescript
export function generate(request: GenerationRequest): GenerationResponse {
  // 1. Create sections from chord progression
  // 2. Create stems (one per requested instrument)
  // 3. Generate blocks for each stem × section
  // 4. Generate MIDI note data per block
  // 5. Return complete arrangement structure
}
```

**Section creation logic:**
- If chord progression has 12 bars, create: Intro (4 bars) + Verse (4 bars) + Chorus (4 bars).
- If 16 bars: Intro (4) + Verse (8) + Chorus (4).
- If 32 bars: Intro (4) + Verse 1 (8) + Chorus (8) + Verse 2 (8) + Outro (4).
- If other lengths: divide into 4-8 bar sections with reasonable names.
- Each section gets `start_bar` computed from preceding sections.

**Block creation logic:**
- For each stem × section: create one block spanning the full section (initial state per Shakedown #1: "one continuous block per section").
- Assign genre-appropriate style strings per instrument (see ARCHITECTURE.md style values).
- Blocks for pitched instruments (bass, piano, guitar, strings) get chord data from the chord progression.

**MIDI generation per block** (genre-aware rules):

For Drums:
- Generate typical rhythmic patterns. Jazz swing: ride cymbal pattern + snare accents. Rock: kick-snare-kick-snare with hats. Funk: syncopated kick patterns.
- Notes use GM drum map numbers (kick=C2, snare=D2, hat=F#2, ride=D#3, etc.) but represented as note names.

For Bass:
- Walking bass: chord root on beat 1, passing tones on other beats.
- Pedal: root note sustained.
- Generate 1-4 notes per bar depending on style and time signature.

For Piano/Guitar:
- Chord voicings on beats based on style. Jazz comp: off-beat stabs. Block chords: hits on every beat. Arpeggiated: broken chord pattern.
- Generate chord tones (root, 3rd, 5th, 7th) with appropriate octave range (piano: C3-C5, guitar: E2-E4).

For Strings:
- Sustained pad: one long chord tone per bar. Tremolo: repeated notes. Pizzicato: plucked on beats.

**Chord resolution:** The request contains `ChordEntry[]` with Roman numeral degrees. Resolve each degree to actual note names using the request's `key` field for MIDI data generation.

### Acceptance Criteria

1. `generate(request)` returns a valid `GenerationResponse` with sections, stems, blocks, and chords.
2. Block MIDI data contains musically valid notes (chord tones in correct octaves, reasonable velocities 40-127).
3. Sections have correct `start_bar` values (sequential, no gaps, no overlaps).
4. Each stem has blocks covering every bar of the arrangement (no gaps).
5. Style strings match the genre (e.g., Jazz → "jazz_brush_swing" for drums, not "rock_straight").
6. The edge function returns HTTP 200 with a valid JSON response.

### Constraints

- Must: Match the `GenerationRequest`/`GenerationResponse` types from ARCHITECTURE.md exactly.
- Must: Generate at least 2-4 MIDI notes per block (not empty blocks).
- Must: Use music theory rules for chord tones (don't generate random notes).
- Must: Edge function runs in Deno (Supabase Edge Functions use Deno runtime).
- Must not: Call any external AI API — this is a self-contained rule-based generator.
- Must not: Generate audio — only MIDI note data (note name, time, duration, velocity).

### Verification

```bash
# Unit test the generator:
npx vitest run src/lib/midi-generator.test.ts

# Test the edge function locally:
supabase functions serve generate
curl -X POST http://localhost:54321/functions/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"key":"C","tempo":120,"time_signature":"4/4","genre":"Jazz","sub_style":"Swing","energy":50,"groove":50,"swing_pct":65,"dynamics":50,"chords":[{"degree":"I","quality":"maj7"},{"degree":"ii","quality":"min7"},{"degree":"V","quality":"dom7"},{"degree":"I","quality":"maj7"}],"generation_hints":"","stems":["drums","bass","piano"]}'
```

---

## T09: App Shell + Routing

**Layer:** 4  |  **Depends on:** T05, T06, T25  |  **Size:** S
**Creates:** `src/App.tsx`, `src/components/layout/AppShell.tsx`, `src/pages/EditorPage.tsx`

### What to Build

Replace the placeholder App.tsx with a routed application shell.

**src/App.tsx** — Root component with React Router:

```tsx
// Routes:
// /              → redirect to /library
// /login         → LoginPage
// /library       → LibraryPage
// /project/:id   → EditorPage (the main arrangement editor)
// /settings      → SettingsPage
```

Wrap routes in a Supabase auth guard: unauthenticated users get redirected to `/login`. Authenticated users can access all routes.

**src/components/layout/AppShell.tsx** — Layout wrapper for the editor page:

The AppShell provides the three-zone layout of the editor:
```
┌─────────────────────────────────────────────┐
│                  TOP BAR                     │  ← T13
├──────────┬──────────────────────────────────┤
│          │                                   │
│   LEFT   │         ARRANGEMENT               │  ← T16
│   PANEL  │            VIEW                   │
│          │                                   │
│  (T15)   ├──────────────────────────────────┤
│          │         TRANSPORT                 │  ← T19
│          ├──────────────────────────────────┤
│          │           MIXER                   │  ← T20
├──────────┴──────────────────────────────────┤
│                STATUS BAR                    │  ← T14
└─────────────────────────────────────────────┘
```

The AppShell defines the flex layout structure. Each zone renders a placeholder `<div>` with the zone name until the actual component tasks (T13-T20) are completed.

- Left panel: fixed width 320px, `overflow-y: auto`.
- Main area (right): `flex-1`, contains arrangement view + transport + mixer in a vertical flex column.
- Top bar: full width, sticky top.
- Status bar: full width, sticky bottom.

**src/pages/EditorPage.tsx** — Wraps AppShell and loads project data:

```tsx
export default function EditorPage() {
  const { id } = useParams();
  const { loadProject } = useProject();

  useEffect(() => {
    if (id) loadProject(id);
  }, [id]);

  return <AppShell />;
}
```

### Acceptance Criteria

1. Navigating to `/project/:id` renders the AppShell with three zones visible.
2. Navigating to `/login`, `/library`, `/settings` renders the respective page component (placeholder OK).
3. Unauthenticated users are redirected to `/login`.
4. The AppShell flex layout correctly allocates space: 320px left panel, flex-1 main area.
5. `EditorPage` calls `loadProject` with the URL parameter ID on mount.

### Constraints

- Must: Use React Router v7 (latest).
- Must: AppShell layout matches the mockup zones exactly.
- Must not: Implement auth logic beyond a simple redirect guard (T10 handles the login page).
- Must not: Add any visual styling beyond basic layout structure (border placeholders are fine for zone visibility).

### Verification

```bash
npm run dev   # navigate to each route, verify rendering
```

---

## T10: Login Page

**Layer:** 4  |  **Depends on:** T05, T06, T25  |  **Size:** S
**Creates:** `src/pages/LoginPage.tsx`

### What to Build

A simple authentication page using Supabase Auth.

**Login page layout:**
- Centered card on a full-page background.
- App logo/name "Arrangement Forge" at top.
- Two auth methods: Email/password form + Google OAuth button.
- Toggle between "Sign In" and "Sign Up" modes.
- Error message display for invalid credentials.

**Auth flow:**
- Email/password: `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()`.
- Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- On successful auth: redirect to `/library`.
- On error: show inline error message.

**Styling:** Use DaisyUI `card`, `form-control`, `input`, `btn` components. Wireframe theme.

### Acceptance Criteria

1. Email/password sign-in form submits and authenticates against Supabase.
2. Google OAuth button initiates the OAuth flow.
3. Successful login redirects to `/library`.
4. Invalid credentials show an error message.
5. Sign Up mode creates a new account.

### Constraints

- Must: Use Supabase Auth exclusively (no custom auth).
- Must: Handle loading states (disable button during auth request).
- Must not: Store passwords or tokens in localStorage manually — Supabase client handles session.

### Verification

```bash
# Manual test: sign up, sign in, verify redirect, test invalid credentials
```

---

## T11: Library Page

**Layer:** 4  |  **Depends on:** T05, T06, T25  |  **Size:** M
**Creates:** `src/pages/LibraryPage.tsx`

### What to Build

The user's project library — a grid/list of saved projects with create/delete/open actions, plus search and sort.

**Layout:**
- Top section: "My Library" heading + "New Project" button.
- Below heading: Search input + Sort dropdown (side by side).
- Grid of project cards showing: project name, genre, key, tempo, bar count, last edited date.
- Empty state: "No projects yet. Create your first arrangement!" with prominent "New Project" button.

**Project card actions:**
- Click card → navigate to `/project/:id` (open in editor).
- Delete button (small, corner) → confirm dialog → delete project.
- Duplicate button → create a copy of the project.

**"New Project" flow:**
1. Click "New Project".
2. Call `createProject()` from useProject hook (creates a blank project in Supabase).
3. Navigate to `/project/:newId`.

**Search:**
- Search input at top of library (DaisyUI `input` with search icon).
- Client-side filter: matches against project name, genre, key (case-insensitive substring match).
- Debounced (300ms) — filters the displayed project list reactively.
- Empty search shows all projects.

**Sort:**
- Sort dropdown next to search: "Last Edited" (default), "Name A-Z", "Name Z-A", "Genre", "Key", "Tempo".
- Sort is client-side on the already-fetched project list.
- Search and sort work together: filter first, then sort the filtered results.

**Library count:** The total project count is stored in `uiStore.libraryCount` and displayed in the status bar ("Library: N tracks").

### Acceptance Criteria

1. Library page loads and displays the user's projects from Supabase.
2. Clicking a project card navigates to the editor for that project.
3. "New Project" creates a blank project and opens it in the editor.
4. Delete with confirmation removes the project from the database and the UI.
5. Empty state displays correctly when user has no projects.
6. Search input filters projects by name, genre, or key (case-insensitive substring match).
7. Sort dropdown changes project card order by the selected criterion.
8. Search + sort work together (filter first, then sort).

### Constraints

- Must: Fetch projects from Supabase on page load.
- Must: Use DaisyUI card/grid components for project cards.
- Must: Debounce search input at 300ms.
- Must not: Load full arrangement data for each project — just the project metadata (name, key, tempo, etc.).

### Verification

```bash
# Manual test: create project, verify it appears, delete it, verify it's gone
# Search: type a genre name, verify only matching projects show
# Sort: select "Name A-Z", verify alphabetical order
# Combined: search + sort, verify correct filtered and sorted results
```

---

## T12: Settings Page

**Layer:** 4  |  **Depends on:** T05, T06, T25  |  **Size:** S
**Creates:** `src/pages/SettingsPage.tsx`

### What to Build

User preferences page. Settings are stored in the `profiles` table.

**Settings (from Shakedown #9f Preferences):**
- **Chord Display Mode:** Toggle between "Letter names" (C, Dm7) and "Roman numerals" (I, ii7). Default: letter. Stored in `profiles.chord_display_mode`.
- **Default Genre:** Dropdown of all genres from GENRE_SUBSTYLES. When creating a new project, this genre is pre-selected. Stored in `profiles.default_genre`.
- **Display Name:** Editable text field. Stored in `profiles.display_name`.

**Layout:**
- Simple form with labeled fields.
- "Save" button at bottom.
- Success toast on save.
- "Back to Library" link.

**Future settings (show disabled/placeholder):**
- Audio output device
- Auto-save interval
- Theme preference

### Acceptance Criteria

1. Settings page loads current profile values from Supabase.
2. Changing chord display mode and saving persists to `profiles` table.
3. Changing default genre and saving persists to `profiles` table.
4. Changes to chord display mode immediately update `uiStore.chordDisplayMode`.

### Constraints

- Must: Read/write the `profiles` table via Supabase client.
- Must: Show current values when page loads.
- Must not: Add settings not listed above for MVP.

### Verification

```bash
# Manual test: change settings, save, reload page, verify persistence
```

---

## T13: Top Bar

**Layer:** 5  |  **Depends on:** T09  |  **Size:** L
**Creates:** `src/components/layout/TopBar.tsx`

### What to Build

The persistent top bar with two rows: title bar and params bar. This is the most state-complex component, with 13 interactive elements each having 3 behavioral states (pre-generation, during-generation, post-generation).

**Row 1 — Title bar layout:**
```
ARRANGEMENT FORGE    [project name input]    [Undo][Redo] Save Export▾ Share [DP▾]
```

**Row 2 — Params bar layout:**
```
KEY [Bb▾] [A ‖ I] TEMPO [◀ 128 ▶] BPM  TIME [3/4▾]  ──────  [GENERATE]
```

**Element specifications (from Shakedown #9, all 13 sub-problems):**

**9a — Project name:** Editable text input, center-aligned. Pre-gen: "Untitled Project" (muted). Post-gen: user-set or auto-named. On blur: auto-save if non-empty, revert to previous if empty. Never allow blank.

**9b — Save button:** `btn btn-sm btn-ghost`. Always active. Click → immediate save, button flashes "Saved ✓" for 1.5s. Keyboard: `Cmd+S` / `Ctrl+S` (intercept browser default). Auto-save every 60s if unsaved changes. Status bar updates with save timestamp.

**9c — Export dropdown:** Disabled pre-gen. Post-gen: DaisyUI `dropdown dropdown-end`. All menu items show "Coming soon" with muted text and `pointer-events: none` — audio export is deferred to post-MVP. Items to display (all disabled): MP3 (full mix), WAV (full mix), MIDI (all tracks), separator, Stems ZIP (WAV), Stems ZIP (MIDI). This is the ONLY export location (no duplicate in mixer).

**9d — Share button:** Disabled in both pre-gen and post-gen for MVP. Shows tooltip "Coming soon" on hover. Sharing is deferred to post-MVP.

**9e — Undo/Redo:** Two icon buttons `[↶] [↷]`. Disabled pre-gen. Post-gen: active when stacks have items. Tooltip shows description: "Undo: Split guitar block at bar 7". Keyboard: `Cmd+Z` / `Cmd+Shift+Z`.

**9f — Account avatar:** Always active. Circular avatar with user initials. Click → dropdown: My Library, Account Settings, Preferences, separator, Keyboard Shortcuts, Help & Docs, separator, Sign Out.

**9g — KEY dropdown:** `select` with all 12 keys. Always active. Pre-gen: just sets key, no side effects. Post-gen: **transposition event** — shows confirmation dialog: "Transpose arrangement? Changing key from {old} to {new} will transpose all chords and notes." On confirm: update key, recalculate letter displays, push undo. On cancel: revert dropdown.

**9h — Chord Display toggle [A ‖ I]:** Small segmented control. Always active. Toggles between letter mode ('A') and Roman numeral mode ('I'). Instantly flips all chord displays everywhere. No confirmation needed, no undo entry (display preference only).

**9i — TEMPO [◀ 128 ▶]:** Decrement/increment buttons + number input + "BPM" label. Always active. Range: 40-240. Pre-gen: sets generation tempo. Post-gen: changes playback speed only (no regeneration). Arrow buttons ±1, Shift+arrows ±10. If deviation >20% from generation tempo, show hint: "Generated at {N} BPM". Update total duration display.

**9j — TIME [3/4▾]:** Dropdown with options: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 12/8. Always active. Pre-gen: just sets value. Post-gen: **destructive** — shows confirmation: "Change time signature? Changing from {old} to {new} requires regenerating the entire arrangement." On confirm: snapshot undo, update value, trigger full regeneration. On cancel: revert dropdown.

**9k — GENERATE button:** Three states:
1. Pre-gen: "GENERATE" — active when input exists (chord chart or description non-empty), disabled otherwise. Click → send generation request.
2. During gen: "GENERATING..." — disabled, shows spinner. Cancel option appears.
3. Post-gen: "REGENERATE" — always active. Click → confirm dialog: "Regenerate arrangement? This will replace your current arrangement." On confirm: snapshot undo, regenerate. Keyboard: `Cmd+Enter`.

**9l — No export in mixer:** Export lives exclusively here in the top bar.

**9m — Context-awareness rule:** Top bar does NOT change based on left-panel context. Always shows song-level controls.

**Complete state table (from Shakedown #9):**
```
Element             │ Pre-generation       │ During generation    │ Post-generation
────────────────────┼──────────────────────┼──────────────────────┼───────────────────
Project name        │ "Untitled Project"   │ (unchanged)          │ User-set or auto
Undo / Redo         │ Disabled             │ Disabled             │ Active (when items)
Save                │ Active               │ Active               │ Active
Export ▾            │ Disabled             │ Disabled             │ Active
Share               │ Disabled             │ Disabled             │ Active
Account [DP▾]      │ Active               │ Active               │ Active
KEY [Bb▾]          │ Active (no confirm)  │ Disabled             │ Active (transpose)
Chord Display [A/I] │ Active               │ Active               │ Active
TEMPO [◀128▶]      │ Active (no confirm)  │ Disabled             │ Active (speed only)
TIME [3/4▾]        │ Active (no confirm)  │ Disabled             │ Active (regen)
GENERATE            │ "GENERATE"           │ "GENERATING..."      │ "REGENERATE"
```

### Acceptance Criteria

1. Title bar renders all elements in correct positions.
2. Params bar renders KEY, Chord Display toggle, TEMPO, TIME, and GENERATE button.
3. GENERATE button is disabled when chord chart and description are both empty.
4. KEY change post-generation shows transpose confirmation dialog.
5. TIME change post-generation shows regeneration confirmation dialog.
6. Undo/Redo buttons reflect the undo store state (disabled when empty).
7. All elements correctly disable during generation state.

### Constraints

- Must: Use DaisyUI components (dropdown, btn, select, input, join, kbd).
- Must: All confirmation dialogs use the shared ConfirmDialog component (T23, or inline until then).
- Must: Top bar remains fixed at the top, does not scroll.
- Must not: Change based on left-panel context — always song-level.
- Must not: Duplicate any controls that live in the left panel (no genre, no sub-style, no energy sliders).

### Verification

```bash
# Manual test in each state (pre-gen, during-gen, post-gen):
# - Verify all buttons have correct enabled/disabled states
# - Test KEY change with arrangement loaded (confirm dialog appears)
# - Test Cmd+S saves, Cmd+Z undoes
```

---

## T14: Status Bar

**Layer:** 5  |  **Depends on:** T09  |  **Size:** M
**Creates:** `src/components/layout/StatusBar.tsx`

### What to Build

The bottom status bar with 5 interactive elements (from Shakedown #11 — streak counter deferred, see Deferred Features).

**Status bar layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Library: 47 tracks   ● Ready   Saved: 2 min ago         ? Help   ⌘K   │
└──────────────────────────────────────────────────────────────────────────┘
```

**11a — "ARRANGEMENT FORGE" logo (in TopBar, but navigation behavior):** Logo click navigates to library. If unsaved changes: show dialog with Discard/Cancel/Save & Leave. Wire this behavior in the TopBar component but the logic is specified here.

**11b — "Library: N tracks":** Clickable. Same save-guard behavior as logo (11a). Shows `uiStore.libraryCount`. Bold number. `cursor: pointer`, subtle hover effect.

**11d — System status indicator:** Colored dot + text. 5 states:
| State | Dot color | Text | Clickable? |
|-------|-----------|------|-----------|
| Ready | Green (`bg-success`) | Ready | No |
| Generating | Amber (`bg-warning`, pulsing) | Generating... | No |
| Saving | Amber (`bg-warning`) | Saving... | No |
| Error | Red (`bg-error`) | Error | Yes — shows error detail toast |
| Offline | Gray (`bg-base-300`) | Offline | No |

Reads from `uiStore.systemStatus` and `uiStore.errorMessage`.

**11e — "Saved: X ago":** Read-only. Updates from `uiStore.lastSavedAt`. Displays relative time: "just now", "1 min ago", "5 min ago", etc. Updates every 30 seconds.

**11f — "? Help":** Clickable. Opens a DaisyUI `dropdown dropdown-top dropdown-end` upward from the status bar:
- Keyboard Shortcuts (⌘?) — opens a modal with the full shortcut table from Shakedown #10g
- Quick Start Guide — multi-step overlay (placeholder for MVP)
- separator
- Documentation ↗ (external link)
- Report an Issue ↗ (external link)

**11g — ⌘K hint:** `<kbd>` element, right-aligned. Keyboard shortcut `Cmd+K` opens the Keyboard Shortcuts modal (same as Help > Keyboard Shortcuts for MVP). Post-MVP: full command palette. Tooltip: "Keyboard shortcuts".

**Keyboard Shortcuts modal layout (from Shakedown #11e):**
```
┌────────────────────────────────────────────────────────┐
│              KEYBOARD SHORTCUTS                        │
├──────────────────────┬─────────────────────────────────┤
│ PLAYBACK             │ EDITING                         │
│ Space    Play/Pause  │ Delete   Delete block           │
│ ⌘Enter  Generate     │ D        Duplicate block        │
│                      │ V        Select mode            │
│ NAVIGATION           │ S        Split mode             │
│ Escape   Deselect    │ M        Toggle mixer           │
│ ← →     Prev/Next    │                                 │
│ ↑ ↓     Lane up/down │ ZOOM                            │
│ Tab      Next block   │ ⌘+      Zoom in                │
│                      │ ⌘-      Zoom out               │
│ FILE                 │ ⌘0      Fit all                 │
│ ⌘S      Save        │                                 │
│ ⌘Z      Undo        │ ⌘K      Command palette         │
│ ⌘⇧Z     Redo        │ ⌘?      This panel              │
└──────────────────────┴─────────────────────────────────┘
```

### Acceptance Criteria

1. Status bar renders at the bottom of the viewport with all 5 elements (library, status, saved time, help, shortcut hint).
2. Library link is clickable and shows save-guard dialog when unsaved changes exist.
3. System status correctly reflects `uiStore.systemStatus` with appropriate colors.
4. Help dropdown opens upward with correct menu items.
5. `Cmd+K` opens the Keyboard Shortcuts modal.

### Constraints

- Must: Status bar is `position: sticky; bottom: 0` — always visible.
- Must: Help dropdown opens upward (`dropdown-top`) since it's at the bottom of the screen.
- Must: Use DaisyUI components (dropdown, modal, kbd, badge).
- Must not: Add any functionality not specified in Shakedown #11.

### Verification

```bash
# Manual test: verify all elements render, click Library (save guard), open Help dropdown, press Cmd+K
```

---

## T15: Left Panel — Song Context

**Layer:** 5  |  **Depends on:** T09  |  **Size:** L
**Creates:** `src/components/left-panel/LeftPanel.tsx`, `src/components/left-panel/SongContext.tsx`, `src/components/left-panel/StyleControls.tsx`, `src/components/left-panel/InputPanel.tsx`, `src/components/left-panel/AiAssistant.tsx`

### What to Build

The context-aware left panel (Shakedown #6) in its song-level state (nothing selected in the arrangement). This is the pre-generation primary interface and the post-generation default inspector.

**src/components/left-panel/LeftPanel.tsx** — Panel container:

Reads `selectionStore.level` and renders the appropriate context component:
- `level='song'` → `<SongContext />`
- `level='section'` → `<SectionContext />` (T21)
- `level='block'` → `<BlockContext />` (T21)

At the top: **scope breadcrumb** showing `Song > Verse 2 > Bass bar 7`. Clicking any level navigates to that context. Format: clickable text links separated by `>`.

At the bottom: **AI Assistant** (always visible, context-aware scope badge).

**src/components/left-panel/SongContext.tsx** — Song-level inspector:

**Pre-generation layout (primary interface):**
1. **INPUT section** — tabs: Text / Upload / Image (3 tabs per Shakedown #8e — AI tab removed):
   - **Text tab:** Textarea for chord chart input. Accepts letter names, Roman numerals, Nashville numbers (any format). Label: "Enter chord chart, lead sheet, or description".
   - **Upload tab:** Stub panel with "Coming soon" label and a brief message: "Upload MusicXML, MIDI, or iReal Pro files." No file handling for MVP — the drop zone is visual only (disabled).
   - **Image tab:** Stub panel with "Coming soon" label and a brief message: "Snap a photo of a handwritten chord chart." No image handling or OCR for MVP — visual placeholder only.

2. **Description textarea** — free-text input: "Jazz waltz, medium tempo, smoky feel, brushes on drums". On blur/Enter, calls `parseDescription()` (from T04) and auto-populates controls that are still at default values. Visual feedback: briefly highlight controls that were auto-set.

3. **STYLE CONTROLS section** — `<StyleControls />` component.

**Post-generation layout (song-level inspector):**
1. **INPUT section collapses** to a compact read-only summary: key, time signature, chord progression at a glance. "Edit Source" button expands back to full tabs.
2. **STYLE CONTROLS** remain fully interactive — these are the song-level defaults that cascade to sections and blocks.
3. **"Regenerate Song" button** at the bottom.

**src/components/left-panel/StyleControls.tsx** — Genre, sub-style, and parameter sliders:

- **Genre dropdown:** All genres from `GENRE_SUBSTYLES`. On change: repopulate sub-style dropdown with genre-appropriate options (Shakedown #8b), reset sub-style to first option, show/hide sliders based on `GENRE_SLIDERS` (Shakedown #8c).
- **Sub-style dropdown:** Populated reactively from genre selection.
- **Energy slider:** 0-100. Label: "Energy". Shows numeric value.
- **Groove slider:** 0-100. Label: "Groove".
- **Swing % slider:** 50-80. Label: "Swing %". **Hidden** when genre doesn't support it (Rock, Pop per `GENRE_SLIDERS`). Smooth collapse/expand transition on show/hide.
- **Dynamics slider:** 0-100. Label: "Dynamics".

At the song level, all sliders show at full opacity (they are the source of truth). At section/block level (T21), inherited values show dimmer.

**src/components/left-panel/AiAssistant.tsx** — AI chat panel:

- **Always active** (Shakedown #8f — enabled both pre and post-generation).
- **Pre-generation:** Scope badge shows "Setup". Placeholder prompt: "Try: 'Give me a jazz standard in Bb' or 'Something like Kind of Blue'". AI can read/write any control.
- **Post-generation:** Scope badge shows context-dependent label: "Song" (song level), "Verse 2" (section level), "Bass bar 7" (block level).
- **Chat history:** Persistent globally across context switches. Each message carries a scope badge. Scrollable list of messages. Newest at bottom.
- **Input:** Text input + send button at the bottom.
- **MVP AI responses:** For MVP, the AI assistant is a placeholder that echoes back the message with a "Coming soon" note. The API integration is post-MVP. The UI and chat storage (via `ai_chat_messages` table) should be fully functional.

**Reactive data flow (Shakedown #8 complete):**
- Description textarea blur → parse → auto-populate unset controls
- Genre change → sub-style repopulate + slider show/hide
- All control changes → `projectStore.updateProject()` + `uiStore.markDirty()`

### Acceptance Criteria

1. Left panel renders `SongContext` when no selection is active.
2. Breadcrumb shows "Song" when at song level.
3. Genre dropdown change repopulates sub-style dropdown with correct options.
4. Swing % slider hides for Rock and Pop genres, shows for Jazz.
5. Description textarea parsing auto-populates genre/energy controls.
6. AI Assistant is enabled pre-generation with "Setup" scope badge.
7. Post-generation: INPUT collapses to read-only summary with "Edit Source" button.

### Constraints

- Must: Use `GENRE_SUBSTYLES` and `GENRE_SLIDERS` from T04 genre-config.
- Must: Use `parseDescription()` from T04 description-parser.
- Must: All control changes update the project store and mark dirty.
- Must: AI chat messages are stored via the project store (for persistence to Supabase).
- Must not: Implement actual AI/LLM responses — placeholder echo is fine for MVP.
- Must not: Show section-level or block-level inspector content (that's T21).

### Verification

```bash
# Manual test:
# - Change genre to Rock → Swing % slider disappears
# - Type "jazz waltz medium" in description → genre=Jazz, time=3/4, energy=50 auto-set
# - Post-gen: INPUT collapses, "Edit Source" re-expands
# - AI chat shows scope badge and persists messages
```

---

## T16: Arrangement View + Empty State

**Layer:** 5  |  **Depends on:** T09  |  **Size:** S
**Creates:** `src/components/arrangement/ArrangementView.tsx`, `src/components/arrangement/EmptyState.tsx`

### What to Build

The main arrangement area container with pre/post-generation state handling.

**src/components/arrangement/ArrangementView.tsx** — Container component:

Reads `uiStore.generationState`:
- If `'idle'` (pre-generation): render `<EmptyState />` only. Hide toolbar, sections, lanes, chord lane, transport, mixer.
- If `'complete'` (post-generation): render the full arrangement stack:
  ```
  ArrangementToolbar (T22)
  SectionHeaders (T17)
  BarRuler (T17)
  StemLanes container (T18)
  ChordLane (T18)
  ```

The arrangement view wraps the scrollable content area. The outer container handles:
- Horizontal scroll (for zoom levels beyond fit-all).
- Synchronized scrolling between section headers, bar ruler, stem lanes, and chord lane.
- Lane gutter (instrument labels) is `position: sticky; left: 0` during horizontal scroll.

**Transition animation (Shakedown #10a):** When generation completes, elements animate in: toolbar slides down, lanes fade in staggered (drums first, then bass, piano, guitar, strings), transport slides up. Use CSS transitions with staggered delays.

**src/components/arrangement/EmptyState.tsx** — Pre-generation placeholder:

Centered in the arrangement area. Content:
```
         ♪
  No arrangement yet

  Enter your chord chart or description on the
  left, set your style preferences, then hit
  GENERATE to create your arrangement.

  [1] Input chords → [2] Set style → [3] Generate
```

Clean, centered, DaisyUI wireframe theme. No disabled chrome — just the message.

### Acceptance Criteria

1. Pre-generation: only EmptyState visible. No toolbar, no transport, no mixer.
2. Post-generation: arrangement stack visible. EmptyState hidden.
3. Transition animation plays when switching from idle to complete.
4. Scrollable container correctly handles horizontal scroll syncing.
5. EmptyState renders centered with clear instructions.

### Constraints

- Must: Render placeholders for child components (T17, T18) until they're built.
- Must: Transition animation uses CSS only (no JS animation libraries).
- Must not: Show any disabled/grayed arrangement chrome pre-generation — hide it entirely.

### Verification

```bash
# Manual test: verify empty state, trigger generation, verify transition animation
```

---

## T17: Section Headers + Bar Ruler

**Layer:** 6  |  **Depends on:** T16, T05, T07  |  **Size:** M
**Creates:** `src/components/arrangement/SectionHeaders.tsx`, `src/components/arrangement/BarRuler.tsx`

### What to Build

**src/components/arrangement/SectionHeaders.tsx** — Clickable section header row (Shakedown #10b):

Renders one header per section, proportionally sized by bar count.

**Section header sizing:**
- Height: 44px.
- Width: proportional to bar count (flex basis = barCount). Minimum width: 60px.
- Content: section name at 11px bold, bar count at 9px below.

**Selection states:**
- Unselected: `bg-base-200 border border-base-300 text-base-content/50`
- Hovered: `border-base-content/30`
- Selected: `bg-neutral/20 border-2 border-base-content text-base-content font-bold`. Column highlight overlay on all bars in that section: `bg-base-content/5`.
- Currently playing: section containing playhead gets subtle pulsing border.

**Click behavior:** Left-click → `selectionStore.selectSection(sectionId)`. Left panel switches to section context.

**Context menu (right-click):**
- Rename...
- Set bar count...
- separator
- Insert before
- Insert after
- Duplicate
- separator
- Merge with next →
- Delete

**"+" button:** At the end of the section row. Click → mini form (section name + bar count). Default: "New Section", 4 bars.

**Drag to reorder:** Sections are draggable (HTML5 drag-and-drop or a simple drag library). Reordering updates `section.sort_order` and recalculates `start_bar` for all sections.

**src/components/arrangement/BarRuler.tsx** — Bar number ruler (Shakedown #10c):

- Height: 20px. Below section headers, above first stem lane.
- One number per bar, centered in bar width. Font: 9px monospace, `text-base-content/40`.
- Bar boundaries: thin vertical lines (1px, `base-content/10`) extending visually through all lanes.
- Section boundaries: slightly thicker (2px, `base-content/20`).
- Clickable: clicking a bar number positions the playhead at that bar.
- Gutter spacer: 80px (matches stem lane gutter).

### Acceptance Criteria

1. Section headers render with correct proportional widths based on bar count.
2. Clicking a section header selects it and applies the selected visual state.
3. Selected section shows column highlight overlay across all lanes below.
4. Right-click opens context menu with all specified options.
5. Bar ruler shows correct bar numbers aligned with the grid.
6. Clicking a bar number positions the playhead.

### Constraints

- Must: Section header gutter width (80px) matches stem lane and chord lane gutters.
- Must: Horizontal scroll syncs with stem lanes and chord lane.
- Must: Section operations (add, remove, reorder) push undo entries.
- Must not: Allow deleting the last section (minimum 1 section).

### Verification

```bash
# Manual test: click sections, verify selection, right-click context menu, add section via +
```

---

## T18: Stem Lanes + Blocks + Chord Lane

**Layer:** 6  |  **Depends on:** T16, T05, T07  |  **Size:** L
**Creates:** `src/components/arrangement/StemLane.tsx`, `src/components/arrangement/Block.tsx`, `src/components/arrangement/ChordLane.tsx`

### What to Build

The core arrangement editing surface — the bar-level block sequencer (Shakedown #1).

**src/components/arrangement/StemLane.tsx** — Single stem lane (Shakedown #10d):

**Dynamic lane height:** Lanes use `flex-1` to fill available vertical space. With 5 stems: ~90px per lane (on a typical 900px viewport). Minimum height: 36px. If too many stems, container scrolls vertically.

**Lane gutter (80px, sticky-left):**
- Instrument name: `DRUMS`, `BASS`, `PIANO`, `GTR`, `STRS` (abbreviated).
- Solo/Mute buttons: `btn-xs` (20x20px tap targets). Solo active = accent fill. Mute active = lane dims to 50% opacity.
- `position: sticky; left: 0; z-index: 2` so gutter stays visible during horizontal scroll.

**Lane content:** Horizontal strip of `<Block />` components for this stem, flex-proportional to bar count.

**src/components/arrangement/Block.tsx** — Single bar-block (Shakedown #1, #10g):

The fundamental editing unit. A block spans 1 or more contiguous bars within a section.

**Block sizing:** Width proportional to bar span (flex basis = endBar - startBar + 1).

**Block display (two-line format for taller lanes):**
- Drums: single line with style name (e.g., "Jazz brush swing").
- Pitched instruments (bass, piano, guitar, strings): two lines:
  - Line 1: Chord name (11px bold) — formatted via `formatChord()` using current display mode.
  - Line 2: Style name (9px, lighter) — e.g., "Sparse comp", "Walking", "Fingerpick arpeggios".
- Narrow blocks (1-2 bars at default zoom): truncate with ellipsis. Hover tooltip shows full info.

**Block visual states:**
- Default: `bg-primary/20 rounded border border-primary/30`.
- Hovered: `border-primary/50`.
- Selected: `border-2 border-base-content ring-2 ring-primary/30`.
- Different colors per instrument (subtle): drums=neutral, bass=info, piano=primary, guitar=secondary, strings=accent.

**Click behavior (Select mode):** Left-click → `selectionStore.selectBlock(blockId, stemId)`. Left panel switches to block inspector.

**Click behavior (Split mode, Shakedown #10g):** Left-click → split block at nearest bar boundary to click position. Cursor: crosshair. Vertical guide line follows mouse, snapping to bar boundaries.

**Right-click context menu:**
- Split at bar N (only if multi-bar block)
- Merge with next → (only if not last in lane)
- separator
- Duplicate
- Delete
- separator
- Copy style
- Paste style (grayed if clipboard empty)

**Inline popovers removed:** No popovers. All editing goes through the left panel inspector (Shakedown #10g).

**src/components/arrangement/ChordLane.tsx** — Chord display row (Shakedown #10e):

**Chord data sources:** There are two chord stores — the master `chords[]` array (one chord per bar, shared across all stems, displayed in ChordLane) and the inline `block.chordDegree`/`block.chordQuality` fields (used for per-block display within stem lanes). At generation time, T08 populates both from the same source. Post-generation, editing a chord in ChordLane updates the master `chords[]` array; editing a chord in the block inspector (T21) updates the block's inline chord. These are intentionally independent — the master chord lane is the harmonic reference, while block chords can diverge (e.g., a bass pedal tone on a different root).

- One cell per bar, aligned with the unified bar grid.
- Gutter: `CHORDS` at 80px width.
- Cell height: 24px. Font: 10px bold.
- Repeat chords: if bar N has same chord as bar N-1, show `%` (repeat sign).
- Hover tooltip: "Bar 13: Cmaj7 (Imaj7)" showing both notations.
- Click: selects that bar at song level.
- Background: `bg-base-200` — recessed, reads as reference lane.
- Chords formatted via `formatChord()` respecting `uiStore.chordDisplayMode`.

**Unified bar grid (Shakedown #10h):**
- Vertical grid lines at every bar boundary (1px, `base-content/8`).
- Section boundaries: 2px, `base-content/15`.
- Grid spans from bar ruler through all stem lanes and chord lane.

**Playhead (Shakedown #10h):**
- Full-height vertical line from section headers to chord lane.
- Color: primary theme color (`oklch(var(--p))`) or red/orange accent.
- Width: 2px.
- Position calculated from current bar × bar width.
- During playback: auto-scroll to keep playhead visible (centered or 1/3 from left).

### Acceptance Criteria

1. Stem lanes dynamically fill available vertical space with flex-1.
2. Blocks render with correct proportional widths based on bar span.
3. Block labels show chord + style for pitched instruments, style only for drums.
4. Click block in select mode → selects it, left panel shows block inspector context.
5. Click block in split mode → splits at nearest bar boundary.
6. Chord lane shows one chord per bar with `%` for repeats.
7. Chord display respects the current display mode (letter vs Roman).
8. Playhead renders and moves during playback.
9. Grid lines align across all lanes.

### Constraints

- Must: Use `formatChord()` from T04 for all chord display.
- Must: Block split/merge/delete operations go through project store and push undo entries.
- Must: Lane gutter is sticky-left during horizontal scroll.
- Must: Playhead auto-scrolls during playback to stay visible.
- Must not: Implement inline popovers — all editing is in the left panel.
- Must not: Allow blocks to overlap or leave gaps within a section.

### Verification

```bash
# Manual test with a generated arrangement:
# - Verify block labels show correctly
# - Click block → left panel changes to block context
# - Split mode → click to split → verify two blocks created
# - Right-click → context menu appears
# - Toggle chord display → chord lane and block labels update
```

---

## T19: Transport Bar

**Layer:** 6  |  **Depends on:** T16, T05, T07  |  **Size:** M
**Creates:** `src/components/transport/TransportBar.tsx`, `src/components/transport/Scrubber.tsx`

### What to Build

Transport controls for playback (Shakedown #10i). Hidden pre-generation, visible post-generation.

**Transport layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⏮ ⏪ [▶ PLAY] ⏩ ⏭   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬   Bar 23 │ 1:47 / 3:52      │
│                   Loop [Chorus▾]  Vol ▬▬▬  [Click] [Count: 1 bar▾]    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Transport controls:**
- **Play/Pause button:** Toggle. Shows ▶ when stopped/paused, ‖ when playing. Keyboard: Space.
- **Skip buttons:** ⏮ go to start, ⏭ go to end, ⏪ previous section, ⏩ next section.
- **Scrubber:** Horizontal slider showing playback position. Click to seek. Drag to scrub. Width: fills available space.

**Bar position display (Shakedown #10i):**
- `Bar 23 | 1:47 / 3:52` — bar number first (musicians think in bars), then elapsed/total time.
- Bar number: `font-mono font-bold`.
- Time: `font-mono text-base-content/50`.
- Updates in real-time during playback.

**Loop controls:**
- Loop toggle button.
- Loop section selector: dropdown of section names. When loop is enabled, playback loops within the selected section.

**Master volume:** Horizontal slider controlling `audioEngine.setMasterVolume()`.

**Metronome / Click track (Shakedown #10i):**
- Toggle button: "Click". On/off.
- When enabled: click sound on every beat during playback.
- Default: OFF.

**Count-in selector (Shakedown #10i):**
- Dropdown: Off | 1 bar | 2 bars.
- When enabled: pressing Play starts count-in clicks before music begins.
- During count-in: bar display shows "Count-in..." instead of bar number.
- Default: 1 bar.

**src/components/transport/Scrubber.tsx:**
- Horizontal range input.
- Value: 0 to totalSeconds.
- Shows current position as a filled bar.
- Clicking anywhere on the scrubber seeks to that position.
- Dragging allows scrubbing.

### Acceptance Criteria

1. Play/Pause toggles playback via audio engine.
2. Scrubber reflects current playback position and allows seeking.
3. Bar display shows correct bar number during playback.
4. Metronome click is audible on every beat when enabled.
5. Count-in plays correct number of bars before music starts.
6. Loop plays within the selected section boundaries.
7. Space bar toggles play/pause.

### Constraints

- Must: Use the audio engine from T07 for all playback control.
- Must: Bar display updates in real-time (requestAnimationFrame or Tone.js callback).
- Must: Transport is hidden pre-generation.
- Must not: Implement recording functionality.

### Verification

```bash
# Manual test: play, pause, seek, enable click, enable count-in, test loop
```

---

## T20: Mixer Drawer

**Layer:** 6  |  **Depends on:** T16, T05, T07  |  **Size:** M
**Creates:** `src/components/mixer/MixerDrawer.tsx`, `src/components/mixer/ChannelStrip.tsx`, `src/components/mixer/MasterStrip.tsx`

### What to Build

Collapsible mixer drawer (Shakedown #10j, resolves #2 and #5). Hidden pre-generation.

**MixerDrawer.tsx — Two states:**

**Collapsed (default, 36px):**
```
┌────────────────────────────────────────────────────────────────────┐
│ [▲ Mixer]  DRUMS ▊▊▊  BASS ▊▊▊▊  PIANO ▊▊▊▊  GTR ▊▊  STR ▊▊  │ MASTER ▊▊▊▊ │
└────────────────────────────────────────────────────────────────────┘
```
- Single row: channel names + mini horizontal level bars (20px wide, indicating relative volume).
- Click channel name: toggle mute. Double-click: toggle solo.
- `[▲ Mixer]` button toggles expansion.

**Expanded (~220px):**
- Full vertical faders with **minimum 150px travel** (resolves Shakedown #2).
- Solo/Mute buttons: `btn-sm` (28x28px, resolves Shakedown #5). Solo active = `btn-accent` fill. Mute active = channel strip dims to 50% opacity.
- Pan control: horizontal range slider, 40px wide.
- dB display below each fader.
- `[▼ Mixer]` button to collapse.

**Toggle:** Click header button OR press `M` key. Smooth slide transition (200ms ease-out).

**When mixer expands, arrangement area shrinks** (both are in the same flex column, arrangement has flex-1).

**ChannelStrip.tsx — Per-stem strip:**
- Vertical fader (range input rotated 90°, 150px+ height).
- Instrument name label.
- S/M buttons.
- Pan slider.
- dB value display.
- Reads from `projectStore.stems[i]`, writes via `projectStore.updateStem()` and `audioEngine.setVolume/setPan/setMute/setSolo()`.

**MasterStrip.tsx — Master channel:**
- Separated by vertical divider, slightly wider (80px).
- Master volume fader.
- dB display.
- Writes via `audioEngine.setMasterVolume()`.

**Mixer footer (always visible):**
```
[+ Add Stem]  Drag to reorder
```
- `+ Add Stem`: dropdown of instruments not yet in arrangement.
- No export buttons (export lives exclusively in top bar per Shakedown #9l).

### Acceptance Criteria

1. Collapsed mixer shows compact channel overview in 36px.
2. Expanded mixer shows full faders with 150px+ travel.
3. S/M buttons are btn-sm (28x28px) in expanded mode.
4. Volume/pan/mute/solo changes immediately affect audio output.
5. `M` key toggles mixer expanded/collapsed.
6. Mixer expansion/collapse smoothly transitions.
7. When mixer expands, stem lanes shrink proportionally.

### Constraints

- Must: Fader travel >= 150px in expanded mode.
- Must: S/M buttons >= 28x28px in expanded mode.
- Must: Mixer is hidden pre-generation.
- Must: Stem order in mixer matches stem lane order in arrangement.
- Must not: Include export buttons in mixer (export is in top bar only).

### Verification

```bash
# Manual test: expand mixer, adjust faders, solo/mute stems, verify audio changes
```

---

## T21: Left Panel — Section + Block Context

**Layer:** 7  |  **Depends on:** Layer 6  |  **Size:** L
**Creates:** `src/components/left-panel/SectionContext.tsx`, `src/components/left-panel/BlockContext.tsx`

### What to Build

The left panel inspector for section and block selection levels (Shakedown #6 — the two non-song context levels).

**src/components/left-panel/SectionContext.tsx** — Section-level inspector:

Rendered when `selectionStore.level === 'section'`.

**Breadcrumb:** `Song > {Section Name}` — clicking "Song" returns to song context.

**Section properties:**
- Section name: editable text input.
- Bar count: number input (changing this resizes the section and shifts subsequent sections).
- Repeat count: number input (future, placeholder for MVP).

**Section-level STYLE CONTROLS (Shakedown #6):**
Same sliders as song level (Energy, Groove, Swing %, Dynamics), but scoped to this section. Each slider shows the **resolved value** using the style cascade:
- If the section has an override (`section.energyOverride !== null`): show the override value, **bold/highlighted** text, full opacity.
- If inherited from project (`section.energyOverride === null`): show the project value, **dimmer** text (opacity 50%), with a subtle "(inherited)" label.
- Each slider has a "Reset" button/icon that clears the override (sets it to null), reverting to inherited.

Use `resolveStyle()` from T04 to compute the displayed value and its source.

**AI ASSISTANT** scope badge shows the section name (e.g., "Verse 2"). Commands target this section.

**"Regenerate {Section Name}" button** at the bottom.

**src/components/left-panel/BlockContext.tsx** — Block-level inspector:

Rendered when `selectionStore.level === 'block'`.

**Breadcrumb:** `Song > {Section Name} > {Instrument} bar {N}` (or `bars {N}-{M}` for multi-bar blocks).

**Instrument-specific properties (Shakedown #1, #6):**

The block inspector shows different fields depending on the instrument type of the selected block's stem:

- **Drums:** Pattern/style dropdown with genre-appropriate options (e.g., "Jazz brush swing", "Funk pocket", "Half-time feel", "Rock straight"). No chord field.
- **Bass:** Note field (resolved chord root or explicit override) + playing style dropdown (e.g., "Walking", "Pedal tone", "Slap", "Fingerstyle").
- **Piano:** Chord field (editable, parsed via `parseChordInput()`) + voicing/comping style dropdown (e.g., "Jazz comp", "Block chords", "Stride", "Arpeggiated").
- **Guitar:** Chord field + strumming/picking style dropdown (e.g., "Fingerpick arpeggios", "Rhythm strum", "Muted funk", "Power chords").
- **Strings:** Chord field + texture style dropdown (e.g., "Sustained pad", "Tremolo", "Pizzicato", "Arco melody").

**Chord input (Shakedown #7):** The chord field accepts both letter names and Roman numerals. `parseChordInput()` resolves the input to the internal Roman numeral representation. Display respects `uiStore.chordDisplayMode`.

**Block-level style overrides (Shakedown #6):**
Same cascade pattern as section level. Energy and Dynamics sliders with inherited/overridden visual treatment. Block overrides trump section overrides which trump project defaults.

Use `resolveStyle()` with all three levels (project, section, block) to show the resolved value and its source.

**Override semantics (MVP):** Style overrides at section and block level are cosmetic metadata only — they do NOT trigger MIDI re-generation. The MIDI data in `block.midiData` stays as-is from the initial generation. Overrides are stored so a future AI re-generation can respect them, but for MVP they only affect the cascade display and are persisted for future use.

**AI ASSISTANT** scope badge shows e.g., "Bass bar 7". Commands target this specific block.

**"Regenerate Bar {N}" button** at the bottom.

### Acceptance Criteria

1. Selecting a section header shows SectionContext in the left panel.
2. Section name and bar count are editable.
3. Section sliders show inherited values dimmer and overridden values bold.
4. "Reset" on a section slider clears the override and value reverts to project default.
5. Selecting a block shows BlockContext with instrument-specific fields.
6. Drums block shows style dropdown only (no chord field).
7. Piano/Guitar blocks show chord field + style dropdown.
8. Chord input field accepts both letter names and Roman numerals.
9. Block sliders show correct cascade resolution (project → section → block).

### Constraints

- Must: Use `resolveStyle()` and `isInherited()` from T04 for cascade display.
- Must: Use `parseChordInput()` and `formatChord()` from T04 for chord editing.
- Must: Block style dropdowns show instrument-appropriate options matching ARCHITECTURE.md style values.
- Must: All property changes push undo entries.
- Must not: Show controls for properties that don't apply (no chord field for drums, no swing for genres that hide it).

### Verification

```bash
# Manual test:
# - Click section header → section inspector shows
# - Override energy slider → value shows bold, "Reset" appears
# - Reset → value goes back to project default (dimmer)
# - Click drum block → style dropdown, no chord field
# - Click piano block → chord field + style dropdown
# - Type "Dm7" in chord field (key of C) → stores as ii/min7
```

---

## T22: Toolbar + Zoom + Keyboard Shortcuts

**Layer:** 7  |  **Depends on:** Layer 6  |  **Size:** M
**Creates:** `src/components/arrangement/ArrangementToolbar.tsx`, `src/hooks/useKeyboardShortcuts.ts`

### What to Build

**src/components/arrangement/ArrangementToolbar.tsx** — Arrangement toolbar (Shakedown #10k):

Hidden pre-generation. Post-generation layout:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ARRANGEMENT                          [Select|Split]  [− + ⊞]  36 bars  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tool modes:**
- `Select` (default): cursor: `default`. Active state: `btn-neutral` (solid fill).
- `Split`: cursor: `crosshair`. A vertical guide line follows mouse on stem lanes, snapping to bar boundaries.
- Keyboard toggle: `V` = select, `S` = split.
- Reads/writes `uiStore.toolMode`.

**Zoom controls:**
- `[-]` zoom out, `[+]` zoom in, `[⊞]` fit-all (or text "Fit").
- Reads/writes `uiStore.zoomIndex` via `uiStore.zoomIn/zoomOut/zoomFitAll`.
- Zoom steps: `[1, 1.3, 1.7, 2.2, 3, 4]` from `ZOOM_STEPS`.
- Zoom anchoring: keep viewport center (or playhead if playing) stable when zooming.
- Bar width = fitAllWidth × ZOOM_STEPS[zoomIndex]. At zoom > 1x, arrangement scrolls horizontally.

**Bar count display:** Read-only `"{N} bars"` showing total bar count from project store.

**src/hooks/useKeyboardShortcuts.ts** — Global keyboard shortcut handler:

Register all keyboard shortcuts from Shakedown #10g and #9. This hook attaches a `keydown` listener to `document` and routes shortcuts to the appropriate store actions.

**Complete shortcut table:**

| Shortcut | Action | Handler |
|----------|--------|---------|
| `Space` | Play / Pause | `audioEngine.play()` / `audioEngine.pause()` |
| `Escape` | Deselect → song context | `selectionStore.clearSelection()` |
| `Delete` / `Backspace` | Delete selected block | `projectStore.deleteBlock(selectedBlockId)` |
| `D` | Duplicate selected block | `projectStore.duplicateBlock(selectedBlockId)` |
| `V` | Select mode | `uiStore.setToolMode('select')` |
| `S` | Split mode | `uiStore.setToolMode('split')` |
| `M` | Toggle mixer | `uiStore.toggleMixer()` |
| `←` / `→` | Select prev/next block in lane | `selectionStore.selectPrevBlock()` / `.selectNextBlock()` |
| `↑` / `↓` | Select block in adjacent lane | `selectionStore.selectBlockAbove()` / `.selectBlockBelow()` |
| `Tab` / `Shift+Tab` | Navigate blocks sequentially | Next/prev block across lanes |
| `Cmd+=` / `Cmd+-` | Zoom in / out | `uiStore.zoomIn()` / `.zoomOut()` |
| `Cmd+0` | Fit all | `uiStore.zoomFitAll()` |
| `Cmd+Z` | Undo | `undoStore.undo()` |
| `Cmd+Shift+Z` | Redo | `undoStore.redo()` |
| `Cmd+S` | Save | `projectHook.saveProject()` |
| `Cmd+Enter` | Generate / Regenerate | Trigger generation (with confirm if post-gen) |
| `Cmd+K` | Keyboard shortcuts modal | Show modal (11f) |
| `Cmd+?` / `Cmd+/` | Help shortcuts modal | Same as Cmd+K for MVP |

**Important:** Intercept browser defaults for `Cmd+S` (save), `Cmd+=`/`-` (zoom), `Cmd+K`, `Cmd+Z`. Use `e.preventDefault()`.

**Context guards:** Keyboard shortcuts like `D`, `S`, `V` should NOT fire when a text input is focused (user might be typing). Check `e.target` is not an input/textarea/select before handling single-key shortcuts.

### Acceptance Criteria

1. Toolbar renders with Select/Split toggle, zoom controls, and bar count.
2. Active tool mode is visually indicated (solid fill vs ghost).
3. Zoom in/out changes the arrangement bar width correctly.
4. Fit-all resets zoom to show all bars in viewport.
5. All keyboard shortcuts from the table work correctly.
6. `Cmd+S` saves (intercepts browser), `Cmd+Z` undoes, `Space` plays/pauses.
7. Single-key shortcuts (`D`, `S`, `V`, `M`) don't fire when typing in inputs.

### Constraints

- Must: Register shortcuts at the document level (not per-component).
- Must: Prevent browser default for overridden shortcuts.
- Must: Check for input focus before handling single-key shortcuts.
- Must: Toolbar is hidden pre-generation.
- Must not: Add shortcuts not in the table (keep it minimal for MVP).

### Verification

```bash
# Manual test: press each shortcut, verify correct action
# Test in an input field: pressing 'D' should type 'd', not duplicate a block
```

---

## T23: Generation Flow + Undo/Redo + Confirm Dialogs

**Layer:** 8  |  **Depends on:** all  |  **Size:** L
**Creates:** `src/components/shared/ConfirmDialog.tsx`, `src/components/shared/ScopeBadge.tsx`, integration wiring

### What to Build

The integration layer that wires all components together for the core user workflows. This task creates shared components and ensures end-to-end flows work correctly.

**src/components/shared/ConfirmDialog.tsx** — Reusable confirmation dialog:

A DaisyUI modal dialog used for destructive actions throughout the app.

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;         // Markdown or plain text body
  confirmLabel: string;    // e.g., "Transpose", "Regenerate", "Delete"
  cancelLabel?: string;    // default "Cancel"
  variant?: 'danger' | 'warning' | 'info';  // affects confirm button color
  onConfirm: () => void;
  onCancel: () => void;
}
```

Used for all confirmation dialogs specified in the shakedown:
- Key transpose (Shakedown #9g): "Transpose arrangement?"
- Time sig change (Shakedown #9j): "Change time signature?"
- Regenerate (Shakedown #9k): "Regenerate arrangement?"
- Leave project (Shakedown #11a): "Leave project? You have unsaved changes."
- Delete section (from #10b context menu)
- Delete block (from #10g context menu)

**src/components/shared/ScopeBadge.tsx** — Context scope indicator:

Small badge showing the current AI chat scope: "Setup", "Song", "Verse 2", "Bass bar 7".

```tsx
interface ScopeBadgeProps {
  scope: 'setup' | 'song' | 'section' | 'block';
  target?: string;  // section name or "Bass bar 7"
}
```

Renders as a DaisyUI `badge badge-sm`. Color varies by scope level.

**Generation flow wiring:**

Wire the complete generation flow from GENERATE button click to arrangement populated:

1. **Pre-gen validation:** Check chord chart or description is non-empty.
2. **Build request:** Collect all state from project store into a `GenerationRequest`. Hardcode `stems: ['drums', 'bass', 'piano', 'guitar', 'strings']` (all 5 instruments, always). Parse chords via `parseChordChart(project.chordChartRaw, project.key)` from T26.
3. **Set UI state:** `uiStore.setGenerationState('generating')`, `uiStore.setSystemStatus('generating')`.
4. **Call generation:** Send request to Supabase Edge Function (T08). For local dev, can call `midi-generator.ts` directly.
5. **Receive response:** Parse `GenerationResponse`.
6. **Map response to store entities:** The generator returns sections/stems/blocks by name (not UUID). The wiring must:
   - Generate `crypto.randomUUID()` for each new section, stem, block, and chord.
   - Map `BlockData.stem_instrument` → find the newly-created stem by instrument to get its UUID → set `block.stemId`.
   - Map `BlockData.section_name` → find the newly-created section by name to get its UUID → set `block.sectionId`.
   - Set `block.projectId`, `stem.projectId`, `section.projectId` from the current project.
7. **Populate stores:** `projectStore.setArrangement()` with the UUID-assigned sections, stems, blocks, chords. `projectStore.updateProject({ hasArrangement: true, generatedAt: now, generatedTempo: tempo })`.
8. **Transition UI:** `uiStore.setGenerationState('complete')`. Arrangement view switches from empty state to populated (T16 transition animation).
9. **Save:** Call `useProject().saveArrangement()` (T06) to persist the newly-created arrangement entities to Supabase. This is distinct from `saveProject()` — `saveArrangement()` bulk-inserts the new stems/sections/blocks/chords, while `saveProject()` upserts the project row and any changed entities during editing.

**Regeneration flow:**
1. Show confirm dialog (Shakedown #9k).
2. On confirm: snapshot current state for undo (`undoStore.pushUndo('Full regeneration', snapshot, null)`).
3. Run generation flow.
4. After generation: fill in the `stateAfter` in the undo entry.

**Undo/redo integration:**

Wire the undo store to actually restore project state:
- `undo()` returns an entry → deserialize `stateBefore` → call `projectStore.setProject()` + `projectStore.setArrangement()` with restored state.
- `redo()` returns an entry → deserialize `stateAfter` → restore.

Every mutation that should be undoable must: snapshot state before, perform mutation, snapshot state after, push to undo stack. This applies to:
- Block split, merge, duplicate, delete
- Block style/chord changes
- Section add, remove, reorder, rename
- Section/block style override changes
- Key transposition
- Full regeneration

**Auto-save integration:**
Wire the 60-second auto-save timer (Shakedown #9b). On any `markDirty()`, start/reset a 60s timer. On timer fire, save and update status bar. Manual save (Cmd+S) clears the timer.

**Save-guard navigation:**
Wire the logo click and library link (Shakedown #11a) to check `uiStore.unsavedChanges` and show the leave confirmation dialog before navigating away.

### Acceptance Criteria

1. Clicking GENERATE with valid input produces a full arrangement visible in all lanes.
2. Clicking REGENERATE shows confirmation dialog. On confirm, arrangement is replaced.
3. After regeneration, Cmd+Z restores the previous arrangement.
4. Key change post-gen shows transpose dialog. On confirm, chord displays update.
5. Time sig change post-gen shows regen dialog. On confirm, full regeneration occurs.
6. ConfirmDialog component renders correctly with all variants (danger, warning, info).
7. ScopeBadge shows correct label for each context level.
8. Auto-save fires after 60s of inactivity with unsaved changes.
9. Navigating away with unsaved changes shows leave confirmation.

### Constraints

- Must: All destructive actions use ConfirmDialog (no browser `confirm()`).
- Must: Undo snapshots capture the full project + arrangement state.
- Must: Generation flow handles errors gracefully (set system status to 'error', show message).
- Must: Auto-save does not interfere with manual save.
- Must not: Allow generation while already generating (button is disabled).
- Must not: Allow undo during generation.

### Verification

```bash
# End-to-end manual test:
# 1. Enter chord chart, set genre, click GENERATE → arrangement appears
# 2. Split a block → Cmd+Z → block is restored
# 3. Click REGENERATE → confirm → new arrangement → Cmd+Z → previous arrangement restored
# 4. Change key post-gen → confirm transpose → chords update → Cmd+Z → key reverts
# 5. Navigate to library with unsaved changes → leave dialog appears
```

---

## T24: Design System + Custom DaisyUI Theme

**Layer:** 1  |  **Depends on:** T01  |  **Size:** M
**Creates:** Modifies `tailwind.config.ts`, modifies `src/styles/globals.css`

### What to Build

Define a premium dark theme for Arrangement Forge, inspired by the reference dashboard at `uploads/dashboard-screenshot.png`. The goal is NOT to copy the dashboard — it's to internalize the designer's sensibility (depth, contrast, accent economy, spacing, typography hierarchy) and apply it to a music production app.

**Study the reference image and extract these design principles:**
- **Depth system:** Multiple dark surface levels (deep bg → card → elevated element)
- **Accent economy:** High-saturation colors (green/teal, orange/amber) used sparingly for maximum impact against dark surfaces
- **Contrast hierarchy:** Most text is muted gray, important text is white, key values use accent color
- **Rounded, generous:** Large border-radius, ample padding, breathing room between elements
- **Subtle borders:** Dark borders (barely visible) define card edges — not heavy shadows
- **Typography:** Clean sans-serif, weight variation for hierarchy (bold for values, regular for labels, light for secondary)
- **Glow effects:** Bright accent elements get subtle luminance (via shadow, ring, or opacity)

**Custom DaisyUI theme in tailwind.config.ts:**

Define a custom theme named `"forge"` with at minimum:
- `primary`: green/teal accent (for active states, primary actions, playhead, selected blocks)
- `secondary`: amber/orange accent (for secondary actions, warnings, energy indicators)
- `accent`: a third accent for special elements (AI assistant, generation progress)
- `base-100`: deepest background
- `base-200`: card/panel surfaces
- `base-300`: elevated surfaces, borders
- `base-content`: default text (muted gray)
- `neutral`: darker surfaces for contrast
- `info`, `success`, `warning`, `error`: status colors that harmonize with the dark palette
- `--rounded-box`, `--rounded-btn`: generous radius values

**Component styling patterns in globals.css:**

Add CSS custom properties and utility classes that all UI tasks reference:

- **Cards:** Dark surface, subtle border, rounded-xl, consistent padding (p-4 for compact, p-6 for spacious)
- **Sidebar/Left panel:** Slightly darker than main content area, icon+label nav items with accent highlight on active state
- **Inputs:** Dark input fields with subtle border, focus ring uses primary accent
- **Buttons:** Primary = accent fill, Secondary = ghost/outline with accent border, Danger = error fill. All with hover brightness shift.
- **Sliders/Faders:** Track uses base-300, thumb uses primary accent, value indicators glow
- **Selection states:** Selected blocks/sections get primary accent border/bg with subtle glow
- **Status indicators:** Use accent colors sparingly (green = playing/active, amber = dirty/unsaved, red = error)
- **Typography scale:** Define heading sizes, body text, labels, captions. Consistent weight usage.
- **Scrollbars:** Thin, dark, matching the theme (webkit-scrollbar customization)

**The output must be concrete** — specific hex values, specific Tailwind classes, specific DaisyUI theme tokens. Not vague guidance like "use dark colors." Agents implementing T09-T23 must be able to look up "how do I style a card?" and get an exact answer.

### Acceptance Criteria

1. `tailwind.config.ts` defines a custom `"forge"` DaisyUI theme with all color tokens.
2. `src/styles/globals.css` includes component-level styling patterns as documented CSS classes/variables.
3. Adding `data-theme="forge"` to `<html>` in index.html produces a cohesive premium dark aesthetic.
4. A test page with DaisyUI components (btn, card, input, badge, dropdown, modal) renders with the premium dark look.
5. The theme is visually cohesive — no jarring color mismatches between accent colors and dark surfaces.

### Constraints

- Must: Keep DaisyUI as the component framework — define a custom theme, don't replace DaisyUI.
- Must: Reference `uploads/dashboard-screenshot.png` for design direction.
- Must: Document every styling decision as concrete values (hex codes, Tailwind classes, spacing values).
- Must: Set `data-theme="forge"` in `index.html` (T01 creates this file; T24 modifies it).
- Must not: Add any new CSS framework or library.
- Must not: Use CSS-in-JS.
- Must not: Create component implementations — only define the theme and styling patterns.

### Verification

```bash
# Visual test: open index.html with data-theme="forge", verify dark theme applies
# Component test: add DaisyUI components (btn, card, input, badge, dropdown, modal) and verify cohesive styling
npm run dev   # verify no build errors with theme changes
```

---

## T25: Auth State Management

**Layer:** 3  |  **Depends on:** T06  |  **Size:** S
**Creates:** `src/store/auth-store.ts`, `src/hooks/useAuth.ts`

### What to Build

The auth plumbing that connects Supabase Auth to the app. Every authenticated feature depends on this.

**src/store/auth-store.ts** — Zustand store for auth state:

```typescript
interface AuthState {
  user: User | null;            // Supabase auth user
  profile: Profile | null;      // profiles table row
  isLoading: boolean;           // true during initial session check
  isAuthenticated: boolean;     // derived: user !== null

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;          // clears user + profile
}
```

**src/hooks/useAuth.ts** — Hook that initializes and manages auth:

```typescript
export function useAuth() {
  const authStore = useAuthStore();

  // Initialize: call once at app root (in App.tsx or a provider)
  const initAuth: () => () => void;  // returns cleanup/unsubscribe

  // Auth actions
  const signIn: (email: string, password: string) => Promise<void>;
  const signUp: (email: string, password: string) => Promise<void>;
  const signInWithGoogle: () => Promise<void>;
  const signOut: () => Promise<void>;
  const loadProfile: () => Promise<void>;

  return { ...authStore, initAuth, signIn, signUp, signInWithGoogle, signOut, loadProfile };
}
```

**initAuth behavior:**
1. Set `isLoading = true`.
2. Check existing session: `supabase.auth.getSession()`.
3. If session exists: set user, fetch profile from `profiles` table, set `chordDisplayMode` and `defaultGenre` in uiStore from profile, set `isLoading = false`.
4. If no session: set `isLoading = false`, user stays null.
5. Subscribe to `supabase.auth.onAuthStateChange()`: on SIGNED_IN → set user + load profile. On SIGNED_OUT → clear user + profile.
6. Return the unsubscribe function for cleanup.

**signOut behavior:**
1. Call `supabase.auth.signOut()`.
2. Clear auth store (user = null, profile = null).
3. Navigate to `/login` (via window.location or router).

**Profile hydration:** When profile loads, push settings into the UI:
- `profile.chord_display_mode` → `uiStore.setChordDisplayMode()`
- `profile.default_genre` → available for new project creation

**App.tsx integration (T09 will use this):**
```tsx
function App() {
  const { initAuth, isLoading, isAuthenticated } = useAuth();
  useEffect(() => { const unsub = initAuth(); return unsub; }, []);
  if (isLoading) return <LoadingScreen />;
  // ... routes with auth guard using isAuthenticated
}
```

### Acceptance Criteria

1. On app load with valid session, user is authenticated and profile is loaded without requiring login.
2. On app load with no session, `isAuthenticated` is false and router redirects to `/login`.
3. After signIn/signUp, auth store has user + profile, app navigates to `/library`.
4. After signOut, auth store is cleared, app navigates to `/login`.
5. `onAuthStateChange` handles token refresh and session expiry correctly.
6. Profile settings (chord display mode, default genre) are hydrated into uiStore on login.

### Constraints

- Must: Use Zustand for auth state (consistent with app-wide state management pattern).
- Must: Handle the loading state (don't flash login page on refresh when session exists).
- Must: Use `supabase.auth` methods exclusively — no custom token management.
- Must not: Store session tokens manually — Supabase client handles storage.
- Must not: Create a React Context provider — use Zustand store (accessed via hook).

### Verification

```bash
npx vitest run src/store/auth-store.test.ts   # store unit tests
# Manual test: sign in, refresh page (session persists), sign out (redirected to login)
```

---

## T26: Chord Chart Parser

**Layer:** 2  |  **Depends on:** T04  |  **Size:** S
**Creates:** `src/lib/chord-chart-parser.ts`

### What to Build

A pure utility that parses a raw chord chart text string into a `ChordEntry[]` array. This bridges the text input (T15) to the generation request (T23/T08).

```typescript
interface ChordChartParseResult {
  chords: ChordEntry[];
  warnings: string[];    // e.g., "Bar 3: could not parse 'xyz', treated as N.C."
}

export function parseChordChart(raw: string, key: string): ChordChartParseResult { ... }
```

**Input formats to handle:**

1. **Pipe-separated:** `Cmaj7 | Dm7 | G7 | Cmaj7` — one chord per bar
2. **Space-separated:** `C G Am F` — one chord per bar
3. **Line-per-section:** Lines separated by newlines, bars within a line space or pipe-separated
4. **Roman numerals:** `I | ii | V | I` — parsed via `parseChordInput()` from T04
5. **Mixed:** `Dm7 G7 | Cmaj7` — pipe groups bars, spaces separate chords within implicit bars
6. **Repeat markers:** `%` or `/` means "same as previous bar"
7. **No Chord:** `N.C.` or `NC` or `-` — maps to `{ degree: null, quality: null, bassDegree: null }`
8. **Slash chords:** `C/E` or `I/iii` — handled by `parseChordInput()`

**Parsing algorithm:**
1. Normalize: trim, collapse whitespace, normalize pipe characters.
2. Split into bars: pipes are definitive bar separators. If no pipes, each whitespace-separated token is one bar.
3. For each bar token: call `parseChordInput(token.trim(), key)` from T04.
4. Handle repeat markers by copying the previous bar's chord.
5. Return the array of `ChordEntry` objects, one per bar.

**Error handling:**
- Unparseable tokens: skip and insert `{ degree: null, quality: null, bassDegree: null }` (N.C.) for that bar.
- Empty input: return empty array.
- Return a companion diagnostics object: `{ chords: ChordEntry[], warnings: string[] }` where warnings note any skipped/unparseable tokens.

### Acceptance Criteria

1. `parseChordChart('Cmaj7 | Dm7 | G7 | Cmaj7', 'C')` → 4 ChordEntry objects with correct degrees.
2. `parseChordChart('I ii V I', 'C')` → 4 entries from Roman numerals.
3. `parseChordChart('C G Am F\nDm G C C', 'C')` → 8 entries (newline = section boundary, not a bar separator).
4. Repeat marker `%` copies previous bar's chord.
5. `N.C.` produces null degree/quality.
6. Unparseable tokens produce warnings and N.C. entries (not errors).
7. Empty input returns empty array with no warnings.

### Constraints

- Must: Pure function, no side effects, no React imports.
- Must: Delegate individual chord parsing to `parseChordInput()` from T04 — do not duplicate that logic.
- Must: Return warnings for unparseable tokens (don't silently drop input).
- Must not: Attempt to detect key from the chord progression (key is provided as parameter).
- Must not: Parse Nashville number format (`1 | 5 | 6 | 4`) — deferred to post-MVP.

### Verification

```bash
npx vitest run src/lib/chord-chart-parser.test.ts   # unit tests for all input formats
```

---

## Coverage Verification

### Every file in ARCHITECTURE.md project structure is covered:

| File | Task |
|------|------|
| `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `index.html` | T01 |
| `supabase/migrations/001_initial_schema.sql` | T02 |
| `src/main.tsx` | T01 |
| `src/App.tsx` | T01 (placeholder), T09 (final) |
| `src/types/project.ts`, `audio.ts`, `ui.ts`, `index.ts` | T03 |
| `src/lib/supabase.ts` | T06 |
| `src/lib/chords.ts` | T04 |
| `src/lib/midi-generator.ts` | T08 |
| `src/lib/description-parser.ts` | T04 |
| `src/lib/genre-config.ts` | T04 |
| `src/lib/style-cascade.ts` | T04 |
| `src/audio/engine.ts`, `instruments.ts`, `transport.ts`, `metronome.ts` | T07 |
| `src/store/project-store.ts`, `selection-store.ts`, `undo-store.ts`, `ui-store.ts` | T05 |
| `src/hooks/useAudio.ts` | T07 |
| `src/hooks/useProject.ts` | T06 |
| `src/hooks/useSelection.ts` | T05 (inline with selection store) |
| `src/hooks/useKeyboardShortcuts.ts` | T22 |
| `src/components/layout/AppShell.tsx` | T09 |
| `src/components/layout/TopBar.tsx` | T13 |
| `src/components/layout/StatusBar.tsx` | T14 |
| `src/components/left-panel/LeftPanel.tsx` | T15 |
| `src/components/left-panel/SongContext.tsx` | T15 |
| `src/components/left-panel/SectionContext.tsx` | T21 |
| `src/components/left-panel/BlockContext.tsx` | T21 |
| `src/components/left-panel/StyleControls.tsx` | T15 |
| `src/components/left-panel/InputPanel.tsx` | T15 |
| `src/components/left-panel/AiAssistant.tsx` | T15 |
| `src/components/arrangement/ArrangementView.tsx` | T16 |
| `src/components/arrangement/SectionHeaders.tsx` | T17 |
| `src/components/arrangement/BarRuler.tsx` | T17 |
| `src/components/arrangement/StemLane.tsx` | T18 |
| `src/components/arrangement/Block.tsx` | T18 |
| `src/components/arrangement/ChordLane.tsx` | T18 |
| `src/components/arrangement/EmptyState.tsx` | T16 |
| `src/components/arrangement/ArrangementToolbar.tsx` | T22 |
| `src/components/transport/TransportBar.tsx` | T19 |
| `src/components/transport/Scrubber.tsx` | T19 |
| `src/components/mixer/MixerDrawer.tsx` | T20 |
| `src/components/mixer/ChannelStrip.tsx` | T20 |
| `src/components/mixer/MasterStrip.tsx` | T20 |
| `src/components/shared/ConfirmDialog.tsx` | T23 |
| `src/components/shared/ScopeBadge.tsx` | T23 |
| `src/pages/EditorPage.tsx` | T09 |
| `src/pages/LibraryPage.tsx` | T11 |
| `src/pages/LoginPage.tsx` | T10 |
| `src/pages/SettingsPage.tsx` | T12 |
| `src/styles/globals.css` | T01 (scaffold), T24 (theme patterns) |
| `src/store/auth-store.ts` | T25 |
| `src/hooks/useAuth.ts` | T25 |
| `src/lib/chord-chart-parser.ts` | T26 |
| `tailwind.config.ts` | T01 (scaffold), T24 (forge theme) |
| `supabase/functions/generate/index.ts` | T08 |

### Every shakedown issue is incorporated:

| Issue | Where it's embedded |
|-------|-------------------|
| #1 — Bar-level block sequencer | T18 (Block.tsx, StemLane.tsx) |
| #2 — Mixer faders too short | T20 (150px+ fader travel) |
| #3 — Empty space in arrangement | T18 (dynamic lane heights with flex-1) |
| #4 — Section headers prominence | T17 (44px, selection states, context menu) |
| #5 — Mixer S/M buttons too small | T20 (btn-sm 28x28px) |
| #6 — Context-aware inspector | T15 (song), T21 (section/block), T15 (LeftPanel routing) |
| #7 — Chord notation | T04 (chords.ts), T18 (block/chord labels), T21 (chord input) |
| #8 — Reactive data flow | T15 (all 7 sub-problems: genre cascade, slider show/hide, description parser, AI tab removal, AI active pre-gen, chord display placement) |
| #9 — Top bar complete | T13 (all 13 sub-problems) |
| #10 — Arrangement window | T16 (10a empty state), T17 (10b sections, 10c bar ruler), T18 (10d lane heights, 10e chord lane, 10g selection, 10h playhead/grid), T19 (10i transport), T20 (10j mixer), T22 (10k toolbar, 10f zoom) |
| #11 — Status bar + app chrome | T14 (all 6 sub-problems) |

### DAG is valid (no circular dependencies):

```
T01, T02 → independent (Layer 0)
T03, T04, T24 → depend only on T01 (Layer 1)
T05, T06, T07, T08, T26 → depend on T03/T04 (Layer 2)
T25 → depends on T06 (Layer 3)
T09, T10, T11, T12 → depend on T05, T06, T25 (Layer 4)
T13, T14, T15, T16 → depend on T09 (Layer 5)
T17, T18, T19, T20 → depend on T16, T05, T07 (Layer 6)
T21, T22 → depend on Layer 6 (Layer 7)
T23 → depends on all (Layer 8)
```

No task depends on a task in the same or higher layer. ✓
