import { describe, expect, it } from 'vitest';
import { getEditorRouteTruth, getProtectedRouteTruth } from './editor-route-truth';

describe('editor-route-truth', () => {
  it('keeps the requested editor route and fallback explicit during auth recovery', () => {
    expect(getProtectedRouteTruth('/project/project-1?tab=arrangement#bridge')).toMatchObject({
      recoveryDestination: 'project project-1 in the editor',
      currentRoute: '/project/project-1?tab=arrangement#bridge',
      fallbackRoute: '/project',
      routeModeLabel: 'requested project route',
      routeReadiness: '/project/project-1 is reserved until authentication finishes.',
      routeTruth:
        'Route truth: /project/project-1 stays reserved during authentication, and /project remains the editor fallback route if you need to choose a different project after recovery.',
    });
  });

  it('surfaces the parked fallback route truth when no project is selected', () => {
    expect(
      getEditorRouteTruth({
        pathname: '/project',
        search: '?tab=arrangement',
        hash: '#new',
        routeMode: 'project-selection',
        routeStatus: 'no-project-selected',
        projectId: undefined,
      })
    ).toMatchObject({
      currentRoute: '/project?tab=arrangement#new',
      fallbackRoute: '/project',
      routeModeLabel: 'editor fallback route',
      currentState: 'The editor fallback route is open with no active project in this workspace.',
      routeReadiness:
        '/project is parked as the editor fallback route until you choose a project from the library.',
      routeTruth:
        'Route truth: /project is the editor fallback route, and it stays parked here until you choose a project from the library.',
    });
  });

  it('keeps malformed project-id routes explicit instead of implying a current project exists', () => {
    expect(
      getEditorRouteTruth({
        pathname: '/project',
        search: '',
        hash: '',
        routeMode: 'project-id',
        routeStatus: 'error',
        projectId: undefined,
      })
    ).toMatchObject({
      currentRoute: '/project/:id (missing project id)',
      fallbackRoute: '/project',
      routeModeLabel: 'requested project route',
      currentState: 'The requested editor route is malformed because no project id was provided.',
      routeReadiness: '/project/:id is blocked because the route is missing a project id.',
      routeTruth: 'Route truth: /project/:id cannot open because the route is missing a project id.',
    });
  });
});
