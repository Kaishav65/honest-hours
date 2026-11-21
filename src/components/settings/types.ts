import type { CategoryKind, QuestionType, SystemKey } from "@/lib/checkin/types";

export type CategoryValue = "productive" | "neutral" | "waste";

export type SettingsCategory = {
  id: string;
  name: string;
  icon: string | null;
  kind: CategoryKind;
  value: CategoryValue;
  sortOrder: number;
  archived: boolean;
};

export type SettingsQuestion = {
  id: string;
  categoryId: string;
  label: string;
  type: QuestionType;
  options: string[] | null;
  systemKey: SystemKey | null;
  sortOrder: number;
  archived: boolean;
};

export type SettingsProfile = {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  dayStartHour: number;
  checkinIntervalMin: number;
  weekdayGoalMin: number;
  weekendGoalMin: number;
  /** profiles.settings, kept whole so saving one part never drops another. */
  settings: Record<string, unknown>;
};

export type DaySchedule = { office: boolean; office_start: string; office_end: string; office_checkin_min: number };
export type BusyPresetRow = { label: string; minutes: number };
