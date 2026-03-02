// LeftPanel.tsx — Context-aware left panel. Routes to song/section/block inspector.

import { useSelectionStore } from '@/store/selection-store';
import { useProjectStore } from '@/store/project-store';
import { SongContext } from './SongContext';
import { SectionContext } from './SectionContext';
import { BlockContext } from './BlockContext';
import { AiAssistant } from './AiAssistant';

export function LeftPanel() {
  const { level, sectionId, blockId, selectSong, selectSection } = useSelectionStore();
  const { sections, blocks, stems } = useProjectStore();

  const section = sections.find((s) => s.id === sectionId);
  const block = blocks.find((b) => b.id === blockId);
  const stem = stems.find((s) => s.id === block?.stemId);

  function Breadcrumb() {
    if (level === 'song') {
      return <span className="text-xs text-base-content/40">Song</span>;
    }
    if (level === 'section' && section) {
      return (
        <span className="text-xs flex gap-1 items-center text-base-content/40">
          <button className="hover:text-base-content/70 transition-colors" onClick={selectSong}>Song</button>
          <span>›</span>
          <span className="text-base-content/70">{section.name}</span>
        </span>
      );
    }
    if (level === 'block' && block && section && stem) {
      const barLabel = block.startBar === block.endBar
        ? `bar ${block.startBar}`
        : `bars ${block.startBar}–${block.endBar}`;
      return (
        <span className="text-xs flex gap-1 items-center text-base-content/40 flex-wrap">
          <button className="hover:text-base-content/70 transition-colors" onClick={selectSong}>Song</button>
          <span>›</span>
          <button
            className="hover:text-base-content/70 transition-colors"
            onClick={() => selectSection(section.id)}
          >
            {section.name}
          </button>
          <span>›</span>
          <span className="text-base-content/70 capitalize">{stem.instrument} {barLabel}</span>
        </span>
      );
    }
    return null;
  }

  function ContextPanel() {
    if (level === 'section') return <SectionContext />;
    if (level === 'block') return <BlockContext />;
    return <SongContext />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-4 py-2 border-b border-base-300 shrink-0">
        <Breadcrumb />
      </div>

      {/* Context inspector */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <ContextPanel />
      </div>

      {/* AI Assistant — always at bottom */}
      <div className="px-4 pb-4 shrink-0">
        <AiAssistant />
      </div>
    </div>
  );
}
