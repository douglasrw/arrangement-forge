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
