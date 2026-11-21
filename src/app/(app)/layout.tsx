import { Suspense } from "react";
import { Sprout } from "lucide-react";
import { UserBadge } from "@/components/shell/user-badge";
import { Sidebar } from "@/components/shell/sidebar";
import { StatusBar } from "@/components/shell/status-bar";

// Desktop-app shell: always exactly one window, the page itself never scrolls (PLAN.md §9).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <div className="brand">
        <div className="brand-mark">
          <Sprout className="lucide" aria-hidden />
        </div>
        <span className="brand-name">Honest Hours</span>
      </div>
      <StatusBar />
      <Sidebar
        footer={
          <Suspense>
            <UserBadge />
          </Suspense>
        }
      />
      <main className="main">{children}</main>
    </div>
  );
}
