"use client";

import { useEffect, useRef } from "react";

// A small "message + OK" dialog, e.g. the result of the one-tap Office day.
export function NoticeModal({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="notice-title" onClose={onClose}>
      <div className="modal-head">
        <h2 id="notice-title" className="card-title">
          {title}
        </h2>
      </div>
      <div className="modal-body">
        <p className="sm">{message}</p>
      </div>
      <div className="modal-foot">
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={onClose} autoFocus>
          OK
        </button>
      </div>
    </dialog>
  );
}
