# Drum Sample Libraries Research for Arrangement Forge

**Date:** 2026-03-03
**Purpose:** Evaluate the top drum sample libraries for use in a web-based music application (Tone.js / Web Audio API) for realistic drum playback in a SaaS product.

**Evaluation criteria (weighted):**
- Sound quality (40%)
- License permissiveness for SaaS use (25%)
- Ease of integration with Tone.js / web (20%)
- File size / web optimization (15%)

---

## Summary Ranking

| Rank | Library | License | Quality | Size (web-ready est.) | Best For |
|------|---------|---------|---------|----------------------|----------|
| 1 | The Open Source Drumkit | Public Domain | Very High | ~30-50 MB (compressed) | Primary kit |
| 2 | FreePats MuldjordKit | CC-BY-4.0 | High | ~53 MB (SF2) | Alternative kit |
| 3 | AVL Drumkits | CC-BY-SA-3.0 | High | ~20-40 MB (compressed) | Multiple kit styles |
| 4 | Karoryfer Big Rusty Drums | CC0-1.0 | Very High | ~80-120 MB (compressed) | Rock/vintage sound |
| 5 | Karoryfer Gogodze Phu Vol II | CC0-1.0 | High | ~30-40 MB (compressed) | Lo-fi/variable character |
| 6 | Naked Drums (Wilkinson Audio) | CC-BY-4.0 | Very High | ~60-100 MB (compressed) | Professional/studio |
| 7 | Salamander Drumkit | CC-BY-SA-3.0 | High | ~40-60 MB (compressed) | Garage/organic sound |
| 8 | SM Drums | Public Domain | Exceptional | Too large for web (~500+ MB) | Reference/offline |
| 9 | Google Chrome Labs Drum Machine | Apache-2.0 | Medium | ~5-10 MB | Quick prototype |
| 10 | 99 Drum Samples (99Sounds) | Royalty-free (restricted) | High | ~15-20 MB | Supplement only |

---

## Detailed Evaluations

---

### 1. The Open Source Drumkit (Real Music Media)

**Source URL:** https://github.com/crabacus/the-open-source-drumkit
**Original:** Real Music Media (realmusicmedia.net, now archived)
**License:** **Public Domain** -- The creator explicitly gave up all intellectual property rights. No attribution required. No restrictions on commercial use, redistribution, or modification.

**Quality Assessment:**
- Sample rate: 44.1 kHz (standard)
- Bit depth: 24-bit WAV
- Velocity layers: Up to 20+ layers on many kit pieces (heavily velocity-layered)
- Round robins: Multiple per instrument
- Recording quality: Professionally recorded in a studio environment

**Kit Contents:**
- Kick drum
- Snare drum (with rimshot and sidestick articulations)
- Hi-hat (open and closed)
- Ride cymbal
- Crash cymbal
- 3 toms (high, mid, floor)
- Gong

**File Size:**
- Full WAV download: ~600 MB
- Web-optimized (select velocity layers, convert to OGG): estimated 30-50 MB

**Web-Readiness:**
- Format: WAV (needs conversion to OGG/MP3 for web)
- Individual one-shot samples organized by instrument folder
- Straightforward to map to Tone.js Sampler/Players
- Would need a build step to select velocity layers and convert/compress

**Pros:**
- True public domain -- no legal risk whatsoever for SaaS use
- Excellent velocity layering provides realistic dynamics
- Clean, professional studio recordings
- Individual WAV files ready to be sliced and converted
- Complete standard drum kit coverage

**Cons:**
- Full download is large (600 MB) -- need to curate subset for web
- Needs format conversion (WAV to OGG/MP3)
- Original source website is down (GitHub mirror is the primary download)
- Single kit character (no genre variants)

**Recommendation:** BEST OVERALL CHOICE. Public domain license eliminates all legal concerns for SaaS. Excellent velocity layering. Requires a one-time build step to select layers and convert to web formats, but the result would be a high-quality, legally clean drum kit.

---

### 2. FreePats MuldjordKit (Acoustic Drum Kit)

**Source URL:** https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html
**GitHub:** https://github.com/freepats/muldjordkit
**License:** **Creative Commons Attribution 4.0 (CC-BY-4.0)** -- Free for commercial use, requires attribution to Lars Muldjord.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 16-bit or 24-bit (varies by format)
- Velocity layers: Multiple (unspecified count per instrument, described as "velocity layers and randomized sounds")
- Originally recorded for the Sepulchrum debut album (2010) -- metal/rock character
- Stereo simplified version of the full 16-channel DrumGizmo kit

**Kit Contents:**
- 2 kick drums
- 1 snare
- 3 hanging toms
- 1 floor tom
- 1 hi-hat
- 2 crash cymbals
- 2 ride cymbals
- 1 China cymbal

**File Size:**

| Format | Compressed | Uncompressed |
|--------|-----------|-------------|
| SFZ + FLAC | 157 MB | 160 MB |
| SFZ + WAV | 223 MB | 380 MB |
| Hydrogen (H2) | 131 MB | -- |
| SF2 (SoundFont) | 53 MB | 209 MB |

**Web-Readiness:**
- SF2 format at 53 MB is a compact single-file option
- SFZ + FLAC provides individual samples that can be converted
- Multiple format options reduce conversion work
- SF2 could potentially be parsed with a JavaScript SoundFont loader

**Pros:**
- Available in multiple formats (SF2, SFZ, H2, WAV)
- SF2 at 53 MB is already relatively web-friendly
- CC-BY-4.0 is SaaS-compatible (just add attribution)
- Part of the well-maintained FreePats project
- Good variety of cymbals (ride, crash, China)

**Cons:**
- Attribution required (minor burden)
- Metal/rock character may not suit all genres
- Exact velocity layer count per instrument not documented
- Stereo-only (no individual mic channels)

**Recommendation:** Excellent second choice. The SF2 format is compact and the CC-BY license is very permissive. Good for a rock/metal kit character.

---

### 3. AVL Drumkits (Glen MacArthur)

**Source URL:** http://www.bandshed.net/avldrumkits/
**GitHub:** https://github.com/studiorack/avl-drumkits
**License:** **Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA-3.0)** -- Free for commercial use, requires attribution, derivatives must use same license.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 16-bit
- Velocity layers: 5 per drum piece
- 28 kit pieces/drum zones per kit
- Professionally recorded acoustic drums

**Kit Contents (4 kits):**
- **Black Pearl:** Pearl kit, versatile rock/pop sound (4-piece and 5-piece configs)
- **Red Zeppelin:** Ludwig kit, classic rock sound (4-piece and 5-piece configs)
- **Blonde Bop (Sticks):** Jazz-oriented kit
- **Blonde Bop (Hot Rods):** Jazz kit played with rute sticks (softer attack)
- **Buskman's Holiday:** Hand percussion set
- Each kit includes: kick, snare, toms, hi-hat, ride, crash, and more

**File Size:**
- Available in SF2, SFZ, and H2 formats
- SF2 versions estimated at ~30-60 MB per kit
- Total for all kits: ~150-250 MB uncompressed

**Web-Readiness:**
- Available as SF2 (single file, compact)
- SFZ with individual FLAC/WAV samples
- 5 velocity layers is a good balance of realism vs. file size
- Multiple kit styles provide genre versatility

**Pros:**
- FOUR distinct kit characters (rock, classic rock, jazz, percussion)
- 5 velocity layers per piece -- good dynamics without excessive file size
- Well-documented with keymaps
- Active community (used in Ardour, Harrison Mixbus)
- Multiple formats available

**Cons:**
- CC-BY-SA-3.0 share-alike clause means any modifications to the samples must be shared under the same license (but using them in a product does not trigger this)
- 16-bit mono samples (adequate but not premium)
- Some kits may sound dated compared to modern commercial libraries
- Attribution required

**Recommendation:** Best option for genre variety. Four distinct kit characters from a single source. The share-alike clause only applies if you modify and redistribute the samples themselves, not if you use them in your application.

---

### 4. Karoryfer Big Rusty Drums

**Source URL:** https://shop.karoryfer.com/pages/free-big-rusty-drums
**GitHub:** https://github.com/sfzinstruments/karoryfer.big-rusty-drums
**License:** **Creative Commons Zero (CC0-1.0)** -- Public domain dedication. No attribution required. No restrictions whatsoever.

**Quality Assessment:**
- Sample rate: 44.1 kHz (standard)
- Bit depth: 24-bit
- Velocity layers: Multiple (unspecified count)
- Over 4,400 samples total
- Extensive articulations (sticks, brushes, mallets, rim clicks, shell clicks, stirs)

**Kit Contents:**
- 24"x18" kick drum
- 14"x8" snare (with tambourine-on-top and small-tom-on-top variants)
- 22"x16" tom, 18"x16" tom, 15"x15" tom, 14"x14" tom (4 toms)
- 14" hi-hat (6 degrees of openness, foot chiks, foot splashes, return noises)
- 22" ride cymbal
- 17" crash cymbal
- 18" China crash
- 19" sizzle ride
- 17" sizzle crash
- Three-cymbal stack
- Mechanical noises (ghost notes, incidental sounds)

**File Size:**
- Full download: 2.3 GB (WAV)
- Web-optimized subset: estimated 80-120 MB (compressed, selected layers)

**Web-Readiness:**
- Format: WAV individual samples (needs conversion)
- SFZ mapping files included
- Extremely granular -- would need careful curation for web use
- Hi-hat with 6 openness degrees is very realistic but adds file size

**Pros:**
- CC0 license -- absolute legal safety for SaaS
- Exceptional articulation variety (brushes, mallets, stirs, mechanical noises)
- 6-degree hi-hat openness is industry-leading for a free kit
- Unique vintage character (1980s Polish drums)
- Over 4,400 samples for maximum realism

**Cons:**
- 2.3 GB full size is far too large for web -- requires aggressive curation
- Vintage/rusty character may not appeal to all users
- Oversized toms (22" to 14") give a specific boomy character
- Complex to integrate -- need to select subset and build pipeline

**Recommendation:** Best CC0 option for quality. The 6-degree hi-hat and extensive articulations are unmatched in free libraries. However, the 2.3 GB source requires significant curation work to create a web-friendly subset. Ideal if you want maximum legal safety plus premium quality and are willing to invest in the build pipeline.

---

### 5. Karoryfer Gogodze Phu Vol II

**Source URL:** https://shop.karoryfer.com/pages/free-gogodze-phu-vol-ii
**GitHub:** https://github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii
**License:** **Creative Commons Zero (CC0-1.0)** -- Public domain dedication. No restrictions.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 16-bit WAV
- Velocity layers: Multiple (sampled with 7 mic positions per kit piece)
- 1,701 samples total
- Variable fidelity -- lo-fi, hi-fi, or anywhere in between

**Kit Contents:**
- Kick drum
- Snare (sidestick, center, edge hits)
- 3 deadened toms
- Hi-hat (5 degrees of openness + foot chiks)
- 7 mic positions per piece (allows blending for character)

**File Size:**
- Full download: ~400 MB (16-bit WAV extracted)
- Compressed download: ~133 MB
- Web-optimized: estimated 30-40 MB

**Web-Readiness:**
- Individual WAV samples organized by instrument
- 7 mic positions could be pre-mixed to stereo for web use
- 16-bit source means smaller files than 24-bit alternatives
- Moderate curation needed

**Pros:**
- CC0 license -- full SaaS safety
- Unique "variable fidelity" character
- 5-degree hi-hat openness
- 7 mic positions per piece (pre-mix for different characters)
- Moderate total size (400 MB source, compressible to ~30-40 MB for web)

**Cons:**
- "Deadened" toms have a specific muffled character
- Smaller kit (no ride, crash, or cymbals beyond hi-hat)
- Lo-fi aesthetic may not suit all genres
- Less conventional than typical acoustic kits

**Recommendation:** Good CC0 option with a unique character. The variable fidelity and 7 mic positions allow creating different "sounds" from one kit. However, the lack of cymbals (ride, crash) means you would need to supplement from another library.

---

### 6. Naked Drums (Wilkinson Audio)

**Source URL:** https://github.com/sfzinstruments/WilkinsonAudio.NakedDrums
**Original:** https://wilkinsonaudio.com/collections/free
**License:** **Creative Commons Attribution 4.0 (CC-BY-4.0)** -- Free for commercial use, requires attribution.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 24-bit (estimated from professional recording)
- Velocity layers: Up to 5
- Round robins: 10 per articulation
- Multiple mic layers: Direct, OH, Close room, Far rooms, Mid-side, Wide OH
- Yamaha Recording Custom shell (Cherry) -- premium drum kit

**Kit Contents:**
- 22" kick drum
- Toms: 10", 12", 13", 14", 16"
- Snare: Ayotte 14"x5" silver sparkle
- Snare 2: Pearl 13"x6.5" Joey Jordison Signature
- Cymbals: Sabian HH/AA/AAX and Zildjian A Series
  - Splashes, crashes, chinas, ride, hi-hats

**File Size:**
- Full download: 1.3 GB (FLAC), expands to 2.7 GB (WAV)
- Web-optimized (stereo mixdown, select layers): estimated 60-100 MB

**Web-Readiness:**
- FLAC format needs conversion to OGG/MP3
- SFZ mapping files included for instrument organization
- 10 round robins is exceptional but adds to file count
- Could pre-mix mic layers to single stereo pair for web

**Pros:**
- Exceptional recording quality (professional studio, premium drums)
- 10 round robins eliminate "machine gun" repetition artifacts
- 5 velocity layers + 10 RR = very realistic dynamics
- Multiple mic positions allow character shaping
- Two snare options
- 5 toms for full fill capability

**Cons:**
- Large source (1.3 GB FLAC / 2.7 GB WAV) requires heavy curation
- Attribution required
- Complex multi-mic setup adds integration complexity
- Would need to pre-select mic mix for web delivery

**Recommendation:** Highest recording quality of all options evaluated. The 10 round robins are exceptional. However, the size and complexity make it the most work to integrate. Best for a "premium" kit where quality justifies the effort.

---

### 7. Salamander Drumkit (Alexander Holm)

**Source URL:** https://github.com/endolith/Salamander-Drumkit
**SFZ Instruments:** https://sfzinstruments.github.io/drums/salamander/
**License:** **Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA-3.0)** -- With an important clarification: "The share-alike condition applies only if you modify the samples or create new sample libraries. Produced music can be licensed at will."

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 24-bit
- Velocity layers: 2 (but 20+ samples per velocity layer for variation)
- 535 total samples
- Garage/organic recording character

**Kit Contents:**
- 18"x18" kick (Remo pinstripe head)
- 14"x5" snare (birch/mahogany, Evans power center)
- 14"x6" snare 2 (birch/mahogany, Evans genera dry)
- 12"x7" rack tom (Aquarian modern vintage)
- 14"x14" floor tom (Remo emperor / Evans G2)
- Paiste 18" china, crash, ride; 8" splash; 6" accent
- Stagg 14" hi-hat, 16" crash, 20" ride
- Masterworks 20" custom china

**File Size:**
- Trimmed samples: ~385 MB
- Web-optimized: estimated 40-60 MB

**Web-Readiness:**
- SFZ format with individual WAV samples
- "Trim" version by Jesse Chappell removes silence from onsets (reduced latency -- important for web!)
- Straightforward instrument organization
- Multiple versions available (original, sforzando, trimmed)

**Pros:**
- The "Trim" version with silence removed is ideal for web (lower latency)
- Many samples per velocity = natural variation without machine-gun effect
- Two snare options
- Extensive cymbal collection (china, splash, accent)
- Share-alike exemption for produced music/applications

**Cons:**
- Only 2 velocity layers (less dynamic range than competitors)
- Share-alike license requires same license if you modify and redistribute samples
- Garage recording character may sound less polished
- Older recording (may lack modern crispness)

**Recommendation:** Good choice for organic/indie sound. The trimmed version with latency optimization is a web-specific advantage. The 2-velocity-layer limitation is the main drawback, but the 20+ samples per layer compensate with natural variation.

---

### 8. SM Drums (Scott McLean)

**Source URL:** https://smmdrums.wordpress.com/
**SFZ Instruments:** https://sfzinstruments.github.io/drums/sm_drums/
**License:** **Public Domain** -- "Creative Commons Royalty-Free ('free to use') for use in non-commercial and commercial productions." Scott McLean offers the samples royalty-free for any audio/video production.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 24-bit
- Velocity layers: Up to 127 (kick: 127 velocity x 2 round robin; snare: 127 velocity x 4 round robin)
- The "deepest sampled drum kit in the world"
- Collector-grade Tama Superstar kit

**Kit Contents:**
- Full drum kit with extensive articulations
- Detailed velocity mapping across entire MIDI range
- Full and Lite versions available

**File Size:**
- Full version: 2.2 GB (WAV)
- Lite version: 876 MB
- Web-optimized: Would require aggressive downsampling to ~50-100 MB minimum

**Web-Readiness:**
- WAV format needs conversion
- Originally built for REAPER with custom project files
- 127 velocity layers is extreme overkill for web -- would need to select ~8-16 layers
- Lite version is more manageable but still large

**Pros:**
- Unmatched velocity depth (127 layers)
- Exceptional realism potential
- Public domain / royalty-free license
- Professional studio recording quality
- The gold standard for free drum sample depth

**Cons:**
- Far too large for web delivery even after optimization
- 127 velocity layers means massive curation effort to select subset
- Originally designed for REAPER, not general-purpose use
- Even the Lite version at 876 MB is too large for web without heavy work

**Recommendation:** The ultimate reference for quality, but impractical for web delivery without significant engineering effort to create a curated subset. Consider this if you want to invest in a premium build pipeline -- select 8-16 velocity layers and compress to web formats.

---

### 9. Google Chrome Labs Web Audio Drum Machine Samples

**Source URL:** https://googlechromelabs.github.io/web-audio-samples/demos/shiny-drum-machine/
**GitHub:** https://github.com/GoogleChromeLabs/web-audio-samples
**License:** **Apache License 2.0** -- Very permissive. Free for commercial use, modification, and redistribution. Patent grant included.

**Quality Assessment:**
- Sample rate: 44.1 kHz (standard web audio)
- Bit depth: 16-bit
- Velocity layers: None (single sample per instrument)
- 15 drum kits included
- Drum machine / electronic character (not acoustic realism)

**Kit Contents (15 kits across electronic styles):**
- Each kit includes: kick, snare, hi-hat, tom (low/mid/high), and possibly additional percussion
- Kits span various electronic genres
- Pre-mixed, ready-to-play WAV files

**File Size:**
- Estimated total: 5-10 MB for all 15 kits
- Individual kits: < 1 MB each
- Already web-optimized

**Web-Readiness:**
- Already deployed as a web application -- proven web-ready
- WAV format, small file sizes
- Designed specifically for Web Audio API
- Can be loaded directly from GitHub Pages CDN
- Apache 2.0 license is ideal for SaaS

**Pros:**
- ALREADY WEB-OPTIMIZED -- zero conversion work
- Apache 2.0 is one of the most permissive licenses
- 15 different kit characters
- Tiny file sizes
- Proven in production (Google's own demo)
- Patent grant protects against patent claims

**Cons:**
- No velocity layers -- unrealistic dynamics
- Electronic/drum machine character, not acoustic realism
- Low sample quality compared to dedicated drum libraries
- Not suitable as a primary "realistic drums" source
- Sparse kit contents per kit

**Recommendation:** Ideal for rapid prototyping or as an electronic/drum-machine supplement. Not suitable as the primary acoustic drum source due to lack of velocity layers and lower quality. The Apache 2.0 license and zero-conversion requirement make it the fastest path to having working drum sounds.

---

### 10. 99 Drum Samples (99Sounds)

**Source URL:** https://99sounds.org/drum-samples/
**License:** **Royalty-free, but with redistribution restrictions.** Cannot redistribute samples on their own. Cannot be used in "white noise apps" or "sleep sound apps." Embedding in a web application where users can trigger the sounds is a gray area -- the samples enhance the product but could be considered redistributed.

**Quality Assessment:**
- Sample rate: 44.1 kHz
- Bit depth: 24-bit WAV
- Velocity layers: None (single sample per sound)
- 209 total samples across 2 packs
- Professionally crafted from analog/digital synths, acoustic drums, classic drum machines, and field recordings

**Kit Contents (Pack I - 99 samples):**
- Claps (6), cowbell (1), crash cymbals (4)
- Closed hi-hats (11), open hi-hats (5)
- Kicks (26), snares (22), toms (9)
- Percussion (10), ride cymbals (2), shakers (3)

**Kit Contents (Pack II - 110 samples):**
- Claps (11), hi-hats (13), kicks (37)
- Percussion (13), snares (36)

**File Size:**
- Estimated total: ~50-80 MB (24-bit WAV for 209 samples)
- Web-optimized (OGG): estimated 15-20 MB

**Web-Readiness:**
- Individual WAV files, easy to convert
- No velocity layers simplifies integration
- Large variety of sounds for kit building
- Well-normalized samples

**Pros:**
- High production quality
- Wide variety (209 samples across many categories)
- 24-bit WAV source quality
- Well-normalized and trimmed
- Good for building multiple kit presets from one source

**Cons:**
- **License is problematic for SaaS** -- redistribution prohibition may conflict with serving samples to users in a web app
- No velocity layers
- Mixed aesthetic (electronic + acoustic + field recordings) rather than cohesive kit
- Need to contact 99Sounds to clarify SaaS usage rights

**Recommendation:** Good supplementary source for variety, but the license terms are ambiguous for SaaS use. Would need explicit permission from 99Sounds before using in a commercial web application. Best used for personal/internal prototyping, not production SaaS.

---

## Honorable Mentions (Not Ranked)

### Spitfire LABS Drums
- **License:** CC-BY-NC-4.0 (community SFZ conversion) / Proprietary (official LABS plugin)
- **Why not ranked:** The official version requires the LABS plugin (not extractable for web). The community SFZ conversion is CC-BY-NC (non-commercial only), which disqualifies it for SaaS use.

### Karoryfer Swirly Drums
- **License:** CC0-1.0
- **Size:** 1.6 GB
- **Why not ranked:** Brush-only, punk/indie aesthetic. Too niche for a general-purpose drum engine.

### Karoryfer Unruly Drums
- **License:** CC0-1.0
- **Size:** 2 GB
- **Why not ranked:** "Every drum is a snare" -- experimental, not conventional.

### Hydrogen Default Kits
- **License:** GPL-2.0
- **Why not ranked:** GPL copyleft license is problematic for proprietary SaaS. Would require the application to be GPL-licensed.

### NS_Kit7Free (Natural Studio)
- **Why not ranked:** No longer distributed. Copyright holder prohibits redistribution.

### Tone.js Built-in Audio Examples
- **Source:** https://github.com/Tonejs/audio
- **Why not ranked:** Primarily loops and demo files, not a complete one-shot drum kit library. Useful for reference but not as a production sample source.

---

## Integration Strategy for Arrangement Forge

### Recommended Approach

**Primary Kit:** The Open Source Drumkit (Public Domain)
- Select 8-12 velocity layers per instrument from the 20+ available
- Convert to OGG format at 44.1 kHz / 16-bit
- Organize as: `kick/v1.ogg` through `kick/v12.ogg`, etc.
- Estimated web delivery size: ~30-50 MB
- Map velocity ranges in Tone.js Sampler

**Alternative Kit (Rock):** FreePats MuldjordKit (CC-BY-4.0)
- Use the SF2 version (53 MB) or extract selected layers from SFZ+FLAC
- Add attribution in app credits/about page
- Provides a harder, more aggressive character

**Quick Start / Fallback:** Google Chrome Labs samples (Apache 2.0)
- Use as initial placeholder during development
- Swap in higher-quality samples later
- Keep as a "lightweight mode" option for slow connections

### Build Pipeline

```
Source WAV files
  -> Select velocity layers (8-12 per instrument)
  -> Trim silence from onsets (reduce latency)
  -> Normalize to -1 dB
  -> Convert to OGG Vorbis (q5, ~128 kbps equivalent)
  -> Generate MP3 fallback (128 kbps)
  -> Create Tone.js Sampler mapping JSON
  -> Deploy to CDN / Supabase Storage
```

### Tone.js Integration Pattern

```typescript
// Example: Loading a velocity-layered drum kit
const drumKit = new Tone.Sampler({
  urls: {
    // Map MIDI velocities to sample files
    "C1": "kick/v1.ogg",      // velocity 1-32 (soft)
    "C#1": "kick/v2.ogg",     // velocity 33-64
    "D1": "kick/v3.ogg",      // velocity 65-96
    "D#1": "kick/v4.ogg",     // velocity 97-127 (hard)
    "D2": "snare/v1.ogg",
    // ... etc
  },
  baseUrl: "/samples/drums/open-source-kit/",
  onload: () => console.log("Drum kit loaded"),
});

// Alternative: Use Tone.Players for one-shot triggering
const drums = new Tone.Players({
  kick_soft: "/samples/drums/kick/v1.ogg",
  kick_medium: "/samples/drums/kick/v2.ogg",
  kick_hard: "/samples/drums/kick/v3.ogg",
  snare_soft: "/samples/drums/snare/v1.ogg",
  // ... etc
});
```

### File Size Budget

| Component | Estimated Size (OGG) |
|-----------|---------------------|
| Kick (8 velocity layers) | 2-3 MB |
| Snare (8 velocity layers) | 2-3 MB |
| Hi-hat closed (8 velocity layers) | 1-2 MB |
| Hi-hat open (4 velocity layers) | 1-2 MB |
| Ride (4 velocity layers) | 2-3 MB |
| Crash (4 velocity layers) | 2-3 MB |
| Tom high (4 velocity layers) | 1-2 MB |
| Tom mid (4 velocity layers) | 1-2 MB |
| Tom low (4 velocity layers) | 1-2 MB |
| **Total per kit** | **~15-25 MB** |

This is well within the 50 MB budget for a single kit, leaving room for a second kit style.

---

## License Comparison Matrix

| Library | Commercial Use | Attribution | Share-Alike | Redistribution | SaaS Safe |
|---------|---------------|------------|-------------|---------------|-----------|
| Open Source Drumkit | Yes | No | No | Yes | YES |
| Karoryfer (CC0) | Yes | No | No | Yes | YES |
| FreePats (CC-BY-4.0) | Yes | Yes | No | Yes | YES |
| Naked Drums (CC-BY-4.0) | Yes | Yes | No | Yes | YES |
| AVL Drumkits (CC-BY-SA-3.0) | Yes | Yes | Yes (samples only) | Yes | YES* |
| Salamander (CC-BY-SA-3.0) | Yes | Yes | Yes (samples only) | Yes | YES* |
| SM Drums (Public Domain) | Yes | No | No | Yes | YES |
| Chrome Labs (Apache-2.0) | Yes | Yes (in source) | No | Yes | YES |
| 99Sounds (Royalty-free) | Yes | No | No | Restricted | UNCLEAR |
| LABS Drums SFZ (CC-BY-NC) | Non-commercial only | Yes | No | Yes | NO |

*Share-alike applies only to modified sample redistribution, not to using samples in an application.

---

## Sources

- [The Open Source Drumkit (GitHub)](https://github.com/crabacus/the-open-source-drumkit)
- [FreePats Acoustic Drum Kit](https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html)
- [AVL Drumkits (GitHub)](https://github.com/studiorack/avl-drumkits)
- [Karoryfer Big Rusty Drums](https://shop.karoryfer.com/pages/free-big-rusty-drums)
- [Karoryfer Gogodze Phu Vol II](https://shop.karoryfer.com/pages/free-gogodze-phu-vol-ii)
- [Naked Drums (GitHub)](https://github.com/sfzinstruments/WilkinsonAudio.NakedDrums)
- [Salamander Drumkit (GitHub)](https://github.com/endolith/Salamander-Drumkit)
- [SM Drums](https://smmdrums.wordpress.com/)
- [Google Chrome Labs Web Audio Samples (GitHub)](https://github.com/GoogleChromeLabs/web-audio-samples)
- [99 Drum Samples (99Sounds)](https://99sounds.org/drum-samples/)
- [SFZ Instruments - Drums Directory](https://sfzinstruments.github.io/drums/)
- [Karoryfer Free Samples (all CC0)](https://shop.karoryfer.com/pages/free-samples)
- [Bedroom Producers Blog - 11 Best Free Drum Kits 2026](https://bedroomproducersblog.com/2021/07/02/free-drum-kits/)
- [KVR Audio - Open Source Drumkit Thread](https://www.kvraudio.com/forum/viewtopic.php?t=277132)
- [Tone.js Audio Repository (GitHub)](https://github.com/Tonejs/audio)
- [Musical Artifacts - LABS Drums v2 SFZ](https://musical-artifacts.com/artifacts/1953)
- [Spitfire LABS Drums](https://labs.spitfireaudio.com/packs/drums)
- [99Sounds License Terms](https://99sounds.org/license/)
