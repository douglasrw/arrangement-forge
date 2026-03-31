import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { LoadProjectResult } from '@/hooks/useProject';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';

export type EditorRouteMode = 'project-selection' | 'project-id';

function EditorShellState({
  title,
  message,
  currentState,
  routeModeLabel,
  routeReadiness,
  currentRoute,
  fallbackRoute,
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
  currentState: string;
  routeModeLabel: string;
  routeReadiness: string;
  currentRoute: string;
  fallbackRoute?: string;
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
        <p className="text-xs text-foreground/80">Current state: {currentState}</p>
        <p className="text-xs text-foreground/80">Route mode: {routeModeLabel}</p>
        <p className="text-xs text-foreground/80">Route readiness: {routeReadiness}</p>
        <p className="text-xs text-foreground/80">Current route: {currentRoute}</p>
        {fallbackRoute ? (
          <p className="text-xs text-foreground/80">Editor fallback route: {fallbackRoute}</p>
        ) : null}
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

function getInitialEditorRouteState(
  routeMode: EditorRouteMode,
  projectId: string | undefined
): EditorRouteState {
  if (projectId) {
    return { status: 'loading' };
  }

  return routeMode === 'project-selection'
    ? {
        status: 'no-project-selected',
        message: 'The /project editor route is open, but no project has been selected yet.',
      }
    : {
        status: 'error',
        message:
          'The /project/:id editor route is missing a project id, so Arrangement Forge cannot load a project here.',
      };
}

function getLoadingMessage(projectId: string | undefined) {
  return projectId
    ? `Opening project ${projectId} in the editor.`
    : 'Opening the requested project route in the editor.';
}

function describeEditorRoute(routeMode: EditorRouteMode, projectId: string | undefined) {
  if (routeMode === 'project-selection') {
    return '/project';
  }

  return projectId ? `/project/${projectId}` : '/project/:id (missing project id)';
}

function getCurrentEditorRoute({
  pathname,
  search,
  hash,
  routeMode,
  projectId,
}: {
  pathname: string;
  search: string;
  hash: string;
  routeMode: EditorRouteMode;
  projectId: string | undefined;
}) {
  const describedRoute = describeEditorRoute(routeMode, projectId);
  const currentPath =
    routeMode === 'project-id' && !projectId ? describedRoute : pathname || describedRoute;

  return `${currentPath}${search}${hash}`;
}

function getEditorFallbackRoute() {
  return '/project';
}

function getEditorRouteModeLabel({
  routeMode,
  routeState,
}: {
  routeMode: EditorRouteMode;
  routeState: EditorRouteState['status'];
}) {
  if (routeMode === 'project-selection') {
    return 'editor fallback route';
  }

  if (routeState === 'ready') {
    return 'active project route';
  }

  return 'requested project route';
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

  if (routeState === 'error' && routeMode === 'project-id' && !projectId) {
    return 'Route truth: /project/:id cannot open because the route is missing a project id.';
  }

  if (routeState === 'error') {
    return `Route truth: ${routeLabel} is blocked until Arrangement Forge can load the requested project.`;
  }

  if (routeState === 'ready') {
    return `Route truth: ${routeLabel} is loaded in this workspace. If you leave this project route, /project is the editor fallback route until you choose another project from the library.`;
  }

  return `Route truth: ${routeLabel} is still resolving before the editor becomes ready.`;
}

function getEditorRouteCurrentState({
  routeMode,
  routeState,
  projectId,
}: {
  routeMode: EditorRouteMode;
  routeState: EditorRouteState['status'];
  projectId: string | undefined;
}) {
  if (routeState === 'no-project-selected') {
    return 'The editor fallback route is open with no active project in this workspace.';
  }

  if (routeState === 'missing-project') {
    return projectId
      ? `The requested project route for ${projectId} did not resolve to an available project.`
      : 'The requested project route did not resolve to an available project.';
  }

  if (routeState === 'error') {
    if (routeMode === 'project-id' && !projectId) {
      return 'The requested editor route is malformed because no project id was provided.';
    }

    return projectId
      ? `The requested project route for ${projectId} is blocked by a load failure.`
      : 'The requested project route is blocked by a load failure.';
  }

  if (routeState === 'ready') {
    return projectId
      ? `The requested project route for ${projectId} is loaded in this workspace.`
      : 'The requested project route is loaded in this workspace.';
  }

  if (routeMode === 'project-selection') {
    return 'Arrangement Forge is resolving whether the editor fallback route should stay parked or move into a project.';
  }

  return projectId
    ? `Arrangement Forge is still loading the requested project route for ${projectId}.`
    : 'Arrangement Forge is still loading the requested project route.';
}

function getEditorRouteReadiness({
  routeMode,
  routeState,
  projectId,
}: {
  routeMode: EditorRouteMode;
  routeState: EditorRouteState['status'];
  projectId: string | undefined;
}) {
  if (routeState === 'no-project-selected') {
    return '/project is parked as the editor fallback route until you choose a project from the library.';
  }

  if (routeState === 'missing-project') {
    return projectId
      ? `/project/${projectId} is blocked because that project is unavailable.`
      : 'The requested editor route is blocked because that project is unavailable.';
  }

  if (routeState === 'error') {
    if (routeMode === 'project-id' && !projectId) {
      return '/project/:id is blocked because the route is missing a project id.';
    }

    return projectId
      ? `/project/${projectId} is blocked until the load failure is resolved.`
      : 'The requested editor route is blocked until the load failure is resolved.';
  }

  if (routeState === 'ready') {
    return projectId
      ? `/project/${projectId} is ready in this workspace.`
      : 'The requested editor route is ready in this workspace.';
  }

  return projectId
    ? `/project/${projectId} is still loading before the editor becomes interactive.`
    : 'The requested editor route is still loading before the editor becomes interactive.';
}

function EditorRouteReadyBanner({
  projectId,
  currentRoute,
  fallbackRoute,
  routeModeLabel,
  routeReadiness,
  routeTruth,
}: {
  projectId: string;
  currentRoute: string;
  fallbackRoute: string;
  routeModeLabel: string;
  routeReadiness: string;
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
        The requested project route is open and the editor workspace is ready.
      </p>
      <p className="text-[11px] text-foreground/80">
        Current state: the requested project is loaded in this workspace.
      </p>
      <p className="text-[11px] text-foreground/80">
        Next step: edit this arrangement or return to the library to open a different project.
      </p>
      <p className="text-[11px] text-foreground/80">Route mode: {routeModeLabel}</p>
      <p className="text-[11px] text-foreground/80">Route readiness: {routeReadiness}</p>
      <p className="text-[11px] text-foreground/80">Current route: {currentRoute}</p>
      <p className="text-[11px] text-foreground/80">Editor fallback route: {fallbackRoute}</p>
      <p className="text-[11px] text-foreground/80">{routeTruth}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/project"
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open editor fallback
        </Link>
        <Link
          to="/library"
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}

export default function EditorPage({
  routeMode = 'project-id',
}: {
  routeMode?: EditorRouteMode;
}) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { loadProject } = useProject();
  const loadedProjectId = useProjectStore((state) => state.project?.id ?? null);
  const [routeState, setRouteState] = useState<EditorRouteState>(() =>
    getInitialEditorRouteState(routeMode, id)
  );
  const routeTruth = getEditorRouteTruth({
    routeMode,
    routeState: routeState.status,
    projectId: id,
  });
  const currentRoute = getCurrentEditorRoute({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    routeMode,
    projectId: id,
  });
  const fallbackRoute = getEditorFallbackRoute();
  const currentState = getEditorRouteCurrentState({
    routeMode,
    routeState: routeState.status,
    projectId: id,
  });
  const routeReadiness = getEditorRouteReadiness({
    routeMode,
    routeState: routeState.status,
    projectId: id,
  });
  const routeModeLabel = getEditorRouteModeLabel({
    routeMode,
    routeState: routeState.status,
  });

  useEffect(() => {
    if (!id) {
      useProjectStore.getState().clearProjectSession();
      setRouteState(getInitialEditorRouteState(routeMode, id));
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
            currentState={currentState}
            routeModeLabel={routeModeLabel}
            routeReadiness={routeReadiness}
            currentRoute={currentRoute}
            fallbackRoute={fallbackRoute}
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
        shellStatus="no-project-selected"
        shellBody={
          <EditorShellState
            title="Choose a project to open the editor"
            message={routeState.message}
            currentState={currentState}
            routeModeLabel={routeModeLabel}
            routeReadiness={routeReadiness}
            currentRoute={currentRoute}
            fallbackRoute={fallbackRoute}
            routeTruth={routeTruth}
            nextStep="Return to the library, then open an existing project or create a new one to finish this editor route."
            testId="editor-shell-no-project-state"
            actionHref="/library"
            actionLabel="Go to library"
            routeStatus="no-project-selected"
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
            currentState={currentState}
            routeModeLabel={routeModeLabel}
            routeReadiness={routeReadiness}
            currentRoute={currentRoute}
            fallbackRoute={fallbackRoute}
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
            currentState={currentState}
            routeModeLabel={routeModeLabel}
            routeReadiness={routeReadiness}
            currentRoute={currentRoute}
            fallbackRoute={fallbackRoute}
            routeTruth={routeTruth}
            nextStep={
              routeMode === 'project-id' && !id
                ? 'Return to the library, then open a project to replace this malformed editor route.'
                : 'Return to the library, then retry this project after the load failure is resolved.'
            }
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

  return (
    <AppShell
      workspaceBanner={
        <EditorRouteReadyBanner
          projectId={id}
          currentRoute={currentRoute}
          fallbackRoute={fallbackRoute}
          routeModeLabel={routeModeLabel}
          routeReadiness={routeReadiness}
          routeTruth={routeTruth}
        />
      }
    />
  );
}
