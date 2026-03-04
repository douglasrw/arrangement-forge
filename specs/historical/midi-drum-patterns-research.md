# MIDI Drum Patterns Research: Groove Monkee Alternatives

**Date:** 2026-03-03
**Purpose:** Evaluate sources for pre-made drum MIDI patterns to power Arrangement Forge's backing track engine
**Key requirement:** MIDI data (not audio) that can be embedded in a SaaS product's codebase, converted to JSON, and played through our own Tone.js sampler

---

## Table of Contents

1. [Our Requirements](#our-requirements)
2. [Groove Monkee (Baseline)](#1-groove-monkee-baseline)
3. [Google Magenta Groove MIDI Dataset](#2-google-magenta-groove-midi-dataset)
4. [DMP MIDI (200+260 Drum Machine Patterns)](#3-dmp-midi-200260-drum-machine-patterns)
5. [GoranGrooves](#4-gorangrooves)
6. [Prosonic Studios](#5-prosonic-studios)
7. [MidiDrumFiles.com](#6-mididrumfilescom)
8. [Smart Loops](#7-smart-loops)
9. [OddGrooves](#8-oddgrooves)
10. [Toontrack EZdrummer MIDI Packs](#9-toontrack-ezdrummer-midi-packs)
11. [MIDI Mighty](#10-midi-mighty)
12. [Subaqueous Music](#11-subaqueous-music)
13. [Custom Creation (Write Our Own)](#custom-creation-write-our-own)
14. [Final Rankings](#final-rankings)
15. [Recommendation](#recommendation)

---

## Our Requirements

**What we need:**
- Pre-made drum MIDI patterns (note data, velocities, timing) -- NOT audio samples
- Patterns will be converted to JSON and shipped as static data in our web app
- Our Tone.js sampler engine plays the patterns through our own drum samples
- Users hear the patterns but never download or access the raw MIDI/JSON data directly

**Genre coverage needed (9 genres):**
Jazz, Blues, Rock, Country, Funk, Latin, Gospel, R&B, Pop

**Pattern organization needed:**
- By genre, tempo, time signature, feel (shuffle/straight/swing)
- Song sections: intros, verses, fills, choruses, endings
- Variations within each section type

**License requirement:**
We need to embed the MIDI note data (converted to JSON) in our SaaS product's codebase. The data drives our playback engine. Users hear the output but never access the raw pattern data. This is NOT the same as "using loops in your own songs" -- it is closer to embedding pattern data in software.

---

## 1. Groove Monkee (Baseline)

**URL:** https://groovemonkee.com/collections/midi-loops
**What they offer:** 38 individual MIDI drum loop packs; Mega Pack bundles everything.

**Content:**
- ~39,082 royalty-free MIDI drum loops (Mega Pack)
- Played by professional session drummers, NOT quantized (human feel)
- Time signatures: 3/4, 4/4, 5/4, 6/4, 6/8, 7/8, 7/4, 9/8, 12/8
- Beat Buddy PBF files included
- Genres: Blues (3 packs), Rock (multiple), Country (2), Jazz, Funk, Latin/Afro-Cuban, Ballads, Reggae, Metal, EDM, Hip-Hop, New Orleans, Neo-Soul, Fusion, and more

**Pricing:**
- Individual packs: $14.95 each
- Mega Pack (everything): $149.95 (on sale from $249.95)
- Free updates for life with Mega Pack

**License (CRITICAL PROBLEM):**
The Groove Monkee License Agreement explicitly states:
> "Our products may not be incorporated, in any format, into any applications or services."

Additionally:
> "Contents of this product may not be used to create or contribute to any competitive product, including but not limited to drum loops or bass loops."

**This is a hard blocker.** Their license explicitly prohibits embedding in software/SaaS. Even though they call it "royalty-free," that only applies to using patterns in your own musical compositions -- not to shipping them as data in an application.

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (yes), Funk (yes), Latin (yes), Gospel (no dedicated pack), R&B (partial via Neo-Soul), Pop (yes via Ballads/Contemporary)
**Coverage score:** 7.5/9

**Pros:**
- Massive library (39K+ patterns)
- Excellent quality (real drummers, unquantized feel)
- Very broad genre coverage
- Affordable ($150 for everything)
- Well-organized by song section (intros, verses, fills, choruses, endings)

**Cons:**
- **License explicitly prohibits embedding in applications** -- DISQUALIFYING
- Would need to negotiate a custom license (unclear if they'd agree)
- No Gospel-specific pack
- Patterns are designed for DAW use, not web app integration

---

## 2. Google Magenta Groove MIDI Dataset

**URL:** https://magenta.tensorflow.org/datasets/groove
**What they offer:** Academic research dataset of human-performed drum MIDI

**Content:**
- 1,150 MIDI files, 22,000+ measures of drumming
- 13.6 hours of content
- 503 beats and 647 fills
- Performed by 10 drummers (80%+ by hired professionals)
- 18 primary genres: afrobeat, afrocuban, blues, country, dance, funk, gospel, highlife, hiphop, jazz, latin, middleeastern, neworleans, pop, punk, reggae, rock, soul
- Metadata in CSV: drummer ID, tempo, time signature, genre, style sub-classifications
- Most performances in 4/4 time with some other signatures
- Human-performed with velocity and timing expression

**Pricing:** FREE

**License: Creative Commons Attribution 4.0 International (CC BY 4.0)**
- Commercial use: YES
- Embedding in software: YES
- Modification: YES
- Only requirement: attribution ("Made available by Google LLC under CC BY 4.0")
- **This is the most permissive license of any option reviewed**

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (yes), Funk (yes), Latin (yes + afrocuban), Gospel (yes), R&B (yes via soul), Pop (yes)
**Coverage score:** 9/9 -- PERFECT MATCH

**Pattern organization:**
- Mix of long sequences and short beats/fills
- Metadata includes genre, tempo, time signature
- Would need processing to extract and categorize individual patterns
- Not pre-organized by song section (verse/chorus/fill) -- this is raw performance data

**Pros:**
- CC BY 4.0 -- fully legal for SaaS embedding with attribution only
- Covers ALL 9 of our target genres
- Human-performed with real expression (velocity, timing nuance)
- Free -- no cost
- Well-documented academic dataset with CSV metadata
- Created by Google/Magenta -- established, reputable source
- MIDI-only download is only 3.11 MB

**Cons:**
- Raw research data -- NOT pre-organized as "verse pattern, chorus pattern, fill"
- Would require significant processing/curation to extract usable patterns
- Uneven genre distribution (some genres have more patterns than others)
- Limited to 10 drummers (less variety than commercial libraries)
- Patterns are tempo-aligned measures, not ready-made song sections
- Would need manual curation to identify which measures are beats vs. fills vs. transitions

---

## 3. DMP MIDI (200 + 260 Drum Machine Patterns)

**URL:** https://github.com/gvellut/dmp_midi
**What they offer:** MIDI conversions of patterns from the classic drum programming reference books by Rene-Pierre Bardet

**Content:**
- ~460 patterns total (200 + 260 from two books)
- General MIDI convention (channel 10, standard note mapping)
- Originally published as sheet music for drum machine programming
- Covers a wide range of styles from the drum machine era
- The books cover: Rock, Funk, Disco, Reggae, Latin, Jazz, R&B, Pop, New Wave, Afro-Cuban, Brazilian, and more

**Pricing:** FREE (open source)

**License: MIT License**
- Commercial use: YES
- Embedding in software: YES
- Modification: YES
- Only requirement: include MIT license notice
- **Note:** The MIT license covers the code and MIDI conversions. The original book patterns are published works by Hal Leonard -- the copyright status of "a drum pattern described in sheet music, then converted to MIDI" is legally ambiguous. Drum patterns themselves are generally not copyrightable (see legal discussion below), but this is worth noting.

**Genre coverage (our 9):** Jazz (yes), Blues (partial), Rock (yes), Country (partial), Funk (yes), Latin (yes), Gospel (unlikely), R&B (yes), Pop (yes)
**Coverage score:** 6.5/9

**Pros:**
- Free, MIT licensed
- Classic, well-known patterns from definitive reference books
- Already in General MIDI format
- Small, manageable collection (460 patterns)
- Clean, programmatic patterns (good as foundation)

**Cons:**
- Drum machine patterns -- programmed, NOT human-performed (no velocity variation, no feel)
- No fills, transitions, or song-section organization
- Limited to basic beats -- no intros, endings, variations
- Gospel coverage absent
- Country coverage minimal
- Patterns are mechanical -- would sound robotic without humanization
- Legal ambiguity around the book's copyright (though drum patterns themselves are not copyrightable)

---

## 4. GoranGrooves

**URL:** https://library.gorangrooves.com/midi-loops-2/
**What they offer:** Professional MIDI drum loops organized by genre, designed for BeatBuddy and DAWs

**Content:**
- 8,500+ drum grooves and 6,400+ drum fills (Complete MIDI Bundle)
- Genre-specific packs: Rock, Pop, Jazz, Metal, Latin Caribbean, Country, Funk, Reggae, World Percussion, Flamenco, Songwriter Brushes, Chill, Cymbal Beats
- Type 0 and Type 1 MIDI formats
- Professionally produced by Goran Rista (established producer)
- Dedicated installers for BeatBuddy hardware

**Pricing:**
- Individual packs: ~$20-25 each
- Complete MIDI Bundle: $170 (down from $725)

**License:**
- License agreement is presented during installation
- Specific terms not publicly available online
- Standard music production royalty-free license assumed (use in your own music)
- **Embedding in software: UNKNOWN -- would require contacting GoranGrooves directly**
- Given that it's a small operation focused on BeatBuddy/DAW users, a custom SaaS license would likely need negotiation

**Genre coverage (our 9):** Jazz (yes), Blues (partial via Rock), Rock (yes), Country (yes), Funk (yes), Latin (yes), Gospel (no), R&B (partial via Chill/Pop), Pop (yes)
**Coverage score:** 7/9

**Pros:**
- Large, well-organized library
- Genre-specific packs with fills included
- Professional quality
- Good price for the complete bundle
- Standard MIDI format

**Cons:**
- License terms not publicly documented for software embedding
- No dedicated Gospel pack
- Designed for BeatBuddy/DAW workflow, not web app
- Would need to negotiate custom license for SaaS use
- Less established than Groove Monkee for MIDI loops specifically

---

## 5. Prosonic Studios

**URL:** https://www.prosonic-studios.com/midi-drum-beats
**What they offer:** "The largest MIDI drum loop library in the world" -- thousands of free patterns

**Content:**
- "Thousands" of MIDI drum patterns (exact count unclear)
- 400+ patterns available free
- 13+ genre categories: Blues & Rock-n-Roll, Country & Folk, Funk, Hard Rock, Heavy Metal & Punk, Jazz & Big Band, Latin & Salsa, New Age, Pop & Soft-Rock, R&B & Soul, Rap & Hip-Hop, Reggae & Ska, Techno & House
- General MIDI Standard format
- Also offer chord progressions and other MIDI resources

**Pricing:**
- 400+ patterns: FREE download
- Premium patterns: one-time license fee (amount unclear)

**License:**
- Described as "royalty-free"
- You are purchasing a "license to use the files/patterns in your own music royalty-free. You are not purchasing the copyrights."
- Sharing of files is "strictly prohibited"
- **Embedding in software: NOT addressed in their FAQ -- likely NOT permitted under standard license**
- Would need custom arrangement for SaaS use

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (yes), Funk (yes), Latin (yes), Gospel (no), R&B (yes), Pop (yes)
**Coverage score:** 8/9

**Pros:**
- Excellent genre coverage
- Hundreds of free patterns
- General MIDI format (easy integration)
- Long-established resource (well-known in the community)

**Cons:**
- License likely prohibits software embedding
- Sharing files is explicitly prohibited
- Quality may be inconsistent (no mention of real drummer performances)
- Pattern organization unclear (by genre, but unclear about song sections)
- No Gospel category
- Website is dated; unclear if actively maintained

---

## 6. MidiDrumFiles.com

**URL:** https://mididrumfiles.com/
**What they offer:** Master Collection of 950 MIDI drum tracks

**Content:**
- 950 MIDI drum tracks in the Master Collection
- Genre categories: 8 beat (22), 16 beat (24), 3/4 time (25), 50s & 60s (35), 6/8 time (25), Ballads (20), Classics (21), Contemporary (70), Dance (82), Ethnic (52), Folk (192), Jazz-n-Blues (65), Latin (106), Rock (67), Swing (40), Upbeat
- 100% royalty-free, General MIDI compatible
- Free sample pack available

**Pricing:**
- Master Collection: $43.99 (down from $69.99)
- Free sample pack available

**License:**
- "100% Royalty Free and completely editable"
- Specific terms about software embedding not publicly documented
- "Royalty-free" in this context likely means use in musical productions, not software embedding
- Would need clarification for SaaS use

**Genre coverage (our 9):** Jazz (yes via Jazz-n-Blues), Blues (yes), Rock (yes), Country (partial via Folk), Funk (partial via 16-beat), Latin (yes), Gospel (no), R&B (partial via Contemporary), Pop (yes via Contemporary/Ballads)
**Coverage score:** 6.5/9

**Pros:**
- Affordable ($44 for everything)
- Good variety of time signatures and feels
- General MIDI format
- Large Folk/Ethnic collection (unusual)

**Cons:**
- License terms for software embedding unclear
- No Gospel category
- Organized by beat type/era rather than genre in some cases
- Less established than other options
- No mention of human drummer performances
- Country coverage weak (lumped into Folk)

---

## 7. Smart Loops

**URL:** https://smartloops.com/
**What they offer:** MIDI drum loops recorded by Pearl Drums artist Frank Basile

**Content:**
- Multiple volumes (at least 7 volumes)
- Volume 2: 600+ measures; Volume 3: 240+ unique loops, 500+ measures
- Each groove in 3 formats: Cakewalk MIDI Groove Clip, Standard MIDI File type 0, Standard MIDI File type 1
- Recorded first on acoustic kit then mapped to MIDI (real drummer feel)
- Genres: Rock, R&B, Hard Rock, Metal, Jazz, Blues, Country

**Pricing:**
- Individual volumes: pricing not publicly listed (likely $15-30 range based on era/competitors)
- Also available through Big Fish Audio

**License:**
- Not publicly documented
- Standard music production license assumed
- **Embedding in software: UNKNOWN**
- Distributed through Big Fish Audio which has its own licensing framework

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (yes), Funk (partial), Latin (no), Gospel (no), R&B (yes), Pop (partial)
**Coverage score:** 6/9

**Pros:**
- Real drummer performances (Frank Basile / Pearl Drums artist)
- Human feel (recorded on acoustic kit first)
- Multiple MIDI format options
- Respected in producer community

**Cons:**
- License terms not publicly available
- No Latin, Gospel, or dedicated Funk coverage
- Website navigation issues (404 on some pages)
- Pricing not transparent
- Likely prohibits software embedding under standard terms

---

## 8. OddGrooves

**URL:** https://oddgrooves.com/
**What they offer:** Premium MIDI drum loops recorded live by a professional drummer

**Content:**
- All grooves recorded LIVE by pro drummer (no programming, no quantization)
- Compatible with: Toontrack EZdrummer/Superior Drummer, XLN Audio Addictive Drums, Steven Slate Drums, Logic Drummer, General MIDI
- Various styles including prog-rock, jazz/swing
- In operation since 2008

**Pricing:**
- "Reasonably priced" (exact pricing not found on public pages)
- 30-day money-back guarantee
- Some free jazz MIDI grooves available

**License:**
- Not publicly documented
- Standard music production license assumed
- **Embedding in software: UNKNOWN**

**Genre coverage (our 9):** Jazz (yes), Blues (partial), Rock (yes), Country (unknown), Funk (partial), Latin (unknown), Gospel (no), R&B (unknown), Pop (unknown)
**Coverage score:** 4/9 (based on confirmed genres only)

**Pros:**
- Live drummer recordings (authentic human feel)
- Established since 2008
- General MIDI compatible
- Free jazz samples available

**Cons:**
- Limited genre coverage for our needs
- License terms not publicly available
- Likely prohibits software embedding
- Website provides little detail on products
- Focused more on prog-rock and niche styles

---

## 9. Toontrack EZdrummer MIDI Packs

**URL:** https://www.toontrack.com/drum-midi-packs/
**What they offer:** MIDI expansion packs for EZdrummer/Superior Drummer

**Content:**
- Dozens of genre-specific MIDI packs
- Each pack: typically 4-8 complete songs with variations
- Played by professional session drummers
- Genres: Pop/Rock, Vintage Rock, Jazz, Blues, Country, Metal, Latin, Funk, R&B, Gospel, and many more
- Extremely well-organized by song section (intro, verse, pre-chorus, chorus, bridge, fill, ending)

**Pricing:**
- Individual packs: ~$29 each
- 6-pack bundles available at discount
- No "everything" bundle

**License (DISQUALIFYING):**
Toontrack EULA explicitly states:
> "You may use a Product, or any part of a Product, including presets or parts of sound libraries, only in the context of musical arrangements, recordings of arrangements and live performances."

And prohibits:
> "Extracting, copying or producing from a Product any single preset, sound or MIDI file... for resale, commercialization or any other form of distribution."

**This is a hard blocker.** Toontrack's EULA explicitly restricts MIDI use to musical compositions only and prohibits any form of redistribution or extraction.

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (yes), Funk (yes), Latin (yes), Gospel (yes), R&B (yes), Pop (yes)
**Coverage score:** 9/9 -- PERFECT MATCH

**Pros:**
- Best-in-class quality (industry-standard session drummers)
- Perfect genre coverage for our needs
- Excellent song-section organization
- Massive catalog of variations

**Cons:**
- **EULA explicitly prohibits extraction/redistribution** -- DISQUALIFYING
- Expensive if buying many packs ($29+ each)
- Designed as expansion for their own software
- No path to negotiate SaaS embedding (Toontrack is a large company with strict IP protection)

---

## 10. MIDI Mighty

**URL:** https://midimighty.com/
**What they offer:** MIDI drum guides with associated MIDI files and samples

**Content:**
- PDF guides + MIDI files + drum samples per genre
- Genres: HipHop, BoomBap, Trap, Drill, LoFi, R&B, Pop, Reggaeton, Afrobeats, Drum Fills
- Focused on modern/urban genres

**Pricing:**
- Individual guides: pricing varies (not publicly listed)
- All products described as "100% Royalty Free"

**License:**
- "100% Royalty Free. No fees or restrictions where you can use it."
- "No limit on streaming, downloads, views, performances, rights, etc."
- "You can use what you purchase in perpetuity without any usage reporting."
- BUT: "You cannot sell or license what you purchase here to others."
- **Software embedding: Ambiguous.** The "no restrictions" language is encouraging, but "cannot sell or license to others" could be interpreted as prohibiting SaaS use. Would need clarification.

**Genre coverage (our 9):** Jazz (no), Blues (no), Rock (no), Country (no), Funk (partial via HipHop), Latin (yes via Reggaeton/Afrobeats), Gospel (no), R&B (yes), Pop (yes)
**Coverage score:** 3/9 -- POOR MATCH

**Pros:**
- Very permissive license language
- Modern, well-produced patterns
- Includes PDF guides for understanding patterns

**Cons:**
- Genre coverage completely misaligned with our needs (urban/modern focus)
- No Jazz, Blues, Rock, Country, Funk, Gospel
- License still ambiguous on software embedding
- Small catalog compared to others

---

## 11. Subaqueous Music

**URL:** https://www.subaqueousmusic.com/
**What they offer:** Free/donation-based MIDI drum libraries across several genres

**Content:**
- Jazz and Blues MIDI Drum Library (free/donation)
- Rock Drum MIDI Library
- Latin Percussion MIDI Library
- Dub MIDI and Drum Loops
- Dubstep and Downtempo MIDI Drums
- Trap Drum Beats
- Available via Gumroad (name-your-price)

**Pricing:** FREE (donation optional)

**License:**
- Not explicitly documented
- "Free/by donation" -- drag into any DAW and use in your music
- No formal license agreement found
- **Software embedding: UNKNOWN and high risk without explicit permission**

**Genre coverage (our 9):** Jazz (yes), Blues (yes), Rock (yes), Country (no), Funk (partial), Latin (yes), Gospel (no), R&B (partial), Pop (no)
**Coverage score:** 5/9

**Pros:**
- Free
- Jazz, Blues, Rock, Latin coverage
- Easy download via Gumroad

**Cons:**
- No formal license -- risky for commercial SaaS use
- No Gospel, Country, Pop
- Quantity/quality unknown without downloading
- One-person operation (sustainability risk)
- Cannot confirm software embedding rights

---

## Custom Creation: Write Our Own

**The nuclear option -- and possibly the best one.**

**Legal basis:** Drum patterns are not copyrightable under U.S. law. As confirmed by music copyright attorneys: "Drum loops, drum beats, and drum patterns cannot be copyrighted because they aren't technically considered songwriting." Only lyrics, melody, harmony, and rhythm (in the compositional sense) can be copyrighted. A kick on 1 and 3, snare on 2 and 4 with hi-hats on eighth notes is not a protectable work.

**Approach:**
1. Use the Groove MIDI Dataset (CC BY 4.0) as reference/inspiration for authentic patterns
2. Study the DMP MIDI collection (MIT) for classic drum machine patterns
3. Define our own JSON schema for drum patterns
4. Program patterns from scratch using music theory knowledge
5. Add humanization (velocity variation, timing micro-offsets) programmatically
6. Use MidiWriterJS or Tone.js Midi library for MIDI-to-JSON conversion
7. Hire a session drummer on Fiverr/SoundBetter ($50-100/track) to validate/improve key patterns

**Tools available:**
- **MidiWriterJS** (MIT license): JavaScript library for programmatic MIDI generation
- **Tone.js Midi** (MIT license): Convert MIDI to Tone.js-friendly JSON
- **Google Magenta models**: Open-source AI for drum pattern generation (Apache 2.0)

**Pros:**
- ZERO licensing concerns -- we own everything
- Perfect genre coverage (we create exactly what we need)
- Perfect organization (we define the schema)
- Patterns optimized for our specific sampler engine
- Can add/modify patterns anytime
- No ongoing licensing costs or compliance burden

**Cons:**
- Significant upfront effort to create 500+ quality patterns
- Patterns may lack "human feel" if purely programmed
- Requires music theory expertise to create authentic genre patterns
- Time to market: weeks to months for comprehensive library
- Risk of patterns sounding generic without real drummer input

---

## Final Rankings

Scoring criteria:
- **Quality/musicality** (30%): How real and musical do the patterns sound?
- **Genre coverage** (25%): How well do they match our 9 target genres?
- **License suitability** (25%): Can we legally embed in a SaaS product?
- **Price/value** (10%): Total cost for what we need
- **Ease of integration** (10%): How easy to convert to JSON for our web app?

| Rank | Source | Quality (30%) | Genre (25%) | License (25%) | Price (10%) | Integration (10%) | **Weighted Score** |
|------|--------|--------------|-------------|---------------|-------------|-------------------|-------------------|
| **1** | **Google Magenta Groove MIDI Dataset** | 8/10 | 10/10 | 10/10 | 10/10 | 7/10 | **8.9** |
| **2** | **Custom Creation (Write Our Own)** | 6/10 | 10/10 | 10/10 | 7/10 | 10/10 | **8.5** |
| **3** | **DMP MIDI (Drum Machine Patterns)** | 5/10 | 7/10 | 9/10 | 10/10 | 8/10 | **7.1** |
| **4** | **GoranGrooves** | 8/10 | 8/10 | 4/10 | 7/10 | 6/10 | **6.6** |
| **5** | **Groove Monkee** | 9/10 | 8/10 | 1/10 | 8/10 | 6/10 | **6.0** |
| **6** | **Prosonic Studios** | 6/10 | 9/10 | 3/10 | 9/10 | 7/10 | **6.0** |
| **7** | **MidiDrumFiles.com** | 6/10 | 7/10 | 3/10 | 8/10 | 7/10 | **5.6** |
| **8** | **Smart Loops** | 8/10 | 7/10 | 3/10 | 6/10 | 6/10 | **5.7** |
| **9** | **OddGrooves** | 8/10 | 4/10 | 3/10 | 6/10 | 6/10 | **4.9** |
| **10** | **Toontrack** | 10/10 | 10/10 | 0/10 | 4/10 | 3/10 | **5.2** |
| **11** | **Subaqueous Music** | 5/10 | 6/10 | 2/10 | 10/10 | 6/10 | **4.9** |

*Note: MIDI Mighty excluded from ranking due to 3/9 genre coverage -- fundamentally misaligned with our needs.*

---

## Recommendation

### Primary Strategy: Groove MIDI Dataset + Custom Curation + Original Patterns (Hybrid Approach)

The clear winner is a **hybrid approach** combining the top two options:

#### Phase 1: Foundation (Week 1-2)
1. **Download the Groove MIDI Dataset** (3.11 MB MIDI-only) -- CC BY 4.0, free
2. Parse all 1,150 MIDI files using Tone.js Midi library
3. Use the CSV metadata to categorize by genre, tempo, time signature
4. Extract the best beats and fills for each of our 9 target genres
5. Convert to our JSON pattern schema

#### Phase 2: Curation + Gap Filling (Week 2-3)
1. Identify gaps in the GMD data (uneven genre distribution, missing song sections)
2. Use the DMP MIDI collection (MIT license, 460 patterns) to fill gaps with classic patterns
3. **Write original patterns** for any remaining gaps (especially Gospel if underrepresented)
4. Add humanization algorithms (velocity curves, micro-timing offsets)
5. Organize all patterns by: genre > feel > tempo range > song section > variation

#### Phase 3: Validation + Polish (Week 3-4)
1. Hire a session drummer ($50-100) via SoundBetter/Fiverr to review pattern authenticity
2. Playtest all patterns through our Tone.js sampler
3. Adjust velocities and timing to sound good with our specific drum samples
4. Build the final JSON pattern library

#### Phase 4: Attribution + Legal
1. Add CC BY 4.0 attribution for Groove MIDI Dataset in app footer/about page
2. Include MIT license notice for DMP MIDI patterns
3. Document which patterns are original vs. derived

### Why Not Just Buy Groove Monkee?

Despite having the best commercial library, their license explicitly prohibits embedding in applications. Even if we could negotiate a custom license:
- It creates ongoing legal dependency on a small company
- Terms could change
- Any acquisition or shutdown affects our product
- The Groove MIDI Dataset gives us 90% of what we need for free, legally

### Why Not Toontrack?

Best quality and perfect genre coverage, but their EULA is even more restrictive than Groove Monkee. No path to negotiate -- they're a large company with strict IP protection.

### Cost Summary

| Item | Cost |
|------|------|
| Groove MIDI Dataset | $0 (CC BY 4.0) |
| DMP MIDI patterns | $0 (MIT license) |
| Development time (20-40 hours) | Internal cost |
| Session drummer review | $50-100 |
| **Total** | **$50-100** |

Compare to: Groove Monkee Mega Pack at $150 (which we can't legally use anyway).

### Required Attribution

In the app's About/Legal page:
```
Drum patterns include material from the Groove MIDI Dataset by Google LLC,
used under Creative Commons Attribution 4.0 International License (CC BY 4.0).
https://magenta.tensorflow.org/datasets/groove
```

---

## Appendix A: Key Legal Principle

**Drum patterns are not copyrightable.** U.S. copyright law protects melody, harmony, lyrics, and arrangement -- not rhythmic patterns in isolation. A standard rock beat (kick 1-3, snare 2-4, hi-hat 8ths) cannot be owned by anyone. This means:

1. We can study any commercial MIDI library and create similar patterns from scratch
2. We can use the CC BY 4.0 Groove MIDI Dataset patterns as-is (with attribution)
3. We can use the MIT-licensed DMP MIDI patterns as-is (with license notice)
4. Original patterns we create are ours with zero encumbrance

The risk is only in literally copying someone's specific MIDI file without permission -- not in creating a pattern that sounds similar.

## Appendix B: Additional Resources Reviewed But Not Ranked

| Resource | Why Not Ranked |
|----------|---------------|
| **Looperman** | Community uploads -- individual license per creator, no bulk SaaS rights, explicitly prohibits redistribution in apps |
| **Samples From Mars (Grooves From Mars)** | Free groove templates, but these are swing/shuffle timing templates, not drum patterns. Useful for humanization but not as pattern data. |
| **XLN Audio Addictive Drums MIDIpaks** | Requires Addictive Drums 2 license, proprietary format, redistribution not addressed but likely prohibited |
| **Oracle Sound / DrumMidi.com** | Focused on metal/hardcore/punk -- no coverage of our core genres (Jazz, Blues, Country, Gospel) |
| **muted.io Drum Patterns** | Only 16 basic patterns, "All rights reserved" copyright notice, useful as reference but not as source data |
| **Drumloop AI** | AI-generated patterns -- quality inconsistent, licensing unclear, not suitable as foundational library |

## Appendix C: Expanded Groove MIDI Dataset (E-GMD)

Worth noting: Google also released the **Expanded Groove MIDI Dataset** with 444 hours of audio from 43 drum kits, also under CC BY 4.0. This is primarily audio (not MIDI patterns) but could be useful for:
- Training our own drum pattern generation model (future)
- Audio analysis for pattern extraction
- Reference for what "good drumming" sounds like per genre

URL: https://magenta.tensorflow.org/datasets/e-gmd
