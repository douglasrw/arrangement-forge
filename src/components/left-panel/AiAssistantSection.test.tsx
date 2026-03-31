// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAssistantSection } from './AiAssistantSection';
import { useProjectStore } from '@/store/project-store';
import { useUiStore } from '@/store/ui-store';
import type { AiChatMessage, Project } from '@/types';

const runGenerationMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useGenerate', () => ({
  useGenerate: () => ({
    runGeneration: runGenerationMock,
  }),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: any; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    userId: 'u1',
    name: 'Test Project',
    key: 'C',
    tempo: 120,
    timeSignature: '4/4',
    genre: 'Jazz',
    subStyle: 'Swing',
    energy: 60,
    groove: 60,
    feel: 50,
    swingPct: null,
    dynamics: 50,
    generationHints: '',
    chordChartRaw: 'Cmaj7 | Dm7 | G7 | Cmaj7',
    hasArrangement: false,
    generatedAt: null,
    generatedTempo: null,
    createdAt: '2026-03-28T00:00:00Z',
    updatedAt: '2026-03-28T00:00:00Z',
    ...partial,
  };
}

function makeMessage(partial: Partial<AiChatMessage> = {}): AiChatMessage {
  return {
    id: 'm1',
    projectId: 'p1',
    role: 'assistant',
    content: 'Saved response',
    scope: 'section',
    scopeTarget: 'Bridge',
    createdAt: '2026-03-28T00:00:00Z',
    ...partial,
  };
}

function renderSection() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<AiAssistantSection />);
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  runGenerationMock.mockReset();

  HTMLElement.prototype.scrollIntoView = vi.fn();

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

describe('AiAssistantSection', () => {
  it('renders an empty product state instead of seeded demo messages', () => {
    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Assistant history is empty.');
    expect(mounted.container.textContent).not.toContain('late-night trio');
    expect(mounted.container.textContent).not.toContain('push swing to about 70%');
  });

  it('keeps the blocked reason visible when no project is loaded', () => {
    useProjectStore.setState({
      project: null,
      chatMessages: [makeMessage()],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const composerState = mounted.container.querySelector(
      '[data-testid="ai-assistant-composer-state"]'
    );

    expect(composerState?.textContent).toContain('Project required');
    expect(composerState?.textContent).toContain('Load a project to enable assistant requests.');

    const input = mounted.container.querySelector('#ai-input') as HTMLInputElement | null;
    expect(input?.disabled).toBe(true);
  });

  it('keeps the blocked reason visible when the project has no chord chart', () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: '   ' }),
      chatMessages: [makeMessage()],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const composerState = mounted.container.querySelector(
      '[data-testid="ai-assistant-composer-state"]'
    );

    expect(composerState?.textContent).toContain('Chord chart required');
    expect(composerState?.textContent).toContain(
      'Add a chord chart in Input before asking the assistant to generate or revise the arrangement.'
    );
  });

  it('shows an active generating readiness state beyond the input placeholder', () => {
    useProjectStore.setState({
      chatMessages: [makeMessage()],
    });
    useUiStore.setState({
      generationState: 'generating',
      systemStatus: 'generating',
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const composerState = mounted.container.querySelector(
      '[data-testid="ai-assistant-composer-state"]'
    );

    expect(composerState?.textContent).toContain('Assistant requests are paused');
    expect(composerState?.textContent).toContain(
      'The current arrangement pass is still running, so new prompts unlock when it finishes.'
    );

    const input = mounted.container.querySelector('#ai-input') as HTMLInputElement | null;
    expect(input?.disabled).toBe(true);
  });

  it('keeps the blocked parse-failure reason visible before the assistant can send', () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: 'Cmaj7 | xyz?? | %' }),
      chatMessages: [],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const composerState = mounted.container.querySelector(
      '[data-testid="ai-assistant-composer-state"]'
    );
    const sendButton = mounted.container.querySelector(
      '[data-testid="ai-assistant-send"]'
    ) as HTMLButtonElement | null;

    expect(composerState?.textContent).toContain('Chord chart needs fixes');
    expect(composerState?.textContent).toContain(
      'Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(composerState?.textContent).toContain('1 bar has an unrecognized chord token.');
    expect(composerState?.textContent).toContain('1 repeat marker follows an unresolved bar.');
    expect(composerState?.textContent).toContain(
      'Next step: Replace bars 2 and 3 with explicit chords or fix the bar before them.'
    );
    expect(composerState?.textContent).toContain(
      'Flagged chart locations: Line 1, bar 2: could not parse "xyz??"'
    );
    expect(composerState?.textContent).toContain(
      'Fix the chord chart in Input before asking the assistant to generate or revise the arrangement.'
    );
    expect(mounted.container.textContent).toContain(
      'Bars 2 and 3 currently parse as N.C., so Generate stays blocked until the chart is fixed.'
    );
    expect(mounted.container.textContent).toContain(
      'Assistant history will appear here after the chord chart is fixed and you send a request.'
    );
    expect(sendButton?.disabled).toBe(true);
  });

  it('keeps no-playable-bar truth visible before the assistant can send', () => {
    useProjectStore.setState({
      project: makeProject({ chordChartRaw: '[Verse]\n\nChorus:' }),
      chatMessages: [],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const composerState = mounted.container.querySelector(
      '[data-testid="ai-assistant-composer-state"]'
    );

    expect(composerState?.textContent).toContain('Chord chart needs fixes');
    expect(composerState?.textContent).toContain(
      'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.'
    );
    expect(composerState?.textContent).toContain(
      'Next step: Add at least one chord bar such as Cmaj7 | Fmaj7 | G7 | Cmaj7.'
    );
    expect(composerState?.textContent).toContain(
      'Fix the chord chart in Input before asking the assistant to generate or revise the arrangement.'
    );
    expect(composerState?.textContent).not.toContain('flagged bars');
    expect(mounted.container.textContent).toContain(
      'No playable chord bars are present yet, so Generate stays blocked until the chart includes at least one chord bar.'
    );
    expect(mounted.container.textContent).toContain(
      'Assistant history will appear here after the chord chart is fixed and you send a request.'
    );
  });

  it('renders failed assistant generations with a distinct failure bubble', () => {
    useProjectStore.setState({
      chatMessages: [makeMessage({ content: 'Generation failed: Generator offline' })],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureBubble = mounted.container.querySelector(
      '[data-testid="ai-assistant-failure-bubble"]'
    );

    expect(failureBubble).not.toBeNull();
    expect(failureBubble?.textContent).toContain('Generation failed');
    expect(failureBubble?.textContent).toContain('Generator offline');
  });

  it('keeps successful assistant replies visually distinct from failed generations', () => {
    useProjectStore.setState({
      chatMessages: [
        makeMessage({
          id: 'm1',
          content: 'Applied your latest request and generated 2 sections across 8 bars for piano.',
          scope: 'song',
          scopeTarget: null,
        }),
        makeMessage({
          id: 'm2',
          content: 'Generation failed: Generator offline',
          scope: 'song',
          scopeTarget: null,
        }),
      ],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const failureBubbles = mounted.container.querySelectorAll(
      '[data-testid="ai-assistant-failure-bubble"]'
    );

    expect(mounted.container.textContent).toContain(
      'Applied your latest request and generated 2 sections across 8 bars for piano.'
    );
    expect(failureBubbles).toHaveLength(1);
    expect(failureBubbles[0]?.textContent).toContain('Generation failed');
    expect(failureBubbles[0]?.textContent).toContain('Generator offline');
  });

  it('renders stored chat history and forwards prompts into generation', () => {
    useProjectStore.setState({
      chatMessages: [makeMessage()],
    });

    const mounted = renderSection();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Saved response');
    expect(mounted.container.textContent).toContain('Section: Bridge');

    const input = mounted.container.querySelector('#ai-input') as HTMLInputElement | null;
    const sendButton = mounted.container.querySelector(
      'button[aria-label="Send assistant prompt"]'
    ) as HTMLButtonElement | null;

    expect(input).not.toBeNull();
    expect(sendButton).not.toBeNull();

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      valueSetter?.call(input, 'Tighten the bridge dynamics');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const enabledSendButton = mounted.container.querySelector(
      'button[aria-label="Send assistant prompt"]'
    ) as HTMLButtonElement | null;

    expect(enabledSendButton?.disabled).toBe(false);

    act(() => {
      enabledSendButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(runGenerationMock).toHaveBeenCalledWith({
      assistantPrompt: 'Tighten the bridge dynamics',
    });
    expect(input!.value).toBe('');
  });
});
