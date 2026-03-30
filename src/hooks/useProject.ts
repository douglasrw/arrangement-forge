// useProject.ts — Project CRUD and Supabase persistence hook.
// Bridges Zustand project store with Supabase database.

import { useCallback } from 'react';
import { getDefaultProjectStyle } from '@/lib/genre-config';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { getProjectArrangementTruth, useProjectStore } from '@/store/project-store';
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

export interface ProjectExportReadiness {
  canExport: boolean;
  hasTextTruth: boolean;
  hasArrangementRows: boolean;
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>;
  message: string;
}

export type ProjectSaveStatus =
  | 'project-draft'
  | 'project-draft-over-saved-arrangement'
  | 'arrangement-draft'
  | 'loaded-arrangement';

interface ProjectSaveCopy {
  statusLabel:
    | 'Project draft'
    | 'Project draft + saved arrangement'
    | 'Arrangement draft'
    | 'Loaded arrangement';
  savingLabel:
    | 'Saving project…'
    | 'Saving project draft…'
    | 'Saving arrangement draft…'
    | 'Saving loaded arrangement…';
}

export interface ProjectSavePlan {
  saveStatus: ProjectSaveStatus;
  saveTarget: 'project' | 'arrangement';
  saveAction: 'save-project' | 'save-arrangement';
  statusLabel: ProjectSaveCopy['statusLabel'];
  savingLabel: ProjectSaveCopy['savingLabel'];
  currentState: string;
  nextStep: string;
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>;
}

export type LoadProjectResult =
  | { status: 'ready' }
  | { status: 'missing-project'; message: string }
  | { status: 'error'; message: string };

const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';

function getPersistedArrangementProjectPatch(
  project: Project,
  persistedAt: string = new Date().toISOString()
): Pick<Project, 'hasArrangement' | 'generatedAt' | 'generatedTempo'> {
  return {
    hasArrangement: true,
    generatedAt: project.generatedAt ?? persistedAt,
    generatedTempo: project.generatedTempo ?? project.tempo,
  };
}

function describeProjectSaveCurrentState(
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>
): string {
  if (arrangementTruth.hasArrangementRows) {
    return arrangementTruth.hasPersistedArrangement
      ? 'Loaded arrangement rows and a saved arrangement snapshot both exist right now.'
      : 'Loaded arrangement rows exist only in the current draft state.';
  }

  return arrangementTruth.hasPersistedArrangement
    ? 'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session.'
    : 'Only project fields and chat are in play right now; no arrangement rows are loaded.';
}

function describeProjectSaveNextStep(
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>
): string {
  if (arrangementTruth.hasArrangementRows) {
    return arrangementTruth.hasPersistedArrangement
      ? 'Save now to write the loaded arrangement rows back to the saved arrangement snapshot.'
      : 'Save now to create the first saved arrangement snapshot from the loaded arrangement rows.';
  }

  return 'Save now to persist project fields and chat without replacing arrangement rows.';
}

function getProjectSaveStatus(
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>
): ProjectSaveStatus {
  switch (arrangementTruth.status) {
    case 'draft-only':
      return 'arrangement-draft';
    case 'loaded-and-persisted':
      return 'loaded-arrangement';
    case 'persisted-only':
      return 'project-draft-over-saved-arrangement';
    case 'missing':
    default:
      return 'project-draft';
  }
}

function getProjectSaveCopy(saveStatus: ProjectSaveStatus): ProjectSaveCopy {
  switch (saveStatus) {
    case 'arrangement-draft':
      return {
        statusLabel: 'Arrangement draft',
        savingLabel: 'Saving arrangement draft…',
      };
    case 'loaded-arrangement':
      return {
        statusLabel: 'Loaded arrangement',
        savingLabel: 'Saving loaded arrangement…',
      };
    case 'project-draft-over-saved-arrangement':
      return {
        statusLabel: 'Project draft + saved arrangement',
        savingLabel: 'Saving project draft…',
      };
    case 'project-draft':
    default:
      return {
        statusLabel: 'Project draft',
        savingLabel: 'Saving project…',
      };
  }
}

export function getProjectSavePlan(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): ProjectSavePlan {
  const arrangementTruth = getProjectArrangementTruth(state);
  const saveStatus = getProjectSaveStatus(arrangementTruth);
  const saveCopy = getProjectSaveCopy(saveStatus);

  if (arrangementTruth.hasArrangementRows) {
    return {
      saveStatus,
      saveTarget: 'arrangement',
      saveAction: 'save-arrangement',
      ...saveCopy,
      currentState: describeProjectSaveCurrentState(arrangementTruth),
      nextStep: describeProjectSaveNextStep(arrangementTruth),
      arrangementTruth,
    };
  }

  return {
    saveStatus,
    saveTarget: 'project',
    saveAction: 'save-project',
    ...saveCopy,
    currentState: describeProjectSaveCurrentState(arrangementTruth),
    nextStep: describeProjectSaveNextStep(arrangementTruth),
    arrangementTruth,
  };
}

export function getProjectExportReadiness(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
}): ProjectExportReadiness {
  const arrangementTruth = getProjectArrangementTruth(state);
  const hasArrangementRows = arrangementTruth.hasArrangementRows;

  if (!state.project) {
    return {
      canExport: false,
      hasTextTruth: false,
      hasArrangementRows: false,
      arrangementTruth,
      message: 'Open a project to export',
    };
  }

  const hasTextTruth = Boolean(
    state.project.chordChartRaw.trim() || state.project.generationHints.trim()
  );

  if (hasTextTruth || hasArrangementRows) {
    return {
      canExport: true,
      hasTextTruth,
      hasArrangementRows,
      arrangementTruth,
      message: 'Download chord chart and arrangement snapshot',
    };
  }

  if (arrangementTruth.status === 'persisted-only') {
    return {
      canExport: false,
      hasTextTruth: false,
      hasArrangementRows: false,
      arrangementTruth,
      message: 'Reload the saved arrangement rows before exporting the arrangement snapshot',
    };
  }

  return {
    canExport: false,
    hasTextTruth: false,
    hasArrangementRows: false,
    arrangementTruth,
    message: 'Add a chord chart, description, or arrangement to export',
  };
}

export function useProject() {
  const { setSystemStatus, markSaved, setLibraryCount } = useUiStore();

  const handleError = useCallback(
    (error: unknown) => {
      console.error(error);
      setSystemStatus('error', error instanceof Error ? error.message : 'Unknown error');
    },
    [setSystemStatus]
  );

  const loadProject = useCallback(
    async (projectId: string): Promise<LoadProjectResult> => {
      setSystemStatus('ready');
      try {
        const [projectRes, stemsRes, sectionsRes, chordsRes, messagesRes] =
          await Promise.all([
            supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
            supabase.from('stems').select('*').eq('project_id', projectId),
            supabase.from('sections').select('*').eq('project_id', projectId).order('sort_order'),
            supabase.from('chords').select('*').eq('project_id', projectId).order('bar_number'),
            supabase.from('ai_chat_messages').select('*').eq('project_id', projectId).order('created_at'),
          ]);

        if (projectRes.error) throw projectRes.error;
        if (!projectRes.data) {
          useProjectStore.getState().clearProjectSession();
          setSystemStatus('error', PROJECT_NOT_FOUND_MESSAGE);
          return {
            status: 'missing-project',
            message: PROJECT_NOT_FOUND_MESSAGE,
          };
        }

        const store = useProjectStore.getState();
        const project = rowToProject(projectRes.data as Record<string, unknown>);

        const stemIds = (stemsRes.data ?? []).map((s: Record<string, unknown>) => s.id as string);

        // Re-fetch blocks filtered by stem IDs for this project
        const blocksForProject = stemIds.length > 0
          ? await supabase.from('blocks').select('*').in('stem_id', stemIds)
          : { data: [], error: null };

        store.hydrateProject({
          project,
          stems: (stemsRes.data ?? []).map((r) => rowToStem(r as Record<string, unknown>)),
          sections: (sectionsRes.data ?? []).map((r) => rowToSection(r as Record<string, unknown>)),
          blocks: (blocksForProject.data ?? []).map((r) => rowToBlock(r as Record<string, unknown>)),
          chords: (chordsRes.data ?? []).map((r) => rowToChord(r as Record<string, unknown>)),
          chatMessages: (messagesRes.data ?? []).map((msg) => rowToMessage(msg as Record<string, unknown>)),
        });
        return { status: 'ready' };
      } catch (err) {
        handleError(err);
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    [setSystemStatus, handleError]
  );

  const replaceChatMessages = useCallback(
    async (projectId: string, chatMessages: AiChatMessage[]) => {
      const { error: deleteError } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      if (!chatMessages.length) {
        return;
      }

      const { error: insertError } = await supabase.from('ai_chat_messages').insert(
        chatMessages.map((message) => camelToSnake(message as unknown as Record<string, unknown>))
      );

      if (insertError) throw insertError;
    },
    []
  );

  const persistProjectDraft = useCallback(async () => {
    const { project, stems, sections, blocks, chords, chatMessages } = useProjectStore.getState();
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
      await replaceChatMessages(project.id, chatMessages);
      markSaved();
      setSystemStatus('ready');
    } catch (err) {
      handleError(err);
    }
  }, [setSystemStatus, markSaved, handleError, replaceChatMessages]);

  const persistArrangementDraft = useCallback(async () => {
    const { project, stems, sections, blocks, chords, chatMessages } = useProjectStore.getState();
    if (!project) return;
    setSystemStatus('saving');
    try {
      const persistedProjectPatch = getPersistedArrangementProjectPatch(project);

      // Replace the persisted arrangement so regeneration cannot leave stale
      // sections or chord rows behind.
      await supabase.from('stems').delete().eq('project_id', project.id);
      await supabase.from('sections').delete().eq('project_id', project.id);
      await supabase.from('chords').delete().eq('project_id', project.id);

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
      await replaceChatMessages(project.id, chatMessages);

      await supabase
        .from('projects')
        .upsert(
          camelToSnake({
            ...project,
            ...persistedProjectPatch,
          } as unknown as Record<string, unknown>)
        );

      if (useProjectStore.getState().project?.id === project.id) {
        useProjectStore.setState((state) => ({
          project: state.project
            ? {
                ...state.project,
                ...persistedProjectPatch,
              }
            : state.project,
        }));
      }

      markSaved();
      setSystemStatus('ready');
    } catch (err) {
      handleError(err);
    }
  }, [setSystemStatus, markSaved, handleError, replaceChatMessages]);

  const saveProject = useCallback(async () => {
    const savePlan = getProjectSavePlan(useProjectStore.getState());

    if (savePlan.saveTarget === 'arrangement') {
      await persistArrangementDraft();
      return;
    }

    await persistProjectDraft();
  }, [persistArrangementDraft, persistProjectDraft]);

  const createProject = useCallback(async (): Promise<string | null> => {
    try {
      const { genre, subStyle } = getDefaultProjectStyle(
        useAuthStore.getState().profile?.defaultGenre
      );

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: 'Untitled Project',
          key: 'C',
          tempo: 120,
          time_signature: '4/4',
          genre,
          sub_style: subStyle,
          energy: 50,
          groove: 50,
          feel: 50,
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
    async (projectId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (error) throw error;
        setSystemStatus('ready');
        return true;
      } catch (err) {
        handleError(err);
        return false;
      }
    },
    [handleError, setSystemStatus]
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
      setSystemStatus('ready');
      return projects;
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [setLibraryCount, setSystemStatus, handleError]);

  const saveArrangement = useCallback(async () => {
    await persistArrangementDraft();
  }, [persistArrangementDraft]);

  return {
    loadProject,
    saveProject,
    createProject,
    deleteProject,
    listProjects,
    saveArrangement,
  };
}
