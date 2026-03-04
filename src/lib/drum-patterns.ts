// drum-patterns.ts — Comprehensive drum pattern library with builder function.
// Contains pattern data for all 9 genres, fill library, and the buildDrumMidi() orchestrator.

import type { MidiNoteData } from '@/types';
import { getDrumPatternId } from '@/lib/genre-config';

// ---------- Type Definitions ----------

export interface DrumHit {
  note: string;           // GM note name (C2, D2, F#2, etc.)
  time: number;           // Beat offset within bar (0-based, fractional)
  duration: number;       // Duration in beats (typically 0.05-0.5 for drums)
  velocity: number;       // 0-127
  probability?: number;   // 0-1; if present, hit only plays when hash < probability
}

export interface DrumPattern {
  id: string;             // e.g., 'rock_straight_4-4'
  genre: string;          // Primary genre
  substyles: string[];    // Which substyles this pattern serves
  timeSignature: string;  // '4/4', '3/4', '6/8', '2/4'
  subdivision: 8 | 16;    // Base grid: 8th notes or 16th notes
  swing: number;          // Default swing amount 0-1 (0.5 = straight, 0.67 = triplet)
  bars: DrumHit[][];      // Main groove bars (cycle through these)
  variations: DrumHit[][]; // Alternate bars to mix in for variety
}

export interface DrumFill {
  id: string;
  energyRange: [number, number]; // Min-max energy where appropriate
  timeSignature: string;
  hits: DrumHit[];        // Hits for a 1-bar fill (time 0-3 in 4/4)
}

// ---------- Valid GM drum note names (used in tests) ----------

export const VALID_DRUM_NOTES = new Set([
  'C2', 'C#2', 'D2', 'F2', 'F#2', 'G#2', 'A2', 'A#2',
  'C#3', 'D3', 'D#3', 'F3',
]);

// ---------- Deterministic Hash ----------

/** Knuth multiplicative hash for deterministic variation.
 * Returns a value between 0 and 0.999. */
export function knuthHash(barNumber: number, seed: number = 0): number {
  const n = ((barNumber + seed) * 2654435761) >>> 0;
  return (n % 1000) / 1000;
}

// ---------- Rock Patterns ----------

const ROCK_STRAIGHT_BAR_1: DrumHit[] = [
  // Kick
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 100 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 95 },
  // Closed hi-hat on 8th notes
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 80 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 55 },
];

const ROCK_STRAIGHT_BAR_2: DrumHit[] = [
  // Kick -- adds syncopated pickup on "and" of 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 100 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 70 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 95 },
  // Ghost note before beat 2 (probabilistic)
  { note: 'D2',  time: 0.75, duration: 0.1,  velocity: 35, probability: 0.4 },
  // Closed hi-hat on 8th notes
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 80 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 75 },
  // Open hat on the last upbeat (replaces closed hat)
  { note: 'A#2', time: 3.5,  duration: 0.2,  velocity: 70 },
];

// ---------- Jazz Patterns ----------

const JAZZ_SWING_BAR_1: DrumHit[] = [
  // Ride cymbal -- spang-a-lang pattern
  { note: 'D#3', time: 0,    duration: 0.3,  velocity: 72 },
  { note: 'D#3', time: 1,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 1.5,  duration: 0.2,  velocity: 55 },
  { note: 'D#3', time: 2,    duration: 0.3,  velocity: 70 },
  { note: 'D#3', time: 3,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 3.5,  duration: 0.2,  velocity: 55 },
  // Pedal hi-hat -- foot on 2 and 4
  { note: 'G#2', time: 1,    duration: 0.1,  velocity: 40 },
  { note: 'G#2', time: 3,    duration: 0.1,  velocity: 40 },
  // Kick -- feathered (very soft, probabilistic)
  { note: 'C2',  time: 0,    duration: 0.3,  velocity: 50, probability: 0.7 },
  { note: 'C2',  time: 2,    duration: 0.3,  velocity: 45, probability: 0.5 },
  // Snare -- ghost note comping (probabilistic)
  { note: 'D2',  time: 1.5,  duration: 0.1,  velocity: 30, probability: 0.35 },
  { note: 'D2',  time: 2.5,  duration: 0.1,  velocity: 28, probability: 0.3 },
];

const JAZZ_SWING_BAR_2: DrumHit[] = [
  // Ride bell on beat 1 (phrase emphasis)
  { note: 'F3',  time: 0,    duration: 0.3,  velocity: 78 },
  // Ride cymbal continues
  { note: 'D#3', time: 1,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 1.5,  duration: 0.2,  velocity: 55 },
  { note: 'D#3', time: 2,    duration: 0.3,  velocity: 70 },
  { note: 'D#3', time: 3,    duration: 0.3,  velocity: 65 },
  { note: 'D#3', time: 3.5,  duration: 0.2,  velocity: 55 },
  // Pedal hi-hat
  { note: 'G#2', time: 1,    duration: 0.1,  velocity: 40 },
  { note: 'G#2', time: 3,    duration: 0.1,  velocity: 40 },
  // Kick -- different placement
  { note: 'C2',  time: 0,    duration: 0.3,  velocity: 55, probability: 0.6 },
  { note: 'C2',  time: 2.5,  duration: 0.25, velocity: 42, probability: 0.4 },
  // Snare ghost comping -- different beats than bar 1
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 32, probability: 0.3 },
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 28, probability: 0.25 },
];

// ---------- Funk Patterns ----------

const FUNK_POCKET_BAR_1: DrumHit[] = [
  // Kick -- syncopated
  { note: 'C2',  time: 0,     duration: 0.2,  velocity: 100 },
  { note: 'C2',  time: 0.75,  duration: 0.15, velocity: 72 },
  { note: 'C2',  time: 2.5,   duration: 0.2,  velocity: 88 },
  // Snare -- backbeat
  { note: 'D2',  time: 1,     duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,     duration: 0.2,  velocity: 95 },
  // Snare ghost notes
  { note: 'D2',  time: 0.5,   duration: 0.1,  velocity: 32 },
  { note: 'D2',  time: 1.75,  duration: 0.1,  velocity: 35 },
  { note: 'D2',  time: 2.25,  duration: 0.1,  velocity: 30, probability: 0.6 },
  { note: 'D2',  time: 3.75,  duration: 0.1,  velocity: 33 },
  // Closed hi-hat on 16th notes (except where open hat plays)
  { note: 'F#2', time: 0,     duration: 0.05, velocity: 68 },
  { note: 'F#2', time: 0.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 0.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 0.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 1,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 1.25,  duration: 0.05, velocity: 45 },
  // Open hi-hat on "and" of 2
  { note: 'A#2', time: 1.5,   duration: 0.15, velocity: 75 },
  { note: 'F#2', time: 1.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 2,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 2.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 2.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 2.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 3,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 3.25,  duration: 0.05, velocity: 45 },
  // Open hi-hat on "and" of 4
  { note: 'A#2', time: 3.5,   duration: 0.15, velocity: 75 },
  { note: 'F#2', time: 3.75,  duration: 0.05, velocity: 45 },
];

const FUNK_POCKET_BAR_2: DrumHit[] = [
  // Kick -- different syncopation
  { note: 'C2',  time: 0,     duration: 0.2,  velocity: 100 },
  { note: 'C2',  time: 1.5,   duration: 0.15, velocity: 70 },
  { note: 'C2',  time: 2.75,  duration: 0.2,  velocity: 85 },
  // Snare -- backbeat
  { note: 'D2',  time: 1,     duration: 0.2,  velocity: 95 },
  { note: 'D2',  time: 3,     duration: 0.2,  velocity: 95 },
  // Snare ghost notes -- different placement
  { note: 'D2',  time: 0.25,  duration: 0.1,  velocity: 30 },
  { note: 'D2',  time: 1.5,   duration: 0.1,  velocity: 34, probability: 0.5 },
  { note: 'D2',  time: 2.5,   duration: 0.1,  velocity: 32 },
  { note: 'D2',  time: 3.5,   duration: 0.1,  velocity: 35 },
  // 16th hi-hats
  { note: 'F#2', time: 0,     duration: 0.05, velocity: 68 },
  { note: 'F#2', time: 0.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 0.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 0.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 1,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 1.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 1.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 1.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 2,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 2.25,  duration: 0.05, velocity: 45 },
  // Open hat on "and" of 3
  { note: 'A#2', time: 2.5,   duration: 0.15, velocity: 72 },
  { note: 'F#2', time: 2.75,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 3,     duration: 0.05, velocity: 65 },
  { note: 'F#2', time: 3.25,  duration: 0.05, velocity: 45 },
  { note: 'F#2', time: 3.5,   duration: 0.05, velocity: 58 },
  { note: 'F#2', time: 3.75,  duration: 0.05, velocity: 45 },
];

// ---------- Blues Patterns ----------

const BLUES_SHUFFLE_BAR_1: DrumHit[] = [
  // Kick -- on 1 and 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 82 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 88 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 88 },
  // Hi-hat -- shuffle feel (swung 8ths, accented downbeats)
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 52 },
  // Ghost snare on "and" of 4 (pickup into next bar)
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 30, probability: 0.4 },
];

const BLUES_SHUFFLE_BAR_2: DrumHit[] = [
  // Kick -- on 1 and 3, with ghost on "and" of 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 82 },
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 55, probability: 0.5 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 88 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 88 },
  // Hi-hat -- shuffle feel
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 78 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 75 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 52 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Open hat on last upbeat for turnaround
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 65 },
];

// ---------- Country Patterns ----------

const COUNTRY_SHUFFLE_BAR_1: DrumHit[] = [
  // Kick -- on 1 and 3 (light)
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 75 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 68 },
  // Cross-stick / side stick -- on 2 and 4 (NOT full snare)
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Hi-hat -- "train beat" 8th notes, light and even
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 62 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 60 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 48 },
];

const COUNTRY_SHUFFLE_BAR_2: DrumHit[] = [
  // Kick -- on 1 and 3, pickup on "and" of 4
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 75 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 68 },
  { note: 'C2',  time: 3.5,  duration: 0.15, velocity: 55, probability: 0.5 },
  // Cross-stick on 2 and 4
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 72 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 72 },
  // Hi-hat -- train beat
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 62 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 60 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 48 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 48 },
];

// ---------- Gospel Patterns ----------

const GOSPEL_DRIVE_BAR_1: DrumHit[] = [
  // Kick -- driving, syncopated
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 95 },
  { note: 'C2',  time: 1.5,  duration: 0.15, velocity: 72 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 88 },
  // Snare -- strong backbeat on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 100 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 100 },
  // Closed hi-hat -- driving 8th notes
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 75 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 3.5,  duration: 0.08, velocity: 58 },
];

const GOSPEL_DRIVE_BAR_2: DrumHit[] = [
  // Kick -- driving, different syncopation
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 95 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 2.75, duration: 0.15, velocity: 68, probability: 0.6 },
  // Snare -- strong backbeat
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 100 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 100 },
  // Ghost snare
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 35, probability: 0.4 },
  // Hi-hat -- 8th notes with open hat on "and" of 4
  { note: 'F#2', time: 0,    duration: 0.08, velocity: 75 },
  { note: 'F#2', time: 0.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 1,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 1.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 2,    duration: 0.08, velocity: 72 },
  { note: 'F#2', time: 2.5,  duration: 0.08, velocity: 58 },
  { note: 'F#2', time: 3,    duration: 0.08, velocity: 72 },
  // Open hat accent
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 70 },
];

// ---------- R&B Patterns ----------

const RNB_GROOVE_BAR_1: DrumHit[] = [
  // Kick -- laid-back, syncopated
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 1.75, duration: 0.15, velocity: 65 },
  { note: 'C2',  time: 2.5,  duration: 0.2,  velocity: 78 },
  // Snare -- lighter backbeat
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 82 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 82 },
  // Snare ghost notes (key R&B characteristic)
  { note: 'D2',  time: 0.5,  duration: 0.1,  velocity: 28 },
  { note: 'D2',  time: 1.5,  duration: 0.1,  velocity: 30, probability: 0.5 },
  { note: 'D2',  time: 2.75, duration: 0.1,  velocity: 28 },
  { note: 'D2',  time: 3.5,  duration: 0.1,  velocity: 32, probability: 0.6 },
  // 16th-note hi-hat
  { note: 'F#2', time: 0,    duration: 0.05, velocity: 62 },
  { note: 'F#2', time: 0.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 0.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 0.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 1.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 1.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 2.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 2.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 3.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 3.75, duration: 0.05, velocity: 40 },
];

const RNB_GROOVE_BAR_2: DrumHit[] = [
  // Kick
  { note: 'C2',  time: 0,    duration: 0.2,  velocity: 88 },
  { note: 'C2',  time: 2,    duration: 0.2,  velocity: 80 },
  { note: 'C2',  time: 3.25, duration: 0.15, velocity: 62, probability: 0.5 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 82 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 82 },
  // Ghost notes -- different placement from bar 1
  { note: 'D2',  time: 0.75, duration: 0.1,  velocity: 30 },
  { note: 'D2',  time: 2.25, duration: 0.1,  velocity: 28, probability: 0.5 },
  { note: 'D2',  time: 3.75, duration: 0.1,  velocity: 30 },
  // 16th hi-hats with open hat on "and" of 2
  { note: 'F#2', time: 0,    duration: 0.05, velocity: 62 },
  { note: 'F#2', time: 0.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 0.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 0.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 1,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 1.25, duration: 0.05, velocity: 40 },
  // Open hat
  { note: 'A#2', time: 1.5,  duration: 0.12, velocity: 68 },
  { note: 'F#2', time: 1.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 2.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 2.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 2.75, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3,    duration: 0.05, velocity: 60 },
  { note: 'F#2', time: 3.25, duration: 0.05, velocity: 40 },
  { note: 'F#2', time: 3.5,  duration: 0.05, velocity: 52 },
  { note: 'F#2', time: 3.75, duration: 0.05, velocity: 40 },
];

// ---------- Latin (Bossa Nova) Patterns ----------

const BOSSA_NOVA_BAR_1: DrumHit[] = [
  // Kick -- bass drum ostinato (bossa pattern)
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 75 },
  { note: 'C2',  time: 1.5,  duration: 0.2,  velocity: 65 },
  // Side stick -- cross-stick pattern (NO hi-hat, NO full snare)
  { note: 'C#2', time: 0.5,  duration: 0.1,  velocity: 68 },
  { note: 'C#2', time: 1,    duration: 0.1,  velocity: 62 },
  { note: 'C#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 65 },
  { note: 'C#2', time: 3.5,  duration: 0.1,  velocity: 58 },
];

const BOSSA_NOVA_BAR_2: DrumHit[] = [
  // Kick -- variation: add light hit on 3
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 75 },
  { note: 'C2',  time: 1.5,  duration: 0.2,  velocity: 65 },
  { note: 'C2',  time: 3,    duration: 0.2,  velocity: 55, probability: 0.5 },
  // Side stick -- slightly different pattern
  { note: 'C#2', time: 0.5,  duration: 0.1,  velocity: 68 },
  { note: 'C#2', time: 1.5,  duration: 0.1,  velocity: 60 },
  { note: 'C#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'C#2', time: 3,    duration: 0.1,  velocity: 65 },
  { note: 'C#2', time: 3.5,  duration: 0.1,  velocity: 58 },
];

// ---------- Pop Patterns ----------

const POP_FOUR_ON_FLOOR_BAR_1: DrumHit[] = [
  // Kick -- every beat (four on the floor)
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 95 },
  { note: 'C2',  time: 1,    duration: 0.25, velocity: 85 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 3,    duration: 0.25, velocity: 85 },
  // Snare -- on 2 and 4
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 92 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 92 },
  // Closed hi-hat -- 8th notes, simple and driving
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 3.5,  duration: 0.1,  velocity: 55 },
];

const POP_FOUR_ON_FLOOR_BAR_2: DrumHit[] = [
  // Kick -- every beat
  { note: 'C2',  time: 0,    duration: 0.25, velocity: 95 },
  { note: 'C2',  time: 1,    duration: 0.25, velocity: 85 },
  { note: 'C2',  time: 2,    duration: 0.25, velocity: 90 },
  { note: 'C2',  time: 3,    duration: 0.25, velocity: 85 },
  // Snare
  { note: 'D2',  time: 1,    duration: 0.2,  velocity: 92 },
  { note: 'D2',  time: 3,    duration: 0.2,  velocity: 92 },
  // Hi-hat -- 8th notes with open hat on "and" of 4
  { note: 'F#2', time: 0,    duration: 0.1,  velocity: 72 },
  { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 1,    duration: 0.1,  velocity: 68 },
  { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 2,    duration: 0.1,  velocity: 70 },
  { note: 'F#2', time: 2.5,  duration: 0.1,  velocity: 55 },
  { note: 'F#2', time: 3,    duration: 0.1,  velocity: 68 },
  // Open hat on last upbeat
  { note: 'A#2', time: 3.5,  duration: 0.15, velocity: 65 },
];

// ---------- Pattern Registry ----------

export const PATTERNS: Map<string, DrumPattern> = new Map([
  ['rock_straight', {
    id: 'rock_straight',
    genre: 'Rock',
    substyles: ['Classic', 'Alternative', 'Indie', 'Progressive', 'Punk', 'Garage'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [ROCK_STRAIGHT_BAR_1, ROCK_STRAIGHT_BAR_2],
    variations: [ROCK_STRAIGHT_BAR_2],
  }],
  ['jazz_swing', {
    id: 'jazz_swing',
    genre: 'Jazz',
    substyles: ['Swing', 'Bebop', 'Cool', 'Modal', 'Free'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.67,
    bars: [JAZZ_SWING_BAR_1, JAZZ_SWING_BAR_2],
    variations: [JAZZ_SWING_BAR_2],
  }],
  ['funk_pocket', {
    id: 'funk_pocket',
    genre: 'Funk',
    substyles: ['Classic Funk', 'P-Funk', 'Acid'],
    timeSignature: '4/4',
    subdivision: 16,
    swing: 0.5,
    bars: [FUNK_POCKET_BAR_1, FUNK_POCKET_BAR_2],
    variations: [FUNK_POCKET_BAR_2],
  }],
  ['blues_shuffle', {
    id: 'blues_shuffle',
    genre: 'Blues',
    substyles: ['Delta', 'Chicago', 'Texas', 'Jump Blues', 'Electric', 'Boogie'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.67,
    bars: [BLUES_SHUFFLE_BAR_1, BLUES_SHUFFLE_BAR_2],
    variations: [BLUES_SHUFFLE_BAR_2],
  }],
  ['country_shuffle', {
    id: 'country_shuffle',
    genre: 'Country',
    substyles: ['Traditional', 'Bluegrass', 'Country Pop'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.62,
    bars: [COUNTRY_SHUFFLE_BAR_1, COUNTRY_SHUFFLE_BAR_2],
    variations: [COUNTRY_SHUFFLE_BAR_2],
  }],
  ['gospel_drive', {
    id: 'gospel_drive',
    genre: 'Gospel',
    substyles: ['Traditional', 'Contemporary', 'Southern', 'Praise & Worship'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [GOSPEL_DRIVE_BAR_1, GOSPEL_DRIVE_BAR_2],
    variations: [GOSPEL_DRIVE_BAR_2],
  }],
  ['rnb_groove', {
    id: 'rnb_groove',
    genre: 'R&B',
    substyles: ['Classic', 'Contemporary', 'Quiet Storm'],
    timeSignature: '4/4',
    subdivision: 16,
    swing: 0.5,
    bars: [RNB_GROOVE_BAR_1, RNB_GROOVE_BAR_2],
    variations: [RNB_GROOVE_BAR_2],
  }],
  ['bossa_nova', {
    id: 'bossa_nova',
    genre: 'Latin',
    substyles: ['Bossa Nova', 'Bolero', 'Tango'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [BOSSA_NOVA_BAR_1, BOSSA_NOVA_BAR_2],
    variations: [BOSSA_NOVA_BAR_2],
  }],
  ['pop_four_on_floor', {
    id: 'pop_four_on_floor',
    genre: 'Pop',
    substyles: ['Synth Pop', 'Power Pop', 'Dream Pop', 'Electropop'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [POP_FOUR_ON_FLOOR_BAR_1, POP_FOUR_ON_FLOOR_BAR_2],
    variations: [POP_FOUR_ON_FLOOR_BAR_2],
  }],
  // Substyle overrides that map to distinct patterns
  ['latin_jazz', {
    id: 'latin_jazz',
    genre: 'Jazz',
    substyles: ['Latin Jazz'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [BOSSA_NOVA_BAR_1, BOSSA_NOVA_BAR_2],
    variations: [BOSSA_NOVA_BAR_2],
  }],
  ['fusion_straight', {
    id: 'fusion_straight',
    genre: 'Jazz',
    substyles: ['Fusion'],
    timeSignature: '4/4',
    subdivision: 16,
    swing: 0.5,
    bars: [FUNK_POCKET_BAR_1, FUNK_POCKET_BAR_2],
    variations: [FUNK_POCKET_BAR_2],
  }],
  ['salsa_cascara', {
    id: 'salsa_cascara',
    genre: 'Latin',
    substyles: ['Salsa', 'Son'],
    timeSignature: '4/4',
    subdivision: 8,
    swing: 0.5,
    bars: [BOSSA_NOVA_BAR_1, BOSSA_NOVA_BAR_2],
    variations: [BOSSA_NOVA_BAR_2],
  }],
  ['samba', {
    id: 'samba',
    genre: 'Latin',
    substyles: ['Samba'],
    timeSignature: '4/4',
    subdivision: 16,
    swing: 0.5,
    bars: [BOSSA_NOVA_BAR_1, BOSSA_NOVA_BAR_2],
    variations: [BOSSA_NOVA_BAR_2],
  }],
]);

// ---------- Fill Library ----------

export const FILLS: DrumFill[] = [
  // Low energy fills (0-33)
  {
    id: 'fill_low_1',
    energyRange: [0, 33],
    timeSignature: '4/4',
    hits: [
      // Keep groove going beats 1-2, single snare hit on beat 4
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 65 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'F#2', time: 1,    duration: 0.1,  velocity: 60 },
      { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 50 },
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 80 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 75 },
      { note: 'D2',  time: 3,    duration: 0.2,  velocity: 85 },
    ],
  },
  {
    id: 'fill_low_2',
    energyRange: [0, 33],
    timeSignature: '4/4',
    hits: [
      // Side stick rhythm on beats 3 and 4
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 60 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 78 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 72 },
      { note: 'C#2', time: 2,    duration: 0.1,  velocity: 65 },
      { note: 'C#2', time: 2.5,  duration: 0.1,  velocity: 55 },
      { note: 'C#2', time: 3,    duration: 0.1,  velocity: 65 },
      { note: 'C#2', time: 3.5,  duration: 0.1,  velocity: 60 },
    ],
  },
  {
    id: 'fill_low_3',
    energyRange: [0, 33],
    timeSignature: '4/4',
    hits: [
      // Ride bell accent on beat 4
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 78 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 60 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 72 },
      { note: 'F#2', time: 1,    duration: 0.1,  velocity: 58 },
      { note: 'F#2', time: 1.5,  duration: 0.1,  velocity: 50 },
      { note: 'F3',  time: 3,    duration: 0.3,  velocity: 80 },
    ],
  },
  // Medium energy fills (34-66)
  {
    id: 'fill_med_1',
    energyRange: [34, 66],
    timeSignature: '4/4',
    hits: [
      // Snare on beats 3 and 4 with kick on 3
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 85 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 65 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 80 },
      { note: 'C2',  time: 2,    duration: 0.25, velocity: 88 },
      { note: 'D2',  time: 2,    duration: 0.2,  velocity: 85 },
      { note: 'D2',  time: 2.5,  duration: 0.15, velocity: 75 },
      { note: 'D2',  time: 3,    duration: 0.2,  velocity: 90 },
      { note: 'D2',  time: 3.5,  duration: 0.15, velocity: 80 },
    ],
  },
  {
    id: 'fill_med_2',
    energyRange: [34, 66],
    timeSignature: '4/4',
    hits: [
      // High tom beat 3 + low tom beat 4
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 85 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 65 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 80 },
      { note: 'D3',  time: 2,    duration: 0.3,  velocity: 88 },
      { note: 'D3',  time: 2.5,  duration: 0.25, velocity: 78 },
      { note: 'A2',  time: 3,    duration: 0.3,  velocity: 90 },
      { note: 'A2',  time: 3.5,  duration: 0.25, velocity: 82 },
    ],
  },
  {
    id: 'fill_med_3',
    energyRange: [34, 66],
    timeSignature: '4/4',
    hits: [
      // Open hat on beat 3 + snare on beat 4
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 85 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 65 },
      { note: 'F#2', time: 0.5,  duration: 0.1,  velocity: 50 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 80 },
      { note: 'A#2', time: 2,    duration: 0.3,  velocity: 85 },
      { note: 'C2',  time: 2,    duration: 0.2,  velocity: 82 },
      { note: 'D2',  time: 3,    duration: 0.2,  velocity: 92 },
      { note: 'C2',  time: 3,    duration: 0.2,  velocity: 85 },
    ],
  },
  // High energy fills (67-100)
  {
    id: 'fill_high_1',
    energyRange: [67, 100],
    timeSignature: '4/4',
    hits: [
      // 16th-note snare across beats 3-4
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 70 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 85 },
      { note: 'D2',  time: 2,    duration: 0.15, velocity: 88 },
      { note: 'D2',  time: 2.25, duration: 0.1,  velocity: 72 },
      { note: 'D2',  time: 2.5,  duration: 0.15, velocity: 85 },
      { note: 'D2',  time: 2.75, duration: 0.1,  velocity: 72 },
      { note: 'D2',  time: 3,    duration: 0.15, velocity: 92 },
      { note: 'D2',  time: 3.25, duration: 0.1,  velocity: 78 },
      { note: 'D2',  time: 3.5,  duration: 0.15, velocity: 95 },
      { note: 'D2',  time: 3.75, duration: 0.1,  velocity: 82 },
    ],
  },
  {
    id: 'fill_high_2',
    energyRange: [67, 100],
    timeSignature: '4/4',
    hits: [
      // Tom cascade: high tom (beat 3) -> low tom (3.5) -> kick (4)
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 70 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 85 },
      { note: 'D3',  time: 2,    duration: 0.25, velocity: 92 },
      { note: 'D3',  time: 2.5,  duration: 0.2,  velocity: 85 },
      { note: 'A2',  time: 3,    duration: 0.25, velocity: 95 },
      { note: 'F2',  time: 3.5,  duration: 0.25, velocity: 90 },
      { note: 'C2',  time: 3.75, duration: 0.2,  velocity: 100 },
    ],
  },
  {
    id: 'fill_high_3',
    energyRange: [67, 100],
    timeSignature: '4/4',
    hits: [
      // Snare + kick together on 16th notes across beat 4
      { note: 'C2',  time: 0,    duration: 0.25, velocity: 90 },
      { note: 'F#2', time: 0,    duration: 0.1,  velocity: 70 },
      { note: 'D2',  time: 1,    duration: 0.2,  velocity: 85 },
      { note: 'D3',  time: 2,    duration: 0.25, velocity: 88 },
      { note: 'A2',  time: 2.5,  duration: 0.25, velocity: 85 },
      { note: 'C2',  time: 3,    duration: 0.15, velocity: 95 },
      { note: 'D2',  time: 3,    duration: 0.15, velocity: 90 },
      { note: 'C2',  time: 3.25, duration: 0.15, velocity: 88 },
      { note: 'D2',  time: 3.25, duration: 0.1,  velocity: 82 },
      { note: 'C2',  time: 3.5,  duration: 0.15, velocity: 92 },
      { note: 'D2',  time: 3.5,  duration: 0.15, velocity: 88 },
      { note: 'C2',  time: 3.75, duration: 0.15, velocity: 100 },
      { note: 'D2',  time: 3.75, duration: 0.1,  velocity: 95 },
    ],
  },
];

// ---------- Expression Functions ----------

/** Shift upbeats proportional to swing amount.
 * swingAmount: 0.5 = straight, 0.67 = triplet swing, 0.75 = heavy shuffle */
export function applySwing(
  time: number,
  swingAmount: number,
  _beatsPerBar: number
): number {
  // Only shift upbeats (odd-numbered 8th notes)
  const eighthNote = time * 2;
  const isUpbeat = Math.round(eighthNote) % 2 === 1;
  if (!isUpbeat) return time;
  const gridSize = 0.5; // 8th note = half a beat
  const shift = (swingAmount - 0.5) * gridSize;
  return time + shift;
}

/** Filter/modify hits based on energy tier.
 * Low (0-33): remove 16th hats, ghost notes, open hats; reduce velocity 15%
 * Medium (34-66): standard pattern as written
 * High (67-100): add open hats, ghost notes; increase velocity 10% */
export function applyEnergy(pattern: DrumHit[], energy: number): DrumHit[] {
  // Pure intensity: how hard the drummer hits
  // Low: softer (85% velocity), Mid: no change, High: louder (110% velocity)
  if (energy <= 33) {
    return pattern.map((h) => ({
      ...h,
      velocity: Math.round(h.velocity * 0.85),
    }));
  }
  if (energy >= 67) {
    return pattern.map((h) => ({
      ...h,
      velocity: Math.min(110, Math.round(h.velocity * 1.1)),
    }));
  }
  return pattern.map((h) => ({ ...h }));
}

/** Adjust pattern density based on groove (complexity).
 * groove 0-30: simple backbone (kick-snare-hat only, no ghost notes, no 16ths)
 * groove 31-69: standard — pattern as written
 * groove 70-100: busy — add ghost notes, syncopated kick, 16th hats */
export function applyGroove(hits: DrumHit[], groove: number): DrumHit[] {
  if (groove <= 30) {
    // Strip to backbone: remove embellishments
    return hits.filter((h) => {
      // Remove 16th-note hi-hats (F#2 at 0.25 intervals not on 0.5)
      if (h.note === 'F#2') {
        const frac = h.time % 0.5;
        if (Math.abs(frac - 0.25) < 0.01) return false;
      }
      // Remove ghost notes (soft snare)
      if (h.note === 'D2' && h.velocity < 40) return false;
      // Remove open hi-hats
      if (h.note === 'A#2') return false;
      // Remove ride bell (A#3) — keep ride bow only
      if (h.note === 'A#3') return false;
      return true;
    });
  }

  if (groove >= 70) {
    // Busy: add embellishments
    const busy = hits.map((h) => ({ ...h }));

    // Add ghost snare on the "and" of beat 2 (time 1.5) if not present
    const hasGhost = busy.some(
      (h) => h.note === 'D2' && h.velocity < 40 && Math.abs(h.time - 1.5) < 0.1
    );
    if (!hasGhost) {
      busy.push({ note: 'D2', time: 1.5, duration: 0.125, velocity: 30 });
    }

    // Add syncopated kick on "and" of beat 3 (time 2.5) if not present
    const hasKickAndOf3 = busy.some(
      (h) => h.note === 'C2' && Math.abs(h.time - 2.5) < 0.1
    );
    if (!hasKickAndOf3) {
      busy.push({ note: 'C2', time: 2.5, duration: 0.25, velocity: 75 });
    }

    // At very high groove (85+), add 16th hi-hat fills in empty spots
    if (groove >= 85) {
      for (let beat = 0; beat < 4; beat++) {
        const sixteenthTime = beat + 0.25;
        const has16th = busy.some(
          (h) => h.note === 'F#2' && Math.abs(h.time - sixteenthTime) < 0.05
        );
        if (!has16th) {
          busy.push({ note: 'F#2', time: sixteenthTime, duration: 0.125, velocity: 40 });
        }
      }
    }

    return busy;
  }

  // Mid groove: pattern as written
  return hits.map((h) => ({ ...h }));
}

/** Scale velocity range based on dynamics value.
 * Low (0-33): narrow range (60-80), everything compressed toward 70
 * Medium (34-66): moderate range (45-100)
 * High (67-100): full range (25-110) with loud accents and soft ghosts */
export function applyDynamics(hits: DrumHit[], dynamics: number): DrumHit[] {
  const centerVelocity = 70;
  // dynamicsScale: 0.0 at dynamics=0, 1.0 at dynamics=50, 2.0 at dynamics=100
  const dynamicsScale = dynamics / 50;

  return hits.map((h) => {
    const velocity = Math.round(
      centerVelocity + (h.velocity - centerVelocity) * dynamicsScale
    );
    // Clamp to 0-110 range (not 127) for headroom
    return { ...h, velocity: Math.max(0, Math.min(110, velocity)) };
  });
}

/** Add deterministic micro-timing offsets for humanization.
 * feel=0: perfectly quantized
 * feel=50: subtle (~8ms offsets)
 * feel=100: loose (~20ms offsets) */
export function applyFeel(
  hits: DrumHit[],
  feel: number,
  barNumber: number
): DrumHit[] {
  if (feel <= 0) return hits.map((h) => ({ ...h }));

  // maxOffset expressed as fraction of a beat (~20ms at 120 BPM = 0.04 beats)
  const maxOffset = (feel / 100) * 0.04;

  return hits.map((h, i) => {
    const hash = knuthHash(barNumber * 1000 + i, 42);
    // Map hash 0-1 to -maxOffset..+maxOffset
    const offset = (hash * 2 - 1) * maxOffset;
    return { ...h, time: Math.max(0, h.time + offset) };
  });
}

// ---------- Builder Function ----------

/** Resolve a pattern from a pattern ID, with fallback to rock_straight */
function getPattern(patternId: string): DrumPattern {
  return PATTERNS.get(patternId) ?? PATTERNS.get('rock_straight')!;
}

/** Select a fill based on energy bracket and deterministic hash */
function selectFill(energy: number, barNumber: number): DrumFill {
  const bracket = energy <= 33 ? 'low' : energy <= 66 ? 'med' : 'high';
  const bracketFills = FILLS.filter((f) => {
    if (bracket === 'low') return f.energyRange[0] <= 33;
    if (bracket === 'med') return f.energyRange[0] >= 34 && f.energyRange[1] <= 66;
    return f.energyRange[0] >= 67;
  });

  if (bracketFills.length === 0) return FILLS[0];
  const idx = Math.floor(knuthHash(barNumber, 99) * bracketFills.length);
  return bracketFills[idx];
}

/** Adapt pattern hits for a non-4/4 time signature by filtering out hits beyond beatsPerBar */
function adaptToTimeSignature(
  hits: DrumHit[],
  beatsPerBar: number
): DrumHit[] {
  if (beatsPerBar >= 4) return hits;
  return hits.filter((h) => h.time < beatsPerBar);
}

/** Main drum MIDI builder. Produces MidiNoteData[] for a single bar.
 * Called once per bar from midi-generator.ts. */
export function buildDrumMidi(params: {
  genre: string;
  substyle: string;
  barCount: number;
  beatsPerBar: number;
  energy: number;
  dynamics: number;
  swingPct: number | null;
  groove: number;
  feel: number;
  sectionType: string;
  sectionIndex: number;
  isLastSection: boolean;
  barNumberInSection: number;
  barNumberGlobal: number;
  totalBarsInSection: number;
}): MidiNoteData[] {
  const patternId = getDrumPatternId(params.genre, params.substyle);

  const pattern = getPattern(patternId);

  // Determine if this bar should be a fill
  const isLastBarOfSection =
    params.barNumberInSection === params.totalBarsInSection - 1;
  const shouldFill = isLastBarOfSection && !params.isLastSection;

  // Determine if this bar starts a section (crash)
  const isFirstBarOfSection = params.barNumberInSection === 0;
  const shouldCrash = isFirstBarOfSection && params.sectionIndex > 0;

  // Swing conversion: swing_pct (50-80 int) -> swingAmount (0.5-0.75 float)
  const swingAmount = params.swingPct !== null
    ? params.swingPct / 100
    : pattern.swing;

  let hits: DrumHit[];

  if (shouldFill) {
    // Use a fill pattern for this bar
    const fill = selectFill(params.energy, params.barNumberGlobal);
    hits = fill.hits.map((h) => ({ ...h }));
  } else {
    // Select bar from pattern (main bars + variations mixed via hash)
    const hash = knuthHash(params.barNumberGlobal, 7);
    const allBars = [...pattern.bars, ...pattern.variations];
    const barIdx = Math.floor(hash * allBars.length);
    hits = allBars[barIdx].map((h) => ({ ...h }));
  }

  // Adapt to time signature
  hits = adaptToTimeSignature(hits, params.beatsPerBar);

  // Resolve probabilistic hits deterministically
  hits = hits.filter((h) => {
    if (h.probability === undefined) return true;
    const prob = knuthHash(params.barNumberGlobal, h.time * 100 + h.velocity);
    return prob < h.probability;
  });

  // Apply complexity (note density)
  hits = applyGroove(hits, params.groove);

  // Apply expression transforms
  hits = applyEnergy(hits, params.energy);
  hits = applyDynamics(hits, params.dynamics);

  // Apply swing to note times
  hits = hits.map((h) => ({
    ...h,
    time: applySwing(h.time, swingAmount, params.beatsPerBar),
  }));

  // Apply feel (humanization micro-timing)
  hits = applyFeel(hits, params.feel, params.barNumberGlobal);

  // Add crash cymbal on first beat of non-Intro sections
  if (shouldCrash) {
    hits.push({
      note: 'C#3',
      time: 0,
      duration: 0.5,
      velocity: 95,
    });
  }

  // Convert to MidiNoteData format
  return hits.map((h) => ({
    note: h.note,
    time: h.time,
    duration: h.duration,
    velocity: Math.max(0, Math.min(110, Math.round(h.velocity))),
  }));
}

