// chord-chart-parser.ts — Parses raw chord chart text into a ChordEntry[] array.
// Delegates individual chord parsing to parseChordInput() from chords.ts.

import { parseChordInput } from './chords';
import type { ChordEntry } from '@/types';

export interface ChordChartParseIssue {
  barNumber: number;
  token: string;
  reason: 'repeat_without_previous' | 'repeat_without_resolved_chord' | 'invalid_token';
  message: string;
}

export interface ChordChartParseResult {
  chords: ChordEntry[];
  warnings: string[];
  issues: ChordChartParseIssue[];
  truth: ChordChartParseTruth;
}

export interface ChordChartParseTruth {
  state: 'ready' | 'blocked';
  title: string;
  currentState: string;
  summary: string;
  nextStep: string | null;
  blockedBars: number[];
  issueHighlights: string[];
}

const REPEAT_MARKERS = new Set(['%', '/']);
const NC_TOKENS = new Set(['n.c.', 'nc', '-']);
type ParsedBarState = 'chord' | 'no_chord' | 'issue';

/**
 * Parse a raw chord chart string into a sequence of ChordEntry objects.
 * Supports pipe-separated bars, space-separated bars, newline-delimited sections,
 * repeat markers (% and /), and N.C. entries.
 */
export function parseChordChart(raw: string, key: string): ChordChartParseResult {
  if (!raw.trim()) {
    return {
      chords: [],
      warnings: [],
      issues: [],
      truth: buildParseTruth([], []),
    };
  }

  const warnings: string[] = [];
  const issues: ChordChartParseIssue[] = [];
  const chords: ChordEntry[] = [];

  // Normalize: strip carriage returns, collapse runs of whitespace
  const normalized = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let barNumber = 0;
  let prevChord: ChordEntry | null = null;
  let prevBarState: ParsedBarState | null = null;

  for (const line of lines) {
    // Skip section header lines like [Verse 1], [Chorus], [Bridge], etc.
    if (/^\[.*\]$/.test(line)) continue;

    // Tokenize: pipes are bar separators; within each segment, spaces separate bars
    const segments = line.includes('|') ? line.split('|') : [line];

    for (const segment of segments) {
      const tokens = segment
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      for (const token of tokens) {
        barNumber++;
        const { entry, state } = parseBarToken(
          token,
          key,
          prevChord,
          prevBarState,
          barNumber,
          warnings,
          issues
        );
        chords.push(entry);
        prevChord = entry;
        prevBarState = state;
      }
    }
  }

  return { chords, warnings, issues, truth: buildParseTruth(issues, warnings) };
}

function buildParseTruth(
  issues: ChordChartParseIssue[],
  warnings: string[]
): ChordChartParseTruth {
  if (issues.length === 0) {
    return {
      state: 'ready',
      title: 'Chord chart parsed',
      currentState: 'All chord bars resolved cleanly.',
      summary: 'Generation can use the current chord chart as written.',
      nextStep: null,
      blockedBars: [],
      issueHighlights: [],
    };
  }

  const invalidTokenCount = issues.filter((issue) => issue.reason === 'invalid_token').length;
  const repeatWithoutPreviousCount = issues.filter(
    (issue) => issue.reason === 'repeat_without_previous'
  ).length;
  const repeatWithoutResolvedChordCount = issues.filter(
    (issue) => issue.reason === 'repeat_without_resolved_chord'
  ).length;
  const blockedBars = issues.map((issue) => issue.barNumber);
  const barLabel = formatBarList(blockedBars);
  const summaryParts: string[] = [];

  if (invalidTokenCount > 0) {
    summaryParts.push(
      `${invalidTokenCount} ${invalidTokenCount === 1 ? 'bar has' : 'bars have'} an unrecognized chord token.`
    );
  }

  if (repeatWithoutPreviousCount > 0) {
    summaryParts.push(
      `${repeatWithoutPreviousCount} ${repeatWithoutPreviousCount === 1 ? 'repeat marker starts' : 'repeat markers start'} before any chord.`
    );
  }

  if (repeatWithoutResolvedChordCount > 0) {
    summaryParts.push(
      `${repeatWithoutResolvedChordCount} ${repeatWithoutResolvedChordCount === 1 ? 'repeat marker follows' : 'repeat markers follow'} an unresolved bar.`
    );
  }

  return {
    state: 'blocked',
    title: blockedBars.length === 1 ? 'Chord chart needs attention' : 'Chord chart has parse issues',
    currentState: `${barLabel} will become N.C. during generation.`,
    summary: summaryParts.join(' '),
    nextStep:
      repeatWithoutPreviousCount > 0 || repeatWithoutResolvedChordCount > 0
        ? 'Replace the flagged repeat bars with explicit chords or fix the bar before them.'
        : 'Fix or replace the flagged chord bars before generating.',
    blockedBars,
    issueHighlights: warnings
      .slice(0, 3)
      .map((warning) => warning.replace(/, treated as N\.C\.$/, '')),
  };
}

function formatBarList(barNumbers: number[]) {
  if (barNumbers.length === 1) {
    return `Bar ${barNumbers[0]}`;
  }

  if (barNumbers.length === 2) {
    return `Bars ${barNumbers[0]} and ${barNumbers[1]}`;
  }

  return `Bars ${barNumbers.slice(0, -1).join(', ')}, and ${barNumbers.at(-1)}`;
}

function parseBarToken(
  token: string,
  key: string,
  prevChord: ChordEntry | null,
  prevBarState: ParsedBarState | null,
  barNumber: number,
  warnings: string[],
  issues: ChordChartParseIssue[]
): { entry: ChordEntry; state: ParsedBarState } {
  const lower = token.toLowerCase().trim();

  // Repeat marker
  if (REPEAT_MARKERS.has(lower)) {
    if (prevChord && prevBarState !== 'issue') {
      return {
        entry: { ...prevChord, bar_number: barNumber },
        state: prevBarState ?? 'no_chord',
      };
    }

    if (prevChord && prevBarState === 'issue') {
      const message = `Bar ${barNumber}: repeat marker "${token}" follows a bar that could not be resolved, treated as N.C.`;
      warnings.push(message);
      issues.push({
        barNumber,
        token,
        reason: 'repeat_without_resolved_chord',
        message,
      });
      return {
        entry: { bar_number: barNumber, degree: null, quality: null, bass_degree: null },
        state: 'issue',
      };
    }

    const message = `Bar ${barNumber}: repeat marker "${token}" with no previous chord, treated as N.C.`;
    warnings.push(message);
    issues.push({
      barNumber,
      token,
      reason: 'repeat_without_previous',
      message,
    });
    return {
      entry: { bar_number: barNumber, degree: null, quality: null, bass_degree: null },
      state: 'issue',
    };
  }

  // No chord
  if (NC_TOKENS.has(lower)) {
    return {
      entry: { bar_number: barNumber, degree: null, quality: null, bass_degree: null },
      state: 'no_chord',
    };
  }

  // Attempt to parse as chord
  const result = parseChordInput(token, key);
  if (result) {
    return {
      entry: {
        bar_number: barNumber,
        degree: result.degree,
        quality: result.quality,
        bass_degree: result.bassDegree,
      },
      state: 'chord',
    };
  }

  const message = `Bar ${barNumber}: could not parse "${token}", treated as N.C.`;
  warnings.push(message);
  issues.push({
    barNumber,
    token,
    reason: 'invalid_token',
    message,
  });
  return {
    entry: { bar_number: barNumber, degree: null, quality: null, bass_degree: null },
    state: 'issue',
  };
}
