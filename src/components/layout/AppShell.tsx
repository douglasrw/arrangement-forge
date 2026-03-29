// AppShell.tsx — Three-zone layout for the editor page.

import { useState, useEffect, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { TopBar } from './TopBar';
import { StatusBar, deriveStatusBarStatus, type AppStatus } from './StatusBar';
import { LeftPanel, type PanelContext } from '@/components/left-panel/LeftPanel';
import { ArrangementView } from '@/components/arrangement/ArrangementView';
import { TransportBar } from '@/components/transport/TransportBar';
import { MixerDrawer } from '@/components/mixer/MixerDrawer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';

export interface AppShellProps {
  shellStatus?: AppStatus;
  shellBody?: ReactNode;
}

function AppShellFrame({ children, status }: { children: ReactNode; status: AppStatus }) {
  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-background"
      data-testid="editor-shell"
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">{children}</div>
      <StatusBar status={status} />
    </div>
  );
}

function EditorWorkspaceShell() {
  useKeyboardShortcuts();
  useAutoSave();

  const selectionLevel = useSelectionStore((s) => s.level);
  const [panelContext, setPanelContext] = useState<PanelContext>({ mode: 'default' });

  const unsavedChanges = useUiStore((s) => s.unsavedChanges);
  const generationState = useUiStore((s) => s.generationState);
  const systemStatus = useUiStore((s) => s.systemStatus);
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);

  /* Derive StatusBar status from uiStore */
  const derivedStatus = deriveStatusBarStatus({
    generationState,
    systemStatus,
    unsavedChanges,
  });

  /* Sync panel context when selection is cleared (e.g. Escape key) */
  useEffect(() => {
    if (selectionLevel === 'song' && panelContext.mode !== 'default') {
      setPanelContext({ mode: 'default' });
    }
  }, [selectionLevel, panelContext.mode]);

  return (
    <AppShellFrame status={derivedStatus}>
      {leftPanelCollapsed ? (
        <div className="flex h-full w-10 shrink-0 flex-col border-r border-border bg-sidebar">
          <button
            type="button"
            onClick={toggleLeftPanel}
            className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : (
        <LeftPanel
          context={panelContext}
          onCollapse={toggleLeftPanel}
          onContextClose={() => setPanelContext({ mode: 'default' })}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <ArrangementView
          onBlockSelect={(info) =>
            setPanelContext(info ? { mode: 'block', ...info } : { mode: 'default' })
          }
          onSectionSelect={(info) =>
            setPanelContext(info ? { mode: 'section', ...info } : { mode: 'default' })
          }
        />
        <MixerDrawer />
        <TransportBar />
      </div>
    </AppShellFrame>
  );
}

export function AppShell({ shellStatus, shellBody }: AppShellProps = {}) {
  /* Kill any rogue scroll offset on mount */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  if (shellBody) {
    return (
      <AppShellFrame status={shellStatus ?? 'saved'}>
        <div className="flex flex-1 items-center justify-center bg-background px-6">
          {shellBody}
        </div>
      </AppShellFrame>
    );
  }

  return <EditorWorkspaceShell />;
}
