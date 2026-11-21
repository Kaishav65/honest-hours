export type Span = { startMs: number; endMs: number };

const MIN = 60_000;

/**
 * Unknown time: the parts of [fromMs, toMs) not covered by any entry.
 * Entries may be unsorted, overlapping or stick out of the range.
 */
export function findGaps(entries: Span[], fromMs: number, toMs: number): Span[] {
  const sorted = entries
    .filter((e) => e.endMs > fromMs && e.startMs < toMs)
    .sort((a, b) => a.startMs - b.startMs);
  const gaps: Span[] = [];
  let cursor = fromMs;
  for (const e of sorted) {
    if (e.startMs > cursor) gaps.push({ startMs: cursor, endMs: e.startMs });
    cursor = Math.max(cursor, e.endMs);
  }
  if (cursor < toMs) gaps.push({ startMs: cursor, endMs: toMs });
  return gaps;
}

/**
 * Split a slot into consecutive parts of the given lengths (minutes).
 * Use `null` for one part to take whatever is left. Throws if the lengths don't fit exactly.
 */
export function splitSlot(slot: Span, partMinutes: (number | null)[]): Span[] {
  if (partMinutes.length === 0) throw new RangeError("Need at least one part");
  if (partMinutes.filter((p) => p === null).length > 1) throw new RangeError("Only one part can take the rest");
  if (partMinutes.some((p) => p !== null && !(p > 0))) throw new RangeError("Each part must be longer than 0");

  const total = slot.endMs - slot.startMs;
  const fixed = partMinutes.reduce<number>((sum, p) => sum + (p ?? 0) * MIN, 0);
  const rest = total - fixed;
  if (partMinutes.includes(null) ? rest <= 0 : rest !== 0) {
    throw new RangeError("Parts must add up to the slot length");
  }

  const parts: Span[] = [];
  let cursor = slot.startMs;
  for (const p of partMinutes) {
    const end = cursor + (p === null ? rest : p * MIN);
    parts.push({ startMs: cursor, endMs: end });
    cursor = end;
  }
  return parts;
}
