import type { Metadata } from "next";
import { Target } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function GoalsPage() {
  return <ComingSoon icon={Target} title="Goals" when="Streak and subject goals arrive in v2 / v3." />;
}

export const metadata: Metadata = { title: "Goals · Honest Hours" };
