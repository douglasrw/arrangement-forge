// useProject.ts — Project CRUD and Supabase persistence hook.
// Bridges Zustand project store with Supabase database.

import { useCallback } from 'react';
import { getDefaultProjectStyle } from '@/lib/genre-config';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import {
  getProjectArrangementTruth,
  syncPersistedProjectArrangement,
  useProjectStore,
} from '@/store/project-store';
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

function getFailureMessage(verb: 'load' | 'save', targetLabel: string, error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return `Failed to ${verb} ${targetLabel}: ${error.message}`;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return `Failed to ${verb} ${targetLabel}: ${(error as { message: string }).message}`;
  }

  return `Failed to ${verb} ${targetLabel}.`;
}

function getLoadFailureMessage(tableLabel: string, error: unknown): string {
  return getFailureMessage('load', tableLabel, error);
}

function getActionFailureMessage(actionLabel: string, error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return `Failed to ${actionLabel}: ${error.message}`;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return `Failed to ${actionLabel}: ${(error as { message: string }).message}`;
  }

  return `Failed to ${actionLabel}.`;
}

function throwIfLoadFailed(tableLabel: string, error: unknown) {
  if (!error) {
    return;
  }

  throw new Error(getLoadFailureMessage(tableLabel, error));
}

async function ensureWriteSucceeded<T extends { error?: unknown | null }>(
  actionLabel: string,
  operation: Promise<T>
): Promise<T> {
  const result = await operation;

  if (result.error) {
    throw new Error(getActionFailureMessage(actionLabel, result.error));
  }

  return result;
}

// ---------- Hook ----------

export interface ProjectExportReadiness {
  canExport: boolean;
  actionType:
    | 'none'
    | 'export-chart'
    | 'export-chart-and-snapshot'
    | 'reload-saved-snapshot';
  actionLabel:
    | 'Export chart + snapshot'
    | 'Export chart'
    | 'Reload saved snapshot'
    | 'Nothing to export';
  hasTextTruth: boolean;
  hasArrangementRows: boolean;
  exportsArrangementSnapshot: boolean;
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>;
  currentState: string;
  nextStep: string;
}

export type ProjectSaveStatus =
  | 'project-draft'
  | 'project-draft-with-loaded-arrangement'
  | 'project-draft-over-saved-arrangement'
  | 'arrangement-draft'
  | 'arrangement-draft-over-saved-arrangement';

interface ProjectSaveCopy {
  statusLabel:
    | 'Project draft'
    | 'Project draft + loaded snapshot'
    | 'Project draft + saved snapshot'
    | 'Arrangement draft only'
    | 'Arrangement draft + saved snapshot';
  savingLabel:
    | 'Saving project draft…'
    | 'Saving first arrangement snapshot…'
    | 'Saving arrangement snapshot…';
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
  if (arrangementTruth.hasDraftArrangementRows) {
    return arrangementTruth.hasPersistedArrangement
      ? 'Loaded arrangement rows are currently ahead of the saved arrangement snapshot.'
      : 'Loaded arrangement rows exist only in the current draft state.';
  }

  if (arrangementTruth.hasArrangementRows) {
    return 'Project fields and chat are in draft state, while the loaded arrangement rows already match the saved arrangement snapshot.';
  }

  return arrangementTruth.hasPersistedArrangement
    ? 'Only project fields and chat will change; the saved arrangement snapshot exists but is not loaded in this session.'
    : 'Only project fields and chat are in play right now; no arrangement rows are loaded.';
}

function describeProjectSaveNextStep(
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>
): string {
  if (arrangementTruth.hasDraftArrangementRows) {
    return arrangementTruth.hasPersistedArrangement
      ? 'Save now to replace the saved arrangement snapshot with the current draft arrangement rows.'
      : 'Save now to create the first saved arrangement snapshot from the loaded arrangement rows.';
  }

  if (arrangementTruth.hasArrangementRows) {
    return 'Save now to persist project fields and chat without replacing arrangement rows.';
  }

  return 'Save now to persist project fields and chat without replacing arrangement rows.';
}

function getProjectSaveStatus(
  arrangementTruth: ReturnType<typeof getProjectArrangementTruth>
): ProjectSaveStatus {
  switch (arrangementTruth.status) {
    case 'draft-only':
      return 'arrangement-draft';
    case 'draft-over-persisted':
      return 'arrangement-draft-over-saved-arrangement';
    case 'loaded-and-persisted':
      return 'project-draft-with-loaded-arrangement';
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
        statusLabel: 'Arrangement draft only',
        savingLabel: 'Saving first arrangement snapshot…',
      };
    case 'arrangement-draft-over-saved-arrangement':
      return {
        statusLabel: 'Arrangement draft + saved snapshot',
        savingLabel: 'Saving arrangement snapshot…',
      };
    case 'project-draft-with-loaded-arrangement':
      return {
        statusLabel: 'Project draft + loaded snapshot',
        savingLabel: 'Saving project draft…',
      };
    case 'project-draft-over-saved-arrangement':
      return {
        statusLabel: 'Project draft + saved snapshot',
        savingLabel: 'Saving project draft…',
      };
    case 'project-draft':
    default:
      return {
        statusLabel: 'Project draft',
        savingLabel: 'Saving project draft…',
      };
  }
}

export function getProjectSavePlan(state: {
  project: Project | null;
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
  persistedArrangementFingerprint?: string | null;
}): ProjectSavePlan {
  const arrangementTruth = getProjectArrangementTruth(state);
  const saveStatus = getProjectSaveStatus(arrangementTruth);
  const saveCopy = getProjectSaveCopy(saveStatus);

  if (arrangementTruth.hasDraftArrangementRows) {
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
  persistedArrangementFingerprint?: string | null;
}): ProjectExportReadiness {
  const arrangementTruth = getProjectArrangementTruth(state);
  const hasArrangementRows = arrangementTruth.hasArrangementRows;

  if (!state.project) {
    return {
      canExport: false,
      actionType: 'none',
      actionLabel: 'Nothing to export',
      hasTextTruth: false,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth,
      currentState: 'No project is open right now.',
      nextStep: 'Open a project to export.',
    };
  }

  const hasTextTruth = Boolean(
    state.project.chordChartRaw.trim() || state.project.generationHints.trim()
  );

  if (hasTextTruth || hasArrangementRows) {
    if (hasTextTruth && !hasArrangementRows) {
      if (arrangementTruth.status === 'persisted-only') {
        return {
          canExport: true,
          actionType: 'export-chart',
          actionLabel: 'Export chart',
          hasTextTruth,
          hasArrangementRows: false,
          exportsArrangementSnapshot: false,
          arrangementTruth,
          currentState: 'Project text is ready to export, but the saved arrangement snapshot is not loaded in this session.',
          nextStep: 'Export now to download the chord chart, or reload the saved arrangement rows before exporting the arrangement snapshot.',
        };
      }

      return {
        canExport: true,
        actionType: 'export-chart',
        actionLabel: 'Export chart',
        hasTextTruth,
        hasArrangementRows: false,
        exportsArrangementSnapshot: false,
        arrangementTruth,
        currentState: 'Project text is ready to export, but no arrangement rows are loaded yet.',
        nextStep: 'Export now to download the chord chart, or generate or import arrangement rows before exporting an arrangement snapshot.',
      };
    }

    return {
      canExport: true,
      actionType: 'export-chart-and-snapshot',
      actionLabel: 'Export chart + snapshot',
      hasTextTruth,
      hasArrangementRows,
      exportsArrangementSnapshot: true,
      arrangementTruth,
      currentState: hasArrangementRows
        ? hasTextTruth
          ? arrangementTruth.hasDraftArrangementRows
            ? 'Project text and loaded draft arrangement rows are both ready to export.'
            : arrangementTruth.hasPersistedArrangement
              ? 'Project text and the loaded saved arrangement snapshot are both ready to export.'
              : 'Project text and loaded arrangement rows are both ready to export.'
          : arrangementTruth.hasDraftArrangementRows
            ? 'Loaded arrangement rows are ready to export from the current draft state.'
            : arrangementTruth.hasPersistedArrangement
              ? 'Loaded arrangement rows are ready to export from the saved arrangement snapshot already loaded in this session.'
              : 'Loaded arrangement rows are ready to export from the current draft state.'
        : 'Project text is ready to export even though no arrangement rows are loaded.',
      nextStep: 'Export now to download the chord chart and arrangement snapshot.',
    };
  }

  if (arrangementTruth.status === 'persisted-only') {
    return {
      canExport: false,
      actionType: 'reload-saved-snapshot',
      actionLabel: 'Reload saved snapshot',
      hasTextTruth: false,
      hasArrangementRows: false,
      exportsArrangementSnapshot: false,
      arrangementTruth,
      currentState: 'A saved arrangement snapshot exists, but its rows are not loaded in this session.',
      nextStep: 'Reload the saved arrangement rows before exporting the arrangement snapshot.',
    };
  }

  return {
    canExport: false,
    actionType: 'none',
    actionLabel: 'Nothing to export',
    hasTextTruth: false,
    hasArrangementRows: false,
    exportsArrangementSnapshot: false,
    arrangementTruth,
    currentState: 'No chord chart, generation hints, or arrangement rows are ready to export yet.',
    nextStep: 'Add a chord chart, description, or arrangement before exporting.',
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
      useProjectStore.getState().clearProjectSession();
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

        throwIfLoadFailed('project stems', stemsRes.error);
        throwIfLoadFailed('project sections', sectionsRes.error);
        throwIfLoadFailed('project chords', chordsRes.error);
        throwIfLoadFailed('project chat history', messagesRes.error);

        const store = useProjectStore.getState();
        const project = rowToProject(projectRes.data as Record<string, unknown>);

        const stemIds = (stemsRes.data ?? []).map((s: Record<string, unknown>) => s.id as string);

        // Re-fetch blocks filtered by stem IDs for this project
        const blocksForProject = stemIds.length > 0
          ? await supabase.from('blocks').select('*').in('stem_id', stemIds)
          : { data: [], error: null };

        throwIfLoadFailed('project blocks', blocksForProject.error);

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
      await ensureWriteSucceeded(
        'save project draft',
        supabase
          .from('projects')
          .upsert(camelToSnake(project as unknown as Record<string, unknown>))
      );

      if (stems.length) {
        await ensureWriteSucceeded(
          'save project stems',
          supabase.from('stems').upsert(
            stems.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
          )
        );
      }
      if (sections.length) {
        await ensureWriteSucceeded(
          'save project sections',
          supabase.from('sections').upsert(
            sections.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
          )
        );
      }
      if (blocks.length) {
        await ensureWriteSucceeded(
          'save project blocks',
          supabase.from('blocks').upsert(
            blocks.map((b) => {
              const row = camelToSnake(b as unknown as Record<string, unknown>);
              row.midi_data = b.midiData; // keep jsonb as-is
              delete row.midi_data_snake; // clean up any artefact
              return row;
            })
          )
        );
      }
      if (chords.length) {
        await ensureWriteSucceeded(
          'save project chords',
          supabase.from('chords').upsert(
            chords.map((c) => camelToSnake(c as unknown as Record<string, unknown>))
          )
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
      await ensureWriteSucceeded(
        'replace persisted arrangement stems',
        supabase.from('stems').delete().eq('project_id', project.id)
      );
      await ensureWriteSucceeded(
        'replace persisted arrangement sections',
        supabase.from('sections').delete().eq('project_id', project.id)
      );
      await ensureWriteSucceeded(
        'replace persisted arrangement chords',
        supabase.from('chords').delete().eq('project_id', project.id)
      );

      // Insert new data
      if (stems.length) {
        await ensureWriteSucceeded(
          'save arrangement stems',
          supabase.from('stems').insert(
            stems.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
          )
        );
      }
      if (sections.length) {
        await ensureWriteSucceeded(
          'save arrangement sections',
          supabase.from('sections').insert(
            sections.map((s) => camelToSnake(s as unknown as Record<string, unknown>))
          )
        );
      }
      if (blocks.length) {
        await ensureWriteSucceeded(
          'save arrangement blocks',
          supabase.from('blocks').insert(
            blocks.map((b) => ({
              ...camelToSnake(b as unknown as Record<string, unknown>),
              midi_data: b.midiData,
            }))
          )
        );
      }
      if (chords.length) {
        await ensureWriteSucceeded(
          'save arrangement chords',
          supabase.from('chords').insert(
            chords.map((c) => camelToSnake(c as unknown as Record<string, unknown>))
          )
        );
      }
      await replaceChatMessages(project.id, chatMessages);

      await ensureWriteSucceeded(
        'save arrangement project metadata',
        supabase
          .from('projects')
          .upsert(
            camelToSnake({
              ...project,
              ...persistedProjectPatch,
            } as unknown as Record<string, unknown>)
          )
        );

      if (useProjectStore.getState().project?.id === project.id) {
        useProjectStore.setState((state) => {
          if (!state.project) {
            return { project: state.project };
          }

          const nextProject = {
            ...state.project,
            ...persistedProjectPatch,
          };

          syncPersistedProjectArrangement(nextProject, {
            stems: state.stems,
            sections: state.sections,
            blocks: state.blocks,
            chords: state.chords,
          });

          return {
            project: nextProject,
          };
        });
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
