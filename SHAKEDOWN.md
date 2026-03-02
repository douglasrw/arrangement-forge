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
- **Status:** [ ] Open
- **Priority:** Medium
- **Raised by:** Claude (screenshot review)
- **Description:** Mixer faders are vertically compressed, hard to use for fine adjustments. Need more height.
- **Decision:** TBD
- **Resolution:**

### #3 - Empty space in arrangement area
- **Status:** [ ] Open
- **Priority:** Medium
- **Raised by:** Claude (screenshot review)
- **Description:** Large gap between chord lane and transport bar. Wasted space that could make stem lanes taller or be used for additional info.
- **Decision:** TBD
- **Resolution:**

### #4 - Section blocks need more prominence
- **Status:** [ ] Open
- **Priority:** Low
- **Raised by:** Claude (screenshot review)
- **Description:** Section headers (Intro/Verse/Chorus etc.) are small and only "Intro" looks selected. Need to be taller and more visually distinct.
- **Decision:** TBD
- **Resolution:**

### #5 - Mixer S/M buttons and pan knobs too small
- **Status:** [ ] Open
- **Priority:** Low
- **Raised by:** Claude (screenshot review)
- **Description:** Solo/Mute buttons and pan control dots in the mixer strip are very small and hard to see.
- **Decision:** TBD
- **Resolution:**

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
