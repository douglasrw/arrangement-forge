// AppShell.tsx — Three-zone layout for the editor page.

import { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { LeftPanel, type PanelContext } from '@/components/left-panel/LeftPanel';
import { ArrangementView } from '@/components/arrangement/ArrangementView';
import { TransportBar } from '@/components/transport/TransportBar';
import { MixerDrawer } from '@/components/mixer/MixerDrawer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUiStore } from '@/store/ui-store';
import { useProject } from '@/hooks/useProject';

export function AppShell() {
  useKeyboardShortcuts();

  const { unsavedChanges } = useUiStore();
  const { saveProject } = useProject();
  const [panelContext, setPanelContext] = useState<PanelContext>({ mode: 'default' });

  useEffect(() => {
    const interval = setInterval(() => {
      if (unsavedChanges) saveProject();
    }, 60_000);
    return () => clearInterval(interval);
  }, [unsavedChanges, saveProject]);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0">
        <LeftPanel
          context={panelContext}
          onContextClose={() => setPanelContext({ mode: 'default' })}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <ArrangementView
            onBlockSelect={(info) =>
              setPanelContext(info ? { mode: 'block', ...info } : { mode: 'default' })
            }
            onSectionSelect={(info) =>
              setPanelContext(info ? { mode: 'section', ...info } : { mode: 'default' })
            }
          />
          <TransportBar />
          <MixerDrawer />
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
