// BlockContext.tsx — Block-level inspector. Instrument-specific fields.

import { useSelectionStore } from '@/store/selection-store';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { StyleControls } from './StyleControls';
import { resolveStyle, isInherited } from '@/lib/style-cascade';
import { formatChord, parseChordInput } from '@/lib/chords';
import type { InstrumentType } from '@/types';

const DRUM_STYLES = ['Jazz brush swing', 'Jazz ride straight', 'Funk pocket', 'Rock straight', 'Half-time feel', 'Shuffle'];
const BASS_STYLES = ['Walking', 'Pedal tone', 'Slap', 'Fingerstyle', 'Root-fifth'];
const PIANO_STYLES = ['Jazz comp', 'Block chords', 'Stride', 'Arpeggiated', 'Sparse comp'];
const GUITAR_STYLES = ['Fingerpick arpeggios', 'Rhythm strum', 'Muted funk', 'Power chords', 'Fingerstyle'];
const STRINGS_STYLES = ['Sustained pad', 'Tremolo', 'Pizzicato', 'Arco melody'];

const STYLE_OPTIONS: Record<InstrumentType, string[]> = {
  drums: DRUM_STYLES, bass: BASS_STYLES, piano: PIANO_STYLES, guitar: GUITAR_STYLES, strings: STRINGS_STYLES,
};

export function BlockContext() {
  const { blockId } = useSelectionStore();
  const { blocks, stems, sections, project, updateBlock } = useProjectStore();
  const { chordDisplayMode } = useUiStore();
  const { pushUndo } = useUndoStore();

  const block = blocks.find((b) => b.id === blockId);
  const stem = stems.find((s) => s.id === block?.stemId);
  const section = sections.find((s) => s.id === block?.sectionId);

  if (!block || !stem || !section || !project) return null;

  const instrument = stem.instrument;
  const styleOptions = STYLE_OPTIONS[instrument] ?? [];
  const isPitched = instrument !== 'drums';
  const barLabel = block.startBar === block.endBar
    ? `bar ${block.startBar}` : `bars ${block.startBar}–${block.endBar}`;

  const resolved = {
    energy: resolveStyle(project, section, block, 'energy'),
    groove: resolveStyle(project, section, block, 'groove'),
    swingPct: resolveStyle(project, section, block, 'swingPct'),
    dynamics: resolveStyle(project, section, block, 'dynamics'),
  };

  // Capture narrowed values for use inside closures
  const blockId_ = block.id;
  const projectKey = project.key;

  function handleUpdate(partial: Parameters<typeof updateBlock>[1]) {
    const before = JSON.stringify({ blocks });
    updateBlock(blockId_, partial);
    const after = JSON.stringify({ blocks: useProjectStore.getState().blocks });
    pushUndo(`Update ${instrument} block`, before, after);
  }

  function handleStyleChange(field: string, value: number | string | null) {
    if (field === 'energy') handleUpdate({ energyOverride: value as number | null });
    else if (field === 'dynamics') handleUpdate({ dynamicsOverride: value as number | null });
  }

  function handleReset(field: string) {
    handleStyleChange(field, null);
  }

  function handleChordInput(raw: string) {
    if (!raw.trim()) return;
    const parsed = parseChordInput(raw, projectKey);
    if (parsed) {
      handleUpdate({ chordDegree: parsed.degree, chordQuality: parsed.quality, chordBassDegree: parsed.bassDegree });
    }
  }

  const chordDisplay = block.chordDegree
    ? formatChord(
        { id: '', projectId: '', barNumber: 0, degree: block.chordDegree, quality: block.chordQuality, bassDegree: block.chordBassDegree },
        projectKey,
        chordDisplayMode
      )
    : '';

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-xs text-base-content/40 px-1 capitalize">{instrument} · {barLabel}</div>

      {/* Chord field (pitched instruments only) */}
      {isPitched && (
        <div className="flex flex-col gap-1 px-1">
          <label className="text-xs text-base-content/50">Chord</label>
          <input
            type="text"
            className="input input-xs input-bordered font-mono"
            placeholder="e.g. Dm7, ii7, V7"
            defaultValue={chordDisplay}
            onBlur={(e) => handleChordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChordInput((e.target as HTMLInputElement).value); }}
          />
        </div>
      )}

      {/* Style dropdown */}
      <div className="flex flex-col gap-1 px-1">
        <label className="text-xs text-base-content/50">Style</label>
        <select
          className="select select-xs select-bordered w-full"
          value={block.style}
          onChange={(e) => handleUpdate({ style: e.target.value })}
        >
          {styleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Style overrides (Energy + Dynamics only at block level) */}
      <div className="flex flex-col gap-2 px-1">
        <span className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Overrides</span>
        <StyleControls
          genre={project.genre}
          subStyle={project.subStyle}
          energy={resolved.energy.value}
          groove={resolved.groove.value}
          swingPct={resolved.swingPct.value}
          dynamics={resolved.dynamics.value}
          energyInherited={isInherited(section, block, 'energy', 'block')}
          grooveInherited={true}
          swingInherited={true}
          dynamicsInherited={isInherited(section, block, 'dynamics', 'block')}
          onChange={handleStyleChange}
          onReset={handleReset}
        />
      </div>

      <div className="px-1 pt-2">
        <button className="btn btn-outline btn-sm w-full text-xs">
          Regenerate {barLabel}
        </button>
      </div>
    </div>
  );
}
