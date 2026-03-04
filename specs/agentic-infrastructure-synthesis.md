# Agentic Infrastructure Synthesis

**Source material:**
- Video 1: "You Don't Need SaaS. The $0.10 System That Replaced My AI Workflow" (Nate B Jones)
- Video 2: "I Studied Stripe's AI Agents... Vibe Coding Is Already Dead" (IndyDevDan)
- Voice notes captured while watching (2026-03-03)

**Scope:** Cross-project. Applies to Arrangement Forge, ViverSound ecosystem, and personal infrastructure.

---

## Part 1: Core Insights from Both Videos

### Video 1 — The Memory/Context Problem

The central thesis: **your AI is only as good as the context it has, and right now that context is fragmented across walled gardens that don't talk to each other.**

Key architecture concepts:
- **Postgres + PG Vector + MCP** = own your memory, any AI can read/write to it
- **Semantic search** (vector embeddings) beats keyword search — finds by meaning, not folder structure
- **Capture → embed → classify → store** pipeline: thought enters via any channel (Slack, CLI, chat), gets vectorized and metadata-extracted in <10 seconds
- **Compounding advantage**: every thought captured makes the next search smarter. Person A re-explains context every chat. Person B has 6 months of accumulated context auto-loaded via MCP.
- **The internet is forking**: human web (fonts, layouts) vs agent web (APIs, structured data). Your notes need to fork too.
- **Cost**: ~$0.10-0.30/month on Supabase free tier. Trivial.

The insight that connects to your work: **"Good context engineering for agents also produces good context engineering for humans"** (Toby Lutke, cited in video). When you build the right memory infrastructure for AI, you get clearer thinking for yourself as a side effect.

### Video 2 — Stripe's Agentic Layer

The central thesis: **specialization is the advantage. The tool you customize to solve your specific problems will always beat the off-the-shelf tool.**

Stripe's 8-component agentic architecture:
1. **Multiple entry points** (CLI, web, Slack) — meet engineers where they are
2. **Warm devbox pool** (EC2 instances, 10-second spin-up) — every agent gets its own isolated environment mirroring a real developer setup
3. **Custom agent harness** (forked from Goose) — customized orchestration, not locked to any vendor
4. **Blueprint engine** — interleaves deterministic code with agent reasoning. "Agents + code beats agents alone, and agents + code beats code alone"
5. **Conditional rules files** — context loaded per subdirectory, solving the "can't read 100M lines" problem
6. **Tool shed** (meta-MCP) — a tool that helps agents select from ~500 MCP tools without token explosion
7. **Validation layer** — 3M+ tests, selectively run, giving agents feedback loops
8. **GitHub PRs** — standard review endpoint

Key concepts:
- **In-loop** (human supervising, e.g. Cursor/Claude Code) vs **Out-loop** (fully autonomous, e.g. Minions)
- **Meta-agentics**: tools that select tools, agents that build agents, prompts that create prompts
- **ZTE (Zero Touch Engineering)**: prompt → production, no human review — the north star
- **Result**: 1,300 PRs/week, zero human-written code

---

## Part 2: Your Ideas Mapped to Video Concepts

### Theme 1: Reduce Context Switching — The Job Queue

**Your note:** "Using background agents to limit my brain's context switching... EC jobs to see status of everything... follow-up background jobs to iterate"

**Video 1 connection:** "Digital workers toggle between applications 1,200 times a day. Every switch seems small but collectively devastating." The Open Brain solves this by making context persistent and searchable — you never re-explain.

**Video 2 connection:** Stripe's Minions are fully out-loop. Engineers show up at the beginning (prompt) and end (review), "ideally not once in the middle." The blueprint engine handles the deterministic middle steps.

**What to build:**

An `ec jobs` system — a job queue for engineering coach that:
- Tracks background agent work (task description, status, output location)
- Enables follow-up: `ec jobs iterate <id> "refine the output by..."`
- Shows dashboard: `ec jobs` lists all pending/running/complete jobs
- Pipes results: `ec jobs output <id>` dumps result to stdout for piping
- Handles dependencies: job B waits for job A's output

This is essentially **your personal Stripe Minions at small scale.** The engineering coach becomes the orchestrator, background agents become your devboxes.

**Implementation path:** This is a skill enhancement to engineering-coach. Add a `jobs/` directory that tracks agent invocations. Each job gets a JSON file with status, output path, and dependency chain.

---

### Theme 2: Agent-First Products — Arrangement Forge API/MCP

**Your note:** "Make Arrangement Forge AI accessible... API keys... natural language 'give me backing tracks'... agent first infrastructure"

**Video 1 connection:** The entire thesis — build infrastructure for the agent web, not just the human web. "If you can build infrastructure for the agent web, you are suddenly in a position to make a lot more human-friendly decisions."

**Video 2 connection:** Stripe's multiple entry points (CLI, web, Slack). The product has a UI, but the real power is the API that agents can hit.

**What this means for Arrangement Forge:**

The MVP is currently human-first (React UI → Supabase). The agent-first flip:

1. **API-first architecture**: Every action the UI can do, an API endpoint can do. Natural language → structured API call → backing track generated → available in UI.
2. **MCP server for Arrangement Forge**: Any Claude/ChatGPT/Cursor session can say "generate a 12-bar blues backing track in Bb" and it happens.
3. **API keys for users**: Each user gets keys they can hand to their LLM of choice.
4. **The UI becomes one client among many** — it consumes the same API that agents do.

This is a fundamental architectural insight: **don't build a web app that also has an API. Build an API that also has a web app.**

**For Ultimate Guitar:** Same pattern. Build an agent that can search, retrieve tabs, organize playlists, download backing tracks — all via API/MCP. The web UI is a view layer.

**Branding note:** You're thinking about naming (ViverSound, PraxBeat, Practice Studio). The agent-first framing changes the name game — it's less about what the UI looks like and more about what the API does. The name needs to work as a brand AND as an MCP server name developers will type. "PraxBeat" is short, memorable, typeable. Worth investigating.

---

### Theme 3: Model Router / Batch Queue

**Your note:** "Router for my work... best models possible... batch queue... limit context switching... cheapest, fastest models... dependencies... file overlap... compute budget"

**Video 2 connection:** Stripe's **tool shed** is a meta-tool that selects from 500 MCP tools. Their **blueprint engine** interleaves deterministic steps with agent reasoning. Both are routing decisions: "what tool/model for this step?"

**Video 1 connection:** The Open Brain stores context that any AI can access. Model-agnostic by design — switch from Claude to ChatGPT and the same brain is available.

**What to build:**

A **task router** that sits between you and your compute:

```
You (Opus session) → describe task → Router decides:
  ├── Haiku: linting, formatting, simple search
  ├── Sonnet: implementation, code generation
  ├── Opus: architecture, judgment calls, reviews
  ├── Gemini: research, long-context analysis
  └── GPT: specific strengths (TBD per model benchmarks)
```

**Key components:**
1. **Task classifier**: Given a task description, what model + what priority?
2. **Dependency graph**: Task B needs Task A's output. Task C and D are independent → parallelize.
3. **File overlap detection**: If two tasks touch the same file, serialize them (or use beads for isolation).
4. **Compute budget tracker**: How much have I spent this month? What's forecasted? Alert when approaching limits.
5. **Model capability index**: A living document (auto-updated?) of what each model excels at. Your note about "being current on what models are good for what" — this needs to be a reference file that the router consults.

**Your beads question:** "I'm wondering if on my next infrastructure change, I'm gonna have to switch to using beads so that all these batch tasks don't step on each other." — Yes, this is exactly the problem beads solves. When you have N agents touching the same repo, you need either:
- Git worktrees (breaks at scale, as Stripe noted)
- Beads/isolated sandboxes (Stripe's devbox approach)
- File reservation system (the agent-mail MCP already has this)

**Start simple:** Use Claude teams/background agents first (you have Max plans). Add model routing as a skill that the engineering coach can invoke. Don't build the full router day one — start with a routing table in a reference file and a skill that reads it.

---

### Theme 4: Proactive AI — The Reverse Prompt

**Your note:** "They learn enough about me... know when to tell me in an update and notify me based on my patterns. It's the reverse."

**Video 1 connection (20:59 — the moment you flagged):** "Person B opens Claude. It already knows her role, active projects, constraints, team members, decisions from last week — all loaded before she types a word." The compounding effect: "every thought captured makes the next search smarter, the next connection more likely to surface."

**Video 2 connection:** Stripe's agents are out-loop — they don't wait for human prompting. They run, produce results, and present for review.

**What this means:**

Today: You prompt AI → AI responds → you manage the follow-up.
Tomorrow: AI monitors your patterns → AI prompts YOU → you approve/redirect.

This is the biggest unlock in your notes. Instead of tracking N background jobs yourself, an agent that:
- Knows your current projects and priorities (from context/memory)
- Monitors job completion status
- Surfaces results **when relevant to what you're currently doing**
- Suggests next actions based on patterns ("You usually review drum specs after lunch — here are 3 waiting")
- Knows your attention patterns (don't interrupt during deep work, batch updates during transitions)

**Implementation sketch:**
1. **Context accumulation**: Every session, every decision, every voice note gets captured (Open Brain pattern)
2. **Pattern detection**: After 2 weeks of data, the system knows your rhythms
3. **Proactive surfacing**: A background agent runs periodically, checks what's new, what's relevant to your current focus, and prepares a digest
4. **Notification routing**: Push to Slack, or surface next time you open a Claude session

This is NOT building a complex system from scratch. It's: Open Brain (Postgres + MCP) + a cron-triggered agent that reads your brain and prepares updates.

---

### Theme 5: Headless Browser Testing — Systematize Front-End Verification

**Your note:** "I can systematize front-end development with a headless browser... before any complex work, check front-end user face... catch 99% of cases"

**Video 2 connection:** Stripe runs 3M+ tests selectively on push. Their validation layer gives agents feedback. "Shift feedback left — issues should happen as early in the process as possible."

**Your existing pain (from CLAUDE.md):** "`npm run build` is NOT visual verification. Worker agents verified UI overhaul with only TypeScript compilation. All 5 tasks 'passed' but the layout was broken."

**What to build:**

A **pre-flight visual check** that runs before any complex UI work:
1. Headless Playwright launches the app
2. Navigates every route, clicks every interactive element
3. Captures screenshots + DOM measurements
4. Compares against baseline (or just checks for obvious breakage: overlapping elements, invisible text, broken layout)
5. Reports pass/fail with visual evidence

This doesn't need a Mac Mini. Your VPS can run headless Chromium via Playwright. You already have Playwright installed.

**Convention to add to CLAUDE.md:**
```
Before any UI task: run `npx playwright test e2e/visual-preflight.spec.ts`
After any UI task: run it again, compare before/after
```

This is Stripe's "shift left" principle applied to your project. Catch visual regressions before they compound.

---

### Theme 6: Everything Is Context / Skills Are Sorted Context

**Your note:** "Everything is context. The skill is just a tool that is sorted context to what we need, so 99% of the decisions are done, and then executes them."

This is a precise articulation of what the engineering coach framework has been building toward. Let me make it explicit:

**The stack:**
```
Raw knowledge (transcripts, notes, research, experience)
    ↓ sorted and structured
Context infrastructure (CLAUDE.md, MEMORY.md, reference files)
    ↓ pre-decided and encoded
Skills (engineering-coach, yt-transcript, x-research)
    ↓ triggered by pattern match
Execution (agent runs with 99% of decisions already made)
```

**Video 1:** The Open Brain is the bottom layer — raw knowledge, vectorized, searchable by meaning.
**Video 2:** Stripe's rules files + blueprint engine are the middle layers — context sorted by directory, decisions encoded in deterministic code steps.
**Your skills:** The top layer — when the skill triggers, the context is already loaded, the constraints are already set, the workflow is already defined.

**The implication:** Every time you build a new skill, you're moving decisions from "things I have to think about in the moment" to "things that are pre-decided and encoded." That's the compounding advantage both videos describe.

---

### Theme 7: Evals for Agentic Behavior

**Your note:** "We're gonna need evals to evaluate our agentic behavior... throw Haiku and Gemini over problems, figure out what to optimize context-wise"

**Video 2 connection:** Stripe's validation layer (3M tests), feedback loops, CI integration. "The best thing for humans and agents is you want issues to happen earlier rather than later."

**What to build:**

An eval framework that answers: "Given this task type, which model + which context produces the best result?"

1. **Task taxonomy**: Categorize your common tasks (research, implementation, review, synthesis, UI work)
2. **Model matrix**: For each task type, run the same task on Haiku, Sonnet, Opus, Gemini
3. **Score dimensions**: Correctness, speed, cost, context utilization
4. **Living leaderboard**: A reference file the router consults

Start with manual evals on 5-10 representative tasks. The router (Theme 3) uses this data to make routing decisions.

---

## Part 3: Convergent Research Funnel → Skill Update

**Your note:** "I updated Engineering Coach with a recursive funnel pattern. Pull out the examples from session logs and put them in the skill."

This is a meta-improvement to the engineering coach itself. The convergent research funnel (in `references/convergent-research-funnel.md`) would benefit from real examples pulled from actual session usage. This should be a follow-up task: grep session logs for funnel invocations, extract concrete examples, add to the reference doc.

---

## Part 4: Non-Coding Ideas (Parked)

These are legitimate ideas worth capturing but outside the engineering scope:

1. **Scent-based productivity**: Research aromatherapy for focus (rosemary, peppermint), calm (lavender), energy (citrus). Use a programmable scent diffuser on a schedule. Keep cooking smells separate (good ventilation, close kitchen door during work hours).

2. **AI scent dispenser product**: Smart diffuser + air purifier in one unit. AI-controlled scent profiles (morning energy, afternoon focus, evening calm). Could integrate with calendar/time-of-day. Market exists — Pura, Aera are smart diffusers, but none do the AI-driven adaptive profile + air cleaning combo. Worth a market research pass.

3. **ViverSound branding**: Arrangement Forge needs a name that works as both a brand and an API/MCP server name. "PraxBeat" is strong (short, unique, typeable). Research needed: domain availability, trademark conflicts, how plugin manufacturers name products (Waves, FabFilter, iZotope naming conventions).

---

## Part 5: Priority Stack

What to build, in order of leverage:

| Priority | Item | Why first | Effort |
|----------|------|-----------|--------|
| 1 | Headless visual pre-flight | Directly unblocks Arrangement Forge UI work. Already have Playwright. Prevents the blind-fix spiral that burned sessions. | Small — one Playwright spec |
| 2 | EC jobs tracking | Reduces your context switching immediately. Foundation for everything else. | Medium — skill enhancement |
| 3 | Model routing table | Even a static reference file helps. No code needed, just a ranked capability matrix. | Small — one reference file |
| 4 | Arrangement Forge API-first refactor | Architectural decision that shapes all future work. Better to decide early. | Decision now, implementation later |
| 5 | Open Brain (Postgres + MCP) | The memory layer everything else builds on. Follows Video 1 guide. | Medium — 45 min setup per the video |
| 6 | Proactive AI agent | Needs Open Brain (#5) and jobs tracking (#2) as foundation. | Large — after foundations are in place |
| 7 | Evals framework | Needs real tasks running (#2, #3) to have data to evaluate. | Medium — after router exists |
| 8 | Mac Mini / dedicated test hardware | Only needed when headless Playwright (#1) hits limits. Defer. | Hardware purchase decision |

---

## Part 6: The Connecting Thread

Both videos are saying the same thing from different angles:

**Video 1 (Nate B Jones):** Build memory infrastructure you own. Every AI you use gets better because the context compounds.

**Video 2 (IndyDevDan):** Build an agentic layer you own. Specialize your tools to your problems. Code + agents > either alone.

**Your synthesis (from your notes):** "Everything is context. The skill is just sorted context." — This is the bridge. The Open Brain is where context lives. The agentic layer is how context gets applied. Skills are the packaging that makes it automatic.

The north star: **You describe what you want. The system knows enough about you, your projects, and your patterns that it can route the work to the right model, execute it in isolated sandboxes, validate the output, and notify you when it's ready — or when it needs your judgment.**

You're not there yet, but every piece you build (jobs tracking, routing table, visual pre-flight, Open Brain) moves you closer. And each piece compounds — exactly as both videos predict.
