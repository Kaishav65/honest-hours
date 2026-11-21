import type { LucideIcon } from "lucide-react";

// Placeholder panel for pages that aren't built yet. Uses the design system's "learning" state.
export function ComingSoon({ icon: Icon, title, when }: { icon: LucideIcon; title: string; when: string }) {
  return (
    <section className="page">
      <div className="learning">
        <div className="big-ic">
          <Icon className="lucide" aria-hidden />
        </div>
        <h1 className="display" style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
          {title}
        </h1>
        <p className="sm muted">{when}</p>
      </div>
    </section>
  );
}
