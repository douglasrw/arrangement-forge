// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Block, Chord, Project, Section, Stem } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { useUiStore } from '@/store/ui-store';
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

function makeChord(partial: Partial<Chord> = {}): Chord {
  return {
    id: 'chord-1',
    projectId: 'project-1',
    barNumber: 3,
    degree: 'ii',
    quality: 'min7',
    bassDegree: null,
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

function expectNoLegacyUnavailablePanel(text: string) {
  expect(text).not.toContain('Unavailable In This Build');
  expect(text).not.toContain(
    'Volume, pan, and custom chord overrides are not editable per block here yet.'
  );
  expect(text).not.toContain(
    'This inspector now edits saved pattern, energy, and dynamics truth. Other block-specific controls still inherit from the mixer, section style cascade, or chord chart defaults.'
  );
  expect(text).not.toContain('Custom Chord Overrides');
}

function getBlockScopeBadge(container: HTMLElement) {
  return container.querySelector('[data-scope="block"]') as
    | HTMLSpanElement
    | null;
}

function getBlockReadinessCard(container: HTMLElement) {
  return container.querySelector('[data-block-context-readiness]') as
    | HTMLDivElement
    | null;
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

  useUiStore.setState({
    chordDisplayMode: 'letter',
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
  it('reads saved block energy and dynamics overrides from persisted block state on first render', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection({ energyOverride: 75, dynamicsOverride: 76 })],
      blocks: [makeBlock({ energyOverride: 33, dynamicsOverride: 18 })],
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
    const dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    const dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;

    expect(energySlider?.value).toBe('33');
    expect(energyResetButton?.disabled).toBe(false);
    expect(dynamicsSlider?.value).toBe('18');
    expect(dynamicsResetButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved energy override.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved dynamics override.'
    );
    expect(mounted.container.textContent).toContain('Laid (33)');
    expect(mounted.container.textContent).toContain('pp (18)');
    expect(mounted.container.textContent).toContain('Section default: High (75)');
    expect(mounted.container.textContent).toContain('Section default: f (76)');
  });

  it('keeps block energy and dynamics override truth visible across inherit, save, and clear', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection({ energyOverride: 75, dynamicsOverride: 76 })],
      blocks: [makeBlock()],
      chords: [
        makeChord({ id: 'chord-1', barNumber: 3, degree: 'ii', quality: 'min7' }),
        makeChord({ id: 'chord-2', barNumber: 5, degree: 'V', quality: 'dom7' }),
      ],
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
    const dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    const dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;
    const scopeBadge = getBlockScopeBadge(mounted.container);
    const readiness = getBlockReadinessCard(mounted.container);

    expect(readiness?.getAttribute('data-block-context-readiness')).toBe('ready');
    expect(readiness?.textContent).toContain('Ready');
    expect(readiness?.textContent).toContain('Block context ready');
    expect(readiness?.textContent).toContain(
      'The current block and its parent section are both live, so this inspector is reading real block truth.'
    );
    expect(readiness?.textContent).toContain('Current block');
    expect(readiness?.textContent).toContain('Piano Bars 3 – 6');
    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(mounted.container.textContent).toContain('Block Inspector');
    expect(scopeBadge?.textContent).toBe('Block Active');
    expect(scopeBadge?.getAttribute('data-scope-tone')).toBe('default');
    expect(mounted.container.textContent).toContain(
      'Active scope: Piano block across bars 3 – 6.'
    );
    expect(mounted.container.textContent).toContain(
      'Pattern, energy, and dynamics are the saved block settings here today.'
    );
    expect(mounted.container.textContent).toContain('Block Energy Override');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section energy default.'
    );
    expect(mounted.container.textContent).toContain('Section default: High (75)');
    expect(mounted.container.textContent).toContain('Block Dynamics Override');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section dynamics default.'
    );
    expect(mounted.container.textContent).toContain('Section default: f (76)');
    expect(mounted.container.textContent).toContain('Inherited Audio Truth');
    expect(mounted.container.textContent).toContain(
      'This block inherits volume and pan from the current piano mixer lane.'
    );
    expect(
      mounted.container
        .querySelector('#block-audio-truth-card')
        ?.getAttribute('data-truth-tone')
    ).toBe('default');
    expect(
      mounted.container
        .querySelector('#block-chord-truth-card')
        ?.getAttribute('data-truth-tone')
    ).toBe('default');
    expect(mounted.container.textContent).toContain(
      'Use the mixer drawer to change this lane truth. Block-level audio overrides are not editable here yet.'
    );
    expect(
      (
        mounted.container.querySelector('#block-audio-volume-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('-2 dB');
    expect(
      (
        mounted.container.querySelector('#block-audio-pan-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('C');
    expect(mounted.container.textContent).toContain('Chord Scope Truth');
    expect(mounted.container.textContent).toContain(
      'This block is currently following the chord chart across bars 3 – 6.'
    );
    expect(mounted.container.textContent).toContain(
      'Per-block chord overrides are still unavailable here, so the chord chart remains the active chord source of truth.'
    );
    expect(mounted.container.textContent).toContain('Bar 3');
    expect(mounted.container.textContent).toContain('Dm7');
    expect(mounted.container.textContent).toContain('Bar 5');
    expect(mounted.container.textContent).toContain('G7');
    expect(mounted.container.querySelector('#block-pattern-select')).not.toBeNull();
    expect(energySlider?.value).toBe('75');
    expect(energyResetButton?.disabled).toBe(true);
    expect(dynamicsSlider?.value).toBe('76');
    expect(dynamicsResetButton?.disabled).toBe(true);
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

    act(() => {
      if (dynamicsSlider) {
        setRangeValue(dynamicsSlider, '18');
      }
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: 33,
      dynamicsOverride: 18,
    });
    expect(energySlider?.value).toBe('33');
    expect(energyResetButton?.disabled).toBe(false);
    expect(dynamicsSlider?.value).toBe('18');
    expect(dynamicsResetButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved energy override.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved dynamics override.'
    );

    act(() => {
      energyResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    act(() => {
      dynamicsResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: null,
      dynamicsOverride: null,
    });
    expect(energySlider?.value).toBe('75');
    expect(energyResetButton?.disabled).toBe(true);
    expect(dynamicsSlider?.value).toBe('76');
    expect(dynamicsResetButton?.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section energy default.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the section dynamics default.'
    );
  });

  it('falls back to the project energy and dynamics defaults when the section does not override them', () => {
    useProjectStore.setState({
      project: makeProject({ energy: 22, dynamics: 76 }),
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
    const dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    const dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;

    expect(energySlider?.value).toBe('22');
    expect(energyResetButton?.disabled).toBe(true);
    expect(dynamicsSlider?.value).toBe('76');
    expect(dynamicsResetButton?.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project energy default.'
    );
    expect(mounted.container.textContent).toContain('Project default: Laid (22)');
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project dynamics default.'
    );
    expect(mounted.container.textContent).toContain('Project default: f (76)');

    act(() => {
      if (energySlider) {
        setRangeValue(energySlider, '91');
      }
    });

    act(() => {
      if (dynamicsSlider) {
        setRangeValue(dynamicsSlider, '18');
      }
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: 91,
      dynamicsOverride: 18,
    });
    expect(energyResetButton?.disabled).toBe(false);
    expect(dynamicsResetButton?.disabled).toBe(false);

    act(() => {
      energyResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    act(() => {
      dynamicsResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(useProjectStore.getState().blocks[0]).toMatchObject({
      energyOverride: null,
      dynamicsOverride: null,
    });
    expect(energySlider?.value).toBe('22');
    expect(energyResetButton?.disabled).toBe(true);
    expect(dynamicsSlider?.value).toBe('76');
    expect(dynamicsResetButton?.disabled).toBe(true);
  });

  it('distinguishes missing block audio data from inherited mixer truth when the matching stem is absent', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: true }),
      stems: [],
      sections: [makeSection()],
      blocks: [makeBlock({ stemId: 'missing-stem' })],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Inherited Audio Truth');
    expect(mounted.container.textContent).toContain(
      'No current piano stem is loaded for this arrangement, so block audio truth is missing rather than hidden.'
    );
    expect(
      mounted.container
        .querySelector('#block-audio-truth-card')
        ?.getAttribute('data-truth-tone')
    ).toBe('missing');
    expect(
      mounted.container
        .querySelector('#block-audio-truth-badge')
        ?.getAttribute('data-truth-tone')
    ).toBe('missing');
    expect(
      (
        mounted.container.querySelector('#block-audio-volume-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('--');
    expect(
      (
        mounted.container.querySelector('#block-audio-pan-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('--');
    expect(mounted.container.textContent).toContain(
      'Restore the matching mixer lane before expecting inherited block volume or pan truth here.'
    );
  });

  it('distinguishes missing chart-derived chord scope from hidden block override truth', () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: '' }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Chord Scope Truth');
    expect(mounted.container.textContent).toContain(
      'No chord chart truth is loaded for bars 3 – 6, so scope is missing rather than hidden.'
    );
    expect(
      mounted.container
        .querySelector('#block-chord-truth-card')
        ?.getAttribute('data-truth-tone')
    ).toBe('missing');
    expect(
      mounted.container
        .querySelector('#block-chord-truth-badge')
        ?.getAttribute('data-truth-tone')
    ).toBe('missing');
    expect(mounted.container.textContent).toContain('Range');
    expect(mounted.container.textContent).toContain('No chord chart');
    expect(mounted.container.textContent).toContain(
      'Add or generate chord chart data before expecting chart-derived block chord scope here.'
    );
  });

  it('keeps inherited audio truth and chord scope truth out of the old generic unavailable panel', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem({ volume: 0.8, pan: 0.25 })],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [
        makeChord({ id: 'chord-1', barNumber: 3, degree: 'ii', quality: 'min7' }),
        makeChord({ id: 'chord-2', barNumber: 5, degree: 'V', quality: 'dom7' }),
      ],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const text = mounted.container.textContent ?? '';

    expect(text).toContain('Inherited Audio Truth');
    expect(text).toContain(
      'This block inherits volume and pan from the current piano mixer lane.'
    );
    expect(text).toContain('Chord Scope Truth');
    expect(text).toContain(
      'This block is currently following the chord chart across bars 3 – 6.'
    );
    expectNoLegacyUnavailablePanel(text);
  });

  it('distinguishes missing arrangement audio from stem-missing truth and generic unavailable copy', () => {
    useProjectStore.setState({
      project: makeProject({ hasArrangement: false }),
      stems: [],
      sections: [makeSection()],
      blocks: [makeBlock({ stemId: 'missing-stem' })],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const text = mounted.container.textContent ?? '';

    expect(text).toContain('Inherited Audio Truth');
    expect(text).toContain(
      'This block has no arrangement audio yet, so block audio truth is missing rather than hidden.'
    );
    expect(text).toContain('Arrangement audio missing');
    expect(text).not.toContain(
      'No current piano stem is loaded for this arrangement, so block audio truth is missing rather than hidden.'
    );
    expect(text).not.toContain(
      'Restore the matching mixer lane before expecting inherited block volume or pan truth here.'
    );
    expect(text).toContain(
      'Generate or import an arrangement to create inherited mixer volume and pan truth for this block.'
    );
    expect(
      (
        mounted.container.querySelector('#block-audio-volume-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('--');
    expect(
      (
        mounted.container.querySelector('#block-audio-pan-value') as
          | HTMLSpanElement
          | null
      )?.textContent
    ).toBe('--');
    expectNoLegacyUnavailablePanel(text);
  });

  it('distinguishes chart truth outside the block range from missing chart truth and generic unavailable copy', () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: 'ii-7 | V7 | Imaj7' }),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [makeBlock()],
      chords: [
        makeChord({ id: 'chord-1', barNumber: 1, degree: 'ii', quality: 'min7' }),
        makeChord({ id: 'chord-2', barNumber: 8, degree: 'I', quality: 'maj7' }),
      ],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const text = mounted.container.textContent ?? '';

    expect(text).toContain('Chord Scope Truth');
    expect(text).toContain(
      'The chord chart has no entries inside bars 3 – 6, so this block has no chart-derived chord changes to follow right now.'
    );
    expect(text).toContain('Range');
    expect(text).toContain('No chord entries');
    expect(text).not.toContain(
      'No chord chart truth is loaded for bars 3 – 6, so scope is missing rather than hidden.'
    );
    expect(text).not.toContain(
      'Add or generate chord chart data before expecting chart-derived block chord scope here.'
    );
    expect(text).toContain(
      'Per-block chord overrides are still unavailable here, so there is no narrower block-specific scope to reveal instead.'
    );
    expectNoLegacyUnavailablePanel(text);
  });

  it('marks a missing selected block as missing scope instead of a normal ready badge', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [makeSection()],
      blocks: [],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    useSelectionStore.setState({
      level: 'block',
      sectionId: 'section-1',
      blockId: 'missing-block',
      stemId: 'stem-1',
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const scopeBadge = getBlockScopeBadge(mounted.container);
    const readiness = getBlockReadinessCard(mounted.container);

    expect(readiness?.getAttribute('data-block-context-readiness')).toBe('blocked');
    expect(readiness?.textContent).toContain('Selected block missing');
    expect(readiness?.textContent).toContain(
      'The current selection no longer resolves to a live block, so this inspector cannot read saved block truth.'
    );
    expect(readiness?.textContent).toContain('Last requested block');
    expect(readiness?.textContent).toContain('Piano Bars 1 – 2');
    expect(scopeBadge?.textContent).toBe('Block Missing');
    expect(scopeBadge?.getAttribute('data-scope-tone')).toBe('missing');
    expect(mounted.container.textContent).toContain('Block unavailable');
    expect(mounted.container.textContent).toContain(
      'Last requested block: Piano across bars 1 – 2.'
    );
    expect(mounted.container.textContent).toContain(
      'The selected block is no longer available, so block scope is missing rather than ready.'
    );
  });

  it('refreshes override truth when selection moves between blocks with different saved state', () => {
    useProjectStore.setState({
      project: makeProject({ energy: 22, dynamics: 76 }),
      stems: [makeStem()],
      sections: [
        makeSection({ id: 'section-1', energyOverride: 75, dynamicsOverride: 84 }),
        makeSection({
          id: 'section-2',
          name: 'Chorus',
          sortOrder: 1,
          startBar: 9,
          energyOverride: null,
          dynamicsOverride: null,
        }),
      ],
      blocks: [
        makeBlock({ id: 'block-1', energyOverride: 33, dynamicsOverride: 18 }),
        makeBlock({
          id: 'block-2',
          sectionId: 'section-2',
          startBar: 9,
          endBar: 12,
          style: 'jazz_ballad_voicing',
          energyOverride: null,
          dynamicsOverride: null,
        }),
      ],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let energySlider = mounted.container.querySelector(
      '#block-slider-Energy'
    ) as HTMLInputElement | null;
    let energyResetButton = mounted.container.querySelector(
      '#block-reset-Energy'
    ) as HTMLButtonElement | null;
    let dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    let dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;

    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(energySlider?.value).toBe('33');
    expect(energyResetButton?.disabled).toBe(false);
    expect(dynamicsSlider?.value).toBe('18');
    expect(dynamicsResetButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved energy override.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved dynamics override.'
    );

    act(() => {
      useSelectionStore.getState().selectBlock('block-2', 'stem-1');
    });

    energySlider = mounted.container.querySelector(
      '#block-slider-Energy'
    ) as HTMLInputElement | null;
    energyResetButton = mounted.container.querySelector(
      '#block-reset-Energy'
    ) as HTMLButtonElement | null;
    dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;

    expect(mounted.container.textContent).toContain('Bars 9 – 12');
    expect(energySlider?.value).toBe('22');
    expect(energyResetButton?.disabled).toBe(true);
    expect(dynamicsSlider?.value).toBe('76');
    expect(dynamicsResetButton?.disabled).toBe(true);
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project energy default.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is inheriting the project dynamics default.'
    );
    expect(mounted.container.textContent).toContain('Project default: Laid (22)');
    expect(mounted.container.textContent).toContain('Project default: f (76)');

    act(() => {
      useSelectionStore.getState().selectBlock('block-1', 'stem-1');
    });

    energySlider = mounted.container.querySelector(
      '#block-slider-Energy'
    ) as HTMLInputElement | null;
    energyResetButton = mounted.container.querySelector(
      '#block-reset-Energy'
    ) as HTMLButtonElement | null;
    dynamicsSlider = mounted.container.querySelector(
      '#block-slider-Dynamics'
    ) as HTMLInputElement | null;
    dynamicsResetButton = mounted.container.querySelector(
      '#block-reset-Dynamics'
    ) as HTMLButtonElement | null;

    expect(mounted.container.textContent).toContain('Bars 3 – 6');
    expect(energySlider?.value).toBe('33');
    expect(energyResetButton?.disabled).toBe(false);
    expect(dynamicsSlider?.value).toBe('18');
    expect(dynamicsResetButton?.disabled).toBe(false);
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved energy override.'
    );
    expect(mounted.container.textContent).toContain(
      'This block is carrying its own saved dynamics override.'
    );
  });

  it('shows a waiting readiness state when no block is selected yet', () => {
    useSelectionStore.setState({
      level: 'song',
      sectionId: null,
      blockId: null,
      stemId: null,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = getBlockReadinessCard(mounted.container);

    expect(readiness?.getAttribute('data-block-context-readiness')).toBe('waiting');
    expect(readiness?.textContent).toContain('Choose a block');
    expect(readiness?.textContent).toContain(
      'No live block is selected yet, so this inspector is waiting for a block before it can show saved block truth.'
    );
    expect(readiness?.textContent).toContain('Inspector fallback');
    expect(readiness?.textContent).toContain('Piano Bars 1 – 2');
  });

  it('shows a blocked readiness state when the block survives but its section context is missing', () => {
    useProjectStore.setState({
      project: makeProject(),
      stems: [makeStem()],
      sections: [],
      blocks: [makeBlock()],
      chords: [],
      chatMessages: [],
      drumOnlyUpdate: false,
      allInstrumentsUpdate: false,
    });

    const mounted = renderBlockContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const readiness = getBlockReadinessCard(mounted.container);

    expect(readiness?.getAttribute('data-block-context-readiness')).toBe('blocked');
    expect(readiness?.textContent).toContain('Section context missing');
    expect(readiness?.textContent).toContain(
      'The selected block still exists, but its parent section does not, so inherited block defaults are blocked.'
    );
    expect(readiness?.textContent).toContain('Affected block');
    expect(readiness?.textContent).toContain('Piano Bars 3 – 6');
  });
});
