// chord-chart-parser.ts — Parses raw chord chart text into a ChordEntry[] array.
// Delegates individual chord parsing to parseChordInput() from chords.ts.

import { parseChordInput } from './chords';
import type { ChordEntry } from '@/types';

export interface ChordChartParseIssue {
  lineNumber: number;
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
  remainingIssueCount: number;
}

const REPEAT_MARKERS = new Set(['%', '/']);
const NC_TOKENS = new Set(['n.c.', 'nc', '-']);
const SECTION_HEADER_RE =
  /^(verse|chorus|bridge|intro|outro|tag|interlude|pre-chorus|prechorus)(\s+\d+)?\s*:?\s*$/i;
type ParsedBarState = 'chord' | 'no_chord' | 'issue';

function isSectionHeaderLine(line: string) {
  return /^\[.*\]$/.test(line) || SECTION_HEADER_RE.test(line);
}

function formatIssueLocation(issue: Pick<ChordChartParseIssue, 'lineNumber' | 'barNumber'>) {
  return `Line ${issue.lineNumber}, bar ${issue.barNumber}`;
}

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
      truth: buildParseTruth([], [], false, false, 0),
    };
  }

  const warnings: string[] = [];
  const issues: ChordChartParseIssue[] = [];
  const chords: ChordEntry[] = [];

  // Normalize: strip carriage returns, collapse runs of whitespace
  const normalized = raw.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = normalized.split('\n');

  let barNumber = 0;
  let prevChord: ChordEntry | null = null;
  let prevBarState: ParsedBarState | null = null;
  let hasPlayableBars = false;

  for (const [lineIndex, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    const lineNumber = lineIndex + 1;

    if (!line) continue;

    // Skip section header lines like [Verse 1], Verse:, [Chorus], [Bridge], etc.
    if (isSectionHeaderLine(line)) continue;

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
          lineNumber,
          barNumber,
          warnings,
          issues
        );
        chords.push(entry);
        prevChord = entry;
        prevBarState = state;
        if (state === 'chord') {
          hasPlayableBars = true;
        }
      }
    }
  }

  return {
    chords,
    warnings,
    issues,
    truth: buildParseTruth(issues, warnings, true, hasPlayableBars, barNumber),
  };
}

function buildParseTruth(
  issues: ChordChartParseIssue[],
  warnings: string[],
  hasChartContent: boolean,
  hasPlayableBars: boolean,
  parsedBarCount: number
): ChordChartParseTruth {
  if (hasChartContent && !hasPlayableBars && issues.length === 0) {
    if (parsedBarCount > 0) {
      return {
        state: 'blocked',
        title: 'Chord chart needs chord bars',
        currentState:
          'The current chart only contains N.C. or rest bars, so Generate stays blocked until at least one playable chord bar is entered.',
        summary: 'Bars marked as N.C. or rest do not create playable harmony on their own.',
        nextStep:
          'Replace at least one N.C. or rest bar with a chord such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
        blockedBars: [],
        issueHighlights: [],
        remainingIssueCount: 0,
      };
    }

    return {
      state: 'blocked',
      title: 'Chord chart needs chord bars',
      currentState:
        'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.',
      summary: 'Section labels and blank lines do not create playable bars on their own.',
      nextStep: 'Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.',
      blockedBars: [],
      issueHighlights: [],
      remainingIssueCount: 0,
    };
  }

  if (issues.length === 0) {
    return {
      state: 'ready',
      title: 'Chord chart parsed',
      currentState: 'All chord bars resolved cleanly.',
      summary: 'Generation can use the current chord chart as written.',
      nextStep: null,
      blockedBars: [],
      issueHighlights: [],
      remainingIssueCount: 0,
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
  const readyBarCount = Math.max(parsedBarCount - blockedBars.length, 0);
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

  const issueHighlights = warnings
    .slice(0, 3)
    .map((warning) => warning.replace(/, treated as N\.C\.$/, ''));

  return {
    state: 'blocked',
    title: blockedBars.length === 1 ? 'Chord chart needs attention' : 'Chord chart has parse issues',
    currentState: `${readyBarCount} of ${parsedBarCount} ${parsedBarCount === 1 ? 'bar is' : 'bars are'} ready. ${barLabel} ${blockedBars.length === 1 ? 'currently parses' : 'currently parse'} as N.C., so Generate stays blocked until the chart is fixed.`,
    summary: summaryParts.join(' '),
    nextStep:
      repeatWithoutPreviousCount > 0 && repeatWithoutResolvedChordCount === 0
        ? `Replace ${formatBlockedBarReference(blockedBars, 'the flagged repeat bars')} with explicit chords before using repeat markers.`
        : repeatWithoutPreviousCount > 0 || repeatWithoutResolvedChordCount > 0
        ? `Replace ${formatBlockedBarReference(blockedBars, 'the flagged repeat bars')} with explicit chords or fix the bar before ${blockedBars.length === 1 ? 'it' : 'them'}.`
        : `Fix or replace ${formatBlockedBarReference(blockedBars, 'the flagged chord bars')} before generating.`,
    blockedBars,
    issueHighlights,
    remainingIssueCount: Math.max(issues.length - issueHighlights.length, 0),
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

function formatBlockedBarReference(barNumbers: number[], fallback: string) {
  if (barNumbers.length === 0) {
    return fallback;
  }

  if (barNumbers.length === 1) {
    return `bar ${barNumbers[0]}`;
  }

  if (barNumbers.length === 2) {
    return `bars ${barNumbers[0]} and ${barNumbers[1]}`;
  }

  return `bars ${barNumbers.slice(0, -1).join(', ')}, and ${barNumbers.at(-1)}`;
}

function parseBarToken(
  token: string,
  key: string,
  prevChord: ChordEntry | null,
  prevBarState: ParsedBarState | null,
  lineNumber: number,
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
      const location = formatIssueLocation({ lineNumber, barNumber });
      const message = `${location}: repeat marker "${token}" follows a bar that could not be resolved, treated as N.C.`;
      warnings.push(message);
      issues.push({
        lineNumber,
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

    const location = formatIssueLocation({ lineNumber, barNumber });
    const message = `${location}: repeat marker "${token}" with no previous chord, treated as N.C.`;
    warnings.push(message);
    issues.push({
      lineNumber,
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

  const location = formatIssueLocation({ lineNumber, barNumber });
  const message = `${location}: could not parse "${token}", treated as N.C.`;
  warnings.push(message);
  issues.push({
    lineNumber,
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
