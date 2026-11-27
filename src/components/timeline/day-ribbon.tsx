"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { BlockTip, type TipInfo } from "./block-tip";

export type RibbonBlock = { key: string; name: string; kind: string; startMs: number; endMs: number; s: number; d: number; hint?: string; live?: boolean };

// The Today page's day ribbon: same hover card as the Timeline. Blocks open the Timeline on click.
// `children` are the Now / Usual sleep markers, rendered on the server.
export function DayRibbon({ blocks, timeZone, children }: { blocks: RibbonBlock[]; timeZone: string; children?: ReactNode }) {
  const router = useRouter();
  const [tip, setTip] = useState<TipInfo | null>(null);
  return (
    <>
      <div className="ribbon">
        {blocks.map((b) => (
          <div
            key={b.key}
            className={b.live ? "blk live" : "blk"}
            data-kind={b.kind}
            style={{ "--s": b.s, "--d": b.d } as CSSProperties}
            onMouseMove={(e) => setTip({ x: e.clientX, y: e.currentTarget.getBoundingClientRect().top, ...b })}
            onMouseLeave={() => setTip(null)}
            onClick={() => router.push("/timeline")}
          />
        ))}
        {children}
      </div>
      {tip && <BlockTip tip={tip} timeZone={timeZone} />}
    </>
  );
}
