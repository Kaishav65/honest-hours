"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAV_ITEMS } from "./nav-items";

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Keys 1–6 switch pages (design system §9).
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
        {/* Display name + coach strictness come from the profile after login (step 3). */}
        <div className="user">
          <div className="avatar" aria-hidden>
            ?
          </div>
          <div className="who">
            <div className="sm" style={{ fontWeight: 600 }}>
              My account
            </div>
            <div className="xs muted">Balanced coach</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
