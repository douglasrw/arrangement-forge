// useGenerate.ts — Generation flow: build request, call generator, populate stores, save.
// Also provides regenerateMidi() for reactive slider → playback updates.

import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { useProject } from '@/hooks/useProject';
import { generate, generateMidiForBlock } from '@/lib/midi-generator';
import { parseChordChart } from '@/lib/chord-chart-parser';
import { snapshotArrangement } from '@/lib/undo-helpers';
import type { GenerationRequest, Section, Stem, Block, Chord, InstrumentType, ChordEntry } from '@/types';

export function useGenerate() {
  const { project, stems, sections, blocks, chords, setArrangement, setDrumBlocks, updateProject } = useProjectStore();
  const { setGenerationState, setSystemStatus } = useUiStore();
  const { pushUndo } = useUndoStore();
  const { saveArrangement } = useProject();

  const runGeneration = useCallback(async (isRegeneration = false) => {
    if (!project) return;

    // Capture pre-generation state for undo (only used if isRegeneration)
    const before = isRegeneration
      ? snapshotArrangement({ stems, sections, blocks, chords })
      : null;

    setGenerationState('generating');
    setSystemStatus('generating');

    try {
      // Parse chord chart
      const { chords: parsedChords } = parseChordChart(project.chordChartRaw, project.key);

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
        swing_pct: project.swingPct,
        dynamics: project.dynamics,
        chords: parsedChords,
        generation_hints: project.generationHints,
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
        hasArrangement: true,
        generatedAt: now,
        generatedTempo: project.tempo,
      });

      // Push single undo entry after generation completes
      if (isRegeneration && before) {
        const after = snapshotArrangement({
          stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords,
        });
        pushUndo('Full regeneration', before, after);
      }

      setGenerationState('complete');
      setSystemStatus('ready');

      // Save to Supabase
      await saveArrangement();
    } catch (err) {
      console.error('Generation error:', err);
      setGenerationState(project.hasArrangement ? 'complete' : 'idle');
      setSystemStatus('error', err instanceof Error ? err.message : 'Generation failed');
    }
  }, [
    project, stems, sections, blocks, chords,
    setArrangement, updateProject,
    setGenerationState, setSystemStatus,
    pushUndo, saveArrangement,
  ]);

  /** Regenerate MIDI data for all existing blocks using current style params.
   * Does NOT create new sections/stems/blocks — only updates midiData on existing blocks.
   * Used for reactive slider → playback updates. */
  const regenerateMidi = useCallback(() => {
    if (!project || !project.hasArrangement) return;
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
        stem.instrument === 'drums' ? {
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
        } : undefined
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks in store — this triggers useAudio's loadArrangement effect
    setArrangement({ stems, sections, blocks: updatedBlocks, chords });
  }, [project, blocks, sections, stems, chords, setArrangement]);

  /** Regenerate MIDI data for drum blocks only.
   * Non-drum blocks remain reference-equal (unchanged).
   * Sets the drumOnlyUpdate flag so useAudio can hot-swap instead of full reload. */
  const regenerateDrumsOnly = useCallback(() => {
    if (!project || !project.hasArrangement) return;
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
        }
      );

      return { ...block, midiData: newMidi };
    });

    // Update blocks via drum-only path — sets drumOnlyUpdate flag
    setDrumBlocks(updatedBlocks);
    useUiStore.getState().markDirty();
  }, [project, blocks, sections, stems, chords, setDrumBlocks]);

  // Reactive MIDI regeneration on style slider changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Only react if arrangement exists
    if (!project?.hasArrangement || blocks.length === 0) return;

    // Skip the initial render (don't regenerate on page load)
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      regenerateDrumsOnly();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.energy, project?.groove, project?.feel, project?.swingPct, project?.dynamics]);

  return { runGeneration, regenerateMidi, regenerateDrumsOnly };
}
