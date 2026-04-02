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
import { getProjectStoreReadiness, useProjectStore } from '@/store/project-store';

export type { EditorRouteMode } from '@/lib/editor-route-truth';

type EditorReadinessState = 'ready' | 'waiting' | 'blocked';

function getEditorReadinessState(routeStatus: EditorRouteState['status']): EditorReadinessState {
  switch (routeStatus) {
    case 'ready':
      return 'ready';
    case 'loading':
      return 'waiting';
    default:
      return 'blocked';
  }
}

function EditorShellState({
  title,
  message,
  editorReadiness,
  currentState,
  projectStoreReadiness,
  projectStoreCurrentState,
  routeModeLabel,
  routeReadiness,
  routeTarget,
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
  editorReadiness: EditorReadinessState;
  currentState: string;
  projectStoreReadiness: 'ready' | 'waiting' | 'blocked';
  projectStoreCurrentState: string;
  routeModeLabel: string;
  routeReadiness: string;
  routeTarget: string;
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
      data-editor-readiness={editorReadiness}
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
        <p className="text-xs text-foreground/80">Editor readiness: {editorReadiness}</p>
        <p className="text-xs text-foreground/80">Current state: {currentState}</p>
        <p className="text-xs text-foreground/80">
          Project store readiness: {projectStoreReadiness}
        </p>
        <p className="text-xs text-foreground/80">
          Project store state: {projectStoreCurrentState}
        </p>
        <p className="text-xs text-foreground/80">Route mode: {routeModeLabel}</p>
        <p className="text-xs text-foreground/80">Route readiness: {routeReadiness}</p>
        <p className="text-xs text-foreground/80">Route target: {routeTarget}</p>
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
  | Extract<LoadProjectResult, { status: 'missing-project' }>
  | Extract<LoadProjectResult, { status: 'error' }>
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
        currentState: 'The requested editor route is malformed because no project id was provided.',
        nextStep:
          'Return to the library, then open a project to replace this malformed editor route.',
        detail: null,
        failureTarget: null,
      };
}

function getLoadingMessage(projectId: string | undefined) {
  return projectId
    ? `Opening project ${projectId} in the editor.`
    : 'Opening the requested project route in the editor.';
}

function EditorRouteReadyBanner({
  projectId,
  editorReadiness,
  currentState,
  projectStoreCurrentState,
  nextStep,
  routeTarget,
  currentRoute,
  fallbackRoute,
  routeModeLabel,
  routeReadiness,
  routeTruth,
  fallbackHandling,
}: {
  projectId: string;
  editorReadiness: EditorReadinessState;
  currentState: string;
  projectStoreCurrentState: string;
  nextStep: string;
  routeTarget: string;
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
      data-editor-readiness={editorReadiness}
      data-editor-route-state="ready"
    >
      <p className="text-xs font-medium text-foreground">Editor route ready for project {projectId}.</p>
      <p className="text-[11px] text-muted-foreground">
        The requested project route is open and the editor workspace is ready.
      </p>
      <p className="text-[11px] text-foreground/80">Editor readiness: {editorReadiness}</p>
      <p className="text-[11px] text-foreground/80">Current state: {currentState}</p>
      <p className="text-[11px] text-foreground/80">Project store readiness: ready</p>
      <p className="text-[11px] text-foreground/80">Project store state: {projectStoreCurrentState}</p>
      <p className="text-[11px] text-foreground/80">Next step: {nextStep}</p>
      <p className="text-[11px] text-foreground/80">Route mode: {routeModeLabel}</p>
      <p className="text-[11px] text-foreground/80">Route readiness: {routeReadiness}</p>
      <p className="text-[11px] text-foreground/80">Route target: {routeTarget}</p>
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
  const project = useProjectStore((state) => state.project);
  const loadedProjectId = project?.id ?? null;
  const projectLoadStatus = useProjectStore((state) => state.projectLoadStatus);
  const projectLoadTargetId = useProjectStore((state) => state.projectLoadTargetId);
  const projectLoadMessage = useProjectStore((state) => state.projectLoadMessage);
  const projectLoadFailureTarget = useProjectStore((state) => state.projectLoadFailureTarget);
  const projectStoreReadiness = getProjectStoreReadiness({
    project,
    projectLoadStatus,
    projectLoadTargetId,
    projectLoadMessage,
    projectLoadFailureTarget,
  });
  const [routeState, setRouteState] = useState<EditorRouteState>(() =>
    getInitialEditorRouteState(routeMode, id)
  );
  const editorReadiness = getEditorReadinessState(routeState.status);
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
            editorReadiness={editorReadiness}
            currentState={routeTruth.currentState}
            projectStoreReadiness={projectStoreReadiness.status}
            projectStoreCurrentState={projectStoreReadiness.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            routeTarget={routeTruth.routeLabel}
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
            editorReadiness={editorReadiness}
            currentState={routeTruth.currentState}
            projectStoreReadiness={projectStoreReadiness.status}
            projectStoreCurrentState={projectStoreReadiness.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            routeTarget={routeTruth.routeLabel}
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
            editorReadiness={editorReadiness}
            currentState={routeState.currentState}
            projectStoreReadiness={projectStoreReadiness.status}
            projectStoreCurrentState={projectStoreReadiness.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            routeTarget={routeTruth.routeLabel}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeState.nextStep}
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
    const isMalformedProjectRoute = !id;

    return (
      <AppShell
        shellStatus="error"
        shellBody={
          <EditorShellState
            title={isMalformedProjectRoute ? 'Editor route is malformed' : 'Unable to open project'}
            message={
              id
                ? `Project ${id} could not be loaded because ${routeState.failureTarget ?? 'project data'} failed to load. ${routeState.message}`
                : routeState.message
            }
            editorReadiness={editorReadiness}
            currentState={routeState.currentState}
            projectStoreReadiness={projectStoreReadiness.status}
            projectStoreCurrentState={projectStoreReadiness.currentState}
            routeModeLabel={routeTruth.routeModeLabel}
            routeReadiness={routeTruth.routeReadiness}
            routeTarget={routeTruth.routeLabel}
            currentRoute={routeTruth.currentRoute}
            fallbackRoute={routeTruth.fallbackRoute ?? undefined}
            routeTruth={routeTruth.routeTruth}
            fallbackHandling={routeTruth.fallbackHandling}
            nextStep={routeState.nextStep}
            testId="editor-shell-error-state"
            tone="error"
            actionHref={isMalformedProjectRoute ? '/project' : '/library'}
            actionLabel={isMalformedProjectRoute ? 'Open editor fallback' : 'Back to library'}
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
          editorReadiness={editorReadiness}
          currentState={routeTruth.currentState}
          projectStoreCurrentState={projectStoreReadiness.currentState}
          nextStep={routeTruth.nextStep}
          routeTarget={routeTruth.routeLabel}
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
