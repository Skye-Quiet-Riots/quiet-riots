'use client';

import { useEffect } from 'react';

interface LiveWarningModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LiveWarningModal({ open, onConfirm, onCancel }: LiveWarningModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Go live warning"
    >
      <div
        className="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <span className="inline-block text-4xl">📹</span>
        </div>

        <h3 className="mb-3 text-center text-lg font-bold">Fantastic, you are going live!</h3>

        <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Remember: no aggressive or rude behaviour. That&apos;s not nice to see. Be passionate
          about the issue but always respectful to others.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Go Live Now
          </button>
        </div>
      </div>
    </div>
  );
}
