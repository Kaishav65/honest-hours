"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every second while `on`. Null until mounted (the clock is never read while rendering). */
export function useNow(on = true) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = on ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      if (id) clearInterval(id);
    };
  }, [on]);
  return now;
}
