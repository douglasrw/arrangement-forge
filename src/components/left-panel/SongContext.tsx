// SongContext.tsx — Song-level inspector (pre- and post-generation).

import { useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { StyleControls } from './StyleControls';
import { parseDescription } from '@/lib/description-parser';

export function SongContext() {
  const { project, updateProject } = useProjectStore();
  const { generationState } = useUiStore();
  const [inputTab, setInputTab] = useState<'text' | 'upload' | 'image'>('text');
  const [inputExpanded, setInputExpanded] = useState(true);

  const isPostGen = generationState === 'complete';

  if (!project) return null;

  function handleStyleChange(field: string, value: number | string | null) {
    if (!project) return;
    updateProject({ [field]: value } as Parameters<typeof updateProject>[0]);
  }

  function handleDescriptionBlur(text: string) {
    if (!text.trim() || !project) return;
    const parsed = parseDescription(text);
    const updates: Partial<typeof project> = {};

    // Only auto-populate controls that are at default (genre='Jazz' is default)
    if (parsed.genre && project.genre === 'Jazz') updates.genre = parsed.genre;
    if (parsed.subStyle) updates.subStyle = parsed.subStyle;
    if (parsed.energy != null && project.energy === 50) updates.energy = parsed.energy;
    if (parsed.tempo != null && project.tempo === 120) updates.tempo = parsed.tempo;
    if (parsed.timeSignature && project.timeSignature === '4/4') updates.timeSignature = parsed.timeSignature;
    if (parsed.key && project.key === 'C') updates.key = parsed.key;
    if (parsed.generationHints) {
      updates.generationHints = [project.generationHints, parsed.generationHints]
        .filter(Boolean).join(', ');
    }

    if (Object.keys(updates).length > 0) updateProject(updates);
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* INPUT SECTION */}
      {isPostGen && !inputExpanded ? (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Source</span>
            <button
              className="btn btn-ghost btn-xs text-xs text-base-content/40"
              onClick={() => setInputExpanded(true)}
            >
              Edit Source
            </button>
          </div>
          <div className="bg-base-300/40 rounded p-2 text-xs text-base-content/50 leading-relaxed font-mono max-h-24 overflow-y-auto">
            {project.chordChartRaw || <span className="text-base-content/25 italic">No chord chart</span>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Input</span>
            {isPostGen && (
              <button
                className="btn btn-ghost btn-xs text-xs text-base-content/40"
                onClick={() => setInputExpanded(false)}
              >
                Collapse
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs tabs-sm tabs-bordered px-1">
            {(['text', 'upload', 'image'] as const).map((tab) => (
              <button
                key={tab}
                className={`tab tab-sm capitalize ${inputTab === tab ? 'tab-active' : ''}`}
                onClick={() => setInputTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {inputTab === 'text' && (
            <div className="flex flex-col gap-2 px-1">
              <textarea
                className="textarea textarea-bordered textarea-sm w-full text-xs font-mono leading-relaxed resize-none h-28"
                placeholder={"| Cmaj7 | Am7 | Dm7 | G7 |\n| Cmaj7 | Am7 | Dm7 G7 | Cmaj7 |"}
                value={project.chordChartRaw}
                onChange={(e) => updateProject({ chordChartRaw: e.target.value })}
              />
              <textarea
                className="textarea textarea-bordered textarea-sm w-full text-xs resize-none h-14"
                placeholder="Jazz waltz, medium tempo, smoky feel, brushes on drums..."
                value={project.generationHints}
                onChange={(e) => updateProject({ generationHints: e.target.value })}
                onBlur={(e) => handleDescriptionBlur(e.target.value)}
              />
            </div>
          )}
          {inputTab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center px-4">
              <p className="text-base-content/40 text-sm">Coming soon</p>
              <p className="text-base-content/25 text-xs">Upload MusicXML, MIDI, or iReal Pro files.</p>
            </div>
          )}
          {inputTab === 'image' && (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center px-4">
              <p className="text-base-content/40 text-sm">Coming soon</p>
              <p className="text-base-content/25 text-xs">Snap a photo of a handwritten chord chart.</p>
            </div>
          )}
        </div>
      )}

      {/* STYLE CONTROLS */}
      <div className="flex flex-col gap-2 px-1">
        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Style</span>
        <StyleControls
          genre={project.genre}
          subStyle={project.subStyle}
          energy={project.energy}
          groove={project.groove}
          swingPct={project.swingPct}
          dynamics={project.dynamics}
          onChange={handleStyleChange}
        />
      </div>

      {/* Regenerate button (post-gen only) */}
      {isPostGen && (
        <div className="px-1 pt-2">
          <button
            className="btn btn-outline btn-sm w-full text-xs"
            id="regenerate-song-btn"
          >
            Regenerate Song
          </button>
        </div>
      )}
    </div>
  );
}
