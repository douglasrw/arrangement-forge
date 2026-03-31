// useGenerate.ts — Generation flow: build request, call generator, populate stores, save.
// Also provides regenerateMidi() for reactive slider → playback updates.

import { useCallback, useEffect, useRef } from 'react';
import { getProjectArrangementTruth, useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { useProject } from '@/hooks/useProject';
import { generate, generateMidiForBlock } from '@/lib/midi-generator';
import { parseChordChart } from '@/lib/chord-chart-parser';
import { getEffectiveSwingPct } from '@/lib/genre-config';
import { formatGenerationFailureMessage } from '@/lib/assistant-chat';
import { snapshotArrangement } from '@/lib/undo-helpers';
import type {
  AiChatMessage,
  GenerationRequest,
  GenerationResponse,
  Section,
  Stem,
  Block,
  Chord,
  InstrumentType,
  ChordEntry,
} from '@/types';

type RunGenerationOptions = {
  isRegeneration?: boolean;
  assistantPrompt?: string;
};

type ChordParseFailureLike = {
  issues?: Array<{ reason?: string }>;
  truth?: {
    state?: 'ready' | 'blocked';
    currentState?: string | null;
    nextStep?: string | null;
    summary?: string | null;
  };
};

function createChatMessage(
  projectId: string,
  role: AiChatMessage['role'],
  content: string,
  scope: AiChatMessage['scope'] = 'song',
  scopeTarget: string | null = null
): AiChatMessage {
  return {
    id: crypto.randomUUID(),
    projectId,
    role,
    content,
    scope,
    scopeTarget,
    createdAt: new Date().toISOString(),
  };
}

function formatList(values: string[]): string {
  if (values.length === 0) return 'the current instrument setup';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function buildGenerationSummary(
  response: GenerationResponse,
  options: { assistantPrompt?: string; hadArrangement: boolean }
): string {
  const totalBars = response.sections.reduce((sum, section) => sum + section.bar_count, 0);

  if (response.sections.length === 0 || totalBars === 0) {
    return options.assistantPrompt
      ? 'I used your latest request, but the current chord chart did not produce any playable sections.'
      : 'Generation completed, but the current chord chart did not produce any playable sections.';
  }

  const verb = options.hadArrangement ? 'regenerated' : 'generated';
  const subject = options.assistantPrompt ? `Applied your latest request and ${verb}` : `${verb[0].toUpperCase()}${verb.slice(1)}`;
  const sectionLabel = response.sections.length === 1 ? 'section' : 'sections';
  const barLabel = totalBars === 1 ? 'bar' : 'bars';
  const instruments = formatList(response.stems.map((stem) => stem.instrument));

  return `${subject} ${response.sections.length} ${sectionLabel} across ${totalBars} ${barLabel} for ${instruments}.`;
}

function getGenerationScope(
  hadArrangement: boolean,
  hasAssistantPrompt: boolean
): AiChatMessage['scope'] {
  return hadArrangement || hasAssistantPrompt ? 'song' : 'setup';
}

function summarizeGenerationUndoPrompt(assistantPrompt: string): string {
  const normalizedPrompt = assistantPrompt.replace(/\s+/g, ' ').trim();

  if (normalizedPrompt.length <= 48) {
    return normalizedPrompt;
  }

  return `${normalizedPrompt.slice(0, 45).trimEnd()}...`;
}

function describeGenerationUndoBoundary(assistantPrompt: string | null): string {
  if (!assistantPrompt) {
    return 'Arrangement regeneration';
  }

  return `Assistant revision: ${summarizeGenerationUndoPrompt(assistantPrompt)}`;
}

function describeChordParseBlocker(parseResult: ChordParseFailureLike): string {
  const currentState = parseResult.truth?.currentState?.trim();
  const nextStep = parseResult.truth?.nextStep?.trim();
  if (currentState && nextStep) {
    return `${currentState} Next step: ${nextStep}`;
  }

  if (currentState) {
    return currentState;
  }

  if (nextStep) {
    return nextStep;
  }

  const summary = parseResult.truth?.summary?.trim();
  if (summary) {
    return summary;
  }

  const issues = parseResult.issues ?? [];
  const repeatIssueCount = issues.filter(
    (issue) =>
      issue.reason === 'repeat_without_previous' ||
      issue.reason === 'repeat_without_resolved_chord'
  ).length;
  const invalidIssueCount = issues.filter((issue) => issue.reason === 'invalid_token').length;

  if (repeatIssueCount > 0) {
    return repeatIssueCount === 1
      ? 'Replace the flagged repeat bar with an explicit chord or fix the bar before it.'
      : 'Replace the flagged repeat bars with explicit chords or fix the bar before them.';
  }

  if (invalidIssueCount > 0) {
    return invalidIssueCount === 1
      ? 'Fix the flagged chord bar before generating.'
      : 'Fix the flagged chord bars before generating.';
  }

  return 'Fix the flagged chord chart bars before generating.';
}

export function useGenerate() {
  const {
    project,
    stems,
    sections,
    blocks,
    chords,
    setArrangement,
    setDrumBlocks,
    setAllInstrumentBlocks,
    updateProject,
    addChatMessage,
  } = useProjectStore();
  const { setGenerationState, setSystemStatus } = useUiStore();
  const { pushUndo } = useUndoStore();
  const { saveArrangement, saveProject } = useProject();
  const arrangementTruth = getProjectArrangementTruth({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const hasArrangementRows = arrangementTruth.hasArrangementRows;

  const runGeneration = useCallback(async (options: RunGenerationOptions = {}) => {
    if (!project) return;
    const { isRegeneration = false, assistantPrompt } = options;
    const trimmedAssistantPrompt = assistantPrompt?.trim() || null;
    const hadArrangement = hasArrangementRows;
    const shouldRegenerate = hadArrangement || isRegeneration;
    const generationScope = getGenerationScope(shouldRegenerate, Boolean(trimmedAssistantPrompt));

    if (trimmedAssistantPrompt) {
      addChatMessage(createChatMessage(project.id, 'user', trimmedAssistantPrompt, 'song'));
    }

    // Capture pre-generation state for undo when the run is replacing an
    // existing arrangement.
    const before = shouldRegenerate
      ? snapshotArrangement({ stems, sections, blocks, chords })
      : null;

    setGenerationState('generating');
    setSystemStatus('generating');

    try {
      // Parse chord chart
      const parseResult = parseChordChart(project.chordChartRaw, project.key);
      const parseIssues = parseResult.issues ?? [];

      if (parseResult.truth?.state === 'blocked' || parseIssues.length > 0) {
        throw new Error(describeChordParseBlocker(parseResult));
      }

      const parsedChords = parseResult.chords;

      const request: GenerationRequest = {
        project_id: project.id,
        key: project.key,
        tempo: project.tempo,
        time_signature: project.timeSignature,
        genre: project.genre,
        sub_style: project.subStyle,
        energy: project.energy,
        groove: project.groove,
        feel: project.feel ?? 50,
        swing_pct: getEffectiveSwingPct(project.genre, project.swingPct),
        dynamics: project.dynamics,
        chords: parsedChords,
        generation_hints: [project.generationHints, trimmedAssistantPrompt]
          .filter(Boolean)
          .join('\n\n'),
        stems: ['drums', 'bass', 'piano', 'guitar', 'strings'],
      };

      // Call generator (client-side for MVP)
      const response = generate(request);

      const now = new Date().toISOString();

      // Build sections with UUIDs
      const newSections: Section[] = response.sections.map((s) => ({
        id: crypto.randomUUID(),
        projectId: project.id,
        name: s.name,
        sortOrder: s.sort_order,
        barCount: s.bar_count,
        startBar: s.start_bar,
        energyOverride: null,
        grooveOverride: null,
        feelOverride: null,
        swingPctOverride: null,
        dynamicsOverride: null,
        createdAt: now,
      }));

      // Build stems with UUIDs
      const newStems: Stem[] = response.stems.map((s) => ({
        id: crypto.randomUUID(),
        projectId: project.id,
        instrument: s.instrument as InstrumentType,
        sortOrder: s.sort_order,
        volume: 0.8,
        pan: 0,
        isMuted: false,
        isSolo: false,
        createdAt: now,
      }));

      // Build blocks: map stem_instrument → stemId, section_name → sectionId
      const stemByInstrument = new Map(newStems.map((s) => [s.instrument, s]));
      const sectionByName = new Map(newSections.map((s) => [s.name, s]));

      const newBlocks: Block[] = response.blocks.map((b) => {
        const stem = stemByInstrument.get(b.stem_instrument as InstrumentType);
        const section = sectionByName.get(b.section_name);
        return {
          id: crypto.randomUUID(),
          stemId: stem?.id ?? '',
          sectionId: section?.id ?? '',
          startBar: b.start_bar,
          endBar: b.end_bar,
          chordDegree: b.chord_degree,
          chordQuality: b.chord_quality,
          chordBassDegree: null,
          style: b.style,
          energyOverride: null,
          dynamicsOverride: null,
          midiData: b.midi_data,
          createdAt: now,
        };
      });

      // Build chords
      const newChords: Chord[] = response.chords.map((c) => ({
        id: crypto.randomUUID(),
        projectId: project.id,
        barNumber: c.bar_number,
        degree: c.degree,
        quality: c.quality,
        bassDegree: c.bass_degree,
      }));

      // Populate stores
      setArrangement({ stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords });
      updateProject({
        generatedAt: now,
        generatedTempo: project.tempo,
      });

      addChatMessage(
        createChatMessage(
          project.id,
          'assistant',
          buildGenerationSummary(response, {
            assistantPrompt: trimmedAssistantPrompt,
            hadArrangement: shouldRegenerate,
          }),
          generationScope
        )
      );

      // Push single undo entry after generation completes
      if (shouldRegenerate && before) {
        const after = snapshotArrangement({
          stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords,
        });
        pushUndo(describeGenerationUndoBoundary(trimmedAssistantPrompt), { undo: before, redo: after });
      }

      setGenerationState('complete');
      setSystemStatus('ready');

      // Save to Supabase
      await saveArrangement();
    } catch (err) {
      addChatMessage(
        createChatMessage(
          project.id,
          'assistant',
          formatGenerationFailureMessage(err),
          generationScope
        )
      );
      await saveProject();

      console.error('Generation error:', err);
      setGenerationState(hasArrangementRows ? 'complete' : 'idle');
      setSystemStatus('error', err instanceof Error ? err.message : 'Generation failed');
    }
  }, [
    project, stems, sections, blocks, chords,
    hasArrangementRows,
    setArrangement, updateProject,
    setGenerationState, setSystemStatus,
    pushUndo, saveArrangement, saveProject, addChatMessage,
  ]);

  /** Regenerate MIDI data for all existing blocks using current style params.
   * Does NOT create new sections/stems/blocks — only updates midiData on existing blocks.
   * Used for reactive slider → playback updates. */
  const regenerateMidi = useCallback(() => {
    if (!project || !hasArrangementRows) return;
    if (blocks.length === 0 || sections.length === 0 || stems.length === 0) return;

    const beatsPerBar = parseInt(project.timeSignature.split('/')[0]) || 4;

    const updatedBlocks = blocks.map((block) => {
      const section = sections.find((s) => s.id === block.sectionId);
      const stem = stems.find((s) => s.id === block.stemId);
      if (!section || !stem) return block;

      // Resolve cascaded style values
      const energy = section.energyOverride ?? project.energy;
      const groove = section.grooveOverride ?? project.groove;
      const feel = section.feelOverride ?? project.feel;
      const swingPct = section.swingPctOverride ?? project.swingPct;
      const dynamics = section.dynamicsOverride ?? project.dynamics;

      const barCount = block.endBar - block.startBar + 1;

      // Build chord entries for this block's bar range
      const blockChords: ChordEntry[] = chords
        .filter((c) => c.barNumber >= block.startBar && c.barNumber <= block.endBar)
        .map((c) => ({
          bar_number: c.barNumber,
          degree: c.degree,
          quality: c.quality,
          bass_degree: c.bassDegree,
        }));

      // Regenerate MIDI for this block
      const newMidi = generateMidiForBlock(
        stem.instrument,
        barCount,
        blockChords,
        project.key,
        project.genre,
        stem.instrument === 'drums'
          ? {
              substyle: project.subStyle,
              energy,
              dynamics,
              swingPct,
              groove,
              feel: feel ?? 50,
              beatsPerBar,
              sectionType: section.name.replace(/\s*\d+$/, ''),
              sectionIndex: section.sortOrder,
              isLastSection: section.sortOrder === sections.length - 1,
              totalBarsInSection: section.barCount,
              barNumberGlobal: block.startBar,
            }
          : undefined,
        block.startBar,
        block.style
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks in store — this triggers useAudio's loadArrangement effect
    setArrangement({ stems, sections, blocks: updatedBlocks, chords });
  }, [project, hasArrangementRows, blocks, sections, stems, chords, setArrangement]);

  /** Regenerate MIDI data for drum blocks only.
   * Non-drum blocks remain reference-equal (unchanged).
   * Sets the drumOnlyUpdate flag so useAudio can hot-swap instead of full reload. */
  const regenerateDrumsOnly = useCallback(() => {
    if (!project || !hasArrangementRows) return;
    if (blocks.length === 0 || sections.length === 0 || stems.length === 0) return;

    const beatsPerBar = parseInt(project.timeSignature.split('/')[0]) || 4;

    // Find the drums stem
    const drumStem = stems.find((s) => s.instrument === 'drums');
    if (!drumStem) return;

    const updatedBlocks = blocks.map((block) => {
      // Only regenerate blocks belonging to the drums stem
      if (block.stemId !== drumStem.id) return block;

      const section = sections.find((s) => s.id === block.sectionId);
      if (!section) return block;

      // Resolve cascaded style values (section override ?? project default)
      const energy = section.energyOverride ?? project.energy;
      const groove = section.grooveOverride ?? project.groove;
      const feel = section.feelOverride ?? project.feel;
      const swingPct = section.swingPctOverride ?? project.swingPct;
      const dynamics = section.dynamicsOverride ?? project.dynamics;

      const barCount = block.endBar - block.startBar + 1;

      // Build chord entries for this block's bar range
      const blockChords: ChordEntry[] = chords
        .filter((c) => c.barNumber >= block.startBar && c.barNumber <= block.endBar)
        .map((c) => ({
          bar_number: c.barNumber,
          degree: c.degree,
          quality: c.quality,
          bass_degree: c.bassDegree,
        }));

      // Regenerate MIDI for this drum block
      const newMidi = generateMidiForBlock(
        'drums',
        barCount,
        blockChords,
        project.key,
        project.genre,
        {
          substyle: project.subStyle,
          energy,
          dynamics,
          swingPct,
          groove,
          feel: feel ?? 50,
          beatsPerBar,
          sectionType: section.name.replace(/\s*\d+$/, ''),
          sectionIndex: section.sortOrder,
          isLastSection: section.sortOrder === sections.length - 1,
          totalBarsInSection: section.barCount,
          barNumberGlobal: block.startBar,
        },
        block.startBar,
        block.style
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks via drum-only path — sets drumOnlyUpdate flag
    setDrumBlocks(updatedBlocks);
    useUiStore.getState().markDirty();
  }, [project, hasArrangementRows, blocks, sections, stems, chords, setDrumBlocks]);

  /** Regenerate MIDI data for ALL instrument blocks (drums + pitched).
   * Uses per-instrument hot-swap path so playback is not interrupted. */
  const regenerateAllInstruments = useCallback(() => {
    if (!project || !hasArrangementRows) return;
    if (blocks.length === 0 || sections.length === 0 || stems.length === 0) return;

    const beatsPerBar = parseInt(project.timeSignature.split('/')[0]) || 4;

    const updatedBlocks = blocks.map((block) => {
      const section = sections.find((s) => s.id === block.sectionId);
      const stem = stems.find((s) => s.id === block.stemId);
      if (!section || !stem) return block;

      // Resolve cascaded style values (section override ?? project default)
      const energy = section.energyOverride ?? project.energy;
      const groove = section.grooveOverride ?? project.groove;
      const feel = section.feelOverride ?? project.feel;
      const swingPct = section.swingPctOverride ?? project.swingPct;
      const dynamics = section.dynamicsOverride ?? project.dynamics;

      const barCount = block.endBar - block.startBar + 1;

      // Build chord entries for this block's bar range
      const blockChords: ChordEntry[] = chords
        .filter((c) => c.barNumber >= block.startBar && c.barNumber <= block.endBar)
        .map((c) => ({
          bar_number: c.barNumber,
          degree: c.degree,
          quality: c.quality,
          bass_degree: c.bassDegree,
        }));

      // Regenerate MIDI for this block
      const newMidi = generateMidiForBlock(
        stem.instrument,
        barCount,
        blockChords,
        project.key,
        project.genre,
        stem.instrument === 'drums'
          ? {
              substyle: project.subStyle,
              energy,
              dynamics,
              swingPct,
              groove,
              feel: feel ?? 50,
              beatsPerBar,
              sectionType: section.name.replace(/\s*\d+$/, ''),
              sectionIndex: section.sortOrder,
              isLastSection: section.sortOrder === sections.length - 1,
              totalBarsInSection: section.barCount,
              barNumberGlobal: block.startBar,
            }
          : undefined,
        block.startBar,
        block.style
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks via all-instruments path — sets allInstrumentsUpdate flag
    setAllInstrumentBlocks(updatedBlocks);
    useUiStore.getState().markDirty();
  }, [project, hasArrangementRows, blocks, sections, stems, chords, setAllInstrumentBlocks]);

  // Reactive MIDI regeneration on style slider changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Only react if arrangement exists
    if (!hasArrangementRows || blocks.length === 0) return;

    // Skip the initial render (don't regenerate on page load)
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      regenerateAllInstruments();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasArrangementRows, project?.energy, project?.groove, project?.feel, project?.swingPct, project?.dynamics]);

  return { runGeneration, regenerateMidi, regenerateDrumsOnly, regenerateAllInstruments };
}
