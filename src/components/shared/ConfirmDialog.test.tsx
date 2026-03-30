// @vitest-environment jsdom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find(
      (button): button is HTMLButtonElement => button.textContent?.trim() === text
    ) ?? null
  );
}

function renderConfirmDialog(props: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete Section"
        body='Remove "Verse" from this arrangement.'
        consequence="This permanently deletes the section and all its blocks. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        {...props}
      />
    );
  });

  return { container, root };
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
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

describe('ConfirmDialog consequence truth', () => {
  it('surfaces the consequence separately and keeps cancel distinct from destructive confirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const mounted = renderConfirmDialog({ onClose, onConfirm });
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const dialog = mounted.container.querySelector('[role="dialog"]') as HTMLDivElement | null;
    const cancelButton = findButtonByText(mounted.container, 'Cancel');
    const confirmButton = findButtonByText(mounted.container, 'Delete');

    expect(dialog?.dataset.dialogVariant).toBe('danger');
    expect(dialog?.textContent).toContain('Remove "Verse" from this arrangement.');
    expect(dialog?.textContent).toContain('Consequence');
    expect(dialog?.textContent).toContain(
      'This permanently deletes the section and all its blocks. This cannot be undone.'
    );
    expect(cancelButton?.className).toContain('border-border/80');
    expect(cancelButton?.className).toContain('bg-background');
    expect(confirmButton?.className).toContain('bg-destructive');
    expect(confirmButton?.className).toContain('text-destructive-foreground');

    act(() => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
