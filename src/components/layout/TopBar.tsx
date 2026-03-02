// TopBar.tsx — Persistent top bar with title row + params row.

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { useUndoStore } from '@/store/undo-store';
import { useAuthStore } from '@/store/auth-store';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { useGenerate } from '@/hooks/useGenerate';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TIME_SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'];

function TitleBar() {
  const { project, updateProject } = useProjectStore();
  const { undoStack, redoStack, canUndo, canRedo, undo, redo } = useUndoStore();
  const { generationState, unsavedChanges } = useUiStore();
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const { saveProject } = useProject();
  const navigate = useNavigate();
  const [saveFeedback, setSaveFeedback] = useState(false);

  const isPostGen = generationState === 'complete';
  const isGenerating = generationState === 'generating';

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  async function handleSave() {
    await saveProject();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1500);
  }

  function handleUndo() {
    const entry = undo();
    if (entry) {
      try {
        const state = JSON.parse(entry.stateBefore);
        if (state.blocks) useProjectStore.getState().setArrangement(state);
      } catch { /* invalid snapshot */ }
    }
  }

  function handleRedo() {
    const entry = redo();
    if (entry) {
      try {
        const state = JSON.parse(entry.stateAfter);
        if (state.blocks) useProjectStore.getState().setArrangement(state);
      } catch { /* invalid snapshot */ }
    }
  }

  return (
    <div className="flex items-center gap-3 h-11 px-4 border-b border-base-300">
      {/* Logo */}
      <button
        className="text-sm font-bold text-primary tracking-tight shrink-0 hover:opacity-80 transition-opacity"
        onClick={() => navigate('/library')}
      >
        ARRANGEMENT FORGE
      </button>

      {/* Project name */}
      <input
        type="text"
        className="input input-ghost input-sm text-center text-base-content font-medium flex-1 min-w-0 focus:bg-base-300/30"
        value={project?.name ?? ''}
        onChange={(e) => updateProject({ name: e.target.value })}
        onBlur={(e) => {
          if (!e.target.value.trim() && project) updateProject({ name: project.name || 'Untitled Project' });
        }}
        placeholder="Untitled Project"
      />

      {/* Actions group */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="btn btn-ghost btn-xs"
          onClick={handleUndo}
          disabled={!isPostGen || isGenerating || !canUndo()}
          title={canUndo() ? `Undo: ${undoStack[undoStack.length - 1]?.description}` : 'Nothing to undo'}
        >
          ↶
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={handleRedo}
          disabled={!isPostGen || isGenerating || !canRedo()}
          title={canRedo() ? `Redo: ${redoStack[redoStack.length - 1]?.description}` : 'Nothing to redo'}
        >
          ↷
        </button>

        <button
          className={`btn btn-ghost btn-xs ${unsavedChanges ? 'text-warning' : ''}`}
          onClick={handleSave}
        >
          {saveFeedback ? 'Saved ✓' : 'Save'}
        </button>

        {/* Export dropdown */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-xs"
            disabled={!isPostGen || isGenerating}
          >
            Export ▾
          </button>
          <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-200 border border-base-300 rounded-box w-52 p-1 shadow-lg z-50">
            {['MP3 (full mix)', 'WAV (full mix)', 'MIDI (all tracks)', 'Stems ZIP (WAV)', 'Stems ZIP (MIDI)'].map((item) => (
              <li key={item}>
                <span className="text-xs text-base-content/30 pointer-events-none">
                  {item} <span className="text-[10px] text-base-content/20">Coming soon</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          className="btn btn-ghost btn-xs"
          disabled
          title="Coming soon"
        >
          Share
        </button>

        {/* Account menu */}
        <div className="dropdown dropdown-end">
          <button tabIndex={0} className="btn btn-ghost btn-xs w-7 h-7 rounded-full bg-primary/20 text-primary font-bold p-0">
            {initials}
          </button>
          <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-200 border border-base-300 rounded-box w-48 p-1 shadow-lg z-50">
            <li><button onClick={() => navigate('/library')}>My Library</button></li>
            <li><button onClick={() => navigate('/settings')}>Account Settings</button></li>
            <li className="divider my-0" />
            <li><button onClick={() => signOut()}>Sign Out</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ParamsBar() {
  const { project, updateProject } = useProjectStore();
  const { generationState, chordDisplayMode, toggleChordDisplay } = useUiStore();
  const { runGeneration } = useGenerate();
  const [transposeOpen, setTransposeOpen] = useState(false);
  const [timeSigOpen, setTimeSigOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingTimeSig, setPendingTimeSig] = useState<string | null>(null);
  const prevKeyRef = useRef(project?.key ?? 'C');

  const isPostGen = generationState === 'complete';
  const isGenerating = generationState === 'generating';
  const disabled = isGenerating;

  if (!project) return null;

  const canGenerate =
    (project.chordChartRaw.trim().length > 0 || project.generationHints.trim().length > 0) &&
    !isGenerating;

  function handleKeyChange(newKey: string) {
    if (isPostGen) {
      setPendingKey(newKey);
      setTransposeOpen(true);
    } else {
      prevKeyRef.current = project!.key;
      updateProject({ key: newKey });
    }
  }

  function confirmTranspose() {
    if (pendingKey) {
      prevKeyRef.current = project!.key;
      updateProject({ key: pendingKey });
    }
    setPendingKey(null);
    setTransposeOpen(false);
  }

  function handleTimeSigChange(ts: string) {
    if (isPostGen) {
      setPendingTimeSig(ts);
      setTimeSigOpen(true);
    } else {
      updateProject({ timeSignature: ts });
    }
  }

  function confirmTimeSig() {
    if (pendingTimeSig) updateProject({ timeSignature: pendingTimeSig });
    setPendingTimeSig(null);
    setTimeSigOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-4 h-11 px-4">
        {/* KEY */}
        <div className="flex items-center gap-1.5 text-xs text-base-content/50">
          <span className="uppercase tracking-wider text-[10px]">Key</span>
          <select
            className="select select-ghost select-xs font-mono font-bold text-base-content min-w-[48px]"
            value={project.key}
            onChange={(e) => handleKeyChange(e.target.value)}
            disabled={disabled}
          >
            {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Chord display toggle */}
        <div className="join">
          <button
            className={`join-item btn btn-xs ${chordDisplayMode === 'letter' ? 'btn-neutral' : 'btn-ghost'}`}
            onClick={() => chordDisplayMode !== 'letter' && toggleChordDisplay()}
            title="Letter names (C, Dm7)"
          >
            A
          </button>
          <button
            className={`join-item btn btn-xs ${chordDisplayMode === 'roman' ? 'btn-neutral' : 'btn-ghost'}`}
            onClick={() => chordDisplayMode !== 'roman' && toggleChordDisplay()}
            title="Roman numerals (I, ii7)"
          >
            I
          </button>
        </div>

        {/* TEMPO */}
        <div className="flex items-center gap-1 text-xs text-base-content/50">
          <span className="uppercase tracking-wider text-[10px]">Tempo</span>
          <button
            className="btn btn-ghost btn-xs px-1"
            onClick={() => updateProject({ tempo: Math.max(40, project.tempo - 1) })}
            disabled={disabled}
          >◀</button>
          <input
            type="number"
            className="input input-ghost input-xs w-12 text-center font-mono font-bold text-base-content"
            min={40}
            max={240}
            value={project.tempo}
            onChange={(e) => updateProject({ tempo: Math.max(40, Math.min(240, parseInt(e.target.value) || 120)) })}
            disabled={disabled}
          />
          <button
            className="btn btn-ghost btn-xs px-1"
            onClick={() => updateProject({ tempo: Math.min(240, project.tempo + 1) })}
            disabled={disabled}
          >▶</button>
          <span className="text-[10px] text-base-content/30">BPM</span>
        </div>

        {/* TIME SIGNATURE */}
        <div className="flex items-center gap-1.5 text-xs text-base-content/50">
          <span className="uppercase tracking-wider text-[10px]">Time</span>
          <select
            className="select select-ghost select-xs font-mono font-bold text-base-content"
            value={project.timeSignature}
            onChange={(e) => handleTimeSigChange(e.target.value)}
            disabled={disabled}
          >
            {TIME_SIGS.map((ts) => <option key={ts} value={ts}>{ts}</option>)}
          </select>
        </div>

        <div className="flex-1" />

        {/* GENERATE button */}
        <button
          className={`btn btn-sm ${isGenerating ? 'btn-disabled' : isPostGen ? 'btn-outline btn-primary' : 'btn-primary'} min-w-[120px]`}
          disabled={!canGenerate}
          id="generate-btn"
          onClick={() => isPostGen ? setRegenOpen(true) : runGeneration(false)}
        >
          {isGenerating
            ? <><span className="loading loading-spinner loading-xs" /> Generating...</>
            : isPostGen ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {/* Regenerate confirm */}
      <ConfirmDialog
        open={regenOpen}
        title="Regenerate Arrangement?"
        message="This will replace your current arrangement. You can restore it with Undo."
        confirmLabel="Regenerate"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { setRegenOpen(false); runGeneration(true); }}
        onCancel={() => setRegenOpen(false)}
      />

      {/* Transpose confirm */}
      <ConfirmDialog
        open={transposeOpen}
        title="Transpose Arrangement?"
        message={`Changing key from ${project.key} to ${pendingKey} will transpose all chords and notes.`}
        confirmLabel="Transpose"
        cancelLabel="Cancel"
        onConfirm={confirmTranspose}
        onCancel={() => { setPendingKey(null); setTransposeOpen(false); }}
      />

      {/* Time sig confirm */}
      <ConfirmDialog
        open={timeSigOpen}
        title="Change Time Signature?"
        message={`Changing from ${project.timeSignature} to ${pendingTimeSig} requires regenerating the entire arrangement.`}
        confirmLabel="Change & Regenerate"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmTimeSig}
        onCancel={() => { setPendingTimeSig(null); setTimeSigOpen(false); }}
      />
    </>
  );
}

export function TopBar() {
  return (
    <div className="bg-base-200 border-b border-base-300 shrink-0">
      <TitleBar />
      <ParamsBar />
    </div>
  );
}
