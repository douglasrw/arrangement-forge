// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Block, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';

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
  it('coordinates subsection readiness truth before the operator opens each section', () => {
    const mounted = renderLeftPanel({ mode: 'default' });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-left-panel-coordination="input first"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('The chord chart unlocks the rest of the panel');
    expect(mounted.container.textContent).toContain(
      'Start in Input. A chord chart enables generation and assistant requests, while style defaults are already available for the next pass.'
    );
    expect(mounted.container.textContent).toContain(
      'Enter chords, paste chart text, or import a plain-text file to enable generation.'
    );
    expect(mounted.container.textContent).toContain(
      'Genre, sub-style, and sliders shape the next generation pass before section or block overrides.'
    );
    expect(mounted.container.textContent).toContain(
      'Add a chord chart in Input before asking the assistant to generate or revise the arrangement.'
    );
  });

  it('keeps cross-section readiness honest while generation is running', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\nCmaj7 | Dm7 | G7 | Cmaj7',
      }),
    });
    useUiStore.setState({
      generationState: 'generating',
      systemStatus: 'generating',
    });

    const mounted = renderLeftPanel({ mode: 'default' });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-left-panel-coordination="active"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Arrangement generation is in progress');
    expect(mounted.container.textContent).toContain(
      'Input stays visible while the assistant waits and any style edits steer the next pass instead of this one.'
    );
    expect(mounted.container.textContent).toContain('Generation in progress');
    expect(mounted.container.textContent).toContain('Style edits steer the next run');
    expect(mounted.container.textContent).toContain('Assistant requests are paused');
    expect(mounted.container.textContent).toContain(
      'The current arrangement pass is still running, so new prompts unlock when it finishes.'
    );
  });

  it('keeps the panel-level coordination truth blocked when parse issues remain', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: 'Cmaj7 | xyz?? | %',
      }),
    });

    const mounted = renderLeftPanel({ mode: 'default' });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-left-panel-coordination="blocked"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Chord chart fixes are blocking generation');
    expect(mounted.container.textContent).toContain(
      'Fix the flagged bars in Input before asking the assistant to generate or revise the arrangement.'
    );
    expect(mounted.container.textContent).toContain('Chord chart needs fixes');
    expect(mounted.container.textContent).toContain(
      'Flagged bars would resolve to N.C. during generation. Fix the chart before generating.'
    );
  });

  it('keeps panel coordination blocked when the chart has structure but no playable bars', () => {
    useProjectStore.setState({
      project: makeProject({
        chordChartRaw: '[Verse]\n\nChorus:',
      }),
    });

    const mounted = renderLeftPanel({ mode: 'default' });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-left-panel-coordination="blocked"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Chord chart fixes are blocking generation');
    expect(mounted.container.textContent).toContain(
      'Flagged bars would resolve to N.C. during generation. Fix the chart before generating.'
    );
  });

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
      'Pattern, energy, and dynamics are the saved block settings here today.'
    );
    expect(mounted.container.textContent).toContain('Block Energy Override');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section energy default.'
    );
    expect(mounted.container.textContent).toContain('Block Dynamics Override');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project dynamics default.'
    );
    expect(mounted.container.textContent).toContain('Inherited Audio Truth');
    expect(mounted.container.textContent).toContain(
      'Use the mixer drawer to change this lane truth. Block-level audio overrides are not editable here yet.'
    );
    expect(mounted.container.textContent).toContain('Chord Scope Truth');
    expect(mounted.container.textContent).toContain(
      'No chord chart truth is loaded for bars 3 – 6, so scope is missing rather than hidden.'
    );
    expect(mounted.container.querySelector('#block-slider-Energy')).not.toBeNull();
    expect(mounted.container.querySelector('#block-slider-Dynamics')).not.toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-volume-slider"]')
    ).toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-pan-slider"]')
    ).toBeNull();
    expect(mounted.container.querySelector('#block-chord-override')).toBeNull();
    expect(mounted.container.textContent).toContain('Close inspector');
  });

  it('keeps chord palette selection truth visible after the panel returns to default mode', () => {
    useSelectionStore.setState({
      level: 'block',
      sectionId: null,
      blockId: 'block-1',
      stemId: 'stem-1',
    });

    const mounted = renderLeftPanel({ mode: 'default' });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Collapse');
    expect(mounted.container.textContent).not.toContain('Close inspector');
    expect(mounted.container.textContent).toContain('Block selected');
    expect(mounted.container.textContent).toContain(
      'The arrangement is currently focused on Bars 3-6, but block chord overrides are unavailable here today.'
    );
    expect(mounted.container.textContent).toContain('Piano block');

    act(() => {
      useSelectionStore.getState().selectSong();
    });

    expect(mounted.container.textContent).not.toContain('Block selected');
    expect(mounted.container.textContent).toContain('Empty chart');
    expect(mounted.container.textContent).toContain(
      'No song chord chart is loaded yet.'
    );
    expect(mounted.container.textContent).toContain('Whole song');
  });
});
