"use client";

import { useState } from "react";
import type { HeatDay } from "@/lib/insights/heatmap";

// The streak heatmap's cells with the same hover card as the Today ribbon (`.tip`).
export function HeatGrid({ cols }: { cols: (HeatDay | null)[][] }) {
  const [tip, setTip] = useState<{ x: number; y: number; day: HeatDay } | null>(null);
  const show = (e: React.PointerEvent | React.FocusEvent, day: HeatDay) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, day });
  };
  const x = tip ? Math.min(Math.max(tip.x, 100), window.innerWidth - 100) : 0;
  return (
    <>
      <div className="heat" data-testid="heatmap" onPointerLeave={() => setTip(null)}>
        {cols.flat().map((c, i) =>
          c ? (
            <i
              key={c.date}
              data-l={c.level}
              data-date={c.date}
              tabIndex={0}
              aria-label={c.title}
              onPointerEnter={(e) => show(e, c)}
              onFocus={(e) => show(e, c)}
              onBlur={() => setTip(null)}
            />
          ) : (
            <i key={`e${i}`} style={{ visibility: "hidden" }} />
          ),
        )}
      </div>
      {tip && (
        <div className="tip" data-heat={tip.day.level} role="tooltip" style={{ left: x, top: tip.y - 8, transform: "translate(-50%, -100%)" }}>
          <span className="tip-name">
            <span className="dot" />
            {tip.day.label}
          </span>
          <span className="tip-time">{tip.day.detail}</span>
          <span className="tip-dur">{tip.day.note}</span>
        </div>
      )}
    </>
  );
}
