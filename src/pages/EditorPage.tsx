import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';

function EditorLoadingGate() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-6"
      data-testid="editor-loading-gate"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Loading project...</p>
          <p className="text-xs text-muted-foreground">
            Preparing the editor for this arrangement.
          </p>
        </div>
      </div>
    </div>
  );
}

function EditorLoadError({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm space-y-2 text-center">
        <h1 className="text-lg font-semibold text-foreground">Unable to open project</h1>
        <p className="text-sm text-muted-foreground">
          {message ?? 'The requested project could not be loaded.'}
        </p>
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
      return <EditorLoadError message={errorMessage} />;
    }

    return <EditorLoadingGate />;
  }

  return <AppShell />;
}
