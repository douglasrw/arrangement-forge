# Pre-Mixed Drum Samples Research Report

**Date:** 2026-03-03
**Purpose:** Identify the best pre-mixed, record-ready drum sample kits for Arrangement Forge (web-based SaaS, Tone.js / Web Audio API)
**Target Sound:** Warm, punchy, analog character (Tom Petty, Black Keys, Tame Impala, Arcade Fire) -- NOT raw/dry, NOT metal, NOT electronic/808

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Licensing Context for SaaS](#licensing-context-for-saas)
3. [Top 20 Ranked Candidates](#top-20-ranked-candidates)
4. [Full Candidate List (100+)](#full-candidate-list)
5. [Recommendations](#recommendations)

---

## Executive Summary

After researching 100+ drum sample libraries across commercial sites (Splice, Loopmasters, Native Instruments, XLN Audio), free/open-source repositories, independent producers, forum discussions (Gearspace, KVR, Reddit), and review sites, I have ranked the top 20 candidates based on:

- **Sound quality / pre-mixed character** (40% weight)
- **License suitability for SaaS embedding** (25% weight)
- **Genre fit -- classic/vintage/indie/warm sound** (20% weight)
- **Velocity layers and articulation variety** (10% weight)
- **File size / web compatibility** (5% weight)

**Key finding on licensing:** Standard "royalty-free" sample licenses allow use in original musical compositions but typically prohibit embedding samples in software products or sample playback systems. For Arrangement Forge (a SaaS where users trigger samples through our engine), we fall into a gray area. The safest options are:

1. **CC0 / Public Domain** samples (no restrictions whatsoever)
2. **Creative Commons** licensed samples (attribution may be required)
3. **Samples where we negotiate a custom license** with the provider
4. **Samples we record ourselves** (full ownership)

For the MVP, I recommend starting with CC0/CC-licensed samples and contacting 2-3 top commercial providers about custom SaaS licenses.

---

## Licensing Context for SaaS

Our use case: Users create arrangements in Arrangement Forge. Our Tone.js engine plays back drum samples through the browser. Users hear the samples but never download the raw WAV/OGG files directly. The samples are embedded in our application.

### License Categories

| Category | SaaS Safe? | Notes |
|---|---|---|
| CC0 (Public Domain) | Yes | No restrictions. Best option. |
| Creative Commons BY | Yes (with attribution) | Must credit the creator. Easy to comply. |
| Standard Royalty-Free | Likely No | Most prohibit embedding in "software" or "sample playback systems." Would need custom license. |
| Plugin/VST License | No | Tied to the plugin engine (Kontakt, etc.). Cannot extract samples for web use. |
| Custom/Negotiated | Yes | Contact provider directly. Many are willing to license for SaaS use at a premium. |

### Key License Language to Watch For

- "May not be used in any sample library, virtual instrument, or sample playback device" -- this would exclude our use
- "May not be redistributed in any form" -- streaming playback is technically not redistribution, but it is ambiguous
- "For use in original musical compositions only" -- our users create compositions, so this could work if the composition angle holds

---

## Top 20 Ranked Candidates

### #1: Circles Drum Samples -- Tape

**Source:** https://www.circlesdrumsamples.com/tape
**Price:** ~$30-50 (check site for current pricing)
**License:** Royalty-free (would need custom SaaS license negotiation)
**Format:** 24-bit / 44.1 kHz WAV + presets for Kontakt, Ableton, Battery 4, Slate Trigger 2

**What's Included:**
- 45 one-shot drum hits
- 10 velocity layers for snares and kicks, 3 round robins per layer
- 1,100+ total samples (including loops)
- ~1 GB total

**Sound Character:**
Drums processed through real tape machines for authentic analog warmth and "gooey-ness." Designed to smooth out harsh digital mixes. This is exactly the pre-mixed, record-ready sound we are looking for -- warm, saturated, with analog character baked in.

**Pros:**
- Tape-saturated sound is precisely the pre-mixed character we want
- Excellent velocity layering (10 layers)
- WAV format, easy to convert to OGG for web
- Reasonable file size (~1 GB raw, would compress well for web)

**Cons:**
- Standard royalty-free license likely does not cover SaaS embedding
- Would need to negotiate custom license
- Only 45 one-shot hits (limited variety per kit)
- Not specifically "rock" focused (more universal processed sound)

**Overall:** The tape processing makes these sound immediately record-ready. Top pick for sound quality.

---

### #2: GoranGrooves Handy Drums -- Retro Custom v2

**Source:** https://library.gorangrooves.com/virtual-instruments/handy-drums-retro-custom-v2/
**Price:** $39
**License:** Plugin license (would need to negotiate for sample extraction/SaaS use)
**Format:** VST/AU/AAX/Standalone plugin (786 MB)

**What's Included:**
- Full drum kit with retro/vintage processing
- Up to 10 dynamic levels, 12 round robins per dynamic level
- 24-bit WAV samples internally
- Pre-mixed in retro/dry 70s style

**Sound Character:**
Custom-made beech drumset sampled in a retro fashion. Warm, cozy sound used on records by Earth Wind & Fire, Fleetwood Mac, Bill Withers, John Mayer. Dry, deep-sounding with short sustain and dry room ambiance. Described as "album ready" out of the box.

**Pros:**
- Exactly the warm, vintage, pre-mixed sound we want (70s retro style)
- Exceptional velocity/round robin depth (10x12 = 120 variations per articulation)
- Reviewed as "best bang for your buck" with "Ready Mix" feel
- Affordable at $39

**Cons:**
- Plugin format only -- cannot directly extract WAV samples for Tone.js without negotiation
- License does not cover sample extraction for SaaS use
- Would need custom arrangement with GoranGrooves
- 786 MB is manageable but needs web optimization

**Overall:** Phenomenal sound for the target genre. The 70s retro pre-mixed character is exactly right. License is the main barrier.

---

### #3: Indie Drums -- Mix Ready Collection (The Collection)

**Source:** https://www.indiedrums.com/product/the-collection-drum-samples/
**Price:** $69.50-$74.50
**License:** Royalty-free (would need custom SaaS license)
**Format:** WAV, Drumagog, Trigger (48 kHz and 96 kHz)

**What's Included:**
- 6 complete drum kits: 70s Rock Kit, Yamaha Maple Custom, Moody & Brady Custom, Yamaha Recording Custom, DW Collectors & Keplinger Snare, Sonor Delite
- 13,000+ samples across all kits
- 5 velocity layers, 12 round robins per velocity
- 24-bit / 96 kHz (and 48 kHz option)
- 7.5 GB+ zipped

**Sound Character:**
Branded as "Mix Ready" -- recorded with Lynx Aurora converters at high resolution. The 70s Rock Kit features a vintage Gretsch drum kit. These are specifically designed to sit in a mix without additional processing.

**Pros:**
- 6 different kits provides excellent variety
- "Mix Ready" is literally their brand -- pre-mixed is the core concept
- Excellent velocity layering (5 layers x 12 round robins = 60 variations)
- The 70s Rock Kit is perfect for our target sound
- WAV format available

**Cons:**
- 7.5 GB is too large for web delivery raw (would need to downsample/compress aggressively)
- License likely does not cover SaaS embedding
- Price is moderate but not cheap
- 96 kHz is overkill for web (44.1 kHz sufficient)

**Overall:** The "Mix Ready" brand is exactly what we need. 70s Rock Kit is a near-perfect genre match. File size is the main practical concern.

---

### #4: Drumdrops -- Vintage Folk Rock Kit

**Source:** https://www.drum-drops.com/products/vintage-folk-rock-kit
**Price:** 5-30 GBP (~$6-$38) depending on pack
**License:** "Copyright free" with proof of purchase (need to clarify SaaS use)
**Format:** WAV

**What's Included:**
- One Shot Pack (57 samples, 1 velocity): 5 GBP
- Single Hits Pack (3 velocities, no round robins): 10 GBP
- Multi Sample Pack (up to 24 velocity steps, 3 round robins): 20 GBP
- All Samples Pack: 30 GBP
- Recorded on vintage 1966 Ludwig Hollywood kit
- Mixed by Phill Brown (John Martyn, Bob Marley, Rolling Stones, Led Zeppelin, Talk Talk)

**Sound Character:**
Recorded with sticks, brushes, and hotrods. Vintage feel with dark kick and non-harsh snare. Engineered for 60s/70s Folk Rock and Indie rock sound. Mixed by a legendary engineer with credits on some of the most iconic records ever made.

**Pros:**
- Mixed by Phill Brown -- legendary engineer. This IS pre-mixed by a master.
- 1966 Ludwig Hollywood kit -- authentic vintage sound
- Multiple articulations (sticks, brushes, hotrods) -- great for variety
- Excellent price point (30 GBP for everything)
- Up to 24 velocity steps with 3 round robins
- WAV format

**Cons:**
- License says "copyright free" but unclear on SaaS embedding
- Vintage sound may be TOO dark/soft for some rock styles
- Would need to negotiate for SaaS use
- File size not specified but likely moderate

**Overall:** The engineering pedigree (Phill Brown mixing a 1966 Ludwig) makes this one of the most authentically "record-ready" options available. Perfect vintage sound.

---

### #5: Just Add Drums -- Sound Like El Camino

**Source:** https://www.justadddrums.store/products/sound-like-el-camino-drum-samples
**Price:** From $35 (25-51 GBP depending on format)
**License:** Royalty-free (need to clarify SaaS use)
**Format:** WAV one-shots, Kontakt, Slate Trigger 2

**What's Included:**
- 6-7 velocity layers, 8 round robins per layer
- Kick, snare, toms, cymbals (WAV)
- Pre-mixed, balanced WAV one-shots
- Inspired by The Black Keys' El Camino sound

**Sound Character:**
Raw, gritty, and powerful drum sound of The Black Keys -- deep booming kick, dry low snare, dark resonant cymbals. Blues-rock punch with modern garage energy. Minimalist setup, heavy-hitting style.

**Pros:**
- Exactly the indie rock sound we want (Black Keys is a reference artist)
- Pre-mixed WAV one-shots ready for any sampler
- Good velocity layering (6-7 layers x 8 round robins)
- Grammy-winning engineer praised the accuracy
- WAV format compatible with Tone.js

**Cons:**
- Only one "kit sound" (specifically El Camino)
- License terms not explicit about SaaS embedding
- May be too specific/niche for a general-purpose backing track tool
- Cymbal samples are WAV-only (no velocity layers mentioned for cymbals)

**Overall:** If you want one kit that sounds like a finished record, this is it. The Black Keys sound is exactly in our target zone. Limited variety is the main drawback.

---

### #6: Versilian Studios -- Virtuosity Drums (CC0)

**Source:** https://versilian-studios.com/virtuosity-drums/
**Price:** FREE
**License:** Creative Commons 0 (CC0) -- Public Domain. No restrictions whatsoever.
**Format:** SFZ (WAV samples inside)

**What's Included:**
- Contemporary jazz drum kit
- Up to 36 dynamic layers (recorded with "wave" technique)
- 4 round robins for cymbals
- 6 mixable mic positions
- Multiple articulations (muted snare, semi-open hi-hat, buzzes, rolls, flams)

**Sound Character:**
Jazz-oriented kit recorded at Virtuosity Musical Instruments in Boston. Clean, detailed, responsive. Not specifically "vintage" or "warm" but high quality and natural sounding. Six mic positions allow mixing your own sound.

**Pros:**
- CC0 license -- ZERO restrictions, perfect for SaaS
- Exceptional dynamic depth (36 velocity layers!)
- Free
- Rich articulation set
- WAV samples can be extracted from SFZ format
- GitHub source available

**Cons:**
- Jazz-oriented, not specifically rock/indie sound
- Not pre-mixed -- you get raw multi-mic recordings and must mix them yourself
- 6 mic positions means large file size per hit
- Would need processing to achieve the warm/vintage sound we want
- Not "record-ready" out of the box for rock

**Overall:** The CC0 license makes this the safest legal option. However, it requires processing to achieve the pre-mixed warm sound we want. Could serve as a "legal foundation" that we process ourselves.

---

### #7: That Sound -- Vintage Kits

**Source:** https://splice.com/sounds/packs/that-sound/vintage-kits/samples (via Splice)
**Price:** Splice subscription credits or individual purchase
**License:** Splice license (royalty-free for music production; SaaS use unclear)
**Format:** WAV

**What's Included:**
- 258 drum samples
- Vintage, acoustic drums
- Production-ready, "fat and punchy out of the box"
- Classic rock elements

**Sound Character:**
That Sound is known for "production-ready drum sounds that sound fat and punchy out of the box." Their Vintage Kits pack specifically targets the classic rock / vintage sound. Highly praised by professional producers for adding "an organic feel to a track."

**Pros:**
- Production-ready sound is exactly what we need
- Strong reputation among professional producers
- Vintage kit focus matches our target genre
- Available on Splice (easy to preview)
- 258 samples gives good variety

**Cons:**
- Splice license terms may not cover SaaS embedding
- Would need to negotiate custom license
- Unclear how many velocity layers per sample
- File size not specified

**Overall:** Excellent sound quality and production values. License negotiation required for SaaS use.

---

### #8: Samplephonics/Noiiz -- Smashed Analogue Kit

**Source:** https://www.noiiz.com/sounds/free_packs/734
**Price:** FREE
**License:** Free download (Samplephonics/Noiiz standard license -- need to verify SaaS terms)
**Format:** 24-bit WAV + presets for Ableton, Kontakt, Reason, Logic, HALion, MachFive

**What's Included:**
- 1,188 drum samples
- 4 differently mixed kits
- Sampled through vintage Neve desk
- Processed with analogue distortion boxes, broken mixer channels, "inside out boom boxes"
- 262 MB download

**Sound Character:**
A gorgeous live drum kit run through extreme analog processing -- vintage Neve desk plus analog distortion, creating a heavily processed, characterful sound. Four different mix versions provide variety from clean to heavily smashed.

**Pros:**
- FREE
- Heavily processed through real analog gear -- exactly the "pre-mixed" character we want
- 1,188 samples is very generous
- 4 mix variations (clean to crushed) provides flexibility
- Vintage Neve desk processing is world-class
- WAV format, reasonable file size (262 MB)

**Cons:**
- May be TOO processed/distorted for some uses
- Samplephonics/Noiiz license terms may not cover SaaS
- The "smashed" sound is more alternative/experimental than classic rock
- Old library (2015), may have limited velocity layers

**Overall:** Outstanding free option with genuine analog character. The heavy processing is both a strength (unique sound) and potential limitation (may not suit all styles).

---

### #9: Past To Future Samples -- Psych Rock One Shots

**Source:** https://pasttofuturesamples.gumroad.com/l/ltsfr
**Price:** FREE ($0+ pay-what-you-want)
**License:** 100% royalty-free
**Format:** WAV

**What's Included:**
- Vintage Ludwig drum kit one shots
- Processed through tube compressors, vintage preamps, and tape machines
- Analog-processed drum hits

**Sound Character:**
Inspired by the warm, punchy character of vintage rock recordings. Authentic warmth, depth, and retro punch. Ideal for psych rock, classic rock, indie, and lo-fi production. The analog processing chain (tube compressors + vintage preamps + tape) is exactly what creates the "record-ready" sound.

**Pros:**
- FREE (pay-what-you-want)
- Genuinely processed through real analog gear (tube comps, tape)
- Perfect genre fit (psych rock, classic rock, indie)
- Vintage Ludwig kit -- authentic vintage source
- WAV format
- Small file size for web delivery

**Cons:**
- No velocity layers mentioned
- "Royalty-free" may not explicitly cover SaaS embedding
- Reports of noise, velocity/volume inconsistencies
- No round robins mentioned
- Limited articulation variety
- Small sample count

**Overall:** The sound is exactly right and it is free, but the lack of velocity layers is a significant limitation for realistic playback.

---

### #10: Samples From Mars -- All The Drums From Mars

**Source:** https://samplesfrommars.com/products/all-the-drums
**Price:** $89 (regularly $1,409)
**License:** 24-bit Royalty-Free WAV (need to verify SaaS terms)
**Format:** WAV + Ableton, FL Studio, Kontakt, Logic, MPC, Maschine, Reason presets

**What's Included:**
- 58 individual products bundled together
- 21 GB of content (unzipped)
- 100% hardware-sourced samples
- Drums recorded through API 1608 console, Apogee converters
- Truly tape-saturated (real tape machines, no emulation)
- 100% analog signal path

**Sound Character:**
Vintage and rare drum machines captured through high-end analog gear and real tape machines. Clean AND processed versions. API console + Ampex tape = warm, punchy, analog character. Brooklyn-based studio with impeccable analog credentials.

**Pros:**
- Massive library (58 products, 21 GB)
- Real tape saturation (not emulation)
- 100% analog signal path
- Excellent value ($89 for $1,409 worth of content)
- Multiple formats including WAV
- Both clean and processed versions

**Cons:**
- Primarily drum MACHINES, not acoustic drum kits
- 21 GB is way too large for web delivery (would need to cherry-pick)
- License terms unclear for SaaS
- Focus on electronic/hip-hop genres, not rock
- Overwhelming amount of content to curate

**Overall:** Incredible value and genuine analog character, but the focus on drum machines rather than acoustic kits makes it less ideal for our rock/indie target.

---

### #11: SM MegaReaper Drumkit (CC License)

**Source:** https://smmdrums.wordpress.com/
**Price:** FREE
**License:** Creative Commons Royalty-Free -- commercial and non-commercial use
**Format:** WAV (SFZ mapped)

**What's Included:**
- 127 velocity layers per articulation (!)
- 4 round robin variations per layer
- Full version: 1.9 GB (6 GB RAM needed)
- Lite version: 876 MB (4 GB RAM needed)

**Sound Character:**
Deeply sampled acoustic drum kit with unprecedented velocity detail. Clean, unprocessed recordings -- NOT pre-mixed. The sheer number of velocity layers (127) creates incredibly realistic dynamics.

**Pros:**
- Creative Commons license -- safe for SaaS use
- FREE
- 127 velocity layers is unmatched (most kits have 5-10)
- 4 round robins
- WAV format

**Cons:**
- NOT pre-mixed -- raw, unprocessed recordings
- Would need significant processing to achieve warm/vintage sound
- 1.9 GB full / 876 MB lite -- large for web
- 6 GB RAM requirement for full version is prohibitive for web
- Only acoustic kit sound (no vintage character baked in)

**Overall:** The velocity depth is extraordinary, but the raw/unprocessed sound means we would need to bake in our own processing. CC license is a major advantage.

---

### #12: Tuesday Samples -- Drums I Trust

**Source:** https://tuesdaysamples.com/products/drums-i-trust
**Price:** ~$10-15 (affordable)
**License:** Royalty-free (need to verify SaaS terms)
**Format:** 24-bit WAV + Ableton Drum Rack preset

**What's Included:**
- 80 live drum one-shots
- 8 variations of each drum piece (8 round robins)
- Full kit: kick, snare, closed/open hi-hat, low/mid/high tom, ride, crash
- Vintage Ludwig drum kit
- Round-robin Ableton Drum Rack

**Sound Character:**
Inspired by Men I Trust's silky, laid-back drum sound. Warm, human, intimate indie vibe. Dream pop, indie pop/rock, lo-fi. Vintage Ludwig kit recorded in a studio. 4.8/5 rating from 66 reviews. Described as "super flexible with effects."

**Pros:**
- Perfect indie rock/dream pop sound
- Vintage Ludwig source
- 8 round robins per piece for natural feel
- Very affordable
- Small file size for web
- Highly rated (4.8/5, 66 reviews)
- WAV format

**Cons:**
- Only 80 samples total (limited articulations)
- No velocity layers (8 round robins but single velocity)
- License terms not explicit about SaaS
- May be too soft/laid-back for energetic rock

**Overall:** Beautiful indie sound at an affordable price. The lack of velocity layers is the main limitation, but the 8 round robins provide good variation.

---

### #13: Spitfire Audio -- LABS Vintage Drums

**Source:** https://labs.spitfireaudio.com/packs/vintage-drums
**Price:** FREE
**License:** Spitfire Audio LABS license (non-commercial concerns -- need to verify SaaS terms)
**Format:** LABS plugin (proprietary format)

**What's Included:**
- 1970 Ludwig with 26" bass drum
- 1940s custom kit with original calfskin heads
- Controls for expression, dynamics, tight/open sound, reverb, grit/compression
- Recorded at KERWAX studio in Brittany with rare microphones and handmade console

**Sound Character:**
Warm, rounded tone from vintage kits (1940s and 1970s). Adjustable from tight to open "as recorded" sound, with a grittiness control from clean to over-compressed. Captured at a unique analog-only studio (KERWAX). Widely praised as "one of the best-sounding acoustic drum instruments available for free."

**Pros:**
- FREE
- Genuinely vintage kits (1940s and 1970s)
- Recorded at KERWAX (famous analog-only studio)
- Built-in processing controls (grit, compression)
- Excellent sound quality for free

**Cons:**
- LABS plugin format -- samples cannot be easily extracted for Tone.js
- License likely does not cover SaaS embedding or sample extraction
- Limited articulations compared to commercial libraries
- Spitfire license is restrictive about extraction

**Overall:** Outstanding sound but trapped in the LABS plugin format, making it unsuitable for our Tone.js-based architecture without license negotiation.

---

### #14: Noiiz/Samplephonics -- Vintage Drums

**Source:** https://www.noiiz.com/sounds/packs/1339
**Price:** Noiiz subscription ($9.99/month) or individual purchase
**License:** Royalty-free via Noiiz (need to verify SaaS terms)
**Format:** 24-bit WAV

**What's Included:**
- 5 iconic vintage kits: Sixties, Motown, Disco, Bonzo, Memphis
- Recorded by professional drummer Timmy Rickard
- Analog signal chain throughout
- Coles 4038 mic in hallway for Bonzo kit
- Tape slap on Sixties kit via Otari MX5050

**Sound Character:**
Five kits inspired by specific eras/sounds -- Sixties (tape slap), Motown (warm soul), Disco (punchy), Bonzo (Led Zeppelin-style room), Memphis (Sun Studios vibe). All tracked through purely analog signal chain.

**Pros:**
- 5 distinct vintage kits covering key eras
- Analog signal chain = genuine warm character
- Specific iconic references (Bonzo/Zeppelin, Motown, Memphis)
- Professional drummer performance
- WAV format
- Unique recording techniques per kit (Coles 4038 in hallway, etc.)

**Cons:**
- Subscription model (Noiiz) complicates one-time licensing
- License terms for SaaS embedding unclear
- May have limited velocity layers
- File size not specified

**Overall:** The era-specific kits (especially Bonzo and Memphis) are exactly the sounds we want. The analog processing is authentic.

---

### #15: Drumatica -- Steve Albini Indie Alt-Rock Drums

**Source:** https://drumatica.com/products/indie-music-drum-sample-pack-recorded-by-producer-steve-albini
**Price:** ~$49-99 (check site for current pricing)
**License:** Royalty-free WAV (need to verify SaaS terms)
**Format:** 48 kHz / 24-bit WAV + Slate Trigger 2 files

**What's Included:**
- Recorded at Electrical Audio in Chicago by Steve Albini (late 2023)
- Mid-1960s Ludwig Big Beat Mod Orange drum kit
- Albini's signature miking techniques
- Pre-mixed WAV samples included
- Engineer's Log detailing Albini's mic setup

**Sound Character:**
Steve Albini's recording style is legendary -- minimal processing, excellent room sound, natural dynamics. This kit captures his signature approach with a vintage 1960s Ludwig. The sound is raw but beautifully recorded -- not heavily processed, but naturally warm due to the analog recording chain and room acoustics.

**Pros:**
- Recorded by a LEGEND (Steve Albini at Electrical Audio)
- Mid-1960s Ludwig Big Beat -- iconic vintage kit
- Pre-mixed WAV format (no proprietary plugin needed)
- Albini's techniques = naturally warm and characterful
- "No barriers" to use in any DAW or sampler

**Cons:**
- Albini's style is "minimal processing" -- may need additional EQ/compression for record-ready sound
- License terms for SaaS not explicitly stated
- Pricing not clearly listed online
- Single kit only

**Overall:** The pedigree is unmatched. Albini's recordings at Electrical Audio with a vintage Ludwig are as authentic as it gets for the indie/alt-rock sound.

---

### #16: ModeAudio -- Real 2 Reel (Acoustic Drum Samples)

**Source:** https://modeaudio.com/product/real-2-reel-acoustic-drum-samples
**Price:** ~$15-25 (ModeAudio pricing)
**License:** Royalty-free (ModeAudio standard license)
**Format:** WAV + sampler patches (4 channel strips)

**What's Included:**
- 300 royalty-free drum samples
- Recorded with genuine acoustic drums, multiple mic positions
- Processed through vintage Studer A80 tape machine
- 4 tape hiss loops
- 10 ready-to-go drum kit sampler patches

**Sound Character:**
Real acoustic drums fed through a Studer A80 tape machine. "Tape-sizzled warmth" with vibrant, nostalgic authenticity. Suitable for Pop, Soul, Hip Hop, LoFi, R&B. Vintage character with swagger.

**Pros:**
- Real Studer A80 tape processing -- genuine analog warmth
- 300 samples is a good variety
- Affordable price
- Ready-to-go sampler patches
- Includes tape hiss loops for extra vintage flavor
- WAV format

**Cons:**
- License likely does not cover SaaS embedding
- 300 samples may lack deep velocity layering
- Not specifically rock-focused (more soul/pop/lo-fi)
- File size not specified

**Overall:** The Studer A80 tape processing gives these genuine analog warmth. Good value and variety.

---

### #17: SampleScience -- 1960s Drums

**Source:** https://samplescience.gumroad.com/l/lOtLB
**Price:** $1+ (pay-what-you-want)
**License:** Royalty-free
**Format:** WAV + REX2, 24-bit / 48 kHz

**What's Included:**
- 337 drum loops + 125 one-shot samples
- Recorded to magnetic tape using 1960s miking methods
- Tempos from 60bpm to 260bpm (loops)

**Sound Character:**
Authentic 1960s recording techniques -- magnetic tape, vintage miking. Designed for funk, soul, swing, and heavy rock. The tape recording gives natural warmth and vintage character.

**Pros:**
- Essentially free ($1)
- Recorded to tape with authentic 1960s techniques
- 125 one-shot samples in WAV
- Perfect era/sound for our target
- Very small file size for web

**Cons:**
- No velocity layers mentioned
- No round robins mentioned
- "Royalty-free" but SaaS terms unclear
- Quality may be variable at this price point
- Limited articulations

**Overall:** Amazing value for the price. The authentic 1960s tape recording approach is exactly right for the vintage sound we want.

---

### #18: Decent Samples -- Indie Drums

**Source:** https://www.decentsamples.com/product/indie-drums/
**Price:** $20
**License:** Decent Samples EULA (need to verify SaaS terms)
**Format:** Decent Sampler format (WAV samples inside), 24-bit / 48 kHz

**What's Included:**
- 12 drum hits (kick, rim, snare, closed/open hat, floor toms, rack toms, crash, ride)
- 3 velocity layers, 5 round robins per hit
- 13 indie rock grooves

**Sound Character:**
Classic indie rock drum sounds. Clean, well-recorded acoustic kit. Designed for indie rock production.

**Pros:**
- Decent velocity/round robin depth (3x5 = 15 variations per hit)
- Specifically indie rock focused
- Affordable ($20)
- WAV samples can be extracted
- Small file size

**Cons:**
- Only 12 hits -- very limited
- 3 velocity layers is minimal
- License terms need SaaS verification
- Not specifically "pre-mixed" -- more clean/natural
- Would need processing for warm/vintage character

**Overall:** Good indie rock foundation but limited in scope. The 3 velocity layers and 5 round robins provide decent realism.

---

### #19: WavBvkery -- 400 Free Acoustic Drum Samples

**Source:** https://wavbvkery.com/acoustic-drum-samples/
**Price:** FREE
**License:** Royalty-free
**Format:** WAV

**What's Included:**
- 400+ acoustic drum samples
- Vintage Ludwig drum set
- Kicks, snares, toms, cowbells, crashes, hi-hats, and more

**Sound Character:**
Vintage Ludwig drum set samples. Acoustic, natural sound. Good variety across drum types.

**Pros:**
- FREE
- 400+ samples is generous
- Vintage Ludwig source
- WAV format
- Royalty-free

**Cons:**
- No velocity layers mentioned
- "Royalty-free" but SaaS terms unclear
- Quality is unknown (free pack from independent creator)
- Not specifically pre-mixed or processed
- No round robins mentioned

**Overall:** A useful free source for vintage Ludwig sounds, but lacks the processing and velocity layering of commercial options.

---

### #20: Reverb -- Vintage Drum Samples Vol. 1

**Source:** https://reverb.com/featured/free-sample-packs-for-music-production
**Price:** FREE
**License:** Reverb license (may use for commercial purposes as part of a musical composition with other sounds)
**Format:** 24-bit WAV

**What's Included:**
- 150 drum samples
- Vintage drum kit samples
- Both one-shot samples and groove recordings
- 442 MB download

**Sound Character:**
Vintage drum kit samples with warm, authentic character. Designed to capture the sound of iconic vintage kits.

**Pros:**
- FREE
- 150 samples in 24-bit WAV
- Vintage drum focus
- Reverb is a reputable source
- License explicitly allows commercial use "as part of a musical composition"

**Cons:**
- "As part of a musical composition" language may not cover SaaS playback
- Unknown velocity layer depth
- Not specifically "pre-mixed" -- more naturally recorded
- 442 MB may need optimization for web

**Overall:** Good free vintage option from a reputable source. License language is more favorable than most but still ambiguous for SaaS.

---

## Full Candidate List

Below is the complete list of 100+ candidates researched. The top 20 above are marked with asterisks.

### Tier A: Highest Quality Pre-Mixed Sound (Commercial)

| # | Name | Source | Price | Pre-Mixed? | Genre Fit | Velocity Layers | License |
|---|---|---|---|---|---|---|---|
| 1* | Circles Tape | circlesdrumsamples.com | ~$30-50 | Yes (tape) | Universal | 10 layers, 3 RR | Royalty-free |
| 2* | GoranGrooves Retro Custom v2 | gorangrooves.com | $39 | Yes (70s retro) | Classic rock | 10 dynamic, 12 RR | Plugin license |
| 3* | Indie Drums Collection | indiedrums.com | $69-74 | Yes (Mix Ready) | Rock/indie | 5 layers, 12 RR | Royalty-free |
| 4* | Drumdrops Vintage Folk Rock | drum-drops.com | 5-30 GBP | Yes (Phill Brown mix) | Folk rock/indie | Up to 24 layers, 3 RR | Copyright-free |
| 5* | Just Add Drums El Camino | justadddrums.store | From $35 | Yes (pre-mixed WAV) | Indie/blues rock | 6-7 layers, 8 RR | Royalty-free |
| 6 | Room Sound Jay Maas | roomsound.com | $89 | Yes (mix-ready) | Punk/indie rock | Multi-velocity | Plugin license |
| 7 | Room Sound Kurt Ballou | roomsound.com | $89 | Yes | Alt rock/punk | Multi-velocity | Plugin license |
| 8 | Room Sound Beau Burchell | roomsound.com | $89 | Yes | Rock | Multi-velocity | Plugin license |
| 9 | Drumforge Classic | drumforge.com | ~$99 | Yes (mixed) | Rock/pop | Multi-velocity | Plugin license |
| 10 | Drumforge Billy Decker | drumforge.com | $39 | Yes (mix-ready) | Pop/rock/country | Single velocity one-shots | Royalty-free |
| 11 | GGD One Kit Wonder Classic Rock | ggd.co | $59 | Yes (fully mixed) | Classic rock | Multi-velocity | Plugin license |
| 12 | Steven Slate Drums 5.5 | stevenslatedrums.com | ~$99 | Yes (tape processed) | Rock/pop/indie | Multi-velocity | Plugin license |
| 13 | XLN Addictive Drums 2 Indie | xlnaudio.com | ~$79 | Yes (presets) | Indie rock | Multi-velocity | Plugin license |
| 14 | Toontrack Indie Folk EZX | toontrack.com | ~$69 | Yes (mix-ready) | Indie folk/rock | Multi-velocity | Plugin license |
| 15 | Toontrack Modern Retro EZX | toontrack.com | ~$69 | Yes | Pop/soul/R&B | Multi-velocity | Plugin license |
| 16 | Toontrack Classic Rock EZX | toontrack.com | ~$69 | Yes | Classic rock | Multi-velocity | Plugin license |
| 17* | That Sound Vintage Kits | Splice | Splice credits | Yes (production-ready) | Classic rock/vintage | Unknown | Splice license |
| 18* | Drumatica Albini Vol. 1 | drumatica.com | ~$49-99 | Partial (minimal proc) | Indie/alt rock | Unknown | Royalty-free |
| 19 | Live Room Audio Complete V1 | liveroomaudio.com | $200 | Yes (mix-ready) | Rock | Multi-velocity | Royalty-free |
| 20 | Circles Dirt | circlesdrumsamples.com | ~$30-50 | Yes (dirty/saturated) | Alt rock | Velocity layers | Royalty-free |
| 21 | Circles Dead | circlesdrumsamples.com | ~$30-50 | Yes (dead/muted) | Indie/alt | Velocity layers | Royalty-free |
| 22 | Just Add Drums Modern | justadddrums.store | ~$35 | Yes (pre-mixed) | Modern rock | Velocity layers, RR | Royalty-free |
| 23 | Drumdrops Shoegaze Kit | drum-drops.com | ~10-30 GBP | Yes | Shoegaze/indie | Up to 16 vel, RR | Copyright-free |
| 24 | We Sound Human Classic Rock | wesoundhuman.com | ~$30-50 | Yes (mix-ready) | Classic rock | Unknown | Royalty-free |
| 25 | We Sound Human Southern Rock | wesoundhuman.com | ~$30-50 | Yes | Southern rock | Unknown | Royalty-free |
| 26 | We Sound Human Fury (Indie) | wesoundhuman.com | ~$30-50 | Yes | Indie rock | Unknown | Royalty-free |
| 27 | PERCS Drum Essentials V1 | percs.live | $19.99 | Yes (individually processed) | Modern/worship | 2 sample rates | Royalty-free |
| 28 | Drum Sample Shop (various) | drumsampleshop.com | Various | Yes | Various | Unknown | Royalty-free |
| 29 | Yurt Rock Dry Drums V4 | yurtrock.com | ~$30-50 | Yes (processed) | Indie/funk/classic rock | Unknown | Royalty-free |
| 30 | Yurt Rock Indie Rock Bundle | yurtrock.com | ~$50-100 | Yes | Indie rock | Unknown | Royalty-free |
| 31 | AVA PRISM Taped Indie Pop | avamusicgroup.com | ~$49 | Yes (tape machine) | Indie pop | Multi-velocity | NKS license |
| 32 | Goldbaby Tape Drum Collection | goldbaby.co.nz | ~$49 | Yes (tape saturated) | Various | Multi-velocity | Royalty-free |
| 33 | Perfect Drums (Naughty Seal) | theperfectdrums.com | ~$59 | Yes (mix-ready) | Rock/metal | Multi-velocity | Plugin license |

### Tier B: Good Quality, Various Processing Levels

| # | Name | Source | Price | Pre-Mixed? | Genre Fit | Velocity Layers | License |
|---|---|---|---|---|---|---|---|
| 34 | Past To Future Impala Drums | pasttofuturesamples.gumroad.com | ~$15-30 | Yes (analog processed) | Psych rock/indie | 20 RR | Royalty-free |
| 35* | Drums I Trust (Tuesday) | tuesdaysamples.com | ~$10-15 | Partial | Indie/dream pop | 8 RR, single vel | Royalty-free |
| 36* | ModeAudio Real 2 Reel | modeaudio.com | ~$15-25 | Yes (Studer A80 tape) | Pop/soul | Unknown | Royalty-free |
| 37* | SampleScience 1960s Drums | samplescience.gumroad.com | $1+ | Yes (tape recorded) | Funk/soul/rock | Unknown | Royalty-free |
| 38 | Indie Drums 70s Rock Kit | indiedrums.com | ~$25 | Yes (Mix Ready) | Classic rock | 5 layers, 12 RR | Royalty-free |
| 39 | Indie Drums Slingerland (Free) | indiedrums.com | FREE | Partial | Rock | Limited | Royalty-free |
| 40 | Indie Drums DW Collectors Lite | indiedrums.com | FREE | Partial | Rock | Limited | Royalty-free |
| 41 | Drumdrops Modern Folk Rock | drum-drops.com | ~10-30 GBP | Yes | Modern folk/indie | Multi-velocity | Copyright-free |
| 42 | Loopmasters Acoustic Drum Workshop | loopmasters.com | ~$15-30 | Partial | Various | Multiple velocities | Royalty-free |
| 43 | ModeAudio Vinyl Drums | modeaudio.com | ~$15-25 | Yes (vinyl processed) | Vintage/retro | Unknown | Royalty-free |
| 44 | TouchLoops Analogue Drum One-Shots | touchloops.com | ~$15-25 | Yes (analog) | Various | Unknown | Royalty-free |
| 45 | Big Fish Audio SMASH Indie Pop Rock | bigfishaudio.com | ~$30-50 | Yes | Indie pop/rock | Unknown | Royalty-free |
| 46 | Wave Alchemy Synth Drums (Tape) | wavealchemy.co.uk | ~$30-50 | Yes (tape processed) | Electronic/vintage | Multi-velocity | Royalty-free |
| 47 | Soundcamp Drum One-Shots | soundcamp.org | FREE | Partial | Various | Unknown | Various |
| 48 | Rhythm Lab One-Shot Drums | rhythm-lab.com | ~$15-30 | Partial | Various | Unknown | Royalty-free |
| 49 | WAVS One Shots | wavs.com | Various | Partial | Various | Unknown | WAVS license |

### Tier C: Free / Open-Source Options

| # | Name | Source | Price | Pre-Mixed? | Genre Fit | Velocity Layers | License |
|---|---|---|---|---|---|---|---|
| 50* | Versilian Virtuosity Drums | versilian-studios.com | FREE | No (raw multi-mic) | Jazz | 36 dynamic layers | CC0 |
| 51* | SM MegaReaper Drumkit | smmdrums.wordpress.com | FREE | No (raw) | General | 127 vel, 4 RR | CC RF |
| 52* | Samplephonics Smashed Analogue | noiiz.com | FREE | Yes (heavy analog) | Alt/experimental | Unknown | Free license |
| 53* | Past To Future Psych Rock | gumroad.com | FREE | Yes (analog) | Psych/classic rock | Unknown | Royalty-free |
| 54* | Spitfire LABS Vintage Drums | labs.spitfireaudio.com | FREE | Partial (controls) | Vintage | Expression control | LABS license |
| 55* | WavBvkery 400 Acoustic | wavbvkery.com | FREE | No | General | Unknown | Royalty-free |
| 56* | Reverb Vintage Drums V1 | reverb.com | FREE | Partial | Vintage | Unknown | Reverb license |
| 57 | Spitfire LABS Drums | labs.spitfireaudio.com | FREE | Partial | General | Expression control | LABS license |
| 58 | 99Sounds 99 Drum Samples I | 99sounds.org | FREE | Yes (processed) | Various | Unknown | Royalty-free |
| 59 | 99Sounds 99 Drum Samples II | 99sounds.org | FREE | Yes (processed) | Various | Unknown | Royalty-free |
| 60 | That Sound Gratis (500 sounds) | iwantthatsound.com | FREE | Yes (production-ready) | Various acoustic | Unknown | Free license |
| 61 | Goldbaby Free Packs | goldbaby.co.nz | FREE | Yes (processed) | Various | Unknown | Free license |
| 62 | Black Octopus Free 1GB | blackoctopus-sound.com | FREE | Yes (production-ready) | EDM/electronic | Unknown | Royalty-free |
| 63 | DrumGizmo MuldjordKit | drumgizmo.org | FREE | No (multi-mic raw) | General | Multi-velocity | CC BY 4.0 |
| 64 | DrumGizmo (other kits) | drumgizmo.org | FREE | No (multi-mic raw) | Various | Multi-velocity | Various CC |
| 65 | Hydrogen Drum Kits | hydrogen-music.org | FREE | No | Various | Limited | GPL |
| 66 | Free Wave Samples H2 Kits | freewavesamples.com | FREE | No | Various | Limited | Free |
| 67 | KB6.de Drum Machine Archive | samples.kb6.de | FREE | Partial | Electronic vintage | Limited | Free |
| 68 | GitHub drum-samples | github.com/gregharvey | FREE | No | Various | Limited | Open source |
| 69 | Deviant Drums FREE Edition | Various | FREE | Partial | General | 8 vel, 7 RR | Free (Kontakt Player) |
| 70 | DrumThrash Free Samples | drumthrash.com | FREE | No | General | Unknown | Free |
| 71 | Unison Free Acoustic Drums | unison.audio | FREE | Partial | General | Unknown | Free |
| 72 | SampleRadar Free Analogue | musicradar.com | FREE | Partial | Electronic | Unknown | Royalty-free |
| 73 | Versilian VCSL | github.com/sgossner/VCSL | FREE | No | Various | Various | CC0 |
| 74 | Ghosthack Drum One-Shots | ghosthack.de | FREE | Partial | Various | Unknown | Free |
| 75 | Samplephonics Free One-Shots | samplephonics.com | FREE | Partial | Various | Unknown | Royalty-free |

### Tier D: Drum Machine / Electronic Focus (Less Relevant but Notable)

| # | Name | Source | Price | Pre-Mixed? | Genre Fit | Notes |
|---|---|---|---|---|---|---|
| 76 | Reverb Drum Machines Collection | reverb.com | FREE | Yes | Electronic | 50+ vintage machines |
| 77 | Samples From Mars TR Collection | samplesfrommars.com | ~$10-30 | Yes (tape) | Electronic | 808, 909, 606 etc |
| 78 | Wave Alchemy Drum Tools 02 | wavealchemy.co.uk | ~$30 | Yes | Electronic | 4000+ samples |
| 79 | KB6.de (309 Drum Sets) | samples.kb6.de | FREE | Partial | Electronic vintage | 34,297 WAV samples |
| 80 | Loopmasters Vintage Drum Machines | loopmasters.com | ~$20 | Yes | Classic house | MPC60 processed |
| 81 | Goldbaby Tape 909 | goldbaby.co.nz | ~$20 | Yes (tape) | Electronic | Ampex tape machine |
| 82 | LABS Drum Machines | labs.spitfireaudio.com | FREE | Partial | Electronic | LABS format |

### Tier E: Plugin-Only (Cannot Extract Samples for Web)

| # | Name | Source | Price | Notes |
|---|---|---|---|---|
| 83 | EZdrummer 3 | toontrack.com | $179 | Excellent sound, plugin-only |
| 84 | Superior Drummer 3 | toontrack.com | $399 | Industry standard, plugin-only |
| 85 | BFD3 | inmusicbrands.com | ~$249 | Highly realistic, plugin-only |
| 86 | Studio Drummer (NI) | native-instruments.com | ~$149 | Part of Komplete, plugin-only |
| 87 | Soundblind Counterkit | soundblinddrums.com | ~$49 | Metal/rock focus, plugin-only |
| 88 | Soundblind Powerkit | soundblinddrums.com | ~$49 | Metal focus, plugin-only |
| 89 | Hertz Drums | hertzdrumsoftware.com | ~$59 | Metal/rock, plugin-only |
| 90 | XLN AD2 Studio Rock | xlnaudio.com | ~$79 | Plugin-only |
| 91 | XLN AD2 Vintage Rock | xlnaudio.com | ~$79 | Plugin-only |

### Tier F: Loops/Grooves Focus (Less Relevant for One-Shots)

| # | Name | Source | Price | Notes |
|---|---|---|---|---|
| 92 | Loop Loft Mark Guiliana | thelooploft.com | ~$49 | Loops + 59 one-shots |
| 93 | Oasis Music Library | oasismusiclibrary.com | Various | Loops focus |
| 94 | Looperman Free Indie Drums | looperman.com | FREE | User-submitted loops |
| 95 | We Sound Human Songwriter | wesoundhuman.com | ~$30 | Loops + one-shots |
| 96 | Noiiz Vintage Drum Breaks | noiiz.com | Subscription | Break-focused loops |
| 97 | TouchLoops Vintage Drum Breaks | splice.com | Splice credits | Loops |

### Tier G: Additional / Niche Options

| # | Name | Source | Price | Notes |
|---|---|---|---|---|
| 98* | Decent Samples Indie Drums | decentsamples.com | $20 | 3 vel, 5 RR per hit |
| 99* | Noiiz Vintage Drums (5 kits) | noiiz.com | Subscription | 5 era-specific kits |
| 100 | Soft Drums Lite | Various | FREE | Folk/Americana, very soft |
| 101 | Prism Drums Lite (AVA) | avamusicgroup.com | FREE | Modern pop drums |
| 102 | Rhythmic Robot Jacky | Various | FREE | Vintage rhythm machine |
| 103 | Wave Alchemy Rhythm Machine | wavealchemy.co.uk | FREE | Classic rhythm machine |
| 104 | Drumhaus (web app) | drumha.us | Open source | React+Tone.js reference |
| 105 | NI Free Kontakt Drums | native-instruments.com | FREE | Various free Kontakt |

---

## Recommendations

### For MVP Launch (Immediate)

**Strategy: CC0/CC licensed samples + our own processing**

1. **Start with Versilian Virtuosity Drums (CC0)** as the legal foundation. Apply our own EQ, compression, saturation, and reverb processing offline to create pre-mixed WAV files. The 36 velocity layers provide exceptional realism. Jazz-focused but can be processed to sound warmer/rockier.

2. **Add SM MegaReaper Drumkit (CC)** for an alternative kit sound. Process the raw samples ourselves to add warmth/character. The 127 velocity layers are unmatched for realistic dynamics.

3. **Use Samplephonics Smashed Analogue Kit (free)** as a "processed/warm" kit option if the license terms allow SaaS use (verify first).

4. **Use Past To Future Psych Rock One Shots (free, royalty-free)** as a quick warm/vintage option, despite limited velocity layers.

### For v1.1 / Quality Upgrade

**Strategy: Negotiate custom SaaS licenses with top providers**

5. **Contact Circles Drum Samples** about a SaaS license for their Tape library. The tape-saturated sound is exactly what we want.

6. **Contact Drumdrops** about their "copyright-free" license applying to SaaS use. Their Vintage Folk Rock Kit (mixed by Phill Brown!) is an exceptional value at 30 GBP.

7. **Contact Indie Drums** about a SaaS license for their Mix Ready Collection. The 70s Rock Kit is perfect.

8. **Contact Just Add Drums** about their El Camino pack for SaaS use. Perfect Black Keys/indie rock sound.

### Long-Term Strategy

9. **Commission custom drum recordings.** Hire a session drummer, rent a studio with a vintage kit, and record through an analog chain. This gives us full ownership, no licensing concerns, and we can specify exactly the sound we want. Cost: $2,000-5,000 for a professional session yielding multiple kits.

10. **Build a "processed sample pipeline"** where we take CC0/CC samples and run them through an offline processing chain (EQ + compression + saturation + room reverb) to create our own pre-mixed versions. This can be automated and gives us full control.

### Web Delivery Optimization

For any samples we use, the web delivery pipeline should:

1. Downsample from 96/48 kHz to 44.1 kHz (sufficient for browser playback)
2. Convert from 24-bit WAV to OGG Vorbis (5-10x size reduction)
3. Target 3-5 velocity layers per piece (balance between realism and file size)
4. Aim for under 20 MB per complete kit (compressed)
5. Lazy-load kits only when needed
6. Cache aggressively with service workers

### File Size Budget (per kit)

| Piece | Vel Layers | Samples | OGG Size (est.) |
|---|---|---|---|
| Kick | 5 | 5 | ~500 KB |
| Snare | 5 | 5 | ~500 KB |
| Hi-Hat Closed | 5 | 5 | ~300 KB |
| Hi-Hat Open | 3 | 3 | ~300 KB |
| Ride | 3 | 3 | ~400 KB |
| Crash | 3 | 3 | ~400 KB |
| Tom High | 3 | 3 | ~300 KB |
| Tom Mid | 3 | 3 | ~300 KB |
| Tom Low | 3 | 3 | ~400 KB |
| **Total** | | **33 samples** | **~3.4 MB** |

With 3 round robins per velocity layer: ~10 MB per kit. With 2-3 kits loaded: ~20-30 MB total, which is excellent for web delivery.

---

## Key Takeaways

1. **The "pre-mixed" drum sample market is thriving** -- many producers specifically market "mix-ready" or "production-ready" samples. Our requirements are well-served by the market.

2. **Licensing is the primary barrier**, not sound quality. Most great-sounding libraries have licenses that do not explicitly cover SaaS embedding. CC0/CC licenses are the safest route.

3. **Tape processing is the key differentiator** for the warm, record-ready sound we want. Circles Tape, ModeAudio Real 2 Reel, Samples From Mars, and Goldbaby all use real tape machines.

4. **Vintage kits (Ludwig, Gretsch, Slingerland) are abundant** and well-represented in the sample market. The hardware is not the bottleneck.

5. **Processing CC0 samples ourselves** is the most legally safe approach for MVP. We can apply our own EQ, compression, tape saturation, and reverb to create the sound we want while maintaining full legal clearance.

6. **File sizes are very manageable** for web delivery. A complete kit with 5 velocity layers compressed to OGG is typically under 10 MB -- well within our budget.

---

## Sources Referenced

- [Circles Drum Samples](https://www.circlesdrumsamples.com/)
- [GoranGrooves Handy Drums](https://library.gorangrooves.com/)
- [Indie Drums](https://www.indiedrums.com/)
- [Drumdrops](https://www.drum-drops.com/)
- [Just Add Drums](https://www.justadddrums.store/)
- [Versilian Studios Virtuosity Drums](https://versilian-studios.com/virtuosity-drums/)
- [That Sound](https://www.iwantthatsound.com/)
- [Samplephonics/Noiiz](https://www.noiiz.com/)
- [Past To Future Samples](https://pasttofuturesamples.gumroad.com/)
- [Samples From Mars](https://samplesfrommars.com/)
- [SM MegaReaper Drumkit](https://smmdrums.wordpress.com/)
- [Tuesday Samples](https://tuesdaysamples.com/)
- [Spitfire Audio LABS](https://labs.spitfireaudio.com/)
- [Drumatica](https://drumatica.com/)
- [ModeAudio](https://modeaudio.com/)
- [SampleScience](https://www.samplescience.info/)
- [Decent Samples](https://www.decentsamples.com/)
- [WavBvkery](https://wavbvkery.com/)
- [Reverb Free Sample Packs](https://reverb.com/featured/free-sample-packs-for-music-production)
- [Room Sound](https://www.roomsound.com/)
- [Drumforge](https://drumforge.com/)
- [GetGood Drums](https://www.getgooddrums.com/)
- [Steven Slate Drums](https://stevenslatedrums.com/)
- [XLN Audio Addictive Drums](https://www.xlnaudio.com/)
- [Toontrack EZdrummer](https://www.toontrack.com/)
- [We Sound Human](https://www.wesoundhuman.com/)
- [Yurt Rock](https://yurtrock.com/)
- [AVA Music Group](https://avamusicgroup.com/)
- [Goldbaby](https://www.goldbaby.co.nz/)
- [Wave Alchemy](https://www.wavealchemy.co.uk/)
- [Loopmasters](https://www.loopmasters.com/)
- [Black Octopus Sound](https://blackoctopus-sound.com/)
- [DrumGizmo](https://drumgizmo.org/)
- [99Sounds](https://99sounds.org/)
- [PERCS](https://percs.live/)
- [Drum Werks](https://www.drumwerks.com/)
- [Drum Sample Shop](https://www.drumsampleshop.com/)
- [Live Room Audio](https://liveroomaudio.com/)
- [KB6.de](https://samples.kb6.de/)
- [Drumhaus (React+Tone.js reference)](https://github.com/mxfng/drumhaus)
- [Bedroom Producers Blog - Best Free Drum Kits](https://bedroomproducersblog.com/2021/07/02/free-drum-kits/)
- [Gearspace Forum Discussions](https://gearspace.com/)
- [KVR Audio Forum Discussions](https://www.kvraudio.com/forum/)
- [Splice](https://splice.com/)
