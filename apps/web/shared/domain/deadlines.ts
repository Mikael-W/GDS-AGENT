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
  const annee = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return Date.UTC(annee, month - 1, day) / DAY_MS;
}

function ajouter(iso: string, days: number): string {
  return new Date((inDays(iso) + days) * DAY_MS).toISOString().slice(0, 10);
}

function ecart(de: string, a: string): number {
  return inDays(a) - inDays(de);
}

function withinWindow(today: string, deadline: string, fenetre: number): boolean {
  return ecart(today, deadline) <= fenetre;
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
    daysRemaining: ecart(today, deadlineOn),
    explanation,
  };
}

export function evaluate(
  contract: TrackedContract,
  today: string,
  fenetres: Windows = WINDOWS,
): Alert[] {
  if (!contract.active || contract.settled) return [];

  const alerts: Alert[] = [];

  if (contract.endsOn && contract.tacitRenewal !== null) {
    const limite = ajouter(contract.endsOn, -fenetres.reconduction);
    if (withinWindow(today, limite, 0)) {
      alerts.push(
        alert(
          "reconduction",
          contract,
          limite,
          today,
          contract.tacitRenewal
            ? `Reconduction tacite au ${contract.endsOn} : sans décision contraire, le marché repart.`
            : `Reconduction expresse à décider avant le ${contract.endsOn}.`,
        ),
      );
    }
  }

  if (contract.warrantyEndsOn && withinWindow(today, contract.warrantyEndsOn, fenetres.garantie)) {
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
    withinWindow(today, contract.endsOn, fenetres.reception)
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
    const point = ajouter(contract.startsOn, 182);
    if (withinWindow(today, point, fenetres.point_six_mois)) {
      alerts.push(
        alert(
          "point_six_mois",
          contract,
          point,
          today,
          `Six mois d'exécution au ${point} : point d'étape avec le titulaire.`,
        ),
      );
    }
  }

  if (contract.hasPurchaseOrders && contract.startsOn) {
    const depuis = contract.lastCommitmentOn ?? contract.startsOn;
    const limite = ajouter(depuis, fenetres.sans_bon_de_commande);
    if (withinWindow(today, limite, 0)) {
      alerts.push(
        alert(
          "sans_bon_de_commande",
          contract,
          limite,
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
  fenetres: Windows = WINDOWS,
): Alert[] {
  return contracts
    .flatMap((m) => evaluate(m, today, fenetres))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export const SCHEDULE_HORIZON = 183;

export function evaluateSchedule(
  contracts: TrackedContract[],
  today: string,
  horizonJours: number = SCHEDULE_HORIZON,
  fenetres: Windows = WINDOWS,
): Alert[] {
  const horizon = ajouter(today, horizonJours);
  return evaluatePortfolio(contracts, horizon, fenetres)
    .filter((a) => a.deadlineOn <= horizon)
    .map((a) => ({ ...a, daysRemaining: ecart(today, a.deadlineOn) }));
}
