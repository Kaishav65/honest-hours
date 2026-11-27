import {
  CalendarRange,
  ChartColumn,
  House,
  Info,
  Settings,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Order matters: keyboard shortcuts 1–7 follow this list.
export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: House },
  { href: "/timeline", label: "Timeline", icon: CalendarRange },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About", icon: Info },
];
