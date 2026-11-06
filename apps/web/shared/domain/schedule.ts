import { type AlertListItem, isOverdue } from "./alerts";
import type { Family } from "./deadlines";

export type MonthGroup = {
  month: string;
  label: string;
  alerts: AlertListItem[];
  containsOverdue: boolean;
};

export type ScheduleSummary = {
  overdue: number;
  withinThirtyDays: number;
};

export const ALL_FAMILIES = "";

export type ScheduleCriteria = { family: Family | typeof ALL_FAMILIES };

export function filterByFamily(
  alerts: AlertListItem[],
  criteria: ScheduleCriteria,
): AlertListItem[] {
  return criteria.family === ALL_FAMILIES
    ? alerts
    : alerts.filter((a) => a.family === criteria.family);
}

export function scheduleSummary(alerts: AlertListItem[]): ScheduleSummary {
  return {
    overdue: alerts.filter(isOverdue).length,
    withinThirtyDays: alerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 30).length,
  };
}

function monthLabel(month: string): string {
  const instant = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
  const text = instant.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function groupByMonth(alerts: AlertListItem[]): MonthGroup[] {
  const groups = new Map<string, AlertListItem[]>();
  for (const alert of [...alerts].sort((a, b) => a.deadlineOn.localeCompare(b.deadlineOn))) {
    const month = alert.deadlineOn.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), alert]);
  }
  return [...groups].map(([month, list]) => ({
    month,
    label: monthLabel(month),
    alerts: list,
    containsOverdue: list.some(isOverdue),
  }));
}

export function dayOfMonth(alert: AlertListItem): string {
  return alert.deadlineOn.slice(8, 10);
}
