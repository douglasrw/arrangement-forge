// AppShell.tsx — Three-zone layout for the editor page.

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { LeftPanel, type PanelContext } from '@/components/left-panel/LeftPanel';
import { ArrangementView } from '@/components/arrangement/ArrangementView';
import { TransportBar } from '@/components/transport/TransportBar';
import { MixerDrawer } from '@/components/mixer/MixerDrawer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
import type { AppStatus } from './StatusBar';

export function AppShell() {
  useKeyboardShortcuts();
  useAutoSave();

  /* Kill any rogue scroll offset on mount */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const selectionLevel = useSelectionStore((s) => s.level);
  const [panelContext, setPanelContext] = useState<PanelContext>({ mode: 'default' });

  const unsavedChanges = useUiStore((s) => s.unsavedChanges);
  const generationState = useUiStore((s) => s.generationState);
  const systemStatus = useUiStore((s) => s.systemStatus);
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);

  /* Derive StatusBar status from uiStore */
  const derivedStatus: AppStatus =
    systemStatus === 'error' ? 'error' :
    generationState === 'generating' ? 'generating' :
    systemStatus === 'saving' ? 'saving' :
    unsavedChanges ? 'unsaved' :
    'saved';

  /* Sync panel context when selection is cleared (e.g. Escape key) */
  useEffect(() => {
    if (selectionLevel === 'song' && panelContext.mode !== 'default') {
      setPanelContext({ mode: 'default' });
    }
  }, [selectionLevel, panelContext.mode]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0">
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
      </div>

      <StatusBar status={derivedStatus} />
    </div>
  );
}
