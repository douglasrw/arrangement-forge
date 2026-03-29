// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '@/types';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import { StyleControlsSection } from './StyleControlsSection';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    userId: 'user-1',
    name: 'Swing Semantics Demo',
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
    hasArrangement: false,
    generatedAt: null,
    generatedTempo: null,
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T00:00:00Z',
    ...partial,
  };
}

function renderStyleControls() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<StyleControlsSection />);
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
    stems: [],
    sections: [],
    blocks: [],
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
});

describe('StyleControlsSection swing semantics', () => {
  it('shows straight feel for a null project swing value instead of a fake zero and keeps the slider live', () => {
    const mounted = renderStyleControls();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const swingSlider = mounted.container.querySelector(
      'input[aria-label="Swing %"]'
    ) as HTMLInputElement | null;

    expect(swingSlider?.value).toBe('50');
    expect(mounted.container.textContent).toContain('Swing %');
    expect(mounted.container.textContent).toContain('Straight');
    expect(mounted.container.textContent).not.toContain('0%');

    act(() => {
      if (swingSlider) {
        setRangeValue(swingSlider, '67');
      }
    });

    expect(useProjectStore.getState().project?.swingPct).toBe(67);
    expect(mounted.container.textContent).toContain('67%');
  });

  it('replaces the swing slider with a straight-time note for genres where swing is unavailable', () => {
    useProjectStore.setState({
      project: makeProject({
        genre: 'Rock',
        subStyle: 'Classic',
        swingPct: 67,
      }),
    });

    const mounted = renderStyleControls();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(
      mounted.container.querySelector('input[aria-label="Swing %"]')
    ).toBeNull();
    expect(mounted.container.textContent).toContain('Swing %');
    expect(mounted.container.textContent).toContain('Straight only');
    expect(mounted.container.textContent).toContain(
      "Rock is straight-time only, so swing isn't available here."
    );
  });
});
