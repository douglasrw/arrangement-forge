import type { GenerationState, SystemStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';

export type AppStatus =
  | 'saved'
  | 'unsaved'
  | 'saving'
  | 'generating'
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
  const cfg = STATUS_CONFIG[status];
  const label = status === 'error' ? formatErrorStatusLabel(errorMessage) : cfg.label;
  const labelTitle = status === 'error' && errorMessage ? errorMessage : label;

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

      {/* Center: branding */}
      <span className="flex-1 text-center text-[10px] text-zinc-600">
        Arrangement Forge
      </span>

      {/* Right: version */}
      <span className="text-[10px] text-zinc-600">v0.1.0</span>
    </div>
  );
}
