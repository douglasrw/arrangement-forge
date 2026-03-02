// useGenerate.ts — Generation flow: build request, call generator, populate stores, save.

import { useCallback } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { useProject } from '@/hooks/useProject';
import { generate } from '@/lib/midi-generator';
import { parseChordChart } from '@/lib/chord-chart-parser';
import type { GenerationRequest, Section, Stem, Block, Chord, InstrumentType } from '@/types';

export function useGenerate() {
  const { project, stems, sections, blocks, chords, setArrangement, updateProject } = useProjectStore();
  const { setGenerationState, setSystemStatus } = useUiStore();
  const { pushUndo } = useUndoStore();
  const { saveArrangement } = useProject();

  const runGeneration = useCallback(async (isRegeneration = false) => {
    if (!project) return;

    // Snapshot for undo if regenerating
    if (isRegeneration) {
      const before = JSON.stringify({ stems, sections, blocks, chords });
      pushUndo('Full regeneration', before, '');
    }

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

      // Finalize undo entry after generation
      if (isRegeneration) {
        const after = JSON.stringify({ stems: newStems, sections: newSections, blocks: newBlocks, chords: newChords });
        const undoStack = useUndoStore.getState().undoStack;
        const lastEntry = undoStack[undoStack.length - 1];
        if (lastEntry && lastEntry.stateAfter === '') {
          useUndoStore.getState().pushUndo(
            'Full regeneration',
            lastEntry.stateBefore,
            after
          );
        }
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

  return { runGeneration };
}
