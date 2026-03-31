import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { LoadProjectResult } from '@/hooks/useProject';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';

export type EditorRouteMode = 'project-selection' | 'project-id';

function EditorShellState({
  title,
  message,
  nextStep,
  testId,
  tone = 'loading',
  actionHref,
  actionLabel,
  routeStatus,
}: {
  title: string;
  message: string;
  nextStep: string;
  testId: string;
  tone?: 'loading' | 'error';
  actionHref?: string;
  actionLabel?: string;
  routeStatus: EditorRouteState['status'];
}) {
  return (
    <div
      className="flex max-w-sm flex-col items-center gap-4 text-center"
      data-testid={testId}
      data-editor-route-state={routeStatus}
    >
      {tone === 'loading' ? (
        <div
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive"
          aria-hidden="true"
        >
          !
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
        <p className="text-xs text-foreground/80">Next step: {nextStep}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          to={actionHref}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

type EditorRouteState =
  | { status: 'loading' }
  | { status: 'no-project-selected'; message: string }
  | { status: 'missing-project'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready' };

function getLoadingMessage(projectId: string | undefined) {
  return projectId
    ? `Opening project ${projectId} in the editor.`
    : 'Opening the requested project route in the editor.';
}

export default function EditorPage({
  routeMode = 'project-id',
}: {
  routeMode?: EditorRouteMode;
}) {
  const { id } = useParams<{ id: string }>();
  const { loadProject } = useProject();
  const loadedProjectId = useProjectStore((state) => state.project?.id ?? null);
  const [routeState, setRouteState] = useState<EditorRouteState>({ status: 'loading' });

  useEffect(() => {
    if (!id) {
      setRouteState({
        status: routeMode === 'project-selection' ? 'no-project-selected' : 'error',
        message:
          routeMode === 'project-selection'
            ? 'The /project editor route is open, but no project has been selected yet.'
            : 'The requested project route is missing an id.',
      });
      return;
    }

    let cancelled = false;
    setRouteState({ status: 'loading' });

    void loadProject(id).then((result: LoadProjectResult) => {
      if (cancelled) return;

      if (result.status === 'ready') {
        setRouteState({ status: 'ready' });
        return;
      }

      setRouteState(result);
    });

    return () => {
      cancelled = true;
    };
  }, [id, loadProject, routeMode]);

  if (routeState.status === 'loading' || (routeState.status === 'ready' && loadedProjectId !== id)) {
    return (
      <AppShell
        shellStatus="loading-project"
        shellBody={
          <EditorShellState
            title="Loading project route"
            message={getLoadingMessage(id)}
            nextStep="Wait for the current route load to finish before editing this arrangement."
            testId="editor-shell-loading-state"
            routeStatus="loading"
          />
        }
      />
    );
  }

  if (routeState.status === 'no-project-selected') {
    return (
      <AppShell
        shellStatus="saved"
        shellBody={
          <EditorShellState
            title="Choose a project to open the editor"
            message={routeState.message}
            nextStep="Return to the library, then open an existing project or create a new one to finish this editor route."
            testId="editor-shell-no-project-state"
            actionHref="/library"
            actionLabel="Go to library"
            routeStatus="error"
          />
        }
      />
    );
  }

  if (routeState.status === 'missing-project') {
    return (
      <AppShell
        shellStatus="error"
        shellBody={
          <EditorShellState
            title="Project not found"
            message={
              id
                ? `Project ${id} is not available, so the editor cannot open this route. ${routeState.message}`
                : routeState.message
            }
            nextStep="Return to the library and open a different project."
            testId="editor-shell-missing-project-state"
            tone="error"
            actionHref="/library"
            actionLabel="Back to library"
            routeStatus="missing-project"
          />
        }
      />
    );
  }

  if (routeState.status === 'error') {
    return (
      <AppShell
        shellStatus="error"
        shellBody={
          <EditorShellState
            title="Unable to open project"
            message={
              id
                ? `Project ${id} could not be loaded for this editor route. ${routeState.message}`
                : routeState.message
            }
            nextStep="Return to the library, then retry this project after the load failure is resolved."
            testId="editor-shell-error-state"
            tone="error"
            actionHref="/library"
            actionLabel="Back to library"
            routeStatus="error"
          />
        }
      />
    );
  }

  return <AppShell />;
}
