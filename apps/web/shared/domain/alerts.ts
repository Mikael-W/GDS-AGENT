import type { Alert, Family } from "./deadlines";
import { plural } from "./display";

export type AlertListItem = Alert & {
  subject: string | null;
  service: string | null;
};

export type AlertDetail = AlertListItem & {
  holder: string | null;
  notifiedOn: string | null;
  startsOn: string | null;
  endsOn: string | null;
  initialAmount: string | null;
  settled: boolean;
  treatment: { comment: string; treatedAt: string } | null;
};

export type AlertView = "a_traiter" | "depassees";

export type AlertPeriod = "toutes" | "30" | "90";

export type Urgency = "retard" | "attention" | "information";

export type AlertCriteria = {
  view: AlertView;
  service: string;
  family: Family | "";
  period: AlertPeriod;
};

export type AlertSummary = {
  toTreat: number;
  overdue: number;
};

export const FAMILY_LABELS: Record<Family, string> = {
  reconduction: "Reconduction",
  garantie: "Retenue de garantie",
  reception: "Réception manquante",
  point_six_mois: "Point à six mois",
  sans_bon_de_commande: "Sans bon de commande",
};

const SOON_THRESHOLD = 30;

export function isOverdue(alert: AlertListItem): boolean {
  return alert.daysRemaining < 0;
}

export function urgency(alert: AlertListItem): Urgency {
  if (isOverdue(alert)) return "retard";
  return alert.daysRemaining <= SOON_THRESHOLD ? "attention" : "information";
}

export function summarize(alerts: AlertListItem[]): AlertSummary {
  return { toTreat: alerts.length, overdue: alerts.filter(isOverdue).length };
}

export function departments(alerts: AlertListItem[]): string[] {
  const names = alerts.flatMap((a) => (a.service ? [a.service] : []));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function filter(alerts: AlertListItem[], criteria: AlertCriteria): AlertListItem[] {
  return alerts.filter((a) => {
    if (criteria.view === "depassees" && !isOverdue(a)) return false;
    if (criteria.service && a.service !== criteria.service) return false;
    if (criteria.family && a.family !== criteria.family) return false;
    if (criteria.period !== "toutes" && a.daysRemaining > Number(criteria.period)) return false;
    return true;
  });
}

export function listTitle(view: AlertView, total: number): string {
  const qualifier = view === "depassees" ? "dépassée" : "à traiter";
  return `${plural(total, "alerte")} ${qualifier}${view === "depassees" && total > 1 ? "s" : ""}`;
}

export function deadlineLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "Aujourd'hui";
  const days = Math.abs(daysRemaining);
  const unit = days > 1 ? "jours" : "jour";
  return daysRemaining < 0 ? `Dépassée de ${days} ${unit}` : `Dans ${days} ${unit}`;
}

export function formatDate(iso: string | null): string {
  if (iso === null) return "Non renseignée";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function alertLink(alert: Pick<AlertListItem, "reference" | "family">): string {
  return `/alertes/${encodeURIComponent(alert.reference)}/${alert.family}`;
}
