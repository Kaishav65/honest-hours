import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function FocusPage() {
  return <ComingSoon icon={Timer} title="Focus" when="Pomodoro timer arrives in v2." />;
}

export const metadata: Metadata = { title: "Focus · Honest Hours" };
