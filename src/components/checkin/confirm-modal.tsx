"use client";

import { useEffect, useRef } from "react";

// "Are you sure?" dialog for one-tap actions. Cancel has focus, so a stray Enter never confirms.
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="confirm-title" onClose={onCancel}>
      <div className="modal-head">
        <h2 id="confirm-title" className="card-title">
          {title}
        </h2>
      </div>
      <div className="modal-body">
        <p className="sm">{message}</p>
      </div>
      <div className="modal-foot">
        <span style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
