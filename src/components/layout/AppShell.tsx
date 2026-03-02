// AppShell.tsx — Three-zone layout for the editor page.
// Zones: TopBar | (LeftPanel + MainArea) | StatusBar
// MainArea: ArrangementView + TransportBar + MixerDrawer

import { useEffect } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { LeftPanel } from '@/components/left-panel/LeftPanel';
import { ArrangementView } from '@/components/arrangement/ArrangementView';
import { TransportBar } from '@/components/transport/TransportBar';
import { MixerDrawer } from '@/components/mixer/MixerDrawer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUiStore } from '@/store/ui-store';
import { useProject } from '@/hooks/useProject';

export function AppShell() {
  // Global keyboard shortcut handler
  useKeyboardShortcuts();

  const { unsavedChanges } = useUiStore();
  const { saveProject } = useProject();

  // Auto-save every 60 seconds when there are unsaved changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (unsavedChanges) saveProject();
    }, 60_000);
    return () => clearInterval(interval);
  }, [unsavedChanges, saveProject]);

  return (
    <div className="flex flex-col h-screen bg-base-100 overflow-hidden">
      {/* Top bar — two rows (title + params) */}
      <TopBar />

      {/* Middle row — left panel + main area */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — fixed 320px */}
        <LeftPanel />

        {/* Main area — arrangement + transport + mixer */}
        <div className="flex flex-col flex-1 min-w-0">
          <ArrangementView />
          <TransportBar />
          <MixerDrawer />
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
