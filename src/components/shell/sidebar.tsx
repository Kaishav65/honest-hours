"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { NAV_ITEMS } from "./nav-items";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function toggleSidebar() {
  const root = document.documentElement;
  const collapsed = root.dataset.sidebar !== "collapsed";
  if (collapsed) root.dataset.sidebar = "collapsed";
  else delete root.dataset.sidebar;
  localStorage.setItem("hh-sidebar", collapsed ? "collapsed" : "expanded");
}

export function Sidebar({ footer }: { footer: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Keys 1–7 switch pages (design system §9).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open]")) return;
      const item = NAV_ITEMS[Number(e.key) - 1];
      if (item) router.push(item.href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <nav className="sidebar" aria-label="Main">
      {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => (
        <Link
          key={href}
          href={href}
          className="nav-item"
          title={label}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
        >
          <Icon className="lucide" aria-hidden />
          <span className="label">{label}</span>
          <span className="kbd">{i + 1}</span>
        </Link>
      ))}
      <div className="sidebar-foot">
        <button type="button" className="nav-item sidebar-toggle" onClick={toggleSidebar} title="Collapse / expand the sidebar" aria-label="Collapse / expand the sidebar">
          <PanelLeftClose className="lucide" aria-hidden />
          <span className="label">Collapse</span>
        </button>
        {footer}
      </div>
    </nav>
  );
}
