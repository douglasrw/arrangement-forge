import type { Block, GenerationState, Section, Stem, SystemStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  getProjectArrangementTruth,
  getProjectSelectionTruth,
  getProjectStoreReadiness,
} from '@/store/project-store';
import { getProjectSavePlan } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';

export type AppStatus =
  | 'saved'
  | 'unsaved'
  | 'saving'
  | 'generating'
  | 'loading-project'
  | 'no-project-selected'
  | 'loading-samples'
  | 'offline'
  | 'error';

interface StatusBarStateInput {
  generationState: GenerationState;
  systemStatus: SystemStatus;
  unsavedChanges: boolean;
}

export function deriveStatusBarStatus({
  generationState,
  systemStatus,
  unsavedChanges,
}: StatusBarStateInput): AppStatus {
  if (systemStatus === 'error') return 'error';
  if (systemStatus === 'offline') return 'offline';
  if (systemStatus === 'loading-samples') return 'loading-samples';
  if (generationState === 'generating' || systemStatus === 'generating') return 'generating';
  if (systemStatus === 'saving') return 'saving';
  if (unsavedChanges) return 'unsaved';
  return 'saved';
}

function formatErrorStatusLabel(errorMessage: string | null): string {
  if (!errorMessage) return 'Error';

  const detail = errorMessage
    .trim()
    .replace(/^error:\s*/i, '')
    .replace(/^generation failed:\s*/i, '')
    .trim();

  return detail ? `Error: ${detail}` : 'Error';
}

const STATUS_CONFIG: Record<
  AppStatus,
  { dot: string; label: string }
> = {
  saved: {
    dot: 'bg-status-ready',
    label: 'Saved',
  },
  unsaved: {
    dot: 'bg-status-unsaved',
    label: 'Unsaved changes',
  },
  saving: {
    dot: 'bg-status-saving animate-pulse',
    label: 'Saving…',
  },
  generating: {
    dot: 'bg-status-unsaved animate-pulse',
    label: 'Generating…',
  },
  'loading-project': {
    dot: 'bg-status-saving animate-pulse',
    label: 'Loading project…',
  },
  'no-project-selected': {
    dot: 'bg-muted-foreground',
    label: 'No project selected',
  },
  'loading-samples': {
    dot: 'bg-status-saving animate-pulse',
    label: 'Loading samples…',
  },
  offline: {
    dot: 'bg-muted-foreground',
    label: 'Offline',
  },
  error: {
    dot: 'bg-destructive',
    label: 'Error',
  },
};

function getStatusBarLabelTitle({
  status,
  errorMessage,
  savePlanTooltip,
  savedTruthTooltip,
}: {
  status: AppStatus;
  errorMessage: string | null;
  savePlanTooltip: string;
  savedTruthTooltip: string;
}): string {
  if (status === 'error') {
    return errorMessage ?? 'Project save or system error';
  }

  if (status === 'saving' || status === 'unsaved') {
    return savePlanTooltip;
  }

  if (status === 'saved') {
    return savedTruthTooltip;
  }

  if (status === 'loading-project') {
    return 'Arrangement Forge is still loading the requested project route before the editor becomes interactive.';
  }

  if (status === 'no-project-selected') {
    return 'The /project editor fallback route is open with no active project in this workspace. Open a project from the library to continue.';
  }

  return STATUS_CONFIG[status].label;
}

interface StatusBarProps {
  status?: AppStatus;
  className?: string;
}

type StatusBarReadiness = 'ready' | 'waiting' | 'blocked';

function getStatusBarReadiness(status: AppStatus): StatusBarReadiness {
  if (status === 'loading-project' || status === 'loading-samples') {
    return 'waiting';
  }

  if (status === 'no-project-selected' || status === 'offline' || status === 'error') {
    return 'blocked';
  }

  return 'ready';
}

function getStatusBarReadinessLabel(status: AppStatus, readiness: StatusBarReadiness): string {
  if (readiness === 'ready') {
    return 'Ready';
  }

  switch (status) {
    case 'loading-project':
      return 'Waiting for project';
    case 'loading-samples':
      return 'Waiting for samples';
    case 'no-project-selected':
      return 'Blocked: project required';
    case 'offline':
      return 'Blocked: offline';
    case 'error':
      return 'Blocked: error';
    default:
      return readiness.charAt(0).toUpperCase() + readiness.slice(1);
  }
}

function getStatusBarFailureTruth({
  errorMessage,
  projectReadinessCurrentState,
  projectReadinessNextStep,
  projectReadinessStatus,
}: {
  errorMessage: string | null;
  projectReadinessCurrentState: string;
  projectReadinessNextStep: string;
  projectReadinessStatus: 'ready' | 'waiting' | 'blocked';
}) {
  if (projectReadinessStatus === 'blocked') {
    return {
      currentState: projectReadinessCurrentState,
      nextStep: projectReadinessNextStep,
      tooltip: `${projectReadinessCurrentState} ${projectReadinessNextStep}`.trim(),
    };
  }

  const detail = formatErrorStatusLabel(errorMessage);

  return {
    currentState: `${detail} is blocking the current workflow.`,
    nextStep: 'Resolve the current error, then retry the blocked action.',
    tooltip: `${detail} is blocking the current workflow. Resolve the current error, then retry the blocked action.`,
  };
}

function formatSelectionRangeLabel(startBar: number, endBar: number): string {
  return startBar === endBar ? `${startBar}` : `${startBar}-${endBar}`;
}

function formatStatusBarInstrumentLabel(instrument: Stem['instrument']): string {
  return instrument.charAt(0).toUpperCase() + instrument.slice(1);
}

function getStatusBarSelectionLabel({
  sections,
  blocks,
  stems,
}: {
  sections: Section[];
  blocks: Block[];
  stems: Stem[];
}) {
  const selectionTruth = getProjectSelectionTruth({ sections, blocks, stems });
  const tooltip = `${selectionTruth.currentState} ${selectionTruth.nextStep}`.trim();

  if (selectionTruth.selectionSource === 'missing') {
    return {
      label: 'Scope fallback: Whole song default',
      tone: 'warning',
      tooltip,
      source: selectionTruth.selectionSource,
    } as const;
  }

  if (selectionTruth.selectionLevel === 'section') {
    const section =
      selectionTruth.sectionId !== null
        ? sections.find((candidate) => candidate.id === selectionTruth.sectionId)
        : null;
    const sectionName = section?.name?.trim();
    const sectionRange =
      section !== null
        ? formatSelectionRangeLabel(section.startBar, section.startBar + section.barCount - 1)
        : null;

    return {
      label:
        sectionName && sectionRange
          ? `Section: ${sectionName} ${sectionRange}`
          : sectionName
          ? `Section: ${sectionName}`
          : 'Section selected',
      tone: 'ready',
      tooltip,
      source: selectionTruth.selectionSource,
    } as const;
  }

  if (selectionTruth.selectionLevel === 'block') {
    const block =
      selectionTruth.blockId !== null
        ? blocks.find((candidate) => candidate.id === selectionTruth.blockId)
        : null;
    const stem =
      selectionTruth.stemId !== null
        ? stems.find((candidate) => candidate.id === selectionTruth.stemId)
        : null;
    const blockRange =
      block !== null ? formatSelectionRangeLabel(block.startBar, block.endBar) : null;
    const blockScope =
      stem !== null && blockRange !== null
        ? `${formatStatusBarInstrumentLabel(stem.instrument)} ${blockRange}`
        : null;

    return {
      label: blockScope ? `Block: ${blockScope}` : 'Block selected',
      tone: 'ready',
      tooltip,
      source: selectionTruth.selectionSource,
    } as const;
  }

  return {
    label: 'Whole song default',
    tone: 'muted',
    tooltip,
    source: selectionTruth.selectionSource,
  } as const;
}

export function StatusBar({ status = 'saved', className }: StatusBarProps) {
  const errorMessage = useUiStore((state) => state.errorMessage);
  const generationState = useUiStore((state) => state.generationState);
  const undoStore = useUndoStore();
  const historyTruth = undoStore.getHistoryTruth(generationState);
  const {
    project,
    projectLoadStatus,
    projectLoadTargetId,
    projectLoadMessage,
    projectLoadFailureTarget,
    stems,
    sections,
    blocks,
    chords,
  } = useProjectStore();
  const arrangementTruth = getProjectArrangementTruth({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const selectionTruth = getStatusBarSelectionLabel({ sections, blocks, stems });
  const cfg = STATUS_CONFIG[status];
  const savePlan = getProjectSavePlan({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const projectReadiness = getProjectStoreReadiness({
    project,
    projectLoadStatus,
    projectLoadTargetId,
    projectLoadMessage,
    projectLoadFailureTarget,
  });
  const savePlanTooltip = `${savePlan.currentState} ${savePlan.nextStep}`.trim();
  const savedTruthTooltip = `${arrangementTruth.currentState} ${arrangementTruth.nextStep}`.trim();
  const failureTruth =
    status === 'error'
      ? getStatusBarFailureTruth({
          errorMessage,
          projectReadinessCurrentState: projectReadiness.currentState,
          projectReadinessNextStep: projectReadiness.nextStep,
          projectReadinessStatus: projectReadiness.status,
        })
      : null;
  const label =
    status === 'error'
      ? formatErrorStatusLabel(errorMessage)
      : status === 'saving'
      ? savePlan.savingLabel
      : status === 'unsaved'
      ? savePlan.statusLabel
      : cfg.label;
  const readiness = getStatusBarReadiness(status);
  const readinessLabel = getStatusBarReadinessLabel(status, readiness);
  const labelTitle = getStatusBarLabelTitle({
    status,
    errorMessage,
    savePlanTooltip,
    savedTruthTooltip,
  });

  return (
    <div
      data-testid="status-bar"
      data-status-readiness={readiness}
      className={cn(
        'flex h-6 shrink-0 items-center border-t border-border bg-secondary/50 px-4',
        className
      )}
    >
      {/* Left: status indicator */}
      <div className="flex min-w-0 max-w-[40%] items-center gap-1.5">
        <span className={cn('size-1.5 rounded-full', cfg.dot)} />
        <span
          data-testid="status-bar-readiness"
          className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600"
        >
          {readinessLabel}
        </span>
        <span className="truncate text-xs text-zinc-500" title={labelTitle}>
          {label}
        </span>
      </div>

      <span
        data-testid="status-bar-selection-truth"
        data-selection-source={selectionTruth.source}
        className={cn(
          'min-w-0 max-w-[22%] truncate px-3 text-[10px]',
          selectionTruth.tone === 'warning'
            ? 'text-amber-700'
            : selectionTruth.tone === 'ready'
            ? 'text-zinc-700'
            : 'text-zinc-500'
        )}
        title={selectionTruth.tooltip}
      >
        {selectionTruth.label}
      </span>

      {/* Center: actionable history guidance */}
      <span
        data-testid="status-bar-history-next-step"
        className="min-w-0 flex-1 px-3 text-center text-[10px] text-zinc-600 truncate"
        title={failureTruth?.tooltip ?? historyTruth.tooltip}
      >
        {failureTruth?.nextStep ?? historyTruth.nextStep}
      </span>

      {/* Right: history truth or failure truth */}
      <span
        data-testid="status-bar-history"
        className="min-w-0 max-w-[35%] truncate text-right text-[10px] text-zinc-600"
        title={failureTruth?.tooltip ?? historyTruth.tooltip}
      >
        {failureTruth?.currentState ?? historyTruth.label}
      </span>
    </div>
  );
}
