import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import type { Block, Chord, Project, Section, Stem, SystemStatus } from '@/types';
import type { ProjectStoreReadiness } from '@/store/project-store';
import {
  getProjectExportReadiness,
  getProjectSavePlan,
  type ProjectSavePlan,
  useProject,
} from '@/hooks/useProject';
import { serializeProjectExportSnapshot, useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useAuth } from '@/hooks/useAuth';
import { ALL_KEYS } from '@/lib/chords';
import {
  KEYBOARD_SHORTCUT_BUTTON_ID,
  KEYBOARD_SHORTCUT_SECTIONS,
} from '@/hooks/useKeyboardShortcuts';
import type { AppStatus } from './StatusBar';

export function reconcileProjectNameDraft(
  currentDraft: string,
  projectName: string,
  isEditing: boolean
): string {
  return isEditing ? currentDraft : projectName;
}

export function normalizeProjectNameDraft(newName: string): string {
  return newName.trim() || 'Untitled Project';
}

function getProjectDisplayName(project: Project): string {
  return project.name.trim() || 'Untitled Project';
}

function slugifyExportFilenameSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hasProjectExportTruth(project: Project | null): project is Project {
  return Boolean(project && (project.chordChartRaw.trim() || project.generationHints.trim()));
}

type ProjectArrangementExportState = {
  stems: Stem[];
  sections: Section[];
  blocks: Block[];
  chords: Chord[];
};

function formatSectionBarRange(section: Section): string {
  const endBar = section.startBar + Math.max(0, section.barCount - 1);

  return endBar === section.startBar
    ? `bar ${section.startBar}`
    : `bars ${section.startBar}-${endBar}`;
}

function formatProjectArrangementSummaryExport(
  arrangement?: ProjectArrangementExportState
): string | null {
  if (!arrangement) {
    return null;
  }

  const hasArrangementTruth = Boolean(
    arrangement.stems.length ||
    arrangement.sections.length ||
    arrangement.blocks.length ||
    arrangement.chords.length
  );

  if (!hasArrangementTruth) {
    return null;
  }

  const orderedStems = [...arrangement.stems].sort(
    (left, right) => left.sortOrder - right.sortOrder
  );
  const orderedSections = [...arrangement.sections].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.startBar - right.startBar;
  });
  const sectionLines = orderedSections.length
    ? orderedSections.map((section) => `- ${section.name} (${formatSectionBarRange(section)})`)
    : ['- (none)'];
  const stemOrder = orderedStems.length
    ? orderedStems.map((stem) => stem.instrument).join(', ')
    : '(none)';

  return [
    'Arrangement Summary',
    `Stem Count: ${arrangement.stems.length}`,
    `Stem Order: ${stemOrder}`,
    `Section Count: ${arrangement.sections.length}`,
    `Block Count: ${arrangement.blocks.length}`,
    `Chord Count: ${arrangement.chords.length}`,
    'Section Timeline',
    ...sectionLines,
  ].join('\n');
}

export function formatProjectChordChartExport(
  project: Project,
  arrangement?: ProjectArrangementExportState
): string {
  const chordChart = project.chordChartRaw.trim() ? project.chordChartRaw : '(empty)';
  const sections = [
    'Arrangement Forge Export',
    `Project: ${getProjectDisplayName(project)}`,
    `Chord Chart\n${chordChart}`,
  ];
  const generationHints = project.generationHints.trim();

  if (generationHints) {
    sections.push(`Generation Hints\n${project.generationHints}`);
  }

  const arrangementSummary = formatProjectArrangementSummaryExport(arrangement);

  if (arrangementSummary) {
    sections.push(arrangementSummary);
  }

  return sections.join('\n\n');
}

export function getProjectExportFilename(project: Project): string {
  const baseName = slugifyExportFilenameSegment(getProjectDisplayName(project));
  const fallbackId = slugifyExportFilenameSegment(project.id);
  const stableBaseName = baseName || fallbackId || 'untitled-project';

  return `${stableBaseName}-chord-chart.txt`;
}

export function getProjectSnapshotFilename(project: Project): string {
  return getProjectExportFilename(project).replace(
    /-chord-chart\.txt$/,
    '-arrangement-snapshot.json'
  );
}

export type TopBarSaveIndicatorState = 'error' | 'saved' | 'saving' | 'unsaved';

export function deriveTopBarSaveIndicatorState({
  systemStatus,
  unsavedChanges,
}: {
  systemStatus: SystemStatus;
  unsavedChanges: boolean;
}): TopBarSaveIndicatorState {
  if (systemStatus === 'error') {
    return 'error';
  }

  if (systemStatus === 'saving') {
    return 'saving';
  }

  if (unsavedChanges) {
    return 'unsaved';
  }

  return 'saved';
}

export function formatRecentSaveLabel(lastSavedAt: string | null, now = new Date()): string {
  if (!lastSavedAt) {
    return 'Saved';
  }

  const savedAt = new Date(lastSavedAt);

  if (Number.isNaN(savedAt.getTime())) {
    return 'Saved';
  }

  const elapsedMs = now.getTime() - savedAt.getTime();

  if (elapsedMs < 0) {
    return 'Saved';
  }

  if (elapsedMs < 60_000) {
    return 'Saved just now';
  }

  if (elapsedMs < 3_600_000) {
    return `Saved ${Math.floor(elapsedMs / 60_000)}m ago`;
  }

  if (elapsedMs < 86_400_000) {
    return `Saved ${Math.floor(elapsedMs / 3_600_000)}h ago`;
  }

  const days = Math.floor(elapsedMs / 86_400_000);

  return days === 1 ? 'Saved yesterday' : `Saved ${days}d ago`;
}

export function formatTopBarErrorLabel(errorMessage: string | null): string {
  if (!errorMessage) {
    return 'Error';
  }

  const detail = errorMessage
    .trim()
    .replace(/^error:\s*/i, '')
    .replace(/^generation failed:\s*/i, '')
    .replace(/^save failed:\s*/i, '')
    .trim();

  return detail ? `Error: ${detail}` : 'Error';
}

export function getTopBarSaveIndicatorCopy(
  indicatorState: TopBarSaveIndicatorState,
  lastSavedAt: string | null,
  errorMessage: string | null,
  savePlan: Pick<
    ProjectSavePlan,
    'statusLabel' | 'savingLabel' | 'currentState' | 'nextStep' | 'arrangementTruth'
  > | null,
  now = new Date()
): { label: string; tooltip: string } {
  const savePlanTooltip = savePlan
    ? `${savePlan.currentState} ${savePlan.nextStep}`.trim()
    : null;
  const savedArrangementTooltip = savePlan
    ? `${savePlan.arrangementTruth.currentState} ${savePlan.arrangementTruth.nextStep}`.trim()
    : null;

  if (indicatorState === 'error') {
    return {
      label: formatTopBarErrorLabel(errorMessage),
      tooltip: errorMessage?.trim() || 'Project save or system error',
    };
  }

  if (indicatorState === 'saving') {
    return {
      label: savePlan?.savingLabel ?? 'Saving…',
      tooltip: savePlanTooltip ?? 'Saving project changes',
    };
  }

  if (indicatorState === 'unsaved') {
    return {
      label: savePlan?.statusLabel ?? 'Unsaved',
      tooltip: savePlanTooltip ?? 'Unsaved changes',
    };
  }

  const savedAt = lastSavedAt ? new Date(lastSavedAt) : null;
  const hasValidSavedAt = Boolean(savedAt && !Number.isNaN(savedAt.getTime()));

  return {
    label: formatRecentSaveLabel(lastSavedAt, now),
    tooltip: hasValidSavedAt
      ? `Last saved ${savedAt?.toLocaleString()}. ${savedArrangementTooltip ?? 'All changes saved.'}`.trim()
      : savedArrangementTooltip ?? 'All changes saved',
  };
}

function getRouteShellProjectLabel(shellStatus: AppStatus | undefined): string {
  switch (shellStatus) {
    case 'loading-project':
      return 'Loading project route';
    case 'no-project-selected':
      return 'No project selected';
    case 'error':
      return 'Editor route blocked';
    default:
      return 'Untitled Project';
  }
}

function getRouteShellSaveIndicatorCopy(
  shellStatus: AppStatus,
  errorMessage: string | null
): { label: string; tooltip: string } {
  switch (shellStatus) {
    case 'loading-project':
      return {
        label: 'Loading project...',
        tooltip: 'Arrangement Forge is still loading the requested project route.',
      };
    case 'no-project-selected':
      return {
        label: 'No project selected',
        tooltip: 'The editor fallback route is open with no active project in this workspace.',
      };
    case 'error':
      return {
        label: errorMessage ? formatTopBarErrorLabel(errorMessage) : 'Editor route blocked',
        tooltip: errorMessage?.trim() || 'The requested editor route is blocked until a project can be loaded.',
      };
    default:
      return {
        label: 'Saved',
        tooltip: 'All changes saved',
      };
  }
}

function formatProjectStoreReadinessTooltip(projectStoreReadiness: ProjectStoreReadiness): string {
  const detail = projectStoreReadiness.detail?.trim();

  return detail
    ? `${projectStoreReadiness.currentState} ${projectStoreReadiness.nextStep} ${detail}`.trim()
    : `${projectStoreReadiness.currentState} ${projectStoreReadiness.nextStep}`.trim();
}

function getProjectStoreSaveIndicatorCopy(
  projectStoreReadiness: ProjectStoreReadiness
): { label: string; tooltip: string } {
  if (projectStoreReadiness.status === 'ready') {
    return {
      label: 'Project ready',
      tooltip: formatProjectStoreReadinessTooltip(projectStoreReadiness),
    };
  }

  if (projectStoreReadiness.status === 'blocked') {
    return {
      label:
        projectStoreReadiness.blockedBy === 'missing-project'
          ? 'Project not found'
          : 'Project load blocked',
      tooltip: formatProjectStoreReadinessTooltip(projectStoreReadiness),
    };
  }

  return {
    label: projectStoreReadiness.projectId ? 'Loading project...' : 'No project loaded',
    tooltip: formatProjectStoreReadinessTooltip(projectStoreReadiness),
  };
}

function getProjectStoreExportButtonCopy(projectStoreReadiness: ProjectStoreReadiness): {
  label: string;
  title: string;
} {
  if (projectStoreReadiness.status === 'blocked') {
    return {
      label:
        projectStoreReadiness.blockedBy === 'missing-project'
          ? 'Project not found'
          : 'Project load blocked',
      title: formatProjectStoreReadinessTooltip(projectStoreReadiness),
    };
  }

  return {
    label: projectStoreReadiness.projectId ? 'Project loading...' : 'No project loaded',
    title: formatProjectStoreReadinessTooltip(projectStoreReadiness),
  };
}

/* ------------------------------------------------------------------ */
/*  Key dropdown                                                       */
/* ------------------------------------------------------------------ */
function KeyDropdown({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="relative">
      <label htmlFor="topbar-key-select" className="sr-only">
        Key
      </label>
      <select
        id="topbar-key-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-md border border-border/30 bg-secondary/50',
          'pl-2 pr-6 text-xs text-muted-foreground',
          'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'
        )}
      >
        {ALL_KEYS.map((k) => (
          <option key={k} value={k}>
            Key of {k}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted-foreground"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BPM click-to-edit                                                  */
/* ------------------------------------------------------------------ */
function BpmEditor({ value, onChange }: { value: number; onChange: (bpm: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit(raw: string) {
    setEditing(false);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(300, Math.max(40, parsed));
      onChange(clamped);
    }
  }

  if (editing) {
    return (
      <>
        <label htmlFor="topbar-bpm-input" className="sr-only">
          BPM
        </label>
        <input
          ref={inputRef}
          id="topbar-bpm-input"
          type="number"
          min={40}
          max={300}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft);
            if (e.key === 'Escape') setEditing(false);
          }}
          className={cn(
            'h-8 w-20 rounded-md border border-border/30 bg-secondary/50',
            'px-2 text-center font-mono text-xs text-muted-foreground',
            'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'
          )}
        />
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      title="Click to edit BPM"
    >
      {'\u2669'} {value} bpm
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Chord display toggle [A | I]                                       */
/* ------------------------------------------------------------------ */
function ChordDisplayToggle({
  mode,
  onToggle,
}: {
  mode: 'letter' | 'roman';
  onToggle: () => void;
}) {
  return (
    <div
      className="h-8 flex items-center gap-1 rounded-lg border border-border/30 bg-secondary/50 p-1"
      role="radiogroup"
      aria-label="Chord display mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'letter'}
        onClick={() => mode !== 'letter' && onToggle()}
        className={cn(
          'rounded-md px-4 py-1 text-sm font-medium transition-colors',
          mode === 'letter'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        A
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'roman'}
        onClick={() => mode !== 'roman' && onToggle()}
        className={cn(
          'rounded-md px-4 py-1 text-sm font-medium transition-colors',
          mode === 'roman'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        I
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TopBar                                                             */
/* ------------------------------------------------------------------ */
export function TopBar({ shellStatus }: { shellStatus?: AppStatus }) {
  const { project, stems, sections, blocks, chords, updateProject } = useProjectStore();
  const { loadProject, projectStoreReadiness } = useProject();
  const {
    unsavedChanges,
    systemStatus,
    errorMessage,
    lastSavedAt,
    chordDisplayMode,
    toggleChordDisplay,
  } =
    useUiStore();
  const { signOut } = useAuth();

  const routeShellStatus =
    shellStatus === 'loading-project' || shellStatus === 'no-project-selected' || shellStatus === 'error'
      ? shellStatus
      : undefined;
  const hasActiveProject = Boolean(project) && !routeShellStatus;
  const projectName = routeShellStatus
    ? getRouteShellProjectLabel(routeShellStatus)
    : (project?.name ?? 'Untitled Project');
  const key = project?.key ?? 'C';
  const tempo = project?.tempo ?? 120;
  const genre = project?.genre ?? 'Jazz';
  const timeSig = project?.timeSignature ?? '4/4';

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [reloadingSavedSnapshot, setReloadingSavedSnapshot] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shortcutGuideRef = useRef<HTMLDivElement>(null);

  /* Sync draft when project name changes externally */
  useEffect(() => {
    setNameDraft((currentDraft) => reconcileProjectNameDraft(currentDraft, projectName, isEditing));
  }, [projectName, isEditing]);

  /* Focus input when editing starts */
  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen && !shortcutGuideOpen) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;

      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }

      if (shortcutGuideOpen && shortcutGuideRef.current && !shortcutGuideRef.current.contains(target)) {
        setShortcutGuideOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen, shortcutGuideOpen]);

  useEffect(() => {
    if (!shortcutGuideOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShortcutGuideOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcutGuideOpen]);

  useEffect(() => {
    if (!exportFeedback) return;

    const timeoutId = window.setTimeout(() => {
      setExportFeedback(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [exportFeedback]);

  useEffect(() => {
    setExportFeedback(null);
  }, [
    project?.id,
    project?.name,
    project?.chordChartRaw,
    project?.generationHints,
    stems,
    sections,
    blocks,
    chords,
  ]);

  const exportReadiness = getProjectExportReadiness({
    project,
    stems,
    sections,
    blocks,
    chords,
  });
  const savePlan = getProjectSavePlan({
    project,
    stems,
    sections,
    blocks,
    chords,
  });

  function downloadExportFile(contents: BlobPart, fileName: string, mimeType: string) {
    const exportBlob = new Blob([contents], {
      type: mimeType,
    });
    const exportUrl = URL.createObjectURL(exportBlob);
    const downloadLink = document.createElement('a');

    downloadLink.href = exportUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(exportUrl);
  }

  async function handleExport() {
    if (!project) {
      return;
    }

    if (exportReadiness.actionType === 'reload-saved-snapshot') {
      setExportFeedback(null);
      setReloadingSavedSnapshot(true);

      try {
        await loadProject(project.id);
      } finally {
        setReloadingSavedSnapshot(false);
      }

      return;
    }

    if (!exportReadiness.canExport) {
      return;
    }

    const chartFileName = getProjectExportFilename(project);
    const snapshotFileName = getProjectSnapshotFilename(project);
    const downloadedFiles = [chartFileName];

    downloadExportFile(
      formatProjectChordChartExport(project, {
        stems,
        sections,
        blocks,
        chords,
      }),
      chartFileName,
      'text/plain;charset=utf-8'
    );

    if (exportReadiness.exportsArrangementSnapshot) {
      downloadExportFile(
        serializeProjectExportSnapshot({
          project,
          stems,
          sections,
          blocks,
          chords,
        }),
        snapshotFileName,
        'application/json;charset=utf-8'
      );
      downloadedFiles.push(snapshotFileName);
    }

    setExportFeedback(
      downloadedFiles.length === 1
        ? `Exported ${downloadedFiles[0]}`
        : `Exported ${downloadedFiles[0]} and ${downloadedFiles[1]}`
    );
  }

  const exportActionEnabled =
    !routeShellStatus &&
    projectStoreReadiness.status === 'ready' &&
    Boolean(project) &&
    !reloadingSavedSnapshot &&
    exportReadiness.actionType !== 'none';
  const projectStoreExportCopy =
    projectStoreReadiness.status === 'ready'
      ? null
      : getProjectStoreExportButtonCopy(projectStoreReadiness);
  const exportTitle = routeShellStatus
    ? getRouteShellSaveIndicatorCopy(routeShellStatus, errorMessage).tooltip
    : projectStoreExportCopy
      ? projectStoreExportCopy.title
    : reloadingSavedSnapshot
      ? 'Reloading the saved arrangement rows for this project.'
      : (exportFeedback ?? `${exportReadiness.currentState} ${exportReadiness.nextStep}`.trim());
  const exportButtonLabel = routeShellStatus
    ? 'Nothing to export'
    : projectStoreExportCopy
      ? projectStoreExportCopy.label
    : reloadingSavedSnapshot
      ? 'Reloading snapshot...'
      : exportFeedback
        ? 'Exported'
        : exportReadiness.actionLabel;
  const saveIndicatorState = deriveTopBarSaveIndicatorState({
    systemStatus,
    unsavedChanges,
  });
  const saveIndicatorCopy = getTopBarSaveIndicatorCopy(
    saveIndicatorState,
    lastSavedAt,
    errorMessage,
    savePlan
  );
  const displayedSaveIndicatorCopy = routeShellStatus
    ? getRouteShellSaveIndicatorCopy(routeShellStatus, errorMessage)
    : projectStoreReadiness.status !== 'ready'
      ? getProjectStoreSaveIndicatorCopy(projectStoreReadiness)
    : saveIndicatorCopy;
  const displayedSaveIndicatorState = routeShellStatus
    ?? (projectStoreReadiness.status === 'blocked'
      ? 'error'
      : projectStoreReadiness.status === 'waiting'
        ? 'loading-project'
        : saveIndicatorState);

  function commitName(newName: string) {
    setIsEditing(false);
    const name = normalizeProjectNameDraft(newName);
    setNameDraft(name);
    updateProject({ name });
  }

  return (
    <header className="flex h-[52px] w-full shrink-0 items-center justify-between border-b border-border/50 bg-card px-4">
      {/* ---- LEFT: Monogram + editable name + save dot ---- */}
      <div className="flex items-center gap-3">
        {/* AF monogram */}
        <div className="flex size-7 items-center justify-center rounded-sm bg-ring/10">
          <span className="text-[11px] font-bold leading-none text-primary">AF</span>
        </div>

        {/* Editable project name */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <label htmlFor="project-name-input" className="sr-only">
                Project name
              </label>
              <input
                ref={inputRef}
                id="project-name-input"
                data-testid="project-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => commitName(nameDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName(nameDraft);
                  if (e.key === 'Escape') {
                    setNameDraft(projectName);
                    setIsEditing(false);
                  }
                }}
                placeholder="Untitled Project"
                className="h-6 w-40 rounded-[5px] border border-border bg-secondary px-2 text-sm font-medium text-foreground outline-none focus:border-ring"
              />
            </>
          ) : (
            <button
              type="button"
              data-testid="project-name-trigger"
              onClick={() => {
                setNameDraft(projectName);
                setIsEditing(true);
              }}
              className="rounded-[5px] px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {projectName}
            </button>
          )}

          {/* Save indicator truth */}
          <div
            className="group relative flex items-center gap-1.5"
            data-testid="topbar-save-indicator"
            aria-live="polite"
          >
            <div
              data-testid="topbar-save-dot"
              className={cn(
                'size-1.5 rounded-full transition-colors',
                displayedSaveIndicatorState === 'error'
                  ? 'bg-destructive'
                  : displayedSaveIndicatorState === 'saving' || displayedSaveIndicatorState === 'loading-project'
                  ? 'bg-status-saving animate-pulse'
                  : displayedSaveIndicatorState === 'unsaved'
                    ? 'bg-status-unsaved'
                    : 'bg-status-ready'
              )}
            />
            <span
              data-testid="topbar-save-label"
              className="max-w-40 truncate text-xs text-muted-foreground"
              title={displayedSaveIndicatorCopy.tooltip}
            >
              {displayedSaveIndicatorCopy.label}
            </span>
            {/* Tooltip */}
            <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100">
              {displayedSaveIndicatorCopy.tooltip}
            </div>
          </div>
        </div>
      </div>

      {/* ---- CENTER: Interactive metadata controls ---- */}
      <div className="hidden items-center gap-1.5 md:flex">
        {hasActiveProject ? (
          <>
        <KeyDropdown value={key} onChange={(k) => updateProject({ key: k })} />
        <BpmEditor value={tempo} onChange={(bpm) => updateProject({ tempo: bpm })} />
        <span className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground">
          {genre}
        </span>
        <span className="h-8 flex items-center rounded-md border border-border/30 bg-secondary/50 px-2 text-xs text-muted-foreground">
          {timeSig}
        </span>
        <ChordDisplayToggle mode={chordDisplayMode} onToggle={toggleChordDisplay} />
          </>
        ) : null}
      </div>

      {/* ---- RIGHT: Export + Gear + Avatar ---- */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={shortcutGuideRef}>
          <button
            type="button"
            id={KEYBOARD_SHORTCUT_BUTTON_ID}
            data-testid="topbar-shortcuts-button"
            onClick={() => setShortcutGuideOpen((currentValue) => !currentValue)}
            aria-expanded={shortcutGuideOpen}
            aria-controls="topbar-shortcuts-guide"
            title="Open the keyboard shortcuts guide"
            className={cn(
              'hidden rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors',
              'text-foreground hover:bg-secondary/80 md:inline-flex md:items-center md:gap-2'
            )}
          >
            <span>Shortcuts</span>
            <span className="rounded border border-border/80 bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Ctrl/Cmd+K
            </span>
          </button>

          {shortcutGuideOpen ? (
            <div
              id="topbar-shortcuts-guide"
              data-testid="topbar-shortcuts-guide"
              className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl"
            >
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current editor shortcuts live here now. Use Ctrl/Cmd+K any time to reopen this guide.
                </p>
              </div>

              <div className="space-y-3">
                {KEYBOARD_SHORTCUT_SECTIONS.map((section) => (
                  <section key={section.heading}>
                    <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {section.heading}
                    </h3>
                    <ul className="space-y-1.5">
                      {section.shortcuts.map((shortcut) => (
                        <li
                          key={`${section.heading}-${shortcut.keys}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-foreground">{shortcut.action}</span>
                          <span className="rounded border border-border/80 bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {shortcut.keys}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Export button */}
        <button
          type="button"
          data-testid="topbar-export-button"
          disabled={!exportActionEnabled}
          onClick={() => {
            void handleExport();
          }}
          title={exportTitle}
          aria-label={exportTitle}
          className={cn(
            'rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors',
            exportActionEnabled
              ? 'text-foreground hover:bg-secondary/80'
              : 'cursor-not-allowed text-muted-foreground opacity-40'
          )}
        >
          {exportButtonLabel}
        </button>

        {/* Gear icon */}
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-label="User menu"
          >
            DW
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                Settings
              </button>
              <div className="mx-2 my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
