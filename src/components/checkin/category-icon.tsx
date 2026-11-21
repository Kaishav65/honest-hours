import {
  BookOpen,
  Briefcase,
  Bus,
  Circle,
  Clapperboard,
  Coffee,
  Dumbbell,
  Footprints,
  Gamepad2,
  Heart,
  Moon,
  Music,
  Play,
  Shirt,
  Smartphone,
  Sofa,
  Tv,
  Users,
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
  coffee: Coffee,
  dumbbell: Dumbbell,
  footprints: Footprints,
  "gamepad-2": Gamepad2,
  heart: Heart,
  moon: Moon,
  music: Music,
  play: Play,
  shirt: Shirt,
  smartphone: Smartphone,
  sofa: Sofa,
  tv: Tv,
  users: Users,
  utensils: Utensils,
  "washing-machine": WashingMachine,
};

/** Icons a user can pick for a category (everything in the map above). */
export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name }: { name: string | null }) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon className="lucide" aria-hidden />;
}
