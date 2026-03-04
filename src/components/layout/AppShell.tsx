// AppShell.tsx — Three-zone layout for the editor page.

import { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { LeftPanel, type PanelContext } from '@/components/left-panel/LeftPanel';
import { ArrangementView } from '@/components/arrangement/ArrangementView';
import { TransportBar } from '@/components/transport/TransportBar';
import { MixerDrawer } from '@/components/mixer/MixerDrawer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSelectionStore } from '@/store/selection-store';

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

  /* Sync panel context when selection is cleared (e.g. Escape key) */
  useEffect(() => {
    if (selectionLevel === 'song' && panelContext.mode !== 'default') {
      setPanelContext({ mode: 'default' });
    }
  }, [selectionLevel, panelContext.mode]);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0">
        <LeftPanel
          context={panelContext}
          onContextClose={() => setPanelContext({ mode: 'default' })}
        />

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

      <StatusBar />
    </div>
  );
}
