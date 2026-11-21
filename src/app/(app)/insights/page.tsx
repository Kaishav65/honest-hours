import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function InsightsPage() {
  return <ComingSoon icon={ChartColumn} title="Insights" when="Weekly insights and report card arrive in v2." />;
}

export const metadata: Metadata = { title: "Insights · Honest Hours" };
