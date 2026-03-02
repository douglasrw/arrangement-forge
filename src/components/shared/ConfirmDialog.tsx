// ConfirmDialog.tsx — Reusable confirmation modal. Full implementation in T23.

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-base-content">{title}</h3>
        <p className="py-4 text-base-content/70">{message}</p>
        <div className="modal-action">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-error' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel} />
    </dialog>
  );
}
