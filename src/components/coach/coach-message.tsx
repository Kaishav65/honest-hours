import { RotateCcw, Repeat, Sparkles, Sunrise, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const ICON = { scold: TriangleAlert, pattern: Repeat, recovery: RotateCcw, praise: Sparkles, info: Sunrise } as const;
export const SEV_NAME: Record<string, string> = { scold: "Call-out", pattern: "Pattern", recovery: "Recovery", praise: "Win", info: "Coach" };

/** One coach message in the design system's style (severity colours the left edge and icon). Used by the toast and the Today card. */
export function CoachMessage({
  severity,
  text,
  time,
  children,
  className = "",
}: {
  severity: string;
  text: string;
  time?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = ICON[severity as keyof typeof ICON] ?? Sunrise;
  return (
    <div className={`coach ${className}`} data-sev={severity}>
      <span className="ic">
        <Icon className="lucide" aria-hidden />
      </span>
      <div className="meta">
        <b>{SEV_NAME[severity] ?? "Coach"}</b>
        {time && <span>· {time}</span>}
      </div>
      <p>{text}</p>
      {children && <div className="acts">{children}</div>}
    </div>
  );
}
