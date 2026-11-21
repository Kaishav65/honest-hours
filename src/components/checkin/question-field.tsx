import type { AnswerValue, Question } from "@/lib/checkin/types";

type Props = { question: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue | undefined) => void };

function Chips({ options, isOn, onPick }: { options: { label: string; value: string | number | boolean }[]; isOn: (v: string | number | boolean) => boolean; onPick: (v: string | number | boolean) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="chip chip-sm"
          aria-pressed={isOn(o.value)}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// One input for one category question. Tapping a chosen chip again clears the answer.
export function QuestionField({ question: q, value, onChange }: Props) {
  const toggle = (v: string | number | boolean) => onChange(value === v ? undefined : v);

  switch (q.type) {
    case "rating_1_5":
      return (
        <Chips
          options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
          isOn={(v) => value === v}
          onPick={toggle}
        />
      );
    case "yes_no":
      return (
        <Chips
          options={[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ]}
          isOn={(v) => value === v}
          onPick={toggle}
        />
      );
    case "single_choice":
      return (
        <Chips
          options={(q.options ?? []).map((o) => ({ label: o, value: o }))}
          isOn={(v) => value === v}
          onPick={toggle}
        />
      );
    case "multi_choice": {
      const picked = Array.isArray(value) ? value : [];
      return (
        <Chips
          options={(q.options ?? []).map((o) => ({ label: o, value: o }))}
          isOn={(v) => picked.includes(String(v))}
          onPick={(v) => {
            const next = picked.includes(String(v)) ? picked.filter((x) => x !== v) : [...picked, String(v)];
            onChange(next.length ? next : undefined);
          }}
        />
      );
    }
    case "number":
      return (
        <input
          type="number"
          min={0}
          className="input"
          style={{ width: "6rem" }}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Math.max(0, Math.floor(Number(e.target.value))))}
        />
      );
    case "time":
      return (
        <input
          type="time"
          className="input"
          style={{ width: "8rem" }}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    default:
      return (
        <input
          className="input"
          style={{ width: "100%" }}
          maxLength={200}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
  }
}
