// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useUiStore } from '@/store/ui-store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deriveStatusBarStatus, StatusBar, type AppStatus } from './StatusBar';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

function renderStatusBar(status: AppStatus) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(StatusBar, { status }));
  });

  mountedRoot = root;
  mountedContainer = container;
  return container;
}

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  useUiStore.setState({
    errorMessage: null,
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

describe('deriveStatusBarStatus', () => {
  it('preserves sample-loading truth instead of falling back to unsaved copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'idle',
      systemStatus: 'loading-samples',
      unsavedChanges: true,
    });

    expect(status).toBe('loading-samples');
  });

  it('preserves offline truth instead of falling back to saved copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'idle',
      systemStatus: 'offline',
      unsavedChanges: false,
    });

    expect(status).toBe('offline');
  });

  it('preserves error truth instead of falling back to generation or save-state copy', () => {
    const status = deriveStatusBarStatus({
      generationState: 'generating',
      systemStatus: 'error',
      unsavedChanges: true,
    });

    expect(status).toBe('error');
  });
});

describe('StatusBar', () => {
  it('renders sample loading as a distinct visible status', () => {
    const container = renderStatusBar('loading-samples');

    expect(container.textContent).toContain('Loading samples');
    expect(container.textContent).not.toContain('Saved');
  });

  it('renders offline as a distinct visible status', () => {
    const container = renderStatusBar('offline');

    expect(container.textContent).toContain('Offline');
    expect(container.textContent).not.toContain('Saved');
  });

  it('renders concise failure detail when the current state is error', () => {
    useUiStore.setState({
      errorMessage: '  Generation failed: Generator offline  ',
    });

    const container = renderStatusBar('error');

    expect(container.textContent).toContain('Error: Generator offline');
    expect(container.textContent).not.toContain('Loading samples');
  });
});
