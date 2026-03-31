export type EditorRouteMode = 'project-selection' | 'project-id';
export type EditorRouteStatus =
  | 'auth-reserved'
  | 'loading'
  | 'no-project-selected'
  | 'missing-project'
  | 'error'
  | 'ready';

type EditorRouteBase = {
  routeLabel: string;
  currentRoute: string;
  fallbackRoute: string | null;
  routeModeLabel: string;
};

export type ProtectedRouteTruth = EditorRouteBase & {
  recoveryDestination: string;
  routeReadiness: string;
  routeTruth: string;
  fallbackHandling: string | null;
};

export type EditorRouteTruth = EditorRouteBase & {
  currentState: string;
  nextStep: string;
  routeReadiness: string;
  routeTruth: string;
  fallbackHandling: string | null;
};

const EDITOR_FALLBACK_ROUTE = '/project';

function getRoutePath(path: string) {
  return path.split(/[?#]/, 1)[0] ?? path;
}

function getEditorRouteLabel(routeMode: EditorRouteMode, projectId: string | undefined) {
  if (routeMode === 'project-selection') {
    return EDITOR_FALLBACK_ROUTE;
  }

  return projectId ? `/project/${projectId}` : '/project/:id (missing project id)';
}

export function getProtectedRouteTruth(path: string): ProtectedRouteTruth {
  const routePath = getRoutePath(path);
  const currentRoute = path || '/';

  if (routePath === '/project') {
    return {
      recoveryDestination: 'project selection in the editor',
      routeLabel: EDITOR_FALLBACK_ROUTE,
      currentRoute,
      fallbackRoute: EDITOR_FALLBACK_ROUTE,
      routeModeLabel: 'editor fallback route',
      routeReadiness: '/project is reserved as the editor fallback route until authentication finishes.',
      routeTruth:
        'Route truth: /project is the editor fallback route, and it stays reserved until authentication finishes and you can choose a project.',
      fallbackHandling:
        'Fallback handling: after authentication, opening /project clears the active workspace and parks the editor until you choose a project from the library.',
    };
  }

  if (routePath.startsWith('/project/')) {
    const [, , projectId] = routePath.split('/');

    return {
      recoveryDestination: projectId
        ? `project ${projectId} in the editor`
        : 'the requested project in the editor',
      routeLabel: routePath,
      currentRoute,
      fallbackRoute: EDITOR_FALLBACK_ROUTE,
      routeModeLabel: 'requested project route',
      routeReadiness: `${routePath} is reserved until authentication finishes.`,
      routeTruth: `Route truth: ${routePath} stays reserved during authentication, and /project remains the editor fallback route if you need to choose a different project after recovery.`,
      fallbackHandling:
        'Fallback handling: if you leave this requested project route after recovery, /project clears the active workspace and parks the editor until you choose a different project.',
    };
  }

  if (routePath.startsWith('/settings')) {
    return {
      recoveryDestination: 'settings',
      routeLabel: routePath,
      currentRoute,
      fallbackRoute: null,
      routeModeLabel: 'protected settings route',
      routeReadiness: `${routePath} is reserved until authentication finishes.`,
      routeTruth: `Route truth: ${routePath} stays reserved until authentication finishes.`,
      fallbackHandling: null,
    };
  }

  if (routePath.startsWith('/library')) {
    return {
      recoveryDestination: 'the library',
      routeLabel: routePath,
      currentRoute,
      fallbackRoute: null,
      routeModeLabel: 'protected library route',
      routeReadiness: `${routePath} is reserved until authentication finishes.`,
      routeTruth: `Route truth: ${routePath} stays reserved until authentication finishes.`,
      fallbackHandling: null,
    };
  }

  return {
    recoveryDestination: 'your workspace',
    routeLabel: routePath || '/',
    currentRoute,
    fallbackRoute: null,
    routeModeLabel: 'protected route',
    routeReadiness: `${routePath || '/'} is reserved until authentication finishes.`,
    routeTruth: `Route truth: ${routePath || '/'} stays reserved until authentication finishes.`,
    fallbackHandling: null,
  };
}

export function getEditorRouteTruth({
  pathname,
  search,
  hash,
  routeMode,
  routeStatus,
  projectId,
}: {
  pathname: string;
  search: string;
  hash: string;
  routeMode: EditorRouteMode;
  routeStatus: Exclude<EditorRouteStatus, 'auth-reserved'>;
  projectId: string | undefined;
}): EditorRouteTruth {
  const routeLabel = getEditorRouteLabel(routeMode, projectId);
  const currentRoute =
    routeMode === 'project-id' && !projectId
      ? routeLabel
      : `${(pathname || routeLabel)}${search}${hash}`;
  const fallbackRoute = EDITOR_FALLBACK_ROUTE;
  const routeModeLabel =
    routeMode === 'project-selection'
      ? 'editor fallback route'
      : routeStatus === 'ready'
        ? 'active project route'
        : 'requested project route';

  if (routeStatus === 'no-project-selected') {
    return {
      routeLabel,
      currentRoute,
      fallbackRoute,
      routeModeLabel,
      currentState: 'The editor fallback route is open with no active project in this workspace.',
      nextStep:
        'Return to the library, then open an existing project or create a new one to finish this editor route.',
      routeReadiness:
        '/project is parked as the editor fallback route until you choose a project from the library.',
      routeTruth:
        'Route truth: /project is the editor fallback route, and it stays parked here until you choose a project from the library.',
      fallbackHandling:
        'Fallback handling: this /project route has already cleared the active workspace and will stay parked until you choose a project from the library.',
    };
  }

  if (routeStatus === 'missing-project') {
    return {
      routeLabel,
      currentRoute,
      fallbackRoute,
      routeModeLabel,
      currentState: projectId
        ? `The requested project route for ${projectId} did not resolve to an available project.`
        : 'The requested project route did not resolve to an available project.',
      nextStep: 'Return to the library and open a different project.',
      routeReadiness: projectId
        ? `/project/${projectId} is blocked because that project is unavailable.`
        : 'The requested editor route is blocked because that project is unavailable.',
      routeTruth: `Route truth: ${routeLabel} cannot open because the requested project is unavailable.`,
      fallbackHandling:
        'Fallback handling: use /project to clear the blocked workspace state, then choose a different project from the library.',
    };
  }

  if (routeStatus === 'error') {
    if (routeMode === 'project-id' && !projectId) {
      return {
        routeLabel,
        currentRoute,
        fallbackRoute,
        routeModeLabel,
        currentState: 'The requested editor route is malformed because no project id was provided.',
        nextStep:
          'Return to the library, then open a project to replace this malformed editor route.',
        routeReadiness: '/project/:id is blocked because the route is missing a project id.',
        routeTruth: 'Route truth: /project/:id cannot open because the route is missing a project id.',
        fallbackHandling:
          'Fallback handling: switch to /project to clear this malformed route and park the editor until you choose a project from the library.',
      };
    }

    return {
      routeLabel,
      currentRoute,
      fallbackRoute,
      routeModeLabel,
      currentState: projectId
        ? `The requested project route for ${projectId} is blocked by a load failure.`
        : 'The requested project route is blocked by a load failure.',
      nextStep:
        routeMode === 'project-id' && !projectId
          ? 'Return to the library, then open a project to replace this malformed editor route.'
          : 'Return to the library, then retry this project after the load failure is resolved.',
      routeReadiness: projectId
        ? `/project/${projectId} is blocked until the load failure is resolved.`
        : 'The requested editor route is blocked until the load failure is resolved.',
      routeTruth: `Route truth: ${routeLabel} is blocked until Arrangement Forge can load the requested project.`,
      fallbackHandling:
        'Fallback handling: use /project to clear the failed workspace state, then choose a project from the library or retry the requested route later.',
    };
  }

  if (routeStatus === 'ready') {
    return {
      routeLabel,
      currentRoute,
      fallbackRoute,
      routeModeLabel,
      currentState: projectId
        ? `The requested project route for ${projectId} is loaded in this workspace.`
        : 'The requested project route is loaded in this workspace.',
      nextStep: 'Edit this arrangement or return to the library to open a different project.',
      routeReadiness: projectId
        ? `/project/${projectId} is ready in this workspace.`
        : 'The requested editor route is ready in this workspace.',
      routeTruth: `Route truth: ${routeLabel} is loaded in this workspace. If you leave this project route, /project is the editor fallback route until you choose another project from the library.`,
      fallbackHandling:
        'Fallback handling: opening /project clears the active workspace and parks the editor until you choose another project from the library.',
    };
  }

  return {
    routeLabel,
    currentRoute,
    fallbackRoute,
    routeModeLabel,
    currentState:
      routeMode === 'project-selection'
        ? 'Arrangement Forge is resolving whether the editor fallback route should stay parked or move into a project.'
        : projectId
          ? `Arrangement Forge is still loading the requested project route for ${projectId}.`
          : 'Arrangement Forge is still loading the requested project route.',
    nextStep: 'Wait for the current route load to finish before editing this arrangement.',
    routeReadiness: projectId
      ? `/project/${projectId} is still loading before the editor becomes interactive.`
      : 'The requested editor route is still loading before the editor becomes interactive.',
    routeTruth: `Route truth: ${routeLabel} is still resolving before the editor becomes ready.`,
    fallbackHandling: projectId
      ? 'Fallback handling: if you stop waiting on this route, /project clears the active workspace and parks the editor until you choose a project from the library.'
      : 'Fallback handling: /project clears the active workspace and parks the editor until you choose a project from the library.',
  };
}
