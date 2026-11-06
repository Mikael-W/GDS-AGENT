import { alertTreatments, commitments, contracts } from "@projet/db/schema";
import { and, eq, max } from "drizzle-orm";

import type { AlertDetail, AlertListItem } from "#shared/domain/alerts";
import {
  type Alert,
  evaluate,
  evaluatePortfolio,
  evaluateSchedule,
  type Family,
  type TrackedContract,
} from "#shared/domain/deadlines";
import { getDb } from "./db";

type Database = ReturnType<typeof getDb>;

function tracked(db: Database, reference?: string) {
  return db
    .select({
      id: contracts.id,
      reference: contracts.reference,
      subject: contracts.subject,
      service: contracts.service,
      holder: contracts.holder,
      notifiedOn: contracts.notifiedOn,
      initialAmount: contracts.initialAmount,
      active: contracts.active,
      settled: contracts.settled,
      hasPurchaseOrders: contracts.hasPurchaseOrders,
      tacitRenewal: contracts.tacitRenewal,
      startsOn: contracts.startsOn,
      endsOn: contracts.endsOn,
      warrantyEndsOn: contracts.warrantyEndsOn,
      receivedOn: contracts.receivedOn,
      lastCommitmentOn: max(commitments.issuedOn),
    })
    .from(contracts)
    .leftJoin(commitments, eq(commitments.contractId, contracts.id))
    .where(reference ? eq(contracts.reference, reference) : undefined)
    .groupBy(contracts.id);
}

const key = (contractId: number, family: string, deadlineOn: string) =>
  `${contractId}|${family}|${deadlineOn}`;

async function untreated(
  db: Database,
  calculer: (portfolio: TrackedContract[]) => Alert[],
): Promise<AlertListItem[]> {
  const portfolio = await tracked(db);
  const treated = new Set(
    (await db.select().from(alertTreatments)).map((t) => key(t.contractId, t.family, t.deadlineOn)),
  );

  const byReference = new Map(portfolio.map((m) => [m.reference, m]));
  return calculer(portfolio).flatMap((alert) => {
    const contract = byReference.get(alert.reference);
    if (!contract || treated.has(key(contract.id, alert.family, alert.deadlineOn))) return [];
    return [{ ...alert, subject: contract.subject, service: contract.service }];
  });
}

export function listAlerts(today: string, db = getDb()): Promise<AlertListItem[]> {
  return untreated(db, (portfolio) => evaluatePortfolio(portfolio, today));
}

export function listDeadlines(today: string, db = getDb()): Promise<AlertListItem[]> {
  return untreated(db, (portfolio) => evaluateSchedule(portfolio, today));
}

async function findTracked(reference: string, family: Family, today: string, db: Database) {
  const [contract] = await tracked(db, reference);
  const alert = contract && evaluate(contract, today).find((a) => a.family === family);
  return contract && alert ? { contract, alert } : undefined;
}

export async function alertDetail(
  reference: string,
  family: Family,
  today: string,
  db = getDb(),
): Promise<AlertDetail | undefined> {
  const found = await findTracked(reference, family, today, db);
  if (!found) return undefined;
  const { contract, alert } = found;

  const [treatment] = await db
    .select()
    .from(alertTreatments)
    .where(
      and(
        eq(alertTreatments.contractId, contract.id),
        eq(alertTreatments.family, family),
        eq(alertTreatments.deadlineOn, alert.deadlineOn),
      ),
    );

  return {
    ...alert,
    subject: contract.subject,
    service: contract.service,
    holder: contract.holder,
    notifiedOn: contract.notifiedOn,
    startsOn: contract.startsOn,
    endsOn: contract.endsOn,
    initialAmount: contract.initialAmount,
    settled: contract.settled,
    treatment: treatment
      ? { comment: treatment.comment, treatedAt: treatment.treatedAt.toISOString() }
      : null,
  };
}

export type TreatmentInput = {
  reference: string;
  family: Family;
  comment: string;
  treatedBy: string;
};

export async function treatAlert(
  saisie: TreatmentInput,
  today: string,
  db = getDb(),
): Promise<"traitee" | "deja_traitee" | "inconnue"> {
  const found = await findTracked(saisie.reference, saisie.family, today, db);
  if (!found) return "inconnue";

  const inserted = await db
    .insert(alertTreatments)
    .values({
      contractId: found.contract.id,
      family: saisie.family,
      deadlineOn: found.alert.deadlineOn,
      comment: saisie.comment,
      treatedBy: saisie.treatedBy,
    })
    .onConflictDoNothing()
    .returning({ id: alertTreatments.id });
  return inserted.length > 0 ? "traitee" : "deja_traitee";
}
