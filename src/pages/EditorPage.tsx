import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import type { LoadProjectResult } from '@/hooks/useProject';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';

function EditorShellState({
  title,
  message,
  testId,
  tone = 'loading',
}: {
  title: string;
  message: string;
  testId: string;
  tone?: 'loading' | 'error';
}) {
  return (
    <div
      className="flex max-w-sm flex-col items-center gap-4 text-center"
      data-testid={testId}
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
      </div>
    </div>
  );
}

type EditorRouteState =
  | { status: 'loading' }
  | { status: 'missing-project'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready' };

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { loadProject } = useProject();
  const loadedProjectId = useProjectStore((state) => state.project?.id ?? null);
  const [routeState, setRouteState] = useState<EditorRouteState>({ status: 'loading' });

  useEffect(() => {
    if (!id) {
      setRouteState({
        status: 'error',
        message: 'The requested project route is missing an id.',
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
  }, [id, loadProject]);

  if (routeState.status === 'loading' || (routeState.status === 'ready' && loadedProjectId !== id)) {
    return (
      <AppShell
        shellStatus="loading-project"
        shellBody={
          <EditorShellState
            title="Loading project..."
            message="Preparing the editor for this arrangement."
            testId="editor-shell-loading-state"
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
            message={routeState.message}
            testId="editor-shell-missing-project-state"
            tone="error"
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
            message={routeState.message}
            testId="editor-shell-error-state"
            tone="error"
          />
        }
      />
    );
  }

  return <AppShell />;
}
