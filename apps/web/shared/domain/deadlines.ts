export const FAMILIES = [
  "reconduction",
  "garantie",
  "reception",
  "point_six_mois",
  "sans_bon_de_commande",
] as const;

export type Family = (typeof FAMILIES)[number];

export type Windows = Record<Family, number>;

export const WINDOWS: Windows = {
  reconduction: 120,
  garantie: 60,
  reception: 30,
  point_six_mois: 15,
  sans_bon_de_commande: 90,
};

export type TrackedContract = {
  reference: string;
  active: boolean;
  settled: boolean;
  hasPurchaseOrders: boolean;
  tacitRenewal: boolean | null;
  startsOn: string | null;
  endsOn: string | null;
  warrantyEndsOn: string | null;
  receivedOn: string | null;
  lastCommitmentOn: string | null;
};

export type Alert = {
  family: Family;
  reference: string;
  deadlineOn: string;
  daysRemaining: number;
  explanation: string;
};

const DAY_MS = 86_400_000;

function inDays(iso: string): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function addDays(iso: string, days: number): string {
  return new Date((inDays(iso) + days) * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return inDays(to) - inDays(from);
}

function withinWindow(today: string, deadline: string, window: number): boolean {
  return daysBetween(today, deadline) <= window;
}

function alert(
  family: Family,
  contract: TrackedContract,
  deadlineOn: string,
  today: string,
  explanation: string,
): Alert {
  return {
    family,
    reference: contract.reference,
    deadlineOn,
    daysRemaining: daysBetween(today, deadlineOn),
    explanation,
  };
}

export function evaluate(
  contract: TrackedContract,
  today: string,
  windows: Windows = WINDOWS,
): Alert[] {
  if (!contract.active || contract.settled) return [];

  const alerts: Alert[] = [];

  if (contract.endsOn && contract.tacitRenewal !== null) {
    const triggerOn = addDays(contract.endsOn, -windows.reconduction);
    if (withinWindow(today, triggerOn, 0)) {
      alerts.push(
        alert(
          "reconduction",
          contract,
          triggerOn,
          today,
          contract.tacitRenewal
            ? `Reconduction tacite au ${contract.endsOn} : sans décision contraire, le marché repart.`
            : `Reconduction expresse à décider avant le ${contract.endsOn}.`,
        ),
      );
    }
  }

  if (contract.warrantyEndsOn && withinWindow(today, contract.warrantyEndsOn, windows.garantie)) {
    alerts.push(
      alert(
        "garantie",
        contract,
        contract.warrantyEndsOn,
        today,
        `Fin de la garantie le ${contract.warrantyEndsOn} : dernier moment pour signaler une réserve.`,
      ),
    );
  }

  if (
    contract.endsOn &&
    !contract.receivedOn &&
    withinWindow(today, contract.endsOn, windows.reception)
  ) {
    alerts.push(
      alert(
        "reception",
        contract,
        contract.endsOn,
        today,
        `Le marché se termine le ${contract.endsOn} et aucune réception n'est enregistrée.`,
      ),
    );
  }

  if (contract.startsOn) {
    const checkpoint = addDays(contract.startsOn, 182);
    if (withinWindow(today, checkpoint, windows.point_six_mois)) {
      alerts.push(
        alert(
          "point_six_mois",
          contract,
          checkpoint,
          today,
          `Six mois d'exécution au ${checkpoint} : point d'étape avec le titulaire.`,
        ),
      );
    }
  }

  if (contract.hasPurchaseOrders && contract.startsOn) {
    const depuis = contract.lastCommitmentOn ?? contract.startsOn;
    const triggerOn = addDays(depuis, windows.sans_bon_de_commande);
    if (withinWindow(today, triggerOn, 0)) {
      alerts.push(
        alert(
          "sans_bon_de_commande",
          contract,
          triggerOn,
          today,
          contract.lastCommitmentOn
            ? `Aucun bon de commande depuis le ${contract.lastCommitmentOn}.`
            : `Aucun bon de commande depuis le début du marché, le ${contract.startsOn}.`,
        ),
      );
    }
  }

  return alerts;
}

export function evaluatePortfolio(
  contracts: TrackedContract[],
  today: string,
  windows: Windows = WINDOWS,
): Alert[] {
  return contracts
    .flatMap((m) => evaluate(m, today, windows))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export const SCHEDULE_HORIZON = 183;

export function evaluateSchedule(
  contracts: TrackedContract[],
  today: string,
  horizonDays: number = SCHEDULE_HORIZON,
  windows: Windows = WINDOWS,
): Alert[] {
  const horizon = addDays(today, horizonDays);
  return evaluatePortfolio(contracts, horizon, windows)
    .filter((a) => a.deadlineOn <= horizon)
    .map((a) => ({ ...a, daysRemaining: daysBetween(today, a.deadlineOn) }));
}
