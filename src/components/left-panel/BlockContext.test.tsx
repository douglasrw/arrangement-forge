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

function setRangeValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
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
  it('keeps block energy override truth visible across inherit, save, and clear', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection({ energyOverride: 75 })],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const energySlider = mounted.container.querySelector(
      '#block-slider-Energy'
    ) as HTMLInputElement | null;
    const energyResetButton = mounted.container.querySelector(
      '#block-reset-Energy'
    ) as HTMLButtonElement | null;

    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(mounted.container.textContent).toContain(
      'Pattern and energy override are the saved block settings here today.'
    );
    expect(mounted.container.textContent).toContain('Block Energy Override');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section energy default.'
    );
    expect(mounted.container.textContent).toContain('Section default: High (75)');
    expect(mounted.container.textContent).toContain('Unavailable In This Build');
    expect(mounted.container.textContent).toContain(
      'Volume, pan, dynamics, and custom chord overrides are not editable per block here yet.'
    );
    expect(mounted.container.textContent).toContain(
      'This inspector now edits saved pattern and energy truth. Other block-specific controls still inherit from the mixer, section style cascade, or chord chart defaults.'
    );
    expect(mounted.container.querySelector('#block-pattern-select')).not.toBeNull();
    expect(energySlider?.value).toBe('75');
    expect(energyResetButton?.disabled).toBe(true);
    expect(
      mounted.container.querySelector('label[for="block-volume-slider"]')
    ).toBeNull();
    expect(
      mounted.container.querySelector('label[for="block-pan-slider"]')
    ).toBeNull();
    expect(mounted.container.querySelector('#block-chord-override')).toBeNull();

    act(() => {
      if (energySlider) {
        setRangeValue(energySlider, '33');
      }
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: 33,
    });
    expect(energySlider?.value).toBe('33');
    expect(energyResetButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved energy override.'
    );

    act(() => {
      energyResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: null,
    });
    expect(energySlider?.value).toBe('75');
    expect(energyResetButton?.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section energy default.'
    );
  });

  it('falls back to the project energy default when the section does not override it', () => {
    useProjectStore.setState({
      project: makeProject({ energy: 22 }),
      stems: [makeStem()],
      sections: [makeSection({ energyOverride: null })],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const energySlider = mounted.container.querySelector(
      '#block-slider-Energy'
    ) as HTMLInputElement | null;
    const energyResetButton = mounted.container.querySelector(
      '#block-reset-Energy'
    ) as HTMLButtonElement | null;

    expect(energySlider?.value).toBe('22');
    expect(energyResetButton?.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project energy default.'
    );
    expect(mounted.container.textContent).toContain('Project default: Laid (22)');

    act(() => {
      if (energySlider) {
        setRangeValue(energySlider, '91');
      }
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: 91,
    });
    expect(energyResetButton?.disabled).toBe(false);

    act(() => {
      energyResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: null,
    });
    expect(energySlider?.value).toBe('22');
    expect(energyResetButton?.disabled).toBe(true);
  });
});
