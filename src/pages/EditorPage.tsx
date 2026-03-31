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
  routeTruth,
  nextStep,
  testId,
  tone = 'loading',
  actionHref,
  actionLabel,
  routeStatus,
}: {
  title: string;
  message: string;
  routeTruth: string;
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
        <p className="text-xs text-foreground/80">{routeTruth}</p>
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

function describeEditorRoute(routeMode: EditorRouteMode, projectId: string | undefined) {
  if (routeMode === 'project-selection') {
    return '/project';
  }

  return projectId ? `/project/${projectId}` : '/project/:id';
}

function getEditorRouteTruth({
  routeMode,
  routeState,
  projectId,
}: {
  routeMode: EditorRouteMode;
  routeState: EditorRouteState['status'];
  projectId: string | undefined;
}) {
  const routeLabel = describeEditorRoute(routeMode, projectId);

  if (routeState === 'no-project-selected') {
    return 'Route truth: /project is the editor fallback route, and it stays parked here until you choose a project from the library.';
  }

  if (routeState === 'missing-project') {
    return `Route truth: ${routeLabel} cannot open because the requested project is unavailable.`;
  }

  if (routeState === 'error') {
    return `Route truth: ${routeLabel} is blocked until Arrangement Forge can load the requested project.`;
  }

  if (routeState === 'ready') {
    return `Route truth: ${routeLabel} is loaded in this workspace, and /project remains the fallback route when no project id is selected.`;
  }

  return `Route truth: ${routeLabel} is still resolving before the editor becomes ready.`;
}

function EditorRouteReadyBanner({
  projectId,
  routeTruth,
}: {
  projectId: string;
  routeTruth: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 text-left"
      data-testid="editor-route-ready-banner"
      data-editor-route-state="ready"
    >
      <p className="text-xs font-medium text-foreground">Editor route ready for project {projectId}.</p>
      <p className="text-[11px] text-muted-foreground">
        Current state: the requested project is loaded in this workspace. Next step: edit this
        arrangement or return to the library to open a different project.
      </p>
      <p className="text-[11px] text-foreground/80">{routeTruth}</p>
    </div>
  );
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
  const routeTruth = getEditorRouteTruth({
    routeMode,
    routeState: routeState.status,
    projectId: id,
  });

  useEffect(() => {
    if (!id) {
      useProjectStore.getState().clearProjectSession();
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
            routeTruth={routeTruth}
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
            routeTruth={routeTruth}
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
            routeTruth={routeTruth}
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
            routeTruth={routeTruth}
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

  return <AppShell workspaceBanner={<EditorRouteReadyBanner projectId={id} routeTruth={routeTruth} />} />;
}
