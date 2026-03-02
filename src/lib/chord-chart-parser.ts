// chord-chart-parser.ts — Parses raw chord chart text into a ChordEntry[] array.
// Delegates individual chord parsing to parseChordInput() from chords.ts.

import { parseChordInput } from './chords';
import type { ChordEntry } from '@/types';

export interface ChordChartParseResult {
  chords: ChordEntry[];
  warnings: string[];
}

const REPEAT_MARKERS = new Set(['%', '/']);
const NC_TOKENS = new Set(['n.c.', 'nc', '-']);

/**
 * Parse a raw chord chart string into a sequence of ChordEntry objects.
 * Supports pipe-separated bars, space-separated bars, newline-delimited sections,
 * repeat markers (% and /), and N.C. entries.
 */
export function parseChordChart(raw: string, key: string): ChordChartParseResult {
  if (!raw.trim()) return { chords: [], warnings: [] };

  const warnings: string[] = [];
  const chords: ChordEntry[] = [];

  // Normalize: strip carriage returns, collapse runs of whitespace
  const normalized = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let barNumber = 0;
  let prevChord: ChordEntry | null = null;

  for (const line of lines) {
    // Tokenize: pipes are bar separators; within each segment, spaces separate bars
    const segments = line.includes('|') ? line.split('|') : [line];

    for (const segment of segments) {
      const tokens = segment
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      for (const token of tokens) {
        barNumber++;
        const entry = parseBarToken(token, key, prevChord, barNumber, warnings);
        chords.push(entry);
        prevChord = entry;
      }
    }
  }

  return { chords, warnings };
}

function parseBarToken(
  token: string,
  key: string,
  prevChord: ChordEntry | null,
  barNumber: number,
  warnings: string[]
): ChordEntry {
  const lower = token.toLowerCase().trim();

  // Repeat marker
  if (REPEAT_MARKERS.has(lower)) {
    if (prevChord) {
      return { ...prevChord, bar_number: barNumber };
    }
    warnings.push(`Bar ${barNumber}: repeat marker "${token}" with no previous chord, treated as N.C.`);
    return { bar_number: barNumber, degree: null, quality: null, bass_degree: null };
  }

  // No chord
  if (NC_TOKENS.has(lower)) {
    return { bar_number: barNumber, degree: null, quality: null, bass_degree: null };
  }

  // Attempt to parse as chord
  const result = parseChordInput(token, key);
  if (result) {
    return {
      bar_number: barNumber,
      degree: result.degree,
      quality: result.quality,
      bass_degree: result.bassDegree,
    };
  }

  warnings.push(`Bar ${barNumber}: could not parse "${token}", treated as N.C.`);
  return { bar_number: barNumber, degree: null, quality: null, bass_degree: null };
}
