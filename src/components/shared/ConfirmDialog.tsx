import { useEffect, useId, useRef } from "react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  body?: string
  consequence?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning"
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete Section",
  body = 'Remove "Verse" from this arrangement.',
  consequence = "This permanently deletes the section and all its blocks. This cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()
  const consequenceId = useId()
  const describedBy = [body ? bodyId : null, consequence ? consequenceId : null]
    .filter(Boolean)
    .join(" ")

  const toneStyles =
    variant === "danger"
      ? {
          icon: "text-confirm-danger",
          consequenceCard: "border-destructive/40 bg-destructive/10",
          consequenceLabel: "text-confirm-danger",
          confirmButton:
            "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/25 shadow-lg shadow-destructive/25",
        }
      : {
          icon: "text-warning",
          consequenceCard: "border-warning/40 bg-warning/10",
          consequenceLabel: "text-warning",
          confirmButton:
            "border-warning bg-warning text-background hover:bg-warning/90 focus-visible:ring-warning/25 shadow-lg shadow-warning/25",
        }

  /* Close on Escape */
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      data-dialog-variant={variant}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy || undefined}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 shadow-2xl shadow-black/60">
        {/* Warning icon */}
        <div className="mb-3 flex justify-center">
          <div className="flex size-10 items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              className={cn(toneStyles.icon)}
            >
              <path
                d="M12 2L1 21h22L12 2z"
                fill="currentColor"
                fillOpacity="0.15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 10v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          id={titleId}
          className="text-center text-lg font-semibold text-zinc-100"
        >
          {title}
        </h2>

        {body ? (
          <p
            id={bodyId}
            className="mt-2 text-center text-sm leading-relaxed text-muted-foreground"
          >
            {body}
          </p>
        ) : null}

        {consequence ? (
          <div
            className={cn(
              "mt-4 rounded-xl border px-4 py-3 text-left",
              toneStyles.consequenceCard
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                toneStyles.consequenceLabel
              )}
            >
              Consequence
            </p>
            <p
              id={consequenceId}
              className="mt-1 text-sm leading-relaxed text-zinc-100"
            >
              {consequence}
            </p>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            data-confirm-action="cancel"
            className="flex-1 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-confirm-action="confirm"
            className={cn(
              "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
              toneStyles.confirmButton
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
