// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project, Section } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useSelectionStore } from '@/store/selection-store';
import { SectionContext } from './SectionContext';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Section Truth Demo',
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

function renderSectionContext() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <SectionContext
        sectionName="Fallback Section"
        sectionBars={4}
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
    sections: [makeSection()],
    blocks: [],
    stems: [],
    chords: [],
    chatMessages: [],
    drumOnlyUpdate: false,
    allInstrumentsUpdate: false,
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

describe('SectionContext truth surface', () => {
  it('keeps saved section edits active while removing fake style controls', () => {
    const mounted = renderSectionContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const nameInput = mounted.container.querySelector(
      '#section-name-input'
    ) as HTMLInputElement | null;
    const plusButton = Array.from(
      mounted.container.querySelectorAll('button')
    ).find((button) => button.textContent?.trim() === '+');

    expect(nameInput?.value).toBe('Verse');
    expect(mounted.container.textContent).toContain('8 bars');
    expect(mounted.container.textContent).toContain('Style Overrides Unavailable');
    expect(mounted.container.textContent).toContain(
      'This inspector updates the saved section name and length only.'
    );
    expect(mounted.container.textContent).toContain(
      'Per-section genre, sub-style, energy, groove, feel, swing, and dynamics are not editable here yet.'
    );
    expect(mounted.container.textContent).toContain(
      'This section already carries saved style override data, but this build does not expose those fields in the inspector.'
    );
    expect(mounted.container.querySelector('#section-genre-select')).toBeNull();
    expect(mounted.container.querySelector('#section-substyle-select')).toBeNull();
    expect(mounted.container.querySelector('#section-slider-Energy')).toBeNull();

    act(() => {
      if (nameInput) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(nameInput, 'Bridge');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
      }
    });

    act(() => {
      plusButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const updatedSection = useProjectStore.getState().sections[0];
    expect(updatedSection?.name).toBe('Bridge');
    expect(updatedSection?.barCount).toBe(12);
  });
});
