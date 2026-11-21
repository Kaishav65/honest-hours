import {
  BookOpen,
  Briefcase,
  Bus,
  Circle,
  Clapperboard,
  Moon,
  Play,
  Shirt,
  Smartphone,
  Sofa,
  Utensils,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

// Icon names are stored as text in the database; the default categories use these.
const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  briefcase: Briefcase,
  bus: Bus,
  clapperboard: Clapperboard,
  moon: Moon,
  play: Play,
  shirt: Shirt,
  smartphone: Smartphone,
  sofa: Sofa,
  utensils: Utensils,
  "washing-machine": WashingMachine,
};

export function CategoryIcon({ name }: { name: string | null }) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon className="lucide" aria-hidden />;
}
