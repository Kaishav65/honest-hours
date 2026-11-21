import { Sprout } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-6)" }}>
      <div style={{ width: "100%", maxWidth: "24rem", display: "grid", gap: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", justifyContent: "center" }}>
          <div className="brand-mark">
            <Sprout className="lucide" aria-hidden />
          </div>
          <span className="brand-name">Honest Hours</span>
        </div>
        {children}
      </div>
    </main>
  );
}
