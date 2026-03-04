> **ARCHIVED — SUPERSEDED (2026-03-04)**
> The YouTube transcript workflow has changed significantly since this spec was written.
> The yt-transcript skill and engineering-coach integration were implemented manually
> outside this spec's formal workflow. The migration from .txt to .md format with
> frontmatter was done directly. This spec no longer reflects the current state of
> the transcript pipeline.

---

# YouTube Transcript Learning Pipeline

> Execution queue — 2 tasks, estimated ~1 hour total

## Pre-flight Checklist

- [ ] Read this entire spec before starting any task
- [ ] Verify `~/youtube_transcripts/` can be created
- [ ] Verify `~/.claude/skills/yt-transcript/` exists with SKILL.md and scripts/
- [ ] Verify `~/.claude/skills/engineering-coach/SKILL.md` exists

## Agent Protocol

- Execute tasks sequentially (T2 depends on T1's format decisions)
- After each task: run verification steps before marking complete
- Do NOT modify any project-specific files (CLAUDE.md, ARCHITECTURE.md) — this is cross-project infrastructure
- Commit skill changes to the claude-config repo after both tasks pass

## Context

### Problem Statement

The user watches YouTube videos about AI engineering, software architecture, and development practices. Currently, transcripts are downloaded as plain `.txt` files into whichever project directory happens to be active. There is no way to:
- Attach the user's notes/reactions to a transcript
- Discover unprocessed transcripts across projects
- Analyze a transcript's ideas against a specific project's context
- Track whether insights from a video have been applied

### Current State

- **yt-transcript skill** at `~/.claude/skills/yt-transcript/` — downloads transcripts via yt-dlp, saves as `.txt` to `transcripts/` relative to cwd
- **engineering-coach skill** at `~/.claude/skills/engineering-coach/` — has artifact tracking but no transcript awareness
- **2 existing transcripts** in `/data/projects/arrangement-forge/transcripts/` that need migration
- **`~/youtube_transcripts/`** does not exist yet

### Target State

A two-phase pipeline:
1. **Capture** (yt-transcript skill): Download transcript to `~/youtube_transcripts/`, convert to `.md` with frontmatter, prompt user for notes
2. **Apply** (engineering-coach skill): Discover unprocessed transcripts on session start, offer triage (analyze/skip/archive), produce project-specific analysis docs that enter normal artifact lifecycle

### Constraints

- **Must** work for any current and future project — transcript storage is global (`~/youtube_transcripts/`), analysis output is project-local
- **Must** not require the user to remember which transcripts they've processed — the coach surfaces this automatically
- **Must** preserve the existing yt-dlp download pipeline (bash script) — only change the output handling
- **Must not** add cross-project state to transcript files (no `applied_in` tracking in frontmatter) — each project tracks independently via its own ARTIFACT_TRACKER.md
- **Must not** break existing engineering-coach functionality — transcript discovery is additive
- **Must** handle the two existing `.txt` transcripts (migrate to new format)
- **Preference:** Keep the bash script changes minimal — do metadata/comments handling in the SKILL.md instructions (Claude's behavior), not in bash

---

## Delegation Strategy

### File Overlap Map

| File | T1 | T2 |
|---|---|---|
| `~/.claude/skills/yt-transcript/SKILL.md` | **write** | — |
| `~/.claude/skills/yt-transcript/scripts/yt-transcript.sh` | **write** (minor) | — |
| `~/.claude/skills/engineering-coach/SKILL.md` | — | **write** |
| `~/youtube_transcripts/*.md` | **write** (migration) | read |

### Batch Assignments

- **Batch 1:** T1 only (skill changes + migration)
- **Batch 2:** T2 only (coach changes) — depends on T1's file format being finalized

---

## Task Queue

### T1: Update yt-transcript skill + migrate existing transcripts

**Background:** The yt-transcript skill currently saves plain `.txt` files to a project-relative `transcripts/` directory. It needs to save `.md` files with frontmatter to a global `~/youtube_transcripts/` directory, and prompt the user for notes after download.

**What to build:**

1. Update the bash script (`scripts/yt-transcript.sh`):
   - Change output file extension from `.txt` to `.md`
   - That's it — the script stays simple. All metadata handling happens in SKILL.md.

2. Update `SKILL.md` with these changes:
   - **Output directory:** Change from `transcripts` (relative) to `~/youtube_transcripts` (absolute). Create the directory if it doesn't exist.
   - **Script invocation:** `bash ~/.claude/skills/yt-transcript/scripts/yt-transcript.sh "<URL>" "$HOME/youtube_transcripts" "<lang>"`
   - **Post-download processing (new step):** After the script succeeds and Claude reads the `.md` file, Claude must:
     a. Read the raw file content
     b. Rewrite it as markdown with frontmatter:
        ```markdown
        ---
        title: "<video title>"
        url: <youtube URL>
        channel: "<channel name>"
        duration: "<MM:SS>"
        date: <YYYY-MM-DD>
        status: active
        ---

        ## Transcript

        <transcript paragraphs>

        ## My Notes

        <user's comments, or empty if none provided>
        ```
     c. Write the reformatted file back to the same path
   - **Comments prompt (new step):** After reformatting and summarizing, ask the user: "Any notes or comments on this video?" using AskUserQuestion with options:
     - "Yes, let me paste my notes" — wait for user input, append under `## My Notes`
     - "No notes right now" — leave `## My Notes` empty (user can add later)
     - "I'll add notes later" — same as above, but mention they can paste notes in any future session by saying "add notes to [video name]"
   - **Summary output:** After all processing, report: title, channel, duration, word count, file path, and a concise summary. Same as current behavior but with the new path.

3. **Add a "add notes" subcommand:** If the user says `/yt-transcript add notes to [video name]` or similar, the skill should:
   - Search `~/youtube_transcripts/` for matching filename
   - Read the file, show the current `## My Notes` section
   - Let the user paste additional notes
   - Append to the `## My Notes` section

4. **Migrate existing transcripts:**
   - Create `~/youtube_transcripts/` directory
   - Read each `.txt` file in `/data/projects/arrangement-forge/transcripts/`
   - Convert to `.md` with frontmatter (extract title, URL, channel, duration from the header block in each .txt file)
   - Write to `~/youtube_transcripts/` with the `.md` extension
   - Leave the originals in place (don't delete — user can clean up manually)

**Steps:**

1. Create `~/youtube_transcripts/` directory
2. Edit `scripts/yt-transcript.sh` — change `.txt` extension to `.md` on the output filename line
3. Rewrite `SKILL.md` with updated output dir, post-download processing, comments prompt, and add-notes subcommand
4. Migrate the 2 existing transcripts from `/data/projects/arrangement-forge/transcripts/` to `~/youtube_transcripts/` in the new format
5. Run verification

**Verify:**

- [ ] `~/youtube_transcripts/` exists
- [ ] Both migrated transcripts exist as `.md` files with valid frontmatter (title, url, date, status fields present)
- [ ] SKILL.md references `~/youtube_transcripts` as output dir
- [ ] Script outputs `.md` not `.txt`
- [ ] SKILL.md includes the comments prompt step
- [ ] SKILL.md includes the add-notes subcommand

---

### T2: Update engineering-coach with transcript discovery and analysis

**Background:** The engineering-coach skill has artifact lifecycle tracking and session-start surfacing, but no awareness of YouTube transcripts. It needs to discover unprocessed transcripts in `~/youtube_transcripts/` and offer a triage + analysis workflow within any project.

**What to build:**

1. **Add a new section to SKILL.md** titled "YouTube Transcript Integration" (place after Artifact Lifecycle Tracking, before Reference Files). Contents:

   **Transcript Discovery:**
   - On session start (or when user asks for status/catch-up), scan `~/youtube_transcripts/` for `.md` files with `status: active` in frontmatter
   - Compare against the current project's `ARTIFACT_TRACKER.md` — a transcript is "unprocessed" if it doesn't appear in any section of the tracker
   - Surface count: "You have N unprocessed transcripts" (list titles)
   - This happens as part of the existing reconciliation protocol — add transcript scan as step 2b, after filesystem cross-check and before surfacing

   **Triage Workflow:**
   When the user wants to process transcripts, present each unprocessed one with options:
   - **"Analyze"** → enters the analysis workflow (below)
   - **"Not relevant to this project"** → add to ARTIFACT_TRACKER.md under a new "Skipped Transcripts" section with the filename, so it won't be surfaced again in this project. (Other projects still see it as unprocessed.)
   - **"Archive"** → set `status: archived` in the transcript's frontmatter. Won't be surfaced in any project. (For videos the user has fully absorbed without needing formal analysis.)

   **Analysis Workflow:**
   When the user chooses "Analyze" for a transcript:
   1. Spawn a research agent to read the transcript + user's notes + the current project's CLAUDE.md and ARCHITECTURE.md (or equivalent project context files)
   2. The agent produces an analysis document saved to the project (e.g., `specs/analysis-<video-slug>.md` or `research/analysis-<video-slug>.md` — follow the project's existing convention)
   3. Analysis document format:
      ```markdown
      # Analysis: <Video Title>

      **Source:** ~/youtube_transcripts/<filename>.md
      **Analyzed:** <date>
      **Project:** <project name>

      ## Project-Specific Insights

      <How the ideas in this video apply to this project. Reference specific
      files, patterns, architecture decisions. Be concrete — "the approach
      to X described at 14:30 maps to our Y problem in Z file.">

      ## Actionable Items

      <Concrete next steps, if any. These may become specs via normal
      planning workflow.>

      ## General Insights

      <Ideas from this video that apply beyond this project. Candidate for
      MEMORY.md, skill updates, or template improvements. Keep to 1-2
      paragraphs.>
      ```
   4. Add the analysis doc to the project's ARTIFACT_TRACKER.md under "Research" (or "Needs Review" if it contains actionable items)
   5. If the user then says "turn item X into a spec" — that's a normal planning mode transition, no special handling needed

   **On-demand analysis:**
   The user can also explicitly request analysis at any time: "analyze the video about X" or "apply that Stripe agents video to this project." The coach should:
   - Search `~/youtube_transcripts/` for matching filename/title
   - Run the analysis workflow above
   - This works even if the transcript was previously triaged as "not relevant" — the user is overriding that

2. **Update the session-start surfacing / reconciliation protocol:**
   Add to the existing reconciliation steps (between step 2 and step 3):
   > **2b. Scan YouTube transcripts.** Read `~/youtube_transcripts/*.md` frontmatter. For each file with `status: active`, check if its filename appears anywhere in the current project's ARTIFACT_TRACKER.md (in any section, including Skipped Transcripts). Files not found are "unprocessed." Include the count in the surfacing output (step 4).

3. **Update the ARTIFACT_TRACKER.md maintenance table:**
   Add row:
   | Coach activity | Tracker update |
   |---|---|
   | Transcript triaged as "not relevant" | Add to Skipped Transcripts |
   | Transcript analyzed | Add analysis doc to Research or Needs Review |

**Steps:**

1. Read the current SKILL.md fully
2. Add the "YouTube Transcript Integration" section with all three subsections (Discovery, Triage, Analysis)
3. Update the reconciliation protocol to include transcript scanning (step 2b)
4. Update the maintenance table with transcript-related rows
5. Run verification

**Verify:**

- [ ] SKILL.md contains "YouTube Transcript Integration" section
- [ ] Reconciliation protocol includes transcript scan step
- [ ] Triage workflow has three options: analyze, skip, archive
- [ ] Analysis workflow specifies: agent delegation, output format, tracker integration
- [ ] Maintenance table includes transcript rows
- [ ] No changes to existing engineering-coach functionality (artifact tracking, planning, coaching, review modes all untouched)
- [ ] The design is project-agnostic — works for any project with an ARTIFACT_TRACKER.md

---

## Completion Check

After both tasks:

- [ ] T1: yt-transcript skill saves to `~/youtube_transcripts/` as `.md` with frontmatter
- [ ] T1: Skill prompts for user notes after download
- [ ] T1: 2 existing transcripts migrated to new format
- [ ] T2: Engineering coach discovers unprocessed transcripts on session start
- [ ] T2: Triage workflow (analyze/skip/archive) is documented
- [ ] T2: Analysis workflow produces project-specific doc with general insights paragraph
- [ ] Cross-project: same transcript can be independently analyzed in different projects
- [ ] No project-specific files modified (CLAUDE.md, ARCHITECTURE.md untouched)

## Intent Trace

### Structural
- "Transcripts go to a global directory" → T1 changes output dir to `~/youtube_transcripts/`
- "Ask for comments after download" → T1 adds comments prompt to SKILL.md
- "Coach discovers new transcripts" → T2 adds scan to reconciliation protocol
- "Triage so it doesn't become noise" → T2 adds three-option triage + Skipped Transcripts section
- "Analysis stays in the project" → T2 specifies output path in project directory
- "Tracked through artifact lifecycle" → T2 wires analysis docs into ARTIFACT_TRACKER.md
- "Works for any project" → No project-specific code; all logic in cross-project skills

### Behavioral
1. User downloads a video transcript → file appears in `~/youtube_transcripts/` with frontmatter → user is asked for notes → notes are saved in the file
2. User opens a different project, invokes EC → coach reports "1 unprocessed transcript" → user says "analyze it" → coach reads transcript + notes + project context → produces analysis doc in the project → doc appears in ARTIFACT_TRACKER.md
3. User opens a third project, invokes EC → same transcript shows as unprocessed (independent tracking) → user says "not relevant" → transcript added to Skipped Transcripts → never surfaced again in this project

## Archive

When complete:
1. `git add` and commit skill changes in `~/claude-config/`
2. Move this spec to `specs/historical/youtube-transcript-pipeline.md`
3. Update ARTIFACT_TRACKER.md: move from Ready to Execute → Recently Completed
