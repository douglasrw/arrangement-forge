import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning"
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete Section?",
  body = 'This will permanently delete "Verse" and all its blocks. This cannot be undone.',
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#3f3f46]/50 bg-[#18181b] p-6 shadow-2xl shadow-black/60">
        {/* Warning icon */}
        <div className="mb-3 flex justify-center">
          <div className="flex size-10 items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#fbbf24]"
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
          id="confirm-title"
          className="text-center text-lg font-semibold text-[#f4f4f5]"
        >
          {title}
        </h2>

        {/* Body */}
        <p
          id="confirm-body"
          className="mt-2 text-center text-sm leading-relaxed text-[#a1a1aa]"
        >
          {body}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#3f3f46] py-2.5 text-sm font-medium text-[#e4e4e7] transition-colors hover:bg-[#52525b]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors",
              variant === "danger"
                ? "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171] hover:bg-[#ef4444]/20"
                : "border-[#fbbf24]/30 bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
