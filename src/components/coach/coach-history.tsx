"use client";

import { useRef } from "react";
import { CoachMessage } from "./coach-message";

export type HistoryItem = { id: string; severity: string; text: string; when: string };

// "View all": every saved coach message, newest first, in a scrolling dialog.
export function CoachHistory({ items }: { items: HistoryItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => dialog.current?.showModal()}>
        View all
      </button>
      <dialog ref={dialog} className="modal" style={{ width: "min(34rem, 94vw)", maxHeight: "80vh" }} aria-labelledby="coach-all-title">
        <div className="modal-head">
          <h2 id="coach-all-title" className="card-title" style={{ flex: 1 }}>
            All coach messages
          </h2>
        </div>
        <div className="modal-body scroll" style={{ overflow: "auto" }}>
          {items.length === 0 && <p className="sm muted">Nothing yet.</p>}
          {items.map((m) => (
            <CoachMessage key={m.id} severity={m.severity} text={m.text} time={m.when} />
          ))}
        </div>
        <div className="modal-foot">
          <span style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
