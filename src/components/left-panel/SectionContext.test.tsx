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
  it('keeps saved section edits active while exposing saved energy, groove, feel, and dynamics override paths', () => {
    const mounted = renderSectionContext();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const nameInput = mounted.container.querySelector(
      '#section-name-input'
    ) as HTMLInputElement | null;
    const plusButton = Array.from(
      mounted.container.querySelectorAll('button')
    ).find((button) => button.textContent?.trim() === '+');
    const energyResetButton = mounted.container.querySelector(
      '#section-reset-Energy'
    ) as HTMLButtonElement | null;
    const grooveResetButton = mounted.container.querySelector(
      '#section-reset-Groove'
    ) as HTMLButtonElement | null;
    const feelResetButton = mounted.container.querySelector(
      '#section-reset-Feel'
    ) as HTMLButtonElement | null;
    const dynamicsResetButton = mounted.container.querySelector(
      '#section-reset-Dynamics'
    ) as HTMLButtonElement | null;
    const energySlider = mounted.container.querySelector(
      '#section-slider-Energy'
    ) as HTMLInputElement | null;
    const grooveSlider = mounted.container.querySelector(
      '#section-slider-Groove'
    ) as HTMLInputElement | null;
    const feelSlider = mounted.container.querySelector(
      '#section-slider-Feel'
    ) as HTMLInputElement | null;
    const dynamicsSlider = mounted.container.querySelector(
      '#section-slider-Dynamics'
    ) as HTMLInputElement | null;

    expect(nameInput?.value).toBe('Verse');
    expect(mounted.container.textContent).toContain('8 bars');
    expect(mounted.container.textContent).toContain(
      'Section Energy Override'
    );
    expect(mounted.container.textContent).toContain(
      'This section is carrying its own saved energy override.'
    );
    expect(mounted.container.textContent).toContain(
      'Project default: Med (50)'
    );
    expect(mounted.container.textContent).toContain(
      'Section Groove Override'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project groove default.'
    );
    expect(mounted.container.textContent).toContain(
      'Project default: Standard (50)'
    );
    expect(mounted.container.textContent).toContain(
      'Section Feel Override'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project feel default.'
    );
    expect(mounted.container.textContent).toContain(
      'Project default: Natural (50)'
    );
    expect(mounted.container.textContent).toContain(
      'Section Dynamics Override'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project dynamics default.'
    );
    expect(mounted.container.textContent).toContain(
      'Project default: mp (50)'
    );
    expect(mounted.container.textContent).toContain(
      'Swing is not editable per section here yet.'
    );
    expect(energySlider?.value).toBe('75');
    expect(grooveSlider?.value).toBe('50');
    expect(feelSlider?.value).toBe('50');
    expect(dynamicsSlider?.value).toBe('50');

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

    act(() => {
      if (energySlider) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(energySlider, '33');
        energySlider.dispatchEvent(new Event('input', { bubbles: true }));
        energySlider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    act(() => {
      if (grooveSlider) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(grooveSlider, '68');
        grooveSlider.dispatchEvent(new Event('input', { bubbles: true }));
        grooveSlider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    act(() => {
      if (feelSlider) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(feelSlider, '74');
        feelSlider.dispatchEvent(new Event('input', { bubbles: true }));
        feelSlider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    act(() => {
      if (dynamicsSlider) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(dynamicsSlider, '82');
        dynamicsSlider.dispatchEvent(new Event('input', { bubbles: true }));
        dynamicsSlider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const updatedSection = useProjectStore.getState().sections[0];
    expect(updatedSection?.name).toBe('Bridge');
    expect(updatedSection?.barCount).toBe(12);
    expect(updatedSection?.energyOverride).toBe(33);
    expect(updatedSection?.grooveOverride).toBe(68);
    expect(updatedSection?.feelOverride).toBe(74);
    expect(updatedSection?.dynamicsOverride).toBe(82);
    expect(mounted.container.textContent).toContain(
      'This section is carrying its own saved groove override.'
    );
    expect(mounted.container.textContent).toContain(
      'This section is carrying its own saved feel override.'
    );
    expect(mounted.container.textContent).toContain(
      'This section is carrying its own saved dynamics override.'
    );

    act(() => {
      energyResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    act(() => {
      grooveResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    act(() => {
      feelResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    act(() => {
      dynamicsResetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    const resetSection = useProjectStore.getState().sections[0];
    const resetEnergySlider = mounted.container.querySelector(
      '#section-slider-Energy'
    ) as HTMLInputElement | null;
    const resetGrooveSlider = mounted.container.querySelector(
      '#section-slider-Groove'
    ) as HTMLInputElement | null;
    const resetFeelSlider = mounted.container.querySelector(
      '#section-slider-Feel'
    ) as HTMLInputElement | null;
    const resetDynamicsSlider = mounted.container.querySelector(
      '#section-slider-Dynamics'
    ) as HTMLInputElement | null;
    expect(resetSection?.energyOverride).toBeNull();
    expect(resetSection?.grooveOverride).toBeNull();
    expect(resetSection?.feelOverride).toBeNull();
    expect(resetSection?.dynamicsOverride).toBeNull();
    expect(resetEnergySlider?.value).toBe('50');
    expect(resetGrooveSlider?.value).toBe('50');
    expect(resetFeelSlider?.value).toBe('50');
    expect(resetDynamicsSlider?.value).toBe('50');
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project energy default.'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project groove default.'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project feel default.'
    );
    expect(mounted.container.textContent).toContain(
      'This section is inheriting the project dynamics default.'
    );
  });
});
