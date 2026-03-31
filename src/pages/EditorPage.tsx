import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { LoadProjectResult } from '@/hooks/useProject';
import { useProject } from '@/hooks/useProject';
import {
  getEditorRouteTruth,
  type EditorRouteMode,
  type EditorRouteStatus,
} from '@/lib/editor-route-truth';
import { useProjectStore } from '@/store/project-store';

export type { EditorRouteMode } from '@/lib/editor-route-truth';

function EditorShellState({
  title,
  message,
  currentState,
  routeModeLabel,
  routeReadiness,
  currentRoute,
  fallbackRoute,
  routeTruth,
  fallbackHandling,
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
  fallbackHandling?: string | null;
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
        {fallbackHandling ? <p className="text-xs text-foreground/80">{fallbackHandling}</p> : null}
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

function EditorRouteReadyBanner({
  projectId,
  currentState,
  nextStep,
  currentRoute,
  fallbackRoute,
  routeModeLabel,
  routeReadiness,
  routeTruth,
  fallbackHandling,
}: {
  projectId: string;
  currentState: string;
  nextStep: string;
  currentRoute: string;
  fallbackRoute: string;
  routeModeLabel: string;
  routeReadiness: string;
  routeTruth: string;
  fallbackHandling: string | null;
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
      <p className="text-[11px] text-foreground/80">Current state: {currentState}</p>
      <p className="text-[11px] text-foreground/80">Next step: {nextStep}</p>
      <p className="text-[11px] text-foreground/80">Route mode: {routeModeLabel}</p>
      <p className="text-[11px] text-foreground/80">Route readiness: {routeReadiness}</p>
      <p className="text-[11px] text-foreground/80">Current route: {currentRoute}</p>
      <p className="text-[11px] text-foreground/80">Editor fallback route: {fallbackRoute}</p>
      <p className="text-[11px] text-foreground/80">{routeTruth}</p>
      {fallbackHandling ? (
        <p className="text-[11px] text-foreground/80">{fallbackHandling}</p>
      ) : null}
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
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    routeMode,
    routeStatus: routeState.status as Exclude<EditorRouteStatus, 'auth-reserved'>,
    projectId: id,
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
            currentState={routeTruth.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeTruth.nextStep}
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
            currentState={routeTruth.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeTruth.nextStep}
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
            currentState={routeTruth.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeTruth.nextStep}
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
            currentState={routeTruth.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeTruth.nextStep}
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
          currentState={routeTruth.currentState}
          nextStep={routeTruth.nextStep}
          currentRoute={routeTruth.currentRoute}
          fallbackRoute={routeTruth.fallbackRoute ?? '/project'}
          routeModeLabel={routeTruth.routeModeLabel}
          routeReadiness={routeTruth.routeReadiness}
          routeTruth={routeTruth.routeTruth}
          fallbackHandling={routeTruth.fallbackHandling}
        />
      }
    />
  );
}
