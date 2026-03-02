// SectionContext.tsx — Section-level inspector. Full implementation in T21.

import { useSelectionStore } from '@/store/selection-store';
import { useProjectStore } from '@/store/project-store';
import { useUndoStore } from '@/store/undo-store';
import { StyleControls } from './StyleControls';
import { resolveStyle, isInherited } from '@/lib/style-cascade';

export function SectionContext() {
  const { sectionId } = useSelectionStore();
  const { sections, project, blocks, updateSection } = useProjectStore();
  const { pushUndo } = useUndoStore();

  const section = sections.find((s) => s.id === sectionId);
  if (!section || !project) return null;

  const totalBars = sections.reduce((sum, s) => sum + s.barCount, 0);

  function handleStyleChange(field: string, value: number | string | null) {
    const overrideField = field === 'energy' ? 'energyOverride'
      : field === 'groove' ? 'grooveOverride'
      : field === 'swingPct' ? 'swingPctOverride'
      : field === 'dynamics' ? 'dynamicsOverride'
      : null;
    if (!overrideField) return;

    const before = JSON.stringify({ sections, blocks });
    updateSection(section!.id, { [overrideField]: value });
    const after = JSON.stringify({ sections: useProjectStore.getState().sections, blocks });
    pushUndo(`Change ${field} for ${section!.name}`, before, after);
  }

  function handleReset(field: string) {
    handleStyleChange(field, null);
  }

  const resolved = {
    energy: resolveStyle(project, section, null, 'energy'),
    groove: resolveStyle(project, section, null, 'groove'),
    swingPct: resolveStyle(project, section, null, 'swingPct'),
    dynamics: resolveStyle(project, section, null, 'dynamics'),
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Section name */}
      <div className="flex flex-col gap-1 px-1">
        <label className="text-xs text-base-content/50">Section Name</label>
        <input
          type="text"
          className="input input-xs input-bordered"
          value={section.name}
          onChange={(e) => updateSection(section.id, { name: e.target.value })}
        />
      </div>

      {/* Bar count */}
      <div className="flex flex-col gap-1 px-1">
        <label className="text-xs text-base-content/50">Bar Count</label>
        <input
          type="number"
          className="input input-xs input-bordered w-24"
          min={1}
          max={64}
          value={section.barCount}
          onChange={(e) => updateSection(section.id, { barCount: Math.max(1, parseInt(e.target.value) || 1) })}
        />
        <span className="text-[10px] text-base-content/25">Total: {totalBars} bars</span>
      </div>

      {/* Style overrides */}
      <div className="flex flex-col gap-2 px-1">
        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
          Style Overrides
        </span>
        <StyleControls
          genre={project.genre}
          subStyle={project.subStyle}
          energy={resolved.energy.value}
          groove={resolved.groove.value}
          swingPct={resolved.swingPct.value}
          dynamics={resolved.dynamics.value}
          energyInherited={isInherited(section, null, 'energy', 'section')}
          grooveInherited={isInherited(section, null, 'groove', 'section')}
          swingInherited={isInherited(section, null, 'swingPct', 'section')}
          dynamicsInherited={isInherited(section, null, 'dynamics', 'section')}
          onChange={handleStyleChange}
          onReset={handleReset}
        />
      </div>

      <div className="px-1 pt-2">
        <button className="btn btn-outline btn-sm w-full text-xs">
          Regenerate {section.name}
        </button>
      </div>
    </div>
  );
}
