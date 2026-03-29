// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Block, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { BlockContext } from './BlockContext';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Truth Surface Demo',
    key: 'C',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    subStyle: 'Swing',
    energy: 50,
    groove: 50,
    feel: 50,
    swingPct: null,
    dynamics: 50,
    generationHints: '',
    chordChartRaw: '',
    hasArrangement: true,
    generatedAt: '2026-03-29T00:00:00Z',
    generatedTempo: 120,
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeStem(partial: Partial<Stem> = {}): Stem {
  return {
    id: 'stem-1',
    projectId: 'project-1',
    instrument: 'piano',
    sortOrder: 0,
    volume: 0.8,
    pan: 0,
    isMuted: false,
    isSolo: false,
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeSection(partial: Partial<Section> = {}): Section {
  return {
    id: 'section-1',
    projectId: 'project-1',
    name: 'Verse',
    sortOrder: 0,
    barCount: 8,
    startBar: 1,
    energyOverride: null,
    grooveOverride: null,
    feelOverride: null,
    swingPctOverride: null,
    dynamicsOverride: null,
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function makeBlock(partial: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    stemId: 'stem-1',
    sectionId: 'section-1',
    startBar: 3,
    endBar: 6,
    chordDegree: 'I',
    chordQuality: 'maj7',
    chordBassDegree: null,
    style: 'jazz_comp',
    energyOverride: null,
    dynamicsOverride: null,
    midiData: [
      {
        note: 'C4',
        time: 0,
        duration: 1,
        velocity: 96,
      },
    ],
    createdAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function renderBlockContext() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <BlockContext
        instrument="piano"
        styleName="unused-fallback"
        startBar={1}
        endBar={2}
      />
    );
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;

  useProjectStore.setState({
    project: makeProject(),
    stems: [makeStem()],
    sections: [makeSection()],
    blocks: [makeBlock()],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
  });

  useSelectionStore.setState({
    level: 'block',
    sectionId: null,
    blockId: 'block-1',
    stemId: 'stem-1',
  });
});

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
  useSelectionStore.getState().clearSelection();
});

describe('BlockContext truth surface', () => {
  it('shows the saved block edit and replaces unsupported local-only controls with explicit status', () => {
    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(mounted.container.textContent).toContain(
      'Pattern is the only saved block setting here today.'
    );
    expect(mounted.container.textContent).toContain('Unavailable In This Build');
    expect(mounted.container.textContent).toContain(
      'Volume, pan, and custom chord overrides are not saved per block yet.'
    );
    expect(mounted.container.textContent).toContain(
      'Block playback follows the mixer and section chord chart today, so this inspector only edits the saved pattern assignment.'
    );
    expect(mounted.container.querySelector('#block-pattern-select')).not.toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-volume-slider"]')
    ).toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-pan-slider"]')
    ).toBeNull();
    expect(mounted.container.querySelector('#block-chord-override')).toBeNull();
  });
});
