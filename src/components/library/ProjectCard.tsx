import { cn } from '@/lib/utils';
import type { Project } from '@/types';

type ProjectCardStatusTone = 'fresh' | 'stale' | 'incomplete';

type ProjectCardStatus = {
  tone: ProjectCardStatusTone;
  label: string;
  detail: string;
};

const STATUS_STYLES: Record<ProjectCardStatusTone, string> = {
  fresh: 'border-primary/30 bg-primary/10 text-primary',
  stale: 'border-destructive/30 bg-destructive/10 text-destructive',
  incomplete: 'border-border bg-secondary text-secondary-foreground',
};

function getProjectDisplayName(project: Project) {
  return project.name.trim() || 'Untitled Project';
}

function hasChordChartTruth(project: Project) {
  return Boolean(project.chordChartRaw.trim());
}

function hasNotesTruth(project: Project) {
  return Boolean(project.generationHints.trim());
}

function parseTimestamp(iso: string | null) {
  if (!iso) {
    return null;
  }

  const timestamp = new Date(iso).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatLibraryDate(iso: string | null) {
  if (!iso) {
    return 'Not yet';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getSavedInputCopy(project: Project) {
  const hasChordChart = hasChordChartTruth(project);
  const hasNotes = hasNotesTruth(project);

  if (hasChordChart && hasNotes) {
    return 'Chord chart and notes';
  }

  if (hasChordChart) {
    return 'Chord chart';
  }

  if (hasNotes) {
    return 'Notes only';
  }

  return 'Project shell only';
}

function getProjectTruthBadges(project: Project) {
  const badges: string[] = [];

  if (hasChordChartTruth(project)) {
    badges.push('Chord chart');
  }

  if (hasNotesTruth(project)) {
    badges.push('Notes');
  }

  if (project.hasArrangement) {
    badges.push('Arrangement');
  }

  return badges.length ? badges : ['Project shell'];
}

export function getProjectCardStatus(project: Project): ProjectCardStatus {
  const updatedAt = parseTimestamp(project.updatedAt);
  const generatedAt = parseTimestamp(project.generatedAt);
  const updatedSinceGeneration =
    project.hasArrangement && updatedAt !== null && generatedAt !== null && updatedAt > generatedAt;
  const tempoChangedSinceGeneration =
    project.hasArrangement &&
    project.generatedTempo !== null &&
    project.generatedTempo !== project.tempo;

  if (!project.hasArrangement) {
    if (hasChordChartTruth(project) && hasNotesTruth(project)) {
      return {
        tone: 'incomplete',
        label: 'Incomplete',
        detail: 'Chord chart and notes are saved, but no arrangement is generated yet.',
      };
    }

    if (hasChordChartTruth(project)) {
      return {
        tone: 'incomplete',
        label: 'Incomplete',
        detail: 'A chord chart is saved, but the arrangement still needs generation.',
      };
    }

    if (hasNotesTruth(project)) {
      return {
        tone: 'incomplete',
        label: 'Incomplete',
        detail: 'Notes are saved, but the project still needs a chord chart and generation.',
      };
    }

    return {
      tone: 'incomplete',
      label: 'Incomplete',
      detail: 'Only the saved project shell exists right now.',
    };
  }

  if (updatedSinceGeneration && tempoChangedSinceGeneration) {
    return {
      tone: 'stale',
      label: 'Stale',
      detail: 'Saved edits and tempo changes are newer than the last generation.',
    };
  }

  if (updatedSinceGeneration) {
    return {
      tone: 'stale',
      label: 'Stale',
      detail: 'Saved edits are newer than the last generation.',
    };
  }

  if (tempoChangedSinceGeneration) {
    return {
      tone: 'stale',
      label: 'Stale',
      detail: `Project tempo is ${project.tempo} BPM, but the arrangement was generated at ${project.generatedTempo} BPM.`,
    };
  }

  if (generatedAt === null) {
    return {
      tone: 'stale',
      label: 'Stale',
      detail: 'This arrangement is missing generation metadata.',
    };
  }

  return {
    tone: 'fresh',
    label: 'Fresh',
    detail: 'The saved arrangement matches the latest generated snapshot.',
  };
}

interface ProjectCardProps {
  project: Project;
  onOpen?: () => void;
  onDelete?: () => void;
  selectionTruth?: {
    label: string;
    detail: string;
  } | null;
}

export function ProjectCard({ project, onOpen, onDelete, selectionTruth = null }: ProjectCardProps) {
  const status = getProjectCardStatus(project);
  const generatedAtLabel = project.generatedAt ? formatLibraryDate(project.generatedAt) : 'Not yet';
  const generatedTempoLabel =
    project.generatedTempo !== null ? `${project.generatedTempo} BPM` : 'Not yet';
  const displayName = getProjectDisplayName(project);

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col gap-4 p-4 pr-12 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold leading-tight text-foreground line-clamp-2">
              {displayName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {project.genre} · {project.key} · {project.tempo} BPM
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
              STATUS_STYLES[status.tone]
            )}
          >
            {status.label}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{status.detail}</p>

        {selectionTruth ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
            <p className="font-semibold uppercase tracking-wide text-primary">{selectionTruth.label}</p>
            <p className="mt-1 leading-relaxed text-foreground">{selectionTruth.detail}</p>
          </div>
        ) : null}

        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-muted-foreground/70">Last saved</dt>
            <dd className="text-foreground">{formatLibraryDate(project.updatedAt)}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground/70">Generated</dt>
            <dd className="text-foreground">{generatedAtLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground/70">Generated tempo</dt>
            <dd className="text-foreground">{generatedTempoLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground/70">Saved input</dt>
            <dd className="text-foreground">{getSavedInputCopy(project)}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {getProjectTruthBadges(project).map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      </button>

      {onDelete && (
        <button
          type="button"
          data-testid="library-delete-project"
          className="absolute right-3 top-3 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete ${displayName}`}
          title="Delete project"
        >
          ✕
        </button>
      )}
    </article>
  );
}
