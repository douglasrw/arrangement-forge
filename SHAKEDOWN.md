# Arrangement Forge - UI Mockup Shakedown

**Mockup URL:** http://localhost:8770/mockup.html
**Started:** 2026-03-02
**Status:** Active iteration

---

## Issues Log

### #1 - Stem lanes: bar-level block sequencer (not waveforms, not piano-roll)
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP
- **Description:** MVP will not generate AI audio. Instead, the system will use MIDI data triggering high-quality audio samples in the browser. Stem lanes need a new interaction model.
- **Decision - BAR-LEVEL BLOCK SEQUENCER:**
  - **The fundamental unit of editing is the BAR, not the note.** No piano-roll. No note-level MIDI editing. This is NOT a DAW.
  - **All lanes are the same height.** No pitch axis. Every instrument gets identical visual treatment: a horizontal strip of bar-sized blocks with seams at bar boundaries.
  - **Initial state:** When AI generates a song, the lane is one continuous block (or blocks per section). No bar splits yet.
  - **Split tool:** User can split at bar-level granularity to divide a block into smaller blocks. Each bar-block can then be independently configured. Like cutting a ribbon at bar lines.
  - **Click a bar-block to open it** and see/edit its properties (chord/note + style).
  - **What each bar-block contains (instrument-aware):**
    - *Drums:* A **pattern/style** per bar (e.g., "Jazz brush swing", "Funk pocket", "Half-time feel"). NOT individual kick/snare placement.
    - *Bass:* A **note** + **playing style** per bar (e.g., "C - walking", "G - pedal tone", "Bb - slap").
    - *Piano:* A **chord** + **voicing/comping style** per bar (e.g., "Cmaj7 - jazz comp", "Dm7 - block chords", "G7 - stride").
    - *Guitar:* A **chord** + **strumming/picking style** per bar (e.g., "Cmaj7 - fingerpick arpeggios", "Am7 - rhythm strum").
    - *Strings:* A **chord** + **texture style** per bar (e.g., "Cmaj7 - sustained pad", "Dm7 - tremolo").
  - **User workflow:** AI generates arrangement → user listens → user splits specific bars → user clicks bar-block to change style/chord/note → surgical per-bar control without note-level complexity.
  - **Key insight:** The user controls *what* (chord/note) and *how* (style), the AI handles actual note generation. User says "play walking bass here" not "put a C on beat 1, E on beat 2."
- **Resolution:** SOLVED. Previous piano-roll and drum-grid implementations superseded. Needs mockup update to reflect bar-block sequencer paradigm.

### #2 - Mixer faders too short
- **Status:** [x] SOLVED (by #10j — collapsible mixer drawer with 150px+ fader travel)
- **Priority:** Medium
- **Raised by:** Claude (screenshot review)
- **Description:** Mixer faders are vertically compressed (~60px travel), hard to use for fine volume adjustments. Need more height for usable precision.
- **Implementation notes:**
  - Current: `<progress>` elements rotated `-rotate-90` in a `h-[100px]` container. The progress bar itself is `w-20` (80px) which becomes the vertical travel distance.
  - Target: minimum 120-150px of fader travel. Container height needs to increase to `h-[160px]` or similar.
  - The mixer area is at the bottom of the right panel. Increasing fader height means either: (a) the mixer takes more vertical space from the arrangement, (b) the mixer becomes collapsible/resizable, or (c) the overall layout rebalances.
  - Consider: should the mixer be a collapsible bottom panel (like a DAW mixer drawer) rather than always-visible? This would let it be taller when open without stealing from the arrangement area.
- **Decision:** TBD — need to decide on mixer layout strategy (always-visible vs collapsible drawer).
- **Resolution:**

### #3 - Empty space in arrangement area
- **Status:** [x] SOLVED (by #10d — dynamic stem lane heights fill available space)
- **Priority:** Medium
- **Raised by:** Claude (screenshot review)
- **Description:** Large vertical gap between the bottom stem lane (Strings) and the transport bar. Currently ~200px of unused white space. This space could be reclaimed to make stem lanes taller, add more stems, or show additional arrangement info.
- **Implementation notes:**
  - Root cause: the arrangement area has a fixed height, but only 5 stem lanes + chord lane + section headers occupy it. The rest is empty.
  - Fix options: (a) make arrangement area height dynamic based on stem count, (b) make stem lanes taller to fill available space, (c) use the space for something useful (e.g., a lyrics lane, marker lane, or notes lane).
  - Related to #2: if mixer becomes a collapsible drawer, the arrangement area gets even more vertical room.
  - Likely the right answer is dynamic height — arrangement area should be as tall as its content, with the transport bar sitting directly below the last lane.
- **Decision:** TBD — likely dynamic arrangement height + taller lanes.
- **Resolution:**

### #4 - Section blocks need more prominence
- **Status:** [x] SOLVED (by #10b — 44px headers, selection states, column highlight, context menu, add/reorder)
- **Priority:** Medium (upgraded — sections are now clickable targets for #6 context switching)
- **Raised by:** Claude (screenshot review)
- **Description:** Section headers (Intro/Verse/Chorus etc.) are small text labels in a thin row. Need to be taller and more visually distinct. Now that sections are clickable selection targets (#6), they need to be large enough to comfortably click and clearly communicate selection state.
- **Implementation notes:**
  - Current: section headers are a single row of small text at the top of the arrangement. "Intro 4 bars", "Verse 1 8 bars", etc.
  - Requirements post-#6: sections must be clearly clickable, show selected/unselected state, and visually anchor the arrangement columns below them.
  - Target: taller section blocks (~40-50px), distinct background color or border when selected, clear hover state, bar count visible.
  - Selected section should visually highlight the entire column beneath it (subtle background tint on all bars in that section).
  - Consider: section headers should also be the target for drag-to-reorder sections and right-click context menu (rename, delete, duplicate, merge).
- **Decision:** TBD — need mockup iteration.
- **Resolution:**

### #5 - Mixer S/M buttons and pan knobs too small
- **Status:** [x] SOLVED (by #10j — expanded mixer has btn-sm S/M buttons and 40px pan sliders)
- **Priority:** Low
- **Raised by:** Claude (screenshot review)
- **Description:** Solo/Mute buttons and pan control dots in the mixer strip are tiny (`btn-xs`). Hard to click and hard to read. Solo/Mute are frequent actions during arrangement editing — they need to be comfortably sized.
- **Implementation notes:**
  - Current: `btn-xs btn-square` for S/M buttons (~20x20px). Pan is a small range input.
  - Target: S/M buttons should be at least `btn-sm` (~28x28px) with clear active states. Solo = distinct color when active. Mute = distinct dimming of the entire channel strip when active.
  - Pan: consider replacing the tiny dot with a proper knob graphic or a wider horizontal range. Or simplify — does pan need to be in the mixer at all for MVP? Pan could be a per-stem setting in the left panel inspector instead.
  - Related to #2: if mixer faders get taller, there's more room for S/M buttons and pan.
- **Decision:** TBD — partially depends on #2 mixer layout decision.
- **Resolution:**

### #6 - Left sidebar: context-aware property inspector
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP
- **Description:** The left sidebar (INPUT, STYLE CONTROLS, AI ASSISTANT) currently shows only song-level content. After AI generation, INPUT is dead weight. Style controls only apply globally. The sidebar doesn't respond to what the user is doing in the arrangement. This wastes prime screen real estate and misses the opportunity for contextual editing.
- **Decision - CONTEXT-AWARE PROPERTY INSPECTOR:**
  - **The left panel is always an inspector for the current selection on the right.** No selection = song level. This follows the property inspector pattern used by Figma, Logic Pro, Ableton, etc.
  - **Three context levels, determined by what's selected in the arrangement:**
    1. **Song level (nothing selected):**
       - Collapsed read-only INPUT summary (key, chord progression at a glance) with "Edit Source" expand button. Full INPUT tabs (Text/Upload/Image/AI) available on expand but not hogging space by default.
       - Song-level STYLE CONTROLS: Genre, Sub-style, Energy, Groove, Swing %, Dynamics. These are the **defaults** that cascade down to sections and bars.
       - AI ASSISTANT scoped to whole song. Scope badge shows "Song".
       - "Regenerate Song" button at bottom.
    2. **Section level (click a section header like Intro/Verse/Chorus):**
       - Section properties: name, length (in bars), repeat count.
       - Section-level STYLE CONTROLS: same sliders as song level, but scoped to this section. Default state = "inherited from song" (shown visually dimmer). User can override any value (shown bold/highlighted). Override = "this section diverges from the song default."
       - AI ASSISTANT scoped to section. Scope badge shows e.g. "Verse 2". Commands like "make this section more energetic" target only the selected section.
       - "Regenerate Verse 2" button at bottom.
    3. **Bar-block level (click a bar-block in a stem lane):**
       - Bar-block inspector showing instrument-specific properties (from issue #1):
         - *Drums:* pattern/style dropdown
         - *Bass:* note + playing style
         - *Piano:* chord + voicing/comping style
         - *Guitar:* chord + strumming/picking style
         - *Strings:* chord + texture style
       - Bar-level style overrides (Energy, Dynamics, etc.) — inherited from section by default, overridable per bar.
       - AI ASSISTANT scoped to bar-block. Scope badge shows e.g. "Bass bar 7". Commands like "make this more syncopated" target the specific bar-block.
       - "Regenerate Bar 7" button at bottom.
  - **Style inheritance cascade (like CSS specificity):**
    - Song sets global defaults → Section can override → Bar-block can override further.
    - Inherited values shown **dimmer/lighter**. Explicitly overridden values shown **bold/highlighted**.
    - A "Reset to inherited" action per control lets user remove an override and fall back to the parent level.
    - This cascade is critical for the AI generation model: when regenerating a section, the AI uses the section's style values (which may be inherited from song or explicitly set).
  - **Scope breadcrumb** at top of left panel: `Song > Verse 2 > Bass bar 7`. Clicking any level in the breadcrumb navigates to that context. Pressing Escape or clicking empty arrangement space = back to song level.
  - **AI chat history persists globally** across context switches. Each message carries a scope badge showing what it targeted. Switching context doesn't lose conversation history. User can scroll back and see "I asked for more syncopation on Bass bar 7, then changed Verse 2 energy."
  - **Post-generation INPUT behavior:** Before generation, INPUT is full-screen with tabs (Text/Upload/Image/AI) as the primary action. After generation, INPUT collapses to a compact read-only summary showing key info (key, time sig, chord changes) with an "Edit Source" button to expand back to full editing. This reclaims space for the property inspector workflow.
  - **Navigation affordances:**
    - Click section header → section context
    - Click bar-block → bar-block context
    - Click empty arrangement space or press Escape → song context
    - Breadcrumb clicks → navigate up to any parent level
  - **Key insight:** The left panel earns its screen real estate at every stage. Pre-generation: it's the input form. Post-generation: it's the context-aware property inspector. The user never stares at a useless panel.
- **Resolution:** SOLVED. Design decision confirmed. Left panel = property inspector pattern with three context levels (song/section/bar-block), style inheritance cascade, persistent AI chat with scope badges, and post-generation INPUT collapse.

### #7 - Chord notation: letter names vs Roman numerals
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP
- **Description:** When a user clicks a Piano or Guitar bar-block, the left panel inspector shows the chord for that block. But chords can be represented two ways: letter names (C, Dm7, G7, Fmaj7) or Roman numerals (I, ii7, V7, IVmaj7). Different musicians think in different systems. The product needs to support both without cluttering the UI.
- **Decision - DUAL NOTATION WITH INTERNAL ROMAN NUMERAL MODEL:**
  - **Internal data model stores chords as Roman numerals + key.** Every chord in the system is stored as a scale degree relative to the song's key (e.g., `{ degree: "ii", quality: "min7", key: "Bb" }`). This makes transposition trivial — change the key, all letter names update automatically, Roman numerals stay the same.
  - **Display preference: one system at a time, user-togglable.** A global setting (accessible from top bar or preferences) switches between:
    - **Letter name mode:** Shows "Dm7", "G7", "Cmaj7" everywhere — bar-block labels, chord lane, inspector.
    - **Roman numeral mode:** Shows "ii7", "V7", "Imaj7" everywhere — same locations.
    - No split display. The entire UI commits to one system. This avoids clutter and respects how musicians actually think (you're either in letter-name mode or theory mode, not both).
  - **Input accepts either system regardless of display mode.** When editing a chord in the bar-block inspector, the user can type:
    - "Dm7" (letter name) → resolved to ii7 in key of C, displayed in whichever mode is active.
    - "ii7" (Roman numeral) → stored directly, displayed in whichever mode is active.
    - The input field is forgiving: both systems work at all times. No mode switching needed for typing. The system parses and resolves.
  - **Where chords appear (all respect the display toggle):**
    - **Chord lane** in the arrangement (the bottom row: "Cmaj7 | Dm7 | G7 | ...")
    - **Bar-block labels** on Piano/Guitar/Strings/Bass blocks (e.g., "Cmaj7 - Jazz comp" or "I - Jazz comp")
    - **Bar-block inspector** in the left panel (chord field when a pitched-instrument block is selected)
    - **INPUT summary** in the collapsed post-generation view
  - **Transposition workflow:** User changes the song key in the top bar (KEY dropdown). Internal Roman numerals stay the same. All letter-name displays recalculate instantly. If user is in Roman numeral mode, they see no change (which is correct — the harmonic function didn't change). If in letter mode, all chords update to the new key.
  - **Implementation data model example:**
    ```
    {
      song_key: "Bb",
      chord: { degree: "ii", quality: "min7" }
    }
    // Letter display: Cm7
    // Roman display: ii7
    // User changes key to C:
    // Letter display: Dm7
    // Roman display: ii7 (unchanged)
    ```
  - **Edge cases:**
    - Non-diatonic chords (e.g., tritone sub, borrowed chords): stored with explicit alteration (e.g., `{ degree: "bII", quality: "dom7" }` for a tritone sub). Roman display shows "bII7". Letter display resolves correctly.
    - Slash chords: stored as `{ degree: "V", quality: "dom7", bass_degree: "vii" }`. Displayed as "G7/B" or "V7/vii".
    - No chord / rest: stored as `{ degree: null }`. Displayed as "N.C." in both modes.
- **Resolution:** SOLVED. Internal Roman numeral data model with user-togglable display (letter vs Roman), input accepts either system at all times, transposition is a key change not a rewrite.

### #8 - Left panel reactive data flow and control consolidation
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP + Claude (shakedown review of pre-generation mockup)
- **Description:** The pre-generation left panel has overlapping controls, dead elements, and no reactive relationships between them. Controls in the top bar duplicate controls in the left panel. The description textarea and the style dropdowns can conflict. The AI tab inside INPUT is redundant with the AI Assistant. The AI Assistant is disabled pre-generation when it should be most useful. The Chord Display toggle is orphaned. None of these elements react to changes in the others. This issue consolidates all pre-generation left panel problems into a single reactive system design.

- **Sub-problem 8a: Duplicate controls — top bar vs left panel**
  - **Problem:** STYLE (Jazz Swing) and FEEL (Medium) in the top bar duplicate Genre (Jazz) + Sub-style (Swing) + Energy (Med) in the left panel. Two places to set the same thing. Sync is ambiguous and confusing.
  - **Decision:** **Remove STYLE and FEEL from the top bar.** The top bar keeps only song-level metadata that rarely changes and needs quick access: **Key, Tempo, Time Signature.** That's it. All style/genre/feel controls live exclusively in the left panel STYLE CONTROLS section where there's room for the full parameter set.
  - **Implementation:**
    - Delete the STYLE dropdown and FEEL dropdown from the top bar HTML.
    - The top bar becomes: `KEY [Bb▾]  TEMPO [◀ 128 ▶] BPM  TIME [3/4▾]  ————————  [GENERATE]`
    - GENERATE button stays in the top bar (it's a global action, not a left-panel-specific action).
    - This also frees horizontal space in the top bar for the Chord Display toggle (see 8f).

- **Sub-problem 8b: Genre → Sub-style reactive cascade**
  - **Problem:** Changing Genre should repopulate the Sub-style dropdown. Currently they're independent static dropdowns.
  - **Decision:** **Genre constrains Sub-style.** When Genre changes, Sub-style repopulates with genre-appropriate options and resets to the first option.
  - **Implementation — Sub-style options per genre:**
    ```
    Jazz     → Swing, Bebop, Cool, Modal, Free, Fusion, Latin Jazz
    Blues    → Delta, Chicago, Texas, Jump Blues, Electric, Boogie
    Rock     → Classic, Alternative, Indie, Progressive, Punk, Garage
    Funk     → Classic Funk, P-Funk, Acid, Neo-soul, Disco
    Country  → Traditional, Outlaw, Bluegrass, Country Pop, Western Swing
    Gospel   → Traditional, Contemporary, Southern, Praise & Worship
    R&B      → Classic, Contemporary, New Jack Swing, Quiet Storm
    Latin    → Bossa Nova, Samba, Son, Salsa, Bolero, Tango
    Pop      → Synth Pop, Indie Pop, Power Pop, Dream Pop, Electropop
    ```
  - **Reactive behavior:**
    - User changes Genre from Jazz to Blues → Sub-style dropdown clears, repopulates with Blues options, selects "Delta" (first).
    - If user had previously set Sub-style to a value that exists in the new genre (unlikely but possible), preserve it.
    - Fire a change event on Sub-style so any downstream listeners update.
  - **Data structure (JS):**
    ```javascript
    const GENRE_SUBSTYLES = {
      'Jazz': ['Swing','Bebop','Cool','Modal','Free','Fusion','Latin Jazz'],
      'Blues': ['Delta','Chicago','Texas','Jump Blues','Electric','Boogie'],
      // ... etc
    };
    ```

- **Sub-problem 8c: Genre → slider relevance (show/hide)**
  - **Problem:** Swing % is meaningless for Classical or Ambient. Groove (Tight/Laid/Loose) doesn't apply to a string quartet. Showing irrelevant sliders confuses users and pollutes the generation prompt.
  - **Decision:** **Sliders reactively show/hide based on Genre.** Each genre defines which sliders are relevant.
  - **Implementation — slider visibility per genre:**
    ```
    Slider     | Jazz | Blues | Rock | Funk | Country | Gospel | R&B | Latin | Pop
    -----------|------|-------|------|------|---------|--------|-----|-------|----
    Energy     |  ✓   |   ✓   |  ✓   |  ✓   |   ✓     |   ✓    |  ✓  |   ✓   |  ✓   (always visible)
    Groove     |  ✓   |   ✓   |  ✓   |  ✓   |   ✓     |   ✓    |  ✓  |   ✓   |  ✓   (always visible)
    Swing %    |  ✓   |   ✓   |  -   |  ✓   |   ✓     |   ✓    |  ✓  |   ✓   |  -   (hidden for Rock, Pop)
    Dynamics   |  ✓   |   ✓   |  ✓   |  ✓   |   ✓     |   ✓    |  ✓  |   ✓   |  ✓   (always visible)
    ```
    (This table is a starting point — can be refined. The implementation just needs a `GENRE_SLIDERS` config object.)
  - **Reactive behavior:**
    - Genre changes → check which sliders are relevant → hide irrelevant ones with a smooth collapse transition, show relevant ones.
    - Hidden sliders revert to a sensible default for that genre (e.g., Swing % = 50 when hidden = straight time).
    - When a slider becomes visible again, restore its previous value if the user had set one.
  - **Data structure (JS):**
    ```javascript
    const GENRE_SLIDERS = {
      'Jazz':    { energy: true, groove: true, swing: true, dynamics: true },
      'Rock':    { energy: true, groove: true, swing: false, dynamics: true },
      'Pop':     { energy: true, groove: true, swing: false, dynamics: true },
      // ...
    };
    ```

- **Sub-problem 8d: Description textarea as shortcut → auto-populates controls**
  - **Problem:** The description textarea ("Jazz waltz, medium tempo, smoky feel, brushes on drums") and the structured controls (Genre, Sub-style, Energy, etc.) describe overlapping things. They can conflict. Which is the source of truth?
  - **Decision:** **Structured controls are the source of truth. The description is a convenience parser that auto-populates them.** When the user types a description and presses Enter or tabs out, the system parses it and updates the structured controls. The user can then fine-tune the controls manually. Conflicts are resolved by the controls always winning — the description is a one-shot parse, not a persistent override.
  - **Implementation:**
    - On `blur` or `Enter` in the description textarea, send the text to a parsing function.
    - Parser extracts: genre keywords ("jazz" → Genre=Jazz), sub-style ("waltz" → Sub-style=Swing + Time=3/4), energy ("medium" → Energy=50), tempo ("medium tempo" → Tempo=120), instrument hints ("brushes on drums" → stored as generation hint, not a control value).
    - Parsed values update the corresponding controls with visual feedback (brief highlight/flash on the control that was auto-set).
    - Anything the parser can't map to a structured control (e.g., "smoky feel", "comping piano") is preserved as a **free-text generation hint** that gets passed alongside the structured params to the AI generation engine.
    - The description textarea is NOT cleared after parsing — it stays as-is for user reference. But the structured controls are now the source of truth.
  - **Parse priority rules:**
    - If a control was already manually set by the user (not at default), the parser does NOT overwrite it. Only default/unset controls get auto-populated.
    - If the user manually changes a control after parsing, the control value wins. The description is stale at that point — it's just text.
  - **MVP simplification:** The parser can be simple keyword matching for MVP. It doesn't need NLP. Map a dictionary of keywords to control values:
    ```javascript
    const DESCRIPTION_KEYWORDS = {
      genre: { 'jazz': 'Jazz', 'blues': 'Blues', 'rock': 'Rock', 'funk': 'Funk', ... },
      substyle: { 'swing': 'Swing', 'bebop': 'Bebop', 'bossa': 'Bossa Nova', ... },
      energy: { 'soft': 20, 'gentle': 25, 'medium': 50, 'high': 75, 'intense': 90, ... },
      time: { 'waltz': '3/4', 'march': '2/4', ... },
      // etc.
    };
    ```

- **Sub-problem 8e: Kill the "AI" tab in INPUT**
  - **Problem:** The INPUT section has tabs: Text / Upload / Image / **AI**. The AI Assistant section is a separate panel below. Two AI entry points in the same sidebar is confusing. What does the AI tab do that the AI Assistant doesn't?
  - **Decision:** **Remove the "AI" tab from INPUT.** INPUT tabs become: **Text / Upload / Image** (3 tabs). These are all source material input methods:
    - **Text** — type or paste a chord chart, lead sheet text, Nashville numbers, Roman numerals
    - **Upload** — upload a file (MusicXML, MIDI, iReal Pro backup, PDF lead sheet)
    - **Image** — upload a photo of a handwritten or printed lead sheet (OCR/AI reads it)
  - The AI Assistant at the bottom handles ALL AI interaction — both pre-generation ("give me a 12-bar blues in Bb") and post-generation ("make the piano comp more sparse").
  - **Implementation:** Remove the AI tab `<a>` element from the tabs list. Three tabs remain.

- **Sub-problem 8f: AI Assistant active pre-generation**
  - **Problem:** Currently disabled with placeholder text "AI assistant will help you refine your arrangement after generation." This misses the biggest opportunity — the AI should help SET UP the project, not just refine it.
  - **Decision:** **AI Assistant is always active.** Pre-generation, it acts as a setup assistant. Post-generation, it acts as a refinement assistant. The scope badge still shows "Song" pre-generation.
  - **Pre-generation AI capabilities:**
    - "I want something that sounds like Kind of Blue" → AI sets Genre=Jazz, Sub-style=Modal, Energy=20, Dynamics=pp. Responds: "Set to modal jazz, low energy. Want me to suggest a chord progression too?"
    - "Give me a 12-bar blues in Bb" → AI fills chord chart textarea with standard 12-bar blues changes in Bb, sets Genre=Blues, Key=Bb. Responds: "12-bar blues in Bb loaded. Hit Generate when ready."
    - "What's a good chord progression for a bossa nova ballad?" → AI suggests progression in chat, offers to populate the chord chart.
    - "Make it more upbeat" → AI adjusts Energy slider up, maybe Tempo up.
    - Any message can read AND write any control on the left panel.
  - **Implementation:**
    - Enable the AI input field and send button pre-generation (remove `btn-disabled`).
    - Replace placeholder text with a helpful prompt: "Try: 'Give me a jazz standard in Bb' or 'Something like Kind of Blue'"
    - The AI response handler needs write access to: Genre dropdown, Sub-style dropdown, all sliders, Key dropdown (top bar), Tempo input (top bar), Time Sig dropdown (top bar), chord chart textarea, description textarea.
    - Pre-generation AI messages get the scope badge "Setup". Post-generation they get "Song" / "Section" / "Block" per #6.

- **Sub-problem 8g: Chord Display toggle placement**
  - **Problem:** The Letter/Roman toggle is between Style Controls and AI Assistant. It feels orphaned — it's a display preference, not a generation parameter. It doesn't affect what gets generated, only how chords are rendered.
  - **Decision:** **Move Chord Display toggle to the top bar**, next to the KEY dropdown. This groups the two most related harmonic display controls (what key, how to display chords) together. It's also persistent and visible regardless of left panel context (song/section/bar-block).
  - **Implementation:**
    - Remove the CHORD DISPLAY section from the left panel.
    - Add a small toggle or segmented control to the top bar after KEY: `KEY [Bb▾] [I / A]` where I=Roman, A=Letter (or similar compact toggle).
    - Since STYLE and FEEL are being removed from the top bar (8a), there's room for this.
    - The top bar becomes: `KEY [Bb▾] [A/I] TEMPO [◀ 128 ▶] BPM  TIME [3/4▾]  ————————  [GENERATE]`

- **REACTIVE DATA FLOW DIAGRAM (the complete picture):**
  ```
  USER ACTIONS                          REACTIVE EFFECTS
  ─────────────────────────────────────────────────────────────────

  Types in Description textarea
      │ (on blur/Enter)
      ▼
  Description Parser ──────────────► Auto-populates: Genre, Sub-style,
      │                               Energy, Tempo, Key, Time Sig
      │                               (only unset/default controls)
      │
  Changes Genre dropdown
      │
      ├──► Sub-style repopulates (8b)
      ├──► Irrelevant sliders hide (8c)
      └──► Description textarea NOT updated (it's a one-shot input)

  Changes Key (top bar)
      │
      └──► Chord chart display updates if in Letter mode (per #7)
           (Roman numerals unchanged)

  Toggles Chord Display (top bar)
      │
      └──► All chord displays flip: chord chart, chord lane,
           block labels, inspector fields (per #7)

  Sends AI Assistant message
      │
      └──► AI can read/write ANY control: Genre, Sub-style,
           sliders, Key, Tempo, Time Sig, chord chart, description.
           Visual feedback: controls that AI changed get a brief
           highlight animation.

  Clicks GENERATE
      │
      └──► Collects ALL state: Key, Tempo, Time Sig, Genre,
           Sub-style, slider values, chord chart (parsed to
           Roman numerals), free-text generation hints from
           description. Sends to AI generation engine.
  ```

- **STATE MODEL (what GENERATE consumes):**
  ```javascript
  {
    // From top bar
    key: "Bb",
    tempo: 128,
    time_signature: "3/4",
    chord_display_mode: "letter",  // display only, not sent to engine

    // From left panel — structured controls (source of truth)
    genre: "Jazz",
    sub_style: "Swing",
    energy: 45,          // 0-100
    groove: 60,          // 0-100
    swing_pct: 65,       // 50-80, null if hidden for genre
    dynamics: 30,        // 0-100

    // From left panel — chord chart (parsed)
    chords: [
      { degree: "I", quality: "maj7" },
      { degree: "ii", quality: "min7" },
      { degree: "V", quality: "dom7" },
      { degree: "I", quality: "maj7" },
      // ... per bar
    ],

    // From description — unparsed hints (anything parser couldn't map)
    generation_hints: "smoky feel, brushes on drums, walking bass, comping piano",

    // From AI chat — any refinement instructions given pre-generation
    ai_setup_context: [
      { role: "user", content: "something like autumn leaves" },
      { role: "assistant", content: "Set to jazz swing. Loaded Autumn Leaves changes." }
    ]
  }
  ```

- **Resolution:** SOLVED. Seven sub-problems identified and resolved: (8a) remove STYLE/FEEL from top bar, (8b) Genre→Sub-style cascade, (8c) Genre→slider show/hide, (8d) description parses into controls, (8e) kill AI tab in INPUT, (8f) AI Assistant active pre-generation, (8g) move Chord Display toggle to top bar. Complete reactive data flow documented.

### #9 - Top bar: element interactions, state behavior, and context rules
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP + Claude (shakedown)
- **Description:** The top bar persists across all three left-panel contexts (song/section/bar-block). It contains two rows: the title bar (branding, project name, file actions, account) and the params bar (musical parameters, generate). Every element in the top bar needs defined behavior for pre-generation, post-generation, and during-generation states. Several elements have reactive side effects post-generation (key change = transposition, time sig change = destructive re-barring). Missing: undo/redo, export consolidation, destructive-action guards. This issue specifies every element completely.

- **TOP BAR LAYOUT (final, incorporating #8 decisions):**
  ```
  Row 1 — Title Bar:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ ARRANGEMENT FORGE    [project name input]    [Undo][Redo] Save Export▾ Share [DP▾] │
  └─────────────────────────────────────────────────────────────────────────┘

  Row 2 — Params Bar:
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ KEY [Bb▾] [A ‖ I] TEMPO [◀ 128 ▶] BPM  TIME [3/4▾]  ──────  [GENERATE] │
  └─────────────────────────────────────────────────────────────────────────┘
  ```

- **Sub-problem 9a: Title bar — project name**
  - **Element:** Editable text input, center-aligned, ghosted until focused.
  - **Pre-generation:** Shows "Untitled Project" in muted text. Editable. User can name their project before generating.
  - **Post-generation:** Shows the project name (e.g., "Autumn Leaves - Jazz Trio"). Editable on click. If the user hasn't set a name, auto-name from the AI based on style+chords (e.g., "Jazz Swing in Bb - 36 bars").
  - **Behavior:** On blur after editing, name auto-saves. No confirmation dialog. If the input is empty on blur, revert to previous name (never allow blank).
  - **Implementation:**
    ```javascript
    nameInput.addEventListener('blur', () => {
      const val = nameInput.value.trim();
      if (!val) { nameInput.value = previousName; return; }
      previousName = val;
      projectState.name = val;
      autoSave();  // triggers save indicator in status bar
    });
    ```

- **Sub-problem 9b: Title bar — Save button**
  - **Element:** `btn btn-sm btn-outline btn-ghost` labeled "Save".
  - **Always active** (both pre and post-generation). Pre-generation saves the project setup (name, key, tempo, time sig, genre, sub-style, sliders, chord chart, description). Post-generation saves the full arrangement state.
  - **Behavior:**
    - Click → immediate save. Button briefly shows "Saved ✓" for 1.5 seconds, then reverts to "Save".
    - Keyboard shortcut: `Cmd+S` / `Ctrl+S` (intercept browser default).
    - Status bar updates: "Saved: just now" after save.
  - **Auto-save strategy:** Auto-save every 60 seconds if there are unsaved changes. The Save button is for manual "save right now" (e.g., before closing tab). Auto-save sets status bar to "Auto-saved: X min ago". Manual save sets "Saved: just now".
  - **Implementation:**
    ```javascript
    let unsavedChanges = false;
    let autoSaveTimer = null;

    function markDirty() {
      unsavedChanges = true;
      if (!autoSaveTimer) {
        autoSaveTimer = setTimeout(() => {
          save('auto');
          autoSaveTimer = null;
        }, 60000);
      }
    }

    function save(type = 'manual') {
      unsavedChanges = false;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      // persist projectState to backend
      updateStatusBar(type === 'auto' ? 'Auto-saved: just now' : 'Saved: just now');
      if (type === 'manual') flashSaveButton();
    }
    ```
  - Every control change (left panel, top bar, block sequencer) calls `markDirty()`.

- **Sub-problem 9c: Title bar — Export ▾ dropdown**
  - **Element:** Button with dropdown caret.
  - **Pre-generation:** Disabled (`btn-disabled`). Nothing to export.
  - **Post-generation:** Active. Clicking opens a dropdown menu:
    ```
    ┌─────────────────────┐
    │ MP3  (full mix)     │
    │ WAV  (full mix)     │
    │ MIDI (all tracks)   │
    │ ─────────────────── │
    │ Stems ZIP (WAV)     │
    │ Stems ZIP (MIDI)    │
    │ ─────────────────── │
    │ Lead Sheet (PDF)    │
    │ iReal Pro           │
    │ MusicXML            │
    └─────────────────────┘
    ```
  - **This is the ONLY place export lives.** Remove the duplicate export buttons from the mixer footer (currently: `MP3 | WAV | MIDI | Stems ZIP` in the bottom-right). The mixer footer export becomes just a text link: "Export ▸" that scrolls focus / opens the same dropdown from the top bar. Or simply remove it entirely — the top bar Export is discoverable enough.
  - **Implementation:** DaisyUI `dropdown dropdown-end` with a `ul menu` inside.

- **Sub-problem 9d: Title bar — Share button**
  - **Element:** `btn btn-sm btn-outline btn-ghost` labeled "Share".
  - **Pre-generation:** Disabled (`btn-disabled`). Nothing to share.
  - **Post-generation:** Active. Clicking opens a dropdown or modal:
    ```
    ┌─────────────────────────────┐
    │ Copy link to project        │
    │ Share audio preview         │
    │ Share to [social icons]     │
    │ ─────────────────────────── │
    │ Collaborate (invite editor) │
    └─────────────────────────────┘
    ```
  - **MVP simplification:** For MVP, Share can just be "Copy link to project" (generates a shareable URL). The other options are roadmap.
  - **Implementation:** Single button, click copies URL to clipboard, shows "Link copied ✓" toast for 2 seconds.

- **Sub-problem 9e: Title bar — Undo / Redo (NEW)**
  - **Element:** Two small icon buttons `[↶] [↷]` or `[⌘Z] [⇧⌘Z]` placed between the project name and Save button.
  - **Pre-generation:** Disabled (nothing to undo yet).
  - **Post-generation:** Active. Tracks an undo stack of arrangement-editing operations.
  - **What's undoable:**
    - Block split, merge, duplicate, delete
    - Block style/chord/note changes
    - Section add, remove, reorder, rename
    - Slider changes (style overrides at section/bar level)
    - AI-initiated changes (the AI changed 3 blocks → undo reverts all 3 as one operation)
    - Key transposition
  - **What's NOT undoable (or has special handling):**
    - Full regeneration: this replaces the entire arrangement. Undo of regeneration restores the previous arrangement state entirely. This requires snapshotting the full state before regeneration.
    - Project name change: not worth tracking in undo stack.
    - Tempo/time sig changes: these are just parameter values, not arrangement structure changes. Undoable but low priority.
  - **Undo stack model:**
    ```javascript
    const undoStack = [];   // array of { description, stateBefore, stateAfter }
    const redoStack = [];
    const MAX_UNDO = 50;

    function pushUndo(description, stateBefore, stateAfter) {
      undoStack.push({ description, stateBefore, stateAfter });
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0;  // clear redo on new action
      updateUndoButtons();
    }

    function undo() {
      if (!undoStack.length) return;
      const action = undoStack.pop();
      redoStack.push(action);
      restoreState(action.stateBefore);
      updateUndoButtons();
    }

    function redo() {
      if (!redoStack.length) return;
      const action = redoStack.pop();
      undoStack.push(action);
      restoreState(action.stateAfter);
      updateUndoButtons();
    }
    ```
  - **Keyboard shortcuts:** `Cmd+Z` = undo, `Cmd+Shift+Z` = redo. These MUST be intercepted to prevent browser default behavior.
  - **Button states:** Disabled when respective stack is empty. Tooltip on hover shows what will be undone: "Undo: Split guitar block at bar 7".

- **Sub-problem 9f: Title bar — Account avatar [DP▾]**
  - **Element:** Small circular avatar with initials, clickable.
  - **Always active.** Clicking opens a dropdown:
    ```
    ┌─────────────────────┐
    │ DP (logged in)      │
    │ ─────────────────── │
    │ My Library          │
    │ Account Settings    │
    │ Preferences         │
    │ ─────────────────── │
    │ Keyboard Shortcuts  │
    │ Help & Docs         │
    │ ─────────────────── │
    │ Sign Out            │
    └─────────────────────┘
    ```
  - **Preferences** is where global settings live: default chord display mode (letter vs Roman), default genre, audio output device, auto-save interval, etc. These are user-level, not project-level.
  - **My Library** navigates to the user's saved tracks (the "47 tracks" referenced in the status bar).
  - **Implementation:** DaisyUI `dropdown dropdown-end` with a `ul menu` inside.

- **Sub-problem 9g: Params bar — KEY dropdown**
  - **Element:** `select` with all 12 keys (C through B, with enharmonic labels like "C#/Db").
  - **Always active** (pre and post-generation).
  - **Pre-generation behavior:** Just sets the key for generation. No side effects. The chord chart textarea uses whatever notation the user typed — key is metadata for the AI engine.
  - **Post-generation behavior — THIS IS A TRANSPOSITION EVENT:**
    - Changing key from Bb to C means: transpose the entire arrangement up a whole step.
    - Per #7: internal Roman numerals stay the same. Letter-name displays recalculate.
    - **Confirmation dialog required:**
      ```
      ┌─────────────────────────────────────────────┐
      │ Transpose arrangement?                      │
      │                                             │
      │ Changing key from Bb to C will transpose    │
      │ all chords and notes up a whole step.       │
      │                                             │
      │ Chord example: Dm7 → Em7                    │
      │ Bass example: Bb pedal → C pedal            │
      │                                             │
      │ [Cancel]                    [Transpose]     │
      └─────────────────────────────────────────────┘
      ```
    - On confirm: update `projectState.key`, recalculate all letter-name displays, push to undo stack ("Transpose Bb → C").
    - On cancel: revert dropdown to previous key.
    - If user is in Roman numeral display mode, the dialog still shows but notes that "Roman numeral display will not change — only letter names and bass notes are affected."
  - **Implementation:**
    ```javascript
    keySelect.addEventListener('change', () => {
      const newKey = keySelect.value;
      if (projectState.hasArrangement) {
        showTransposeDialog(projectState.key, newKey, {
          onConfirm: () => {
            pushUndo('Transpose ' + projectState.key + ' → ' + newKey, snapshot(), null);
            projectState.key = newKey;
            recalcAllChordDisplays();
            markDirty();
          },
          onCancel: () => { keySelect.value = projectState.key; }
        });
      } else {
        projectState.key = newKey;
        markDirty();
      }
    });
    ```

- **Sub-problem 9h: Params bar — Chord Display toggle [A ‖ I]**
  - **Element:** Small segmented control / join with two buttons: "A" (letter names) and "I" (Roman numerals). Compact — fits in the params bar after KEY.
  - **Always active** (pre and post-generation).
  - **Pre-generation behavior:** Sets display preference. If user has typed chords in the chord chart textarea, the display toggle doesn't rewrite their input — it only affects how the system displays chords it has parsed/generated. The input textarea is raw user text, not reformatted.
  - **Post-generation behavior:** Instantly flips all chord displays everywhere:
    - Chord lane labels
    - Bar-block labels on pitched instruments (Piano, Guitar, Strings, Bass)
    - Left panel inspector chord fields
    - Collapsed INPUT summary
  - **No confirmation needed.** This is a display preference, not a data change. Fully reversible by clicking the other option. No undo stack entry needed.
  - **Interaction with KEY dropdown:** When in Roman mode, changing key has no visible effect on chord displays (which is correct — Roman numerals are key-independent). When in Letter mode, changing key updates every chord display. The toggle gives the user control over which worldview they see.
  - **Implementation:**
    ```javascript
    chordDisplayToggle.addEventListener('click', (e) => {
      const mode = e.target.dataset.mode; // 'letter' or 'roman'
      projectState.chordDisplayMode = mode;
      updateToggleUI(mode);
      recalcAllChordDisplays();
      // no markDirty() — display preference, not project data
      // (or optionally save as user preference, not project state)
    });
    ```

- **Sub-problem 9i: Params bar — TEMPO [◀ 128 ▶] BPM**
  - **Element:** Joined group: decrement button, number input, increment button, "BPM" label.
  - **Always active** (pre and post-generation).
  - **Pre-generation behavior:** Sets the target tempo for generation. Range: 40-240 BPM. Arrow buttons increment/decrement by 1. User can type directly into the input.
  - **Post-generation behavior — playback speed only (MVP):**
    - Changing tempo post-generation changes playback speed. It does NOT trigger re-generation or re-arrangement.
    - This is like adjusting the metronome on a practice track — the notes stay the same, they just play faster or slower.
    - No confirmation dialog needed.
    - If the tempo deviates significantly from the generation tempo (e.g., generated at 128, user sets to 60), show a subtle info hint below the input: "Generated at 128 BPM" — so the user knows the arrangement was designed for a different tempo.
  - **Reactive side effects:**
    - Tempo change updates playhead speed in the transport (the scrubber moves at the new rate).
    - Tempo change updates the total time display (e.g., 36 bars at 128 BPM in 3/4 = different duration than at 90 BPM).
    - Formula: `totalSeconds = (TOTAL_BARS * beatsPerBar * 60) / tempo`
  - **Implementation:**
    ```javascript
    function setTempo(newTempo) {
      newTempo = Math.max(40, Math.min(240, newTempo));
      tempoInput.value = newTempo;
      projectState.tempo = newTempo;
      recalcDuration(); // updates totalSeconds, time display
      markDirty();
      // if post-generation and deviation > 20% from original
      if (projectState.generatedTempo &&
          Math.abs(newTempo - projectState.generatedTempo) / projectState.generatedTempo > 0.2) {
        showTempoHint('Generated at ' + projectState.generatedTempo + ' BPM');
      } else {
        hideTempoHint();
      }
    }
    ```
  - **Keyboard interaction:** When the tempo input is focused, Up/Down arrow keys increment/decrement by 1. Shift+Up/Down by 10. Enter blurs the input.

- **Sub-problem 9j: Params bar — TIME [3/4▾] (time signature)**
  - **Element:** `select` dropdown with options: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 12/8.
  - **Always active** (pre and post-generation).
  - **Pre-generation behavior:** Just sets the time signature for generation. No side effects.
  - **Post-generation behavior — THIS IS DESTRUCTIVE:**
    - Changing time signature means every bar has a different beat count. A 3/4 bar has 3 beats; a 4/4 bar has 4. The block sequencer is built on bars. Changing time signature invalidates the entire rhythmic structure.
    - **This requires re-generation.** There is no meaningful way to "convert" a 3/4 arrangement to 4/4 without AI re-interpretation.
    - **Confirmation dialog with forced re-generation:**
      ```
      ┌───────────────────────────────────────────────────┐
      │ Change time signature?                            │
      │                                                   │
      │ Changing from 3/4 to 4/4 requires regenerating    │
      │ the entire arrangement. Your current arrangement   │
      │ will be replaced.                                  │
      │                                                   │
      │ Your style settings, chord chart, and instrument  │
      │ configuration will be preserved.                   │
      │                                                   │
      │ [Cancel]                        [Change & Regenerate] │
      └───────────────────────────────────────────────────┘
      ```
    - On confirm: snapshot current arrangement to undo stack, update time sig, trigger full re-generation with all other params preserved.
    - On cancel: revert dropdown to previous value.
  - **Implementation:**
    ```javascript
    timeSigSelect.addEventListener('change', () => {
      const newSig = timeSigSelect.value;
      if (projectState.hasArrangement) {
        showTimeSigDialog(projectState.timeSig, newSig, {
          onConfirm: () => {
            pushUndo('Change time sig ' + projectState.timeSig + ' → ' + newSig,
                     fullSnapshot(), null);
            projectState.timeSig = newSig;
            triggerRegeneration();
          },
          onCancel: () => { timeSigSelect.value = projectState.timeSig; }
        });
      } else {
        projectState.timeSig = newSig;
        markDirty();
      }
    });
    ```

- **Sub-problem 9k: Params bar — GENERATE button**
  - **Element:** `btn btn-neutral btn-sm`, right-aligned in the params bar.
  - **Three states:**
    1. **Pre-generation: "GENERATE"**
       - Bold, prominent, primary action. This is what the user is building toward.
       - Enabled when at minimum: chord chart has content OR description has content. (User needs to give the AI _something_ to work with.)
       - Disabled (grayed) if both chord chart and description are empty.
       - Click → transitions to generating state.
    2. **During generation: "GENERATING..."**
       - Button shows loading indicator (spinner or animated dots).
       - Button is disabled (can't double-click to generate twice).
       - A progress bar or pulsing animation in the arrangement area shows the generation is in progress.
       - A "Cancel" option should appear (either the button itself becomes "Cancel" or a small X appears next to it).
       - Generation takes 3-15 seconds depending on complexity.
    3. **Post-generation: "REGENERATE"**
       - Label changes to "REGENERATE" to signal that clicking will REPLACE the existing arrangement.
       - Always enabled (user can always regenerate).
       - Click → confirmation dialog:
         ```
         ┌───────────────────────────────────────────────┐
         │ Regenerate arrangement?                       │
         │                                               │
         │ This will replace your current arrangement.   │
         │ All manual edits (splits, style changes,      │
         │ block adjustments) will be lost.              │
         │                                               │
         │ [Cancel]                    [Regenerate]      │
         └───────────────────────────────────────────────┘
         ```
       - On confirm: snapshot current arrangement to undo stack ("Full regeneration"), then regenerate.
       - On cancel: nothing happens.
       - **Keyboard shortcut:** `Cmd+Enter` / `Ctrl+Enter` triggers generate/regenerate (with confirmation if post-generation).
  - **What GENERATE sends (the complete generation request):**
    ```javascript
    function buildGenerationRequest() {
      return {
        // Top bar params
        key: projectState.key,
        tempo: projectState.tempo,
        time_signature: projectState.timeSig,

        // Left panel — structured controls
        genre: projectState.genre,
        sub_style: projectState.subStyle,
        energy: projectState.energy,
        groove: projectState.groove,
        swing_pct: projectState.swingPct,   // null if hidden for genre
        dynamics: projectState.dynamics,

        // Left panel — chord chart (parsed to Roman numerals)
        chords: projectState.parsedChords,

        // Left panel — free-text generation hints
        generation_hints: projectState.generationHints,

        // Left panel — AI setup context
        ai_context: projectState.aiChatHistory.filter(m => m.scope === 'setup'),

        // Instrument configuration
        stems: projectState.stems || ['drums','bass','piano','guitar','strings'],
      };
    }
    ```

- **Sub-problem 9l: Export button consolidation**
  - **Problem:** Export actions currently live in TWO places: the title bar "Export ▾" button AND the mixer footer (`MP3 | WAV | MIDI | Stems ZIP`).
  - **Decision:** **Title bar Export ▾ is the single canonical export location.** Remove the duplicate export buttons from the mixer footer entirely.
  - **Mixer footer becomes:**
    ```
    [+ Add Stem]  Drag to reorder
    ```
    No export buttons. Clean. Export is always top-right.
  - **Implementation:** Delete the export `join` group from the mixer footer HTML. The Export dropdown in the title bar (9c) is the only export UI.

- **Sub-problem 9m: Top bar context-awareness rule**
  - **Decision:** **The top bar does NOT change based on left-panel context.** It is always song-level. When a section or bar-block is selected, the top bar remains identical. The left panel handles all context-switching (per #6).
  - **Rationale:** The top bar is the stable anchor. Users need one place that never moves. The left panel is the dynamic inspector. Mixing context-awareness into both would create confusion about what's song-level vs selection-level.
  - **The one subtle exception:** The status bar (bottom row) could optionally show the current selection as a breadcrumb for orientation: `Song > Chorus > Guitar bar 13 | Library: 47 tracks | Saved: 2 min ago`. But this is cosmetic and low priority.

- **COMPLETE TOP BAR STATE TABLE:**
  ```
  Element             │ Pre-generation       │ During generation    │ Post-generation
  ────────────────────┼──────────────────────┼──────────────────────┼──────────────────────
  Project name        │ "Untitled Project"   │ (unchanged)          │ User-set or auto-named
  Undo / Redo         │ Disabled             │ Disabled             │ Active (when stack has items)
  Save                │ Active               │ Active               │ Active
  Export ▾            │ Disabled             │ Disabled             │ Active (dropdown)
  Share               │ Disabled             │ Disabled             │ Active
  Account [DP▾]      │ Active               │ Active               │ Active
  ────────────────────┼──────────────────────┼──────────────────────┼──────────────────────
  KEY [Bb▾]          │ Active (no confirm)  │ Disabled             │ Active (with transpose confirm)
  Chord Display [A/I] │ Active               │ Active               │ Active (instant flip)
  TEMPO [◀128▶]      │ Active (no confirm)  │ Disabled             │ Active (playback speed only)
  TIME [3/4▾]        │ Active (no confirm)  │ Disabled             │ Active (with regen confirm)
  GENERATE            │ "GENERATE" (active   │ "GENERATING..."      │ "REGENERATE" (active
                      │  when input exists)  │ (disabled+spinner)   │  with replace confirm)
  ```

- **REACTIVE SIDE EFFECTS SUMMARY:**
  ```
  Action                        │ Side effects
  ──────────────────────────────┼──────────────────────────────────────
  Change KEY (pre-gen)          │ Updates projectState.key. No display changes.
  Change KEY (post-gen)         │ Confirm dialog → transpose → recalc all letter-name
                                │  chord displays → push undo → markDirty
  Toggle Chord Display          │ Flip all chord displays instantly. No undo entry.
  Change TEMPO                  │ Recalc duration/totalSeconds → update time display →
                                │  update playhead speed → show hint if >20% deviation
  Change TIME SIG (pre-gen)     │ Updates projectState.timeSig. No side effects.
  Change TIME SIG (post-gen)    │ Confirm dialog → snapshot undo → full regeneration
  Click GENERATE (pre-gen)      │ Build generation request → send to AI → show loading →
                                │  receive arrangement → populate all lanes → enable
                                │  post-gen controls → button becomes "REGENERATE"
  Click REGENERATE (post-gen)   │ Confirm dialog → snapshot undo → full regeneration
  Click Save                    │ Persist projectState → flash button → update status bar
  Cmd+Z                         │ Pop undo stack → restore state → push to redo
  Cmd+Shift+Z                   │ Pop redo stack → restore state → push to undo
  ```

- **Resolution:** SOLVED. Complete top bar specification: 13 sub-problems covering every element, three-state behavior (pre/during/post-generation), reactive side effects, destructive-action guards (key transposition confirm, time sig regen confirm, regenerate replace confirm), undo/redo system, export consolidation, and context-awareness rule. Full state table and side effects summary documented.

### #10 - Arrangement window: complete shakedown (pre-gen and post-gen states)
- **Status:** [x] SOLVED
- **Priority:** High
- **Raised by:** DP + Claude (shakedown)
- **Description:** The arrangement window is the entire right panel — everything to the right of the left sidebar. It contains the arrangement header/toolbar, section headers, stem lanes (the bar-level block sequencer), chord lane, transport bar, and mixer. This area has fundamentally different behavior in two states: pre-generation (empty, waiting for user to set up and hit GENERATE) and post-generation (populated with the full arrangement, ready for editing and playback). This issue specifies every element across both states, resolves the remaining open issues (#2, #3, #4, #5), and defines missing features critical for MVP (bar ruler, metronome, count-in, horizontal zoom, collapsible mixer, keyboard shortcuts).

- **ARRANGEMENT WINDOW ANATOMY (post-generation, top-to-bottom):**
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ ARRANGEMENT          [Select|Split]  [Zoom: - + ⊞]         │  ← Toolbar
  ├─────────────────────────────────────────────────────────────┤
  │ Intro   │  Verse 1      │  Chorus       │  Verse 2     │...│  ← Section headers
  ├─────────────────────────────────────────────────────────────┤
  │ 1 2 3 4 │ 5 6 7 8 9 ... │ 13 14 15 ...  │ 21 22 ...    │  │  ← Bar ruler (NEW)
  ├─────────────────────────────────────────────────────────────┤
  │ DRUMS  S M │▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓│▓▓▓▓▓│▓▓▓│▓▓▓│▓▓▓│  │
  │ BASS   S M │▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓│▓▓▓│▓▓▓▓▓│▓▓▓▓▓▓▓│▓▓▓│  │  ← Stem lanes
  │ PIANO  S M │▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓│▓▓▓│▓▓│  │    (fill available
  │ GUITAR S M │▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓│▓▓│  │     height)
  │ STRING S M │▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓│▓▓▓│▓▓│  │
  ├─────────────────────────────────────────────────────────────┤
  │ CHORDS     │Cmaj7│ Dm7 │ G7  │Cmaj7│ Am7 │ D7  │Gmaj7│...│  ← Chord lane
  ├═════════════════════════════════════════════════════════════┤
  │ ⏮ ⏪ ▶ PLAY ⏩ ⏭  ▬▬▬▬▬▬▬▬▬▬▬▬▬  Bar 23 │ 1:47/3:52   │
  │                     Loop [Chorus▾]  Vol ▬▬  [🔊 Click] [CI]│  ← Transport
  ├═════════════════════════════════════════════════════════════┤
  │ DRUMS  BASS  PIANO  GUITAR  STRINGS  │  MASTER             │
  │  ▊▊     ▊▊    ▊▊     ▊▊      ▊▊      │    ▊▊               │  ← Mixer
  │ [S][M] [S][M] [S][M] [S][M]  [S][M]  │                     │    (collapsible)
  │  L▬▬R   L▬▬R  L▬▬R   L▬▬R    L▬▬R   │                     │
  ├─────────────────────────────────────────────────────────────┤
  │ [+ Add Stem]  Drag to reorder                               │  ← Mixer footer
  └─────────────────────────────────────────────────────────────┘
  ```

- **Sub-problem 10a: Pre-generation empty state — what to show, what to hide**
  - **Problem:** Currently the pre-gen state shows a disabled toolbar, disabled transport, "Mixer will appear after generation" placeholder, and disabled mixer footer. That's a lot of dead chrome. The user's focus should be on the left panel (input + style controls) and the GENERATE button. Disabled widgets create visual noise and make the empty state feel broken rather than inviting.
  - **Decision: Hide transport, mixer, and toolbar pre-generation. Show ONLY the empty state.**
  - **Pre-generation arrangement window:**
    ```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │                                                             │
    │                         ♪                                   │
    │                  No arrangement yet                         │
    │                                                             │
    │        Enter your chord chart or description on the         │
    │        left, set your style preferences, then hit           │
    │        GENERATE to create your arrangement.                 │
    │                                                             │
    │           [1] Input chords → [2] Set style → [3] Generate  │
    │                                                             │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    ```
  - No arrangement header/toolbar (nothing to select, split, or zoom).
  - No transport bar (nothing to play).
  - No mixer (nothing to mix).
  - Just the centered empty-state message occupying the full right panel.
  - **Transition on generation complete:** All hidden elements animate in. Arrangement toolbar slides down from top. Stem lanes populate with a staggered fade-in (drums first, then bass, piano, guitar, strings). Transport slides up from bottom. Mixer appears below transport. This creates a "your arrangement just materialized" moment.
  - **Implementation:**
    ```javascript
    // Elements hidden pre-gen, shown post-gen:
    const preGenHidden = [
      '#arrangement-toolbar',
      '#sections-row',
      '#bar-ruler',
      '#stems-container',
      '#chord-lane',
      '#transport',
      '#mixer'
    ];

    function showPostGenUI() {
      document.getElementById('empty-state').classList.add('hidden');
      preGenHidden.forEach((sel, i) => {
        const el = document.querySelector(sel);
        el.classList.remove('hidden');
        el.style.animation = `fadeIn 0.3s ease ${i * 0.05}s both`;
      });
    }
    ```

- **Sub-problem 10b: Section headers — sizing, interaction, management (RESOLVES #4)**
  - **Problem:** Section headers are currently ~30px tall with 10px text. They're too small to click comfortably, especially now that they're selection targets for the context-aware sidebar (#6). They lack management features (add/delete/reorder) and visual connection to the lanes below them.
  - **Decision: Taller section headers (44px), clear selection state, context menu, add button.**
  - **Section header sizing:**
    - Height: 44px (from ~30px). Big enough for section name + bar count on two lines.
    - Font: section name at 11px bold, bar count at 9px below it.
    - Width: proportional to bar count (current flex-[N] approach is correct).
    - Minimum width: 60px. Sections shorter than 2 bars get a minimum width to remain clickable.
  - **Selection states:**
    - **Unselected:** `bg-base-200 border border-base-300 text-base-content/50`. Subtle, recessive.
    - **Hovered:** `border-base-content/30`. Border darkens on hover.
    - **Selected (section-level context):** `bg-neutral/20 border-2 border-base-content text-base-content font-bold`. Bold border, full-opacity text. The ENTIRE COLUMN below (all bars in that section across all lanes) gets a subtle highlight tint: `bg-base-content/5` overlay.
    - **Currently-playing:** During playback, the section containing the playhead gets a subtle pulsing border or a small playback indicator icon.
  - **Context menu (right-click on section header):**
    ```
    ┌─────────────────────┐
    │ Rename...           │
    │ Set bar count...    │
    │ ─────────────────── │
    │ Insert before       │
    │ Insert after        │
    │ Duplicate           │
    │ ─────────────────── │
    │ Merge with next →   │
    │ Delete              │
    └─────────────────────┘
    ```
  - **"+" button:** A small `+` button at the END of the section row (after the last section). Clicking opens a mini form: section name input + bar count input. Default: "New Section", 4 bars.
  - **Drag to reorder:** Section headers are draggable. Grabbing a section header and dragging left/right reorders sections. All bar-blocks in that section move with it across all lanes. Visual feedback: dragged section shows ghost outline at drop position.
  - **Column highlight on selection:** When a section is selected, a semi-transparent overlay tints all bars in that section across all stem lanes. This visually connects the section header to the content below it:
    ```css
    .section-column-highlight {
      position: absolute;
      top: 0; bottom: 0;
      background: oklch(var(--bc) / 0.04);
      pointer-events: none;
      z-index: 1;
    }
    ```
  - **Resolution of #4:** Section headers are now 44px tall, clearly clickable, have distinct selection states, column highlight, context menu, add/reorder capability.

- **Sub-problem 10c: Bar ruler (NEW — does not exist yet)**
  - **Problem:** There are NO bar numbers anywhere in the arrangement. Musicians think in bar numbers ("the chord change at bar 13", "the bridge starts at bar 21"). Without a bar ruler, users must count bars visually — error-prone and frustrating.
  - **Decision: Add a bar ruler row between section headers and stem lanes.**
  - **Bar ruler specification:**
    - Position: immediately below section headers, immediately above first stem lane.
    - Height: 20px. Thin and unobtrusive.
    - Content: one number per bar, centered in the bar's width. `1  2  3  4 | 5  6  7  8  9  10  11  12 | 13 ...`
    - Font: 9px monospace, `text-base-content/40`. Numbers should NOT compete with block labels.
    - Bar boundaries: thin vertical lines (1px, `base-content/10`) extending down through ALL lanes and the chord lane. These create a unified grid.
    - Section boundaries: slightly thicker/darker lines (2px, `base-content/20`) at section transitions.
    - **Clickable bars:** Clicking a bar number selects that bar position across all lanes (useful for placing the playhead at a specific bar).
    - Beat subdivisions (future): at high zoom levels, show beat numbers within bars (e.g., `13.1  13.2  13.3` for a 3/4 bar). NOT for MVP.
  - **Horizontal alignment:** The bar ruler shares the same horizontal grid as the stem lanes, chord lane, and section headers. The lane gutter (instrument labels) must be the same width across bar ruler, stem lanes, and chord lane so everything aligns.
  - **Implementation:**
    ```html
    <!-- Bar Ruler -->
    <div class="flex h-5 text-[9px] text-base-content/40 font-mono" id="bar-ruler">
      <div class="w-[80px] shrink-0"></div><!-- gutter spacer -->
      <div class="flex flex-1" id="bar-numbers">
        <!-- JS generates: one div per bar, flex: 1 each -->
      </div>
    </div>
    ```
    ```javascript
    function renderBarRuler() {
      const container = document.getElementById('bar-numbers');
      container.innerHTML = '';
      for (let i = 1; i <= TOTAL_BARS; i++) {
        const cell = document.createElement('div');
        cell.className = 'flex-1 text-center border-l border-base-content/10';
        cell.textContent = i;
        // section boundaries get stronger border
        if (isSectionBoundary(i)) {
          cell.classList.add('border-base-content/25');
        }
        container.appendChild(cell);
      }
    }
    ```

- **Sub-problem 10d: Stem lane layout — dynamic height, gutter width (RESOLVES #3)**
  - **Problem:** Stem lanes are fixed at `h-10` (40px). With 5 lanes = 200px, plus chord lane = 228px, there's ~200px+ of empty space below in the arrangement area. Block labels at 9px are barely readable. Lanes feel cramped while space goes unused.
  - **Decision: Stem lanes expand to fill available vertical space. No fixed height.**
  - **Dynamic lane height:**
    - The arrangement area (between toolbar and transport) has a known height. Subtract: section headers (44px) + bar ruler (20px) + chord lane (28px) + internal padding (~8px) = ~100px of fixed elements.
    - Remaining height ÷ number of stems = lane height. On a 900px viewport with top bar (~80px), params bar (~40px), transport (~40px), mixer (~160px collapsed), status bar (~24px) → arrangement area ≈ 556px. Available for lanes: 556 - 100 = 456px ÷ 5 = **~91px per lane**.
    - 91px per lane vs current 40px = **more than double the height**. Block labels become much more readable. Could even show two lines of info per block (style on top, chord on bottom).
    - Implementation: each stem lane div gets `flex-1` instead of `h-10`:
      ```html
      <div class="stem-lane flex items-stretch gap-0 flex-1 mb-0.5" data-instrument="drums">
      ```
    - Minimum lane height: 36px. If the user adds many stems (8+), lanes shouldn't shrink below this. Add `overflow-y: auto` to the stems container so it scrolls if lanes would be smaller than the minimum.
  - **Lane gutter (instrument labels + S/M):**
    - Current: 100px wide, contains `DRUMS S M`.
    - Reduced to **80px**. Instrument name (abbreviated if needed: `DRUMS`, `BASS`, `PIANO`, `GTR`, `STRS`).
    - S/M buttons remain in the gutter for quick access during editing. Size them properly: `btn-xs` but not `btn-square` — at least 20x20px tap targets (address part of #5).
    - The gutter is **position: sticky; left: 0** so it stays visible when horizontally scrolling (10f).
  - **Block label readability in taller lanes:**
    - With ~90px lane height, blocks can show more info. Two-line format:
      ```
      ┌────────────────────┐
      │   Jazz brush swing  │  ← style (larger text, 10-11px)
      │                      │
      └────────────────────┘
      ```
    - For pitched instruments, two lines:
      ```
      ┌────────────────────┐
      │   Cmaj7             │  ← chord (11px bold)
      │   Sparse comp       │  ← style (9px, lighter)
      └────────────────────┘
      ```
    - For narrow blocks (1-2 bars at default zoom), truncate with ellipsis. Full info shown on hover tooltip.
  - **Resolution of #3:** No more empty space. Stem lanes dynamically fill all available vertical space. The arrangement area is now fully utilized.

- **Sub-problem 10e: Chord lane — alignment, interaction, completeness**
  - **Problem:** The current chord lane has 12 cells for a 36-bar song — it shows only one iteration of the chord progression, not one cell per bar. The chord lane must align bar-for-bar with the stem lanes above. Its label gutter (100px "CHORDS") doesn't match the stem lane gutter width.
  - **Decision: One chord cell per bar, aligned with the unified bar grid. Gutter matches stem lanes.**
  - **Chord lane specification:**
    - One cell per bar. 36 bars = 36 chord cells. Each cell shows the chord for that bar in the current display mode (letter or Roman per #7).
    - Cells are `flex-1` like bar-block width — they automatically align with bar boundaries in the stem lanes because both use the same flex proportions.
    - Cell height: 24px. Font: 10px bold.
    - Gutter label: `CHORDS` at 80px width (matches stem lane gutter per 10d).
    - Background: `bg-base-200`. Slightly recessed compared to stem lanes. Visually reads as a reference lane, not an instrument lane.
    - Repeat chords: if bar N has the same chord as bar N-1, show `%` (repeat sign) instead of the chord name. This matches lead-sheet convention and reduces visual clutter.
  - **Interaction:**
    - Clicking a chord cell selects that bar at the song level. The left panel switches to song context and scrolls to/highlights the chord chart textarea at that bar's position.
    - Hovering a chord cell shows a tooltip: "Bar 13: Cmaj7 (Imaj7)" — showing both notations regardless of current display mode.
  - **Scrolling:** The chord lane scrolls horizontally in sync with the stem lanes and bar ruler (part of the same scrollable container; the gutter is sticky-left).
  - **Implementation:**
    ```javascript
    function renderChordLane() {
      const container = document.getElementById('chord-cells');
      container.innerHTML = '';
      const chords = projectState.parsedChords; // one per bar
      chords.forEach((chord, i) => {
        const cell = document.createElement('div');
        cell.className = 'flex-1 text-center text-[10px] font-semibold '
          + 'text-base-content/70 bg-base-200 rounded py-0.5 cursor-pointer '
          + 'hover:bg-base-300 transition-colors';
        const prev = i > 0 ? chords[i-1] : null;
        const isSame = prev && prev.degree === chord.degree
                            && prev.quality === chord.quality;
        cell.textContent = isSame ? '%' : formatChord(chord, projectState.key,
                                          projectState.chordDisplayMode);
        cell.dataset.bar = i + 1;
        container.appendChild(cell);
      });
    }
    ```

- **Sub-problem 10f: Horizontal zoom and scroll**
  - **Problem:** Currently all 36 bars fit in the viewport. Each bar gets ~29px of width. This works for short songs but will fail for longer arrangements (64, 96, 120+ bars). Block labels are often truncated. There's no way to zoom in to read labels or zoom out to see the full structure.
  - **Decision: Horizontal zoom with fit-all default. Scroll horizontally at higher zoom levels.**
  - **Zoom levels:**
    - **Fit All (default):** All bars visible. Bar width = available width ÷ total bars. This is the current behavior.
    - **Zoom in:** Each zoom step increases bar width by ~30%. Zoom levels: 1x (fit), 1.3x, 1.7x, 2.2x, 3x, 4x. At 4x on a 36-bar song, each bar is ~116px — plenty of room for labels.
    - **Zoom out** beyond fit-all: not needed. Fit-all is already the most zoomed out.
    - At any zoom level beyond fit-all, the arrangement scrolls horizontally. Horizontal scrollbar appears at the bottom of the stems container.
  - **Scroll behavior:**
    - Trackpad horizontal scroll (two-finger swipe) scrolls the arrangement.
    - Mouse wheel + Shift scrolls horizontally (standard pattern).
    - Scroll syncs across: bar ruler, section headers, stem lanes, and chord lane. They're all inside the same scrollable container.
    - The lane gutter (instrument labels + S/M) is `position: sticky; left: 0` — it stays fixed while content scrolls.
  - **Zoom controls (toolbar):**
    - `[-]` zoom out button, `[+]` zoom in button, `[⊞]` fit-all button (resets to 1x).
    - Keyboard: `Cmd+=` zoom in, `Cmd+-` zoom out, `Cmd+0` fit all.
    - Optional: `Cmd+scroll` (pinch-to-zoom on trackpad) for continuous zoom.
  - **Zoom anchoring:** When zooming in/out, keep the center of the viewport (or the playhead position, if playing) anchored so the user doesn't lose their place.
  - **Implementation:**
    ```javascript
    let zoomLevel = 1; // 1 = fit all
    const ZOOM_STEPS = [1, 1.3, 1.7, 2.2, 3, 4];
    let zoomIndex = 0;

    function getBarWidth() {
      const containerWidth = getScrollableWidth();
      const fitAllWidth = containerWidth / TOTAL_BARS;
      return fitAllWidth * ZOOM_STEPS[zoomIndex];
    }

    function applyZoom() {
      const barWidth = getBarWidth();
      const totalWidth = barWidth * TOTAL_BARS;
      // Set width on the inner scrollable container
      document.getElementById('arrangement-inner').style.width =
        totalWidth + 'px';
      // Re-render all lanes, bar ruler, chord lane at new width
      renderAll();
    }

    function zoomIn() {
      if (zoomIndex < ZOOM_STEPS.length - 1) {
        zoomIndex++;
        applyZoom();
      }
    }

    function zoomOut() {
      if (zoomIndex > 0) {
        zoomIndex--;
        applyZoom();
      }
    }

    function zoomFitAll() {
      zoomIndex = 0;
      applyZoom();
    }
    ```

- **Sub-problem 10g: Selection model and block interactions**
  - **Problem:** The current mockup has TWO conflicting interaction models: (1) clicking a block opens an inline popover (mockup-guitar-block.html JS), and (2) clicking a block changes the left panel context (#6). These conflict. Also: there's no right-click menu, no keyboard navigation, no multi-select.
  - **Decision: Remove inline popovers. Left panel inspector is the sole editing UI. Add right-click menus and keyboard shortcuts.**
  - **Click behavior (post-generation):**
    - **Left-click a block (Select mode):** Selects the block. Left panel switches to bar-block inspector context (#6). Block gets a `selected` outline (2px solid `base-content`). Any previously selected block is deselected.
    - **Left-click a block (Split mode):** Splits the block at the nearest bar boundary to the click position. The click position within the block determines which bar the split happens at. Visual: cursor changes to a crosshair in split mode.
    - **Left-click a section header:** Selects the section. Left panel switches to section context (#6). Section gets selection styling (10b).
    - **Left-click empty space (below chords, or in the bar ruler):** Deselects everything. Left panel returns to song context.
    - **Escape key:** Deselects everything. Returns to song context.
  - **Right-click context menu on a block:**
    ```
    ┌─────────────────────────┐
    │ Split at bar N          │  (only if block spans multiple bars)
    │ Merge with next →       │  (only if not the last block in lane)
    │ ─────────────────────── │
    │ Duplicate               │
    │ Delete                  │
    │ ─────────────────────── │
    │ Copy style              │
    │ Paste style             │  (grayed if clipboard empty)
    └─────────────────────────┘
    ```
  - **Right-click on section header:** Context menu per 10b.
  - **Keyboard shortcuts (arrangement-focused):**
    ```
    Space         → Play / Pause
    Escape        → Deselect (song context)
    Delete/Bksp   → Delete selected block
    D             → Duplicate selected block
    S             → Toggle Split mode
    V             → Toggle Select mode
    ← / →         → Select previous/next block in same lane
    ↑ / ↓         → Select same-position block in adjacent lane
    Tab           → Next block (across lanes: right then down)
    Shift+Tab     → Previous block
    Cmd+A         → Select all blocks in current lane (future)
    ```
  - **Multi-select (future, NOT MVP):** Shift+click for range, Cmd+click for additive. Batch operations apply to all selected blocks. For MVP, single selection is sufficient.
  - **Popover removal:** Delete the entire popover system from the JS. Block clicks go through the left panel inspector (#6) exclusively. The popover was a prototype interaction that's superseded by the sidebar inspector pattern.

- **Sub-problem 10h: Playhead and visual grid alignment**
  - **Problem:** The playhead is a 2px line inside `#stems-container`. It doesn't account for the lane gutter offset (100px) and doesn't extend through section headers or chord lane. Bar seams are per-block (local), not a unified grid.
  - **Decision: Full-height playhead spanning all lanes. Unified bar grid lines.**
  - **Playhead:**
    - Extends from the top of section headers to the bottom of the chord lane. One continuous vertical line through the entire arrangement column.
    - Color: `oklch(var(--p))` (primary theme color) or a distinct red/orange accent for visibility.
    - Width: 2px.
    - The playhead position is calculated relative to the scrollable content area (excluding the sticky gutter).
    - During playback, the scrollable container auto-scrolls to keep the playhead in view (centered or at the 1/3 mark from the left edge).
    - When NOT playing, clicking the bar ruler positions the playhead at that bar.
  - **Unified bar grid:**
    - Vertical grid lines at every bar boundary, drawn as a CSS background or pseudo-elements on the scrollable container.
    - Regular bar lines: 1px, `base-content/8` (very subtle).
    - Section boundary lines: 2px, `base-content/15` (slightly stronger).
    - These lines span from bar ruler through all stem lanes and chord lane.
    - Implementation: a repeating CSS background on the scrollable container, or absolutely positioned dividers:
      ```css
      .arrangement-grid-line {
        position: absolute;
        top: 0; bottom: 0;
        width: 1px;
        background: oklch(var(--bc) / 0.08);
        pointer-events: none;
        z-index: 1;
      }
      .arrangement-grid-line.section-boundary {
        width: 2px;
        background: oklch(var(--bc) / 0.15);
      }
      ```
  - **Playhead position calculation:**
    ```javascript
    function updatePlayheadPosition(currentBar) {
      const barWidth = getBarWidth();
      const gutterWidth = 80; // sticky gutter, not part of calculation
      const position = (currentBar - 1) * barWidth;
      playhead.style.left = position + 'px';
      // Auto-scroll to keep playhead visible during playback
      if (playing) {
        const container = document.getElementById('arrangement-scroll');
        const viewLeft = container.scrollLeft;
        const viewRight = viewLeft + container.clientWidth;
        if (position < viewLeft + 50 || position > viewRight - 50) {
          container.scrollLeft = position - container.clientWidth / 3;
        }
      }
    }
    ```

- **Sub-problem 10i: Transport bar — metronome, count-in, bar position display**
  - **Problem:** The transport bar is missing three features that are CRITICAL for the core use case (musician practicing with a backing track): (1) metronome/click track, (2) count-in before playback, (3) bar position display. Musicians practicing with backing tracks need a click to stay in time. They need a count-in to get ready. They think in bar numbers, not timestamps.
  - **Decision: Add metronome toggle, count-in selector, and bar position to transport.**
  - **Transport layout (post-generation):**
    ```
    ┌──────────────────────────────────────────────────────────────────────────┐
    │ ⏮ ⏪ [▶ PLAY] ⏩ ⏭   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬   Bar 23 │ 1:47 / 3:52      │
    │                   Loop [Chorus▾]  Vol ▬▬▬  [🎵 Click] [Count: 2 bars▾] │
    └──────────────────────────────────────────────────────────────────────────┘
    ```
  - **Metronome / Click track:**
    - Toggle button: `[Click]` or a metronome icon. On/off.
    - When enabled, plays a click on every beat during playback. Sound: a short, unobtrusive woodblock or cowbell sample.
    - Default: OFF. Musicians can enable it for practice.
    - Click volume: independent of master volume. A small additional volume slider appears when click is enabled (or it shares the master volume).
    - MVP simplification: Click plays on every beat (quarter note). No accent pattern (beat 1 vs other beats) for MVP. Future: accent on beat 1, different sounds for downbeat vs upbeat.
    - Implementation: Web Audio API oscillator or short sample triggered by the playback engine at each beat position.
    - **This is the single most important practice feature.** A musician alone with a laptop NEEDS a click to stay in time with the backing track.
  - **Count-in:**
    - Selector: `Count: Off | 1 bar | 2 bars`.
    - When enabled, pressing Play starts a count-in of 1 or 2 bars of clicks before the music begins. The count-in plays at the current tempo and time signature.
    - During count-in: transport shows "Count-in..." instead of the bar number. The playhead doesn't move yet. The scrubber stays at position 0.
    - After count-in completes: music starts, playhead moves, scrubber advances.
    - Default: `1 bar`. Musicians expect at least a bar of count-in.
    - Count-in sound: same as metronome click (with optional accent on beat 1 to mark the start of the bar).
  - **Bar position display:**
    - Currently shows `1:47 / 3:52` (elapsed / total time).
    - Add bar number display BEFORE the time: `Bar 23 | 1:47 / 3:52`.
    - Format: `Bar {currentBar}` where currentBar is calculated from playhead position.
    - If playback is stopped, shows the bar at the current scrubber position.
    - Musicians think in bars, not seconds. "Jump to bar 13" is how they communicate. The bar number must be visible at all times during playback.
  - **Pre-generation:** Transport is hidden entirely (per 10a).
  - **Implementation additions to transport HTML:**
    ```html
    <!-- Bar position (before time display) -->
    <span class="text-xs font-mono font-bold text-base-content" id="bar-display">Bar 1</span>
    <span class="text-base-content/20">|</span>
    <span class="text-xs text-base-content/50 font-mono" id="time-display">0:00 / 3:52</span>

    <!-- Metronome toggle -->
    <button class="btn btn-xs bg-base-100 border-base-300" id="click-toggle"
      title="Metronome click">Click</button>

    <!-- Count-in selector -->
    <div class="flex items-center gap-1">
      <label class="text-[10px] text-base-content/50 uppercase tracking-wider">Count</label>
      <select class="select select-bordered select-xs bg-base-100 min-h-0 h-6" id="count-in">
        <option>Off</option>
        <option selected>1 bar</option>
        <option>2 bars</option>
      </select>
    </div>
    ```

- **Sub-problem 10j: Mixer — collapsible drawer (RESOLVES #2, #5)**
  - **Problem:** The mixer is always visible, consuming significant vertical space (~200px with the current layout). Faders have only ~80px of travel (Issue #2: too short for fine adjustments). S/M buttons are tiny `btn-xs` (Issue #5: hard to click). The mixer can't be bigger without stealing from the arrangement area. But when you NEED the mixer (mixing levels), you want it big. When you DON'T need it (editing blocks), it's wasting space.
  - **Decision: Collapsible mixer drawer. Two states: collapsed (compact inline) and expanded (full mixer).**
  - **Collapsed state (default):**
    - Height: ~36px. A single horizontal row showing: channel name + mini level indicator for each stem + master.
    - Layout:
      ```
      ┌────────────────────────────────────────────────────────────────────┐
      │ [▲ Mixer]  DRUMS ▊▊▊  BASS ▊▊▊▊  PIANO ▊▊▊▊  GTR ▊▊  STR ▊▊  │  MASTER ▊▊▊▊ │
      └────────────────────────────────────────────────────────────────────┘
      ```
    - Each channel shows: name + a tiny horizontal mini-bar (20px wide, indicating relative level). No faders, no S/M, no pan. Just a visual thumbnail of the mix.
    - The `[▲ Mixer]` button/label toggles expansion. Click to expand.
    - S/M quick access in collapsed mode: clicking a channel name toggles mute. Double-clicking toggles solo. This gives quick access without expanding.
  - **Expanded state:**
    - Expands to ~200px height (or more, up to ~280px).
    - Full vertical faders with **minimum 150px travel** (resolves #2).
    - S/M buttons sized at `btn-sm` (~28x28px) (resolves #5). Clear active states: Solo active = solid accent fill. Mute active = channel strip dims to 50% opacity.
    - Pan control: horizontal range slider, 40px wide (larger than current 10px dot).
    - dB display below each fader: `-6dB`, `0dB`, etc.
    - Master channel: separated by a vertical divider, slightly wider (80px vs 64px).
    - `[▼ Mixer]` button to collapse.
  - **Toggle:**
    - Click the mixer header `[▲ Mixer]` / `[▼ Mixer]` label.
    - Keyboard shortcut: `M` to toggle mixer open/close.
    - Animation: smooth slide-up/slide-down transition (200ms ease-out).
  - **When the mixer expands, the arrangement area shrinks.** The arrangement area is `flex-1` so it automatically adjusts. Stem lanes dynamically resize (per 10d) to fill the reduced space.
  - **Mixer footer (always visible in both states):**
    ```
    [+ Add Stem]  Drag to reorder
    ```
    - Export buttons REMOVED per #9l (export lives exclusively in the top bar).
    - `+ Add Stem` opens a dropdown: available instruments not yet in the arrangement.
    - Drag to reorder: mixer channels can be rearranged by dragging. Reordering the mixer also reorders the stem lanes in the arrangement (they stay in sync).
  - **Implementation:**
    ```javascript
    let mixerExpanded = false;

    function toggleMixer() {
      mixerExpanded = !mixerExpanded;
      const mixer = document.getElementById('mixer');
      const toggle = document.getElementById('mixer-toggle');

      if (mixerExpanded) {
        mixer.classList.remove('h-[36px]');
        mixer.classList.add('h-[220px]');
        toggle.textContent = '▼ Mixer';
        showFullMixer();
      } else {
        mixer.classList.remove('h-[220px]');
        mixer.classList.add('h-[36px]');
        toggle.textContent = '▲ Mixer';
        showCompactMixer();
      }
      // Stem lanes auto-resize because they're flex-1
    }
    ```
  - **Resolution of #2:** Expanded mixer has 150px+ fader travel.
  - **Resolution of #5:** Expanded mixer has `btn-sm` S/M buttons (28x28px). Pan knobs replaced with 40px horizontal sliders.

- **Sub-problem 10k: Arrangement toolbar — tool modes, zoom, fit-all**
  - **Problem:** The toolbar currently has `Select | Split` and `- | +` for zoom. It's minimal, which is good, but missing: (1) a fit-all zoom button, (2) a visual indicator of current zoom level, (3) the toolbar doesn't clearly communicate which tool mode is active.
  - **Decision: Refined toolbar with clear active tool state, zoom controls with fit-all, and a bar count display.**
  - **Toolbar layout (post-generation):**
    ```
    ┌──────────────────────────────────────────────────────────────────────────┐
    │ ARRANGEMENT                          [Select|Split]  [− + ⊞]  36 bars  │
    └──────────────────────────────────────────────────────────────────────────┘
    ```
  - **Tool modes:**
    - `Select` (default): left-click selects a block. Cursor: `default`.
    - `Split`: left-click splits a block at the nearest bar boundary. Cursor: `crosshair`. A vertical guide line follows the mouse horizontally, snapping to bar boundaries, showing where the split will occur.
    - Active tool gets `btn-neutral` (solid fill). Inactive tool gets `bg-base-100` (ghost).
    - Keyboard toggle: `V` for select mode, `S` for split mode (matching standard DAW shortcuts).
  - **Zoom controls:**
    - `[-]` zoom out, `[+]` zoom in, `[⊞]` fit all bars in viewport.
    - The `⊞` button (or use text "Fit" if icon unclear) is the new addition. It resets zoom to show all bars.
    - Keyboard: `Cmd+=`, `Cmd+-`, `Cmd+0`.
  - **Bar count display:** `36 bars` — a small read-only label showing the total bar count. Helpful orientation info. Changes if sections are added/removed.
  - **Pre-generation:** Toolbar is hidden (per 10a).

- **COMPLETE ELEMENT-BY-STATE TABLE:**
  ```
  Element              │ Pre-generation         │ Post-generation
  ─────────────────────┼────────────────────────┼────────────────────────
  Arrangement toolbar  │ Hidden                 │ Visible (Select/Split, zoom)
  Section headers      │ Hidden                 │ Visible (clickable, draggable)
  Bar ruler            │ Hidden                 │ Visible (bar numbers, grid)
  Stem lanes           │ Hidden                 │ Visible (dynamic height, fill space)
  Chord lane           │ Hidden                 │ Visible (1 chord per bar)
  Empty state message  │ Visible (centered)     │ Hidden
  Playhead             │ N/A                    │ Visible (full-height, auto-scroll)
  Transport            │ Hidden                 │ Visible (play, metronome, count-in)
  Mixer                │ Hidden                 │ Visible (collapsed default)
  Mixer footer         │ Hidden                 │ Visible (+ Add Stem)
  ```

- **KEYBOARD SHORTCUT SUMMARY (arrangement-focused):**
  ```
  Shortcut              │ Action
  ──────────────────────┼───────────────────────────────────
  Space                 │ Play / Pause
  Escape                │ Deselect → song context
  Delete / Backspace    │ Delete selected block
  D                     │ Duplicate selected block
  V                     │ Select mode
  S (when in toolbar)   │ Split mode
  M                     │ Toggle mixer expanded/collapsed
  ← / →                 │ Select prev/next block in lane
  ↑ / ↓                 │ Select block in adjacent lane
  Tab / Shift+Tab       │ Navigate blocks sequentially
  Cmd+= / Cmd+-         │ Zoom in / out
  Cmd+0                 │ Fit all (zoom reset)
  Cmd+Z / Cmd+Shift+Z   │ Undo / Redo (per #9e)
  Cmd+S                 │ Save (per #9b)
  Cmd+Enter             │ Generate / Regenerate (per #9k)
  ```

- **ISSUES RESOLVED BY THIS SPECIFICATION:**
  - **#2 (Mixer faders too short):** Resolved by collapsible mixer (10j). Expanded state has 150px+ fader travel.
  - **#3 (Empty space in arrangement area):** Resolved by dynamic lane heights (10d). Stem lanes fill all available vertical space.
  - **#4 (Section blocks need more prominence):** Resolved by 44px section headers (10b) with selection states, column highlights, context menus, and add/reorder capability.
  - **#5 (Mixer S/M buttons and pan too small):** Resolved by collapsible mixer (10j). Expanded state has btn-sm S/M buttons and 40px pan sliders.

- **Resolution:** SOLVED. Complete arrangement window specification across pre-generation and post-generation states: 11 sub-problems covering empty state (10a), section headers (10b, resolves #4), bar ruler (10c), stem lane layout (10d, resolves #3), chord lane (10e), horizontal zoom/scroll (10f), selection model and block interactions (10g), playhead and grid (10h), transport enhancements (10i: metronome, count-in, bar display), mixer collapsible drawer (10j, resolves #2 and #5), and toolbar (10k). Full element-by-state table and keyboard shortcut summary documented.

### #11 - Status bar and app chrome: logo, library, streak, status, help, command palette
- **Status:** [x] SOLVED
- **Priority:** Medium
- **Raised by:** Claude (element-by-element audit of both mockups)
- **Description:** A full audit of every interactive element in both mockups revealed 6 elements in the status bar and app chrome with zero specification in the shakedown doc. These are the "meta-UI" — navigation, system status, help, and power-user features that frame the core editing experience. None are core to the editing workflow, but all are interactive elements a user will encounter and wonder "what does this do?"

- **STATUS BAR LAYOUT (current):**
  ```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ Library: 47 tracks   Streak: 12 days   ● Ready   Saved: 2 min ago      │
  │                                                       ? Help   ⌘K      │
  └──────────────────────────────────────────────────────────────────────────┘
  ```

- **Sub-problem 11a: "ARRANGEMENT FORGE" logo — navigation anchor**
  - **Element:** Bold text in the top-left corner of the title bar. Currently static, not interactive.
  - **Problem:** In every SaaS product (Figma, Notion, Google Docs, Linear), the logo/brand in the top-left is a clickable navigation anchor that returns to the dashboard or home view. Users will instinctively click it expecting to go somewhere. Right now it does nothing.
  - **Decision: Logo is clickable. Navigates to the user's library/dashboard. Save-guard if unsaved changes exist.**
  - **Behavior:**
    - Click → if no unsaved changes, navigate directly to the library/dashboard view (the list of all user's tracks).
    - Click → if unsaved changes exist, show confirmation:
      ```
      ┌───────────────────────────────────────────┐
      │ Leave project?                            │
      │                                           │
      │ You have unsaved changes to               │
      │ "Autumn Leaves - Jazz Trio".              │
      │                                           │
      │ [Discard]  [Cancel]  [Save & Leave]       │
      └───────────────────────────────────────────┘
      ```
    - "Save & Leave" saves then navigates. "Discard" navigates without saving. "Cancel" stays in the project.
  - **Visual affordance:** The logo should show `cursor: pointer` and a subtle hover effect (underline or slight color shift) to signal clickability. Not a dramatic effect — it's a navigation anchor, not a call to action.
  - **The library/dashboard view is out of scope for this shakedown** (which covers the project editor). The dashboard is a separate screen that will need its own design. For now, just specify that the logo navigates away from the editor to it.
  - **Implementation:**
    ```javascript
    logo.addEventListener('click', () => {
      if (projectState.unsavedChanges) {
        showLeaveDialog({
          onSaveAndLeave: () => { save('manual'); navigateToLibrary(); },
          onDiscard: () => { navigateToLibrary(); },
          onCancel: () => { /* stay */ }
        });
      } else {
        navigateToLibrary();
      }
    });
    ```

- **Sub-problem 11b: "Library: 47 tracks" — status bar shortcut**
  - **Element:** Text in the status bar showing the user's total track count.
  - **Problem:** Is it clickable? Informational? It duplicates "My Library" from the account dropdown (#9f). Two paths to the same place isn't necessarily bad, but it needs to be intentional.
  - **Decision: Clickable. Same behavior as logo click (11a) — navigates to library with save-guard.**
  - **Why keep it:** The status bar is a quick-glance information row. Showing "47 tracks" gives the user a sense of their growing body of work. Making it clickable is natural — it's an obvious affordance, not a hidden feature. Clicking "Library: 47 tracks" in the status bar is actually MORE discoverable than digging into the account dropdown.
  - **Visual affordance:** `cursor: pointer`, subtle underline or color change on hover. The number `47` should be bold/highlighted (already is in the mockup).
  - **The count updates in real-time:** After generating and saving a new track, the count increments. This creates a satisfying feedback loop — "I just went from 47 to 48 tracks."
  - **Implementation:** Same click handler as logo (11a) — check for unsaved changes, navigate to library.

- **Sub-problem 11c: "Streak: 12 days" — practice engagement metric**
  - **Element:** Text in the status bar showing consecutive days of use.
  - **Problem:** This is a gamification feature with zero specification. What counts as a "day"? Is it clickable? Does it belong in the project editor's status bar at all, or should it live on the dashboard?
  - **Decision: Keep it. Informational only for MVP. Not clickable. Shows consecutive days of meaningful use.**
  - **What counts as a streak day:** The user must open the app AND play back at least one arrangement (hit Play and listen for at least 10 seconds). Just opening the app doesn't count — the intent is to encourage **practice**, not just visiting the site. A day = calendar day in the user's local timezone.
  - **Streak reset:** If a full calendar day passes with no qualifying session, the streak resets to 0. The next qualifying session starts a new streak at 1.
  - **Why in the status bar:** The core use case is solo practice. Seeing "Streak: 12 days" while practicing is a subtle motivator. It's a tiny, non-intrusive text — it doesn't compete with the core editing UI. It whispers "you've been showing up." Removing it to the dashboard means the user only sees it before/after working, not during.
  - **Visual treatment:**
    - `text-base-content/70` — slightly muted but readable.
    - No icon, no flame emoji, no animation. This is NOT Duolingo. It's a quiet, dignified metric for musicians.
    - If streak is 0: show `Streak: —` or hide the streak element entirely (no shame).
    - If streak hits milestones (7, 30, 100 days): no special in-editor fanfare. Save celebrations for the dashboard view.
  - **Not clickable for MVP.** Future: clicking could open a practice history calendar/heatmap modal showing which days the user practiced, total practice time, etc. For now, it's read-only.
  - **Implementation:**
    ```javascript
    // On app load, fetch from user profile
    function updateStreakDisplay(streak) {
      const el = document.getElementById('streak-display');
      if (streak === 0) {
        el.classList.add('hidden'); // hide when 0
      } else {
        el.textContent = 'Streak: ' + streak + ' day' + (streak !== 1 ? 's' : '');
        el.classList.remove('hidden');
      }
    }
    ```

- **Sub-problem 11d: Ready indicator (green dot + "Ready") — system status**
  - **Element:** Colored dot + text in the status bar showing system state.
  - **Problem:** What states does it show? What does it mean for the user? Is it clickable?
  - **Decision: Informational system status with 5 states. Clickable only in Error state.**
  - **States:**
    ```
    State         │ Dot color  │ Text          │ When
    ──────────────┼────────────┼───────────────┼──────────────────────────────
    Ready         │ Green      │ Ready         │ Default. Audio engine loaded.
    Generating    │ Amber      │ Generating... │ AI generation in progress.
                  │ (pulsing)  │               │   Syncs with GENERATE button state.
    Saving        │ Amber      │ Saving...     │ Save operation in progress (brief).
    Error         │ Red        │ Error         │ Generation failed, audio context
                  │            │               │   error, or network issue.
    Offline       │ Gray       │ Offline       │ No network connection. Generation
                  │            │               │   disabled but playback still works.
    ```
  - **Clickable in Error state only:** Clicking "Error" shows a toast or small popover with the error message: "Generation failed: request timed out. Check your connection and try again." Provides enough info for the user to self-diagnose or report the issue.
  - **All other states:** Not clickable. Informational only.
  - **"Playing" is NOT a status bar state.** The transport bar already shows play/pause state clearly. Duplicating it in the status bar would be redundant.
  - **Implementation:**
    ```javascript
    const STATUS_STATES = {
      ready:      { color: 'bg-success',  text: 'Ready',        clickable: false },
      generating: { color: 'bg-warning',  text: 'Generating...', clickable: false,
                    pulse: true },
      saving:     { color: 'bg-warning',  text: 'Saving...',    clickable: false },
      error:      { color: 'bg-error',    text: 'Error',        clickable: true },
      offline:    { color: 'bg-base-300', text: 'Offline',      clickable: false },
    };

    function setSystemStatus(state, errorMsg = null) {
      const config = STATUS_STATES[state];
      statusDot.className = 'w-1.5 h-1.5 rounded-full inline-block ' + config.color;
      if (config.pulse) statusDot.classList.add('animate-pulse');
      statusText.textContent = config.text;
      statusText.style.cursor = config.clickable ? 'pointer' : 'default';
      if (config.clickable && errorMsg) {
        statusText.onclick = () => showErrorToast(errorMsg);
      } else {
        statusText.onclick = null;
      }
    }
    ```

- **Sub-problem 11e: "? Help" — help menu**
  - **Element:** Clickable text in the status bar (has `cursor: pointer`).
  - **Problem:** What does it open? Help is expected in every app but the specifics matter.
  - **Decision: Opens a small dropdown menu with contextual help options.**
  - **Help menu:**
    ```
    ┌──────────────────────────┐
    │ Keyboard Shortcuts  ⌘?  │
    │ Quick Start Guide       │
    │ ──────────────────────── │
    │ Documentation ↗         │
    │ Report an Issue ↗       │
    └──────────────────────────┘
    ```
  - **Keyboard Shortcuts (MVP):** Opens a modal overlay showing all keyboard shortcuts organized by area. This is the most useful help feature for a power-user tool with many shortcuts (#10g lists 15+). The modal is organized in columns:
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
  - **Quick Start Guide (MVP):** A multi-step overlay walkthrough (3-5 steps) that highlights UI areas: "This is where you input chords" → "Set your style here" → "Hit Generate" → "Click blocks to edit" → "Use the mixer to adjust levels." Shows once for new users, accessible anytime from Help.
  - **Documentation ↗:** Opens external docs URL in a new tab. Denoted with `↗` to indicate external link.
  - **Report an Issue ↗:** Opens external issue tracker or feedback form in a new tab.
  - **Keyboard shortcut to open Help:** `Cmd+?` or `Cmd+/` (standard help shortcut in many apps).
  - **Implementation:** DaisyUI `dropdown dropdown-top dropdown-end` (opens upward from the status bar).

- **Sub-problem 11f: `Cmd+K` — command palette**
  - **Element:** `<kbd>` hint in the far right of the status bar. Implies a keyboard shortcut that does something significant.
  - **Problem:** Command palettes (VS Code, Figma, Notion, Linear) are powerful search-and-execute interfaces. If `Cmd+K` is a command palette, it's a major feature. If it's something simpler, the `kbd` hint overpromises.
  - **Decision: `Cmd+K` opens a command palette. Design it for MVP but implement it as a post-MVP enhancement. For MVP, `Cmd+K` opens the Keyboard Shortcuts modal (same as `? Help > Keyboard Shortcuts`).**
  - **Why defer the full palette:** A real command palette requires indexing every action in the app, fuzzy search, keyboard-navigable results, and action execution. That's a significant engineering effort. The MVP priority is the core loop: input → generate → edit → play → export. A command palette is a power-user optimization, not a core feature.
  - **MVP behavior:** `Cmd+K` opens the Keyboard Shortcuts modal (11e). The `kbd` hint stays in the status bar to build muscle memory. Post-MVP, the same shortcut upgrades to the full palette — no user retraining needed.
  - **Post-MVP command palette design (documented for future):**
    - `Cmd+K` opens a centered search bar overlay (like Spotlight / Figma quick actions).
    - User types → fuzzy match against command list → arrow keys to navigate → Enter to execute.
    - Command categories:
      ```
      Navigation:
        "Go to bar 13"           → scroll arrangement to bar 13, place playhead
        "Select Chorus"          → select Chorus section header
        "Select Guitar bar 13"   → select that specific block

      Actions:
        "Solo drums"             → toggle solo on drums
        "Mute guitar"            → toggle mute on guitar
        "Split selected block"   → split the currently selected block
        "Regenerate Verse 2"     → trigger section regeneration

      Settings:
        "Set key to C"           → change key (with transpose dialog if post-gen)
        "Set tempo to 140"       → change tempo
        "Switch to Roman numerals" → toggle chord display

      File:
        "Export MP3"             → trigger MP3 export
        "Export stems"           → trigger stems ZIP export
        "Save"                   → manual save
        "New project"            → create new (with save guard)
      ```
    - Search is fuzzy: typing "sol dru" matches "Solo drums". Typing "exp mp" matches "Export MP3".
    - Most recent / most used commands appear first when the palette opens with no query.
    - Escape or clicking outside closes the palette.
  - **The `kbd` hint in the status bar:**
    - Always visible. Right-aligned. `<kbd class="kbd kbd-xs">⌘K</kbd>`
    - Serves as discoverability for the shortcut. New users see it and learn "there's a keyboard shortcut for something here."
    - Tooltip on hover: "Command palette" (post-MVP) or "Keyboard shortcuts" (MVP).
  - **Implementation (MVP):**
    ```javascript
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        showKeyboardShortcutsModal(); // MVP: same as Help > Keyboard Shortcuts
      }
    });
    ```

- **COMPLETE STATUS BAR SPECIFICATION:**
  ```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ Library: 47 tracks   Streak: 12 days   ● Ready   Saved: 2 min ago      │
  │ [clickable→library]  [read-only]       [status]  [from #9b]            │
  │                                                       ? Help   ⌘K      │
  │                                                    [dropdown] [shortcut]│
  └──────────────────────────────────────────────────────────────────────────┘

  Element              │ Clickable? │ Behavior
  ─────────────────────┼────────────┼──────────────────────────────────
  Library: N tracks    │ Yes        │ Navigate to library (save guard)
  Streak: N days       │ No (MVP)   │ Read-only. Hidden if streak=0.
  ● Ready/status       │ Error only │ 5 states. Error shows details.
  Saved: ...           │ No         │ From #9b. Updates on save events.
  ? Help               │ Yes        │ Dropdown: shortcuts, guide, docs
  ⌘K                   │ Yes (kbd)  │ MVP: shortcuts modal. Post-MVP:
                       │            │  full command palette.
  ```

- **Resolution:** SOLVED. Six sub-problems covering all previously unspecified interactive elements: logo navigation with save-guard (11a), library link shortcut (11b), practice streak metric (11c), system status indicator with 5 states (11d), help dropdown menu (11e), and command palette design with MVP/post-MVP phasing (11f). Complete status bar element table documented.

---

## Discussion Notes

### 2026-03-02 - Stem Lane Rethink (Issue #1) - RESOLVED

**Context:** Since MVP uses MIDI data (not generated audio), the stem lanes need to represent musical data the user can see, understand, and modify - not audio waveforms.

**Iteration 1 - Piano-roll approach (SUPERSEDED):**
- Claude proposed piano-roll blocks + expandable notation strips
- DP accepted initially but refined: lanes must be instrument-aware (drums ≠ pitched)
- Implemented in mockup v2 with piano-roll for pitched, hit-grid for drums

**Iteration 2 - Bar-level block sequencer (FINAL ANSWER):**
- DP realized piano-roll is wrong paradigm. Users aren't editing individual notes.
- The fundamental unit is the BAR, not the note.
- All lanes same height. No pitch axis. Horizontal strip of bar-sized blocks.
- Split tool to divide blocks at bar boundaries.
- Click a bar-block to open and edit its properties.
- Each instrument type has different properties per bar:
  - Drums → pattern/style
  - Bass → note + playing style
  - Piano → chord + voicing/comping style
  - Guitar → chord + strumming/picking style
  - Strings → chord + texture style
- AI handles note-level generation; user controls chord/note + style at bar level.
- This is a BLOCK SEQUENCER, not a DAW.

**Alignment:** Confirmed. This is the correct paradigm for the product.

### 2026-03-02 - Left Sidebar Rethink (Issue #6) - RESOLVED

**Context:** After implementing the block sequencer (#1), it became clear the left sidebar content (INPUT, STYLE CONTROLS, AI ASSISTANT) is almost entirely song-level. Post-generation, the INPUT area is dead weight. Style controls only apply globally. The sidebar doesn't adapt to what the user is actually doing.

**The problem:**
- User generates a song → INPUT panel served its purpose, now it's just sitting there
- User clicks a bar-block to edit it → style controls still show song-level values, not bar-block properties
- User wants to tweak Verse 2 energy → has to use AI chat with text commands instead of just adjusting a slider
- The left panel doesn't earn its real estate after the initial generation step

**Decision - Property inspector pattern (FINAL ANSWER):**
- The left panel dynamically shows properties for the current selection
- Three context levels: Song (nothing selected) → Section (header clicked) → Bar-block (block clicked)
- Style values cascade: Song defaults → Section overrides → Bar-block overrides
- Inherited values visually distinct from explicitly set values (dim vs bold)
- AI chat persists globally with per-message scope badges
- INPUT collapses to read-only summary post-generation, expandable via "Edit Source"
- Breadcrumb navigation at top: `Song > Verse 2 > Bass bar 7`
- Regenerate button adapts: "Regenerate Song" / "Regenerate Verse 2" / "Regenerate Bar 7"

**Why this matters for implementation:**
- The style inheritance cascade directly feeds the AI generation model. When regenerating a section, the AI reads the resolved style values (inherited + overrides) for that scope.
- The property inspector is the primary post-generation editing interface. The arrangement area (right) is for *selection* and *overview*; the left panel is for *inspection* and *editing*.
- This pattern scales naturally: adding new instrument types or style parameters just means adding fields to the appropriate inspector level.

**Alignment:** Confirmed. This is the correct design for the left panel.

### 2026-03-02 - Chord Notation System (Issue #7) - RESOLVED

**Context:** Issue #6 established that clicking a Piano or Guitar bar-block opens a property inspector in the left panel showing chord + style. But the question arose: how should chords be displayed and edited? Musicians use two systems — letter names (C, Dm7) and Roman numerals (ii7, V7) — and the product needs to handle both.

**The design tension:**
- Showing both simultaneously is clutter. Two labels per chord everywhere = visual noise.
- Forcing one system alienates the other group. Jazz theory students think in Roman numerals. Working gigging musicians read letter names off lead sheets.
- The internal data model has architectural implications: if you store letter names, transposition requires rewriting every chord. If you store Roman numerals, transposition is just a key change.

**Decision - Internal Roman numerals + togglable display (FINAL ANSWER):**
- Store all chords as Roman numeral degree + quality relative to the song key
- Global display toggle: letter mode or Roman mode, applied everywhere (chord lane, block labels, inspector, input summary)
- Input field accepts either system regardless of display mode — the parser resolves both
- Transposition = change the key, letter names recalculate, Roman numerals stay the same
- Non-diatonic chords use explicit alterations (bII7, #IV, etc.)

**Why this matters for implementation:**
- The chord data model is one of the first things that gets built. Getting the internal representation right (Roman + key) avoids a painful migration later when transposition is added.
- The display toggle is a thin UI layer on top of the data model — a `formatChord(chord, key, mode)` function. Easy to implement, easy to test.
- Input parsing (accepting "Dm7" or "ii7" and resolving both) is a discrete module that can be built and tested independently.

**Alignment:** Confirmed. Roman numeral internal model with togglable display.

### 2026-03-02 - Status Bar and App Chrome (Issue #11) - RESOLVED

**Context:** After completing the arrangement window shakedown (#10), a full element-by-element audit of both mockups was performed to verify complete coverage. Every button, dropdown, slider, input, and clickable element was checked against the shakedown doc. The audit revealed 6 elements — all in the status bar and app chrome — with zero specification.

**The meta-UI layer:** These elements frame the core editing experience. They're not part of the main workflow (input → generate → edit → play → export), but they're the first and last things a user interacts with in a session: navigating to/from the editor, checking system health, getting help, and discovering power-user features.

**Key decisions:**
- **Logo (ARRANGEMENT FORGE):** Clickable, navigates to library/dashboard. Save-guard dialog if unsaved changes. This is the escape hatch from the project editor.
- **Library: N tracks:** Clickable, same navigation as logo. The track count is a growth metric — watching it increment is satisfying.
- **Streak: N days:** Informational only for MVP. Measures consecutive days of actual practice (played back an arrangement for 10+ seconds). Hidden when 0. No gamification theatrics — just a quiet number. Befitting a tool for musicians, not a slot machine.
- **Ready indicator:** 5 states (Ready/Generating/Saving/Error/Offline). Error state is clickable to show details. Generating syncs with GENERATE button. Offline disables generation but not playback.
- **? Help:** Dropdown with Keyboard Shortcuts modal (critical for a tool with 15+ shortcuts), Quick Start Guide, and external links. Shortcut: `Cmd+?`.
- **Cmd+K:** Aspirational. The `kbd` hint signals "power user feature here." MVP: opens Keyboard Shortcuts modal. Post-MVP: upgrades to full command palette (fuzzy search over all app actions). Same shortcut, seamless upgrade path.

**Why the streak design matters:**
The streak is a deliberate product design choice rooted in the MVP's core use case: solo practice. The user is a musician alone with a laptop. They need to build a practice habit. A quiet streak counter — not flashy, not gamified, just "you've shown up for 12 days" — is the gentlest possible nudge. It respects the user's intelligence and motivation. If it were a blazing flame icon with confetti, it would be patronizing. A small number in the status bar is dignified.

**Alignment:** All 6 elements now fully specified. The audit confirms that every interactive element in both mockups has a corresponding shakedown specification.

### 2026-03-02 - Arrangement Window Shakedown (Issue #10) - RESOLVED

**Context:** After shaking down the left panel (#6, #8) and top bar (#9), the remaining unexamined area was the entire right panel — the arrangement window. This is the primary visual workspace where the user sees, selects, and manipulates their arrangement. It also contained all four remaining open issues (#2-5). DP asked to shake it down in both states: pre-generation (no song yet) and post-generation (full arrangement populated).

**Problems found (11 sub-problems):**
1. Pre-gen empty state shows disabled transport/mixer/toolbar — dead chrome that distracts from the left panel
2. Section headers too small and lacking interaction features (add, delete, reorder, context menu)
3. No bar ruler or bar numbers anywhere — musicians can't orient themselves
4. Stem lanes fixed at 40px while 200px+ of space goes unused below them
5. Chord lane has wrong number of cells (12 instead of 36) and doesn't align bar-for-bar with lanes above
6. No horizontal zoom or scroll — fails for longer songs, labels truncated
7. Two conflicting interaction models (inline popovers vs left panel inspector)
8. Playhead doesn't span full arrangement height, no unified bar grid
9. Transport missing critical practice features: metronome, count-in, bar position display
10. Mixer always visible at fixed height — too short for fine mixing, too tall for editing
11. Toolbar missing zoom-fit-all button and clear tool state indication

**The core insight — two fundamentally different states:**
- Pre-generation: the arrangement window is a BLANK CANVAS. The user's focus is on the left panel. All arrangement controls should be hidden to reduce noise and keep focus on input/style/generate.
- Post-generation: the arrangement window is the PRIMARY WORKSPACE. All controls materialize. The user's focus shifts from left (setup) to right (editing/playback). The transition should feel like "your arrangement just came to life."

**Key decisions:**
- Hide everything pre-gen (toolbar, sections, lanes, transport, mixer). Show only the empty-state message.
- Section headers: 44px tall (from ~30px), with selection states, column highlights, right-click context menu, add button, drag-to-reorder.
- NEW bar ruler with numbered bars. Thin (20px), unobtrusive, but always present post-gen.
- Stem lanes dynamically fill available height (flex-1). No more fixed h-10. On typical viewport: ~90px per lane vs 40px previously.
- Chord lane: one cell per bar (36 bars = 36 cells), aligned with stem lane grid. Repeat chords show `%`.
- Horizontal zoom with 6 levels (1x fit-all through 4x). Scroll syncs across sections/ruler/lanes/chords. Lane gutter is sticky-left.
- Inline popovers removed. Left panel inspector (#6) is the sole editing interface. Right-click context menus for quick actions.
- Playhead spans full arrangement height. Unified bar grid lines at bar boundaries. Auto-scroll during playback.
- Transport: metronome click toggle, count-in (Off/1 bar/2 bars), bar number display alongside timestamp. These are CRITICAL for the solo-practice use case.
- Collapsible mixer drawer: collapsed (36px, compact inline) for editing; expanded (~220px, full faders) for mixing. Resolves fader height (#2) and button size (#5).
- Toolbar: Select/Split modes with clear active state, zoom in/out/fit-all, bar count display.

**Why this matters for implementation:**
- The pre/post-gen state switch is a major UI state transition. Needs a clean `showPostGenUI()` / `showPreGenUI()` function that toggles visibility of all arrangement elements.
- Dynamic lane heights mean blocks and labels must render at variable heights. Block label CSS needs to handle both compact (36px min) and spacious (100px+) configurations.
- Horizontal zoom is a scrollable container problem. Section headers, bar ruler, stem lanes, and chord lane must all be inside the same horizontally-scrollable parent, with a sticky gutter outside the scroll area.
- The metronome/count-in are audio engine features, not just UI — they need to integrate with the Web Audio API playback system.
- The collapsible mixer changes the arrangement area height dynamically. Since stem lanes are flex-1, this works automatically, but needs testing at edge cases (many stems + expanded mixer = very short lanes).

**Alignment:** Confirmed. This resolves all remaining open issues (#2-5) and adds critical missing features (bar ruler, metronome, count-in, horizontal zoom, collapsible mixer).

### 2026-03-02 - Left Panel Reactive Data Flow (Issue #8) - RESOLVED

**Context:** During shakedown of the pre-generation mockup (mockup.html), DP asked "how should all the elements on the left panel work together?" This triggered a deep review of every control and its relationships.

**Problems found (7 total):**
1. STYLE and FEEL in the top bar duplicate Genre + Sub-style + Energy in the left panel
2. Genre and Sub-style dropdowns are independent — no cascade
3. Swing % shows for genres where it's meaningless
4. Description textarea and structured controls can conflict — no source of truth
5. "AI" tab inside INPUT is redundant with the AI Assistant panel
6. AI Assistant is disabled pre-generation, missing the biggest opportunity
7. Chord Display toggle is orphaned between Style Controls and AI Assistant

**The core insight — reactive data flow:**
- DP intuited this as "event-driven" — when you change one element, others should respond.
- The left panel is not a static form. It's a reactive system where controls have dependencies.
- Genre constrains Sub-style options and slider visibility.
- The description textarea is a convenience parser, not a parallel source of truth.
- The AI Assistant is a universal command line that can read/write any control.
- GENERATE collects the resolved state of all controls into a single generation request.

**Decision — full reactive redesign (FINAL ANSWER):**
- Top bar: Key, Chord Display toggle, Tempo, Time Sig, GENERATE. Nothing else.
- Left panel STYLE CONTROLS: Genre → Sub-style (cascade), Energy, Groove, Swing % (genre-dependent), Dynamics
- Description → auto-populates unset controls via keyword parser, then controls are source of truth
- INPUT tabs: Text / Upload / Image (no AI tab)
- AI Assistant: always active, can read/write all controls pre- and post-generation
- Chord Display toggle: moved to top bar next to KEY

**Why this matters for implementation:**
- The reactive cascade (Genre→Sub-style, Genre→sliders) is a state management problem. Needs a simple event system or reactive store. Even vanilla JS `dispatchEvent`/`addEventListener` works.
- The description parser is a standalone module: `parseDescription(text) → { genre?, substyle?, energy?, ... }`. Testable independently.
- The AI Assistant's ability to write controls means the AI response handler needs a `setControl(name, value)` API that triggers the same reactive cascade as manual user changes.
- The GENERATE button's state collector needs to walk all controls and build the generation request object. This is the single point where all reactive state gets serialized.

**Alignment:** Confirmed. This is the correct reactive design for the pre-generation left panel.

---

## Audio Quality Research

### Browser MIDI/Sample Playback Ceiling
- **Status:** [x] Researched
- **Question:** What is the ceiling for audio quality when triggering samples via MIDI in the browser?
- **Findings:**
  - Web Audio API supports 48kHz sample rate natively (most browsers)
  - 32-bit float internal processing
  - Latency: 5-20ms achievable with proper AudioContext buffer sizing
  - Quality ceiling = quality of loaded samples (multi-sampled instruments with velocity layers and round-robins can sound professional/studio-grade)
  - Main constraint: memory. Full multi-sampled piano = 200-500MB. Need smart loading strategy (lazy load, stream, or use lighter sample sets)
  - **Bottom line:** MIDI + browser samples is NOT a compromise - can sound excellent. Functionally correct is achievable for MVP.

---

## Changelog

| Date | Change | Issues affected |
|------|--------|-----------------|
| 2026-03-02 | Initial mockup created and served on port 8770 | - |
| 2026-03-02 | First screenshot review, identified issues #1-5 | #1-5 |
| 2026-03-02 | Decided on stem lane approach: piano-roll + instrument-aware + expandable notation | #1 |
| 2026-03-02 | SUPERSEDED piano-roll. Final answer: bar-level block sequencer with style metadata per instrument | #1 |
| 2026-03-02 | Left sidebar redesign: context-aware property inspector with three levels (song/section/bar-block), style inheritance cascade, AI scope badges | #6 |
| 2026-03-02 | Chord notation: internal Roman numeral model, togglable letter/Roman display, input accepts both, transposition = key change | #7 |
| 2026-03-02 | Upgraded #2-5 with implementation notes and dependencies | #2-5 |
| 2026-03-02 | Reactive data flow redesign: 7 sub-problems (top bar consolidation, Genre cascades, description parser, AI tab removal, pre-gen AI assistant, chord toggle relocation) | #8 |
| 2026-03-02 | Top bar specification: 13 sub-problems (project name, save, export, share, undo/redo, account, key, chord display, tempo, time sig, generate states, export consolidation, context rule) | #9 |
| 2026-03-02 | Arrangement window shakedown: 11 sub-problems (empty state, section headers, bar ruler, lane layout, chord lane, zoom/scroll, selection model, playhead/grid, transport enhancements, collapsible mixer, toolbar). Resolves #2, #3, #4, #5 | #10, #2, #3, #4, #5 |
| 2026-03-02 | Full element audit of both mockups. Status bar and app chrome: 6 sub-problems (logo navigation, library link, streak, system status, help menu, command palette). 100% interactive element coverage achieved | #11 |
