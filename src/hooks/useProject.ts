// useProject.ts — Project CRUD and Supabase persistence hook.
// Bridges Zustand project store with Supabase database.

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type {
  Project,
  Stem,
  Section,
  Block,
  Chord,
  AiChatMessage,
  MidiNoteData,
} from '@/types';

// ---------- Field name transforms ----------

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])
  );
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v])
  );
}

// Type-safe row transforms
function rowToProject(row: Record<string, unknown>): Project {
  const c = snakeToCamel(row);
  return c as unknown as Project;
}

function rowToStem(row: Record<string, unknown>): Stem {
  return snakeToCamel(row) as unknown as Stem;
}

function rowToSection(row: Record<string, unknown>): Section {
  return snakeToCamel(row) as unknown as Section;
}

function rowToBlock(row: Record<string, unknown>): Block {
  const c = snakeToCamel(row) as Record<string, unknown>;
  // midiData is jsonb in DB (midi_data)
  c.midiData = (c.midiData ?? []) as MidiNoteData[];
  return c as unknown as Block;
}

function rowToChord(row: Record<string, unknown>): Chord {
  return snakeToCamel(row) as unknown as Chord;
}

function rowToMessage(row: Record<string, unknown>): AiChatMessage {
  return snakeToCamel(row) as unknown as AiChatMessage;
}

// ---------- Hook ----------

export function useProject() {
  const projectStore = useProjectStore();
  const { setSystemStatus, markSaved, setLibraryCount } = useUiStore();

  const handleError = useCallback(
    (error: unknown) => {
      console.error(error);
      setSystemStatus('error', error instanceof Error ? error.message : 'Unknown error');
    },
    [setSystemStatus]
  );

  const loadProject = useCallback(
    async (projectId: string) => {
      setSystemStatus('ready');
      try {
        const [projectRes, stemsRes, sectionsRes, chordsRes, messagesRes] =
          await Promise.all([
            supabase.from('projects').select('*').eq('id', projectId).single(),
            supabase.from('stems').select('*').eq('project_id', projectId),
            supabase.from('sections').select('*').eq('project_id', projectId).order('sort_order'),
            supabase.from('chords').select('*').eq('project_id', projectId).order('bar_number'),
            supabase.from('ai_chat_messages').select('*').eq('project_id', projectId).order('created_at'),
          ]);

        if (projectRes.error) throw projectRes.error;
        projectStore.setProject(rowToProject(projectRes.data as Record<string, unknown>));

        const stemIds = (stemsRes.data ?? []).map((s: Record<string, unknown>) => s.id as string);

        // Re-fetch blocks filtered by stem IDs for this project
        const blocksForProject = stemIds.length > 0
          ? await supabase.from('blocks').select('*').in('stem_id', stemIds)
          : { data: [], error: null };

        projectStore.setArrangement({
          stems: (stemsRes.data ?? []).map((r) => rowToStem(r as Record<string, unknown>)),
          sections: (sectionsRes.data ?? []).map((r) => rowToSection(r as Record<string, unknown>)),
          blocks: (blocksForProject.data ?? []).map((r) => rowToBlock(r as Record<string, unknown>)),
          chords: (chordsRes.data ?? []).map((r) => rowToChord(r as Record<string, unknown>)),
        });

        for (const msg of (messagesRes.data ?? [])) {
          projectStore.addChatMessage(rowToMessage(msg as Record<string, unknown>));
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        handleError(err);
      }
    },
    [projectStore, setSystemStatus, handleError]
  );

  const saveProject = useCallback(async () => {
    const { project, stems, sections, blocks, chords } = projectStore;
    if (!project) return;
    setSystemStatus('saving');
    try {
      await supabase
        .from('projects')
        .upsert(camelToSnake(project as unknown as Record<string, unknown>));

      if (stems.length) {
        await supabase.from('stems').upsert(
          stems.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
        );
      }
      if (sections.length) {
        await supabase.from('sections').upsert(
          sections.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
        );
      }
      if (blocks.length) {
        await supabase.from('blocks').upsert(
          blocks.map((b) => {
            const row = camelToSnake(b as unknown as Record<string, unknown>);
            row.midi_data = b.midiData; // keep jsonb as-is
            delete row.midi_data_snake; // clean up any artefact
            return row;
          })
        );
      }
      if (chords.length) {
        await supabase.from('chords').upsert(
          chords.map((c) => camelToSnake(c as unknown as Record<string, unknown>))
        );
      }
      markSaved();
      setSystemStatus('ready');
    } catch (err) {
      handleError(err);
    }
  }, [projectStore, setSystemStatus, markSaved, handleError]);

  const createProject = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: 'Untitled Project',
          key: 'C',
          tempo: 120,
          time_signature: '4/4',
          genre: 'Jazz',
          sub_style: 'Swing',
          energy: 50,
          groove: 50,
          swing_pct: null,
          dynamics: 50,
          generation_hints: '',
          chord_chart_raw: '',
          has_arrangement: false,
        })
        .select()
        .single();
      if (error) throw error;
      return (data as Record<string, unknown>).id as string;
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [handleError]);

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (error) throw error;
      } catch (err) {
        handleError(err);
      }
    },
    [handleError]
  );

  const listProjects = useCallback(async (): Promise<Project[]> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const projects = (data ?? []).map((r) => rowToProject(r as Record<string, unknown>));
      setLibraryCount(projects.length);
      return projects;
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [setLibraryCount, handleError]);

  const saveArrangement = useCallback(async () => {
    const { project, stems, sections, blocks, chords } = projectStore;
    if (!project) return;
    setSystemStatus('saving');
    try {
      // Delete existing arrangement data
      await supabase.from('stems').delete().eq('project_id', project.id);

      // Insert new data
      if (stems.length) {
        await supabase.from('stems').insert(
          stems.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
        );
      }
      if (sections.length) {
        await supabase.from('sections').insert(
          sections.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
        );
      }
      if (blocks.length) {
        await supabase.from('blocks').insert(
          blocks.map((b) => ({
            ...camelToSnake(b as unknown as Record<string, unknown>),
            midi_data: b.midiData,
          }))
        );
      }
      if (chords.length) {
        await supabase.from('chords').insert(
          chords.map((c) => camelToSnake(c as unknown as Record<string, unknown>))
        );
      }

      await supabase
        .from('projects')
        .update({ has_arrangement: true, generated_at: new Date().toISOString() })
        .eq('id', project.id);

      markSaved();
      setSystemStatus('ready');
    } catch (err) {
      handleError(err);
    }
  }, [projectStore, setSystemStatus, markSaved, handleError]);

  return {
    loadProject,
    saveProject,
    createProject,
    deleteProject,
    listProjects,
    saveArrangement,
  };
}
