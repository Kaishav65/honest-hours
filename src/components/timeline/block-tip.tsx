"use client";

import { duration } from "@/components/checkin/checkin-modal";
import { formatClock } from "@/lib/checkin/store";

export type TipInfo = {
  /** Pointer x and the top edge of the hovered block, in viewport pixels. */
  x: number;
  y: number;
  name: string;
  kind: string;
  startMs: number;
  endMs: number;
  /** Small hint after the duration, e.g. "click to edit". */
  hint?: string;
};

// Hover card above a ribbon block, following the pointer horizontally (kept inside the window).
export function BlockTip({ tip, timeZone }: { tip: TipInfo; timeZone: string }) {
  const x = Math.min(Math.max(tip.x, 120), window.innerWidth - 120);
  return (
    <div className="tip" data-kind={tip.kind} role="tooltip" style={{ left: x, top: tip.y - 8, transform: "translate(-50%, -100%)" }}>
      <span className="tip-name">
        <span className="dot" data-kind={tip.kind} />
        {tip.name}
      </span>
      <span className="tip-time">
        {formatClock(tip.startMs, timeZone)} – {formatClock(tip.endMs, timeZone)}
      </span>
      <span className="tip-dur">
        {duration(Math.round((tip.endMs - tip.startMs) / 60_000))}
        {tip.hint ? ` · ${tip.hint}` : ""}
      </span>
    </div>
  );
}
