import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';

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

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { loadProject } = useProject();
  const loadedProjectId = useProjectStore((state) => state.project?.id ?? null);
  const systemStatus = useUiStore((state) => state.systemStatus);
  const errorMessage = useUiStore((state) => state.errorMessage);

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  if (id && loadedProjectId !== id) {
    if (systemStatus === 'error') {
      return (
        <AppShell
          shellStatus="error"
          shellBody={
            <EditorShellState
              title="Unable to open project"
              message={errorMessage ?? 'The requested project could not be loaded.'}
              testId="editor-shell-error-state"
              tone="error"
            />
          }
        />
      );
    }

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

  return <AppShell />;
}
