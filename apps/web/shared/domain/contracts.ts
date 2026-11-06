export type ContractListItem = {
  reference: string;
  subject: string | null;
  holder: string | null;
  service: string | null;
  startsOn: string | null;
  endsOn: string | null;
  initialAmount: string | null;
  amendmentsAmount: string | null;
  active: boolean;
  settled: boolean;
  lots: number;
};

export type ContractState = "en_cours" | "termines" | "tous";

export type ContractCriteria = {
  search: string;
  service: string;
  state: ContractState;
};

export type ContractSummary = {
  active: number;
  lots: number;
  notifiedAmount: number;
};

const eurosToCents = (montant: string | null): number =>
  montant === null ? 0 : Math.round(Number(montant) * 100);

const withoutAccent = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function notifiedAmount(contract: ContractListItem): number {
  return eurosToCents(contract.initialAmount) + eurosToCents(contract.amendmentsAmount);
}

export function isOngoing(contract: ContractListItem, today: string): boolean {
  if (!contract.active || contract.settled) return false;
  return contract.endsOn === null || contract.endsOn >= today;
}

export function summarize(contracts: ContractListItem[], today: string): ContractSummary {
  const active = contracts.filter((m) => isOngoing(m, today));
  return {
    active: active.length,
    lots: active.reduce((total, m) => total + m.lots, 0),
    notifiedAmount: active.reduce((total, m) => total + notifiedAmount(m), 0),
  };
}

export function departments(contracts: ContractListItem[]): string[] {
  const names = contracts.flatMap((m) => (m.service ? [m.service] : []));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function filter(
  contracts: ContractListItem[],
  criteria: ContractCriteria,
  today: string,
): ContractListItem[] {
  const search = withoutAccent(criteria.search.trim());
  return contracts.filter((m) => {
    if (criteria.service && m.service !== criteria.service) return false;
    if (criteria.state === "en_cours" && !isOngoing(m, today)) return false;
    if (criteria.state === "termines" && isOngoing(m, today)) return false;
    if (!search) return true;
    return [m.subject, m.reference, m.holder].some((field) =>
      withoutAccent(field ?? "").includes(search),
    );
  });
}

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatAmount(cents: number): string {
  return euro.format(cents / 100);
}

export function formatEuros(montant: string | null): string {
  return montant === null ? "Non renseigné" : formatAmount(eurosToCents(montant));
}

export function formatCompactAmount(cents: number): string {
  const euros = cents / 100;
  if (euros < 1_000_000) return formatAmount(cents);
  return `${(euros / 1_000_000).toFixed(1).replace(".", ",")} M€`;
}

const monthYear = (date: string): string => `${date.slice(5, 7)}/${date.slice(0, 4)}`;

export function formatPeriod(startsOn: string | null, endsOn: string | null): string {
  if (startsOn && endsOn) return `${monthYear(startsOn)} au ${monthYear(endsOn)}`;
  if (startsOn) return `Depuis ${monthYear(startsOn)}`;
  if (endsOn) return `Jusqu'à ${monthYear(endsOn)}`;
  return "Non renseignée";
}
