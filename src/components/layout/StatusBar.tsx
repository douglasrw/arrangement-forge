import type { GenerationState, SystemStatus } from '@/types';
import { cn } from '@/lib/utils';
import { getProjectArrangementTruth } from '@/store/project-store';
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

interface StatusBarProps {
  status?: AppStatus;
  className?: string;
}

export function StatusBar({ status = 'saved', className }: StatusBarProps) {
  const errorMessage = useUiStore((state) => state.errorMessage);
  const generationState = useUiStore((state) => state.generationState);
  const undoStore = useUndoStore();
  const historyTruth = undoStore.getHistoryTruth(generationState);
  const historyNextStep = historyTruth.activeBoundaryTruth?.nextStep ?? historyTruth.nextStep;
  const { project, stems, sections, blocks, chords } = useProjectStore();
  const arrangementTruth = getProjectArrangementTruth({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const cfg = STATUS_CONFIG[status];
  const savePlan = getProjectSavePlan({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const savePlanTooltip = `${savePlan.currentState} ${savePlan.nextStep}`.trim();
  const savedTruthTooltip = `${arrangementTruth.currentState} ${arrangementTruth.nextStep}`.trim();
  const label =
    status === 'error'
      ? formatErrorStatusLabel(errorMessage)
      : status === 'saving'
      ? savePlan.savingLabel
      : status === 'unsaved'
      ? savePlan.statusLabel
      : cfg.label;
  const labelTitle =
    status === 'error' && errorMessage
      ? errorMessage
      : status === 'saving' || status === 'unsaved'
      ? savePlanTooltip
      : status === 'saved'
      ? savedTruthTooltip
      : label;

  return (
    <div
      data-testid="status-bar"
      className={cn(
        'flex h-6 shrink-0 items-center border-t border-border bg-secondary/50 px-4',
        className
      )}
    >
      {/* Left: status indicator */}
      <div className="flex min-w-0 max-w-[40%] items-center gap-1.5">
        <span className={cn('size-1.5 rounded-full', cfg.dot)} />
        <span className="truncate text-xs text-zinc-500" title={labelTitle}>
          {label}
        </span>
      </div>

      {/* Center: actionable history guidance */}
      <span
        data-testid="status-bar-history-next-step"
        className="min-w-0 flex-1 px-3 text-center text-[10px] text-zinc-600 truncate"
        title={historyTruth.tooltip}
      >
        {historyNextStep}
      </span>

      {/* Right: history truth */}
      <span
        data-testid="status-bar-history"
        className="min-w-0 max-w-[35%] truncate text-right text-[10px] text-zinc-600"
        title={historyTruth.tooltip}
      >
        {historyTruth.label}
      </span>
    </div>
  );
}
