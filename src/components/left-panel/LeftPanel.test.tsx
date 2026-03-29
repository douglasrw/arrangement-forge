// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';

vi.mock('./InputSection', () => ({
  InputSection: () => <div data-testid="input-section">Input</div>,
}));

vi.mock('./StyleControlsSection', () => ({
  StyleControlsSection: () => <div data-testid="style-controls-section">Style Controls</div>,
}));

vi.mock('./AiAssistantSection', () => ({
  AiAssistantSection: () => <div data-testid="ai-assistant-section">AI Assistant</div>,
}));

import { LeftPanel, type PanelContext } from './LeftPanel';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Inspector Truth Demo',
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

function makeSection(partial: Partial<Section> = {}): Section {
  return {
    id: 'section-1',
    projectId: 'project-1',
    name: 'Verse',
    sortOrder: 0,
    barCount: 8,
    startBar: 1,
    energyOverride: 75,
    grooveOverride: null,
    feelOverride: null,
    swingPctOverride: null,
    dynamicsOverride: null,
    createdAt: '2026-03-29T00:00:00Z',
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

function renderLeftPanel(context: PanelContext) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<LeftPanel context={context} />);
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

  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    unsavedChanges: false,
    lastSavedAt: null,
  });

  useSelectionStore.setState({
    level: 'section',
    sectionId: 'section-1',
    blockId: null,
    stemId: null,
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

describe('LeftPanel inspector truth regression', () => {
  it('keeps the operator-visible inspector honest across section and block contexts', () => {
    const mounted = renderLeftPanel({
      mode: 'section',
      sectionName: 'Fallback Section',
      sectionBars: 4,
    });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Section Inspector');
    expect(mounted.container.textContent).toContain(
      'Section Energy Override'
    );
    expect(mounted.container.textContent).toContain(
      'Section Groove Override'
    );
    expect(mounted.container.textContent).toContain(
      'Section Feel Override'
    );
    expect(mounted.container.textContent).toContain(
      'Section Dynamics Override'
    );
    expect(mounted.container.querySelector('#section-slider-Energy')).not.toBeNull();
    expect(mounted.container.querySelector('#section-slider-Groove')).not.toBeNull();
    expect(mounted.container.querySelector('#section-slider-Feel')).not.toBeNull();
    expect(mounted.container.querySelector('#section-slider-Dynamics')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Close inspector');

    act(() => {
      useSelectionStore.setState({
        level: 'block',
        sectionId: null,
        blockId: 'block-1',
        stemId: 'stem-1',
      });

      mounted.root.render(
        <LeftPanel
          context={{
            mode: 'block',
            instrument: 'piano',
            styleName: 'unused-fallback',
            startBar: 1,
            endBar: 2,
          }}
        />
      );
    });

    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(mounted.container.textContent).toContain(
      'Pattern is the only saved block setting here today.'
    );
    expect(mounted.container.textContent).toContain('Unavailable In This Build');
    expect(mounted.container.textContent).toContain(
      'Volume, pan, and custom chord overrides are not saved per block yet.'
    );
    expect(
      mounted.container.querySelector('label[for="block-volume-slider"]')
    ).toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-pan-slider"]')
    ).toBeNull();
    expect(mounted.container.querySelector('#block-chord-override')).toBeNull();
    expect(mounted.container.textContent).toContain('Close inspector');
  });
});
